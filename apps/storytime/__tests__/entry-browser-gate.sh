#!/usr/bin/env bash
set -uo pipefail

# The browser gate of the entry redesign (Phase 4, task 4.1, spec FR-A71, AC-A71.1 and AC-A71.5
# to AC-A71.8).
#
# The gate runs the real app against a local database and a local account that live for one
# run. Playwright opens the sign-in page and the join page signed out at 390, 980, and 1280 px,
# checks the logo, the art, the two-column shell, the thumb-size controls, the password toggle,
# the wrong-password flow, and the join tiles and buttons, and writes 12 full-page screenshots
# to a scratch folder under ~/.cache/opencode/ (not committed). No password is printed.
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
TMP_DIR="$(mktemp -d -t storytime-entry-gate-XXXXXX)"
CONTAINER="storytime-entry-gate-$$"
SERVER_PID=""
SERVER_PGID=""
SERVER_PORT=""
PLAYWRIGHT="$APP/.next/entry-browser-gate-$$.mjs"
SHOT_DIR="${HOME}/.cache/opencode/storytime-entry-gate-$$"

# Stops the whole process group of one process and waits for its port to close.
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
  podman rm -f -v "$CONTAINER" >/dev/null 2>&1 || true
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

echo "=== Seed one family account of the gate ==="
mkdir -p "$TMP_DIR/accounts"
cat > "$TMP_DIR/accounts/accounts.csv" <<'CSV'
name,class,role
Gate Family,gate-family,family
CSV
if (cd "$ROOT" && STORYTIME_DATABASE_URL="$DB_URL" ./node_modules/.bin/tsx apps/storytime/scripts/make-accounts.ts --folder "$TMP_DIR/accounts" --database-url-env STORYTIME_DATABASE_URL >"$TMP_DIR/accounts.log" 2>&1); then
  pass "The account script exits 0"
else
  fail "The account script fails"
fi
GATE_USER="$(awk -F',' 'NR==2 {print $1}' "$TMP_DIR/accounts/sign-in-cards.csv" 2>/dev/null || true)"
GATE_PASSWORD="$(awk -F',' 'NR==2 {print $2}' "$TMP_DIR/accounts/sign-in-cards.csv" 2>/dev/null || true)"
if [ -n "${GATE_USER:-}" ] && [ -n "${GATE_PASSWORD:-}" ]; then
  pass "The gate account card exists"
else
  fail "The gate account card is missing"
fi

echo "=== Build the app (retry once on the known Next.js security-notice stop) ==="
BUILD_OK=1
if (cd "$APP" && ../../node_modules/.bin/next build >"$TMP_DIR/build.log" 2>&1); then
  echo "build_attempt_1=0"
else
  echo "build_attempt_1=1"
  tail -5 "$TMP_DIR/build.log" || true
  if (cd "$APP" && ../../node_modules/.bin/next build >"$TMP_DIR/build-2.log" 2>&1); then
    echo "build_attempt_2=0"
  else
    BUILD_OK=0
    echo "build_attempt_2=1"
    tail -20 "$TMP_DIR/build-2.log" || true
  fi
fi
if [ "$BUILD_OK" -eq 1 ]; then
  pass "The production build exits 0"
else
  fail "The production build fails"
fi

echo "=== Start next start on a free 127.0.0.1 port ==="
APP_PORT="$(free_port)"
setsid bash -c "echo \$\$ > '$TMP_DIR/server.pid'; cd '$APP' && STORYTIME_DATABASE_URL='$DB_URL' \
  STORYTIME_MEDIA_BASE='gs://storytime-app-media' \
  STORYTIME_STORAGE_ENDPOINT='http://127.0.0.1:1' \
  STORYTIME_STORAGE_ACCESS_KEY='local-access-key' \
  STORYTIME_STORAGE_SECRET_KEY='local-secret-key' \
  exec ../../node_modules/.bin/next start -p '$APP_PORT' > '$TMP_DIR/next-start.log' 2>&1" &
SERVER_PID=$!
SERVER_PGID=$(ps -o pgid= -p "$SERVER_PID" 2>/dev/null | tr -d ' ' || echo "$SERVER_PID")
SERVER_PORT="$APP_PORT"
APP_UP=0
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://localhost:$APP_PORT/th/join"; then APP_UP=1; break; fi
  sleep 2
done
if [ "$APP_UP" -eq 1 ]; then pass "The app answers on the local port"; else fail "The app does not answer"; fi

mkdir -p "$SHOT_DIR"
cat > "$PLAYWRIGHT" <<'NODE'
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const base = process.argv[2];
const shots = process.argv[3];
const user = process.argv[4];
const locales = ['th', 'en'];
const widths = [
  { name: '390', width: 390, height: 844 },
  { name: '980', width: 980, height: 800 },
  { name: '1280', width: 1280, height: 800 },
];
const results = [];
const pass = (name) => results.push(`PASS: ${name}`);
const fail = (name, detail) => results.push(`FAIL: ${name}${detail ? ` (${detail})` : ''}`);
let failed = 0;
const check = (ok, name, detail) => { if (ok) pass(name); else { fail(name, detail); failed = 1; } };

const browser = await chromium.launch();
try {
  for (const locale of locales) {
    for (const view of widths) {
      const context = await browser.newContext({ viewport: { width: view.width, height: view.height } });
      const page = await context.newPage();
      const mediaRequests = [];
      page.on('request', (request) => {
        const url = request.url();
        let pathname = '';
        try { pathname = new URL(url).pathname; } catch { pathname = url; }
        if (pathname.startsWith('/_next/static/')) return;
        if (/\/media\//.test(pathname) || /storage\.google/.test(url) || /amazonaws\.com/.test(url) || /[?&](X-Amz-Signature|Signature|signature|Expires)=/i.test(url)) mediaRequests.push(url);
      });

      // B1: the logo and the art decode and answer 200 with no cookie.
      const signIn = await page.goto(`${base}/${locale}/sign-in`, { waitUntil: 'networkidle' });
      check(signIn?.status() === 200, `B1 ${locale} ${view.name} sign-in answers 200`, `status=${signIn?.status()}`);
      const logo = page.locator('img[data-entry-logo]').first();
      check((await logo.count()) === 1, `B1 ${locale} ${view.name} one entry logo`, `count=${await logo.count()}`);
      const logoBox = (await logo.count()) ? await logo.boundingBox() : null;
      const logoSrc = (await logo.count()) ? await logo.getAttribute('src') : '';
      const logoOk = logoSrc ? (await page.evaluate((src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0);
        img.onerror = () => resolve(false);
        img.src = src;
      }), new URL(logoSrc, base).toString())) : false;
      check(logoOk, `B1 ${locale} ${view.name} logo decodes`, `src=${logoSrc}`);
      const art = page.locator('picture[data-entry-art] img').first();
      const artOk = (await art.count()) ? await art.evaluate((node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0) : false;
      check(artOk, `B1 ${locale} ${view.name} art decodes`, `found=${await art.count()}`);
      const artSrc = (await art.count()) ? await art.getAttribute('src') : '';
      let artStatus = 0;
      if (artSrc) {
        const response = await page.request.get(new URL(artSrc, base).toString());
        artStatus = response.status();
      }
      check(artStatus === 200, `B1 ${locale} ${view.name} art answers 200 with no cookie`, `status=${artStatus}`);
      check(mediaRequests.length === 0, `B1 ${locale} ${view.name} no media or storage request`, `requests=${mediaRequests.length}`);

      // B2/B3/B4: the shell geometry at each width.
      const shell = page.locator('[data-entry-shell]').first();
      const shellBox = (await shell.count()) ? await shell.boundingBox() : null;
      const card = page.locator('form[action="/api/auth/sign-in"]').first();
      const cardBox = (await card.count()) ? await card.boundingBox() : null;
      const artBox = (await art.count()) ? await art.boundingBox() : null;
      const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
      if (view.name === '1280') {
        const leftOf = !!artBox && !!cardBox && artBox.x + artBox.width <= cardBox.x + 2;
        check(leftOf, `B2 ${locale} art left of card`, `art=${JSON.stringify(artBox)} card=${JSON.stringify(cardBox)}`);
        const width = shellBox ? shellBox.width : 0;
        check(width <= 1042 && width >= 900, `B2 ${locale} shell at most 1042 px wide`, `width=${width}`);
        const gapLeft = shellBox ? shellBox.x : 0;
        const gapRight = shellBox ? view.width - (shellBox.x + shellBox.width) : 0;
        check(Math.abs(gapLeft - gapRight) <= 2, `B2 ${locale} shell centred`, `left=${gapLeft} right=${gapRight}`);
        check(noScroll, `B2 ${locale} no horizontal scroll`, `scrollWidth exceeds clientWidth`);
      }
      if (view.name === '390') {
        const above = !!artBox && !!cardBox && artBox.y + artBox.height <= cardBox.y + 2;
        check(above, `B3 ${locale} art strip above card`, `art=${JSON.stringify(artBox)} card=${JSON.stringify(cardBox)}`);
        const strip = artBox ? artBox.height : 0;
        check(strip >= 160 && strip <= 280, `B3 ${locale} strip 160 to 280 px high`, `height=${strip}`);
        check(noScroll, `B3 ${locale} no horizontal scroll`, `scrollWidth exceeds clientWidth`);
      }
      if (view.name === '980') {
        const twoCol = await page.evaluate(() => {
          const shell = document.querySelector('[data-entry-shell]');
          if (!shell) return 'missing';
          const style = getComputedStyle(shell);
          return `${style.display} ${style.gridTemplateColumns}`;
        });
        check(/^grid\s+\S+\s+\S+/.test(twoCol), `B4 ${locale} two columns at 980`, `display=${twoCol}`);
        check(noScroll, `B4 ${locale} no horizontal scroll`, `scrollWidth exceeds clientWidth`);
      }

      // B5: the label size, the input height, and the submit width.
      const labelPx = await page.evaluate(() => {
        const label = document.querySelector('label[for="username"]');
        return label ? Number.parseFloat(getComputedStyle(label).fontSize) : 0;
      });
      check(labelPx >= 18, `B5 ${locale} ${view.name} label 18 px or more`, `size=${labelPx}`);
      const inputPx = await page.evaluate(() => {
        const input = document.querySelector('input[name="username"]');
        return input ? input.getBoundingClientRect().height : 0;
      });
      check(inputPx >= 56, `B5 ${locale} ${view.name} input 56 px or more`, `height=${inputPx}`);
      const widthsOk = await page.evaluate(() => {
        const submit = document.querySelector('button[data-entry-primary]');
        const form = document.querySelector('form[action="/api/auth/sign-in"]');
        if (!submit || !form) return 'missing';
        const formStyle = getComputedStyle(form);
        const content = form.clientWidth - Number.parseFloat(formStyle.paddingLeft) - Number.parseFloat(formStyle.paddingRight);
        return `${submit.getBoundingClientRect().width} ${content}`;
      });
      const [submitWidth, contentWidth] = String(widthsOk).split(' ').map(Number);
      check(Number.isFinite(submitWidth) && Math.abs(submitWidth - contentWidth) <= 2, `B5 ${locale} ${view.name} submit as wide as card`, `submit=${submitWidth} content=${contentWidth}`);

      // B6: the password toggle flips the field type.
      const toggle = page.locator('button[data-password-toggle]').first();
      check((await toggle.count()) === 1, `B6 ${locale} ${view.name} toggle exists`, `count=${await toggle.count()}`);
      if (await toggle.count()) {
        const before = await page.getAttribute('input[name="password"]', 'type');
        await toggle.click();
        const after = await page.getAttribute('input[name="password"]', 'type');
        check(before === 'password' && after === 'text', `B6 ${locale} ${view.name} toggle flips the type`, `before=${before} after=${after}`);
        const pressed = await toggle.getAttribute('aria-pressed');
        check(pressed === 'true', `B6 ${locale} ${view.name} toggle presses`, `aria-pressed=${pressed}`);
      }

      // B7: a wrong password shows the alert inside the card and keeps the username.
      await page.goto(`${base}/${locale}/sign-in`, { waitUntil: 'networkidle' });
      const primaryCount = await page.locator('button[data-entry-primary]').count();
      check(primaryCount === 1, `B7 ${locale} ${view.name} primary button exists`, `count=${primaryCount}`);
      if (primaryCount === 1) {
        await page.fill('input[name="username"]', user);
        await page.fill('input[name="password"]', 'wrong-password-1');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
          page.locator('button[data-entry-primary]').click(),
        ]);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForSelector('form[action="/api/auth/sign-in"] input[name="username"]', { timeout: 15000 }).catch(() => {});
        const alertInCard = await page.evaluate(() => {
          const form = document.querySelector('form[action="/api/auth/sign-in"]');
          const alert = form ? form.querySelector('[role="alert"]') : null;
          const field = form ? form.querySelector('input[name="username"]') : null;
          if (!alert || !field) return 'missing';
          const alertRect = alert.getBoundingClientRect();
          const fieldRect = field.getBoundingClientRect();
          return alertRect.bottom <= fieldRect.top + 2 ? 'before' : 'after';
        });
        check(alertInCard === 'before', `B7 ${locale} ${view.name} alert inside card before field`, `position=${alertInCard}`);
        const kept = await page.$eval('input[name="username"]', (node) => node.value).catch(() => '');
        check(kept === user, `B7 ${locale} ${view.name} username kept`, `value=${kept}`);
      } else {
        check(false, `B7 ${locale} ${view.name} alert inside card before field`, 'no primary button');
        check(false, `B7 ${locale} ${view.name} username kept`, 'no primary button');
      }

      // B8: the join page at the same width.
      const join = await page.goto(`${base}/${locale}/join`, { waitUntil: 'networkidle' });
      check(join?.status() === 200, `B8 ${locale} ${view.name} join answers 200`, `status=${join?.status()}`);
      const tiles = await page.locator('[data-join-tile]').count();
      check(tiles === 5, `B8 ${locale} ${view.name} five tiles`, `tiles=${tiles}`);
      const contactCount = await page.locator('a[data-contact]').count();
      check(contactCount === 3, `B8 ${locale} ${view.name} three contact buttons`, `buttons=${contactCount}`);
      const lineHref = await page.locator('a[data-contact="line"]').getAttribute('href').catch(() => '');
      check(lineHref === 'https://line.me/ti/p/Pf7_EF98Pv', `B8 ${locale} ${view.name} LINE target`, `href=${lineHref}`);
      const phoneHref = await page.locator('a[data-contact="phone"]').getAttribute('href').catch(() => '');
      check(phoneHref === 'tel:+66990058038', `B8 ${locale} ${view.name} phone target`, `href=${phoneHref}`);
      const emailHref = await page.locator('a[data-contact="email"]').getAttribute('href').catch(() => '');
      check(emailHref === 'mailto:support@reading-advantage.com', `B8 ${locale} ${view.name} email target`, `href=${emailHref}`);
      const innerText = await page.evaluate(() => document.documentElement.scrollWidth && document.body.innerText);
      check(!/https?:\/\//.test(innerText), `B8 ${locale} ${view.name} no raw URL in text`, 'raw URL shown');
      const buttonHeights = await page.evaluate(() => [...document.querySelectorAll('a[data-contact]')].map((node) => node.getBoundingClientRect().height));
      check(buttonHeights.length === 3, `B8 ${locale} ${view.name} three measured buttons`, `measured=${buttonHeights.length}`);
      const shortButtons = buttonHeights.filter((height) => height < 48).length;
      check(shortButtons === 0, `B8 ${locale} ${view.name} contact buttons 48 px or more`, `short=${shortButtons}`);
      const siteHref = await page.locator('a[data-contact-site]').getAttribute('href').catch(() => '');
      check(siteHref === 'https://www.reading-advantage.com/contact', `B8 ${locale} ${view.name} site link target`, `href=${siteHref}`);
      const siteShape = await page.evaluate(() => {
        const site = document.querySelector('a[data-contact-site]');
        if (!site) return 'missing';
        const buttons = [...document.querySelectorAll('a[data-contact]')];
        if (buttons.length === 0) return 'no-buttons';
        const minButton = Math.min(...buttons.map((node) => node.getBoundingClientRect().height));
        return `${site.getBoundingClientRect().height} ${minButton} ${site.textContent ?? ''}`;
      });
      const [siteHeightText, minButtonText, ...siteTextParts] = String(siteShape).split(' ');
      const siteHeight = Number(siteHeightText);
      const minButton = Number(minButtonText);
      check(Number.isFinite(siteHeight) && siteHeight < minButton, `B8 ${locale} ${view.name} site link smaller than buttons`, `site=${siteHeight} minButton=${minButton}`);
      check(!/https?:\/\//.test(siteTextParts.join(' ')), `B8 ${locale} ${view.name} site label shows no URL`, 'raw URL shown');
      const joinScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
      check(joinScroll, `B8 ${locale} ${view.name} join has no horizontal scroll`, 'scrolls sideways');

      // B9: the screenshots of this locale and width.
      const signShot = `${shots}/${locale}-sign-in-${view.name}.png`;
      const joinShot = `${shots}/${locale}-join-${view.name}.png`;
      await page.goto(`${base}/${locale}/sign-in`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: signShot, fullPage: true });
      await page.goto(`${base}/${locale}/join`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: joinShot, fullPage: true });
      check(fs.existsSync(signShot) && fs.existsSync(joinShot), `B9 ${locale} ${view.name} two screenshots`, `dir=${shots}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

for (const line of results) console.log(line);
const shotFiles = fs.readdirSync(process.argv[3]).filter((name) => name.endsWith('.png'));
console.log(`screenshots=${shotFiles.length}`);
console.log(`=== Total: ${results.length} checks (PASS=${results.filter((line) => line.startsWith('PASS')).length}, FAIL=${results.filter((line) => line.startsWith('FAIL')).length}) ===`);
process.exit(failed);
NODE

echo "=== Run the Playwright rows B1 to B9 ==="
if (cd "$APP" && node "$PLAYWRIGHT" "http://localhost:$APP_PORT" "$SHOT_DIR" "$GATE_USER" >"$TMP_DIR/playwright.log" 2>&1); then
  pass "The Playwright run exits 0"
else
  fail "The Playwright run exits non-zero"
fi
grep -E "^(PASS|FAIL): B[0-9]" "$TMP_DIR/playwright.log" || true
echo "--- playwright tail (debug, exit above is the gate verdict) ---"
tail -25 "$TMP_DIR/playwright.log" || true
echo "--- end playwright tail ---"
SCREENSHOTS="$(grep -oE 'screenshots=[0-9]+' "$TMP_DIR/playwright.log" | tail -1 || true)"
echo "${SCREENSHOTS:-screenshots=0}"
grep -E "FAIL: " "$TMP_DIR/playwright.log" | head -30 || true

printf '%s\n' "${RESULTS[@]}"
echo "=== Total: $((PASS_COUNT + FAIL_COUNT)) checks (PASS=$PASS_COUNT, FAIL=$FAIL_COUNT) ==="
exit "$FAILED"
