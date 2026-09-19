// Manual browser QA for primary-advantage — T4 teacher/admin sweep.
// TEST-ONLY. Run from repo root:
//   node measure/qa/browser-20260915/t4-teacher-admin/driver-t4.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://localhost:3000";
const OUT = path.dirname(fileURLToPath(import.meta.url));
const PASS = "QaTest!2026x";
const NAV_TIMEOUT = 90_000;

const log = [];
function note(s) {
  log.push(s);
  console.log(s);
}
const results = {
  consoleErrors: {},
  pageErrors: {},
  failedRequests: {},
  apiStatuses: {},
  bodyText: {},
  screenshots: [],
};

let currentLabel = "global";
function trackPage(context) {
  const ensure = (label) => {
    results.consoleErrors[label] ??= [];
    results.pageErrors[label] ??= [];
    results.failedRequests[label] ??= [];
    return label;
  };
  context.on("console", (msg) => {
    if (msg.type() === "error") results.consoleErrors[ensure(currentLabel)].push(msg.text());
  });
  context.on("pageerror", (err) => {
    results.pageErrors[ensure(currentLabel)].push(err.message);
  });
  context.on("requestfailed", (req) => {
    results.failedRequests[ensure(currentLabel)].push(
      `${req.method()} ${req.url()} :: ${req.failure()?.errorText}`,
    );
  });
  context.on("response", (resp) => {
    const u = resp.url();
    if (u.includes("/api/") && resp.status() >= 400) {
      results.apiStatuses[ensure(currentLabel)] ??= [];
      results.apiStatuses[currentLabel].push(`${resp.status()} ${resp.request().method()} ${u.replace(BASE, "")}`);
    }
  });
}

async function shot(page, name) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  results.screenshots.push(file);
  note(`screenshot: ${file}`);
}

async function goto(page, url, label) {
  currentLabel = label;
  results.consoleErrors[label] ??= [];
  results.pageErrors[label] ??= [];
  results.failedRequests[label] ??= [];
  results.apiStatuses[label] ??= [];
  note(`--- ${label}: GET ${url}`);
  await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  await page.waitForTimeout(800);
  results.bodyText[label] = (await page.locator("body").innerText().catch(() => "")) || "";
  note(`    -> ${page.url()}`);
}

async function bodyOf(page) {
  return page.locator("body").innerText();
}

async function apiLogin(context, username, password) {
  const resp = await context.request.post(`${BASE}/api/auth/login`, {
    data: { username, password },
  });
  const status = resp.status();
  let body = null;
  try { body = await resp.json(); } catch { /* no json */ }
  note(`api login ${username}: status ${status}`);
  return { status, body };
}

const browser = await chromium.launch({
  executablePath: path.join(
    process.env.HOME,
    ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  ),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  baseURL: BASE,
  viewport: { width: 1440, height: 900 },
});
trackPage(context);
const page = await context.newPage();
await context.request.post(`${BASE}/api/auth/logout`).catch(() => {});

const summary = [];
function record(cs, verdict, detail) {
  summary.push({ case: cs, verdict, detail });
  note(`[${verdict}] CASE ${cs}: ${detail}`);
}

try {
  // ===================================================================
  // CASES 1-4, 6: qa-teacher-a
  // ===================================================================
  let r = await apiLogin(context, "qa-teacher-a", PASS);
  if (r.status !== 200) throw new Error(`teacher login failed: ${r.status}`);

  // ---------- CASE 1: teacher dashboard ----------
  // /teacher/dashboard redirects (server-side) to /teacher/my-classes.
  await goto(page, `${BASE}/en/teacher/dashboard`, "case1 dashboard redirect");
  const afterDash = page.url();
  await page.getByText("QA Class A", { exact: false }).first().waitFor({ timeout: NAV_TIMEOUT }).catch(() => {});
  await page.getByText("QACLASSA", { exact: false }).first().waitFor({ timeout: 15_000 }).catch(() => {});
  const bodyText1 = (await page.locator("body").innerText().catch(() => "")) || "";
  await shot(page, "t4-01-teacher-dashboard");
  const c1Class = /QA Class A/.test(bodyText1);
  const c1Code = /QACLASSA/.test(bodyText1);
  // student count displayed as a cell "3"
  const c1Count = /(^|\n|\s)3(\s|\n|$)/.test(bodyText1);
  record(
    1,
    c1Class && c1Code ? "PASS" : "FAIL",
    `dashboard/landing=${afterDash}; QA Class A visible=${c1Class}; code QACLASSA visible=${c1Code}; a '3' count cell present=${c1Count}`,
  );

  // ---------- CASE 2: my-classes + class detail roster ----------
  await goto(page, `${BASE}/en/teacher/my-classes`, "case2 my-classes");
  const bodyMy = await page.locator("body").innerText();
  await shot(page, "t4-02a-my-classes");
  const classId = await page.evaluate(async () => {
    const res = await fetch("/api/classroom");
    const j = await res.json();
    const c = (j.classrooms || []).find((x) => x.name === "QA Class A");
    return c ? c.id : null;
  });
  note(`QA Class A id from /api/classroom: ${classId}`);
  let rosterOk = false;
  let rosterText = "";
  if (classId) {
    await goto(page, `${BASE}/en/teacher/class-roster/${classId}`, "case2 class roster");
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
    rosterText = await page.locator("body").innerText();
    await shot(page, "t4-02b-class-roster");
  } else {
    // fallback: click the row action
    note("WARN: classId missing from API, trying UI navigation via actions menu");
    await page.getByRole("button", { name: "Actions" }).first().click();
    await page.getByText(/roster/i).first().click();
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
    rosterText = await page.locator("body").innerText();
    await shot(page, "t4-02b-class-roster");
  }
  const rosterStudents = ["qa-student-a1", "qa-student-a2", "qa-student-a3"].map((s) => ({
    s, present: rosterText.includes(s),
  }));
  rosterOk = rosterStudents.every((x) => x.present);
  record(
    2,
    /QA Class A/.test(bodyMy) && rosterOk ? "PASS" : /QA Class A/.test(bodyMy) && rosterText.length > 0 ? "BLOCKED" : "FAIL",
    `card visible=${/QA Class A/.test(bodyMy)}; roster students: ${JSON.stringify(rosterStudents)}`,
  );

  // ---------- CASE 3: create classroom QA T4 Scratch, screenshot, delete ----------
  await goto(page, `${BASE}/en/teacher/my-classes`, "case3 my-classes for create");
  const createLabel = await page.locator("button", { hasText: /.+/ }).evaluateAll(
    (btns) => btns.map((b) => b.textContent?.trim()).filter(Boolean),
  );
  note(`create-area buttons: ${JSON.stringify(createLabel.filter((t) => /class|create|new/i.test(t || "")))}`);
  // CreateClass trigger is a DialogTrigger Button with variant outline; find by translation-agnostic "+" icon.
  const createBtn = page.getByRole("button").filter({ has: page.locator("svg.lucide-plus, svg.lucide-plus-icon") }).first();
  await createBtn.waitFor({ timeout: 15_000 });
  await createBtn.click();
  await page.waitForTimeout(500);
  const dialog = page.locator('[role="dialog"]').last();
  await dialog.waitFor({ timeout: 15_000 });
  // first enabled text input is class name; class-code input is disabled/auto-generated
  await dialog.locator('input[type="text"]:not([disabled])').first().fill("QA T4 Scratch");
  // grade select: open combobox, pick first grade option
  await dialog.locator('[role="combobox"]').first().click();
  await page.locator('[role="option"]').first().click();
  const [createResp] = await Promise.all([
    page.waitForResponse((rp) => rp.url().endsWith("/api/classroom") && rp.request().method() === "POST", { timeout: NAV_TIMEOUT }),
    dialog.getByRole("button").filter({ hasText: /create|submit|save|add/i }).first().click().catch(async () => {
      // fallback: click last button in dialog
      await dialog.locator("button").last().click();
    }),
  ]);
  note(`create POST status: ${createResp.status()}`);
  await page.waitForTimeout(2000);
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  await shot(page, "t4-03a-class-created");
  const bodyAfterCreate = await page.locator("body").innerText();
  const createdVisible = /QA T4 Scratch/.test(bodyAfterCreate);

  // cleanup: delete the classroom through the row menu
  let cleanup = "not-attempted";
  const newId = await page.evaluate(async () => {
    const res = await fetch("/api/classroom");
    const j = await res.json();
    const c = (j.classrooms || []).find((x) => x.name === "QA T4 Scratch");
    return c ? c.id : null;
  });
  if (newId) {
    const del = await page.request.delete(`${BASE}/api/classroom/${newId}`);
    cleanup = `DELETE /api/classroom/${newId} -> ${del.status()}`;
    note(cleanup);
  } else {
    // UI cleanup
    note("newId not found via API; attempting UI delete flow");
  }
  await goto(page, `${BASE}/en/teacher/my-classes`, "case3 post-cleanup");
  await shot(page, "t4-03b-after-delete");
  const gone = !/QA T4 Scratch/.test(await page.locator("body").innerText());
  const createOk = [200, 201].includes(createResp.status());
  record(
    3,
    createOk && createdVisible && gone ? "PASS" : "FAIL",
    `create status=${createResp.status()} (201 Created accepted); row visible=${createdVisible}; cleanup: ${cleanup}; row gone=${gone}`,
  );

  // ---------- CASE 4: assignments / reports / student detail ----------
  const c4 = [];
  // 4a: reports with classroomId
  await goto(page, `${BASE}/en/teacher/reports?classroomId=${classId ?? ""}`, "case4 reports");
  let reportsText = results.bodyText["case4 reports"];
  await shot(page, "t4-04a-reports");
  const reportsCrashed = results.pageErrors["case4 reports"].length > 0;
  c4.push({
    view: "reports",
    crashed: reportsCrashed,
    empty: /no activity|no assignments found|no articles found|no cards? are due/i.test(reportsText),
  });

  // 4b: student-progress detail for qa-student-a1 (flattened students[].id shape)
  const studentId = await page.evaluate(async () => {
    const res = await fetch("/api/classroom");
    const j = await res.json();
    const cls = (j.classrooms || []).find((x) => x.name === "QA Class A");
    const s = (cls?.students || []).find((x) => x.name === "qa-student-a1");
    return s?.id ?? null;
  });
  note(`qa-student-a1 id: ${studentId}`);
  if (studentId) {
    await goto(page, `${BASE}/en/teacher/student-progress/${studentId}`, "case4 student detail");
    const spText = results.bodyText["case4 student detail"];
    await shot(page, "t4-04b-student-progress");
    const spCrashed = results.pageErrors["case4 student detail"].length > 0;
    const spForbidden = /unauthorized|access denied|do not have permission/i.test(page.url() + spText);
    c4.push({
      view: "student-progress",
      crashed: spCrashed,
      forbidden: spForbidden,
      empty: /no activity|no data/i.test(spText),
      showsStudent: spText.includes("qa-student-a1"),
    });
  }

  // 4c: assignments index + exercise the classroom selector (creation/listing entry point)
  await goto(page, `${BASE}/en/teacher/assignments`, "case4 assignments");
  await shot(page, "t4-04c-assignments-empty");
  // pick QA Class A in the classroom selector if present
  let pickedClass = false;
  const selectTrigger = page.locator('[role="combobox"]').first();
  if (await selectTrigger.count()) {
    await selectTrigger.click().catch(() => {});
    const option = page.getByRole("option", { name: /QA Class A/i }).first();
    if (await option.count()) {
      await option.click().catch(() => {});
      pickedClass = true;
      await page.waitForTimeout(2500);
      await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
      await shot(page, "t4-04d-assignments-class-selected");
    } else {
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  const asgText = await bodyOf(page);
  const asgCrashed = results.pageErrors["case4 assignments"].length > 0;
  const asgEmpty = /no assignments found|select (a )?classroom/i.test(asgText);
  c4.push({ view: "assignments", crashed: asgCrashed, empty: asgEmpty, pickedClass });

  const anyCrash4 = c4.some((x) => x.crashed);
  const anyEmpty4 = c4.some((x) => x.empty);
  const c4verdict = anyCrash4 ? "FAIL" : anyEmpty4 ? "BLOCKED" : "PASS";
  record(
    4,
    c4verdict,
    `views exercised (empty state = BLOCKED per spec): ${JSON.stringify(c4)}`,
  );

  // ---------- CASE 6: role boundary — teacher hitting /admin ----------
  await goto(page, `${BASE}/en/admin/dashboard`, "case6 teacher -> admin");
  const blockedUrl = page.url();
  const blockedText = await page.locator("body").innerText().catch(() => "");
  await shot(page, "t4-06-teacher-admin-boundary");
  const isRedirect = /unauthorized|signin|auth\/error/.test(blockedUrl) || /unauthorized|access denied|403|do not have permission/i.test(blockedText);
  const is500 = /500|Internal Server Error|Application error/i.test(blockedText) && blockedText.length < 400;
  record(
    6,
    isRedirect && !is500 ? "PASS" : "FAIL",
    `teacher GET /admin/dashboard landed at ${blockedUrl}; looksLikeRedirect/403=${isRedirect}; looksLike500=${is500}`,
  );

  await context.request.post(`${BASE}/api/auth/logout`).catch(() => {});
  await context.clearCookies();

  // ===================================================================
  // CASES 5, 7: qa-admin-a
  // ===================================================================
  r = await apiLogin(context, "qa-admin-a", PASS);
  if (r.status !== 200) throw new Error(`admin login failed: ${r.status}`);

  // ---------- CASE 5: admin dashboard + user management + license mgmt ----------
  await goto(page, `${BASE}/en/admin/dashboard`, "case5 admin dashboard");
  await shot(page, "t4-05a-admin-dashboard");

  // user management: /en/admin/teachers (TeachersTable wired)
  await goto(page, `${BASE}/en/admin/teachers`, "case5 admin teachers");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  results.bodyText["case5 admin teachers"] = await bodyOf(page);
  await shot(page, "t4-05b-admin-teachers");
  const teachersText = results.bodyText["case5 admin teachers"];
  const teachersApi403 = (results.apiStatuses["case5 admin teachers"] || [])
    .filter((s) => /\/api\/(teachers|classrooms)/.test(s));
  const seesTeacherB = /qa-teacher-b/.test(teachersText);
  const seesTeacherA = /qa-teacher-a/.test(teachersText);
  const seesAdminA = /qa-admin-a/.test(teachersText);

  // students mgmt
  await goto(page, `${BASE}/en/admin/students`, "case5 admin students");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  results.bodyText["case5 admin students"] = await bodyOf(page);
  await shot(page, "t4-05c-admin-students");
  const studentsText = results.bodyText["case5 admin students"];
  const studentsApi403 = (results.apiStatuses["case5 admin students"] || [])
    .filter((s) => /\/api\/(students|classrooms)/.test(s));
  const seesStudentB = /qa-student-b1/.test(studentsText);
  const seesStudentA = /qa-student-a1/.test(studentsText);

  // dashboard/teachers variant (table commented out — record state)
  await goto(page, `${BASE}/en/admin/dashboard/teachers`, "case5 dashboard/teachers");
  await shot(page, "t4-05d-dashboard-teachers");

  // license management: /system/licenses requires SYSTEM; try it and record.
  await goto(page, `${BASE}/en/system/licenses`, "case5 system licenses");
  const licUrl = page.url();
  await shot(page, "t4-05e-licenses");
  const licForbidden = /unauthorized/.test(licUrl);

  // Direct API probes (authoritative for what data the management UIs receive).
  const probe = async (path) => {
    const resp = await page.request.get(`${BASE}${path}`);
    let j = null;
    try { j = await resp.json(); } catch { /* no json */ }
    return { path, status: resp.status(), body: j };
  };
  const probes = {};
  probes.teachers = await probe("/api/teachers?page=1&limit=50");
  probes.students = await probe("/api/students?page=1&limit=50");
  probes.classrooms = await probe("/api/classrooms");
  note(`admin API probes -> teachers:${probes.teachers.status} students:${probes.students.status} classrooms:${probes.classrooms.status}`);

  const tenantLeak = seesTeacherB || seesStudentB;
  const mgmtBlocked = teachersApi403.length > 0 || studentsApi403.length > 0 ||
    probes.teachers.status === 403 || probes.students.status === 403;
  record(
    5,
    tenantLeak ? "FAIL" : mgmtBlocked ? "FAIL" : "PASS",
    `MULTI-TENANT LEAK: ${tenantLeak ? "YES (School B user visible)" : "NO — no qa-teacher-b / qa-student-b1 rendered"}. ` +
      `Management APIs for ADMIN: teachers=${probes.teachers.status}, students=${probes.students.status}, classrooms=${probes.classrooms.status} ` +
      `(${mgmtBlocked ? "403 — user-management lists cannot load for qa-admin-a; legacy userRoles/schoolAdmins gate" : "loaded"}). ` +
      `UI text shows teacher-a:${seesTeacherA}, admin-a:${seesAdminA}, student-a1:${seesStudentA}. ` +
      `Licenses: /system/licenses is SYSTEM-only and ${licForbidden ? "redirected ADMIN to /unauthorized" : `was reachable at ${licUrl}`}.`,
  );

  // ---------- CASE 7: school settings page (view only, no saves) ----------
  // Warm the route via API request to absorb dev first-compile, then load in-browser.
  await page.request.get(`${BASE}/en/settings/school-profile`).catch(() => {});
  try {
    await goto(page, `${BASE}/en/settings/school-profile`, "case7 school-profile");
  } catch (e) {
    note(`case7 first goto timed out, retrying once: ${e.message.split("\n")[0]}`);
    await goto(page, `${BASE}/en/settings/school-profile`, "case7 school-profile (retry)");
  }
  const sp7Url = page.url();
  await page.waitForTimeout(1500);
  const sp7Text = await bodyOf(page);
  await shot(page, "t4-07-school-settings");
  const settingsCrashed =
    results.pageErrors[currentLabel]?.length > 0 ||
    (/500|Application error/i.test(sp7Text) && sp7Text.length < 400);
  const showsForm = /school|profile|save/i.test(sp7Text);
  record(
    7,
    settingsCrashed ? "FAIL" : "PASS",
    `school-profile at ${sp7Url}; rendered length=${sp7Text.length}; form-like content=${showsForm}; no saves performed`,
  );

  await context.request.post(`${BASE}/api/auth/logout`).catch(() => {});
} catch (e) {
  note(`FATAL: ${e.stack || e.message}`);
} finally {
  // dedup console errors per label
  for (const k of Object.keys(results.consoleErrors)) {
    results.consoleErrors[k] = [...new Set(results.consoleErrors[k])];
    results.pageErrors[k] = [...new Set(results.pageErrors[k])];
    results.failedRequests[k] = [...new Set(results.failedRequests[k])];
  }
  fs.writeFileSync(path.join(OUT, "results-t4.json"), JSON.stringify({ summary, results, log }, null, 2));
  console.log("\n===== SUMMARY =====");
  for (const s of summary) console.log(`CASE ${s.case}: ${s.verdict} — ${s.detail}`);
  await browser.close();
}
