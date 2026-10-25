#!/usr/bin/env bash
set -uo pipefail

# Run the full acceptance command outside Vitest to prevent recursive test runs.
# Without --locked the script re-enters through heavy-run.sh (PM 2026-10-26), which takes
# the heavy lock and runs the pre-flight. Callers run the script plain, with no flock.
if [ "${1:-}" != "--locked" ]; then
  exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

echo "=== AC-1.1 Storytime package exists ==="
if [ -f "$ROOT/apps/storytime/package.json" ]; then
  pass "The Storytime package exists"
else
  fail "Missing apps/storytime/package.json"
fi

echo "=== AC-1.1 build, types, lint, and tests ==="
if [ "$FAILED" -eq 0 ] && (
  cd "$ROOT" && TURBO_CONCURRENCY=1 pnpm turbo run build check-types lint test --filter=storytime
); then
  pass "All four Storytime gates exit 0"
else
  fail "The Storytime quality gates cannot pass"
fi

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
