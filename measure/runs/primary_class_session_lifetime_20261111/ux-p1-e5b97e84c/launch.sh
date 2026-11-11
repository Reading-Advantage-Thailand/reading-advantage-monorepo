#!/usr/bin/env bash
# One launch of the UX browser review of the class session lifetime control
# (Phase 1 of primary_class_session_lifetime_20261111).
#
# It creates a scratch Postgres container of its own, migrates it, seeds one
# school, one teacher, one class and two students, builds the Primary app for
# production, starts it on a free port, runs the Playwright checks, and removes
# the container and the build output again.
#
# The shared databases (reading_advantage, primary_advantage, science_advantage)
# and the shared container port 5432 are never used.
set -uo pipefail

ROOT=/home/daniebo/Desktop/reading-advantage-monorepo
HERE="$ROOT/measure/runs/primary_class_session_lifetime_20261111/ux-p1-e5b97e84c"
OUT="$HERE/out"
mkdir -p "$OUT"

CONTAINER="uxpcls-$(date +%s)-$$"
PGPORT=""
APPPORT=""
SERVER_PID=""
BASE_URL=""
FOREIGN="$ROOT/apps/primary-advantage/qa-check-user.tmp.ts"
FOREIGN_HOLD="$OUT/foreign-qa-check-user.tmp.ts"
NEXT_ENV="$ROOT/apps/primary-advantage/next-env.d.ts"
NEXT_ENV_HOLD="$OUT/next-env.d.ts.hold"

log() { printf '%s ux-launch: %s\n' "$(date +%H:%M:%S)" "$*"; }

restore_files() {
  if [ -f "$FOREIGN_HOLD" ]; then
    mv -f "$FOREIGN_HOLD" "$FOREIGN" 2>/dev/null || true
  fi
  if [ -f "$NEXT_ENV_HOLD" ]; then
    mv -f "$NEXT_ENV_HOLD" "$NEXT_ENV" 2>/dev/null || true
  fi
}

cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  if [ -n "$SERVER_PID" ]; then
    kill -TERM -- "-$SERVER_PID" 2>/dev/null || true
    sleep 2
    kill -KILL -- "-$SERVER_PID" 2>/dev/null || true
  fi
  if [ -n "$APPPORT" ]; then
    local pids
    pids=$(ss -ltnpH "sport = :$APPPORT" 2>/dev/null | grep -o 'pid=[0-9]\+' | cut -d= -f2 | sort -u)
    for pid in $pids; do
      kill -TERM "$pid" 2>/dev/null || true
    done
    sleep 1
    for pid in $pids; do
      kill -KILL "$pid" 2>/dev/null || true
    done
  fi
  restore_files
  podman rm -f "$CONTAINER" 2>/dev/null || true
  log "cleanup done, exit ${rc}"
  exit "${rc}"
}
trap cleanup EXIT INT TERM

pick_port() {
  local candidate attempt
  for attempt in $(seq 1 60); do
    candidate=$((42000 + RANDOM % 6000))
    if [ "$candidate" = "3005" ] || [ "$candidate" = "3099" ]; then
      continue
    fi
    if ! ss -ltnH "sport = :$candidate" 2>/dev/null | grep -q .; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  return 1
}

cd "$ROOT" || exit 1

log "container ${CONTAINER}"
if ! podman run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=uxpass \
  -e POSTGRES_DB=uxscratch \
  -p 127.0.0.1::5432 \
  postgres:16-alpine > "$OUT/podman-run.log" 2>&1; then
  log "podman run failed"
  cat "$OUT/podman-run.log"
  exit 3
fi

PGPORT=$(podman port "$CONTAINER" 5432/tcp 2>/dev/null | head -n 1 | sed 's/.*://')
if [ -z "$PGPORT" ]; then
  log "no host port for the container"
  exit 3
fi
log "scratch postgres on host port ${PGPORT}"

ready=0
for _ in $(seq 1 90); do
  if podman exec "$CONTAINER" pg_isready -U postgres -d uxscratch > /dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != "1" ]; then
  log "the scratch postgres did not become ready"
  podman logs "$CONTAINER" 2>&1 | tail -n 20
  exit 3
fi

export DATABASE_URL="postgres://postgres:uxpass@127.0.0.1:${PGPORT}/uxscratch"
export DIRECT_DATABASE_URL="$DATABASE_URL"
log "migrating the scratch database"
if ! pnpm --filter @reading-advantage/db migrate > "$OUT/migrate.log" 2>&1; then
  log "the migration failed"
  tail -n 30 "$OUT/migrate.log"
  exit 4
fi

log "seeding the scratch database"
if ! DATABASE_URL="$DATABASE_URL" IDS_FILE="$OUT/ids.json" node "$HERE/seed.mjs" > "$OUT/seed.log" 2>&1; then
  log "the seed failed"
  tail -n 30 "$OUT/seed.log"
  exit 5
fi
cat "$OUT/seed.log"

# The build type checks the app. A foreign untracked scratch file of another
# track breaks it, so it is moved aside for the build and put back after.
if [ -f "$FOREIGN" ]; then
  mv -f "$FOREIGN" "$FOREIGN_HOLD"
  log "moved the foreign scratch file aside for the build"
fi
if [ -f "$NEXT_ENV" ]; then
  cp -p "$NEXT_ENV" "$NEXT_ENV_HOLD"
fi

log "building the Primary app for production"
cd "$ROOT/apps/primary-advantage" || exit 6
if ! NODE_OPTIONS="--max-old-space-size=3584" "$ROOT/node_modules/.bin/next" build > "$OUT/build.log" 2>&1; then
  log "the build failed"
  tail -n 40 "$OUT/build.log"
  cd "$ROOT" || exit 6
  restore_files
  exit 6
fi
tail -n 15 "$OUT/build.log"
cd "$ROOT" || exit 6
restore_files

APPPORT=$(pick_port)
if [ -z "$APPPORT" ]; then
  log "no free port for the app"
  exit 7
fi
BASE_URL="http://127.0.0.1:${APPPORT}"
printf '%s' "$BASE_URL" > "$OUT/base_url.txt"
log "starting next start on port ${APPPORT}"

export DATABASE_URL
cd "$ROOT/apps/primary-advantage" || exit 7
setsid "$ROOT/node_modules/.bin/next" start -p "$APPPORT" > "$OUT/server.log" 2>&1 &
SERVER_PID=$!
cd "$ROOT" || exit 7
log "server process group ${SERVER_PID}"

if ! node -e '
const url = process.argv[1];
const deadline = Date.now() + 240000;
(async () => {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 200) { console.log("server_ready status=200"); process.exit(0); }
      if (response.status < 500) { console.log("server_ready status=" + response.status); process.exit(0); }
    } catch (error) {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log("server_not_ready");
  process.exit(1);
})();
' "$BASE_URL/en/auth/signin" > "$OUT/wait.log" 2>&1; then
  log "the server did not answer"
  cat "$OUT/wait.log"
  tail -n 30 "$OUT/server.log"
  exit 8
fi
cat "$OUT/wait.log"

log "running the browser checks"
BASE_URL="$BASE_URL" OUT_DIR="$OUT" IDS_FILE="$OUT/ids.json" node "$HERE/ux.mjs"
UX_RC=$?
log "browser checks exit ${UX_RC}"
exit "${UX_RC}"
