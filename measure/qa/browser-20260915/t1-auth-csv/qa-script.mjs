// Manual browser QA for primary-advantage — T1 auth + CSV upload gate.
// TEST-ONLY script. Run from repo root:
//   node measure/qa/browser-20260915/t1-auth-csv/qa-script.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.dirname(new URL(import.meta.url).pathname);
const PASS = "QaTest!2026x";
const NAV_TIMEOUT = 90_000; // dev server first loads are slow

const results = { consoleErrors: {}, screenshots: [], notes: [] };
function note(s) {
  results.notes.push(s);
  console.log(s);
}
function trackPage(page, label) {
  results.consoleErrors[label] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") results.consoleErrors[label].push(msg.text());
  });
  page.on("pageerror", (err) => {
    results.consoleErrors[label].push(`pageerror: ${err.message}`);
  });
}
async function shot(page, name) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  results.screenshots.push(file);
  console.log(`screenshot: ${file}`);
}
const fail = (m) => { throw new Error(m); };

async function goto(page, url, label) {
  note(`--- ${label}: GET ${url}`);
  await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  note(`    -> ${page.url()}`);
}

async function apiLogin(page, username, password) {
  const resp = await page.request.post(`${BASE}/api/auth/login`, {
    data: { username, password },
  });
  const status = resp.status();
  let body = null;
  try { body = await resp.json(); } catch { /* no json */ }
  note(`api login ${username}: status ${status}`);
  return { status, body };
}

async function logoutViaUi(page) {
  const trigger = page.locator('[aria-haspopup="menu"]').first();
  await trigger.click({ timeout: 15_000 });
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/logout"), { timeout: NAV_TIMEOUT }),
    page.getByText("Logout", { exact: true }).click(),
  ]);
  note(`logout API status: ${resp.status()}`);
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function showJson(page, obj) {
  await page.goto(`data:text/html,<pre>${encodeURIComponent(JSON.stringify(obj, null, 2))}</pre>`);
}

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ baseURL: BASE });
const page = await context.newPage();
// Pre-warm the logout route so the UI logout does not race dev compile.
await context.request.post(`${BASE}/api/auth/logout`);
const CSV_DIR = path.join(OUT, "fixtures");
fs.mkdirSync(CSV_DIR, { recursive: true });

// CSV fixture per /api/upload/csv header contract: name,email,role,classroom_name
const csvContent = [
  "name,email,role,classroom_name",
  "Dup One,dup.browser@example.com,student,QA Class B",
  "Dup Two,dup.browser@example.com,student,QA Class B",
  "Mixed Cased,MixedCase.Browser@Example.COM,student,QA Class B",
  "New Student,newstudent.browser@example.com,student,QA Class B",
  "",
].join("\n");
const csvPath = path.join(CSV_DIR, "students.csv");
fs.writeFileSync(csvPath, csvContent);
const classesCsv = ["classroom_name", "QA Browser Class T1", ""].join("\n");
const classesPath = path.join(CSV_DIR, "classes.csv");
fs.writeFileSync(classesPath, classesCsv);

try {
  // ---------- CASE 1a: teacher UI login + role-appropriate landing ----------
  trackPage(page, "case1a-teacher-ui-login");
  await goto(page, `${BASE}/en/auth/signin`, "signin page");
  await page.getByRole("tab", { name: /teacher/i }).click();
  await page.locator('input[type="email"]').fill("qa-teacher-b");
  await page.locator('input[type="password"]').fill(PASS);
  const [uiLoginResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login"), { timeout: 15_000 }).then((r) => r).catch(() => null),
    page.getByRole("button", { name: /^login$/i }).click(),
  ]);
  note(`UI login request fired: ${uiLoginResp ? uiLoginResp.status() : "NO (client-side validation blocked)"}`);
  await page.waitForTimeout(1000);
  const formErr = await page.locator("form").innerText().catch(() => "");
  note(`form text after attempt: ${JSON.stringify(formErr.split("\n").slice(0, 12).join(" | "))}`);
  await shot(page, "t1-01-teacher-ui-login-validation");

  // Seeded usernames are not emails; establish the session via the login API.
  let r = await apiLogin(page, "qa-teacher-b", PASS);
  if (r.status !== 200) fail(`teacher api login returned ${r.status}: ${JSON.stringify(r.body)}`);
  await goto(page, `${BASE}/en`, "teacher landing /en");
  const landingUrl = page.url();
  if (/signin/.test(landingUrl)) fail(`teacher landed on sign-in after api login: ${landingUrl}`);
  await shot(page, "t1-02-teacher-landing");
  // Emulate the UI post-login push to /dashboard and observe the role redirect.
  await goto(page, `${BASE}/en/dashboard`, "teacher /en/dashboard");
  await shot(page, "t1-02b-teacher-dashboard-redirect");
  // The role-appropriate home for teachers.
  await goto(page, `${BASE}/en/teacher/dashboard`, "teacher /en/teacher/dashboard");
  await shot(page, "t1-02c-teacher-dashboard");

  // ---------- CASE 2: session persistence + cookie flags ----------
  trackPage(page, "case2-session");
  await page.reload({ timeout: NAV_TIMEOUT });
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  note(`URL after reload: ${page.url()}`);
  const stillLoggedIn = !/signin/.test(page.url());
  note(`session survives reload: ${stillLoggedIn}`);
  await shot(page, "t1-03-session-after-reload");
  const cookies = await context.cookies(BASE);
  const sessionCookie = cookies.find((c) => c.name === "session_token");
  note(`session_token: ${JSON.stringify(sessionCookie && { httpOnly: sessionCookie.httpOnly, secure: sessionCookie.secure, sameSite: sessionCookie.sameSite, path: sessionCookie.path, expiry: sessionCookie.expires })}`);
  if (!sessionCookie?.httpOnly) fail("session_token cookie is not HttpOnly");

  // ---------- CASE 1c: logout returns to sign-in ----------
  trackPage(page, "case1c-logout");
  await goto(page, `${BASE}/en`, "nav to /en for logout menu");
  await logoutViaUi(page);
  note(`URL after logout: ${page.url()}`);
  await page.waitForTimeout(1000);
  note(`URL after logout settle: ${page.url()}`);
  const cookiesAfterLogout = await context.cookies(BASE);
  const cookieAfter = cookiesAfterLogout.find((c) => c.name === "session_token");
  note(`session_token after logout: ${cookieAfter ? "still present" : "cleared"}`);
  await shot(page, "t1-04-after-logout");
  if (!/signin/.test(page.url())) note("WARN: logout did not land on sign-in URL");
  if (cookieAfter) note("WARN: session cookie not cleared on logout");

  // ---------- CASE 1b: invalid password ----------
  trackPage(page, "case1b-invalid-password");
  // Full UI path with an email-format username.
  await goto(page, `${BASE}/en/auth/signin`, "signin for invalid password");
  await page.getByRole("tab", { name: /teacher/i }).click();
  await page.locator('input[type="email"]').fill("qa-teacher-b@example.com");
  await page.locator('input[type="password"]').fill("WrongPass!9999");
  const [badResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login"), { timeout: NAV_TIMEOUT }),
    page.getByRole("button", { name: /^login$/i }).click(),
  ]);
  note(`invalid-password login API status: ${badResp.status()}`);
  await page.waitForTimeout(1000);
  const errText = await page.locator("form").innerText().catch(() => "");
  note(`error shown: ${JSON.stringify(errText.split("\n").filter((l) => /invalid|fail/i.test(l)).join(" | "))}`);
  await shot(page, "t1-05-invalid-password-error");
  if (badResp.status() === 500) fail("invalid password produced a 500");
  // API-level invalid password for the real seeded username.
  r = await apiLogin(page, "qa-teacher-b", "WrongPass!9999");
  if (r.status === 500) fail("api invalid password produced a 500");
  note(`api invalid password status: ${r.status} body: ${JSON.stringify(r.body)}`);

  // ---------- CASE 1d: unauthenticated visit to teacher route ----------
  trackPage(page, "case1d-unauth-redirect");
  await context.clearCookies();
  await goto(page, `${BASE}/en/teacher/my-classes`, "unauth /en/teacher/my-classes");
  await shot(page, "t1-06-unauth-redirect-to-signin");
  if (!/signin/.test(page.url())) fail(`unauthenticated teacher visit did not redirect to sign-in: ${page.url()}`);

  // ---------- CASE 1e: student on teacher route -> /en/unauthorized ----------
  trackPage(page, "case1e-student-unauthorized");
  let studentUiOk = false;
  try {
    await goto(page, `${BASE}/en/auth/signin`, "student signin");
    await page.getByLabel(/classroom code/i).fill("QACLASSB");
    await page.getByRole("button", { name: /continue|submit|next|login|sign/i }).first().click();
    await page.waitForTimeout(3000);
    // Select the seeded student from the dropdown, then confirm.
    const selectTrigger = page.locator("[role='combobox']").first();
    if (await selectTrigger.count()) {
      await selectTrigger.click();
      await page.getByRole("option", { name: /qa-student-b1/i }).first().click().catch(async () => {
        await page.getByText(/qa-student-b1/i).first().click();
      });
      const [loginResp] = await Promise.all([
        page.waitForResponse((x) => x.url().includes("/api/auth/login"), { timeout: NAV_TIMEOUT }),
        page.getByRole("button", { name: /login|sign|continue/i }).last().click(),
      ]);
      note(`student UI login status: ${loginResp.status()}`);
      studentUiOk = loginResp.ok();
    }
  } catch (e) {
    note(`student UI login flow failed, falling back to API: ${e.message.split("\n")[0]}`);
  }
  if (!studentUiOk) {
    await context.clearCookies();
    r = await apiLogin(page, "qa-student-b1", PASS);
    if (r.status !== 200) fail(`student api login returned ${r.status}`);
  }
  note(`student session landing check`);
  await goto(page, `${BASE}/en/teacher/my-classes`, "student /en/teacher/my-classes");
  const bodyText = await page.locator("body").innerText();
  note(`page contains 'Unauthorized': ${/unauthorized/i.test(bodyText)}`);
  await shot(page, "t1-07-student-unauthorized-page");
  if (!/unauthorized/.test(page.url())) fail(`student was not redirected to /unauthorized: ${page.url()}`);

  // ---------- CASE 3: CSV upload gate ----------
  // 3a: teacher session hits the admin import-data UI (admin-only area).
  trackPage(page, "case3a-teacher-import-ui");
  await context.clearCookies();
  r = await apiLogin(page, "qa-teacher-b", PASS);
  if (r.status !== 200) fail(`teacher re-login returned ${r.status}`);
  await goto(page, `${BASE}/en/admin/import-data`, "teacher /en/admin/import-data");
  await shot(page, "t1-08-teacher-admin-import-data");

  // 3b: admin session opens the import-data UI.
  await context.clearCookies();
  trackPage(page, "case3b-admin-import-ui");
  r = await apiLogin(page, "qa-admin-b", PASS);
  if (r.status !== 200) fail(`admin login returned ${r.status}`);
  await goto(page, `${BASE}/en/admin/import-data`, "admin /en/admin/import-data");
  await shot(page, "t1-09-admin-import-data-ui");

  // 3c: upload students.csv through the actual UI.
  const fileInput = page.locator("#file-upload");
  await fileInput.setInputFiles(csvPath);
  await page.waitForTimeout(500);
  const importBtn = page.locator("button", { hasText: /import/i }).first();
  const btnName = await importBtn.innerText().catch(() => "(none)");
  note(`import button text: ${JSON.stringify(btnName)}`);
  const [uiResp] = await Promise.all([
    page.waitForResponse((x) => x.url().includes("/api/upload"), { timeout: NAV_TIMEOUT }),
    importBtn.click(),
  ]);
  note(`UI upload response: ${uiResp.status()} ${uiResp.url()}`);
  const uiJson = await uiResp.json().catch(() => null);
  note(`UI upload JSON: ${JSON.stringify(uiJson)}`);
  fs.writeFileSync(path.join(OUT, "ui-upload-students.json"), JSON.stringify(uiJson, null, 2));
  await page.waitForTimeout(1500);
  await shot(page, "t1-10-ui-upload-result");

  // 3d: exercise /api/upload/csv directly with the admin session (the route
  // carrying the FR-3.1/3.2/3.3 summary contract).
  const apiResp1 = await page.request.post(`${BASE}/api/upload/csv`, {
    multipart: { file: { name: "students.csv", mimeType: "text/csv", buffer: fs.readFileSync(csvPath) } },
  });
  const apiJson1 = await apiResp1.json();
  note(`api/upload/csv first upload: status ${apiResp1.status}`);
  note(`api/upload/csv first upload JSON: ${JSON.stringify(apiJson1)}`);
  fs.writeFileSync(path.join(OUT, "api-upload-csv-first.json"), JSON.stringify(apiJson1, null, 2));
  await showJson(page, apiJson1);
  await shot(page, "t1-11-api-upload-csv-first");

  // 3e: re-upload the same file — all rows must be existing/skipped.
  const apiResp2 = await page.request.post(`${BASE}/api/upload/csv`, {
    multipart: { file: { name: "students.csv", mimeType: "text/csv", buffer: fs.readFileSync(csvPath) } },
  });
  const apiJson2 = await apiResp2.json();
  note(`api/upload/csv re-upload: status ${apiResp2.status}`);
  note(`api/upload/csv re-upload JSON: ${JSON.stringify(apiJson2)}`);
  fs.writeFileSync(path.join(OUT, "api-upload-csv-reupload.json"), JSON.stringify(apiJson2, null, 2));
  await showJson(page, apiJson2);
  await shot(page, "t1-12-api-upload-csv-reupload");

  // ---------- CASE 4: classes.csv spot check ----------
  trackPage(page, "case4-classes-csv");
  const classesResp = await page.request.post(`${BASE}/api/upload/classes`, {
    multipart: { file: { name: "classes.csv", mimeType: "text/csv", buffer: fs.readFileSync(classesPath) } },
  });
  const classesJson = await classesResp.json().catch(() => null);
  note(`api/upload/classes classes.csv: status ${classesResp.status}`);
  note(`api/upload/classes classes.csv JSON: ${JSON.stringify(classesJson)}`);
  fs.writeFileSync(path.join(OUT, "api-upload-classes.json"), JSON.stringify(classesJson, null, 2));
  await showJson(page, classesJson);
  await shot(page, "t1-13-api-upload-classes");
} finally {
  fs.writeFileSync(path.join(OUT, "run-output.json"), JSON.stringify(results, null, 2));
  await browser.close();
}
