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
  /** Array of seven in-battle stat stage values. */
  statStages: number[];
  /** Whether this Pokémon is currently active on the field. */
  active: boolean;
  moves: { id: number; pp: number; maxPp: number }[];
}

export interface SerializedState {
  phase: string | undefined;
  turn: number;
  playerParty: SerializedPokemon[];
  enemyParty: SerializedPokemon[];
  /** Indexes of the player's currently active Pokémon. */
  playerActive: number[];
  /** Indexes of the enemy's currently active Pokémon. */
  enemyActive: number[];
  /** Current weather effect in the arena. */
  weather: number;
  /** Current terrain effect in the arena. */
  terrain: number;
  /** Current wave number. */
  wave: number;
  /** Player's available money. */
  money: number;
}

function serializePokemon(p: Pokemon): SerializedPokemon {
  return {
    species: p.species.speciesId,
    level: p.level,
    hp: p.hp,
    maxHp: p.getMaxHp(),
    status: p.status?.effect ?? StatusEffect.NONE,
    items: p.getHeldItems().map(i => i.type.id),
    statStages: p.getStatStages(),
    active: p.isActive(true),
    moves: p.getMoveset().map(m => ({ id: m.moveId, pp: m.getMovePp() - m.ppUsed, maxPp: m.getMovePp() })),
  };
}

export default function serializeState(scene: BattleScene): SerializedState {
  return {
    phase: scene.phaseManager.getCurrentPhase()?.constructor.name,
    turn: scene.currentBattle?.turn ?? 0,
    playerParty: scene.getPlayerParty().map(serializePokemon),
    enemyParty: scene.getEnemyParty().map(serializePokemon),
    playerActive: scene.getPlayerField().map(p => scene.getPlayerParty().indexOf(p)),
    enemyActive: scene.getEnemyField().map(p => scene.getEnemyParty().indexOf(p)),
    weather: scene.arena.weather?.weatherType ?? 0,
    terrain: scene.arena.terrain?.terrainType ?? 0,
    wave: scene.currentBattle?.waveIndex ?? 0,
    money: scene.money ?? 0,
  };
}
