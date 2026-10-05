// Lane C gate sweep (local QA only): every route at 375/768/1280, overflow, console errors,
// small tap targets at 375, axe at 1280, full-page screenshots, keyboard walk-through.
import { chromium } from "/home/daniebo/Desktop/rama-worktrees/lane-de/node_modules/playwright-core/index.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://localhost:3100";
const OUT = process.env.OUT;
const PASS = process.env.QA_PASS;
const STEPS = (process.env.STEPS ?? "setup,routes,keyboard").split(",");
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync("/home/daniebo/Desktop/rama-worktrees/lane-de/node_modules/axe-core/axe.min.js", "utf8");
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const CLASS = "828838c2-322e-435a-84b5-539dab1594e8";
const STUDENT = "55271a44-5acd-4065-b1a9-11672a22eb55";
const ARTICLE = "577addb8-4fb2-4b60-adeb-d52236d2c4c2";
const ASSIGNMENT = "aaaaaaaa-0000-4000-8000-00000000000a";
const USERS = { student: "qa-student-a1", teacher: "qa-teacher-a", admin: "qa-admin-a", system: "qa-system" };

const browser = await chromium.launch({
  headless: true,
  executablePath: "/home/daniebo/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
});

const contexts = {};
// One context per role: a second sign-in of the same student ends the first session (Lane B
// one-active-session rule), so every width reuses the role's context and resizes the page.
async function ctx(role, viewport) {
  if (!contexts[role]) {
    const context = await browser.newContext({ viewport, locale: "en-US", reducedMotion: "reduce" });
    if (role !== "public") {
      const r = await context.request.post(`${BASE}/api/auth/login`, { data: { username: USERS[role], password: PASS }, timeout: 180000 });
      if (r.status() !== 200) throw new Error(`login ${role}: ${r.status()}`);
    }
    contexts[role] = context;
  }
  return contexts[role];
}

/** Waits until the page shows no skeleton or spinner in main, up to 20 s. */
async function settled(page) {
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"], main .animate-pulse, main [role="progressbar"], main .animate-spin'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
}

const state = { classBookId: process.env.CLASS_BOOK_ID ?? null };

if (STEPS.includes("setup")) {
  // Assign a workbook to QA Class A through the teacher UI (the real assign form).
  const context = await ctx("teacher", { width: 1280, height: 900 });
  const page = await context.newPage();
  await page.goto(`${BASE}/en/teacher/class-roster/${CLASS}`, { waitUntil: "load", timeout: 240000 });
  const existing = page.locator('a[href*="/books/"]').first();
  if (await existing.count()) {
    state.classBookId = (await existing.getAttribute("href")).match(/books\/([0-9a-f-]{36})/)?.[1] ?? null;
  } else {
    const select = page.locator('select[name="bookId"]');
    await select.waitFor({ timeout: 120000 });
    await select.selectOption({ label: /Origins 2/.source ? (await select.locator("option").allTextContents()).find((t) => /Origins 2/.test(t)) : "" });
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await page.locator('a[href*="/books/"]').first().waitFor({ timeout: 120000 });
    state.classBookId = (await page.locator('a[href*="/books/"]').first().getAttribute("href")).match(/books\/([0-9a-f-]{36})/)?.[1] ?? null;
  }
  await page.screenshot({ path: `${OUT}/setup-assign-1280.png`, fullPage: true });
  await page.close();
  log("classBookId", state.classBookId);
}
const CB = state.classBookId ?? "00000000-0000-4000-8000-000000000000";
const ROUTES = [
  ["public", "/"], ["public", "/about"], ["public", "/authors"], ["public", "/contact"], ["public", "/privacy-policy"], ["public", "/terms"],
  ["public", "/auth/signin"], ["public", "/auth/card"], ["public", "/auth/forgot-password"], ["public", "/auth/error"], ["public", "/unauthorized"], ["public", "/b/o2/1"],
  ["student", "/student/home"], ["student", "/student/read"], ["student", `/student/read/${ARTICLE}`], ["student", `/student/lesson/${ARTICLE}`],
  ["student", "/student/assignments"], ["student", "/student/vocabulary"], ["student", "/student/sentences"], ["student", "/student/games"],
  ["student", "/student/history"], ["student", "/student/reports"], ["student", `/student/books/${CB}`], ["student", "/settings/user-profile"], ["student", "/b/o2/1"],
  ["teacher", "/teacher/dashboard"], ["teacher", "/teacher/my-classes"], ["teacher", "/teacher/my-students"], ["teacher", "/teacher/class-roster"],
  ["teacher", `/teacher/class-roster/${CLASS}`], ["teacher", `/teacher/class-roster/${CLASS}/class-sheet`], ["teacher", `/teacher/class-roster/${CLASS}/enrollment`], ["teacher", `/teacher/class-roster/${CLASS}/qr-cards`],
  ["teacher", `/teacher/class-roster/${CLASS}/books/${CB}`], ["teacher", `/teacher/class-roster/${CLASS}/books/${CB}/progress`], ["teacher", `/teacher/class-roster/${CLASS}/books/${CB}/progress/${STUDENT}`],
  ["teacher", `/teacher/class-roster/${CLASS}/books/${CB}/lessons/1`], ["teacher", `/teacher/class-roster/${CLASS}/books/${CB}/lessons/1/projector`], ["teacher", `/teacher/class-roster/${CLASS}/books/${CB}/lessons/1/rehearsal`],
  ["teacher", "/teacher/assignments"], ["teacher", `/teacher/assignments/${ASSIGNMENT}`], ["teacher", "/teacher/reports"], ["teacher", `/teacher/student-progress/${STUDENT}`],
  ["teacher", "/teacher/game-challenges"], ["teacher", "/teacher/manual"], ["teacher", "/settings/user-profile"], ["teacher", "/settings/school-profile"], ["teacher", "/b/o2/1"],
  ["admin", "/admin"], ["admin", "/admin/dashboard"], ["admin", "/admin/dashboard/students"], ["admin", "/admin/dashboard/teachers"], ["admin", "/admin/students"], ["admin", "/admin/students/add"],
  ["admin", "/admin/students/classrooms"], ["admin", "/admin/teachers"], ["admin", "/admin/teachers/add"], ["admin", "/admin/article-creation"], ["admin", "/admin/import-data"],
  ["system", "/system/dashboard"], ["system", "/system/schools"], ["system", "/system/licenses"], ["system", "/system/licenses/create-licenses"],
];
const WIDTHS = [375, 768, 1280];
const slug = (role, route) => `${role}${route.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (id) => id.slice(0, 8)).replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "")}`;

const inventory = JSON.parse(process.env.MERGE ? readFileSync(`${OUT}/inventory.json`, "utf8") : "{}");
if (STEPS.includes("routes")) {
  for (const [role, route] of ROUTES) {
    if (ONLY && !ONLY.test(`${role} ${route}`)) continue;
    const id = slug(role, route);
    inventory[id] = inventory[id] ?? { role, route, widths: {} };
    for (const width of WIDTHS) {
      const context = await ctx(role, { width, height: width === 375 ? 812 : width === 768 ? 1024 : 900 });
      const page = await context.newPage();
      await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : 900 });
      const consoleErrors = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
      page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
      const t0 = Date.now();
      let status = null;
      try {
        const res = await page.goto(`${BASE}/en${route}`, { waitUntil: "load", timeout: 240000 });
        status = res?.status() ?? null;
        await settled(page);
      } catch (e) {
        inventory[id].widths[width] = { error: e.message.slice(0, 200) };
        await page.close();
        continue;
      }
      const facts = await page.evaluate((w) => {
        const main = document.querySelector("main");
        const rect = (el) => el.getBoundingClientRect();
        const docOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - w;
        const mainOverflow = main ? main.scrollWidth - main.clientWidth : 0;
        const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 40);
        const small = [];
        const targets = main ? main.querySelectorAll('a[href], button, [role="button"], [role="tab"], input:not([type=hidden]), select, textarea, [role="checkbox"], [role="switch"], [role="menuitem"]') : [];
        for (const el of targets) {
          const r = rect(el);
          if (r.width === 0 || r.height === 0) continue;
          if (r.height < 44 || r.width < 44) small.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)} "${name(el)}"`);
        }
        const h1 = document.querySelector("h1")?.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? null;
        const loading = !!document.querySelector('[aria-busy="true"], [data-loading], .animate-pulse, [role="progressbar"]');
        const texts = [...document.querySelectorAll("main *")].filter((el) => el.children.length === 0 && el.textContent.trim()).map((el) => el.textContent.trim());
        const rawKeys = texts.filter((t) => /^[A-Z][A-Za-z]+(\.[A-Za-z0-9_-]+){1,}$/.test(t)).slice(0, 5);
        const english = /\b(Loading|Error|Something went wrong|undefined|NaN|null)\b/;
        const suspicious = texts.filter((t) => english.test(t) || /\{\{|\}\}/.test(t)).slice(0, 5);
        return { docOverflow, mainOverflow, mainOverflowX: main ? getComputedStyle(main).overflowX : null, h1, loading, smallCount: small.length, small: small.slice(0, 8), rawKeys, suspicious, title: document.title, height: document.documentElement.scrollHeight };
      }, width);
      let axe = null;
      if (width === 1280 || width === 375) {
        try {
          await page.addScriptTag({ content: AXE });
          const r = await page.evaluate(async () => {
            const res = await window.axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
            return res.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.html?.slice(0, 120) }));
          });
          axe = r;
        } catch (e) { axe = [{ id: "axe-failed", impact: "n/a", nodes: 0, sample: e.message.slice(0, 100) }]; }
      }
      const shot = `${id}-${width}.png`;
      await page.screenshot({ path: `${OUT}/${shot}`, fullPage: true }).catch(() => {});
      inventory[id].widths[width] = { status, finalPath: new URL(page.url()).pathname, ms: Date.now() - t0, consoleErrors: [...new Set(consoleErrors)].slice(0, 6), ...facts, axe, shot };
      log(role, route, width, status, facts.docOverflow, facts.mainOverflow, `small=${facts.smallCount}`, `axe=${axe?.length ?? "-"}`, facts.loading ? "LOADING" : "");
      await page.close();
    }
    writeFileSync(`${OUT}/inventory.json`, JSON.stringify(inventory, null, 1));
  }
}

if (STEPS.includes("keyboard")) {
  const walk = async (role, route, width, tabs) => {
    const context = await ctx(role, { width, height: width === 375 ? 812 : 900 });
    const page = await context.newPage();
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto(`${BASE}/en${route}`, { waitUntil: "load", timeout: 240000 });
    await settled(page);
    const seq = [];
    for (let i = 0; i < tabs; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return { tag: "body" };
        const cs = getComputedStyle(el);
        const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
        const r = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), name: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40), ring, visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight, inMain: !!el.closest("main") };
      });
      seq.push(info);
      if (seq.length >= 3 && seq.slice(-3).every((s) => s.tag === "body")) break;
    }
    const result = { role, route, width, seq };
    // Skip link: first Tab, then Enter, focus should land in main.
    await page.goto(`${BASE}/en${route}`, { waitUntil: "load", timeout: 240000 });
    await settled(page);
    await page.keyboard.press("Tab");
    result.firstTab = seq[0];
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    result.afterSkip = await page.evaluate(() => { const el = document.activeElement; return { tag: el?.tagName.toLowerCase(), id: el?.id, inMain: !!el?.closest("main") || el?.tagName === "MAIN" }; });
    // Account menu through the keyboard: find the trigger by walking until a button whose name has the user name or "account".
    const trigger = page.getByRole("button", { name: /account|menu|qa-/i }).first();
    if (await trigger.count()) {
      await trigger.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
      result.accountMenu = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"], [role="menu"] a, [role="menu"] button')].map((e) => e.textContent.trim().slice(0, 30)));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      result.menuClosedByEscape = (await page.locator('[role="menu"]').count()) === 0;
    } else result.accountMenu = "no trigger found";
    await page.screenshot({ path: `${OUT}/keyboard-${role}-${width}.png` }).catch(() => {});
    await page.close();
    return result;
  };
  const keyboard = [];
  keyboard.push(await walk("student", "/student/home", 1280, 40));
  keyboard.push(await walk("student", "/student/home", 375, 30));
  keyboard.push(await walk("teacher", "/teacher/my-classes", 1280, 40));
  keyboard.push(await walk("teacher", `/teacher/class-roster/${CLASS}`, 1280, 60));
  keyboard.push(await walk("student", `/student/lesson/${ARTICLE}`, 1280, 30));
  writeFileSync(`${OUT}/keyboard.json`, JSON.stringify(keyboard, null, 1));
  log("keyboard done");
}
await browser.close();
log("done");
