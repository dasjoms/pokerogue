#!/bin/bash
set -euo pipefail

EXPECTED_NODE_VERSION="$(cat .nvmrc)"
ACTUAL_NODE_VERSION="$(node --version)"
if [ "$ACTUAL_NODE_VERSION" != "$EXPECTED_NODE_VERSION" ]; then
  echo "Expected Node $EXPECTED_NODE_VERSION but found $ACTUAL_NODE_VERSION"
  exit 1
fi

npm --version >/dev/null

if [ ! -d "public/locales" ]; then
  echo "Translations submodule missing"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Dependencies not installed"
  exit 1
fi

echo "Environment verified"
