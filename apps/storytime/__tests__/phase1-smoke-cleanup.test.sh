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

rm -rf "$WORK"

echo "=== Total: $TESTS checks (PASS=$((TESTS - FAILS)), FAIL=$FAILS) ==="
exit "$FAILS"
