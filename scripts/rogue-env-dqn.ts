import "./headless-globals";
import { RogueEnv, type RogueAction, TransitionLogger } from "#env";
import type { SerializedState } from "#app/utils/serialize";
import { resolve } from "node:path";
import { tensor, train, layers, sequential, type LayersModel, dispose } from "@tensorflow/tfjs-node";

function flattenState(state: SerializedState): number[] {
  const getMon = (party: any[], active: number[]): any | undefined => {
    const idx = active?.[0];
    if (idx === undefined || idx < 0 || idx >= party.length) return undefined;
    return party[idx];
  };

  const player = getMon(state.playerParty, state.playerActive);
  const enemy = getMon(state.enemyParty, state.enemyActive);
  const playerHp = player ? player.hp / player.maxHp : 0;
  const enemyHp = enemy ? enemy.hp / enemy.maxHp : 0;
  const playerLevel = player?.level ?? 0;
  const enemyLevel = enemy?.level ?? 0;

  const isShop = state.phase === "SelectModifierPhase" ? 1 : 0;
  const money = (state.money ?? 0) / 1000;
  const shopCosts = (state.shopOptions ?? [])
    .slice(0, 3)
    .map(o => o.cost / 1000);
  while (shopCosts.length < 3) shopCosts.push(0);
  return [
    state.turn,
    state.wave,
    playerHp,
    enemyHp,
    playerLevel,
    enemyLevel,
    isShop,
    money,
    ...shopCosts,
  ];
}

const INPUT_SIZE = 11;
const ACTION_COUNT = 84; // total actions in RogueAction enum

class DQNAgent {
  private model: LayersModel;
  private memory: Array<{
    s: number[];
    a: number;
    r: number;
    ns: number[];
    done: boolean;
  }> = [];
  private epsilon = 1.0;
  private epsilonMin = 0.05;
  private epsilonDecay = 0.995;
  private gamma = 0.99;
  private batchSize = 32;

  constructor() {
    this.model = sequential();
    this.model.add(layers.dense({ units: 64, activation: "relu", inputShape: [INPUT_SIZE] }));
    this.model.add(layers.dense({ units: 64, activation: "relu" }));
    this.model.add(layers.dense({ units: ACTION_COUNT }));
    this.model.compile({ optimizer: train.adam(0.001), loss: "meanSquaredError" });
  }

  act(state: number[], available: number[]): number {
    if (Math.random() < this.epsilon) {
      return available[Math.floor(Math.random() * available.length)];
    }
    const q = this.model.predict(tensor([state])) as tf.Tensor;
    const data = q.dataSync() as Float32Array;
    q.dispose();
    let best = available[0];
    let bestVal = data[best];
    for (const a of available) {
      if (data[a] > bestVal) {
        bestVal = data[a];
        best = a;
      }
    }
    return best;
  }

  remember(s: number[], a: number, r: number, ns: number[], done: boolean) {
    this.memory.push({ s, a, r, ns, done });
    if (this.memory.length > 10000) {
      this.memory.shift();
    }
  }

  async replay() {
    if (this.memory.length < this.batchSize) {
      return;
    }
    const batch = [] as typeof this.memory;
    for (let i = 0; i < this.batchSize; i++) {
      batch.push(this.memory[Math.floor(Math.random() * this.memory.length)]);
    }
    const states = tensor(batch.map(b => b.s));
    const nextStates = tensor(batch.map(b => b.ns));
    const target = this.model.predict(states) as tf.Tensor;
    const targetNext = this.model.predict(nextStates) as tf.Tensor;
    const tData = target.arraySync() as number[][];
    const tNext = targetNext.arraySync() as number[][];
    batch.forEach((b, i) => {
      const future = b.done ? 0 : Math.max(...tNext[i]);
      tData[i][b.a] = b.r + this.gamma * future;
    });
    const ys = tensor(tData);
    await this.model.fit(states, ys, { epochs: 1, verbose: 0 });
    dispose([states, nextStates, target, targetNext, ys]);
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }
  }
}

  async function runTraining(
    episodes = 10,
    maxSteps = 200,
    modelPath = "dqn-model",
    logPath?: string,
    seed?: string,
  ) {
  const env = new RogueEnv(seed);
  const logger = new TransitionLogger();
  env.logger = logger;
  const agent = new DQNAgent();

  let interrupted = false;
  const saveProgress = async () => {
    const modelDir = resolve(modelPath);
    await agent.model.save(`file://${modelDir}`);
    console.log(`Model saved to ${modelDir}`);
    if (logPath) {
      const logFile = resolve(logPath);
      const compress = logFile.endsWith('.gz');
      await logger.saveToFile(logFile, compress);
      console.log(`Training log saved to ${logFile}`);
    }
  };

  const handleInterrupt = async () => {
    if (interrupted) return;
    interrupted = true;
    console.log("Interrupted, saving progress...");
    await saveProgress();
    process.exit();
  };
  process.once('SIGINT', handleInterrupt);
  process.once('SIGTERM', handleInterrupt);

  for (let ep = 0; ep < episodes && !interrupted; ep++) {
    env.reset();
    let state = flattenState(env.getState());
    for (let t = 0; t < maxSteps && !env.terminated && !interrupted; t++) {
      const available = env.getAvailableActions();
      const action = agent.act(state, available);
      const reward = env.step(action as RogueAction);
      const nextState = flattenState(env.getState());
      agent.remember(state, action, reward, nextState, env.terminated);
      state = nextState;
      await agent.replay();
    }
    console.log(`Episode ${ep + 1} complete`);
  }

  if (!interrupted) {
    await saveProgress();
  }
  }

const episodes = Number.parseInt(process.argv[2] ?? process.env.ROGUE_EPISODES ?? "10", 10);
const maxSteps = Number.parseInt(process.argv[3] ?? process.env.ROGUE_MAX_STEPS ?? "200", 10);
const modelPath = process.argv[4] ?? process.env.ROGUE_MODEL_PATH ?? "dqn-model";
const logPath = process.argv[5] ?? process.env.ROGUE_LOG_PATH;
const seed = process.argv[6] ?? process.env.ROGUE_SEED;

runTraining(episodes, maxSteps, modelPath, logPath, seed).catch(err => console.error(err));
