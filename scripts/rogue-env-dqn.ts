import "./headless-globals";
import { RogueEnv, RogueAction } from "#env";
import type { SerializedState, SerializedPokemon } from "#app/utils/serialize";
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
  return [state.turn, state.wave, playerHp, enemyHp, playerLevel, enemyLevel];
}

const INPUT_SIZE = 6;
const ACTION_COUNT = 42; // total actions in RogueAction enum

function summarizeMon(p: SerializedPokemon) {
  return {
    species: p.species,
    level: p.level,
    hp: p.hp,
    maxHp: p.maxHp,
    status: p.status,
  };
}

export function logSerializedState(state: SerializedState, action: RogueAction) {
  const summary = {
    phase: state.phase,
    turn: state.turn,
    wave: state.wave,
    player: state.playerParty.map(summarizeMon),
    enemy: state.enemyParty.map(summarizeMon),
    playerActive: state.playerActive,
    enemyActive: state.enemyActive,
    action: RogueAction[action],
  };
  console.log(JSON.stringify(summary, null, 2));
}

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
    let serialized = env.getState();
    let state = flattenState(serialized);
    for (let t = 0; t < maxSteps && !env.terminated; t++) {
      const available = env.getAvailableActions();
      const action = agent.act(state, available);
      logSerializedState(serialized, action as RogueAction);
      const reward = env.step(action as RogueAction);
      serialized = env.getState();
      const nextState = flattenState(serialized);
      agent.remember(state, action, reward, nextState, env.terminated);
      state = nextState;
      await agent.replay();
    }
    console.log(`Episode ${ep + 1} complete`);
  }
  await agent.model.save("file://dqn-model");
}

export { runTraining };

if (import.meta.main) {
  runTraining().catch(err => console.error(err));
}
