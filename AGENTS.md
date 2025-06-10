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
