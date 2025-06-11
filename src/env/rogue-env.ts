import Phaser from "phaser";
import BattleScene from "#app/battle-scene";
import { Command } from "#enums/command";
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
  /** Throw the first Poké Ball type. */
  BALL_1 = 8,
  /** Throw the second Poké Ball type. */
  BALL_2 = 9,
  /** Throw the third Poké Ball type. */
  BALL_3 = 10,
  /** Throw the fourth Poké Ball type. */
  BALL_4 = 11,
  /** Throw the fifth Poké Ball type. */
  BALL_5 = 12,
  /** Terastallize and use the first move. */
  TERA_1 = 13,
  /** Terastallize and use the second move. */
  TERA_2 = 14,
  /** Terastallize and use the third move. */
  TERA_3 = 15,
  /** Terastallize and use the fourth move. */
  TERA_4 = 16,
  /** Target the first battler index. */
  TARGET_1 = 17,
  /** Target the second battler index. */
  TARGET_2 = 18,
  /** Target the third battler index. */
  TARGET_3 = 19,
  /** Target the fourth battler index. */
  TARGET_4 = 20,
  /** Choose the first party slot when switching. */
  SLOT_1 = 21,
  /** Choose the second party slot when switching. */
  SLOT_2 = 22,
  /** Choose the third party slot when switching. */
  SLOT_3 = 23,
  /** Choose the fourth party slot when switching. */
  SLOT_4 = 24,
  /** Choose the fifth party slot when switching. */
  SLOT_5 = 25,
  /** Choose the sixth party slot when switching. */
  SLOT_6 = 26,
  /** Open the bag to use a Poké Ball. */
  BAG = 27,
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

  /** The active {@link BattleScene}. */
  public scene: BattleScene;

  /** Base seed used to initialize each run. */
  private seed: string;

  constructor(seed?: string) {
    this.seed = seed ?? randomString(24);
    this.game = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
    this.scene = new BattleScene();
    this.wrapper = new GameWrapper(this.game, true);
    this.wrapper.setScene(this.scene);
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
    this.seed = seed;
    this.scene.reset(false, true);
    this.scene.setSeed(this.seed);
    this.scene.resetSeed();
    this.scene.enableTutorials = false;
    initSceneWithoutEncounterPhase(this.scene, [SpeciesId.SQUIRTLE, SpeciesId.BULBASAUR, SpeciesId.CHARMANDER]);
    this.scene.currentBattle.incrementTurn();
    this.scene.phaseManager.clearAllPhases();
    this.scene.phaseManager.pushNew("TurnInitPhase");
    this.scene.phaseManager.shiftPhase();
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
          } else if (action >= RogueAction.SWITCH_1 && action <= RogueAction.SWITCH_3) {
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
        }
      } else if (typeof action === "function") {
        action(this.scene);
      }

      this.scene.phaseManager.shiftPhase();
      let phase = this.scene.phaseManager.getCurrentPhase();
      let safety = 0;
      while (phase && !(phase instanceof CommandPhase) && safety < 100) {
        this.scene.phaseManager.shiftPhase();
        phase = this.scene.phaseManager.getCurrentPhase();
        safety++;
      }

      const nextState = this.getState();
      const computed = computeStepReward(prevState, nextState);
      const stepReward = reward === undefined ? computed : reward;

      if (this.logger) {
        const record: TransitionRecord = {
          state: prevState,
          action: typeof action === "number" ? action : -1,
          reward: stepReward,
          nextState,
          done: done && i === fastForward - 1,
        };
        this.logger.log(record);
      }

      total += stepReward;
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
      const pokemon = phase.getPokemon();
      const moves = pokemon.getMoveset();
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
        for (let i = 0; i < Math.min(3, party.length); i++) {
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
