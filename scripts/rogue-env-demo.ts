import RogueEnv, { RogueAction } from "#app/rogue-env";
import TransitionLogger from "#app/transition-logger";

const steps = parseInt(process.argv[2] ?? "2", 10);
const output = process.argv[3];

const env = new RogueEnv("demo-seed");
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

