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

## Verification
After running the setup script, execute the verification script to confirm the environment is ready:

```bash
bash verify-setup.sh
```

Do not run other project commands until the verification script exits successfully.
