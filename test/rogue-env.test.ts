import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import RogueEnv, { RogueAction } from "#app/rogue-env";
import TransitionLogger from "#app/transition-logger";
import Phaser from "phaser";
import GameWrapper from "#test/testUtils/gameWrapper";
import BattleScene from "#app/battle-scene";
import { initSceneWithoutEncounterPhase } from "#test/testUtils/gameManagerUtils";
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
    expect(state.playerParty[0]).toHaveProperty("status");
    expect(state.playerParty[0]).toHaveProperty("items");
    expect(Array.isArray(state.playerParty[0].items)).toBe(true);
    expect(state).toHaveProperty("weather");
    expect(state).toHaveProperty("terrain");
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
    expect(state.shopOptions).toBeUndefined();
    expect(Array.isArray(state.availableActions)).toBe(true);
    expect(state.availableActions).toEqual(env.getAvailableActions());

    env.step(RogueAction.FIGHT_1);
    const nextState = env.getState();
    expect(nextState.turn).toBeGreaterThanOrEqual(state.turn);
  });
});

describe("rogue-env logging", () => {
  it("should log transitions when logger attached", () => {
    const env = new RogueEnv();
    env.logger = new TransitionLogger();
    env.reset();
    const start = env.getState();
    env.step(RogueAction.FIGHT_1, 1, false);
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
    env.step(RogueAction.FIGHT_1, 1, false);

    const file = join(tmpdir(), `transitions-${Date.now()}.json`);
    await env.logger!.saveToFile(file);
    const contents = await fs.readFile(file, "utf8");
    expect(contents).toBe(env.logger!.toJSON());
    await fs.unlink(file);
  });

  it("should load logs from a file", async () => {
    const env = new RogueEnv();
    env.logger = new TransitionLogger();
    env.reset();
    env.step(RogueAction.FIGHT_1, 1, false);

    const file = join(tmpdir(), `transitions-${Date.now()}.json`);
    await env.logger.saveToFile(file);

    const logger2 = new TransitionLogger();
    await logger2.loadFromFile(file);
    expect(logger2.getRecords()).toEqual(env.logger.getRecords());

    await fs.unlink(file);
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
});

describe("rogue-env parity", () => {
  function applyAction(scene: any, action: RogueAction) {
    const phase: any = scene.phaseManager.getCurrentPhase();
    if (phase?.handleCommand) {
      if (action <= RogueAction.FIGHT_4) {
        phase.handleCommand(Command.FIGHT, action);
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
    const actions = [RogueAction.FIGHT_1, RogueAction.FIGHT_1];

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
    initSceneWithoutEncounterPhase(scene);
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

