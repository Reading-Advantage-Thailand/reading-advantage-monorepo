/**
 * T6 accessibility QA driver for primary-advantage.
 * TEST-ONLY artifact. View-only navigation: no quiz submits, no data mutation.
 * Uses system Chrome via Playwright (no new deps, no axe install).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const USERNAME = "qa-student-a1";
const PASSWORD = "QaTest!2026x";
const NAV_TIMEOUT = 120_000;

mkdirSync(HERE, { recursive: true });
const results = { base: BASE, user: USERNAME, axe: "skipped (@axe-core/playwright not installed)", pages: {} };
function save() {
  writeFileSync(join(HERE, "results-a11y.json"), JSON.stringify(results, null, 2));
}

/** Luminance + contrast helpers run inside the page. */
const CONTRAST_FN = `(() => {
  function lum(rgb) {
    const m = rgb.match(/\\d+(\\.\\d+)?/g); if (!m) return null;
    let [r,g,b] = m.slice(0,3).map(Number).map(v => {
      v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }
  function effBg(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      const m = bg.match(/[\\d.]+/g);
      if (m && Number(m[3] ?? 1) >= 0.99 && !(Number(m[0])===0&&Number(m[1])===0&&Number(m[2])===0&&Number(m[3]??1)===0)) {
        if (!(Number(m[0])===0&&Number(m[1])===0&&Number(m[2])===0&&Number(m[3] ?? 1)===0)) return bg;
      }
      // treat fully transparent as "keep walking"
      if (m && Number(m[3] ?? 1) > 0 && !(Number(m[0])===0&&Number(m[1])===0&&Number(m[2])===0)) return bg;
      n = n.parentElement;
    }
    return "rgb(255, 255, 255)";
  }
  function ratio(fg, bg) {
    const a = lum(fg), b = lum(bg);
    if (a === null || b === null) return null;
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  }
  return { effBg, ratio };
})()`;

async function auditPage(page, key, url, opts = {}) {
  const entry = { url, finalUrl: null, consoleErrors: [], pageErrors: [], landmarks: null, headings: null, skipLink: null, images: null, form: null, keyboard: null, contrast: null, escape: null };
  results.pages[key] = entry;
  page.on("console", (m) => { if (m.type() === "error") entry.consoleErrors.push(m.text().slice(0, 500)); });
  page.on("pageerror", (e) => entry.pageErrors.push(String(e).slice(0, 500)));

  await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}
  await page.waitForTimeout(2500);
  entry.finalUrl = page.url();
  await page.screenshot({ path: join(HERE, `${key}-00-full.png`), fullPage: true });

  // ---- Landmarks ----
  entry.landmarks = await page.evaluate(() => {
    const q = (s) => [...document.querySelectorAll(s)].length;
    return {
      main: q("main"),
      header: q("header"),
      banner: q('[role="banner"]'),
      footer: q("footer"),
      contentinfo: q('[role="contentinfo"]'),
      nav: q("nav, [role=navigation]"),
      bannerText: [...document.querySelectorAll("header")].map((h) => h.getAttribute("role")),
    };
  });

  // ---- Headings ----
  entry.headings = await page.evaluate(() => {
    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      level: h.tagName.toLowerCase(),
      text: h.innerText.trim().slice(0, 80),
    }));
    const skips = [];
    for (let i = 1; i < hs.length; i++) {
      const a = Number(hs[i - 1].level[1]), b = Number(hs[i].level[1]);
      if (b > a + 1) skips.push(`${hs[i - 1].level}->${hs[i].level} ("${hs[i].text.slice(0, 40)}")`);
    }
    return { count: hs.length, h1: hs.filter((h) => h.level === "h1").length, order: hs.slice(0, 25), skips };
  });

  // ---- Skip link ----
  entry.skipLink = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href^="#"]')].map((a) => ({
      text: a.innerText.trim().slice(0, 60),
      href: a.getAttribute("href"),
      visibleOnFocus: (() => {
        const s = getComputedStyle(a);
        return { position: s.position, left: s.left, top: s.top, clip: s.clip };
      })(),
    }));
    return { candidates: links };
  });
  // Try activating a skip link if present
  const skip = await page.$('a[href^="#"]');
  if (skip) {
    try {
      const href = await skip.getAttribute("href");
      await skip.focus();
      await skip.press("Enter");
      await page.waitForTimeout(800);
      entry.skipLink.activated = { href, activeAfter: await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}#${a.id}.${a.className.toString().slice(0,40)}` : "none"; }), hash: new URL(page.url()).hash };
    } catch (e) { entry.skipLink.activated = { error: String(e).slice(0, 200) }; }
  }

  // ---- Images ----
  entry.images = await page.evaluate(() => ({
    imgs: [...document.querySelectorAll("img")].slice(0, 40).map((img) => ({
      alt: img.getAttribute("alt"),
      hidden: img.getAttribute("aria-hidden"),
      src: (img.getAttribute("src") || "").slice(-60),
    })),
    svgNoTitle: [...document.querySelectorAll("svg")].length,
    svgAriaHidden: [...document.querySelectorAll("svg[aria-hidden='true']")].length,
  }));

  // ---- Forms (signin page) ----
  if (opts.form) {
    entry.form = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll("input")].map((i) => {
        const id = i.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const wrapped = i.closest("label");
        return {
          type: i.type, name: i.name, id: id || null,
          hasLabel: !!(label || wrapped),
          labelText: ((label && label.innerText.trim()) || (wrapped && wrapped.innerText.trim()) || "").slice(0, 60),
          ariaLabel: i.getAttribute("aria-label"), labelledby: i.getAttribute("aria-labelledby"),
          describedby: i.getAttribute("aria-describedby"), required: i.required,
          placeholder: (i.getAttribute("placeholder") || "").slice(0, 40),
        };
      });
      const alerts = [...document.querySelectorAll('[role="alert"], [aria-live]')].map((e) => ({ role: e.getAttribute("role"), live: e.getAttribute("aria-live"), text: e.innerText.trim().slice(0, 120) }));
      return { inputs, liveRegions: alerts, submitButtons: [...document.querySelectorAll('button[type="submit"], input[type="submit"]')].map((b) => (b.innerText || b.value || "").trim().slice(0, 40)) };
    });
    // Submit empty form (blocked client-side by required -> no network) to surface validation wiring
    try {
      const loginFired = page.waitForRequest((r) => r.url().includes("/api/auth/login"), { timeout: 4000 }).then(() => true).catch(() => false);
      const submit = await page.$('button[type="submit"]');
      if (submit) { await submit.click(); await page.waitForTimeout(1500); }
      entry.form.emptySubmitFiredLogin = await loginFired;
      entry.form.afterEmptySubmit = await page.evaluate(() => ({
        validationMessages: [...document.querySelectorAll("input")].map((i) => i.validationMessage).filter(Boolean),
        alerts: [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText.trim().slice(0, 160)),
        firstInvalidFocused: (() => { const a = document.activeElement; return a ? `${a.tagName}[type=${a.type}]` : "none"; })(),
      }));
    } catch (e) { entry.form.emptySubmitError = String(e).slice(0, 200); }
  }

  // ---- Keyboard: tab through ----
  const focusLog = [];
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("Tab");
  let lastDesc = null, repeatCount = 0, trapAt = -1;
  const MAX_TABS = 80;
  for (let i = 0; i < MAX_TABS; i++) {
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const cs = getComputedStyle(a);
      const r = a.getBoundingClientRect();
      return {
        tag: a.tagName, type: a.type || null, role: a.getAttribute("role"),
        name: (a.innerText || a.value || a.getAttribute("aria-label") || "").trim().slice(0, 50),
        outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        boxShadow: cs.boxShadow === "none" ? "none" : cs.boxShadow.slice(0, 80),
        visible: r.width > 0 && r.height > 0,
      };
    });
    if (!info) break; // focus left to body = end of cycle
    const desc = `${info.tag}|${info.name}`;
    if (desc === lastDesc) { repeatCount++; if (repeatCount >= 2 && trapAt < 0) trapAt = i; }
    else repeatCount = 0;
    lastDesc = desc;
    if (!focusLog.length || `${focusLog[focusLog.length - 1].tag}|${focusLog[focusLog.length - 1].name}` !== desc) focusLog.push({ step: i, ...info });
    await page.keyboard.press("Tab");
  }
  entry.keyboard = {
    focusableSteps: focusLog.length,
    reachedEnd: focusLog.length < MAX_TABS,
    possibleTrapAtStep: trapAt,
    allVisible: focusLog.every((f) => f.visible),
    focusIndicators: focusLog.filter((f, i) => i % Math.ceil(Math.max(focusLog.length, 1) / 8) === 0).slice(0, 8).map((f) => ({ step: f.step, el: `${f.tag} "${f.name}"`, outline: f.outline, boxShadow: f.boxShadow })),
  };

  // ---- Focus screenshots (first / middle / last focusable) ----
  const picks = focusLog.length >= 3
    ? [focusLog[0], focusLog[Math.floor(focusLog.length / 2)], focusLog[focusLog.length - 1]]
    : focusLog;
  for (let i = 0; i < picks.length; i++) {
    try {
      const p = picks[i];
      // refocus by stepping tabs from top for determinism
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press("Tab");
      for (let s = 0; s < p.step; s++) await page.keyboard.press("Tab");
      await page.waitForTimeout(300);
      await page.evaluate(() => document.activeElement && document.activeElement.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(HERE, `${key}-focus-${i + 1}.png`) });
      entry.keyboard[`focusShot${i + 1}`] = `${key}-focus-${i + 1}.png :: ${p.tag} "${p.name}" outline=${p.outline} shadow=${p.boxShadow.slice(0, 40)}`;
    } catch (e) { entry.keyboard[`focusShot${i + 1}`] = `FAILED: ${String(e).slice(0, 120)}`; }
  }

  // ---- Escape: open a menu/dialog if present, then Escape ----
  entry.escape = await page.evaluate(() => ({
    menus: document.querySelectorAll('[role="menu"], [role="dialog"], [role="listbox"]').length,
    disclosures: [...document.querySelectorAll('button[aria-expanded], button[aria-haspopup]')].map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim().slice(0, 40)),
  }));
  try {
    const trigger = await page.$('button[aria-expanded="false"], button[aria-haspopup]');
    if (trigger) {
      await trigger.click();
      await page.waitForTimeout(600);
      const opened = await page.evaluate(() => ({
        expanded: [...document.querySelectorAll('button[aria-expanded="true"]')].length,
        dialogs: document.querySelectorAll('[role="menu"], [role="dialog"], [role="listbox"]').length,
      }));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => ({
        expanded: [...document.querySelectorAll('button[aria-expanded="true"]')].length,
        dialogs: document.querySelectorAll('[role="menu"], [role="dialog"], [role="listbox"]').length,
        focus: (() => { const a = document.activeElement; return a ? a.tagName : "none"; })(),
      }));
      entry.escape.test = { opened, afterEscape: after, closes: after.expanded === 0 && after.dialogs === 0 };
      await page.screenshot({ path: join(HERE, `${key}-escape.png`) });
    } else {
      entry.escape.test = { note: "no expandable menu trigger found; Escape N/A" };
    }
  } catch (e) { entry.escape.test = { error: String(e).slice(0, 200) }; }

  // ---- Contrast samples ----
  entry.contrast = await page.evaluate((helperSrc) => {
    const H = eval(`(${helperSrc})`);
    const out = { body: null, buttons: [], mutedCandidates: [] };
    const body = document.body;
    const cs = getComputedStyle(body);
    const bg = H.effBg(body);
    out.body = { fg: cs.color, bg, ratio: H.ratio(cs.color, bg) };
    [...document.querySelectorAll("button, a")].slice(0, 60).forEach((b) => {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      if (r.width < 20 || r.height < 10) return;
      const t = (b.innerText || "").trim().slice(0, 30);
      if (!t) return;
      out.buttons.push({ text: t, fg: s.color, bg: H.effBg(b), ratio: H.ratio(s.color, H.effBg(b)) });
    });
    // muted text candidates: small gray text
    [...document.querySelectorAll("p, span, small, div")].slice(0, 400).forEach((el) => {
      const t = el.innerText && el.innerText.trim();
      if (!t || t.length > 60 || el.children.length > 2) return;
      const s = getComputedStyle(el);
      if (Number(s.fontSize.replace("px", "")) > 15) return;
      const r = H.ratio(s.color, H.effBg(el));
      if (r !== null && r < 4.5) out.mutedCandidates.push({ text: t.slice(0, 50), fg: s.color, bg: H.effBg(el), ratio: Math.round(r * 100) / 100, size: s.fontSize });
      if (out.mutedCandidates.length >= 12) return;
    });
    out.buttons = out.buttons.slice(0, 15);
    return out;
  }, `(() => {
    function lum(rgb){const m=String(rgb).match(/[\\d.]+/g);if(!m)return null;let c=m.slice(0,3).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];}
    function effBg(el){let n=el;while(n&&n!==document.documentElement){const bg=getComputedStyle(n).backgroundColor;const m=String(bg).match(/[\\d.]+/g);if(m&&(Number(m[3]??1)>0.99||Number(m[3]??1)>0)){if(!(Number(m[0])===0&&Number(m[1])===0&&Number(m[2])===0))return bg;}n=n.parentElement;}return "rgb(255, 255, 255)";}
    function ratio(fg,bg){const a=lum(fg),b=lum(bg);if(a===null||b===null)return null;const hi=Math.max(a,b),lo=Math.min(a,b);return Math.round(((hi+0.05)/(lo+0.05))*100)/100;}
    return {effBg,ratio};
  })()`);

  save();
}

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });

// Public pages (unauthenticated)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await auditPage(page, "p1-landing", `${BASE}/en`);
  await auditPage(page, "p2-signin", `${BASE}/en/auth/signin`, { form: true });
  await ctx.close();
}

// Authenticated student pages
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const login = await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: USERNAME, password: PASSWORD }, timeout: NAV_TIMEOUT });
  if (login.status() !== 200) throw new Error(`login failed: ${login.status()}`);
  await auditPage(page, "p3-dashboard", `${BASE}/en/student`);
  await auditPage(page, "p4-games", `${BASE}/en/student/games`);
  // Unauthorized: student visits teacher route -> expect redirect to /en/unauthorized; then audit it directly too
  await page.goto(`${BASE}/en/teacher/my-classes`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  results.pages["p5-redirect-check"] = { from: "/en/teacher/my-classes", landed: page.url() };
  save();
  await auditPage(page, "p5-unauthorized", `${BASE}/en/unauthorized`);
  await ctx.close();
}

await browser.close();
save();
console.log("DONE", Object.keys(results.pages));
