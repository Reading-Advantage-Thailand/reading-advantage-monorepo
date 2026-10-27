#!/usr/bin/env bash
set -uo pipefail

# Regression self-test for the Phase 1 smoke cleanup (Review B blocker, 2026-10-28).
# It runs the real cleanup function from phase1-smoke-cleanup.sh with stub podman and
# buildah commands on PATH. It creates no real container and takes no heavy lock.
# Deviation note: Green added this harness test at the request of Review B; the Red
# tests are unchanged.

TESTS=0; FAILS=0
pass() { echo "PASS: $1"; TESTS=$((TESTS + 1)); }
fail() { echo "FAIL: $1"; FAILS=$((FAILS + 1)); TESTS=$((TESTS + 1)); }

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=phase1-smoke-cleanup.sh
source "$HERE/phase1-smoke-cleanup.sh"

START=1000000000
AFTER_TS="$(date -u -d "@$((START + 60))" '+%Y-%m-%d %H:%M:%S +0000 UTC')"
BEFORE_TS="$(date -u -d "@$((START - 60))" '+%Y-%m-%d %H:%M:%S +0000 UTC')"

# A stand-in Dockerfile with the same FROM shape as apps/storytime/Dockerfile: one real
# base image, stage aliases on top of it, and a second FROM of the same real base.
DOCKERFILE="$(mktemp "${TMPDIR:-/tmp}/storytime-cleanup-test-dockerfile.XXXXXX")"
cat > "$DOCKERFILE" <<'EOF'
FROM node:22-alpine AS base
FROM base AS pruner
FROM node:22-alpine AS runner
EOF

# make_stubs <dir> writes stub podman and buildah commands driven by files in <dir>:
#   containers   rows "<id> <name> <created timestamp, may contain spaces>"
#   fromimage    rows "<name> <from-image>"; a name without a row answers "not known"
#   removed.log  the ids the stub buildah rm saw
make_stubs() {
  local dir="$1"
  mkdir -p "$dir"
  : > "$dir/removed.log"
  cat > "$dir/podman" <<EOF
#!/usr/bin/env bash
dir="$dir"
if [ "\$1" = "ps" ]; then cat "\$dir/containers"; exit 0; fi
echo "stub podman: unexpected command \$*" >&2
exit 64
EOF
  cat > "$dir/buildah" <<EOF
#!/usr/bin/env bash
dir="$dir"
if [ "\$1" = "inspect" ]; then
  name="\$4"
  row="\$(awk -v n="\$name" '\$1 == n { print \$2 }' "\$dir/fromimage")"
  if [ -n "\$row" ]; then echo "\$row"; exit 0; fi
  echo "no such container \$name" >&2
  exit 1
fi
if [ "\$1" = "rm" ]; then echo "\$2" >> "\$dir/removed.log"; exit 0; fi
echo "stub buildah: unexpected command \$*" >&2
exit 64
EOF
  chmod +x "$dir/podman" "$dir/buildah"
}

# run_cleanup <dir> <external-before ids>; the scenario files must exist already.
run_cleanup() {
  local dir="$1" before="$2"
  (
    PATH="$dir:$PATH"
    export PATH
    EXTERNAL_BEFORE="$before"
    BUILD_START_EPOCH="$START"
    BUILD_OUTPUT_FILE="$dir/build-output.txt"
    DOCKERFILE="$DOCKERFILE"
    export EXTERNAL_BEFORE BUILD_START_EPOCH BUILD_OUTPUT_FILE DOCKERFILE
    remove_build_containers
  )
}

expect_removed() {
  local dir="$1" id="$2" label="$3"
  if grep -qx "$id" "$dir/removed.log"; then pass "$label"; else fail "$label (id $id not removed)"; fi
}
expect_kept() {
  local dir="$1" id="$2" label="$3"
  if grep -qx "$id" "$dir/removed.log"; then fail "$label (id $id was removed)"; else pass "$label"; fi
}

# Scenario A: the Review B blocker. A concurrent build's working container (id 777777777777,
# same "node" name family) survives, and this build's containers go.
A="$(mktemp -d "${TMPDIR:-/tmp}/storytime-cleanup-a.XXXXXX")"
make_stubs "$A"
cat > "$A/containers" <<EOF
f403537bb5f9 reading-advantage-postgres $AFTER_TS
666666666666 node-working-container $AFTER_TS
777777777777 node-working-container-1 $AFTER_TS
888888888888 api-working-container $AFTER_TS
555555555555 555555555555-working-container $AFTER_TS
EOF
cat > "$A/fromimage" <<'EOF'
node-working-container docker.io/library/node:22-alpine
node-working-container-1 docker.io/library/other-build:1
api-working-container docker.io/library/other-build:1
EOF
cat > "$A/build-output.txt" <<'EOF'
STEP 1/9: FROM node:22-alpine AS base
STEP 2/9: RUN true
--> 666666666666
--> 555555555555
EOF
OUT="$(run_cleanup "$A" "f403537bb5f9")"
expect_removed "$A" "666666666666" "A: this build's FROM container is removed"
expect_removed "$A" "555555555555" "A: this build's printed layer ID container is removed"
expect_kept "$A" "777777777777" "A: the concurrent build's container survives"
expect_kept "$A" "888888888888" "A: another build's api container survives"
expect_kept "$A" "f403537bb5f9" "A: the pre-existing postgres container survives"

# Scenario B: a container from before the build keeps its working container even with an
# owned name and an owned base image.
B="$(mktemp -d "${TMPDIR:-/tmp}/storytime-cleanup-b.XXXXXX")"
make_stubs "$B"
cat > "$B/containers" <<EOF
999999999999 node-working-container $AFTER_TS
EOF
cat > "$B/fromimage" <<'EOF'
node-working-container docker.io/library/node:22-alpine
EOF
cat > "$B/build-output.txt" <<'EOF'
STEP 1/9: FROM node:22-alpine AS base
EOF
run_cleanup "$B" "999999999999" > /dev/null
expect_kept "$B" "999999999999" "B: a container from before the build survives"

# Scenario C: a working container created before this build started survives.
C="$(mktemp -d "${TMPDIR:-/tmp}/storytime-cleanup-c.XXXXXX")"
make_stubs "$C"
cat > "$C/containers" <<EOF
222222222222 node-working-container $BEFORE_TS
EOF
cat > "$C/fromimage" <<'EOF'
node-working-container docker.io/library/node:22-alpine
EOF
cat > "$C/build-output.txt" <<'EOF'
STEP 1/9: FROM node:22-alpine AS base
EOF
run_cleanup "$C" "" > /dev/null
expect_kept "$C" "222222222222" "C: a container created before the build start survives"

# Scenario D: a concurrent build on a different base of the same image family survives,
# even though both stems normalize to "node".
D="$(mktemp -d "${TMPDIR:-/tmp}/storytime-cleanup-d.XXXXXX")"
make_stubs "$D"
cat > "$D/containers" <<EOF
333333333333 node-working-container $AFTER_TS
EOF
cat > "$D/fromimage" <<'EOF'
node-working-container docker.io/library/node:20-bookworm-slim
EOF
cat > "$D/build-output.txt" <<'EOF'
STEP 1/9: FROM node:22-alpine AS base
EOF
run_cleanup "$D" "" > /dev/null
expect_kept "$D" "333333333333" "D: a same-family container from another base survives"

# Scenario E: the stage alias stem ("FROM base AS pruner") is owned when the base image
# matches this build.
E="$(mktemp -d "${TMPDIR:-/tmp}/storytime-cleanup-e.XXXXXX")"
make_stubs "$E"
cat > "$E/containers" <<EOF
444444444444 base-working-container $AFTER_TS
EOF
cat > "$E/fromimage" <<'EOF'
base-working-container docker.io/library/node:22-alpine
EOF
cat > "$E/build-output.txt" <<'EOF'
STEP 1/9: FROM node:22-alpine AS base
STEP 2/9: FROM base AS pruner
EOF
run_cleanup "$E" "" > /dev/null
expect_removed "$E" "444444444444" "E: this build's stage alias container is removed"

# Scenario F: an unparseable creation time keeps the container.
F="$(mktemp -d "${TMPDIR:-/tmp}/storytime-cleanup-f.XXXXXX")"
make_stubs "$F"
cat > "$F/containers" <<EOF
101010101010 node-working-container not-a-time
EOF
cat > "$F/fromimage" <<'EOF'
node-working-container docker.io/library/node:22-alpine
EOF
cat > "$F/build-output.txt" <<'EOF'
STEP 1/9: FROM node:22-alpine AS base
EOF
run_cleanup "$F" "" > /dev/null
expect_kept "$F" "101010101010" "F: a container with an unreadable time survives"

rm -rf "$A" "$B" "$C" "$D" "$E" "$F" "$DOCKERFILE"

echo "=== Total: $TESTS checks (PASS=$((TESTS - FAILS)), FAIL=$FAILS) ==="
exit "$FAILS"
