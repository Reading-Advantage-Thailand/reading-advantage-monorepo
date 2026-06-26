#!/usr/bin/env bash
set -euo pipefail

bash tests/orchestrator_catalog.sh
bash tests/orchestrator_marker_vocabulary.sh
