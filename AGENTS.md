# Instructions for Agents

This repository requires a specific environment before running any tests or commands.

## Dependencies
- `git`
- `curl`
- `nvm` (version 0.39.7 or newer)
- `node` 22.14.0
- `npm`

## Setup
Before running other commands, execute the setup script:

```bash
bash setup.sh
```

This installs Node.js via nvm, updates npm, initializes the translation submodule and installs project dependencies.

After running the setup script, activate the correct Node version for this shell:

```bash
source ~/.nvm/nvm.sh
nvm use 22.14.0
```

And rebuild tensorflow using:

```bash
npm rebuild @tensorflow/tfjs-node --build-addon-from-source
```

## Verification
After running the setup script and activating Node 22.14.0, execute the verification script to confirm the environment is ready:

```bash
bash verify-setup.sh
```

Do not run other project commands until the verification script exits successfully.


## Tests

The current state of the repository requires you to run 'ROGUE_SEED=4 VITE_HEADLESS=1 npx tsx scripts/rogue-env-dqn.ts 3 10 model-5 log-5.json' to run the neural network training script. You will have to manually stop it after around 15 seconds as it does not exit automatically. Whenever you add new features or make modifications you are to run the training script with the provided command and deeply analyze the generated "log-5.json" file to verify your changes are taking the desired effect on training.
