// Lane B Phase 5: 25 seeded students sign in through all three paths (local QA only).
// Env: QA_PASS (teacher password), CLASS_ID, EVIDENCE (dir for screenshots), STEPS
// (setup,shots,students,extra), STATE_DIR (default: OS temp dir). Prints no secrets.
// Needs a Primary dev server on :3100 and the seed in seed-login25.sql.
import { chromium } from "/home/daniebo/Desktop/rama-worktrees/lane-a/node_modules/playwright-core/index.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

const BASE = "http://localhost:3100";
const CLASS_ID = process.env.CLASS_ID;
const EVIDENCE = process.env.EVIDENCE;
const STEPS = (process.env.STEPS ?? "setup,students,extra").split(",");
// The state file holds one-time codes, passwords, and card tokens: keep it out of the repo.
const WORK = process.env.STATE_DIR ?? tmpdir();
const STATE = `${WORK}/login25-state.json`;
mkdirSync(EVIDENCE, { recursive: true });
const PICTURE_LABELS = ["red circle", "blue square", "green triangle", "yellow star", "pink heart", "orange diamond", "purple moon", "gray cloud", "light blue drop", "black lightning", "brown hexagon", "teal flower"];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/home/daniebo/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
});
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const results = { paths: { picture: [], qr: [], password: [] }, checks: {}, errors: [] };

/** New context + page that records student-login API responses and page errors. */
async function newPage(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const api = {};
  page.on("response", async (r) => {
    const u = new URL(r.url());
    if (!u.pathname.startsWith("/api/auth/")) return;
    api[u.pathname] = { status: r.status(), body: await r.json().catch(() => null), cache: r.headers()["cache-control"] };
  });
  page.on("pageerror", (e) => results.errors.push(`pageerror ${page.url()}: ${e.message.slice(0, 160)}`));
  return { context, page, api };
}

async function waitApi(api, path, timeout = 120000) {
  const t0 = Date.now();
  while (!api[path]) {
    if (Date.now() - t0 > timeout) throw new Error(`no response from ${path}`);
    await new Promise((r) => setTimeout(r, 200));
  }
  const v = api[path];
  delete api[path];
  return v;
}

async function staffLogin(page) {
  await page.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
  await page.getByRole("tab", { name: "Teacher" }).click();
  await page.getByLabel("Username").fill("qa-teacher-a");
  await page.getByLabel(/^Password/).fill(process.env.QA_PASS);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/auth/signin"), { timeout: 120000 });
}

// The student home moved to /student/home in the UX rework (Lane C); /student/read was the home before.
const atHome = (page) => page.waitForURL((u) => u.pathname === "/en/student/home" || u.pathname === "/en/student/read", { timeout: 240000 });

async function studentPicture(code, name, pictures, viewport) {
  const { context, page, api } = await newPage(viewport);
  const t0 = Date.now();
  await page.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
  await page.getByLabel("Class code").fill(code);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name, exact: true }).click({ timeout: 60000 });
  for (const p of pictures) await page.getByRole("button", { name: PICTURE_LABELS[p], exact: true }).click();
  await atHome(page);
  const res = api["/api/auth/student/picture"];
  return { context, page, ms: Date.now() - t0, status: res?.status, strength: res?.body?.authStrength, cache: res?.cache };
}

async function studentQr(token) {
  const { context, page, api } = await newPage();
  const t0 = Date.now();
  await page.goto(`${BASE}/en/auth/card#${token}`, { waitUntil: "load", timeout: 240000 });
  await atHome(page);
  const res = api["/api/auth/student/qr"];
  return { context, page, ms: Date.now() - t0, status: res?.status, strength: res?.body?.authStrength };
}

async function studentPassword(username, password) {
  const { context, page, api } = await newPage();
  const t0 = Date.now();
  await page.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
  await page.getByRole("button", { name: "Sign in with username and password" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await atHome(page);
  const res = api["/api/auth/login"];
  return { context, page, ms: Date.now() - t0, status: res?.status };
}

/** True when the page's session still opens the student home. */
async function stillSignedIn(page) {
  await page.goto(`${BASE}/en/student/read`, { waitUntil: "load", timeout: 240000 });
  return new URL(page.url()).pathname === "/en/student/read";
}

let state = {};
try {
  if (STEPS.includes("setup")) {
    const { context, page, api } = await newPage();
    await staffLogin(page);
    log("teacher signed in");
    await page.goto(`${BASE}/en/teacher/class-roster/${CLASS_ID}`, { waitUntil: "load", timeout: 240000 });
    await page.getByRole("button", { name: "Start class" }).waitFor({ timeout: 180000 });
    const assignBtn = page.getByRole("button", { name: /Give picture passwords/ });
    let assigned = [];
    if (await assignBtn.count()) {
      await assignBtn.click();
      assigned = (await waitApi(api, "/api/auth/student/picture-password/assign")).body;
    }
    log("pictures assigned", Array.isArray(assigned) ? assigned.length : assigned);
    await page.keyboard.press("Escape").catch(() => {});
    await page.getByRole("button", { name: "Start class" }).click();
    const start = await waitApi(api, "/api/auth/student/class-session/start");
    results.checks.startNoStore = start.cache;
    await page.screenshot({ path: `${EVIDENCE}/teacher-class-panel-1280.png`, fullPage: false });
    await page.goto(`${BASE}/en/teacher/class-roster/${CLASS_ID}/class-sheet`, { waitUntil: "load", timeout: 240000 });
    await page.getByRole("button", { name: "Make class sheet" }).click({ timeout: 180000 });
    await page.getByRole("button", { name: "Set new passwords" }).click();
    const sheet = (await waitApi(api, "/api/auth/student/class-passwords/reset")).body;
    log("class sheet rows", sheet.students.length, "failed", sheet.failed.length);
    await page.goto(`${BASE}/en/teacher/class-roster/${CLASS_ID}/qr-cards`, { waitUntil: "load", timeout: 240000 });
    await page.getByRole("button", { name: /Make cards for/ }).click({ timeout: 180000 });
    const cards = (await waitApi(api, "/api/auth/student/card-token/issue")).body.cards;
    log("cards", cards.length);
    state = { code: start.body.code, assigned, sheet: sheet.students, cards };
    writeFileSync(STATE, JSON.stringify(state));
    await context.close();
  } else {
    state = JSON.parse((await import("node:fs")).readFileSync(STATE, "utf8"));
  }

  if (STEPS.includes("shots")) {
    // 375 px phone and 768 px tablet screenshots of each new student screen (no sign-in).
    for (const [w, h] of [[375, 812], [768, 1024]]) {
      const { context, page } = await newPage({ width: w, height: h });
      await page.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
      await page.getByLabel("Class code").waitFor({ timeout: 120000 });
      await page.screenshot({ path: `${EVIDENCE}/student-code-${w}.png` });
      await page.getByLabel("Class code").fill(state.code);
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("heading", { name: "Who are you?" }).waitFor({ timeout: 60000 });
      await page.screenshot({ path: `${EVIDENCE}/student-names-${w}.png` });
      await page.getByRole("button", { name: state.assigned[0].name, exact: true }).click();
      await page.getByText("0 of 3 pictures").waitFor({ timeout: 30000 });
      await page.screenshot({ path: `${EVIDENCE}/student-pictures-${w}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const small = await page.evaluate(() => [...document.querySelectorAll("main button, main a, main input")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.height < 47.5 || r.width < 47.5); }).map((el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30)));
      results.checks[`layout${w}`] = { horizontalOverflow: overflow, under48px: small };
      await page.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
      await page.getByRole("button", { name: "Sign in with username and password" }).click();
      await page.screenshot({ path: `${EVIDENCE}/student-password-${w}.png` });
      await page.goto(`${BASE}/en/auth/card`, { waitUntil: "load", timeout: 240000 });
      await page.getByRole("alert").waitFor({ timeout: 60000 }).catch(() => {});
      await page.screenshot({ path: `${EVIDENCE}/student-card-missing-${w}.png` });
      await page.goto(`${BASE}/th/auth/signin`, { waitUntil: "load", timeout: 240000 });
      await page.screenshot({ path: `${EVIDENCE}/student-code-th-${w}.png` });
      await context.close();
    }
    log("screenshots done");
  }

  if (STEPS.includes("students")) {
    const byUser = new Map();
    for (const a of state.assigned) byUser.set(a.userId, { name: a.name, pictures: a.pictures });
    for (const s of state.sheet) Object.assign(byUser.get(s.userId) ?? byUser.set(s.userId, {}).get(s.userId), { username: s.username, password: s.password, name: s.name });
    for (const c of state.cards) Object.assign(byUser.get(c.userId), { token: c.token });
    const students = [...byUser.values()].slice(0, Number(process.env.LIMIT ?? 25));
    log("students", students.length);
    let i = 0;
    for (const s of students) {
      i++;
      const a = await studentPicture(state.code, s.name, s.pictures);
      results.paths.picture.push({ ms: a.ms, status: a.status, strength: a.strength });
      const b = await studentQr(s.token);
      results.paths.qr.push({ ms: b.ms, status: b.status, strength: b.strength });
      const c = await studentPassword(s.username, s.password);
      results.paths.password.push({ ms: c.ms, status: c.status });
      if (i === 1) {
        // One session per student: the newest sign-in ends the older ones.
        results.checks.singleSession = { pictureCtx: await stillSignedIn(a.page), qrCtx: await stillSignedIn(b.page), passwordCtx: await stillSignedIn(c.page) };
        results.checks.pictureNoStore = a.cache;
      }
      await a.context.close();
      await b.context.close();
      await c.context.close();
      log(`student ${i} ok`, a.ms, b.ms, c.ms);
    }
    writeFileSync(STATE, JSON.stringify(state));
  }

  if (STEPS.includes("extra")) {
    const { context, page, api } = await newPage();
    await staffLogin(page);
    await page.goto(`${BASE}/en/teacher/class-roster/${CLASS_ID}`, { waitUntil: "load", timeout: 240000 });
    await page.getByText(/of 25 signed in/).waitFor({ timeout: 180000 });
    results.checks.rosterSummary = await page.getByText(/of 25 signed in/).first().innerText();

    // Lockout: 5 wrong picture tries, teacher sees the lock, resets, the student signs in with the new pictures.
    const target = state.assigned[0];
    const wrong = target.pictures.map((p) => (p + 1) % 12);
    const { context: sctx, page: spage, api: sapi } = await newPage();
    await spage.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
    await page.getByRole("button", { name: "New code" }).click();
    const fresh = (await waitApi(api, "/api/auth/student/class-session/start")).body.code;
    await spage.getByLabel("Class code").fill(fresh);
    await spage.getByRole("button", { name: "Next" }).click();
    await spage.getByRole("button", { name: target.name, exact: true }).click({ timeout: 60000 });
    let lockText = "";
    for (let t = 0; t < 5; t++) {
      for (const p of wrong) await spage.getByRole("button", { name: PICTURE_LABELS[p], exact: true }).click();
      const r = await waitApi(sapi, "/api/auth/student/picture");
      lockText = `${r.status}`;
    }
    results.checks.lockoutStatus = lockText;
    results.checks.lockoutAlert = await spage.getByRole("alert").innerText().catch(() => "");
    await page.reload({ waitUntil: "load" });
    await page.getByText(/Locked,/).first().waitFor({ timeout: 30000 }).catch(() => {});
    results.checks.teacherSeesLock = (await page.getByText(/Locked,/).count()) > 0;
    await page.screenshot({ path: `${EVIDENCE}/teacher-roster-lockout-1280.png`, fullPage: true });
    await page.getByRole("button", { name: `Reset picture password for ${target.name}` }).click();
    const reset = (await waitApi(api, "/api/auth/student/picture-password/reset")).body;
    await page.keyboard.press("Escape").catch(() => {});
    await sctx.close();
    const again = await studentPicture(fresh, target.name, reset.pictures);
    results.checks.afterReset = { status: again.status, strength: again.strength };
    await again.context.close();

    // Code-only setting: off -> name tap signs in with code_only; then back on.
    await page.getByLabel("Picture password").click();
    await waitApi(api, "/api/auth/student/picture-password/setting");
    const { context: cctx, page: cpage, api: capi } = await newPage({ width: 375, height: 812 });
    await cpage.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
    await cpage.getByLabel("Class code").fill(fresh);
    await cpage.getByRole("button", { name: "Next" }).click();
    await cpage.getByRole("button", { name: state.assigned[1].name, exact: true }).click({ timeout: 60000 });
    await atHome(cpage);
    results.checks.codeOnly = capi["/api/auth/student/code-only"]?.body?.authStrength;
    await cctx.close();
    await page.getByLabel("Picture password").click();
    await waitApi(api, "/api/auth/student/picture-password/setting");

    // End class: the code stops working.
    await page.getByRole("button", { name: "End class" }).click();
    await waitApi(api, "/api/auth/student/class-session/end");
    const { context: ectx, page: epage, api: eapi } = await newPage();
    await epage.goto(`${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 240000 });
    await epage.getByLabel("Class code").fill(fresh);
    await epage.getByRole("button", { name: "Next" }).click();
    results.checks.endedCode = (await waitApi(eapi, "/api/auth/student/code")).status;
    await ectx.close();
    await context.close();
  }
} catch (e) {
  results.errors.push(`FATAL: ${e.message.slice(0, 300)}`);
}

const stats = (xs) => {
  const ms = xs.map((x) => x.ms).sort((a, b) => a - b);
  return ms.length ? { n: ms.length, ok: xs.filter((x) => x.status === 200).length, median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1] } : { n: 0 };
};
const summary = {
  picture: { ...stats(results.paths.picture), strengths: [...new Set(results.paths.picture.map((x) => x.strength))] },
  qr: { ...stats(results.paths.qr), strengths: [...new Set(results.paths.qr.map((x) => x.strength))] },
  password: stats(results.paths.password),
  checks: results.checks,
  errors: results.errors.slice(0, 20),
};
writeFileSync(`${WORK}/login25-result.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
