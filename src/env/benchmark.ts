import { RogueEnv, RogueAction } from "./index";

export interface BenchmarkResult {
  steps: number;
  ms: number;
  sps: number;
}

export async function benchmark(steps = 1000, seed?: string): Promise<BenchmarkResult> {
  const env = new RogueEnv(seed);
  env.reset();
  const start = performance.now();
  for (let i = 0; i < steps; i++) {
    const actions = env.getAvailableActions();
    const action = actions.includes(RogueAction.FIGHT_1) ? RogueAction.FIGHT_1 : actions[0];
    env.step(action);
  }
  const ms = performance.now() - start;
  return { steps, ms, sps: (steps / ms) * 1000 };
}

export default benchmark;
