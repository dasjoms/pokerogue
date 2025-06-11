import "./headless-globals";
import { RogueEnv, RogueAction, TransitionLogger } from "#env";

const steps = parseInt(process.argv[2] ?? process.env.ROGUE_STEPS ?? "2", 10);
const output = process.argv[3] ?? process.env.ROGUE_LOG_PATH;

const seed = process.env.ROGUE_SEED;
const env = new RogueEnv(seed);
const logger = new TransitionLogger();
env.logger = logger;

env.reset();
for (let i = 0; i < steps; i++) {
  const actions = env.getAvailableActions();
  const action = actions.includes(RogueAction.FIGHT_1)
    ? RogueAction.FIGHT_1
    : actions[0];
  env.step(action);
}

const json = logger.toJSON();
if (output) {
  await logger.saveToFile(output);
  console.log(`Log written to ${output}`);
} else {
  console.log(json);
}

