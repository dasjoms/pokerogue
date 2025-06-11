import RogueEnv from "./rogue-env";
import TransitionLogger, { type TransitionRecord } from "./transition-logger";

export interface ReplayResult {
  /** Whether all states and rewards matched the original log. */
  deterministic: boolean;
  /** Records produced when replaying the log. */
  records: TransitionRecord[];
}

/**
 * Replay a sequence of transition records with a fresh environment.
 *
 * Returns the newly generated records and whether they match the originals.
 */
export function replayTransitions(records: TransitionRecord[], seed?: string): ReplayResult {
  const env = new RogueEnv(seed);
  env.reset(seed);
  const out: TransitionRecord[] = [];
  let deterministic = true;

  for (const r of records) {
    const before = env.getState();
    if (JSON.stringify(before) !== JSON.stringify(r.state)) {
      deterministic = false;
    }
    const reward = env.step(r.action, undefined, r.done);
    const after = env.getState();
    if (
      JSON.stringify(after) !== JSON.stringify(r.nextState) ||
      reward !== r.reward
    ) {
      deterministic = false;
    }
    out.push({ state: before, action: r.action, reward, nextState: after, done: r.done });
  }

  return { deterministic, records: out };
}

/**
 * Convenience helper to load a log file and replay its transitions.
 */
export async function replayLogFile(path: string, seed?: string): Promise<ReplayResult> {
  const logger = new TransitionLogger();
  await logger.loadFromFile(path);
  return replayTransitions(logger.getRecords(), seed);
}
