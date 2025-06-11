import { RogueEnv, type RogueAction } from "#env";
import type { SerializedState } from "#app/utils/serialize";
import { tensor, train, layers, sequential, type LayersModel, dispose } from "@tensorflow/tfjs-node";

function flattenState(state: SerializedState): number[] {
  const player = state.playerParty[state.playerActive[0]];
  const enemy = state.enemyParty[state.enemyActive[0]];
  return [state.turn, state.wave, player.hp / player.maxHp, enemy.hp / enemy.maxHp, player.level, enemy.level];
}

const INPUT_SIZE = 6;
const ACTION_COUNT = 42; // total actions in RogueAction enum

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

async function runTraining(episodes = 10, maxSteps = 200) {
  const env = new RogueEnv();
  const agent = new DQNAgent();
  for (let ep = 0; ep < episodes; ep++) {
    env.reset();
    let state = flattenState(env.getState());
    for (let t = 0; t < maxSteps && !env.terminated; t++) {
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
  await agent.model.save("file://dqn-model");
}

runTraining().catch(err => console.error(err));
