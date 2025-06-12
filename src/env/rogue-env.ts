import Phaser from "phaser";
import BattleScene from "#app/battle-scene";
import { Command } from "#enums/command";
import { Button } from "#enums/buttons";
import { CommandPhase } from "#app/phases/command-phase";
import { randomString } from "#app/utils/common";
import serializeState, { type SerializedState } from "#app/utils/serialize";
import type TransitionLogger from "#env/transition-logger";
import type { TransitionRecord } from "#env/transition-logger";
import { computeStepReward } from "#env/reward";
import GameWrapper from "#test/testUtils/gameWrapper";
import { initSceneWithoutEncounterPhase } from "#test/testUtils/gameManagerUtils";
import { SpeciesId } from "#enums/species-id";
import { TerastallizeAccessModifier } from "#app/modifier/modifier";
import { LearnMoveSituation } from "#enums/learn-move-situation";
import { EVOLVE_MOVE } from "#app/data/balance/pokemon-level-moves";
import { initBiomes } from "#app/data/balance/biomes";
import { initEggMoves } from "#app/data/balance/egg-moves";
import { initPokemonPrevolutions, initPokemonStarters } from "#app/data/balance/pokemon-evolutions";
import { initMoves } from "#app/data/moves/move";
import { initPokemonForms } from "#app/data/pokemon-forms";
import { initSpecies } from "#app/data/pokemon-species";
import { initAbilities } from "#app/data/abilities/ability";
import TextInterceptor from "#test/testUtils/TextInterceptor";

export enum RogueAction {
  /** Use the first move in the active Pokémon's moveset. */
  FIGHT_1 = 0,
  /** Use the second move in the active Pokémon's moveset. */
  FIGHT_2 = 1,
  /** Use the third move in the active Pokémon's moveset. */
  FIGHT_3 = 2,
  /** Use the fourth move in the active Pokémon's moveset. */
  FIGHT_4 = 3,
  /** Attempt to flee from battle. */
  RUN = 4,
  /** Switch to the first party Pokémon. */
  SWITCH_1 = 5,
  /** Switch to the second party Pokémon. */
  SWITCH_2 = 6,
  /** Switch to the third party Pokémon. */
  SWITCH_3 = 7,
  /** Switch to the fourth party Pokémon. */
  SWITCH_4 = 8,
  /** Switch to the fifth party Pokémon. */
  SWITCH_5 = 9,
  /** Switch to the sixth party Pokémon. */
  SWITCH_6 = 10,
  /** Throw the first Poké Ball type. */
  BALL_1 = 11,
  /** Throw the second Poké Ball type. */
  BALL_2 = 12,
  /** Throw the third Poké Ball type. */
  BALL_3 = 13,
  /** Throw the fourth Poké Ball type. */
  BALL_4 = 14,
  /** Throw the fifth Poké Ball type. */
  BALL_5 = 15,
  /** Terastallize and use the first move. */
  TERA_1 = 16,
  /** Terastallize and use the second move. */
  TERA_2 = 17,
  /** Terastallize and use the third move. */
  TERA_3 = 18,
  /** Terastallize and use the fourth move. */
  TERA_4 = 19,
  /** Target the first battler index. */
  TARGET_1 = 20,
  /** Target the second battler index. */
  TARGET_2 = 21,
  /** Target the third battler index. */
  TARGET_3 = 22,
  /** Target the fourth battler index. */
  TARGET_4 = 23,
  /** Choose the first party slot when switching. */
  SLOT_1 = 24,
  /** Choose the second party slot when switching. */
  SLOT_2 = 25,
  /** Choose the third party slot when switching. */
  SLOT_3 = 26,
  /** Choose the fourth party slot when switching. */
  SLOT_4 = 27,
  /** Choose the fifth party slot when switching. */
  SLOT_5 = 28,
  /** Choose the sixth party slot when switching. */
  SLOT_6 = 29,
  /** Open the bag to use a Poké Ball. */
  BAG = 30,
  /** Confirm the current UI selection. */
  UI_ACTION = 31,
  /** Cancel the current UI selection. */
  UI_CANCEL = 32,
  /** Move the UI cursor up. */
  UI_UP = 33,
  /** Move the UI cursor down. */
  UI_DOWN = 34,
  /** Move the UI cursor left. */
  UI_LEFT = 35,
  /** Move the UI cursor right. */
  UI_RIGHT = 36,
  /** Reject learning the offered move. */
  LEARN_REJECT = 37,
  /** Replace the first move when learning a new one. */
  LEARN_REPLACE_1 = 38,
  /** Replace the second move when learning a new one. */
  LEARN_REPLACE_2 = 39,
  /** Replace the third move when learning a new one. */
  LEARN_REPLACE_3 = 40,
  /** Replace the fourth move when learning a new one. */
  LEARN_REPLACE_4 = 41,
}

/**
 * Headless environment for automated gameplay without UI.
 *
 * This minimal wrapper mirrors the test `GameManager` setup but
 * exposes a simpler interface suited for reinforcement learning.
 */
export default class RogueEnv {
  /** Underlying Phaser game instance running in headless mode. */
  private game: Phaser.Game;

  /** Helper wrapper for injecting Phaser mocks. */
  private wrapper: GameWrapper;


  /** Optional logger for transition data. */
  public logger?: TransitionLogger;

  /** Whether the current run has finished. */
  public terminated = false;

  /** The active {@link BattleScene}. */
  public scene: BattleScene;

  /** Base seed used to initialize each run. */
  private seed: string;

  constructor(seed?: string) {
    this.seed = seed ?? randomString(24);
    // Minimal data initialization mimicking the test setup
    initAbilities();
    initBiomes();
    initEggMoves();
    initPokemonForms();
    initPokemonPrevolutions();
    initPokemonStarters();
    initMoves();
    initSpecies();

    this.game = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
    const setPositionRelative = function (this: any, guide: any, x: number, y: number) {
      const offsetX = guide.width * (-0.5 + (0.5 - guide.originX));
      const offsetY = guide.height * (-0.5 + (0.5 - guide.originY));
      return this.setPosition(guide.x + offsetX + x, guide.y + offsetY + y);
    };
    Phaser.GameObjects.Container.prototype.setPositionRelative = setPositionRelative as any;
    Phaser.GameObjects.Sprite.prototype.setPositionRelative = setPositionRelative as any;
    Phaser.GameObjects.Image.prototype.setPositionRelative = setPositionRelative as any;
    if ((Phaser.GameObjects as any).NineSlice) {
      (Phaser.GameObjects as any).NineSlice.prototype.setPositionRelative = setPositionRelative as any;
    }
    Phaser.GameObjects.Text.prototype.setPositionRelative = setPositionRelative as any;
    Phaser.GameObjects.Rectangle.prototype.setPositionRelative = setPositionRelative as any;
    this.scene = new BattleScene();
    this.wrapper = new GameWrapper(this.game, true);
    this.wrapper.setScene(this.scene);
    // Attach a simple text interceptor so UI text calls do not fail
    new TextInterceptor(this.scene);
    const originalPush = this.scene.phaseManager.pushNew.bind(this.scene.phaseManager);
    this.scene.phaseManager.pushNew = (phase: string, ...args: any[]) => {
      if (phase === "LoginPhase" || phase === "TitlePhase") {
        return;
      }
      return originalPush(phase as any, ...(args as any));
    };
    this.scene.phaseManager.clearAllPhases();
  }

  /**
   * Reset the scene to the initial state.
   * Equivalent to starting a new run.
   */
  reset(seed = this.seed): void {
    this.terminated = false;
    this.seed = seed;
    this.scene.reset(false, true);
    this.scene.setSeed(this.seed);
    this.scene.resetSeed();
    this.scene.enableTutorials = false;
    this.scene.eggSkipPreference = 2;
    initSceneWithoutEncounterPhase(this.scene, [
      SpeciesId.SQUIRTLE,
      SpeciesId.BULBASAUR,
      SpeciesId.CHARMANDER,
    ]);
    this.scene.phaseManager.clearAllPhases();
    this.scene.newBattle();
    this.scene.currentBattle.incrementTurn();
    this.scene.phaseManager.pushNew("TurnInitPhase");
    this.scene.phaseManager.shiftPhase();
    while (this.scene.phaseManager.hasQueuedShift()) {
      this.scene.phaseManager.shiftPhase();
    }
  }

  /**
   * Manually end the current run without progressing phases.
   */
  terminate(): void {
    this.terminated = true;
  }

  /**
   * Apply an action and progress to the next phase.
   *
   * When an {@link RogueAction} is provided it will be mapped to the
   * appropriate in‑game command. A custom function may also be passed to
   * manipulate the underlying {@link BattleScene} directly.
   */
  step(
    action?: RogueAction | ((scene: BattleScene) => void),
    reward?: number,
    done = false,
    fastForward = 1,
  ): number {
    if (this.terminated) {
      return 0;
    }
    let total = 0;
    for (let i = 0; i < fastForward; i++) {
      const prevState = this.getState();

      if (typeof action === "number") {
        const phase: any = this.scene.phaseManager.getCurrentPhase();
        if (phase?.handleCommand) {
          if (action <= RogueAction.FIGHT_4) {
            phase.handleCommand(Command.FIGHT, action);
          } else if (action >= RogueAction.TERA_1 && action <= RogueAction.TERA_4) {
            phase.handleCommand(Command.TERA, action - RogueAction.TERA_1);
          } else if (action >= RogueAction.BALL_1 && action <= RogueAction.BALL_5) {
            phase.handleCommand(Command.BALL, action - RogueAction.BALL_1);
          } else if (action === RogueAction.RUN) {
            phase.handleCommand(Command.RUN, 0);
          } else if (action === RogueAction.BAG) {
            phase.handleCommand(Command.BALL, 0);
          } else if (action >= RogueAction.SWITCH_1 && action <= RogueAction.SWITCH_6) {
            phase.handleCommand(Command.POKEMON, action - RogueAction.SWITCH_1);
          }
        } else if (phase?.constructor.name === "SelectTargetPhase") {
          const handler: any = this.scene.ui.getHandler();
          const cb = handler?.targetSelectCallback as ((targets: number[]) => void) | undefined;
          if (cb && action >= RogueAction.TARGET_1 && action <= RogueAction.TARGET_4) {
            cb([action - RogueAction.TARGET_1]);
          }
        } else if (phase?.constructor.name === "SwitchPhase") {
          const handler: any = this.scene.ui.getHandler();
          const cb = handler?.selectCallback as ((slot: number, option: number) => void) | undefined;
          if (cb && action >= RogueAction.SLOT_1 && action <= RogueAction.SLOT_6) {
            cb(action - RogueAction.SLOT_1, 1);
          }
        } else if (phase?.constructor.name === "LearnMovePhase") {
          const pokemon = phase.getPokemon?.() as any;
          if (action === RogueAction.LEARN_REJECT) {
            /* no-op */
          } else if (
            action >= RogueAction.LEARN_REPLACE_1 &&
            action <= RogueAction.LEARN_REPLACE_4 &&
            pokemon
          ) {
            const idx = action - RogueAction.LEARN_REPLACE_1;
            const moveId = (phase as any).moveId;
            pokemon.setMove(idx, moveId);
          }
        } else if (
          phase?.constructor.name === "SelectModifierPhase" ||
          phase?.constructor.name === "SelectBiomePhase" ||
          phase?.constructor.name === "SelectChallengePhase"
        ) {
          const handler: any = this.scene.ui.getHandler();
          const buttonMap: Record<RogueAction, Button> = {
            [RogueAction.UI_ACTION]: Button.ACTION,
            [RogueAction.UI_CANCEL]: Button.CANCEL,
            [RogueAction.UI_UP]: Button.UP,
            [RogueAction.UI_DOWN]: Button.DOWN,
            [RogueAction.UI_LEFT]: Button.LEFT,
            [RogueAction.UI_RIGHT]: Button.RIGHT,
          } as const;
          const button = buttonMap[action as RogueAction];
          if (button !== undefined && handler?.processInput instanceof Function) {
            handler.processInput(button);
          }
        }
      } else if (typeof action === "function") {
        action(this.scene);
      }

      const autoPhase: any = this.scene.phaseManager.getCurrentPhase();
      if (autoPhase?.constructor?.name === "EggHatchPhase" || autoPhase?.constructor?.name === "EggSummaryPhase") {
        if (autoPhase.constructor.name === "EggHatchPhase") {
          const lapse = autoPhase.eggLapsePhase;
          lapse?.hatchEggSilently?.(autoPhase.egg);
        }
        autoPhase.end?.();
      } else if (autoPhase?.constructor?.name === "EvolutionPhase" || autoPhase?.constructor?.name === "FormChangePhase") {
        const pokemon = autoPhase.pokemon;
        const evolution = autoPhase.evolution;
        const lastLevel = autoPhase.lastLevel ?? 0;
        if (pokemon && evolution) {
          pokemon.evolve?.(evolution, pokemon.species);
          const situation = autoPhase.fusionSpeciesEvolved
            ? LearnMoveSituation.EVOLUTION_FUSED
            : pokemon.fusionSpecies
              ? LearnMoveSituation.EVOLUTION_FUSED_BASE
              : LearnMoveSituation.EVOLUTION;
          const levelMoves = pokemon
            .getLevelMoves(lastLevel + 1, true, false, false, situation)
            .filter((lm: any) => lm[0] === EVOLVE_MOVE);
          for (const lm of levelMoves) {
            this.scene.phaseManager.unshiftNew(
              "LearnMovePhase",
              this.scene.getPlayerParty().indexOf(pokemon),
              lm[1],
            );
          }
        }
        this.scene.phaseManager.unshiftNew("EndEvolutionPhase");
        autoPhase.end?.();
      }

      this.scene.phaseManager.shiftPhase();
      while (this.scene.phaseManager.hasQueuedShift()) {
        this.scene.phaseManager.shiftPhase();
      }
      let phase = this.scene.phaseManager.getCurrentPhase();
      const needsInput = new Set([
        "SwitchPhase",
        "SelectTargetPhase",
        "LearnMovePhase",
        "SelectModifierPhase",
        "SelectBiomePhase",
        "SelectChallengePhase",
      ]);
      let safety = 0;
      while (
        phase &&
        !(phase instanceof CommandPhase) &&
        !needsInput.has(phase.constructor.name) &&
        safety < 100
      ) {
        this.scene.phaseManager.shiftPhase();
        while (this.scene.phaseManager.hasQueuedShift()) {
          this.scene.phaseManager.shiftPhase();
        }
        phase = this.scene.phaseManager.getCurrentPhase();
        safety++;
      }

      const nextState = this.getState();
      if (
        nextState.phase === "VictoryPhase" ||
        nextState.phase === "GameOverPhase"
      ) {
        this.terminated = true;
      }
      const computed = computeStepReward(prevState, nextState);
      const stepReward = reward === undefined ? computed : reward;

      if (this.logger) {
        const record: TransitionRecord = {
          state: prevState,
          action: typeof action === "number" ? action : -1,
          reward: stepReward,
          nextState,
          done:
            (done && i === fastForward - 1) ||
            this.terminated,
        };
        this.logger.log(record);
      }

      total += stepReward;

      if (this.terminated) {
        break;
      }
    }

    return total;
  }

  /**
   * Determine which {@link RogueAction | actions} are currently valid.
   */
  getAvailableActions(): RogueAction[] {
    const phase = this.scene.phaseManager.getCurrentPhase();
    const actions: RogueAction[] = [];
    if (phase instanceof CommandPhase) {
      const pokemon = phase.getPokemon?.();
      const moves = pokemon?.getMoveset?.() ?? [];
      for (let i = 0; i < Math.min(4, moves.length); i++) {
        if (pokemon.trySelectMove(i)) {
          actions.push(RogueAction.FIGHT_1 + i);
        }
      }
      const pokeballs = Object.values(this.scene.pokeballCounts ?? {});
      if (pokeballs.some(c => c > 0)) {
        actions.push(RogueAction.BAG);
      }
      for (let i = 0; i < Math.min(5, pokeballs.length); i++) {
        if (pokeballs[i] > 0) {
          actions.push((RogueAction.BALL_1 + i) as RogueAction);
        }
      }
      const fieldIndex = phase.getFieldIndex();
      const activePokemon = this.scene.getField()[fieldIndex];
      const hasTeraMod = this.scene.getModifiers(TerastallizeAccessModifier).length > 0;
      const isBlockedForm =
        activePokemon.isMega() || activePokemon.isMax() || activePokemon.hasSpecies(SpeciesId.NECROZMA, "ultra");
      const currentTeras = this.scene.arena.playerTerasUsed;
      const plannedTera =
        this.scene.currentBattle.preTurnCommands[0]?.command === Command.TERA && fieldIndex > 0 ? 1 : 0;
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
        const party = this.scene.getPlayerParty();
        for (let i = 0; i < Math.min(6, party.length); i++) {
          const p = party[i];
          if (p.hp > 0 && !p.isActive(true)) {
            actions.push((RogueAction.SWITCH_1 + i) as RogueAction);
          }
        }
      }
    } else if (phase?.constructor.name === "SelectTargetPhase") {
      const handler: any = this.scene.ui.getHandler();
      const targets: number[] = handler?.targets ?? [];
      for (const t of targets) {
        if (t >= 0 && t <= 3) {
          actions.push((RogueAction.TARGET_1 + t) as RogueAction);
        }
      }
    } else if (phase?.constructor.name === "SwitchPhase") {
      const party = this.scene.getPlayerParty();
      for (let i = 0; i < Math.min(6, party.length); i++) {
        const p = party[i];
        if (p.hp > 0 && !p.isActive(true)) {
          actions.push((RogueAction.SLOT_1 + i) as RogueAction);
        }
      }
    } else if (phase?.constructor.name === "LearnMovePhase") {
      const pokemon = phase.getPokemon?.() as any;
      if (pokemon?.getMoveset?.().length >= 4) {
        actions.push(
          RogueAction.LEARN_REJECT,
          RogueAction.LEARN_REPLACE_1,
          RogueAction.LEARN_REPLACE_2,
          RogueAction.LEARN_REPLACE_3,
          RogueAction.LEARN_REPLACE_4,
        );
      }
    } else if (
      phase?.constructor.name === "SelectModifierPhase" ||
      phase?.constructor.name === "SelectChallengePhase"
    ) {
      actions.push(
        RogueAction.UI_ACTION,
        RogueAction.UI_CANCEL,
        RogueAction.UI_UP,
        RogueAction.UI_DOWN,
        RogueAction.UI_LEFT,
        RogueAction.UI_RIGHT,
      );
    } else if (phase?.constructor.name === "SelectBiomePhase") {
      actions.push(
        RogueAction.UI_ACTION,
        RogueAction.UI_CANCEL,
        RogueAction.UI_UP,
        RogueAction.UI_DOWN,
      );
    }
    return actions;
  }

  /**
   * Return a lightweight snapshot of the current battle state.
   */
  getState(): SerializedState & { availableActions: RogueAction[] } {
    const state = serializeState(this.scene) as SerializedState & {
      availableActions: RogueAction[];
    };
    state.availableActions = this.getAvailableActions();
    return state;
  }
}
