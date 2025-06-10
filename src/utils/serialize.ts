import type BattleScene from "#app/battle-scene";
import type Pokemon from "#app/field/pokemon";
import { StatusEffect } from "#enums/status-effect";

export interface SerializedPokemon {
  species: number;
  level: number;
  hp: number;
  maxHp: number;
  /** Numeric status effect identifier. */
  status: number;
  /** Held item modifier ids. */
  items: string[];
  moves: { id: number; pp: number; maxPp: number }[];
}

export interface SerializedState {
  phase: string | undefined;
  turn: number;
  playerParty: SerializedPokemon[];
  enemyParty: SerializedPokemon[];
}

function serializePokemon(p: Pokemon): SerializedPokemon {
  return {
    species: p.species.speciesId,
    level: p.level,
    hp: p.hp,
    maxHp: p.getMaxHp(),
    status: p.status?.effect ?? StatusEffect.NONE,
    items: p.getHeldItems().map(i => i.type.id),
    moves: p.getMoveset().map(m => ({ id: m.moveId, pp: m.getMovePp() - m.ppUsed, maxPp: m.getMovePp() })),
  };
}

export default function serializeState(scene: BattleScene): SerializedState {
  return {
    phase: scene.phaseManager.getCurrentPhase()?.constructor.name,
    turn: scene.currentBattle?.turn ?? 0,
    playerParty: scene.getPlayerParty().map(serializePokemon),
    enemyParty: scene.getEnemyParty().map(serializePokemon),
  };
}
