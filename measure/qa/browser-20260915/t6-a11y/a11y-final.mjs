/** T6 final probes. TEST-ONLY, view-only. */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const NAV_TIMEOUT = 120_000;
const out = {};
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });

// 1. Arrow-key tab operation on signin
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/auth/signin`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const student = page.getByRole("tab", { name: /student/i });
  await student.focus();
  const before = await page.evaluate(() => ({ active: document.activeElement.textContent.trim().slice(0, 20), sel: document.activeElement.getAttribute("aria-selected") }));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({
    active: `${document.activeElement.tagName} "${document.activeElement.textContent.trim().slice(0, 20)}"`,
    selStudent: document.querySelector('[role="tab"]')?.getAttribute("aria-selected"),
    tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => `${t.textContent.trim()}:sel=${t.getAttribute("aria-selected")}:tabindex=${t.tabIndex}`),
    panelText: document.querySelector('[role="tabpanel"]:not([style*="display: none"])')?.innerText.slice(0, 80),
  }));
  await page.screenshot({ path: join(HERE, "p2-teacher-tab.png") });
  out.tabs = { before, after };
  // Escape on this page (no menu expected)
  await page.keyboard.press("Escape");
  out.tabs.escapeOk = true;
  await ctx.close();
}

// 2-4. Student shell forensics
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: "qa-student-a1", password: "QaTest!2026x" }, timeout: NAV_TIMEOUT });
  await page.goto(`${BASE}/en/student/games`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  // sidebar keyboard activation
  const link = page.getByRole("link", { name: /^Read$/ });
  await link.first().focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  out.sidebarEnter = { urlAfterEnterOnRead: page.url() };
  await page.goto(`${BASE}/en/student/games`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  out.games = await page.evaluate(() => {
    const hidden = (el) => { const s = getComputedStyle(el); return s.display === "none" || s.visibility === "hidden"; };
    const hasHiddenAncestor = (el) => { let n = el; while (n && n !== document.body) { if (hidden(n)) return true; n = n.parentElement; } return false; };
    const emptyH = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => !h.innerText.trim());
    const mains = [...document.querySelectorAll("main")].map((m) => ({ cls: (m.className || "").slice(0, 50), hidden: hasHiddenAncestor(m), dialog: !!m.closest('[role="dialog"]') }));
    const cardImgs = [...document.querySelectorAll("a img")].slice(0, 3).map((i) => ({ alt: i.getAttribute("alt"), linkName: (i.closest("a").innerText || "").trim().slice(0, 40) }));
    const sidebar = [...document.querySelectorAll("aside a, nav[aria-label] a")].slice(0, 12).map((a) => ({ text: a.innerText.trim().slice(0, 25), href: a.getAttribute("href"), nav: a.closest("nav")?.getAttribute("aria-label") }));
    const described = document.querySelector("input")?.getAttribute("aria-describedby");
    return {
      mains, emptyHeadings: emptyH.map((h) => ({ tag: h.tagName, hidden: hasHiddenAncestor(h), inDialog: !!h.closest('[role="dialog"]'), html: h.outerHTML.slice(0, 140) })),
      cardImgs, sidebar, sidebarNavLabels: [...document.querySelectorAll("nav")].map((n) => n.getAttribute("aria-label")),
    };
  });
  // focusable divs check on read page + their roles
  await page.goto(`${BASE}/en/student/read`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  out.readDivs = await page.evaluate(() => [...document.querySelectorAll("div[tabindex='0']")].slice(0, 6).map((d) => ({ role: d.getAttribute("role"), text: (d.innerText || "").trim().slice(0, 60) })));
  writeFileSync(join(HERE, "results-final.json"), JSON.stringify(out, null, 2));
  await ctx.close();
}
await browser.close();
console.log("FINAL DONE", JSON.stringify(out, null, 1).slice(0, 3500));
