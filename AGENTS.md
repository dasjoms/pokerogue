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

## Verification
After running the setup script and activating Node 22.14.0, execute the verification script to confirm the environment is ready:

```bash
bash verify-setup.sh
```

Do not run other project commands until the verification script exits successfully.


## Tests

This repository MUST ONLY verify functionality using the tests created specifically for the fork projects purpose (See the list below). No other tests than the ones listed are allowed to be used.
Whenever new features are added or modifications are made you are to modify the existing tests or create a new one to verify its functionality.
Any new tests you create must be added to the list below for proper project maintenance.

### Fork Test Files:

    - rogue-env.test.ts

Run the tests like this: 'npm run test:silent -- test/rogue-env.test.ts'
