#!/usr/bin/env bash
set -uo pipefail

# Regression self-test for the Phase 1 smoke cleanup (Review B r2 blocker, 2026-10-28).
# It runs the real cleanup function from phase1-smoke-cleanup.sh with stub podman and
# buildah commands on PATH. It creates no real container and takes no heavy lock.
# The stubs serve two container stores: this smoke's store and the shared default store.
# Every stub call must carry this smoke's --root and --runroot; any other call is a
# violation. The stubs set the same inputs that r12 read, so a return to the r12 rules
# would fail this test.
# Deviation note: Green added this harness test at the request of Review B; the Red
# tests are unchanged.

TESTS=0; FAILS=0
pass() { echo "PASS: $1"; TESTS=$((TESTS + 1)); }
fail() { echo "FAIL: $1"; FAILS=$((FAILS + 1)); TESTS=$((TESTS + 1)); }

HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/storytime-cleanup-test.XXXXXX")"
SMOKE_STORE_ROOT="$WORK/smoke/storage"
SMOKE_STORE_RUNROOT="$WORK/smoke/runroot"
export SMOKE_STORE_ROOT SMOKE_STORE_RUNROOT
# shellcheck source=phase1-smoke-cleanup.sh
source "$HERE/phase1-smoke-cleanup.sh"

START=1000000000
# A stand-in Dockerfile with the same FROM shape as apps/storytime/Dockerfile.
DOCKERFILE="$WORK/Dockerfile"
cat > "$DOCKERFILE" <<'EOF'
FROM node:22-alpine AS base
FROM base AS pruner
FROM node:22-alpine AS runner
EOF

# make_stubs <dir> writes stub podman and buildah commands. Inputs in <dir>:
#   smoke-containers    rows "<id> <name>" in this smoke's store
#   default-containers  rows "<id> <name>" in the shared default store
# Outputs in <dir>:
#   calls.log       one row per stub call, with the store flags that it carried
#   violations.log  one row per call that did not carry this smoke's flags
#   removed.log     rows "<root>|<id>" for every buildah rm the stub saw
make_stubs() {
  local dir="$1"
  mkdir -p "$dir"
  : > "$dir/calls.log"
  : > "$dir/violations.log"
  : > "$dir/removed.log"
  cat > "$dir/podman" <<EOF
#!/usr/bin/env bash
dir="$dir"
smoke_root="$SMOKE_STORE_ROOT"
smoke_runroot="$SMOKE_STORE_RUNROOT"
root=""; runroot=""; sub=""
while [ "\$#" -gt 0 ]; do
  case "\$1" in
    --root) root="\${2:-}"; shift 2 ;;
    --runroot) runroot="\${2:-}"; shift 2 ;;
    *) sub="\$1"; shift; break ;;
  esac
done
echo "podman \$sub root=\$root runroot=\$runroot" >> "\$dir/calls.log"
if [ "\$root" != "\$smoke_root" ] || [ "\$runroot" != "\$smoke_runroot" ]; then
  echo "podman \$sub root=\$root runroot=\$runroot" >> "\$dir/violations.log"
fi
if [ "\$sub" != "ps" ]; then
  echo "stub podman: unexpected command \$sub" >&2
  exit 64
fi
if [ "\$root" = "\$smoke_root" ]; then
  cat "\$dir/smoke-containers"
else
  cat "\$dir/default-containers"
fi
EOF
  cat > "$dir/buildah" <<EOF
#!/usr/bin/env bash
dir="$dir"
smoke_root="$SMOKE_STORE_ROOT"
smoke_runroot="$SMOKE_STORE_RUNROOT"
root=""; runroot=""; sub=""
while [ "\$#" -gt 0 ]; do
  case "\$1" in
    --root) root="\${2:-}"; shift 2 ;;
    --runroot) runroot="\${2:-}"; shift 2 ;;
    *) sub="\$1"; shift; break ;;
  esac
done
echo "buildah \$sub root=\$root runroot=\$runroot" >> "\$dir/calls.log"
if [ "\$root" != "\$smoke_root" ] || [ "\$runroot" != "\$smoke_runroot" ]; then
  echo "buildah \$sub root=\$root runroot=\$runroot" >> "\$dir/violations.log"
fi
if [ "\$sub" != "rm" ]; then
  echo "stub buildah: unexpected command \$sub" >&2
  exit 64
fi
echo "\$root|\${1:-}" >> "\$dir/removed.log"
EOF
  chmod +x "$dir/podman" "$dir/buildah"
}

# run_cleanup <dir>: run the real cleanup with the stub commands. The r12 inputs stay
# set on purpose, so a container that the r12 rules owned would still be a candidate.
run_cleanup() {
  local dir="$1"
  (
    PATH="$dir:$PATH"
    export PATH
    EXTERNAL_BEFORE=""
    BUILD_START_EPOCH="$START"
    BUILD_OUTPUT_FILE="$dir/build-output.txt"
    DOCKERFILE="$DOCKERFILE"
    export EXTERNAL_BEFORE BUILD_START_EPOCH BUILD_OUTPUT_FILE DOCKERFILE
    remove_build_containers
  ) > "$dir/output.txt" 2>&1
}

expect_removed_here() {
  local dir="$1" id="$2" label="$3"
  if grep -qxF "$SMOKE_STORE_ROOT|$id" "$dir/removed.log"; then pass "$label"; else fail "$label (id $id not removed)"; fi
}

# make_prune_stubs <dir> writes a stub podman for the prune test. Inputs in <dir>:
#   images   rows "<repository>:<tag>" in the smoke store
# Outputs in <dir>:
#   calls.log       one row per stub call, with the store flags that it carried
#   violations.log  one row per call that did not carry this smoke's flags
#   rmi.log         one row per image that the stub rmi saw
make_prune_stubs() {
  local dir="$1"
  mkdir -p "$dir"
  : > "$dir/calls.log"
  : > "$dir/violations.log"
  : > "$dir/rmi.log"
  cat > "$dir/podman" <<EOF
#!/usr/bin/env bash
dir="$dir"
smoke_root="$SMOKE_STORE_ROOT"
smoke_runroot="$SMOKE_STORE_RUNROOT"
root=""; runroot=""; sub=""
while [ "\$#" -gt 0 ]; do
  case "\$1" in
    --root) root="\${2:-}"; shift 2 ;;
    --runroot) runroot="\${2:-}"; shift 2 ;;
    *) sub="\$1"; shift; break ;;
  esac
done
echo "podman \$sub root=\$root runroot=\$runroot" >> "\$dir/calls.log"
if [ "\$root" != "\$smoke_root" ] || [ "\$runroot" != "\$smoke_runroot" ]; then
  echo "podman \$sub root=\$root runroot=\$runroot" >> "\$dir/violations.log"
fi
case "\$sub" in
  images) shift; cat "\$dir/images" ;;
  rmi) echo "\${1:-}" >> "\$dir/rmi.log" ;;
  *) echo "stub podman: unexpected command \$sub" >&2; exit 64 ;;
esac
EOF
  chmod +x "$dir/podman"
}

expect_never_removed() {
  local dir="$1" id="$2" label="$3"
  if grep -qF "|$id" "$dir/removed.log"; then fail "$label (id $id was removed)"; else pass "$label"; fi
}

expect_no_violations() {
  local dir="$1" label="$2"
  if [ -s "$dir/violations.log" ]; then
    fail "$label"
    sed 's/^/  violation: /' "$dir/violations.log"
  else
    pass "$label"
  fi
}

# Scenario A: the Review B r2 blocker. This build's containers are in the smoke store.
# The default store holds a new node-working-container from node:22-alpine, created after
# the build started, with this build's cached layer IDs. It must survive.
A="$WORK/a"; make_stubs "$A"
cat > "$A/smoke-containers" <<'EOF'
666666666666 node-working-container
555555555555 555555555555-working-container
f403537bb5f9 reading-advantage-postgres
EOF
cat > "$A/default-containers" <<'EOF'
777777777777 node-working-container
EOF
cat > "$A/build-output.txt" <<'EOF'
STEP 1/9: FROM node:22-alpine AS base
--> 666666666666
--> 555555555555
EOF
run_cleanup "$A"
expect_removed_here "$A" "666666666666" "A: this build's FROM container in the smoke store is removed"
expect_removed_here "$A" "555555555555" "A: this build's layer ID container in the smoke store is removed"
expect_never_removed "$A" "f403537bb5f9" "A: the smoke store's plain container survives"
expect_never_removed "$A" "777777777777" "A: a same-base concurrent container in the default store survives"
expect_no_violations "$A" "A: every podman and buildah call carried this smoke's --root and --runroot"

# Scenario B: an empty smoke store removes nothing and reaches no other store.
B="$WORK/b"; make_stubs "$B"
: > "$B/smoke-containers"
cat > "$B/default-containers" <<'EOF'
777777777777 node-working-container
EOF
: > "$B/build-output.txt"
run_cleanup "$B"
if [ -s "$B/removed.log" ]; then fail "B: an empty smoke store removed nothing"; else pass "B: an empty smoke store removed nothing"; fi
expect_no_violations "$B" "B: no call left this smoke's store"

# Scenario C: the smoke's own run container sits in the smoke store and survives.
C="$WORK/c"; make_stubs "$C"
cat > "$C/smoke-containers" <<'EOF'
abcdef123456 storytime-smoke-run
EOF
: > "$C/default-containers"
: > "$C/build-output.txt"
run_cleanup "$C"
expect_never_removed "$C" "abcdef123456" "C: the smoke's run container survives"
expect_no_violations "$C" "C: every call carried this smoke's --root and --runroot"

# Scenario D: the lock bypass and the store path guards (P2.3 smoke-store follow-ups).
# D1: a direct --locked call without the heavy-run lock hint is refused.
if ( unset HEAVY_LOCK_HELD; require_heavy_lock ) >/dev/null 2>&1; then
  fail "D1: require_heavy_lock refuses a call without the heavy lock hint"
else
  pass "D1: require_heavy_lock refuses a call without the heavy lock hint"
fi
# D2: the hint from heavy-run.sh lets the call through.
if ( HEAVY_LOCK_HELD=1 require_heavy_lock ) >/dev/null 2>&1; then
  pass "D2: require_heavy_lock accepts the call that heavy-run.sh locked"
else
  fail "D2: require_heavy_lock accepts the call that heavy-run.sh locked"
fi
# D3: a store root that equals the default podman store is rejected at source time.
DEFAULT_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/containers/storage"
if (
  SMOKE_STORE_ROOT="$DEFAULT_ROOT" SMOKE_STORE_RUNROOT="$SMOKE_STORE_RUNROOT" \
    bash -c 'source "$1"' _ "$HERE/phase1-smoke-cleanup.sh"
) >/dev/null 2>&1; then
  fail "D3: a store root that equals the default podman store is rejected"
else
  pass "D3: a store root that equals the default podman store is rejected"
fi
# D4: a runroot that equals the default podman runroot is rejected at source time.
DEFAULT_RUNROOT="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/containers"
if (
  SMOKE_STORE_ROOT="$SMOKE_STORE_ROOT" SMOKE_STORE_RUNROOT="$DEFAULT_RUNROOT" \
    bash -c 'source "$1"' _ "$HERE/phase1-smoke-cleanup.sh"
) >/dev/null 2>&1; then
  fail "D4: a runroot that equals the default podman runroot is rejected"
else
  pass "D4: a runroot that equals the default podman runroot is rejected"
fi
# D5: the paths of this test are not the default store, so the source at the top passed.
pass "D5: the source at the top accepted this test's store paths"
if [ "$DEFAULT_ROOT" = "$SMOKE_STORE_ROOT" ]; then
  fail "D5: the source at the top accepted this test's store paths (test paths equal the default)"
fi

# Scenario E: the prune keeps the current tag and removes the older storytime tags.
E="$WORK/e"; make_prune_stubs "$E"
cat > "$E/images" <<'EOF'
storytime-phase1-local:a24059d3
localhost/storytime-phase1-local:a24059d3
storytime-phase1-local:cb4d8c1f0
storytime-phase1-local:0bb10b6d1
localhost/storytime-phase1-local:d28597d87
other-image:v1
EOF
(
  PATH="$E:$PATH"
  export PATH
  prune_old_image_tags "storytime-phase1-local:a24059d3"
) > "$E/output.txt" 2>&1
expect_no_violations "$E" "E: every podman call of the prune carried this smoke's --root and --runroot"
for kept in "storytime-phase1-local:a24059d3" "localhost/storytime-phase1-local:a24059d3"; do
  if grep -qxF "$kept" "$E/rmi.log"; then fail "E: the current tag $kept survives the prune"; else pass "E: the current tag $kept survives the prune"; fi
done
for pruned in "storytime-phase1-local:cb4d8c1f0" "storytime-phase1-local:0bb10b6d1" "localhost/storytime-phase1-local:d28597d87"; do
  if grep -qxF "$pruned" "$E/rmi.log"; then pass "E: the older tag $pruned is pruned"; else fail "E: the older tag $pruned is pruned"; fi
done
if grep -qF "other-image" "$E/rmi.log"; then fail "E: an image of another repository survives the prune"; else pass "E: an image of another repository survives the prune"; fi

# Scenario F: the real re-entry, the inside-default guard, and the prune timing (Review A
# findings F1 and F8, round 5).
# F1: the re-entry string of the smoke script passes the lock hint through heavy-run.sh, so the
# normal run passes require_heavy_lock. A stub stands in place of the build.
F="$WORK/f"; mkdir -p "$F"
cat > "$F/smoke-stub" <<EOF
#!/usr/bin/env bash
HERE="$HERE"
source "\$HERE/phase1-smoke-cleanup.sh" || exit 1
require_heavy_lock
EOF
chmod +x "$F/smoke-stub"
REENTRY="$(sed -n 's/^[[:space:]]*exec bash "\$HOME\/Desktop\/advantage-pr\/scripts\/jobs\/heavy-run\.sh" -c "\(.*\)"$/\1/p' "$HERE/phase1-docker-smoke.sh")"
if [ -z "$REENTRY" ]; then
  fail "F1: the smoke script holds no re-entry line to test"
else
  if bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "${REENTRY//\$0/$F/smoke-stub}" >/dev/null 2>&1; then
    if [ "${HEAVY_LOCK_HELD:-}" = "1" ]; then
      echo "NOTE: F1 ran nested in heavy-run.sh; the ancestor branch exports the hint itself"
    fi
    pass "F1: the real re-entry passes the lock hint (heavy-run.sh)"
  else
    fail "F1: the real re-entry passes the lock hint (heavy-run.sh)"
  fi
fi
# F1b (Review A finding A3-4 / F10): the same re-entry run with HEAVY_LOCK_HELD unset, so a
# passing run cannot come from an inherited hint; the string inside the re-entry line must
# carry the hint itself.
if env -u HEAVY_LOCK_HELD bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "${REENTRY//\$0/$F/smoke-stub}" >/dev/null 2>&1; then
  pass "F1b: the re-entry passes the lock hint with HEAVY_LOCK_HELD unset"
else
  fail "F1b: the re-entry passes the lock hint with HEAVY_LOCK_HELD unset"
fi
# F1c (A3-4): every smoke-style script holds the exact re-entry string, so each one re-enters
# through heavy-run.sh with the lock hint. The check is one function over one file, so the
# stripped-copy check below proves the check fails when the string is missing.
holds_reentry() { grep -qF "HEAVY_LOCK_HELD=1 bash '\$0' --locked" "$1"; }
for script_file in phase1-docker-smoke.sh phase3-docker-smoke.sh phase3-browser-gate.sh phase3-redirect-check.sh; do
  if holds_reentry "$HERE/$script_file"; then
    pass "F1c: $script_file holds the exact re-entry string"
  else
    fail "F1c: $script_file holds the exact re-entry string"
  fi
done
# F1c fail-first proof: a copy of phase1-docker-smoke.sh without the string must fail the
# same check. Note: phase1-quality-gates.sh re-enters heavy-run.sh with no HEAVY_LOCK_HELD=1
# in its command; it stays unchanged by design and holds no re-entry string to assert.
STRIPPED="$WORK/stripped-smoke.sh"
sed '/HEAVY_LOCK_HELD/d' "$HERE/phase1-docker-smoke.sh" > "$STRIPPED"
if holds_reentry "$STRIPPED"; then
  fail "F1c: the stripped copy fails the re-entry check"
else
  pass "F1c: the stripped copy fails the re-entry check"
fi
# F8a: a store root inside the default podman store is rejected.
DEFAULT_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/containers/storage"
if (
  SMOKE_STORE_ROOT="$DEFAULT_ROOT/inline" SMOKE_STORE_RUNROOT="$SMOKE_STORE_RUNROOT" \
    bash -c 'source "$1"' _ "$HERE/phase1-smoke-cleanup.sh"
) >/dev/null 2>&1; then
  fail "F8: a store root inside the default podman store is rejected"
else
  pass "F8: a store root inside the default podman store is rejected"
fi
# F8b: the prune runs only after a successful run, never in the EXIT trap.
CLEANUP_BLOCK="$(sed -n '/^cleanup() {/,/^}/p' "$HERE/phase1-docker-smoke.sh")"
case "$CLEANUP_BLOCK" in
  *prune_old_image_tags*) fail "F8: the EXIT trap does not prune" ;;
  *) pass "F8: the EXIT trap does not prune" ;;
esac
if grep -B3 'prune_old_image_tags "$IMAGE"' "$HERE/phase1-docker-smoke.sh" | grep -q 'FAILED" -eq 0'; then
  pass "F8: the prune runs only when the run passed"
else
  fail "F8: the prune runs only when the run passed"
fi

rm -rf "$WORK"

echo "=== Total: $TESTS checks (PASS=$((TESTS - FAILS)), FAIL=$FAILS) ==="
exit "$FAILS"
