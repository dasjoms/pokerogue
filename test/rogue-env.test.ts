import { describe, it, expect } from "vitest";
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
    expect(state.shopOptions).toBeUndefined();

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
