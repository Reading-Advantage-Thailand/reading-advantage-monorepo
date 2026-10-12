// Rehearsal 1 go/no-go browser check (cutover spec §10) against a local `next start` on the
// rehearsal target. Reads the rehearsal hand-out CSV; never prints a password.
// The class book block (spec S2) runs by default; CLASS_BOOK_CHECK=off skips it. It needs the catalogue
// import (cloudbuild-catalogue.yaml) and assigns Origins 3.2 (teacher-led); a rerun with the book
// already assigned passes, because the assign is an upsert.
// The Teacher Manual block (spec S6, checks named "manual ...") runs after it; MANUAL_CHECK=off skips it. It marks
// steps 1 to 3 and "Mark taught" on lesson 1, then makes lesson 1 current again. Use a fresh clone for each run.
// Usage: [NEW_PASSWORDS_OUT=<private csv>] node scripts/primary-parity/cutover-check.mjs <handout.csv> <teacher username> <admin username> <system username or -> <classroomId | class name | first>
import { readFileSync, mkdirSync, appendFileSync, chmodSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { BOOK_KEY, BOOK_LABEL, bookCardFirst, classBookIdFromHref, judgeGuideContent, judgeLessonPage, judgeManualPage, judgeProgressAndTaught, judgeProjector, judgeProjectorUse, judgeStudentLanding, judgeStudentUnlock } from "./class-book-checks.mjs";

const [csvPath, teacherUser, adminUser, systemUser, classroomId] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS ?? "/tmp/rehearsal1-shots";
// Production check (owner decision 2026-10-09): keep the new demo passwords in a private file.
const NEW_PASSWORDS_OUT = process.env.NEW_PASSWORDS_OUT;
const keepPassword = (label, username, password) => {
  if (!NEW_PASSWORDS_OUT) return;
  appendFileSync(NEW_PASSWORDS_OUT, `${label},${username},${password}\n`, { mode: 0o600 });
  chmodSync(NEW_PASSWORDS_OUT, 0o600);
};
// A rerun: an account whose temporary password this script already changed uses the kept password.
const keptOf = (username) => {
  if (!NEW_PASSWORDS_OUT || !existsSync(NEW_PASSWORDS_OUT)) return undefined;
  const lines = readFileSync(NEW_PASSWORDS_OUT, "utf8").trim().split("\n").map((l) => l.split(","));
  return lines.filter((l) => l[1] === username).pop()?.[2];
};
mkdirSync(SHOTS, { recursive: true });

const rows = readFileSync(csvPath, "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
const tempOf = (u) => {
  const row = rows.find((r) => r[3] === u);
  if (!row) throw new Error(`no hand-out row for ${u.slice(0, 3)}…`);
  return row[4];
};

/**
 * page.goto with up to 3 tries on a local network error or a time-out (this machine's tunnel drops
 * DNS and stalls requests at times). "networkidle" becomes "load" plus a soft 30 s idle wait.
 */
async function gotoRetry(page, url, opts = {}) {
  const idle = opts.waitUntil === "networkidle";
  const o = { ...opts, waitUntil: idle ? "load" : opts.waitUntil, timeout: 90000 };
  for (let i = 1; ; i++) {
    try {
      const r = await page.goto(url, o);
      if (idle) await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      return r;
    } catch (e) {
      if (i >= 3 || !/net::ERR_|Timeout/.test(String(e))) throw e;
      console.log(`      retry ${i}: ${String(e).split("\n")[0].slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

const results = [];
const check = (name, ok, note = "") => { results.push({ name, ok, note }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${note ? `  (${note})` : ""}`); };

const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });

async function staffSignIn(ctx, username, password) {
  const page = await ctx.newPage();
  await gotoRetry(page, `${BASE}/en/auth/signin`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("tab", { name: "Teacher" }).click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  const resp = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"), { timeout: 60000 });
  await page.locator('form button[type="submit"]').click();
  const status = (await resp).status();
  return { page, status };
}

/** First sign-in: temporary password, forced change, then the old and the new password. */
async function forcedChange(label, username) {
  const kept = keptOf(username);
  if (kept) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const again = await staffSignIn(ctx, username, kept);
    await again.page.waitForURL((u) => !u.pathname.endsWith("/auth/signin"), { timeout: 60000 }).catch(() => {});
    check(`${label}: kept password signs in (rerun)`, again.status === 200, `status ${again.status}`);
    return { ctx, page: again.page };
  }
  const temp = tempOf(username);
  const fresh = `Rh1-${randomBytes(6).toString("hex")}!`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const { page, status } = await staffSignIn(ctx, username, temp);
  check(`${label}: temporary password asks for a new password (403)`, status === 403, `status ${status}`);
  await page.locator("#new-password").waitFor({ timeout: 30000 });
  await page.locator("#new-password").fill(fresh);
  await page.locator("#confirm-password").fill(fresh);
  const change = page.waitForResponse((r) => r.url().endsWith("/api/auth/temporary-password"), { timeout: 60000 });
  await page.getByRole("button", { name: "Save and sign in" }).click();
  const changeStatus = (await change).status();
  await page.waitForURL((u) => !u.pathname.endsWith("/auth/signin"), { timeout: 60000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  if (changeStatus === 200) keepPassword(label, username, fresh);
  check(`${label}: new password saved and signed in`, changeStatus === 200 && !page.url().includes("/auth/signin"), `change ${changeStatus}, at ${new URL(page.url()).pathname}`);
  await page.screenshot({ path: `${SHOTS}/${label}-after-change.png` });
  await ctx.close();

  const ctx2 = await browser.newContext();
  const old = await staffSignIn(ctx2, username, temp);
  check(`${label}: temporary password refused after the change`, old.status === 401, `status ${old.status}`);
  await ctx2.close();
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const again = await staffSignIn(ctx3, username, fresh);
  await again.page.waitForURL((u) => !u.pathname.endsWith("/auth/signin"), { timeout: 60000 }).catch(() => {});
  check(`${label}: new password signs in`, again.status === 200, `status ${again.status}, at ${new URL(again.page.url()).pathname}`);
  return { ctx: ctx3, page: again.page };
}

try {
  // 1-3. Teacher: temporary password, forced change, old refused, new works.
  const teacher = await forcedChange("teacher", teacherUser);
  const tp = teacher.page;

  // Teacher sees the classes.
  await gotoRetry(tp, `${BASE}/en/teacher/my-classes`, { waitUntil: "networkidle", timeout: 120000 });
  const classesText = await tp.locator("main").innerText().catch(() => tp.locator("body").innerText());
  await tp.screenshot({ path: `${SHOTS}/teacher-my-classes.png`, fullPage: true });
  console.log(`      my-classes text sample: ${classesText.replace(/\s+/g, " ").slice(0, 300)}`);
  // The 5th argument is a class id or, on a target this machine cannot query, the exact class name.
  let classId = classroomId;
  if (classId === "first") {
    const href = await tp.locator('a[href*="/teacher/class-roster/"]').first().getAttribute("href").catch(() => null);
    classId = href?.split("/").pop() ?? "";
    check("teacher sees a class on My Classes", /^[0-9a-f-]{36}$/.test(classId));
  } else if (!/^[0-9a-f-]{36}$/.test(classId)) {
    const exact = new RegExp(`^\\s*${classroomId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
    const href = await tp.locator('a[href*="/teacher/class-roster/"]', { hasText: exact }).first().getAttribute("href").catch(() => null);
    classId = href?.split("/").pop() ?? "";
    check("teacher sees the class on My Classes", /^[0-9a-f-]{36}$/.test(classId), classroomId);
  }

  // 4. Class sign-in as on cutover day: migrated classes have the picture password off
  // (owner decision 2026-10-08), so the teacher only presses Start class.
  await gotoRetry(tp, `${BASE}/en/teacher/class-roster/${classId}`, { waitUntil: "networkidle", timeout: 120000 });
  const offText = "Students sign in with the class code and their name only.";
  const pictureOff = await tp.getByText(offText, { exact: false }).first().waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
  check("migrated class has the picture password off", pictureOff);
  await tp.screenshot({ path: `${SHOTS}/teacher-class-page.png` });

  async function startOrNewCode(buttonName, previous = "") {
    const r = tp.waitForResponse((x) => x.url().includes("/api/auth/student/class-session/start"), { timeout: 60000 });
    await tp.getByRole("button", { name: buttonName }).click();
    const resp = await r;
    const codeEl = tp.locator('[aria-label^="Class code "]');
    await codeEl.waitFor({ timeout: 30000 });
    if (previous) await tp.waitForFunction((old) => {
      const el = document.querySelector('[aria-label^="Class code "]');
      return el && el.getAttribute("aria-label").replace("Class code ", "").replace(/\s+/g, "") !== old;
    }, previous, { timeout: 30000 }).catch(() => {});
    const code = (await codeEl.getAttribute("aria-label")).replace("Class code ", "").replace(/\s+/g, "");
    return { status: resp.status(), code };
  }

  const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /** Code, then the pick-th name of the list (and the pictures only if the class asks for them). */
  async function studentSignIn(code, pick) {
    const sctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const sp = await sctx.newPage();
    await gotoRetry(sp, `${BASE}/en/auth/signin`, { waitUntil: "load", timeout: 120000 });
    await sp.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await sp.getByLabel("Class code").waitFor({ timeout: 60000 });
    await sp.getByLabel("Class code").fill(code);
    await sp.getByRole("button", { name: "Next" }).click();
    const gotNames = await sp.locator("li button span.truncate").first().waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
    if (!gotNames) return { ok: false, page: sp, ctx: sctx, note: (await sp.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 160) };
    const names = await sp.locator("li button span.truncate").allInnerTexts();
    const unique = names.filter((n) => names.filter((m) => m === n).length === 1);
    // The demo class shows "Student (." five times (no unique name): pick by position there.
    const name = unique.length ? unique[pick % unique.length] : undefined;
    const button = name
      ? sp.locator("li button", { has: sp.locator("span.truncate", { hasText: new RegExp(`^${escapeRe(name)}$`) }) }).first()
      : sp.locator("li button").nth(pick % names.length);
    await button.click();
    const ok = await sp.waitForURL((u) => u.pathname.includes("/student"), { timeout: 60000 }).then(() => true).catch(() => false);
    return { ok, page: sp, ctx: sctx, note: `${names.length} names; ${new URL(sp.url()).pathname}` };
  }

  // A rerun can find the class still open from the run before: then "New code" starts it again.
  await tp.getByRole("button", { name: /^(Start class|End class)$/ }).first().waitFor({ timeout: 60000 }).catch(() => {});
  const stillOpen = await tp.getByRole("button", { name: "End class" }).isVisible().catch(() => false);
  const first = await startOrNewCode(stillOpen ? "New code" : "Start class");
  check("teacher starts the class and sees a code", first.status === 200 && /^[A-Z0-9]{6}$/i.test(first.code), `status ${first.status}`);
  const s1 = await studentSignIn(first.code, 0);
  check("student 1 signs in with the code and the name", s1.ok, s1.note);
  await s1.page.screenshot({ path: `${SHOTS}/student1-home.png` });

  // Writing QR from a printed book (Origins 2 l01).
  await gotoRetry(s1.page, `${BASE}/en/student/read/cmgqx8v6602p3t79btatvfjuw/writing`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await s1.page.waitForURL((u) => /\/student\/read\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 60000 }).catch(() => {});
  await s1.page.waitForTimeout(3000);
  const writingPath = new URL(s1.page.url()).pathname;
  check("printed writing QR opens the migrated article", /\/student\/read\/[0-9a-f-]{36}/.test(writingPath), writingPath);
  await s1.page.screenshot({ path: `${SHOTS}/student1-writing-qr.png` });
  // A10 / D10: the migrated article shows its picture (the bucket key is the legacy id).
  const pic = s1.page.locator('img[src*="images/cmgqx8v6602p3t79btatvfjuw_"]').first();
  await pic.waitFor({ state: "attached", timeout: 30000 }).catch(() => {});
  await s1.page.waitForFunction(() => [...document.images].some((i) => i.src.includes("images/cmgqx8v6602p3t79btatvfjuw_") && i.complete && i.naturalWidth > 0), null, { timeout: 30000 }).catch(() => {});
  const picOk = await s1.page.evaluate(() => [...document.images].filter((i) => i.src.includes("images/cmgqx8v6602p3t79btatvfjuw_") && i.naturalWidth > 0).length);
  check("migrated article shows its picture (legacy key)", picOk > 0, `${picOk} loaded`);
  await s1.page.screenshot({ path: `${SHOTS}/student1-article-picture.png`, fullPage: true });
  await gotoRetry(s1.page, `${BASE}/en/student/read`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await s1.page.waitForFunction(() => [...document.images].filter((i) => i.src.includes("/images/") && i.complete && i.naturalWidth > 0).length >= 3, null, { timeout: 45000 }).catch(() => {});
  const listOk = await s1.page.evaluate(() => [...document.images].filter((i) => i.src.includes("/images/") && i.naturalWidth > 0).length);
  check("Read list shows article pictures", listOk >= 3, `${listOk} loaded`);
  await s1.page.screenshot({ path: `${SHOTS}/student1-read-list.png` });

  // Class book (spec S2): card above the sign-in panel, assign, lesson page, projector, student QR link.
  if (process.env.CLASS_BOOK_CHECK !== "off") {
    const bp = await teacher.ctx.newPage();
    try {
      await gotoRetry(bp, `${BASE}/en/teacher/class-roster/${classId}`, { waitUntil: "networkidle", timeout: 120000 });
      const card = bp.locator("[data-class-book-slot]").first();
      await card.waitFor({ timeout: 60000 }).catch(() => {});
      const tops = await bp.evaluate(() => {
        const top = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : null; };
        return { book: top("[data-class-book-slot]"), login: top("#class-login") };
      });
      check("class book: the book card is above the sign-in panel", bookCardFirst(tops.book, tops.login), `card ${tops.book === null ? "missing" : "found"}, panel ${tops.login === null ? "missing" : "found"}`);
      await bp.screenshot({ path: `${SHOTS}/teacher-class-book-card.png`, fullPage: true });

      const option = card.locator("select[name=bookId] option", { hasText: BOOK_LABEL });
      const haveOption = (await option.count()) > 0;
      check(`class book: the assign form lists ${BOOK_LABEL}`, haveOption);
      if (haveOption) {
        // With a book already assigned the form sits in a closed "Assign another book" disclosure.
        const more = card.locator("details:not([open]) > summary");
        if (await more.count()) await more.first().click();
        await card.locator("select[name=bookId]").selectOption({ label: BOOK_LABEL });
        await card.locator("select[name=mode]").selectOption("teacher_led");
        await card.getByRole("button", { name: "Assign", exact: true }).click();
        const assigned = await card.getByText("Book assigned.", { exact: true }).waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
        check("class book: the page shows \"Book assigned.\"", assigned);
      }

      // Reload so the card lists the book, then read the lesson plan link of the book.
      await gotoRetry(bp, `${BASE}/en/teacher/class-roster/${classId}`, { waitUntil: "networkidle", timeout: 120000 });
      const planHref = await bp.locator("[data-class-book-slot] li", { hasText: BOOK_LABEL }).first().getByRole("link", { name: "Lesson plan" }).getAttribute("href", { timeout: 30000 }).catch(() => null);
      const classBookId = classBookIdFromHref(planHref);
      check("class book: the card links to the lesson plan of the book", !!classBookId);
      if (classBookId) {
        const base = `${BASE}/en/teacher/class-roster/${classId}/books/${classBookId}`;
        await gotoRetry(bp, `${base}/lessons/1`, { waitUntil: "networkidle", timeout: 120000 });
        await bp.screenshot({ path: `${SHOTS}/teacher-class-book-lesson1.png`, fullPage: true });
        const facts = await bp.evaluate(() => {
          const text = document.body.innerText;
          const heading = document.querySelector("h1")?.textContent ?? "";
          return {
            title: heading.replace(/\s+/g, " ").trim(),
            stepCount: document.querySelectorAll('section[aria-labelledby^="guide-period-"] > ol > li').length,
            hasProjectorLink: !!document.querySelector('a[href$="/lessons/1/projector"]'),
            hasAnswerKey: !!document.getElementById("answer-key"),
            answerKeyEmpty: text.includes("This lesson has no answer key in the catalogue yet."),
            notLinked: text.includes("This lesson is not linked to an article yet."),
          };
        });
        for (const c of judgeLessonPage(facts)) check(c.name, c.ok, c.note);

        await gotoRetry(bp, `${base}/lessons/1/projector`, { waitUntil: "networkidle", timeout: 120000 });
        await bp.screenshot({ path: `${SHOTS}/teacher-class-book-projector.png` });
        const proj = await bp.evaluate(() => ({
          heading: (document.querySelector("h1")?.textContent ?? "").replace(/\s+/g, " ").trim(),
          paragraphs: [...document.querySelectorAll("section[aria-label] button[aria-pressed]")].filter((x) => x.innerText.trim().length > 20).length,
        }));
        for (const c of judgeProjector(proj)) check(c.name, c.ok, c.note);

        // Teacher Manual claims (spec S6): howTo2 to howTo5 and the manual page.
        if (process.env.MANUAL_CHECK !== "off") {
          const settle = () => bp.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
          await gotoRetry(bp, `${BASE}/en/teacher/manual`, { waitUntil: "networkidle", timeout: 120000 });
          const manualFacts = await bp.evaluate(() => ({
            howToItems: document.querySelectorAll('section[aria-labelledby="manual-howto"] ol > li').length,
            stepItems: document.querySelectorAll('section[aria-labelledby="manual-steps"] section[aria-labelledby^="guide-period-"] > ol > li').length,
            notImported: document.body.innerText.includes("The teacher guide is not imported yet."),
          }));
          for (const c of judgeManualPage(manualFacts)) check(c.name, c.ok, c.note);
          await bp.screenshot({ path: `${SHOTS}/teacher-manual.png`, fullPage: true });

          // howTo2: the teacher marks steps 1 to 3 on the lesson plan; the student gets the read link.
          const stepButtons = bp.locator('ul[aria-label="Workbook steps done in class"] button[aria-pressed]');
          const setStep = async (index, want) => {
            const button = stepButtons.nth(index);
            if ((await button.getAttribute("aria-pressed")) === String(want)) return;
            await button.click();
            await bp.waitForFunction(([i, v]) => document.querySelectorAll('ul[aria-label="Workbook steps done in class"] button[aria-pressed]')[i]?.getAttribute("aria-pressed") === String(v), [index, want], { timeout: 30000 }).catch(() => {});
          };
          const studentReadLink = async () => {
            await gotoRetry(s1.page, `${BASE}/en/student/books/${classBookId}`, { waitUntil: "networkidle", timeout: 120000 });
            return s1.page.locator('ol[aria-label="Lessons"] > li').first().getByRole("link", { name: "Read" });
          };
          await gotoRetry(bp, base, { waitUntil: "networkidle", timeout: 120000 });
          for (const i of [0, 1, 2]) await setStep(i, false);
          const readBefore = (await (await studentReadLink()).count()) > 0;
          await gotoRetry(bp, base, { waitUntil: "networkidle", timeout: 120000 });
          for (const i of [0, 1, 2]) await setStep(i, true);
          await bp.screenshot({ path: `${SHOTS}/teacher-manual-howto2-plan.png`, fullPage: true });
          const link = await studentReadLink();
          const readAfter = (await link.count()) > 0;
          let landedPath = "";
          if (readAfter) {
            await link.first().click();
            await s1.page.waitForURL((u) => /\/student\/lesson\//.test(u.pathname), { timeout: 60000 }).catch(() => {});
            await s1.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
            landedPath = new URL(s1.page.url()).pathname;
            await s1.page.screenshot({ path: `${SHOTS}/student1-manual-howto2-lesson.png` });
          }
          for (const c of judgeStudentUnlock({ readBefore, readAfter, landedPath })) check(c.name, c.ok, c.note);
          // Leave the data as found: unmark the steps that howTo2 marked.
          await gotoRetry(bp, base, { waitUntil: "networkidle", timeout: 120000 });
          for (const i of [0, 1, 2]) await setStep(i, false);

          // howTo3: the guide parts on the lesson page.
          await gotoRetry(bp, `${base}/lessons/1`, { waitUntil: "networkidle", timeout: 120000 });
          const guideFacts = await bp.evaluate(() => {
            const heads = [...document.querySelectorAll("h5")].map((x) => x.textContent.trim());
            return {
              teacherActions: heads.filter((x) => x === "Teacher actions").length,
              teacherLanguage: heads.filter((x) => x === "Teacher language").length,
              scripts: [...document.querySelectorAll("details > summary")].filter((x) => x.textContent.trim() === "Full script").length,
            };
          });
          for (const c of judgeGuideContent(guideFacts)) check(c.name, c.ok, c.note);

          // howTo4: the projector focuses a paragraph and reveals an answer.
          await gotoRetry(bp, `${base}/lessons/1/projector`, { waitUntil: "networkidle", timeout: 120000 });
          await bp.getByRole("button", { name: "Next", exact: true }).click().catch(() => {});
          const focusStatus = await bp.locator('[role="status"]').first().innerText().catch(() => "");
          const reveal = bp.getByRole("button", { name: "Show answer" });
          const revealButtons = await reveal.count();
          let pressedAfter = false;
          if (revealButtons) {
            await reveal.first().click();
            pressedAfter = (await bp.getByRole("button", { name: "Hide answer" }).count()) > 0;
          }
          await bp.screenshot({ path: `${SHOTS}/teacher-manual-howto4-projector.png` });
          for (const c of judgeProjectorUse({ focusStatus, revealButtons, pressedAfter })) check(c.name, c.ok, c.note);

          // howTo5: the progress grid shows the student; "Mark taught" moves the pointer; then lesson 1 is current again.
          await gotoRetry(bp, `${base}/progress`, { waitUntil: "networkidle", timeout: 120000 });
          const studentRows = await bp.locator("section[aria-labelledby=progress-grid] tbody tr").count();
          await bp.screenshot({ path: `${SHOTS}/teacher-manual-howto5-progress.png`, fullPage: true });
          await gotoRetry(bp, base, { waitUntil: "networkidle", timeout: 120000 });
          const pointerText = () => bp.getByText(/^Lesson \d+ of \d+/).first().innerText().catch(() => "");
          const before = await pointerText();
          const lessonOne = bp.locator("section[aria-labelledby=pacing-lessons] ol > li").first();
          const taughtButton = lessonOne.getByRole("button", { name: "Mark taught", exact: true });
          const skipped = (await taughtButton.count()) === 0;
          let after = before;
          if (!skipped) {
            await taughtButton.click();
            await bp.waitForFunction(() => !/^Lesson 1 of/m.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
            await settle();
            after = await pointerText();
            await bp.screenshot({ path: `${SHOTS}/teacher-manual-howto5-taught.png`, fullPage: true });
            const makeCurrent = lessonOne.getByRole("button", { name: "Make current", exact: true });
            if (await makeCurrent.count()) await makeCurrent.click();
            await settle();
          }
          for (const c of judgeProgressAndTaught({ studentRows, before, after, skipped })) check(c.name, c.ok, c.note);
        }
      }

      // A student of the class opens the printed QR link.
      await gotoRetry(s1.page, `${BASE}/en/b/${BOOK_KEY}/1`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await s1.page.waitForURL((u) => /\/student\//.test(u.pathname), { timeout: 60000 }).catch(() => {});
      await s1.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      const landing = await s1.page.locator("body").innerText().catch(() => "");
      for (const c of judgeStudentLanding(new URL(s1.page.url()).pathname, landing)) check(c.name, c.ok, c.note);
      await s1.page.screenshot({ path: `${SHOTS}/student1-class-book-qr.png` });
    } catch (err) {
      check("class book: block error", false, String(err).slice(0, 300));
    } finally {
      await bp.close().catch(() => {});
    }
  }
  await s1.ctx.close();

  // The teacher makes a new code; student 2 signs in with it; the old code stops working.
  const second = await startOrNewCode("New code", first.code);
  check("teacher makes a new code", second.status === 200 && second.code !== first.code, `status ${second.status}`);
  const s2 = await studentSignIn(second.code, 1);
  check("student 2 signs in with the new code", s2.ok, s2.note);
  await s2.ctx.close();
  const s3 = await studentSignIn(first.code, 2);
  check("the old code no longer works", !s3.ok, s3.note);
  await s3.ctx.close();

  // 5. Home sign-in (owner decision 2026-10-08, option A): the teacher ends the class and makes the
  // class sheet; a student then signs in with the username and password. No screenshot of the sheet.
  const ended = tp.waitForResponse((x) => x.url().includes("/api/auth/student/class-session/end"), { timeout: 60000 });
  await tp.getByRole("button", { name: "End class" }).click();
  check("teacher ends the class", (await ended).status() === 200);
  await gotoRetry(tp, `${BASE}/en/teacher/class-roster/${classId}/class-sheet`, { waitUntil: "networkidle", timeout: 120000 });
  await tp.getByRole("button", { name: "Make class sheet" }).click();
  const reset = tp.waitForResponse((x) => x.url().includes("/api/auth/student/class-passwords/reset"), { timeout: 120000 });
  await tp.getByRole("button", { name: "Set new passwords" }).click();
  const resetStatus = (await reset).status();
  const firstRow = tp.locator("[data-print-area] tbody tr").first();
  await firstRow.waitFor({ timeout: 30000 }).catch(() => {});
  const sheetRows = await tp.locator("[data-print-area] tbody tr").count();
  check("teacher makes the class sheet", resetStatus === 200 && sheetRows > 0, `status ${resetStatus}, ${sheetRows} rows`);
  const [homeUser, homePassword] = sheetRows ? (await firstRow.locator("td").allInnerTexts()).slice(1, 3).map((x) => x.trim()) : ["", ""];
  const hctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const hp = await hctx.newPage();
  await gotoRetry(hp, `${BASE}/en/auth/signin`, { waitUntil: "networkidle", timeout: 120000 });
  await hp.getByRole("button", { name: "Sign in with username and password" }).click();
  await hp.getByLabel("Username", { exact: true }).fill(homeUser);
  await hp.getByLabel("Password", { exact: true }).fill(homePassword);
  const login = hp.waitForResponse((x) => x.url().endsWith("/api/auth/login"), { timeout: 60000 });
  await hp.getByRole("button", { name: "Sign in", exact: true }).click();
  const loginStatus = (await login).status();
  const home = await hp.waitForURL((u) => u.pathname.includes("/student"), { timeout: 60000 }).then(() => true).catch(() => false);
  check("student signs in at home with the sheet username and password (no class open)", loginStatus === 200 && home, `status ${loginStatus}, at ${new URL(hp.url()).pathname}`);
  await hp.screenshot({ path: `${SHOTS}/student-home-password.png` });
  await hctx.close();
  await teacher.ctx.close();

  // Admin and system user.
  const admin = await forcedChange("admin", adminUser);
  await admin.ctx.close();
  // "-" skips the system user (production: the owner checks the own account on a phone).
  if (systemUser !== "-") {
    const system = await forcedChange("system", systemUser);
    await system.ctx.close();
  }
} catch (err) {
  check("script error", false, String(err).slice(0, 300));
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed} of ${results.length} checks pass.`);
  process.exitCode = failed ? 1 : 0;
}
