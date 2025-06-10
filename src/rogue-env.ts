import Phaser from "phaser";
import BattleScene from "#app/battle-scene";

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
    // Attach the scene to the game immediately.
    this.game.scene.add("battle", this.scene, true);
    this.scene.create();
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
   * @param action Function that interacts with the underlying scene.
   */
  step(action?: (scene: BattleScene) => void): void {
    action?.(this.scene);
    this.scene.phaseManager.shiftPhase();
  }

  /**
   * Return a lightweight snapshot of the current battle state.
   */
  getState(): Record<string, unknown> {
    return {
      phase: this.scene.phaseManager.getCurrentPhase()?.constructor.name,
      playerParty: this.scene.getPlayerParty().map(p => ({
        id: p.species.speciesId,
        hp: p.hp,
        maxHp: p.getMaxHp(),
      })),
      enemyParty: this.scene.getEnemyParty().map(p => ({
        id: p.species.speciesId,
        hp: p.hp,
        maxHp: p.getMaxHp(),
      })),
    };
  }
}
