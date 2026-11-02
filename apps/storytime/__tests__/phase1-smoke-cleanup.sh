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
#
# P2.3 smoke-store follow-ups (test-strategy P2.3, Review B r2; Review A r5 F1, F8):
#   - check_store_paths rejects a store path that is the default podman store path or lies
#     inside it, so a caller-set value can never point the cleanup at the shared default store.
#   - require_heavy_lock refuses a direct `--locked` call that skipped heavy-run.sh; the smoke
#     passes the hint itself in its re-entry, so the normal run passes.
#   - prune_old_image_tags removes the older storytime image tags after a successful run,
#     so the smoke store does not grow with every run.
: "${SMOKE_STORE_ROOT:=${XDG_DATA_HOME:-$HOME/.local/share}/storytime-smoke/storage}"
: "${SMOKE_STORE_RUNROOT:=/run/user/$(id -u)/storytime-smoke}"

# The default podman store paths of this user (podman rootless defaults).
DEFAULT_PODMAN_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/containers/storage"
DEFAULT_PODMAN_RUNROOT="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/containers"

# Rejects a smoke store path that is the default podman store or lies inside it.
# @returns 1 with a message on stderr when a path is the default podman store path or inside it.
check_store_paths() {
  local root runroot
  root="$(realpath -m "$SMOKE_STORE_ROOT")"
  runroot="$(realpath -m "$SMOKE_STORE_RUNROOT")"
  case "$root" in
    "$(realpath -m "$DEFAULT_PODMAN_ROOT")" | "$(realpath -m "$DEFAULT_PODMAN_ROOT")"/*)
      echo "SMOKE_STORE_ROOT is the default podman store or lies inside it ($root); refusing" >&2
      return 1
      ;;
  esac
  case "$runroot" in
    "$(realpath -m "$DEFAULT_PODMAN_RUNROOT")" | "$(realpath -m "$DEFAULT_PODMAN_RUNROOT")"/*)
      echo "SMOKE_STORE_RUNROOT is the default podman runroot or lies inside it ($runroot); refusing" >&2
      return 1
      ;;
  esac
}
check_store_paths || exit 1

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

# Refuse a direct `--locked` call that skipped heavy-run.sh (P2.3 smoke-store follow-up).
# heavy-run.sh exports HEAVY_LOCK_HELD=1 to the command it locks; a caller that passes
# --locked directly does not hold the heavy lock and shares the smoke store with a
# concurrent run. The smoke refuses that call.
# @returns 1 with a message on stderr when the heavy lock is not held.
require_heavy_lock() {
  if [ "${HEAVY_LOCK_HELD:-}" != "1" ]; then
    echo "The --locked call must re-enter through heavy-run.sh; refusing the lock bypass" >&2
    return 1
  fi
}

# Remove every storytime image tag of the smoke store except the current run's tag
# (P2.3 smoke-store follow-up). The store keeps one image per run otherwise and grows
# with every run. The match covers the bare and the qualified name (`localhost/...`),
# because podman prints the qualified repository.
# @param current The image of this run (`storytime-phase1-local:<sha>`).
prune_old_image_tags() {
  local current="${1:-}" repo tag image name
  [ -n "$current" ] || return 0
  repo="${current%:*}"
  tag="${current##*:}"
  "${SMOKE_PODMAN[@]}" images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null |
  while read -r image; do
    name="${image##*/}"
    case "$name" in
      "$repo:"*) ;;
      *) continue ;;
    esac
    case "$name" in
      *:\<none\>) continue ;;
    esac
    [ "${name##*:}" = "$tag" ] && continue
    if "${SMOKE_PODMAN[@]}" rmi "$image" >/dev/null 2>&1; then
      echo "Pruned the older image tag $image"
    else
      echo "Cannot prune the older image tag $image"
    fi
  done
}
