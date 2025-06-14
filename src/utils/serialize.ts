import type BattleScene from "#app/battle-scene";
import type Pokemon from "#app/field/pokemon";
import { StatusEffect } from "#enums/status-effect";
import { BattleType } from "#enums/battle-type";
import { BiomeId } from "#enums/biome-id";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { getPlayerShopModifierTypeOptionsForWave } from "#app/modifier/modifier-type";
import { HealShopCostModifier } from "#app/modifier/modifier";
import ModifierSelectUiHandler from "#app/ui/modifier-select-ui-handler";
import { NumberHolder } from "#app/utils/common";

/** Current version of the serialized state schema. */
export const STATE_SCHEMA_VERSION = 1;

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
  /** Active volatile battler tags with remaining turns. */
  battlerTags: { type: BattlerTagType; turns: number }[];
  /** Whether this Pokémon is currently active on the field. */
  active: boolean;
  /** Current ability identifier. */
  ability: number;
  /** Current nature identifier. */
  nature: number;
  moves: { id: number; type: number; power: number; pp: number; maxPp: number }[];
}

export interface SerializedState {
  /** Schema version for compatibility. */
  schemaVersion: number;
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
  /** Remaining turns on the active terrain effect. */
  terrainTurns: number;
  /** Current wave number. */
  wave: number;
  /** Player's available money. */
  money: number;
  /** Current biome identifier. */
  biome: BiomeId;
  /** Current battle type. */
  battleType: BattleType;
  /** Total score accumulated this run. */
  score: number;
  /** Number of terastallizations used by the player this arena. */
  playerTerasUsed: number;
  /** Active arena tags influencing the field. */
  arenaTags: {
    type: ArenaTagType;
    side: ArenaTagSide;
    turns: number;
    layers?: number;
  }[];
  /** Remaining Poké Ball counts by type. */
  pokeballCounts: { [type: number]: number };
  /** Active player modifiers with stack counts. */
  playerModifiers: { id: string; stack: number }[];
  /** Active enemy modifiers with stack counts. */
  enemyModifiers: { id: string; stack: number }[];
  /** Current shop options when available. */
  shopOptions?: { id: string; cost: number }[];
  /** Cursor index within the current shop row when available. */
  shopCursor?: number;
  /** Selected shop row index when available. */
  shopRowCursor?: number;
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
    battlerTags: p.summonData.tags.map(t => ({ type: t.tagType, turns: t.turnCount })),
    active: p.isActive(true),
    ability: p.getAbility(true).id,
    nature: p.getNature(),
    moves: p.getMoveset().map(m => ({
      id: m.moveId,
      type: m.getMove().type,
      power: m.getMove().power,
      pp: m.getMovePp() - m.ppUsed,
      maxPp: m.getMovePp(),
    })),
  };
}

export default function serializeState(scene: BattleScene): SerializedState {
  const phaseName = scene.phaseManager.getCurrentPhase()?.constructor.name;
  let shopOptions: { id: string; cost: number }[] | undefined;
  let shopCursor: number | undefined;
  let shopRowCursor: number | undefined;
  if (phaseName === "SelectModifierPhase" && !scene.gameMode.hasNoShop) {
    const baseCost = scene.getWaveMoneyAmount(1);
    const holder = new NumberHolder(baseCost);
    scene.applyModifier(HealShopCostModifier, true, holder);
    shopOptions = getPlayerShopModifierTypeOptionsForWave(scene.currentBattle.waveIndex, holder.value).map(o => ({ id: o.type.id, cost: o.cost }));
    const handler = scene.ui.getHandler<ModifierSelectUiHandler>();
    shopCursor = handler.getCursor();
    shopRowCursor = handler.getRowCursor();
  }
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    phase: phaseName,
    turn: scene.currentBattle?.turn ?? 0,
    playerParty: scene.getPlayerParty().map(serializePokemon),
    enemyParty: scene.getEnemyParty().map(serializePokemon),
    playerActive: scene.getPlayerField().map(p => scene.getPlayerParty().indexOf(p)),
    enemyActive: scene.getEnemyField().map(p => scene.getEnemyParty().indexOf(p)),
    weather: scene.arena.weather?.weatherType ?? 0,
    terrain: scene.arena.terrain?.terrainType ?? 0,
    terrainTurns: scene.arena.terrain?.turnsLeft ?? 0,
    wave: scene.currentBattle?.waveIndex ?? 0,
    money: scene.money ?? 0,
    biome: scene.arena.biomeType as BiomeId,
    battleType: scene.currentBattle?.battleType ?? BattleType.WILD,
    score: scene.score,
    playerTerasUsed: scene.arena.playerTerasUsed,
    arenaTags: scene.arena.tags.map(t => ({
      type: t.tagType,
      side: t.side,
      turns: (t as any).turnCount ?? 0,
      layers: (t as any).layers,
    })),
    pokeballCounts: { ...scene.pokeballCounts },
    playerModifiers: scene.modifiers.map(m => ({ id: m.type.id, stack: m.stackCount })),
    enemyModifiers: scene.enemyModifiers.map(m => ({ id: m.type.id, stack: m.stackCount })),
    shopOptions,
    shopCursor,
    shopRowCursor,
  };
}
