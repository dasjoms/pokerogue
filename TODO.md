# Neural Network Training Support

This document summarizes high level tasks required to expose the game logic for machine learning without the normal browser UI. These points are based on the current repository structure and headless test environment.

## 1. Headless environment wrapper
- Create a new class (e.g. `RogueEnv`) that instantiates `BattleScene` using `Phaser.HEADLESS` similar to the test `GameManager`.
- Provide methods:
  - `reset()` – start a new run or battle.
  - `step(action)` – apply a single action and advance the game phases.
  - `getState()` – return a serialized representation of the current gamestate.
- Use existing `GameManager` utilities as reference but strip out UI handlers and test-only helpers.
- `reset()` should automatically start a classic run with a fixed starter party:
  - Squirtle, Bulbasaur and Charmander are added directly to the player's party.
  - Skip all menus and immediately push phases so the first enemy encounter begins.
  - Reuse logic from `initSceneWithoutEncounterPhase()` to build the starters and populate `BattleScene`.
  - The first call to `step()` should correspond to selecting the first action in the opening battle.

## 2. Game state serialization
- Implement serialization functions that traverse scene objects and return JSON describing:
  - player party Pokémon stats/moves
  - enemy party Pokémon stats/moves
  - current phase/turn info
  - inventory, modifiers and other field effects
- Keep the format consistent so the training code can store `(state, action, reward, next_state, done)` tuples.

## 3. Direct action interface
- Map discrete actions expected by the neural network to in-game decisions. Example actions could represent high level commands like `Fight`, `Switch` or `Use Item`, or direct move selections.
- Replace input events with direct method calls to `BattleScene` and phase managers to minimize overhead.

## 4. Remove UI dependencies
- When running in training mode, disable creation of all UI handlers. Mock or bypass any required methods so the game can progress without rendering.
- Ensure the new environment runs purely in memory to enable fast simulation.

## 5. Data logging utilities
- Add helpers to record transitions `(state, action, reward, next_state, done)` during training runs.
- Optionally reuse existing save‑data export helpers for writing logs to disk.

## 6. Automated tests
- Add unit tests verifying that the headless environment produces the same battle outcomes as the standard game when provided with identical actions and seeds.
- Tests should also check that serialization and action mapping behave deterministically.

These tasks should make the game logic accessible for reinforcement learning without modifying the core gameplay rules.
