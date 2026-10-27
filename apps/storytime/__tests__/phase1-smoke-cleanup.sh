#!/usr/bin/env bash
# Cleanup helpers for the Phase 1 Docker smoke test (phase1-docker-smoke.sh).
#
# PM 2026-10-27 15:32: a stopped image build leaves its buildah working containers behind,
# and podman --force-rm does not remove them after a timeout kill.
# Review B blocker (2026-10-28, run at ba82b160a): the cleanup may only remove working
# containers that THIS build created, so it never removes a working container that another
# build created. Ownership is proven with four guards, all of which must hold:
#   1. The name ends in "-working-container".
#   2. The container is absent from EXTERNAL_BEFORE. The snapshot is taken immediately
#      before the build starts, so absence means the container was created after this
#      build started.
#   3. The container's creation time is not before BUILD_START_EPOCH. Verified against
#      Podman 5.7.0: `podman ps -a --external --format '{{.ID}} {{.Names}} {{.CreatedAt}}'`
#      prints a parseable time, and buildah names a working container
#      "<base>-working-container" from the FROM ref (for node:22-alpine the name is
#      "node-working-container"; a taken name gets "-1", "-2", ... appended).
#   4. The container belongs to this build: its name stem is a 12-hex layer ID that this
#      build printed ("--> <12-hex>" lines), or the stem is the base of a FROM stage and
#      the container's FromImage is a base image this build uses. The FromImage check is
#      what keeps a concurrent build on a different base (for example node:20 while this
#      build uses node:22-alpine) safe even when both stems normalize to "node".
# The heavy lock (heavy-run.sh) is the first guard against concurrent smoke builds; this
# ownership check is the second.
#
# Inputs the caller sets before calling remove_build_containers:
#   BUILD_OUTPUT_FILE  file with this build's output (the tee target of the build command)
#   DOCKERFILE         path of the Dockerfile this build used
#   EXTERNAL_BEFORE    sorted container IDs that existed before the build
#   BUILD_START_EPOCH  epoch seconds when this build started
# When an input is missing or a check cannot answer, the container is kept.

# Print the first non-flag token after FROM on every line that has FROM as a token.
# Handles "FROM --platform=... <ref> AS <alias>" and the buildah "STEP n: FROM <ref>" form.
smoke_from_refs_in_file() {
  awk '
    {
      for (i = 1; i <= NF; i++) {
        if ($i == "FROM" && i < NF) {
          for (j = i + 1; j <= NF; j++) {
            if ($j !~ /^--/) { print $j; break }
          }
          break
        }
      }
    }
  ' "$1" 2>/dev/null
}

# Print the 12-hex layer IDs that this build printed, and the base stem of every FROM
# stage (the ref as written, which covers stage aliases such as "base", plus the
# tag-stripped last path component, which is what buildah uses in the name).
smoke_owned_name_stems() {
  {
    if [ -n "${BUILD_OUTPUT_FILE:-}" ] && [ -f "${BUILD_OUTPUT_FILE:-}" ]; then
      grep -Eo -- '-->[[:space:]]+[0-9a-fA-F]{12}' "$BUILD_OUTPUT_FILE" | grep -Eo '[0-9a-fA-F]{12}'
      smoke_from_refs_in_file "$BUILD_OUTPUT_FILE"
    fi
    if [ -n "${DOCKERFILE:-}" ] && [ -f "${DOCKERFILE:-}" ]; then
      grep -E '^[[:space:]]*FROM[[:space:]]' "$DOCKERFILE" | smoke_from_refs_in_file /dev/stdin
    fi
  } | tr '[:upper:]' '[:lower:]' | while read -r ref; do
    [ -n "$ref" ] || continue
    printf '%s\n' "$ref"
    short="${ref##*/}"
    printf '%s\n' "${short%%:*}"
  done | sort -u
}

# Print the base image refs this build uses, in the forms buildah reports as FromImage.
# buildah qualifies a Docker Hub image as "docker.io/library/<name>:<tag>", so each ref
# is emitted as written and, when it has no registry, in that qualified form.
smoke_owned_from_images() {
  {
    if [ -n "${DOCKERFILE:-}" ] && [ -f "${DOCKERFILE:-}" ]; then
      grep -E '^[[:space:]]*FROM[[:space:]]' "$DOCKERFILE" | smoke_from_refs_in_file /dev/stdin
    fi
    if [ -n "${BUILD_OUTPUT_FILE:-}" ] && [ -f "${BUILD_OUTPUT_FILE:-}" ]; then
      smoke_from_refs_in_file "$BUILD_OUTPUT_FILE"
    fi
  } | while read -r ref; do
    [ -n "$ref" ] || continue
    case "$ref" in
      */*) ;;
      *) echo "docker.io/library/$ref" ;;
    esac
    echo "$ref"
  done | tr '[:upper:]' '[:lower:]' | sort -u
}

# True when the name stem is a layer ID this build printed (prefix match, because the
# list shows the short ID and the stored ID is longer), or a FROM base stem.
smoke_is_owned_stem() {
  local stem="$1" owned
  while IFS= read -r owned; do
    [ -n "$owned" ] || continue
    case "$stem" in
      "$owned"*) return 0 ;;
    esac
  done < <(smoke_owned_name_stems)
  return 1
}

# True when the FromImage ref is one of this build's base images (exact compare).
smoke_is_owned_from_image() {
  local image="$1" owned
  image="$(printf '%s' "$image" | tr '[:upper:]' '[:lower:]')"
  while IFS= read -r owned; do
    [ -n "$owned" ] || continue
    if [ "$image" = "$owned" ]; then return 0; fi
  done < <(smoke_owned_from_images)
  return 1
}

# Remove the working containers that this build created and no others.
remove_build_containers() {
  local id name ts stem image created_epoch
  podman ps -a --external --format '{{.ID}} {{.Names}} {{.CreatedAt}}' 2>/dev/null |
  while read -r id name ts; do
    case "$name" in
      *-working-container) ;;
      *) continue ;;
    esac
    if printf '%s\n' "$EXTERNAL_BEFORE" | grep -qx "$id"; then continue; fi
    created_epoch="$(date -d "$ts" +%s 2>/dev/null)" || created_epoch=""
    if [ -z "$created_epoch" ]; then continue; fi
    if [ -n "${BUILD_START_EPOCH:-}" ] && [ "$created_epoch" -lt "$BUILD_START_EPOCH" ]; then continue; fi
    stem="${name%-working-container}"
    image="$(buildah inspect -f '{{.FromImage}}' "$name" 2>/dev/null)" || image=""
    if ! smoke_is_owned_stem "$stem"; then continue; fi
    case "$stem" in
      # A printed layer ID is direct evidence on its own; a FROM base stem also needs the
      # container's base image to be one this build uses.
      [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]*) ;;
      *)
        if [ -z "$image" ]; then continue; fi
        if ! smoke_is_owned_from_image "$image"; then continue; fi
        ;;
    esac
    if buildah rm "$id" >/dev/null 2>&1; then
      echo "Removed the build container $id ($name)"
    else
      echo "Cannot remove the build container $id ($name)"
    fi
  done
}
