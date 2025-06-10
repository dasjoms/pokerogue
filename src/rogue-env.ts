import Phaser from "phaser";
import BattleScene from "#app/battle-scene";
import { Command } from "#enums/command";
import { randomString } from "#app/utils/common";
import serializeState, { type SerializedState } from "#app/utils/serialize";
import type TransitionLogger from "#app/transition-logger";
import type { TransitionRecord } from "#app/transition-logger";
import GameWrapper from "#test/testUtils/gameWrapper";
import { initSceneWithoutEncounterPhase } from "#test/testUtils/gameManagerUtils";

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
    initSceneWithoutEncounterPhase(this.scene);
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
  step(action?: RogueAction | ((scene: BattleScene) => void), reward = 0, done = false): void {
    const prevState = this.getState();
    if (typeof action === "number") {
      const phase: any = this.scene.phaseManager.getCurrentPhase();
      if (phase?.handleCommand) {
        if (action <= RogueAction.FIGHT_4) {
          phase.handleCommand(Command.FIGHT, action);
        } else if (action === RogueAction.RUN) {
          phase.handleCommand(Command.RUN, 0);
        } else if (action >= RogueAction.SWITCH_1 && action <= RogueAction.SWITCH_3) {
          phase.handleCommand(Command.POKEMON, action - RogueAction.SWITCH_1);
        }
      }
    } else if (typeof action === "function") {
      action(this.scene);
    }
    this.scene.phaseManager.shiftPhase();
    const nextState = this.getState();
    if (this.logger) {
      const record: TransitionRecord = {
        state: prevState,
        action: typeof action === "number" ? action : -1,
        reward,
        nextState,
        done,
      };
      this.logger.log(record);
    }
  }

  /**
   * Return a lightweight snapshot of the current battle state.
   */
  getState(): SerializedState {
    return serializeState(this.scene);
  }
}
