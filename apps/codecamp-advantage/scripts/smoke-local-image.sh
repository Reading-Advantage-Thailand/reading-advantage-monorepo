#!/usr/bin/env bash
set -euo pipefail

if [[ "${CODECAMP_LOCAL_IMAGE_SMOKE:-}" != "1" ]]; then
  printf 'Skipping local image smoke. Set CODECAMP_LOCAL_IMAGE_SMOKE=1 to run.\n'
  exit 0
fi

TIMEOUT_SECONDS="${CODECAMP_LOCAL_IMAGE_TIMEOUT:-90}"
if [[ "${CODECAMP_LOCAL_IMAGE_TIMEOUT_ACTIVE:-}" != "1" ]]; then
  exec timeout "${TIMEOUT_SECONDS}" env CODECAMP_LOCAL_IMAGE_TIMEOUT_ACTIVE=1 bash "$0"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IMAGE_TAG="${CODECAMP_LOCAL_IMAGE_TAG:-codecamp-advantage:local-smoke}"
CONTAINER_NAME="${CODECAMP_LOCAL_IMAGE_CONTAINER:-codecamp-advantage-local-smoke}"
PORT="${CODECAMP_LOCAL_IMAGE_PORT:-18080}"
URL="http://127.0.0.1:${PORT}/en/"

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

cleanup() {
  docker logs "${CONTAINER_NAME}" >/tmp/codecamp-local-image-smoke.log 2>&1 || true
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build -f "${ROOT_DIR}/apps/codecamp-advantage/Dockerfile" -t "${IMAGE_TAG}" "${ROOT_DIR}"
docker run -d --name "${CONTAINER_NAME}" -p "127.0.0.1:${PORT}:8080" "${IMAGE_TAG}" >/dev/null

deadline=$((SECONDS + TIMEOUT_SECONDS))
while (( SECONDS < deadline )); do
  if curl --fail --silent --show-error --max-time 5 "${URL}" >/dev/null; then
    docker logs "${CONTAINER_NAME}" >/tmp/codecamp-local-image-smoke.log 2>&1 || true
    if [[ -s /tmp/codecamp-local-image-smoke.log ]]; then
      exit 0
    fi
  fi
  sleep 2
done

printf 'Local image smoke failed: %s did not serve HTTP 200 with logs within %ss.\n' "${URL}" "${TIMEOUT_SECONDS}" >&2
exit 1
