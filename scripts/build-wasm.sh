#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_PATH="$(realpath "${SCRIPT_DIR}/..")"
LIB_PATH="${ROOT_PATH}/lib"
DIST_PATH="${ROOT_PATH}/_dist"
SCRIPTS_PATH="${ROOT_PATH}/scripts"
POST_BUILD_SCRIPT="${SCRIPTS_PATH}/post-build-wasm.js"

if [[ ! -d "${LIB_PATH}" ]]; then
  echo "❌ Lib directory not found: ${LIB_PATH}" >&2
  exit 1
fi

if [[ ! -d "${SCRIPTS_PATH}" ]]; then
  echo "❌ Scripts directory not found: ${SCRIPTS_PATH}" >&2
  exit 1
fi

mkdir -p "${DIST_PATH}"

if ! command -v wasm-pack &>/dev/null; then
  echo "❌ wasm-pack not found in PATH" >&2
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "❌ node not found in PATH" >&2
  exit 1
fi

echo "Building WebAssembly module..."
cd "${LIB_PATH}"

if ! wasm-pack build --target no-modules --out-dir "${DIST_PATH}" --out-name fluexgl-dsp-wasm; then
  echo "wasm-pack build failed" >&2
  exit 1
fi

echo "📦 Running post-build script..."
cd "${SCRIPTS_PATH}"

if ! node "${POST_BUILD_SCRIPT}"; then
  echo "post-build script failed" >&2
  exit 1
fi

cd "${ROOT_PATH}"
echo "Build pipeline completed successfully."