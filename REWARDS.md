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
