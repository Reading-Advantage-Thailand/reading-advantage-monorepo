#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

if [ ! -f measure/anti-patterns.md ]; then
  fail "measure/anti-patterns.md is required before orchestrated review tracks execute"
fi

for id in A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11; do
  if ! grep -q "## ${id} " measure/anti-patterns.md; then
    fail "measure/anti-patterns.md is missing ${id}"
  fi
done

printf 'PASS: measure anti-pattern catalog exists with A1-A11\n'
