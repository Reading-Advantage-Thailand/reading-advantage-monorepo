#!/usr/bin/env bash
set -uo pipefail

# The browser gate of look Phase 1 (test strategy P1.4 "Browser run", Q6; rows 1 to 5).
#
# The gate runs the built app against a throwaway Postgres and a local stand-in for the
# storage. It follows the signed-in pattern of phase2b-browser-gate.sh: it seeds an account,
# signs in before each row, and shows that a stranger gets a 307 before any 404 view.
#
# Row 1: the 404 view of a draft week shows the "not open yet" text and one 48 px link.
# Row 2: the head icon link exists, and /icon.png answers 200 with no session.
# Row 3: the decodable page keeps the source case.
# Row 4: the reader word gaps are even at phone, tablet, and phone landscape.
# Row 5: the song stage holds the poster before any play.
#
# No row plays a recording. Row 5 makes no phone claim. A headless run is not phone evidence.
#
# The whole script (Postgres, build, server, Playwright) runs inside one heavy-run job. Without
# --locked the script re-enters through heavy-run.sh. Callers run the script plain, with no flock.
if [ "${1:-}" != "--locked" ]; then
  exec env HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 \
    bash "$HOME/Desktop/advantage-pr/scripts/jobs/heavy-run.sh" \
    -c "HEAVY_LOCK_HELD=1 bash '$0' --locked"
fi

FAILED=0; PASS_COUNT=0; FAIL_COUNT=0; RESULTS=()
pass() { RESULTS+=("PASS: $1"); PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { RESULTS+=("FAIL: $1"); FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED=1; }
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
APP="$ROOT/apps/storytime"
TMP_DIR="$(mktemp -d -t storytime-look-p1-XXXXXX)"
CONTAINER="storytime-look-p1-gate-$$"
APP_PORT=""
DB_PORT=""
STORAGE_PORT=""
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
STORAGE_PID=""
STORAGE_PGID=""
STORAGE_PORT_RUN=""
PLAYWRIGHT="$APP/.next/look-phase1-browser-gate-$$.mjs"
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
  stop_group "$STORAGE_PID" "$STORAGE_PGID" "$STORAGE_PORT_RUN"
  podman rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -f "$PLAYWRIGHT"
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

free_port() {
  node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();});'
}

echo "=== Start the throwaway database ==="
DB_PORT="$(free_port)"
if podman run -d --name "$CONTAINER" -p "127.0.0.1:$DB_PORT:5432" \
  -e POSTGRES_PASSWORD=storytime -e POSTGRES_DB=storytime \
  docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
  pass "The throwaway database container starts"
else
  fail "The throwaway database container does not start"
  printf '%s\n' "${RESULTS[@]}"
  echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
  exit "$FAILED"
fi
DB_READY=0
for _ in $(seq 1 60); do
  if podman exec "$CONTAINER" pg_isready -U postgres -d storytime >/dev/null 2>&1; then DB_READY=1; break; fi
  sleep 1
done
if [ "$DB_READY" -eq 1 ]; then pass "The throwaway database answers"; else fail "The throwaway database does not answer"; fi
DB_URL="postgres://postgres:storytime@127.0.0.1:$DB_PORT/storytime"

echo "=== Apply the Storytime migration twice ==="
MIGRATE_OK=1
for _ in 1 2; do
  if ! (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" pnpm --filter @reading-advantage/db storytime:migrate >"$TMP_DIR/migrate.log" 2>&1); then
    MIGRATE_OK=0
  fi
done
if [ "$MIGRATE_OK" -eq 1 ]; then pass "The migration runs twice and exits 0"; else fail "The migration fails"; fi

echo "=== Seed the account of the gate (temp folder outside the repository) ==="
mkdir -p "$TMP_DIR/accounts"
cat > "$TMP_DIR/accounts/accounts.csv" <<'CSV'
name,class,role
Staff One,staff,family
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
STORAGE_PORT_RUN="$(free_port)"
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
setsid bash -c "echo \$\$ > '$TMP_DIR/storage.pid'; exec node '$TMP_DIR/stand-in.mjs' '$MEDIA_ROOT' '$STORAGE_PORT_RUN' > '$TMP_DIR/stand-in.log' 2>&1" &
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
  tail -30 "$TMP_DIR/build.log" || true
fi

echo "=== Start next start on a free port in its own process group ==="
APP_PORT="$(free_port)"
setsid bash -c "echo \$\$ > '$TMP_DIR/server.pid'; cd '$APP' && STORYTIME_DATABASE_URL='$DB_URL' \
  STORYTIME_MEDIA_BASE='gs://storytime-app-media' \
  STORYTIME_STORAGE_ENDPOINT='http://127.0.0.1:$STORAGE_PORT_RUN' \
  STORYTIME_STORAGE_ACCESS_KEY='local-access-key' \
  STORYTIME_STORAGE_SECRET_KEY='local-secret-key' \
  exec ../../node_modules/.bin/next start --hostname 127.0.0.1 -p '$APP_PORT' > '$TMP_DIR/next-start.log' 2>&1" &
for _ in $(seq 1 20); do
  [ -s "$TMP_DIR/server.pid" ] && break
  sleep 0.2
done
SERVER_PID="$(cat "$TMP_DIR/server.pid" 2>/dev/null)"
SERVER_PGID="$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ')"
[ -n "$SERVER_PGID" ] || SERVER_PGID="$SERVER_PID"
SERVER_PORT="$APP_PORT"
APP_UP=0
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://localhost:$APP_PORT/th/sign-in"; then APP_UP=1; break; fi
  sleep 1
done
if [ "$APP_UP" -eq 1 ]; then pass "The app answers on its port"; else fail "The app does not answer on its port"; fi

echo "=== Run the rows 1 to 5 with SYSTEM Chrome ==="
cat > "$PLAYWRIGHT" <<'NODE'
import fs from "node:fs";
import { chromium, request as playwrightRequest } from "@playwright/test";

const base = process.argv[2];
const cardsPath = process.argv[3];
const USER = "staff-01";
const PASS = (() => {
  for (const line of fs.readFileSync(cardsPath, "utf8").trim().split("\n").slice(1)) {
    const parts = line.split(",");
    if (parts[0] === USER) return parts[parts.length - 1];
  }
  return "";
})();
let rowCount = 0;
function emit(name, value) { console.log(`${name}=${value}`); }
function row(number, ok, detail) {
  rowCount += 1;
  console.log(`${ok ? "PASS" : "FAIL"}: row ${number} ${detail}`);
}

/** The verdict of row 1 for one 404 page. */
function notOpenVerdict(v) {
  return v.status === 404 && v.hasText === true && v.links === 1 && v.height >= 48 && v.hrefOk === true;
}
/** The verdict of row 1 for the old 404 text. */
function oldTextVerdict(v) {
  return v.status === 404 && v.hasText === true && v.links === 0;
}
/** The verdict of row 2. */
function iconVerdict(v) {
  return v.status === 200 && String(v.contentType).startsWith("image/png") && v.linkTh === true && v.linkEn === true;
}
/** The verdict of row 3. */
function caseVerdict(v) {
  return v.sentence === "A nest." && v.sentenceTransform === "none" && v.chips === 3 && v.chipsTransform === "none";
}
/** The verdict of row 4. */
function readerVerdict(v) {
  return v.pagesMeasured === 12 && v.wordsMin >= 2 && v.pairsMin >= 2 && v.gapDelta <= 2 &&
    v.nextBg === true && v.nextMinHeight >= 48 && v.audioBg === true && v.countOk === true && v.overflow === 0;
}
/** The verdict of row 5. */
function songVerdict(v) {
  return v.preload === "metadata" && v.playsInline === true && v.poster === true &&
    v.stageBg === true && v.posterStatus === 200 && v.consoleErrors === 0 && v.played === false;
}

// The self-check rejects mutant values with the real verdict functions. A verdict that always
// returns false can not pass the control set, so the self-check is not vacuous.
const controls = [
  notOpenVerdict({ status: 404, hasText: true, links: 1, height: 48, hrefOk: true }),
  oldTextVerdict({ status: 404, hasText: true, links: 0 }),
  iconVerdict({ status: 200, contentType: "image/png", linkTh: true, linkEn: true }),
  caseVerdict({ sentence: "A nest.", sentenceTransform: "none", chips: 3, chipsTransform: "none" }),
  readerVerdict({ pagesMeasured: 12, wordsMin: 4, pairsMin: 3, gapDelta: 0, nextBg: true, nextMinHeight: 48, audioBg: true, countOk: true, overflow: 0 }),
  songVerdict({ preload: "metadata", playsInline: true, poster: true, stageBg: true, posterStatus: 200, consoleErrors: 0, played: false }),
];
const mutants = [
  notOpenVerdict({ status: 404, hasText: true, links: 0, height: 48, hrefOk: true }) === false,
  oldTextVerdict({ status: 404, hasText: true, links: 1 }) === false,
  iconVerdict({ status: 404, contentType: "text/html", linkTh: true, linkEn: true }) === false,
  caseVerdict({ sentence: "A NEST.", sentenceTransform: "uppercase", chips: 3, chipsTransform: "none" }) === false,
  readerVerdict({ pagesMeasured: 12, wordsMin: 4, pairsMin: 3, gapDelta: 9, nextBg: true, nextMinHeight: 48, audioBg: true, countOk: true, overflow: 0 }) === false,
  songVerdict({ preload: "none", playsInline: true, poster: true, stageBg: true, posterStatus: 200, consoleErrors: 0, played: false }) === false,
];
const controlsOk = controls.every(Boolean);
const rejected = mutants.filter(Boolean).length;
emit("controls_ok", controlsOk ? 1 : 0);
emit("mutants_rejected", rejected);
emit("mutants_checked", mutants.length);
if (!controlsOk || rejected !== mutants.length) {
  console.log("FAIL: verdict self-check the real verdicts accept the good values and reject the mutants");
}

if (!PASS) {
  console.log(`FAIL: card list the temp card list holds no ${USER}`);
  process.exit(1);
}

async function signIn(page, next = "/th/st/2/1") {
  await page.context().clearCookies();
  await page.goto(`${base}/th/sign-in?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  const answer = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/api/auth/sign-in"),
    { timeout: 20000 },
  );
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/sign-in"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await answer;
}

async function readNotFound(page, path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
  await page
    .waitForFunction(
      () => /not open yet|This page is not here/.test(document.body ? document.body.innerText : ""),
      undefined,
      { timeout: 20000 },
    )
    .catch(() => {});
  const content = await page.evaluate(() => {
    const main = document.querySelector("main");
    const links = [...document.querySelectorAll("main a")].map((link) => ({
      href: link.getAttribute("href"),
      height: Math.round(link.getBoundingClientRect().height),
      text: link.textContent ?? "",
    }));
    return {
      body: main ? main.innerText : document.body.innerText,
      links,
    };
  });
  return { status: response ? response.status() : 0, ...content };
}

async function measureReader(page) {
  return page.evaluate(() => {
    const elements = [...document.querySelectorAll("[data-word]")];
    /** The text ink box of one word, not its layout box. */
    function ink(element) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top };
    }
    const words = elements.map((element) => ({ element, rect: ink(element) }));
    const gaps = [];
    for (let index = 0; index + 1 < words.length; index += 1) {
      const a = words[index];
      const b = words[index + 1];
      if (Math.abs(a.rect.top - b.rect.top) > 4) continue;
      // The trailing punctuation of a word sits in the lead text node of the next word. The
      // word gap is the whitespace after that punctuation, so the comma of "Hello," is not
      // counted as a gap.
      let aEnd = a.rect.right;
      const wrapper = b.element.parentElement;
      const leadNode = wrapper ? wrapper.firstChild : null;
      if (leadNode && leadNode.nodeType === Node.TEXT_NODE) {
        const lead = leadNode.textContent ?? "";
        const trailing = /\s+$/.exec(lead);
        const punctuation = trailing ? lead.slice(0, trailing.index) : lead;
        if (punctuation.length > 0) {
          const range = document.createRange();
          range.setStart(leadNode, 0);
          range.setEnd(leadNode, punctuation.length);
          aEnd = range.getBoundingClientRect().right;
        }
      }
      gaps.push(Math.round((b.rect.left - aEnd) * 100) / 100);
    }
    const buttons = [...document.querySelectorAll("button")];
    const next = buttons.find((button) => button.textContent.trim() === "→");
    const audioButtons = buttons.filter((button) => button.hasAttribute("aria-pressed"));
    const nextStyle = next ? getComputedStyle(next) : null;
    const nextBg = nextStyle ? nextStyle.backgroundColor : "";
    const nextTransparent = nextBg === "" || nextBg === "transparent" || nextBg === "rgba(0, 0, 0, 0)";
    const audioBg = audioButtons.length === 3 && audioButtons.every((button) => {
      const bg = getComputedStyle(button).backgroundColor;
      return bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";
    });
    const countElement = document.querySelector('span[aria-live="polite"]');
    const overflow = Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)) +
      words.filter((word) => word.rect.left < -1 || word.rect.right > window.innerWidth + 1).length;
    return {
      gaps,
      words: words.length,
      count: countElement ? countElement.textContent.trim() : "",
      nextBg: !nextTransparent,
      nextHeight: next ? Math.round(next.getBoundingClientRect().height) : 0,
      audioBg,
      audioCount: audioButtons.length,
      overflow,
    };
  });
}

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

// Row 1: a stranger gets a 307 before any 404 view, and the signed-in 404 view links to the
// highest open week.
try {
  const anonymous = await playwrightRequest.newContext();
  const stranger = await anonymous.get(`${base}/th/st/2/2`, { maxRedirects: 0 });
  const strangerStatus = stranger.status();
  const strangerLocation = stranger.headers()["location"] ?? "";
  await anonymous.dispose();
  emit("stranger_status", strangerStatus);
  emit("stranger_sign_in", strangerLocation.includes("/th/sign-in") ? 1 : 0);
  await signIn(page, "/th/st/2/1");

  const notOpenTh = await readNotFound(page, "/th/st/2/2");
  const linkTh = notOpenTh.links[0] ?? { href: "", height: 0, text: "" };
  const th = {
    status: notOpenTh.status,
    hasText: notOpenTh.body.includes("This week is not open yet"),
    links: notOpenTh.links.length,
    height: linkTh.height,
    hrefOk: linkTh.href === "/th/st/2/1",
  };
  emit("not_open_th", th.hasText ? 1 : 0);
  emit("week404_status_th", th.status);
  emit("open_links_th", th.links);
  emit("open_link_px_th", th.height);
  emit("open_link_href_th", linkTh.href);
  emit("open_link_text_th", linkTh.text.replace(/\s+/g, " ").trim());
  emit("verdict_th", notOpenVerdict(th) ? 1 : 0);

  const notOpenEn = await readNotFound(page, "/en/st/2/2");
  const linkEn = notOpenEn.links[0] ?? { href: "", height: 0, text: "" };
  const en = {
    status: notOpenEn.status,
    hasText: notOpenEn.body.includes("This week is not open yet"),
    links: notOpenEn.links.length,
    height: linkEn.height,
    // The strategy row accepts the Thai or the English highest open week here. The not-found
    // boundary reads the locale with a fallback to the routing default, so the English page
    // sends the reader to the Thai week today (labeled for Review C).
    hrefOk: linkEn.href === "/th/st/2/1" || linkEn.href === "/en/st/2/1",
  };
  emit("not_open_en", en.hasText ? 1 : 0);
  emit("week404_status_en", en.status);
  emit("open_links_en", en.links);
  emit("open_link_px_en", en.height);
  emit("open_link_href_en", linkEn.href);
  emit("verdict_en", notOpenVerdict(en) ? 1 : 0);

  await readNotFound(page, "/th/st/2/2");
  await page.click('main a[href="/th/st/2/1"]');
  await page.waitForURL((url) => url.pathname === "/th/st/2/1", { timeout: 20000 });
  await page.waitForSelector("[data-week-tiles]", { timeout: 20000 });
  emit("open_link_click", 1);

  const level4 = await readNotFound(page, "/th/st/4/1");
  const old = {
    status: level4.status,
    hasText: level4.body.includes("This page is not here."),
    links: level4.links.length,
  };
  emit("level4_old_text", old.hasText ? 1 : 0);
  emit("level4_status", old.status);
  emit("level4_links", old.links);
  emit("verdict_level4", oldTextVerdict(old) ? 1 : 0);
  emit("stranger_ok", strangerStatus === 307 && strangerLocation.includes("/th/sign-in") ? 1 : 0);

  row(
    1,
    strangerStatus === 307 && strangerLocation.includes("/th/sign-in") && notOpenVerdict(th) &&
      notOpenVerdict(en) && oldTextVerdict(old),
    `week404_status_th=${th.status} week404_status_en=${en.status} not_open_links_th=${th.links} not_open_links_en=${en.links} level4_status=${old.status}`,
  );
} catch (error) {
  row(1, false, `the 404 row raises an error: ${String(error).slice(0, 160)}`);
}

// Row 2: the head icon link exists on both locales, and /icon.png answers 200 with no session.
try {
  await signIn(page, "/th/st/2/1");
  const home = { consoleErrors: 0, failedRequests: 0, linkTh: false, linkEn: false };
  async function visitHome(locale) {
    const consoleErrors = [];
    const failedRequests = [];
    const onConsole = (message) => { if (message.type() === "error") consoleErrors.push(message.text()); };
    // A Next prefetch of a link cancels with ERR_ABORTED on the next navigation; that is not a
    // failed resource. A real miss is a 4xx or 5xx answer, and a real network error is any other
    // request failure.
    const onFailed = (request) => {
      const error = request.failure();
      const text = error ? error.errorText : "";
      if (text.includes("ERR_ABORTED")) return;
      failedRequests.push(`${text} ${request.url()}`);
    };
    const onResponse = (response) => {
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
    };
    page.on("console", onConsole);
    page.on("requestfailed", onFailed);
    page.on("response", onResponse);
    const response = await page.goto(`${base}/${locale}/st/2/1`, { waitUntil: "load" });
    await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    const link = await page.evaluate(() => {
      const element = document.querySelector('link[rel~="icon"]');
      return element ? element.getAttribute("href") : null;
    });
    page.off("console", onConsole);
    page.off("requestfailed", onFailed);
    page.off("response", onResponse);
    return { status: response ? response.status() : 0, link: link !== null && String(link).startsWith("/icon.png"), consoleErrors, failedRequests };
  }
  const th = await visitHome("th");
  const en = await visitHome("en");
  home.linkTh = th.link;
  home.linkEn = en.link;
  home.consoleErrors = th.consoleErrors.length + en.consoleErrors.length;
  home.failedRequests = th.failedRequests.length + en.failedRequests.length;
  emit("icon_link_th", th.link ? 1 : 0);
  emit("icon_link_en", en.link ? 1 : 0);
  emit("home_status_th", th.status);
  emit("home_status_en", en.status);
  emit("console_errors", home.consoleErrors);
  emit("failed_requests", home.failedRequests);
  if (home.consoleErrors > 0) emit("first_console_error", th.consoleErrors.concat(en.consoleErrors)[0]);
  if (home.failedRequests > 0) emit("first_failed_request", th.failedRequests.concat(en.failedRequests)[0]);

  const anonymous = await playwrightRequest.newContext();
  const icon = await anonymous.get(`${base}/icon.png`, { maxRedirects: 0 });
  await anonymous.dispose();
  emit("icon_status", icon.status());
  emit("icon_content_type", icon.headers()["content-type"] ?? "");
  const verdict = {
    status: icon.status(),
    contentType: icon.headers()["content-type"] ?? "",
    linkTh: th.link,
    linkEn: en.link,
  };
  row(
    2,
    iconVerdict(verdict) && home.consoleErrors === 0 && home.failedRequests === 0 &&
      th.status === 200 && en.status === 200,
    `icon_status=${verdict.status} console_errors=${home.consoleErrors} failed_requests=${home.failedRequests}`,
  );
} catch (error) {
  row(2, false, `the icon row raises an error: ${String(error).slice(0, 160)}`);
}

// Row 3: the decodable page keeps the source case and the computed text-transform is none.
try {
  await signIn(page, "/en/st/2/1");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/en/st/2/1?part=decodable`, { waitUntil: "load" });
  await page.waitForSelector('section[data-page-number="1"] p', { timeout: 20000 });
  const data = await page.evaluate(() => {
    const paragraph = document.querySelector('section[data-page-number="1"] p');
    const chips = [...document.querySelectorAll('section[aria-label="Tricky words"] button')];
    return {
      sentence: paragraph ? paragraph.textContent.replace(/\s+/g, " ").trim() : "",
      sentenceTransform: paragraph ? getComputedStyle(paragraph).textTransform : "",
      chips: chips.length,
      chipsTransform: chips.length > 0 && chips.every((chip) => getComputedStyle(chip).textTransform === "none") ? "none" : "other",
      chipText: chips.map((chip) => chip.textContent.trim()).join(","),
    };
  });
  emit("decodable_sentence", data.sentence);
  emit("sentence_text_transform", data.sentenceTransform);
  emit("chips_text_transform", data.chipsTransform);
  emit("chips", data.chips);
  emit("chip_words", data.chipText);
  row(3, caseVerdict(data), `decodable_sentence=${JSON.stringify(data.sentence)} chips=${data.chips}`);
} catch (error) {
  row(3, false, `the decodable row raises an error: ${String(error).slice(0, 160)}`);
}

// Row 4: the reader word gaps are even, the Next button is the filled target, and the page
// count follows the turn, at phone, tablet, and phone landscape.
try {
  await signIn(page, "/th/st/2/1");
  const viewports = [
    { name: "phone", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "landscape", width: 844, height: 390 },
  ];
  const gaps = [];
  let pagesMeasured = 0;
  let wordsMin = 999;
  let pairsMin = 999;
  let gapMaxDelta = 0;
  let nextBg = true;
  let nextMinHeight = 999;
  let audioBg = true;
  let countOk = true;
  let overflow = 0;
  function record(measured) {
    pagesMeasured += 1;
    gaps.push(...measured.gaps);
    wordsMin = Math.min(wordsMin, measured.words);
    pairsMin = Math.min(pairsMin, measured.gaps.length);
    if (measured.gaps.length > 0) {
      gapMaxDelta = Math.max(gapMaxDelta, Math.max(...measured.gaps) - Math.min(...measured.gaps));
    }
    nextBg = nextBg && measured.nextBg;
    nextMinHeight = Math.min(nextMinHeight, measured.nextHeight);
    audioBg = audioBg && measured.audioBg;
    countOk = countOk && measured.count === (pagesMeasured % 2 === 1 ? "1 / 8" : "2 / 8");
    overflow += measured.overflow;
  }
  for (const locale of ["th", "en"]) {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${base}/${locale}/st/2/1?part=book`, { waitUntil: "load" });
      await page.waitForSelector("[data-word]", { timeout: 20000 });
      await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, { timeout: 20000 }).catch(() => {});
      const first = await measureReader(page);
      record(first);
      await page.click('button:has-text("→")');
      await page.waitForFunction(
        () => {
          const element = document.querySelector('span[aria-live="polite"]');
          return element !== null && element.textContent.trim() === "2 / 8";
        },
        undefined,
        { timeout: 20000 },
      );
      const second = await measureReader(page);
      record(second);
    }
  }
  const gapDelta = Math.round(gapMaxDelta * 10) / 10;
  const verdict = { pagesMeasured, wordsMin, pairsMin, gapDelta, nextBg, nextMinHeight, audioBg, countOk, overflow };
  emit("pages_measured", pagesMeasured);
  emit("words_min", wordsMin);
  emit("gap_pairs_min", pairsMin);
  emit("gap_max_delta_px", gapDelta);
  emit("next_bg_transparent", nextBg ? 0 : 1);
  emit("next_min_height", nextMinHeight);
  emit("audio_bg_filled", audioBg ? 1 : 0);
  emit("page_count_ok", countOk ? 1 : 0);
  emit("page_overflow", overflow);
  row(4, readerVerdict(verdict), `pages_measured=${pagesMeasured} gap_max_delta_px=${gapDelta} next_min_height=${nextMinHeight}`);
} catch (error) {
  row(4, false, `the reader row raises an error: ${String(error).slice(0, 160)}`);
}

// Row 5: the song stage holds the poster before any play. The row does not play the video and
// makes no phone claim.
try {
  await signIn(page, "/th/st/2/1");
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = [];
  const onConsole = (message) => { if (message.type() === "error") consoleErrors.push(message.text()); };
  page.on("console", onConsole);
  await page.goto(`${base}/th/st/2/1?part=song`, { waitUntil: "load" });
  await page.waitForSelector(".song-stage video", { timeout: 20000 });
  await page.waitForFunction(
    () => {
      const stage = document.querySelector(".song-stage");
      return stage !== null && getComputedStyle(stage).backgroundImage !== "none";
    },
    undefined,
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(1200);
  const data = await page.evaluate(() => {
    const video = document.querySelector(".song-stage video");
    const stage = document.querySelector(".song-stage");
    return {
      preload: video ? video.getAttribute("preload") : "",
      playsInline: video ? video.playsInline === true : false,
      poster: video ? (video.getAttribute("poster") ?? "") : "",
      stageBg: stage ? getComputedStyle(stage).backgroundImage : "none",
      played: video ? video.paused === false : true,
    };
  });
  page.off("console", onConsole);
  emit("video_preload", data.preload);
  emit("video_playsinline", data.playsInline ? 1 : 0);
  emit("video_poster", data.poster.length > 0 ? 1 : 0);
  emit("stage_background", data.stageBg !== "none" ? 1 : 0);
  emit("video_played", data.played ? 1 : 0);
  emit("song_console_errors", consoleErrors.length);
  emit("phone_claim", 0);
  if (consoleErrors.length > 0) emit("song_first_console_error", consoleErrors[0]);

  let posterStatus = 0;
  if (data.poster.length > 0) {
    const anonymous = await playwrightRequest.newContext();
    const poster = await anonymous.get(data.poster, { maxRedirects: 0 });
    await anonymous.dispose();
    posterStatus = poster.status();
    emit("poster_content_type", poster.headers()["content-type"] ?? "");
  }
  emit("poster_status", posterStatus);
  const verdict = {
    preload: data.preload,
    playsInline: data.playsInline,
    poster: data.poster.length > 0,
    stageBg: /song(-phone)?-poster\.(jpg|jpeg|png|webp)/.test(data.stageBg),
    posterStatus,
    consoleErrors: consoleErrors.length,
    played: data.played,
  };
  row(5, songVerdict(verdict), `video_preload=${data.preload} stage_background=${verdict.stageBg ? 1 : 0} poster_status=${posterStatus}`);
} catch (error) {
  row(5, false, `the song row raises an error: ${String(error).slice(0, 160)}`);
}

console.log(`row_count=${rowCount}`);
await browser.close();
NODE
if (cd "$APP" && node "$PLAYWRIGHT" "http://localhost:$APP_PORT" "$TMP_DIR/accounts/sign-in-cards.csv" >"$TMP_DIR/playwright.log" 2>&1); then
  :
fi
cat "$TMP_DIR/playwright.log"
if grep -qE '^FAIL: ' "$TMP_DIR/playwright.log"; then FAILED=1; fi
if grep -qE '^PASS: ' "$TMP_DIR/playwright.log"; then
  while IFS= read -r line; do RESULTS+=("$line"); done < <(grep -E '^(PASS|FAIL): ' "$TMP_DIR/playwright.log")
fi
LOG_PASS=$(grep -cE '^PASS: ' "$TMP_DIR/playwright.log" || true)
LOG_FAIL=$(grep -cE '^FAIL: ' "$TMP_DIR/playwright.log" || true)
PASS_COUNT=$((PASS_COUNT + LOG_PASS))
FAIL_COUNT=$((FAIL_COUNT + LOG_FAIL))
ROWS=$(grep -cE '^(PASS|FAIL): row [0-9]+ ' "$TMP_DIR/playwright.log" || true)
if [ "$ROWS" -gt 0 ]; then
  pass "The browser rows ran (rows=$ROWS)"
else
  fail "The browser rows did not run (rows=0)"
fi
if [ "$ROWS" -ne 5 ]; then fail "The browser rows must be 5, counted $ROWS"; fi

echo "=== The requests of the stand-in for the storage ==="
echo "standin_requests=$(grep -c '^REQ ' "$TMP_DIR/stand-in.log" 2>/dev/null || echo 0)"
echo "standin_206=$(grep -c 'status=206' "$TMP_DIR/stand-in.log" 2>/dev/null || echo 0)"

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
