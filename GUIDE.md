# Pokerogue Headless Conversion Guide

This document describes how to transform the repository into a UI‑less version suitable for automated play by a neural network.  It summarises the existing game flow, relevant code locations and the steps required to expose the core logic without browser UI.

## 1. Repository Overview

- **src/** – all gameplay code written in TypeScript.  Important modules:
  - `battle-scene.ts` & `battle.ts` – main scene and battle logic.
  - `phase-manager.ts` & `phases/` – state machine controlling the order of battle phases.
  - `system/` – save data, settings and unlockable handling.
  - `plugins/api/` – network API helpers for login and cloud saves.
  - `rogue-env.ts` – minimal headless environment already used in tests.
- **test/** – Vitest suite.  `rogue-env.test.ts` verifies the headless wrapper.
- **public/** – assets and translation submodule.

The game normally runs as a Phaser web app.  `main.ts` creates the Phaser game and loads two scenes: `LoadingScene` and `BattleScene`.  The `BattleScene` owns the `PhaseManager`, which orchestrates a large number of phases defined in `src/phases/`.  UI handlers are created inside the scene when running normally.

## 2. Typical Game Flow

A standard run navigates the following phases (simplified):

1. **TitlePhase** – shows the title screen.  Player chooses to start a new game or load a save.
2. **LoginPhase** – optional account verification when not bypassed.
3. **SelectGenderPhase** – player selects gender.
4. **SelectStarterPhase** – choose starters and pick a save slot.  This populates the party and initializes `GameMode`.
5. **EncounterPhase** – handles every new battle.  Enemy Pokémon are generated and field elements are prepared.
6. **TurnInitPhase** → numerous battle phases (command selection, move execution, etc.).
7. **NewBiomeEncounterPhase / NextEncounterPhase** – after a wave ends, sets up the next encounter or biome.
8. **VictoryPhase / GameOverPhase** – final outcomes.

Each phase is a class under `src/phases/` and `PhaseManager` drives them using a queue.  A phase may push or prepend new phases to control the flow.

## 3. Headless Environment (`RogueEnv`)

The repository already contains `src/rogue-env.ts` which demonstrates how a minimal, UI‑less environment can run the game for testing.  Key points:

- Phaser is created with `type: Phaser.HEADLESS`.
- `GameWrapper` from tests injects mocked systems so the scene can run without rendering.
- `initSceneWithoutEncounterPhase` (from `test/testUtils/gameManagerUtils.ts`) populates the starter Pokémon and sets up `BattleScene` without going through `EncounterPhase`.
- `reset()` clears the scene and starts the first `TurnInitPhase` immediately.
- `step()` allows actions to be applied and advances the `PhaseManager` one step.
- `getState()` calls `utils/serialize.ts` to produce a JSON snapshot containing phase name, turn number and simplified Pokémon data.

This wrapper is the starting point for the full UI‑less build.

## 4. Removing Login and UI

For neural‑network play we do not require any account features or DOM based UI.  The following modules can be disabled or bypassed:

- **LoginPhase** and account helpers in `account.ts`.  Bypass by setting `bypassLogin` to `true` (see `src/global-vars/bypass-login.ts`) or by removing these phases from `PhaseManager` when running headlessly.
- **TitlePhase** and other menu UIs.  In `RogueEnv` the `pushNew` method of `PhaseManager` is patched so attempts to queue `LoginPhase` or `TitlePhase` are ignored.
- All UI handlers created in `BattleScene.create()` should be skipped.  When constructing a headless scene you can stub out UI components or gate their creation behind a check (e.g. `if (!headless)`).
- Sound and animation pipelines are optional.  They can be mocked or disabled similarly to the test `GameWrapper` implementation.

## 5. Starting a Run Automatically

A training run should begin immediately with three base starters in the player party.  `initSceneWithoutEncounterPhase` already demonstrates how to create starter Pokémon programmatically.  The typical sequence is:

1. Instantiate `BattleScene` and call `scene.create()` (with UI creation skipped).
2. Use `generateStarter`/`initSceneWithoutEncounterPhase` logic to add **Squirtle**, **Bulbasaur**, and **Charmander** (species IDs 7, 1 and 4) at the starting level defined by the current `GameMode`.
3. Call `scene.newBattle()` and `scene.arena.init()` to prepare the first wave.
4. Enqueue `TurnInitPhase` so the first call to `step()` begins the battle.

No save slot selection or gender prompt should occur in this mode.

## 6. Action Interface

`RogueEnv` currently exposes a small enum `RogueAction` mapping to the four moves of the active Pokémon.  A production environment should map every relevant decision the player can make:

- Command choice: `FIGHT`, `SWITCH`, `BAG`, `RUN`.
- Move selection when `FIGHT` is chosen.
- Target selection for moves that require it.
- Switching which party member to send out.
- Using items or special mechanics (e.g. Tera form).

Inside `step()`, translate the numeric action to calls on the current phase (for example `phase.handleCommand(Command.FIGHT, moveIndex)`).  After executing the command, advance phases with `phaseManager.shiftPhase()` until a new command phase is reached or the battle ends.

## 7. State Serialization

The neural network needs a consistent observation of the game.  `src/utils/serialize.ts` shows a minimal example.  A more complete serializer should include:

- Active phase name and turn counter.
- Full player party: species, level, HP, status, moves with PP, held items, stat boosts, etc.
- Enemy party with the same fields.
- Current arena modifiers, weather, terrain and wave index.
- Available items and money.

Keep the format stable so `(state, action, reward, next_state, done)` tuples can be logged for training.

## 8. Maintaining Game Logic

All battle calculations, move effects, abilities and modifiers are implemented in the existing code under `src/`.  When stripping UI, ensure these gameplay modules remain untouched:

- `battle.ts` – handles turn structure and battle seed.
- `field/pokemon.ts` – Pokémon data, stats and move execution.
- `phases/` – each phase encapsulates discrete logic.  The headless version should reuse these classes directly; only the UI interactions around them are removed.

The goal is feature parity with the browser version, so tests should compare outcomes using the same seeds and actions.

## 9. Suggested Development Steps

1. **Create a dedicated headless build flag.**  When enabled, skip all UI setup in `BattleScene.create()` and force `bypassLogin`.
2. **Extend `RogueEnv`.**  Move it from `src/` into a standalone module that can be imported by training scripts.  Add more actions and a richer `getState()` serializer.
3. **Ensure deterministic seeding.**  Use `scene.setSeed()` and `scene.resetSeed()` so simulations are reproducible.
4. **Implement data logging.**  Provide helpers to write serialized transitions to disk for offline training.
5. **Write regression tests.**  Use the existing Vitest framework to confirm that headless battles progress identically to the regular game for a fixed sequence of actions.

By following these steps the repository can evolve into a fully UI‑less simulation environment while keeping all original game mechanics intact.
