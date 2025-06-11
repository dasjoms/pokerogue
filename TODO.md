# Neural Network Training Support

This file tracks outstanding work required to convert PokéRogue into a stable headless environment usable for reinforcement learning.  Many basics are already implemented (`RogueEnv` wrapper, headless flag, serialization and parity tests).  The remaining tasks are grouped below in a suggested development order.

## 1. Finalise headless environment module
- [x] Move `RogueEnv` and `TransitionLogger` into their own folder or package so external training scripts can import them cleanly.
- [x] Provide a simple CLI entry point that instantiates `RogueEnv`, runs a fixed number of steps and writes the log to disk.
- [x] Document environment variables (`VITE_HEADLESS`, seed selection, log path).

## 2. Expand the action space
- [x] Add support for item usage, terastallization, capturing and other command types.
- [x] Allow selecting a target when a move or switch requires it and handling of multi-turn moves.
- Expose high level commands such as `Bag` and `Run` as discrete actions.
- Update tests to cover the new actions and ensure backward compatibility.

## 3. Enrich state serialization
- Include detailed move information (power, type, remaining PP) in `SerializedState`.
- Capture held items, stat boosts and volatile statuses for both player and enemy.
- Expose arena features like hazards, terrain turns and wave index in a stable format.
- Version the JSON schema so training data remains usable as the format evolves.

## 4. Reward calculation and logging
- Provide helper functions to compute rewards after each step (e.g. damage dealt, fainted Pokémon, wave cleared).
- Store `(state, action, reward, next_state, done)` tuples using `TransitionLogger` with optional compression or rotation.
- Add utilities to replay logged transitions to verify determinism.

## 5. Performance improvements
- Skip animations and audio entirely when `headless` to maximise simulation speed.
- Offer a "fast forward" option to progress multiple internal phases within a single call to `step()`.
- Benchmark large batches of steps to identify remaining bottlenecks.

## 6. Integration and packaging
- Provide an npm script or Dockerfile to run training sessions out of the box.
- Publish the headless environment as a versioned package for other projects.
- Write concise documentation explaining how to embed the environment into external reinforcement learning pipelines.

## 7. Extended test suite
- Continue mirroring battles between the normal game and `RogueEnv` to catch regressions.
- Add tests that verify new serialization fields and action mappings.
- Ensure seeding remains deterministic across Node versions.
