import Phaser from "phaser";
import BattleScene from "#app/battle-scene";
import { LoadingScene } from "#app/loading-scene";
import { Command } from "#enums/command";
import serializeState, { type SerializedState } from "#app/utils/serialize";

export enum RogueAction {
  /** Use the first move in the active Pokémon's moveset. */
  FIGHT_1 = 0,
  /** Use the second move in the active Pokémon's moveset. */
  FIGHT_2 = 1,
  /** Use the third move in the active Pokémon's moveset. */
  FIGHT_3 = 2,
  /** Use the fourth move in the active Pokémon's moveset. */
  FIGHT_4 = 3,
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

  /** The active {@link BattleScene}. */
  public scene: BattleScene;

  constructor() {
    this.game = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
    this.scene = new BattleScene();
    // Attach the scenes to the game immediately.
    this.game.scene.add(LoadingScene.KEY, new LoadingScene(), true);
    this.game.scene.add("battle", this.scene, true);
  }

  /**
   * Reset the scene to the initial state.
   * Equivalent to starting a new run.
   */
  reset(): void {
    this.scene.reset(false, true);
    this.scene.phaseManager.clearAllPhases();
    this.scene.phaseManager.pushNew("LoginPhase");
    this.scene.phaseManager.pushNew("TitlePhase");
    this.scene.phaseManager.shiftPhase();
  }

  /**
   * Apply an action and progress to the next phase.
   *
   * When an {@link RogueAction} is provided it will be mapped to the
   * appropriate in‑game command. A custom function may also be passed to
   * manipulate the underlying {@link BattleScene} directly.
   */
  step(action?: RogueAction | ((scene: BattleScene) => void)): void {
    if (typeof action === "number") {
      const phase: any = this.scene.phaseManager.getCurrentPhase();
      if (phase?.handleCommand) {
        phase.handleCommand(Command.FIGHT, action);
      }
    } else if (typeof action === "function") {
      action(this.scene);
    }
    this.scene.phaseManager.shiftPhase();
  }

  /**
   * Return a lightweight snapshot of the current battle state.
   */
  getState(): SerializedState {
    return serializeState(this.scene);
  }
}
