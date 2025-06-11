import { RogueEnv, TransitionLogger } from "#env";

const steps = parseInt(process.argv[2] ?? process.env.ROGUE_TRAIN_STEPS ?? "1000", 10);
const output = process.argv[3] ?? process.env.ROGUE_LOG_PATH ?? "train-log.json";
const seed = process.env.ROGUE_SEED;

const env = new RogueEnv(seed);
const logger = new TransitionLogger();
env.logger = logger;

env.reset();
for (let i = 0; i < steps && !env.terminated; i++) {
  const actions = env.getAvailableActions();
  const action = actions[Math.floor(Math.random() * actions.length)];
  env.step(action);
}

await logger.saveToFile(output, true);
console.log(`Training log saved to ${output}`);

