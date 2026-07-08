#!/usr/bin/env bash
set -euo pipefail

# Sync public World Observer dashboard exports into the GitHub Pages tree.
# Usage:
#   OBSERVER_REPO=/path/to/world-observer ./scripts/sync-world-observer-dashboard.sh
#   ./scripts/sync-world-observer-dashboard.sh /path/to/world-observer
#
# The Wiesmoor weather latest export is public observer output and is published to:
#   world-observer/dashboard/latest/wiesmoor-weather.json

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
OBSERVER_REPO="${1:-${OBSERVER_REPO:-}}"

if [[ -z "${OBSERVER_REPO}" ]]; then
  cat >&2 <<'USAGE'
Missing observer repo path.
Set OBSERVER_REPO=/path/to/observer-repo or pass it as the first argument.
USAGE
  exit 2
fi

SOURCE_FILE="${OBSERVER_REPO%/}/data/latest/wiesmoor-weather.json"
TARGET_DIR="${REPO_ROOT}/world-observer/dashboard/latest"
TARGET_FILE="${TARGET_DIR}/wiesmoor-weather.json"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Missing source file: ${SOURCE_FILE}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
python3 -m json.tool "${SOURCE_FILE}" > "${TARGET_FILE}"
echo "Synced ${SOURCE_FILE} -> ${TARGET_FILE}"
