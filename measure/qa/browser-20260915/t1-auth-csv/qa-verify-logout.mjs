// TEST-ONLY verification: logout redirect destination + invalid-password UI.
// Run from repo root: node measure/qa/browser-20260915/t1-auth-csv/qa-verify-logout.mjs
import { chromium } from "playwright";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.dirname(new URL(import.meta.url).pathname);
const PASS = "QaTest!2026x";
const NAV_TIMEOUT = 90_000;

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

// Login as teacher via API, then load the home page.
const login = await ctx.request.post(`${BASE}/api/auth/login`, {
  data: { username: "qa-teacher-b", password: PASS },
});
console.log("login status:", login.status());

await page.goto(`${BASE}/en`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
console.log("landing URL:", page.url());

// Logout via the app API.
const logout = await ctx.request.post(`${BASE}/api/auth/logout`);
console.log("logout status:", logout.status());

// Where does an authenticated-only nav take the anonymous user?
await page.goto(`${BASE}/en/teacher/my-classes`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
console.log("unauth /en/teacher/my-classes URL:", page.url());
await page.screenshot({ path: path.join(OUT, "t1-04b-after-logout-signin.png") });

// Load the public landing page as anonymous: what renders?
await page.goto(`${BASE}/en`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
console.log("anonymous /en URL:", page.url());
const body = await page.textContent("body");
console.log("anonymous /en shows sign-in link:", /sign in|login/i.test(body));
await page.screenshot({ path: path.join(OUT, "t1-04c-anon-landing.png") });

// Invalid password via the real sign-in form.
await page.goto(`${BASE}/en/auth/signin`, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]').first();
const passInput = page.locator('input[type="password"]').first();
await emailInput.fill("qa-teacher-b");
await passInput.fill("wrong-password-123");
await passInput.press("Enter");
await page.waitForTimeout(4000);
console.log("after invalid submit URL:", page.url());
const errText = await page.textContent("body");
const m = errText.match(/invalid[^|\n]*/i);
console.log("error text present:", m ? m[0].slice(0, 80) : "NONE");
console.log("console errors:", JSON.stringify(errors, null, 2));

await browser.close();
