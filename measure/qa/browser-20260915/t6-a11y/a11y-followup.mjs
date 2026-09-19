/**
 * T6 follow-up probes: tab sequences, signin focusability, canvas-normalized
 * contrast, Escape on visible disclosure, /en/student/read dashboard audit.
 * TEST-ONLY. View-only navigation only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const NAV_TIMEOUT = 120_000;
const out = {};
function save() { writeFileSync(join(HERE, "results-followup.json"), JSON.stringify(out, null, 2)); }

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });

// ---- A: full tab sequence on landing ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}
  await page.waitForTimeout(2000);
  const seq = [];
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      return `${a.tagName}[${(a.type || "").slice(0, 8)}] "${(a.innerText || a.value || a.getAttribute("aria-label") || "").trim().slice(0, 40)}" tabindex=${a.tabIndex} vis=${a.getBoundingClientRect().width > 0}`;
    });
    seq.push(info);
    if (!info) break;
  }
  out.p1_tabSequence = seq;
  save();
  await ctx.close();
}

// ---- B: signin focusability ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/auth/signin`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}
  await page.waitForTimeout(2500);
  out.p2_focusables = await page.evaluate(() => {
    const els = [...document.querySelectorAll("a, button, input, select, textarea, [tabindex], [role=tab]")];
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName, type: el.type || null, role: el.getAttribute("role"),
        text: (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 40),
        tabIndex: el.tabIndex, disabled: el.disabled === true,
        visible: r.width > 0 && r.height > 0,
        display: cs.display, visibility: cs.visibility,
        labelled: !!(el.labels && el.labels.length) || !!el.getAttribute("aria-label") || !!el.getAttribute("aria-labelledby"),
      };
    });
  });
  // tab through and record
  const seq = [];
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    seq.push(await page.evaluate(() => {
      const a = document.activeElement;
      return a && a !== document.body ? `${a.tagName} "${(a.innerText || a.value || "").trim().slice(0, 30)}"` : null;
    }));
    if (!seq[seq.length - 1]) break;
  }
  out.p2_tabSequence = seq;
  // focus the classroom input, screenshot ring
  await page.evaluate(() => { const i = document.querySelector("input"); if (i) { i.focus(); i.scrollIntoView({ block: "center" }); } });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(HERE, "p2-signin-focus-input.png") });
  out.p2_inputFocusStyle = await page.evaluate(() => {
    const i = document.querySelector("input");
    if (!i) return null;
    const cs = getComputedStyle(i);
    return { outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, boxShadow: cs.boxShadow.slice(0, 200), border: cs.border.slice(0, 100) };
  });
  await page.screenshot({ path: join(HERE, "p2-signin-00-full.png"), fullPage: true });
  save();
  await ctx.close();
}

// ---- C: canvas-normalized contrast on all pages ----
async function contrastProbe(page, key) {
  return await page.evaluate(() => {
    const px = document.createElement("canvas"); px.width = px.height = 1;
    const pg = px.getContext("2d", { willReadFrequently: true });
    const norm = (c) => { pg.fillStyle = "#fff"; pg.fillRect(0, 0, 1, 1); pg.fillStyle = c; pg.fillRect(0, 0, 1, 1); const d = pg.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const rel = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (fg, bg) => { const a = rel(norm(fg)), b = rel(norm(bg)); const hi = Math.max(a, b), lo = Math.min(a, b); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
    const effBg = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const m = String(bg).match(/[\d.]+/g);
        if (m && Number(m[3] ?? 1) > 0.01 && !(Number(m[0]) === 0 && Number(m[1]) === 0 && Number(m[2]) === 0)) return bg;
        n = n.parentElement;
      }
      return "rgb(255,255,255)";
    };
    const res = { samples: [] };
    const push = (label, el) => {
      const s = getComputedStyle(el);
      res.samples.push({ label, fg: s.color, bg: effBg(el), size: s.fontSize, weight: s.fontWeight, ratio: ratio(s.color, effBg(el)) });
    };
    push("body", document.body);
    const btns = [...document.querySelectorAll("button, a")].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 20 && r.height > 10 && (b.innerText || "").trim().length > 0;
    }).slice(0, 10);
    btns.forEach((b) => push(`btn/link:"${b.innerText.trim().slice(0, 30)}"`, b));
    return res;
  }).then((r) => { out[`contrast_${key}`] = r; save(); });
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await contrastProbe(page, "p1");
  await page.goto(`${BASE}/en/auth/signin`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await contrastProbe(page, "p2");
  await page.goto(`${BASE}/en/unauthorized`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await contrastProbe(page, "p5");
  await ctx.close();
}

// ---- D: Escape on visible Toggle Locale (landing) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const btn = page.getByRole("button", { name: /toggle locale/i });
  const vis = await btn.count();
  out.escape_locale = { count: vis };
  if (vis) {
    await btn.first().focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(HERE, "p1-locale-open.png") });
    const opened = await page.evaluate(() => ({
      expanded: [...document.querySelectorAll('[aria-expanded="true"]')].length,
      menus: document.querySelectorAll('[role="menu"],[role="listbox"]').length,
    }));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
      expanded: [...document.querySelectorAll('[aria-expanded="true"]')].length,
      menus: document.querySelectorAll('[role="menu"],[role="listbox"]').length,
      focus: document.activeElement ? document.activeElement.tagName : "none",
    }));
    out.escape_locale.opened = opened;
    out.escape_locale.after = after;
    await page.screenshot({ path: join(HERE, "p1-locale-after-escape.png") });
  }
  save();
  await ctx.close();
}

// ---- E: student dashboard = /en/student/read + games sidebar/heading forensics ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 300)); });
  const login = await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: "qa-student-a1", password: "QaTest!2026x" }, timeout: NAV_TIMEOUT });
  out.dashboard_login = login.status();
  await page.goto(`${BASE}/en/student/read`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}
  await page.waitForTimeout(2500);
  out.dashboard = {
    finalUrl: page.url(),
    landmarks: await page.evaluate(() => ({ main: document.querySelectorAll("main").length, header: document.querySelectorAll("header").length, footer: document.querySelectorAll("footer").length, nav: document.querySelectorAll("nav").length })),
    headings: await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => `${h.tagName}:"${h.innerText.trim().slice(0, 60)}"`).slice(0, 15)),
    consoleErrors: errs,
  };
  await page.screenshot({ path: join(HERE, "p3b-read-00-full.png"), fullPage: true });
  // keyboard sample on dashboard
  const seq = [];
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    seq.push(await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const cs = getComputedStyle(a);
      return `${a.tagName} "${(a.innerText || a.value || a.getAttribute("aria-label") || "").trim().slice(0, 35)}" outline=${cs.outlineWidth}/${cs.outlineStyle}`;
    }));
    if (!seq[seq.length - 1]) break;
  }
  out.dashboard.tabSequence = seq;
  // focus shot mid-page
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.activeElement && document.activeElement.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(HERE, "p3b-read-focus-1.png") });
  // Escape on student user menu if visible
  const menuBtn = page.getByRole("button", { name: /menu/i });
  out.dashboard.escape = { menuCount: await menuBtn.count() };
  if (await menuBtn.count()) {
    try {
      await menuBtn.first().click({ timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(HERE, "p3b-read-menu-open.png") });
      const opened = await page.evaluate(() => document.querySelectorAll('[aria-expanded="true"],[role="menu"],[role="dialog"]').length);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => document.querySelectorAll('[aria-expanded="true"],[role="menu"],[role="dialog"]').length);
      out.dashboard.escape.test = { openedCount: opened, afterCount: after, closes: after === 0 };
    } catch (e) { out.dashboard.escape.test = { error: String(e).slice(0, 200) }; }
  }
  await contrastProbe(page, "p3b");
  // games forensics: sidebar hrefs + empty headings + main count
  await page.goto(`${BASE}/en/student/games`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  out.games_forensics = await page.evaluate(() => ({
    mains: [...document.querySelectorAll("main")].map((m) => (m.getAttribute("class") || "").slice(0, 60)),
    emptyHeadings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => !h.innerText.trim()).map((h) => `${h.tagName}.${(h.getAttribute("class") || "").slice(0, 60)} outer=${h.outerHTML.slice(0, 160)}`),
    sidebarLinks: [...document.querySelectorAll("nav a, aside a")].slice(0, 12).map((a) => ({ text: a.innerText.trim().slice(0, 30), href: a.getAttribute("href") })),
    cardImgAlts: [...document.querySelectorAll("main img, [class*=card] img")].slice(0, 8).map((i) => ({ alt: i.getAttribute("alt"), src: (i.getAttribute("src") || "").slice(-50) })),
  }));
  await contrastProbe(page, "p4");
  save();
  await ctx.close();
}

await browser.close();
save();
console.log("FOLLOWUP DONE");
