# Fixing Common Issues in the Reinforcement Learning Environment

This guide summarises the problems observed when running the headless DQN example
and explains how to resolve them. Each section includes pointers to relevant
code so the fixes can be implemented without digging through the entire
repository.

## 1. Missing Player Moves

**Problem:** Starter Pokémon have an empty moveset when the scene is created via
`initSceneWithoutEncounterPhase()`. Without moves the environment never offers
`FIGHT_x` actions, so the agent only sees commands like `RUN`, `BAG` or
`SWITCH_x`.

**Cause:** `PlayerPokemon` sets `this.moveset = []` when created without a data
source and the game mode is not Daily Run. The test helper generates starters in
Classic mode and does not populate their moves.

Relevant code:

- `src/field/pokemon.ts` – `PlayerPokemon` constructor defaults.
- `test/testUtils/gameManagerUtils.ts` – `initSceneWithoutEncounterPhase()` and
  `generateStarter()`.

**Fix:** Ensure starters learn at least one damaging move before being added to
the party. There are two common approaches:

1. After calling `scene.addPlayerPokemon()` in
   `initSceneWithoutEncounterPhase()`, invoke
   `pokemon.generateAndPopulateMoveset()` to auto-fill a valid level-up moveset;
2. Or construct the starter with a `PokemonData` source that already contains a
   moveset and pass that to `addPlayerPokemon()`.

Either method will make `getAvailableActions()` expose `FIGHT_x` options during
the `CommandPhase`.

## 2. Switching Pokémon Does Nothing

**Problem:** `SWITCH_x` actions do not change the active party slot. The log
shows the active index remaining at `0` even after repeated attempts.

**Cause:** `RogueEnv.step()` automatically advances through phases until it
reaches another `CommandPhase`. When a switch command is issued, the game enters
`SwitchPhase`, but the while-loop immediately shifts past it without waiting for
`SLOT_x` input. As a result the switch menu closes and the party stays in place.

Relevant code:

- `src/env/rogue-env.ts` – the `step()` method contains a loop that skips all
  phases that are not instances of `CommandPhase`.

**Fix:** Modify the loop so that phases requiring user input are not skipped.
`SwitchPhase`, `SelectTargetPhase`, `LearnMovePhase` and the various modifier or
biome selection phases should break the auto-advance logic. The environment then
remains in that phase until a subsequent call to `step()` supplies a `SLOT_x` or
UI action.

Pseudo-code for the condition:

```ts
const needsInput = ["SwitchPhase", "SelectTargetPhase", "LearnMovePhase", /* ... */];
while (phase && !(phase instanceof CommandPhase) && !needsInput.includes(phase.constructor.name)) {
  phaseManager.shiftPhase();
  // ...
}
```

## 3. Enemy Pokémon Never Attack

**Problem:** The opponent takes no damaging actions and battles stall.

**Cause:** Because the player has no usable moves, the environment never enters
normal turn resolution where both sides act. Commands like `RUN` or `BAG` end
the `CommandPhase` early and the loop returns immediately to command selection.
Once the player can choose a valid `FIGHT_x` action the turn will progress
through `TurnInitPhase`, attack execution and enemy AI decision making.

**Fix:** Resolving section 1 (giving starters moves) automatically fixes this.
When the agent selects `FIGHT_x`, the usual turn sequence plays out and enemies
will act according to their AI routines.

## 4. What the "Bag" Action Does

`RogueAction.BAG` maps directly to `Command.BALL` with index `0`. It bypasses any
bag UI and simply attempts to throw the first type of Poké Ball the player owns.
If no ball is available or the catch fails, nothing else happens.

The mapping is implemented in `RogueEnv.step()` under the `RogueAction.BAG`
branch.

## 5. Recommended Workflow

1. Apply the moveset fix in `initSceneWithoutEncounterPhase()` or adjust
   `PlayerPokemon` construction so starters know moves.
2. Update `RogueEnv.step()` with the input-aware phase skipping logic.
3. Re-run the DQN example:

   ```bash
   VITE_HEADLESS=1 npx tsx scripts/rogue-env-dqn.ts 2 10 my-model my-log.json.gz
   ```

   You should now see `FIGHT_x` actions, successful switches after selecting
   `SLOT_x`, and enemy moves dealing damage.

These changes will make the reinforcement learning environment behave much more
like real gameplay, enabling meaningful agent training.
