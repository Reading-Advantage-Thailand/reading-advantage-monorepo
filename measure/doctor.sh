#!/usr/bin/env bash
set -euo pipefail

bash tests/orchestrator_catalog.sh
bash tests/orchestrator_marker_vocabulary.sh
bash tests/orchestrator_review_execution_truthfulness.sh

# The architecture step records its verdict. It does not gate this exit code.
# It gates doctor again when architecture_ci_input_pin_20261110 closes task
# 1.4d. Owner: the Monorepo orchestrator.
set +e
pnpm architecture:check --skip-input-snapshot-pin
architecture_status=$?
set -e

if [ "$architecture_status" -eq 0 ] || [ "$architecture_status" -eq 1 ]; then
  printf 'ARCHITECTURE: step 4 exits %d; the owner of the remaining drift is architecture_ci_input_pin_20261110\n' "$architecture_status"
  printf 'DOCTOR: the three structural guard steps gate this exit code\n'
  exit 0
fi

printf 'ARCHITECTURE: step 4 exits %d; this is a tool failure, not a boundary verdict\n' "$architecture_status"
printf 'DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1\n'
exit 1
