#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if rg -n -- '^rg -nE ' measure/anti-patterns.md; then
  printf 'FAIL: A14 — anti-pattern catalog uses invalid ripgrep option -E (interpreted as --encoding)\n' >&2
  exit 1
fi

printf 'PASS: orchestrator detector recipes use executable ripgrep option syntax\n'
