import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";

export class HideAbilityPhase extends Phase {
  public readonly phaseName = "HideAbilityPhase";
  start() {
    super.start();

    if (!globalScene.abilityBar) {
      this.end();
      return;
    }

    globalScene.abilityBar.hide().then(() => {
      this.end();
    });
  }
}
