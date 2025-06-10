#!/bin/bash
set -euo pipefail
# Install Node.js 22.14.0 using nvm
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
# install and use node version from .nvmrc
NODE_VERSION="$(cat .nvmrc)"
nvm install "$NODE_VERSION"
nvm use "$NODE_VERSION"

# update npm to latest
npm install -g npm

# fetch translation submodule
if [ -f .gitmodules ]; then
  git submodule update --init --recursive
fi

# install project dependencies
npm ci
