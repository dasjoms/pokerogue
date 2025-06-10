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
