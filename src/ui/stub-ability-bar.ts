export default class StubAbilityBar {
  setName(name: string): void {}
  setup(): void {}
  hide(): Promise<void> { return Promise.resolve(); }
  showAbility(
    pokemonName: string,
    abilityName: string,
    passive = false,
    player = true,
  ): Promise<void> { return Promise.resolve(); }
  isVisible(): boolean { return false; }
}
