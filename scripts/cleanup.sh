#!/usr/bin/env bash
# Reset the workspace by removing generated artefacts and reinstalling deps.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TARGETS=(
  ".next"
  "apps/web/.next"
  "node_modules"
  "test-results"
  "tsconfig.tsbuildinfo"
)

echo "Cleaning workspace at ${ROOT_DIR}"

for target in "${TARGETS[@]}"; do
  path="${ROOT_DIR}/${target}"
  if [[ -e "${path}" ]]; then
    echo "Removing ${target}"
    rm -rf "${path}"
  fi
done

if [[ -f "${ROOT_DIR}/package.json" ]]; then
  echo "Reinstalling dependencies"
  cd "${ROOT_DIR}"
  npm install
fi

echo "Cleanup complete."
