#!/usr/bin/env bash
# Cleanup helpers for the Phase 1 Docker smoke test (phase1-docker-smoke.sh).
#
# PM 2026-10-27 15:32: a stopped image build leaves its buildah working containers
# behind, and podman --force-rm does not remove them after a timeout kill.
#
# Review B r2 blocker (2026-10-28, audited head e87978a8f): in the shared default store,
# no property of a buildah working container belongs to one build alone. The name, the
# base image, the creation time, and the printed layer IDs can all match a concurrent
# build. The r12 guards therefore accepted a same-base concurrent container.
#
# The smoke now owns a container store. The path is fixed and outside the repository, so
# the store survives between runs and warms up. The heavy lock serializes the smoke, and
# only the smoke writes this store. Every working container in the store is therefore a
# smoke build container, and the cleanup removes every working container in the store.
# The cleanup never reads and never writes the default store.
#
# The heavy lock is the first guard against concurrent smoke builds; the private store is
# the second. The caller may set these two paths before this file is sourced:
#   SMOKE_STORE_ROOT     storage root of the smoke store
#   SMOKE_STORE_RUNROOT  runroot of the smoke store
: "${SMOKE_STORE_ROOT:=${XDG_DATA_HOME:-$HOME/.local/share}/storytime-smoke/storage}"
: "${SMOKE_STORE_RUNROOT:=/run/user/$(id -u)/storytime-smoke}"

# Every podman and buildah call of the smoke carries both store flags, so the default
# store is unreachable from this script.
SMOKE_PODMAN=(podman --root "$SMOKE_STORE_ROOT" --runroot "$SMOKE_STORE_RUNROOT")
SMOKE_BUILDAH=(buildah --root "$SMOKE_STORE_ROOT" --runroot "$SMOKE_STORE_RUNROOT")

# Remove the buildah working containers in the smoke store.
remove_build_containers() {
  local id name
  "${SMOKE_PODMAN[@]}" ps -a --external --format '{{.ID}} {{.Names}}' 2>/dev/null |
  while read -r id name; do
    case "$name" in
      *-working-container) ;;
      *) continue ;;
    esac
    if "${SMOKE_BUILDAH[@]}" rm "$id" >/dev/null 2>&1; then
      echo "Removed the build container $id ($name)"
    else
      echo "Cannot remove the build container $id ($name)"
    fi
  done
}
