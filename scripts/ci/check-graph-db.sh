#!/usr/bin/env bash
# check-graph-db.sh — CI gate that fails if graph.db is empty.
# Used as a pre-build step in .github/workflows/ci.yml to ensure
# the codebase knowledge graph is populated before audits run.
#
# Exit codes:
#   0 — graph.db has files
#   1 — graph.db is empty or missing (run `build-graph scan . ./graph.db`)

set -euo pipefail

DB_PATH="${1:-./graph.db}"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: graph.db not found at $DB_PATH"
  echo "Run: build-graph scan . $DB_PATH"
  exit 1
fi

STATS_OUTPUT=$(build-graph stats "$DB_PATH" 2>&1)
TOTAL_FILES=$(echo "$STATS_OUTPUT" | grep -o 'Total files: [0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$TOTAL_FILES" = "0" ]; then
  echo "ERROR: graph.db is empty (Total files: 0)."
  echo "Every build-graph query will return empty results."
  echo "Run: build-graph scan . $DB_PATH"
  exit 1
fi

echo "graph.db OK: $TOTAL_FILES files scanned."
exit 0
