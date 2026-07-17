#!/usr/bin/env bash
set -euo pipefail

bash tests/orchestrator_catalog.sh
bash tests/orchestrator_supervisor_invariants.sh
bash tests/orchestrator_marker_vocabulary.sh
bash tests/orchestrator_review_execution_truthfulness.sh
pnpm architecture:check
