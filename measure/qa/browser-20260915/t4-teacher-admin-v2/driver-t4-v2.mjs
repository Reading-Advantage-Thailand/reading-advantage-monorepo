// Manual browser QA rerun (pixel pass) for primary-advantage — T4 teacher/admin v2.
// TEST-ONLY. Run from repo root:
//   node measure/qa/browser-20260915/t4-teacher-admin-v2/driver-t4-v2.mjs
//
// Visual inspection model: full-page screenshots for every case so the report
// author can look at each pixel and call out layout / clipping / missing
// imagery / alignment problems that DOM checks cannot see.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://localhost:3000";
const OUT = path.dirname(fileURLToPath(import.meta.url));
const PASS = "QaTest!2026x";
const SCRATCH_NAME = "QA T4v2 Scratch";
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
  viewportNote: {},
};

let currentLabel = "global";
function trackPage(context) {
  const ensure = (label) => {
    results.consoleErrors[label] ??= [];
    results.pageErrors[label] ??= [];
    results.failedRequests[label] ??= [];
    results.apiStatuses[label] ??= [];
    return label;
  };
  context.on("console", (msg) => {
    if (msg.type() === "error") results.consoleErrors[ensure(currentLabel)].push(msg.text());
    if (msg.type() === "warning") {
      // we don't keep warnings, but note if any are interesting
    }
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

async function shot(page, name, opts = {}) {
  const file = `${name}.png`;
  await page.screenshot({
    path: path.join(OUT, file),
    fullPage: opts.fullPage ?? true,
    clip: opts.clip,
  });
  results.screenshots.push(file);
  note(`screenshot: ${file}${opts.fullPage === false ? " (viewport)" : " (full)"}`);
}

async function goto(page, url, label, { warm = false } = {}) {
  currentLabel = label;
  results.consoleErrors[label] ??= [];
  results.pageErrors[label] ??= [];
  results.failedRequests[label] ??= [];
  results.apiStatuses[label] ??= [];
  results.bodyText[label] = "";
  note(`--- ${label}: GET ${url}${warm ? " (warm)" : ""}`);
  const t0 = Date.now();
  try {
    await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(800);
  } catch (e) {
    note(`  ! goto error (will continue): ${e.message.split("\n")[0]}`);
  }
  const dt = Date.now() - t0;
  note(`  -> ${page.url()} (${dt}ms)`);
  results.viewportNote[label] = { url: page.url(), durationMs: dt };
  results.bodyText[label] = (await page.locator("body").innerText().catch(() => "")) || "";
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
  executablePath: "/opt/google/chrome/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  headless: true,
});
const context = await browser.newContext({
  baseURL: BASE,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "en-US",
  timezoneId: "America/Los_Angeles",
});
trackPage(context);
const page = await context.newPage();
await context.request.post(`${BASE}/api/auth/logout`).catch(() => {});

const summary = [];
function record(cs, verdict, detail) {
  summary.push({ case: cs, verdict, detail });
  note(`[${verdict}] CASE ${cs}: ${detail}`);
}

let scratchClassroomId = null;

try {
  // =====================================================================
  // CASES 1-4, 6: qa-teacher-a
  // =====================================================================
  let r = await apiLogin(context, "qa-teacher-a", PASS);
  if (r.status !== 200) throw new Error(`teacher login failed: ${r.status}`);

  // ---------- CASE 1: teacher dashboard ----------
  // /teacher/dashboard redirects (server-side) to /teacher/my-classes.
  await goto(page, `${BASE}/en/teacher/dashboard`, "case1 dashboard redirect");
  await page.getByText("QA Class A", { exact: false }).first().waitFor({ timeout: NAV_TIMEOUT }).catch(() => {});
  await page.getByText("QACLASSA", { exact: false }).first().waitFor({ timeout: 15_000 }).catch(() => {});
  await shot(page, "case1-teacher-dashboard");
  await shot(page, "case1-teacher-dashboard-viewport", { fullPage: false });
  const bodyText1 = await bodyOf(page).catch(() => "");
  const c1Class = /QA Class A/.test(bodyText1);
  const c1Code = /QACLASSA/.test(bodyText1);
  const c1Count = /(^|\n|\s)3(\s|\n|$)/.test(bodyText1);
  record(
    1,
    c1Class && c1Code ? "PASS" : "FAIL",
    `dashboard landed at ${page.url()}; QA Class A visible=${c1Class}; code QACLASSA visible=${c1Code}; a '3' count cell present=${c1Count}`,
  );

  // ---------- CASE 2: my-classes + class detail roster ----------
  await goto(page, `${BASE}/en/teacher/my-classes`, "case2 my-classes");
  await shot(page, "case2a-my-classes");
  const classId = await page.evaluate(async () => {
    const res = await fetch("/api/classroom");
    const j = await res.json();
    const c = (j.classrooms || []).find((x) => x.name === "QA Class A");
    return c ? c.id : null;
  });
  note(`QA Class A id from /api/classroom: ${classId}`);
  let rosterText = "";
  if (classId) {
    await goto(page, `${BASE}/en/teacher/class-roster/${classId}`, "case2 class roster");
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
    rosterText = await bodyOf(page).catch(() => "");
    await shot(page, "case2b-class-roster");
  } else {
    note("WARN: classId missing from API, trying UI navigation via actions menu");
    await page.getByRole("button", { name: "Actions" }).first().click().catch(() => {});
    await page.getByText(/roster/i).first().click().catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
    rosterText = await bodyOf(page).catch(() => "");
    await shot(page, "case2b-class-roster");
  }
  const rosterStudents = ["qa-student-a1", "qa-student-a2", "qa-student-a3"].map((s) => ({
    s, present: rosterText.includes(s),
  }));
  const rosterOk = rosterStudents.every((x) => x.present);
  const bodyMy = results.bodyText["case2 my-classes"] || "";
  record(
    2,
    /QA Class A/.test(bodyMy) && rosterOk ? "PASS" : /QA Class A/.test(bodyMy) && rosterText.length > 0 ? "BLOCKED" : "FAIL",
    `card visible=${/QA Class A/.test(bodyMy)}; roster students: ${JSON.stringify(rosterStudents)}`,
  );

  // ---------- CASE 3: create classroom QA T4v2 Scratch, screenshot, delete ----------
  await goto(page, `${BASE}/en/teacher/my-classes`, "case3 my-classes for create");
  // Locate the "New Classroom" button — prior driver used plus icon; we use label text to be robust.
  const newBtn = page.getByRole("button", { name: /new classroom/i }).first();
  let createClicked = false;
  if (await newBtn.count()) {
    await newBtn.click({ timeout: 15_000 });
    createClicked = true;
  } else {
    const fallback = page.locator("button").filter({ has: page.locator("svg.lucide-plus, svg.lucide-plus-icon") }).first();
    await fallback.click({ timeout: 15_000 });
    createClicked = true;
  }
  await page.waitForTimeout(500);
  const dialog = page.locator('[role="dialog"]').last();
  await dialog.waitFor({ timeout: 15_000 });
  await shot(page, "case3a-create-dialog");
  await dialog.locator('input[type="text"]:not([disabled])').first().fill(SCRATCH_NAME);
  await dialog.locator('[role="combobox"]').first().click().catch(() => {});
  await page.locator('[role="option"]').first().click().catch(() => {});
  const [createResp] = await Promise.all([
    page.waitForResponse((rp) => rp.url().endsWith("/api/classroom") && rp.request().method() === "POST", { timeout: NAV_TIMEOUT }),
    dialog.getByRole("button").filter({ hasText: /create|submit|save|add/i }).first().click().catch(async () => {
      await dialog.locator("button").last().click();
    }),
  ]);
  let createdBody = null;
  try { createdBody = await createResp.json(); } catch {}
  note(`create POST status: ${createResp.status()} body=${JSON.stringify(createdBody)?.slice(0, 200)}`);
  await page.waitForTimeout(2000);
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  await shot(page, "case3b-created-list");
  const bodyAfterCreate = await bodyOf(page).catch(() => "");
  const createdVisible = bodyAfterCreate.includes(SCRATCH_NAME);
  scratchClassroomId = createdBody?.classroom?.id ?? createdBody?.id ?? createdBody?.classroomId ?? null;
  if (!scratchClassroomId) {
    scratchClassroomId = await page.evaluate(async (name) => {
      const res = await fetch("/api/classroom");
      const j = await res.json();
      const c = (j.classrooms || []).find((x) => x.name === name);
      return c ? c.id : null;
    }, SCRATCH_NAME);
  }
  note(`scratch classroom id: ${scratchClassroomId}`);

  // Attempt UI delete first (matches prior pattern of opening the actions menu).
  let cleanup = "not-attempted";
  let deleteStatus = null;
  if (scratchClassroomId) {
    // Try UI delete: find row containing scratch name and click its delete action.
    const row = page.locator("tr").filter({ hasText: SCRATCH_NAME }).first();
    if (await row.count()) {
      const actionsBtn = row.getByRole("button", { name: /actions|open menu/i }).first();
      if (await actionsBtn.count()) {
        await actionsBtn.click().catch(() => {});
        await page.waitForTimeout(400);
        const delMenuItem = page.getByRole("menuitem").filter({ hasText: /delete|archive/i }).first()
          .or(page.getByText(/^Delete$|^Archive$/i).first());
        await delMenuItem.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }
    // Final cleanup: delete via API to guarantee the row is gone.
    const del = await context.request.delete(`${BASE}/api/classroom/${scratchClassroomId}`);
    deleteStatus = del.status();
    cleanup = `DELETE /api/classroom/${scratchClassroomId} -> ${deleteStatus}`;
    note(cleanup);
  }
  await goto(page, `${BASE}/en/teacher/my-classes`, "case3 post-cleanup");
  await shot(page, "case3d-after-delete");
  const gone = !(await bodyOf(page).catch(() => "")).includes(SCRATCH_NAME);
  const createOk = [200, 201].includes(createResp.status());
  record(
    3,
    createOk && createdVisible && gone ? "PASS" : "FAIL",
    `create status=${createResp.status()}; dialog opened=${createClicked}; row visible after create=${createdVisible}; cleanup ${cleanup}; row gone after delete=${gone}`,
  );

  // ---------- CASE 4: assignments / reports / student detail ----------
  const c4 = [];
  // 4a: reports with classroomId
  await goto(page, `${BASE}/en/teacher/reports?classroomId=${classId ?? ""}`, "case4 reports");
  await shot(page, "case4a-reports");
  await shot(page, "case4a-reports-viewport", { fullPage: false });
  const reportsText = results.bodyText["case4 reports"] || "";
  const reportsCrashed = results.pageErrors["case4 reports"].length > 0;
  c4.push({
    view: "reports",
    crashed: reportsCrashed,
    empty: /no activity|no assignments found|no articles found|no cards? are due/i.test(reportsText),
  });

  // 4b: student-progress detail for qa-student-a1
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
    await shot(page, "case4b-student-progress");
    const spText = results.bodyText["case4 student detail"] || "";
    const spCrashed = results.pageErrors["case4 student detail"].length > 0;
    const spForbidden = /unauthorized|access denied|do not have permission/i.test(page.url() + spText);
    c4.push({
      view: "student-progress",
      crashed: spCrashed,
      forbidden: spForbidden,
      empty: /no activity|no data/i.test(spText),
      showsStudent: spText.includes("qa-student-a1"),
    });
  } else {
    c4.push({ view: "student-progress", skipped: "student id not found" });
  }

  // 4c: assignments index + classroom selector
  await goto(page, `${BASE}/en/teacher/assignments`, "case4 assignments");
  await shot(page, "case4c-assignments-empty");
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
      await shot(page, "case4d-assignments-class-selected");
    } else {
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  const asgText = await bodyOf(page).catch(() => "");
  const asgCrashed = results.pageErrors["case4 assignments"].length > 0;
  c4.push({ view: "assignments", crashed: asgCrashed, empty: /no assignments found|select (a )?classroom/i.test(asgText), pickedClass });

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
  const blockedText = await bodyOf(page).catch(() => "");
  await shot(page, "case6-teacher-admin-boundary");
  const isRedirect = /unauthorized|signin|auth\/error/.test(blockedUrl) || /unauthorized|access denied|403|do not have permission/i.test(blockedText);
  const is500 = /500|Internal Server Error|Application error/i.test(blockedText) && blockedText.length < 400;
  record(
    6,
    isRedirect && !is500 ? "PASS" : "FAIL",
    `teacher GET /admin/dashboard landed at ${blockedUrl}; looksLikeRedirect/403=${isRedirect}; looksLike500=${is500}`,
  );

  await context.request.post(`${BASE}/api/auth/logout`).catch(() => {});
  await context.clearCookies();

  // =====================================================================
  // CASES 5, 7: qa-admin-a
  // =====================================================================
  r = await apiLogin(context, "qa-admin-a", PASS);
  if (r.status !== 200) throw new Error(`admin login failed: ${r.status}`);

  // ---------- CASE 5: admin dashboard + user management + license mgmt ----------
  await goto(page, `${BASE}/en/admin/dashboard`, "case5 admin dashboard");
  await shot(page, "case5a-admin-dashboard");
  await shot(page, "case5a-admin-dashboard-viewport", { fullPage: false });

  // user management: /en/admin/teachers (TeachersTable wired)
  await goto(page, `${BASE}/en/admin/teachers`, "case5 admin teachers");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  results.bodyText["case5 admin teachers"] = await bodyOf(page).catch(() => "");
  await shot(page, "case5b-admin-teachers");
  await shot(page, "case5b-admin-teachers-viewport", { fullPage: false });
  const teachersText = results.bodyText["case5 admin teachers"] || "";
  const teachersApi403 = (results.apiStatuses["case5 admin teachers"] || [])
    .filter((s) => /\/api\/(teachers|classrooms)/.test(s));
  const seesTeacherB = /qa-teacher-b/.test(teachersText);
  const seesTeacherA = /qa-teacher-a/.test(teachersText);
  const seesAdminA = /qa-admin-a/.test(teachersText);

  // students mgmt
  await goto(page, `${BASE}/en/admin/students`, "case5 admin students");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }).catch(() => {});
  results.bodyText["case5 admin students"] = await bodyOf(page).catch(() => "");
  await shot(page, "case5c-admin-students");
  await shot(page, "case5c-admin-students-viewport", { fullPage: false });
  const studentsText = results.bodyText["case5 admin students"] || "";
  const studentsApi403 = (results.apiStatuses["case5 admin students"] || [])
    .filter((s) => /\/api\/(students|classrooms)/.test(s));
  const seesStudentB = /qa-student-b1/.test(studentsText);
  const seesStudentA = /qa-student-a1/.test(studentsText);

  // dashboard/teachers variant (record state)
  await goto(page, `${BASE}/en/admin/dashboard/teachers`, "case5 dashboard/teachers");
  await shot(page, "case5d-dashboard-teachers");

  // license management: /system/licenses requires SYSTEM; record what admin sees.
  await goto(page, `${BASE}/en/system/licenses`, "case5 system licenses");
  const licUrl = page.url();
  await shot(page, "case5e-licenses");

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
      `Licenses: /system/licenses is SYSTEM-only and ${/unauthorized/.test(licUrl) ? `redirected ADMIN to /unauthorized (${licUrl})` : `was reachable at ${licUrl}`}.`,
  );

  // ---------- CASE 7: school settings page (view only, no saves) ----------
  // Warm the route via API request to absorb dev first-compile.
  await page.request.get(`${BASE}/en/settings/school-profile`).catch(() => {});
  try {
    await goto(page, `${BASE}/en/settings/school-profile`, "case7 school-profile", { warm: true });
  } catch (e) {
    note(`case7 first goto timed out, retrying once: ${e.message.split("\n")[0]}`);
    await goto(page, `${BASE}/en/settings/school-profile`, "case7 school-profile (retry)");
  }
  await page.waitForTimeout(1500);
  await shot(page, "case7-school-settings");
  await shot(page, "case7-school-settings-viewport", { fullPage: false });
  const sp7Text = await bodyOf(page).catch(() => "");
  const settingsCrashed =
    results.pageErrors[currentLabel]?.length > 0 ||
    (/500|Application error/i.test(sp7Text) && sp7Text.length < 400);
  const showsForm = /school|profile|save/i.test(sp7Text);
  record(
    7,
    settingsCrashed ? "FAIL" : "PASS",
    `school-profile at ${page.url()}; rendered length=${sp7Text.length}; form-like content=${showsForm}; no saves performed`,
  );

  await context.request.post(`${BASE}/api/auth/logout`).catch(() => {});
} catch (e) {
  note(`FATAL: ${e.stack || e.message}`);
} finally {
  // dedup
  for (const k of Object.keys(results.consoleErrors)) {
    results.consoleErrors[k] = [...new Set(results.consoleErrors[k])];
    results.pageErrors[k] = [...new Set(results.pageErrors[k])];
    results.failedRequests[k] = [...new Set(results.failedRequests[k])];
    results.apiStatuses[k] = [...new Set(results.apiStatuses[k])];
  }
  fs.writeFileSync(path.join(OUT, "results-t4-v2.json"), JSON.stringify({ summary, results, log }, null, 2));
  console.log("\n===== SUMMARY =====");
  for (const s of summary) console.log(`CASE ${s.case}: ${s.verdict} — ${s.detail}`);
  await browser.close();
}