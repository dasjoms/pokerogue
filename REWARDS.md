# Reward Function Overview

The reinforcement learning environment exposes a weighted reward function used by
`RogueEnv`.  The reward encourages the agent to clear battles while keeping its
Pokémon healthy and growing the party.

## Current Components

| Component       | Description                                                 |
|-----------------|-------------------------------------------------------------|
| `damageDealt`   | Total HP removed from all enemies during a step.           |
| `hpHealed`      | Amount of HP restored to the player's party.               |
| `enemyFainted`  | Count of opposing Pokémon that fainted.                    |
| `playerFainted` | Count of player Pokémon that fainted.                      |
| `waveCleared`   | Increments when progressing to the next wave **except**
|                 | when the progress comes from using the `RUN` command.       |
| `partyLevel`    | Increase in the sum of the player's Pokémon levels.        |

Default weights for these components are defined in `src/env/reward.ts`.

### Planned Component

*Super‑effective Move Chosen* – grant a small bonus whenever the agent selects a
move that is super‑effective against at least one target in the current turn.
Implementation will require checking the chosen move's type effectiveness before
`TurnStartPhase` resolves and adding a positive reward if the move would deal
super‑effective damage.

## Updating the Reward Function

1. Adjust the weights in `src/env/reward.ts` to tune behaviour.
2. Run the training script described in `AGENTS.md` and inspect the generated
   log file to verify that rewards change as expected.

## Eliminating Wave Transition Artifacts

`getRewardComponents` currently rewards raw differences in enemy HP. When a new wave spawns with higher HP than the old one, this causes negative `damageDealt` even though the agent did nothing. Likewise, using `RUN` advances the wave and yields a bonus equal to the previous enemies' HP.

To fix these issues:

1. Clamp the `damageDealt` calculation so HP increases never become negative and only count actual damage. Around lines 36‑45 of `src/env/reward.ts`, compute:
   ```ts
   const diff = prevEnemyHp - nextEnemyHp;
   const damageDealt = next.wave === prev.wave && diff > 0 ? diff : 0;
   ```
   This ignores enemy healing or newly spawned Pokémon.
2. When a wave changes because of the `RUN` command, also remove the damage bonus that `getRewardComponents` adds. In `RogueEnv.runEpisode` (lines 402‑409 of `src/env/rogue-env.ts`), subtract `prevEnemyHp` from the computed reward whenever `RUN` progresses the wave.

These adjustments ensure rewards only reflect real damage inflicted and prevent fleeing from giving unintended positives.
