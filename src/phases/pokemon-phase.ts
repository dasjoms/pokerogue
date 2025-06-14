import { globalScene } from "#app/global-scene";
import { BattlerIndex } from "#enums/battler-index";
import type Pokemon from "#app/field/pokemon";
import { FieldPhase } from "./field-phase";

export abstract class PokemonPhase extends FieldPhase {
  protected battlerIndex: BattlerIndex | number;
  public player: boolean;
  public fieldIndex: number;

  constructor(battlerIndex?: BattlerIndex | number) {
    super();

    if (battlerIndex === undefined) {
      const defaultPokemon = globalScene.getField().find(p => p?.isActive());
      if (defaultPokemon) {
        battlerIndex = defaultPokemon.getBattlerIndex();
      } else {
        console.warn("There are no Pokemon on the field!");
        battlerIndex = BattlerIndex.PLAYER;
      }
    }

    this.battlerIndex = battlerIndex;
    this.player = battlerIndex < 2;
    this.fieldIndex = battlerIndex % 2;
  }

  getPokemon(): Pokemon {
    if (this.battlerIndex > BattlerIndex.ENEMY_2) {
      return globalScene.getPokemonById(this.battlerIndex)!; //TODO: is this bang correct?
    }
    return globalScene.getField()[this.battlerIndex]!; //TODO: is this bang correct?
  }
}
