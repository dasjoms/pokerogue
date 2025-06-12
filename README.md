<picture><img src="./public/images/logo.png" width="300" alt="PokéRogue"></picture>

PokéRogue is a browser based Pokémon fangame heavily inspired by the roguelite genre. Battle endlessly while gathering stacking items, exploring many different biomes, fighting trainers, bosses, and more!

# Contributing

## 🛠️ Development

If you have the motivation and experience with Typescript/Javascript (or are willing to learn) please feel free to fork the repository and make pull requests with contributions. If you don't know what to work on but want to help, reference the below **To-Do** section or the **#feature-vote** channel in the discord.

### 💻 Environment Setup

#### Prerequisites

- node: 22.14.0
- npm: [how to install](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

#### Running Locally

1. Clone the repo and in the root directory run `npm install`
    - *if you run into any errors, reach out in the **#dev-corner** channel in discord*
2. Run `npm run start:dev` to locally run the project in `localhost:8000`

#### Linting

We're using Biome as our common linter and formatter. It will run automatically during the pre-commit hook but if you would like to manually run it, use the `npm run biome` script. To view the complete rules, check out the [biome.jsonc](./biome.jsonc) file.

### 📚 Documentation

You can find the auto-generated documentation [here](https://pagefaultgames.github.io/pokerogue/main/index.html).
For information on enemy AI, check out the [enemy-ai.md](./docs/enemy-ai.md) file.
For detailed guidelines on documenting your code, refer to the [comments.md](./docs/comments.md) file.

### ❔ FAQ

**How do I test a new _______?**

- In the `src/overrides.ts` file there are overrides for most values you'll need to change for testing

**How do I retrieve the translations?**

- The translations were moved to the [dedicated translation repository](https://github.com/pagefaultgames/pokerogue-locales) and are now applied as a submodule in this project.
- The command to retrieve the translations is `git submodule update --init --recursive`. If you still struggle to get it working, please reach out to #dev-corner channel in Discord.
## Running Tests

Run `npm ci --ignore-scripts` to install dependencies without executing postinstall hooks.
Then run `npm run test:silent` to execute the Vitest suite with concise output. This repository however is a fork that only needs to use the tests listed within the AGENTS.md.

## Headless Environment Demo

Run the demo script to confirm headless battles progress correctly:

```bash
bash setup.sh
source ~/.nvm/nvm.sh
nvm use 22.14.0
npm run env:demo -- 3 demo-log.json
```

Set `VITE_HEADLESS=1` to bypass the login phase and skip UI setup when running headless scripts.

You can also provide optional environment variables:

- `ROGUE_SEED` – fixed seed used when creating the environment.
- `ROGUE_LOG_PATH` – file path where transition logs are saved.
- `ROGUE_STEPS` – number of `step()` calls to execute when running the demo script.

The optional first argument specifies how many `step()` calls to run (defaults to the value of `ROGUE_STEPS` or 2). If a path is provided as the second argument, or via `ROGUE_LOG_PATH`, the transition log is written there; otherwise it prints to STDOUT.

To benchmark environment performance, run:

```bash
npm run env:bench -- 1000
```

This executes a given number of steps and reports the steps per second. `ROGUE_BENCH_STEPS` and `ROGUE_SEED` can also be provided as environment variables.

To run a simple training session that records transitions, use:

```bash
npm run env:train -- 10000 my-log.json.gz
```

`ROGUE_TRAIN_STEPS`, `ROGUE_LOG_PATH` and `ROGUE_SEED` can also be provided as environment variables. The resulting log file is gzip compressed.

For a more advanced example using a neural network agent, see the [Reinforcement Learning Guide](./docs/rl-guide.md) and run:

```bash
VITE_HEADLESS=1 npx tsx scripts/rogue-env-dqn.ts
```
The script accepts optional arguments for episodes, steps, model directory and log file:

```bash
VITE_HEADLESS=1 npx tsx scripts/rogue-env-dqn.ts 50 500 my-model my-log.json.gz
```
Environment variables `ROGUE_EPISODES`, `ROGUE_MAX_STEPS`, `ROGUE_MODEL_PATH` and `ROGUE_LOG_PATH` may be used instead of arguments.
If the log filename ends with `.gz` it will be gzip compressed.



## 🪧 To Do

Check out [Github Issues](https://github.com/pagefaultgames/pokerogue/issues) to see how can you help us!

# 📝 Credits
>
> If this project contains assets you have produced and you do not see your name, **please** reach out, either [here on GitHub](https://github.com/pagefaultgames/pokerogue/issues/new) or via [Discord](https://discord.gg/pokerogue).

Thank you to all the wonderful people that have contributed to the PokéRogue project! You can find the credits [here](./CREDITS.md).
