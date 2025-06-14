# Reinforcement Learning Guide

This document explains how to train a neural network to play PokéRogue in a headless environment.

## 1. Environment Setup

Run the provided setup script and verify the environment:

```bash
bash setup.sh
source ~/.nvm/nvm.sh
nvm use 22.14.0
bash verify-setup.sh
```

## 2. Running the DQN Example

A demonstration script using TensorFlow.js is included at `scripts/rogue-env-dqn.ts`.
It trains a small Deep Q-Network to select actions directly from the game state.
Execute it with:

```bash
VITE_HEADLESS=1 npx tsx scripts/rogue-env-dqn.ts
```

Optional arguments let you set the episode count, steps per episode, model output
directory and log file:

```bash
VITE_HEADLESS=1 npx tsx scripts/rogue-env-dqn.ts 50 500 my-model my-log.json.gz
```

Environment variables `ROGUE_EPISODES`, `ROGUE_MAX_STEPS`, `ROGUE_MODEL_PATH` and
`ROGUE_LOG_PATH` may also be provided.

The model directory defaults to `dqn-model`. When a log path is supplied the
training transitions are saved (gzip compressed if the filename ends with `.gz`).

## 3. Writing Custom Agents

`RogueEnv` exposes three main methods:

- `reset(seed?)` – start a new run with an optional seed.
- `getState()` – return a JSON snapshot of the current game state.
- `step(action)` – apply a `RogueAction` and return the step reward.

Agents should observe the available actions with `getAvailableActions()` and
choose one at each step. Rewards can be accumulated to learn optimal strategies.
See `scripts/rogue-env-dqn.ts` for a minimal training loop.

When the current phase is the modifier shop the environment exposes special
`SHOP_i_SLOT_j` actions. Each combination instantly purchases shop item `i`
and applies it to party slot `j`, bypassing the usual UI navigation. The enum
contains entries for up to seven shop items and six party slots.
