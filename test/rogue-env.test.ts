import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { RogueEnv, RogueAction, TransitionLogger, computeStepReward, replayTransitions } from "#env";
import Phaser from "phaser";
import GameWrapper from "#test/testUtils/gameWrapper";
import BattleScene from "#app/battle-scene";
import { initSceneWithoutEncounterPhase } from "#test/testUtils/gameManagerUtils";
import { SpeciesId } from "#enums/species-id";
import { TerastallizeAccessModifier } from "#app/modifier/modifier";
import serializeState from "#app/utils/serialize";
import { Command } from "#enums/command";
import { CommandPhase } from "#app/phases/command-phase";

describe("rogue-env serialization", () => {
  it("should return serialized state after reset", () => {
    const env = new RogueEnv();
    env.reset();
    const state = env.getState();

    expect(state.phase).toBeDefined();
    expect(Array.isArray(state.playerParty)).toBe(true);
    expect(Array.isArray(state.enemyParty)).toBe(true);
    expect(state.playerParty[0]).toHaveProperty("species");
    expect(state.playerParty[0]).toHaveProperty("moves");
    if (state.playerParty[0].moves.length > 0) {
      expect(state.playerParty[0].moves[0]).toHaveProperty("type");
      expect(state.playerParty[0].moves[0]).toHaveProperty("power");
    }
    expect(state.playerParty[0]).toHaveProperty("status");
    expect(state.playerParty[0]).toHaveProperty("items");
    expect(Array.isArray(state.playerParty[0].items)).toBe(true);
    expect(state.playerParty[0]).toHaveProperty("statStages");
    expect(Array.isArray(state.playerParty[0].statStages)).toBe(true);
    expect(state.playerParty[0]).toHaveProperty("battlerTags");
    expect(Array.isArray(state.playerParty[0].battlerTags)).toBe(true);
    expect(state).toHaveProperty("weather");
    expect(state).toHaveProperty("terrain");
    expect(state).toHaveProperty("terrainTurns");
    expect(typeof state.terrainTurns).toBe("number");
    expect(state).toHaveProperty("wave");
    expect(typeof state.wave).toBe("number");
    expect(state).toHaveProperty("playerActive");
    expect(state).toHaveProperty("enemyActive");
    expect(Array.isArray(state.playerActive)).toBe(true);
    expect(Array.isArray(state.enemyActive)).toBe(true);
    expect(state).toHaveProperty("pokeballCounts");
    expect(typeof state.pokeballCounts).toBe("object");
    expect(state).toHaveProperty("playerModifiers");
    expect(Array.isArray(state.playerModifiers)).toBe(true);
    expect(state).toHaveProperty("enemyModifiers");
    expect(Array.isArray(state.enemyModifiers)).toBe(true);
    expect(state).toHaveProperty("biome");
    expect(state).toHaveProperty("battleType");
    expect(state).toHaveProperty("score");
    expect(state).toHaveProperty("playerTerasUsed");
    expect(state).toHaveProperty("arenaTags");
    expect(Array.isArray(state.arenaTags)).toBe(true);
    if (state.arenaTags.length > 0) {
      expect(state.arenaTags[0]).toHaveProperty("layers");
    }
    expect(state.shopOptions).toBeUndefined();
    expect(Array.isArray(state.availableActions)).toBe(true);
    expect(state.availableActions).toEqual(env.getAvailableActions());

    env.step(RogueAction.FIGHT_1);
    const nextState = env.getState();
    expect(nextState.turn).toBeGreaterThanOrEqual(state.turn);
  });

  it("should include bag action when balls are available", () => {
    const env = new RogueEnv();
    env.reset();
    const actions = env.getAvailableActions();
    if (actions.includes(RogueAction.BALL_1)) {
      expect(actions).toContain(RogueAction.BAG);
    }
  });

  it("bag action should act like using the first ball", () => {
    const seed = "bag-seed";
    const env1 = new RogueEnv(seed);
    env1.reset();
    env1.step(RogueAction.BAG);
    const bagState = env1.getState();

    const env2 = new RogueEnv(seed);
    env2.reset();
    env2.step(RogueAction.BALL_1);
    const ballState = env2.getState();

    expect(bagState).toEqual(ballState);
  });

  it("should initialize with standard starters", () => {
    const env = new RogueEnv();
    env.reset();
    const party = env.getState().playerParty.map(p => p.species);
    expect(party).toEqual([SpeciesId.SQUIRTLE, SpeciesId.BULBASAUR, SpeciesId.CHARMANDER]);
  });
});

describe("rogue-env logging", () => {
  it("should log transitions when logger attached", () => {
    const env = new RogueEnv();
    env.logger = new TransitionLogger();
    env.reset();
    const start = env.getState();
    const r = env.step(RogueAction.FIGHT_1);
    const expected = computeStepReward(start, env.getState());
    expect(r).toBe(expected);
    const records = env.logger.getRecords();
    expect(records.length).toBe(1);
    expect(records[0].state).toEqual(start);
    expect(records[0].action).toBe(RogueAction.FIGHT_1);
    expect(records[0].nextState).toBeDefined();
  });

  it("should write logs to a file", async () => {
    const env = new RogueEnv();
    env.logger = new TransitionLogger();
    env.reset();
    env.step(RogueAction.FIGHT_1);

    const file = join(tmpdir(), `transitions-${Date.now()}.json`);
    await env.logger!.saveToFile(file, true);
    const contents = await fs.readFile(file);
    expect(contents.length).toBeGreaterThan(0);
    await fs.unlink(file);
  });

  it("should load logs from a file", async () => {
    const env = new RogueEnv();
    env.logger = new TransitionLogger();
    env.reset();
    env.step(RogueAction.FIGHT_1);

    const file = join(tmpdir(), `transitions-${Date.now()}.json`);
    await env.logger.saveToFile(file, true);

    const logger2 = new TransitionLogger();
    await logger2.loadFromFile(file);
    expect(logger2.getRecords()).toEqual(env.logger.getRecords());

    await fs.unlink(file);
  });
});

describe("transition replay", () => {
  it("should reproduce recorded transitions", async () => {
    const seed = "replay-seed";
    const env = new RogueEnv(seed);
    const logger = new TransitionLogger();
    env.logger = logger;
    env.reset();
    env.step(RogueAction.FIGHT_1);
    env.step(RogueAction.FIGHT_1);

    const records = logger.getRecords();
    const result = replayTransitions(records, seed);

    expect(result.deterministic).toBe(true);
    expect(result.records).toEqual(records);
  });
});

describe("rogue-env seeding", () => {
  it("should produce identical states for the same seed", () => {
    const env = new RogueEnv();
    env.reset("fixed-seed");
    env.step(RogueAction.FIGHT_1);
    const first = env.getState();

    env.reset("fixed-seed");
    env.step(RogueAction.FIGHT_1);
    const second = env.getState();

    expect(second).toEqual(first);
  });
});

describe("rogue-env progression", () => {
  it("should advance to the next command phase when stepping", () => {
    const env = new RogueEnv();
    env.reset();
    const start = env.getState();
    expect(start.phase).toBe("CommandPhase");

    env.step(RogueAction.FIGHT_1);
    const next = env.getState();
    expect(next.phase).toBe("CommandPhase");
    expect(next.turn).toBeGreaterThan(start.turn);
  });

  it("should fast forward multiple steps with a single call", () => {
    const env = new RogueEnv();
    env.reset();

    env.step(RogueAction.FIGHT_1, undefined, false, 2);
    const ffState = env.getState();

    env.reset();
    env.step(RogueAction.FIGHT_1);
    env.step(RogueAction.FIGHT_1);
    const twoState = env.getState();

    expect(ffState).toEqual(twoState);
  });
});

describe("headless flag", () => {
  it("should force bypassLogin when set", async () => {
    process.env.VITE_HEADLESS = "1";
    vi.resetModules();
    const mod = await import("#app/global-vars/bypass-login");
    expect(mod.bypassLogin).toBe(true);
    delete process.env.VITE_HEADLESS;
    vi.resetModules();
  });

  it("should disable animations and audio", async () => {
    process.env.VITE_HEADLESS = "1";
    vi.resetModules();
    const { default: BattleScene } = await import("#app/battle-scene");
    const scene = new BattleScene();
    expect(scene.moveAnimations).toBe(false);
    expect(scene.masterVolume).toBe(0);
    delete process.env.VITE_HEADLESS;
    vi.resetModules();
  });
});

describe("rogue-env parity", () => {
  function applyAction(scene: any, action: RogueAction) {
    const phase: any = scene.phaseManager.getCurrentPhase();
    if (phase?.handleCommand) {
      if (action <= RogueAction.FIGHT_4) {
        phase.handleCommand(Command.FIGHT, action);
      } else if (action >= RogueAction.TERA_1 && action <= RogueAction.TERA_4) {
        phase.handleCommand(Command.TERA, action - RogueAction.TERA_1);
      } else if (action >= RogueAction.BALL_1 && action <= RogueAction.BALL_5) {
        phase.handleCommand(Command.BALL, action - RogueAction.BALL_1);
      } else if (action === RogueAction.BAG) {
        phase.handleCommand(Command.BALL, 0);
      } else if (action === RogueAction.RUN) {
        phase.handleCommand(Command.RUN, 0);
      } else if (action >= RogueAction.SWITCH_1 && action <= RogueAction.SWITCH_3) {
        phase.handleCommand(Command.POKEMON, action - RogueAction.SWITCH_1);
      }
    }
    scene.phaseManager.shiftPhase();
    let p = scene.phaseManager.getCurrentPhase();
    let safety = 0;
    while (p && !(p instanceof CommandPhase) && safety < 100) {
      scene.phaseManager.shiftPhase();
      p = scene.phaseManager.getCurrentPhase();
      safety++;
    }
  }

  function getAvailableActions(scene: any): RogueAction[] {
    const phase = scene.phaseManager.getCurrentPhase();
    const actions: RogueAction[] = [];
    if (phase instanceof CommandPhase) {
      const pokemon = phase.getPokemon();
      const moves = pokemon.getMoveset();
      for (let i = 0; i < Math.min(4, moves.length); i++) {
        if (pokemon.trySelectMove(i)) {
          actions.push(RogueAction.FIGHT_1 + i);
        }
      }
      const pokeballs = Object.values(scene.pokeballCounts ?? {});
      if (pokeballs.some(c => c > 0)) {
        actions.push(RogueAction.BAG);
      }
      for (let i = 0; i < Math.min(5, pokeballs.length); i++) {
        if (pokeballs[i] > 0) {
          actions.push((RogueAction.BALL_1 + i) as RogueAction);
        }
      }
      const fieldIndex = phase.getFieldIndex();
      const activePokemon = scene.getField()[fieldIndex];
      const hasTeraMod = scene.getModifiers(TerastallizeAccessModifier).length > 0;
      const isBlockedForm =
        activePokemon.isMega() || activePokemon.isMax() || activePokemon.hasSpecies(SpeciesId.NECROZMA, "ultra");
      const currentTeras = scene.arena.playerTerasUsed;
      const plannedTera = scene.currentBattle.preTurnCommands[0]?.command === Command.TERA && fieldIndex > 0 ? 1 : 0;
      const canTera = hasTeraMod && !isBlockedForm && currentTeras + plannedTera < 1;
      if (canTera) {
        for (let i = 0; i < Math.min(4, moves.length); i++) {
          if (pokemon.trySelectMove(i)) {
            actions.push((RogueAction.TERA_1 + i) as RogueAction);
          }
        }
      }
      if (!pokemon.isTrapped()) {
        actions.push(RogueAction.RUN);
        const party = scene.getPlayerParty();
        for (let i = 0; i < Math.min(3, party.length); i++) {
          const p = party[i];
          if (p.hp > 0 && !p.isActive(true)) {
            actions.push((RogueAction.SWITCH_1 + i) as RogueAction);
          }
        }
      }
    }
    return actions;
  }

  function getState(scene: any) {
    const state = serializeState(scene) as any;
    state.availableActions = getAvailableActions(scene);
    return state;
  }

  it("should match the standard scene for identical actions", () => {
    const seed = "parity-seed";
    const actions = [RogueAction.FIGHT_1, RogueAction.BALL_1];

    const env = new RogueEnv(seed);
    env.reset();
    const envStates = [env.getState()];
    for (const act of actions) {
      env.step(act);
      envStates.push(env.getState());
    }

    const game = new Phaser.Game({ type: Phaser.HEADLESS });
    const wrapper = new GameWrapper(game, true);
    const scene = new BattleScene();
    const originalPush = scene.phaseManager.pushNew.bind(scene.phaseManager);
    scene.phaseManager.pushNew = (phase: string, ...args: any[]) => {
      if (phase === "LoginPhase" || phase === "TitlePhase") {
        return;
      }
      return originalPush(phase as any, ...(args as any));
    };
    wrapper.setScene(scene);
    scene.reset(false, true);
    scene.setSeed(seed);
    scene.resetSeed();
    scene.enableTutorials = false;
    initSceneWithoutEncounterPhase(scene, [SpeciesId.SQUIRTLE, SpeciesId.BULBASAUR, SpeciesId.CHARMANDER]);
    scene.currentBattle.incrementTurn();
    scene.phaseManager.clearAllPhases();
    scene.phaseManager.pushNew("TurnInitPhase");
    scene.phaseManager.shiftPhase();

    const states = [getState(scene)];
    for (const act of actions) {
      applyAction(scene, act);
      states.push(getState(scene));
    }

    expect(states).toEqual(envStates);
  });
});

describe("benchmark utility", () => {
  it("should measure steps per second", async () => {
    vi.doMock("#env/rogue-env", () => {
      const mockStep = vi.fn();
      return {
        default: class {
          constructor() {}
          reset() {}
          getAvailableActions() { return [0]; }
          step() { mockStep(); }
        },
        RogueAction: { FIGHT_1: 0 },
      };
    });
    const { benchmark } = await import("#env");
    const result = await benchmark(3, "seed");
    expect(result.steps).toBe(3);
    expect(result.sps).toBeGreaterThan(0);
    vi.resetModules();
  });
});
