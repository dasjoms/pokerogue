import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import RogueEnv, { RogueAction } from "#app/rogue-env";
import TransitionLogger from "#app/transition-logger";

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
