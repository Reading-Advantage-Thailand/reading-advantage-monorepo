#!/usr/bin/env bash
set -uo pipefail

# The browser gate of the login phase (test strategy P2b.4 item 5, P2b.6 flows F1 to F9).
#
# The gate runs the real app against a local database and a local stand-in for the storage. It
# signs in, comes back to the scanned page, signs out, shows the "How to join" page to a stranger,
# locks a wrong password, opens the teacher routes, refuses an off-site return path, checks the
# form on a phone, and seeks in a signed video.
#
# The local database and the local accounts live only in this run: the container and the temp
# folder are removed when the script ends. No password and no key of a real account is printed.
#
# Without --locked the script re-enters through heavy-run.sh, as the other gate scripts do.
# Callers run the script plain, with no flock.
if [ "${1:-}" != "--locked" ]; then
  exec bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
TMP_DIR="$(mktemp -d -t storytime-phase2b-XXXXXX)"
CONTAINER="storytime-phase2b-gate-$$"
APP_PORT="${PHASE2B_APP_PORT:-}"
STORAGE_PORT="${PHASE2B_STORAGE_PORT:-}"
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
STORAGE_PID=""
STORAGE_PGID=""
STORAGE_PORT=""
PLAYWRIGHT="$APP/.next/phase2b-browser-gate-$$.mjs"
MEDIA_ROOT="${STORYTIME_GATE_MEDIA_ROOT:-$HOME/Desktop/handoff/w01-storytime-app-package-r2}"

# Stops the whole process group of one process and waits for its port to close.
# Next starts its own `next-server` child, so a kill of the parent leaves the child alive.
stop_group() {
  local pid="$1" pgid="$2" port="$3"
  if [ -n "$pid" ]; then
    kill -- "-$pgid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  if [ -n "$port" ]; then
    for _ in $(seq 1 30); do
      if ! ss -ltn 2>/dev/null | grep -qE ":${port}[[:space:]]"; then break; fi
      sleep 1
    done
    if ss -ltn 2>/dev/null | grep -qE ":${port}[[:space:]]"; then
      echo "port_still_open=$port"
    else
      echo "port_closed=$port"
    fi
  fi
}

cleanup() {
  stop_group "$SERVER_PID" "$SERVER_PGID" "$SERVER_PORT"
  stop_group "$STORAGE_PID" "$STORAGE_PGID" "$STORAGE_PORT"
  podman rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -f "$PLAYWRIGHT"
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

free_port() {
  node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();});'
}

echo "=== Start the local database ==="
DB_PORT="$(free_port)"
if podman run -d --name "$CONTAINER" -p "127.0.0.1:$DB_PORT:5432" \
  -e POSTGRES_PASSWORD=storytime -e POSTGRES_DB=storytime \
  docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
  pass "The local database container starts"
else
  fail "The local database container does not start"
  printf '%s\n' "${RESULTS[@]}"
  echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
  exit "$FAILED"
fi
DB_READY=0
for _ in $(seq 1 60); do
  if podman exec "$CONTAINER" pg_isready -U postgres -d storytime >/dev/null 2>&1; then DB_READY=1; break; fi
  sleep 1
done
if [ "$DB_READY" -eq 1 ]; then pass "The local database answers"; else fail "The local database does not answer"; fi
DB_URL="postgres://postgres:storytime@127.0.0.1:$DB_PORT/storytime"

echo "=== Apply the Storytime migration twice ==="
MIGRATE_OK=1
for _ in 1 2; do
  if ! (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" pnpm --filter @reading-advantage/db storytime:migrate >"$TMP_DIR/migrate.log" 2>&1); then
    MIGRATE_OK=0
  fi
done
if [ "$MIGRATE_OK" -eq 1 ]; then pass "The migration runs twice and exits 0"; else fail "The migration fails"; fi

echo "=== Seed the accounts of the gate ==="
mkdir -p "$TMP_DIR/accounts"
cat > "$TMP_DIR/accounts/accounts.csv" <<'CSV'
name,class,role
Staff One,staff,family
Staff Two,staff,family
Staff Three,staff,family
Staff Four,staff,family
Staff Five,staff,family
Tutor One,tutor,teacher
Tutor Two,tutor,teacher
Tutor Three,tutor,teacher
Demo Class,demo-class,class
CSV
if (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" ./node_modules/.bin/tsx apps/storytime/scripts/make-accounts.ts --folder "$TMP_DIR/accounts" --database-url-env STORYTIME_DATABASE_URL >"$TMP_DIR/accounts.log" 2>&1); then
  pass "The account script exits 0"
else
  fail "The account script fails"
fi
ACCOUNTS_CREATED=0
if [ -f "$TMP_DIR/accounts/sign-in-cards.csv" ]; then
  ACCOUNTS_CREATED=$(($(wc -l < "$TMP_DIR/accounts/sign-in-cards.csv") - 1))
fi
echo "accounts_created=$ACCOUNTS_CREATED"

echo "=== Start the stand-in for the storage ==="
STORAGE_PORT="$(free_port)"
cat > "$TMP_DIR/stand-in.mjs" <<'NODE'
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = process.argv[2];
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const signature = url.searchParams.get("X-Amz-Signature");
  const expires = Number(url.searchParams.get("X-Amz-Expires") ?? "0");
  if (!signature || !Number.isFinite(expires) || expires > 21600) {
    console.log(`REQ status=403 range=none path=${url.pathname}`);
    response.writeHead(403, { "content-type": "text/plain" });
    response.end("forbidden");
    return;
  }
  const key = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/^[^/]+\//, "");
  const file = path.join(root, key);
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    console.log(`REQ status=404 range=none path=${url.pathname}`);
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
    return;
  }
  const size = fs.statSync(file).size;
  const range = request.headers.range;
  const headers = { "accept-ranges": "bytes", "content-type": "application/octet-stream" };
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? Number(match[1]) : 0;
    const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    headers["content-range"] = `bytes ${start}-${end}/${size}`;
    headers["content-length"] = String(end - start + 1);
    console.log(`REQ status=206 range=${range} path=${url.pathname}`);
    response.writeHead(206, headers);
    fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }
  headers["content-length"] = String(size);
  console.log(`REQ status=200 range=none path=${url.pathname}`);
  response.writeHead(200, headers);
  fs.createReadStream(file).pipe(response);
});
server.listen(Number(process.argv[3]), "127.0.0.1");
NODE
setsid bash -c "echo \$\$ > '$TMP_DIR/storage.pid'; exec node '$TMP_DIR/stand-in.mjs' '$MEDIA_ROOT' '$STORAGE_PORT' > '$TMP_DIR/stand-in.log' 2>&1" &
for _ in $(seq 1 20); do
  [ -s "$TMP_DIR/storage.pid" ] && break
  sleep 0.2
done
STORAGE_PID="$(cat "$TMP_DIR/storage.pid" 2>/dev/null)"
STORAGE_PGID="$(ps -o pgid= -p "$STORAGE_PID" 2>/dev/null | tr -d ' ')"
[ -n "$STORAGE_PGID" ] || STORAGE_PGID="$STORAGE_PID"
sleep 1
if kill -0 "$STORAGE_PID" 2>/dev/null; then pass "The stand-in for the storage starts"; else fail "The stand-in for the storage does not start"; fi

echo "=== Build the production app ==="
if (cd "$APP" && ../../node_modules/.bin/next build >"$TMP_DIR/build.log" 2>&1); then
  pass "The production build exits 0"
else
  fail "The production build fails"
fi

echo "=== Start next start on a free 127.0.0.1 port ==="
APP_PORT="$(free_port)"
setsid bash -c "echo \$\$ > '$TMP_DIR/server.pid'; cd '$APP' && STORYTIME_DATABASE_URL='$DB_URL' \
  STORYTIME_MEDIA_BASE='gs://storytime-app-media' \
  STORYTIME_STORAGE_ENDPOINT='http://127.0.0.1:$STORAGE_PORT' \
  STORYTIME_STORAGE_ACCESS_KEY='local-access-key' \
  STORYTIME_STORAGE_SECRET_KEY='local-secret-key' \
  STORYTIME_TEACHER_ROUTES=1 \
  exec ../../node_modules/.bin/next start -p '$APP_PORT' > '$TMP_DIR/next-start.log' 2>&1" &
for _ in $(seq 1 20); do
  [ -s "$TMP_DIR/server.pid" ] && break
  sleep 0.2
done
SERVER_PID="$(cat "$TMP_DIR/server.pid" 2>/dev/null)"
SERVER_PGID="$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')"
[ -n "$SERVER_PGID" ] || SERVER_PGID="$SERVER_PID"
SERVER_PORT="$APP_PORT"
APP_UP=0
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://localhost:$APP_PORT/th/join"; then APP_UP=1; break; fi
  sleep 1
done
if [ "$APP_UP" -eq 1 ]; then pass "The app answers on its port"; else fail "The app does not answer on its port"; fi

echo "=== Run the flows F1 to F9 with SYSTEM Chrome ==="
cat > "$PLAYWRIGHT" <<'NODE'
import fs from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2];
const cardsPath = process.argv[3];
const storageOrigin = process.argv[4] ?? "";
const labels = [];
function label(name, value) { labels.push(`${name}=${value}`); }
function fail(message) { labels.push(`FAIL: ${message}`); process.exitCode = 1; }

const cards = new Map();
for (const line of fs.readFileSync(cardsPath, "utf8").trim().split("\n").slice(1)) {
  const parts = line.split(",");
  cards.set(parts[0], parts[parts.length - 1]);
}

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
let storageMediaRequests = 0;
let unsignedMedia = 0;
let mediaPathRequests = 0;
let appMediaRequests = 0;
let rangeResponses = 0;
let offsiteRequests = 0;

page.on("response", (response) => {
  if (response.status() === 206 && response.url().startsWith(storageOrigin)) rangeResponses += 1;
});
page.on("request", (request) => {
  const url = request.url();
  if (url.startsWith(base) || url.startsWith(storageOrigin)) return;
  if (url.startsWith("data:") || url.startsWith("blob:")) return;
  offsiteRequests += 1;
});
page.on("request", (request) => {
  const url = request.url();
  const storyMedia = /\.(mp3|mp4|jpg|png|webp)(\?|$)/.test(url);
  if (url.startsWith(storageOrigin)) {
    storageMediaRequests += 1;
    if (!url.includes("X-Amz-Signature")) {
      unsignedMedia += 1;
      if (unsignedMedia === 1) console.log(`first_unsigned_media=${url}`);
    }
    return;
  }
  if (url.startsWith(base)) {
    if (new URL(url).pathname.startsWith("/media/")) {
      mediaPathRequests += 1;
      if (mediaPathRequests === 1) console.log(`first_media_path=${url}`);
    }
    if (storyMedia) appMediaRequests += 1;
  }
});

/**
 * Signs one account in and returns the raw Set-Cookie header of the answer.
 * @param {string} user The username.
 * @param {string} next The path that the sign-in returns to.
 * @returns {Promise<string>} The Set-Cookie header.
 */
async function signIn(user, next) {
  await page.goto(`${base}/th/sign-in?next=${encodeURIComponent(next ?? "/th/st/2/1")}`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', cards.get(user));
  const answer = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/api/auth/sign-in"),
    { timeout: 20000 },
  );
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/sign-in"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  const response = await answer;
  const headers = await response.allHeaders();
  return headers["set-cookie"] ?? "";
}

// F1: a scan without a session shows the sign-in page, and the sign-in returns to the same URL.
await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: "domcontentloaded" });
const f1SignIn = page.url().includes("/th/sign-in") && page.url().includes("next=");
label("f1_sign_in_page", f1SignIn ? 1 : 0);
storageMediaRequests = 0;
unsignedMedia = 0;
mediaPathRequests = 0;
appMediaRequests = 0;
const setCookie = await signIn("staff-01", "/th/st/2/1?part=song");
const f1Same = page.url().includes("/th/st/2/1") && page.url().includes("part=song");
label("returned_same_url", f1Same ? 1 : 0);
label("media_requests", storageMediaRequests);
label("unsigned_media", unsignedMedia);
label("media_path_requests", mediaPathRequests);
label("app_media_requests", appMediaRequests);

// F2: the cookie stays 365 days, and a new context with the jar opens the week.
const maxAgeMatch = /Max-Age=(\d+)/.exec(setCookie);
label("device_kept_max_age", maxAgeMatch ? maxAgeMatch[1] : 0);
const jar = await context.cookies();
const session = jar.find((cookie) => cookie.name === "__Host-st_session");
label("device_kept", session && session.value.length > 0 ? 1 : 0);
const kept = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: { cookies: jar } });
const keptPage = await kept.newPage();
const keptStatus = await keptPage.goto(`${base}/th/st/2/1`, { waitUntil: "domcontentloaded" });
label("device_kept_status", keptStatus ? keptStatus.status() : 0);
label("device_kept_sign_in_page", keptPage.url().includes("/th/sign-in") ? 1 : 0);
await kept.close();

// F3: the sign-out ends the session.
await page.goto(`${base}/th/st/2/1`, { waitUntil: "domcontentloaded" });
await page.click('form[action="/api/auth/sign-out"] button[type="submit"]');
await page.waitForURL((url) => url.pathname.endsWith("/sign-in"), { timeout: 20000 });
await page.goBack();
await page.reload({ waitUntil: "domcontentloaded" });
const afterSignOut = await page.content();
label("content_after_signout", afterSignOut.includes("part=song") || afterSignOut.includes("data-week-tiles") ? 1 : 0);

// F4: a stranger follows "How to join" and gets no media and no cookie.
const stranger = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const strangerPage = await stranger.newPage();
let strangerMedia = 0;
let strangerSetCookie = 0;
strangerPage.on("request", (request) => {
  const url = request.url();
  if (url.startsWith(base) && new URL(url).pathname.startsWith("/media/")) strangerMedia += 1;
  if (url.startsWith(storageOrigin)) strangerMedia += 1;
});
strangerPage.on("response", (response) => {
  if (response.headers()["set-cookie"]) strangerSetCookie += 1;
});
await strangerPage.goto(`${base}/th/st/2/1`, { waitUntil: "domcontentloaded" });
await strangerPage.click('a[href="/th/join"]');
await strangerPage.waitForURL((url) => url.pathname.endsWith("/th/join"), { timeout: 20000 });
const strangerHtml = await strangerPage.content();
label("stranger_draft_marker", strangerHtml.includes("data-draft") ? 1 : 0);
label("stranger_week_text", strangerHtml.includes("data-week-tiles") ? 1 : 0);
label("stranger_media_requests", strangerMedia);
label("stranger_set_cookie", strangerSetCookie);
await stranger.close();

// F5: a wrong password gives one generic message, and the sixth attempt locks the account.
await context.clearCookies();
let genericError = 0;
let genericErrorEnglish = 0;
let passwordKept = 0;
let usernameKept = 0;
let lockedAfter = 0;
for (let attempt = 1; attempt <= 6; attempt += 1) {
  await page.goto(`${base}/th/sign-in`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', "staff-02");
  await page.fill('input[name="password"]', "wrong-password");
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("error") !== null, { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  const alerts = await page.locator('[role="alert"]').count();
  if (page.url().includes("error=locked")) lockedAfter = attempt;
  else if (alerts > 0) genericError = 1;
  if (attempt === 1) {
    const password = await page.inputValue('input[name="password"]');
    passwordKept = password.length > 0 ? 1 : 0;
    const username = await page.inputValue('input[name="username"]');
    usernameKept = username.length > 0 ? 1 : 0;
  }
}
await context.clearCookies();
await page.goto(`${base}/en/sign-in`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="username"]', "demo-class-01");
await page.fill('input[name="password"]', "wrong-password");
await Promise.all([
  page.waitForURL((url) => url.searchParams.get("error") !== null, { timeout: 20000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
if ((await page.locator('[role="alert"]').count()) > 0) genericErrorEnglish = 1;
label("generic_error", genericError);
label("generic_error_english", genericErrorEnglish);
label("password_kept", passwordKept);
label("username_kept", usernameKept);
label("locked_after", lockedAfter);

// F6: the teacher routes need a teacher session.
await context.clearCookies();
await signIn("tutor-01", "/th/teacher/2/1");
label("teacher_ok", page.url().includes("/th/teacher/2/1") ? 1 : 0);
await page.goto(`${base}/th/st/2/1`, { waitUntil: "domcontentloaded" });
label("teacher_on_family", page.url().includes("/th/st/2/1") ? 1 : 0);
await context.clearCookies();
await signIn("staff-01", "/th/teacher/2/1");
const forbiddenHtml = await page.content();
label("family_403", forbiddenHtml.includes("/th/sign-in?next=") ? 1 : 0);
let loop = 0;
try {
  await page.click('a[href*="/th/sign-in"]');
  await page.waitForURL((url) => url.pathname.endsWith("/th/sign-in"), { timeout: 15000 });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });
} catch {
  loop = 1;
}
label("loop", loop);
label("teacher_form_opens", (await page.locator('input[name="username"]').count()) > 0 ? 1 : 0);
await context.clearCookies();
await signIn("tutor-01", "/th/teacher/2/1");
label("teacher_return", page.url().includes("/th/teacher/2/1") ? 1 : 0);

// F7: an off-site return path falls back to the signed-in page.
await context.clearCookies();
await page.goto(`${base}/th/sign-in?next=${encodeURIComponent("//evil.example")}`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="username"]', "staff-04");
await page.fill('input[name="password"]', cards.get("staff-04"));
await Promise.all([
  page.waitForURL((url) => !url.pathname.endsWith("/sign-in"), { timeout: 20000 }),
  page.click('button[type="submit"]'),
]);
label("offsite_requests", offsiteRequests);
label("bad_next_fallback", page.url().endsWith("/th/st") ? 1 : 0);

// F8: the form on a phone.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
const phonePage = await phone.newPage();
await phonePage.goto(`${base}/th/sign-in`, { waitUntil: "domcontentloaded" });
const phoneChecks = await phonePage.evaluate(() => {
  const username = document.querySelector('input[name="username"]');
  const password = document.querySelector('input[name="password"]');
  const button = document.querySelector('button[type="submit"]');
  const labelFor = (input) => Boolean(input && document.querySelector(`label[for="${input.id}"]`));
  return {
    labels: labelFor(username) && labelFor(password),
    autocomplete:
      username && password
        ? username.getAttribute("autocomplete") === "username" &&
          password.getAttribute("autocomplete") === "current-password"
        : false,
    autocapitalize: username ? username.getAttribute("autocapitalize") === "none" : false,
    passwordType: password ? password.getAttribute("type") === "password" : false,
    touchTarget: button ? button.getBoundingClientRect().height >= 44 : false,
    noHorizontalScroll: document.documentElement.scrollWidth <= window.innerWidth,
  };
});
label("phone_form_checks", Object.values(phoneChecks).filter(Boolean).length);
label("phone_no_scroll", phoneChecks.noHorizontalScroll ? 1 : 0);
await phonePage.fill('input[name="username"]', "staff-05");
await phonePage.fill('input[name="password"]', cards.get("staff-05"));
await phonePage.press('input[name="password"]', "Enter");
await phonePage.waitForURL((url) => !url.pathname.endsWith("/sign-in"), { timeout: 20000 }).catch(() => {});
label("phone_enter_submits", phonePage.url().includes("/th/sign-in") ? 0 : 1);
await phone.close();

// F9: the video seeks on the signed URL.
await context.clearCookies();
const rangeBefore = rangeResponses;
await signIn("staff-05", "/th/st/2/1?part=song");
await page.waitForSelector("video", { timeout: 20000 });
const seek = await page.evaluate(async () => {
  const video = document.querySelector("video");
  if (!video) return { ok: false, range: false };
  await new Promise((resolve) => {
    if (video.readyState >= 1) resolve();
    else video.addEventListener("loadedmetadata", resolve, { once: true });
    setTimeout(resolve, 15000);
  });
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  video.currentTime = duration / 2;
  await new Promise((resolve) => {
    video.addEventListener("seeked", resolve, { once: true });
    setTimeout(resolve, 15000);
  });
  return { ok: Math.abs(video.currentTime - duration / 2) < 0.5, range: duration > 0 };
});
label("seek_ok", seek.ok ? 1 : 0);
label("video_duration", seek.range ? 1 : 0);
label("range_206", rangeResponses - rangeBefore);

console.log(labels.join("\n"));
await browser.close();
NODE
if (cd "$APP" && node "$PLAYWRIGHT" "http://localhost:$APP_PORT" "$TMP_DIR/accounts/sign-in-cards.csv" "http://127.0.0.1:$STORAGE_PORT" >"$TMP_DIR/playwright.log" 2>&1); then
  pass "The flows F1 to F9 run and exit 0"
  grep -E "^[a-z0-9_]+=" "$TMP_DIR/playwright.log" || true
else
  fail "The flows F1 to F9 fail"
  tail -20 "$TMP_DIR/playwright.log" || true
  echo "--- the log of the app ---"
  tail -40 "$TMP_DIR/next-start.log" || true
fi

echo "=== The requests of the stand-in for the storage ==="
echo "standin_requests=$(grep -c '^REQ ' "$TMP_DIR/stand-in.log" 2>/dev/null || echo 0)"
echo "standin_range_requests=$(grep -c 'range=bytes=' "$TMP_DIR/stand-in.log" 2>/dev/null || echo 0)"
echo "standin_206=$(grep -c 'status=206' "$TMP_DIR/stand-in.log" 2>/dev/null || echo 0)"

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
