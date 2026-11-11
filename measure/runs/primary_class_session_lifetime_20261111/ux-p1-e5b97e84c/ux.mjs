/**
 * Browser review of the class session lifetime control (Phase 1 of
 * primary_class_session_lifetime_20261111).
 *
 * Measures the teacher class-login panel at 1366x768 in `th` and `en`:
 * the radio group (visible label, accessible name, 44 px targets, arrow keys,
 * focus ring), the posted start body and the expiry text for every lifetime,
 * the 17:00 Bangkok rule through a faked page clock, the refusal text through
 * a forced 400, the 7-day help text, end class, new code, the teacher manual,
 * and the console errors.
 *
 * Writes results.json, PNG captures and accessibility snapshots into OUT_DIR.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL;
const OUT = process.env.OUT_DIR;
const IDS = JSON.parse(readFileSync(process.env.IDS_FILE, "utf8"));
const CHROME = "/opt/google/chrome/chrome";
const VIEWPORT = { width: 1366, height: 768 };
const START_ROUTE = "/api/auth/student/class-session/start";
const ROSTER_ROUTE = "/api/auth/student/roster";
const UNTIL17_EXPIRES_AT = "2026-11-11T10:00:00.000Z";
const STUB_SESSION_ID = "ux-stub-session";

if (!BASE || !OUT) {
  console.error("ux: BASE_URL and OUT_DIR must be set");
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

const TEXT = {
  en: {
    label: "How long should sign-in stay open?",
    options: { "3h": "3 hours", until_17: "Until 17:00 today", "7d": "7 days" },
    start: "Start class",
    newCode: "New code",
    end: "End class",
    help: "Students can use their cards at home until this time. End the class to stop sign-in earlier.",
    invalid: "This choice is not available now. Choose another time.",
    generic: "Something went wrong. Try again.",
    openUntil: "Open until",
    manual: "The class also closes by itself at the time you chose",
  },
  th: {
    label: "ต้องการให้การเข้าสู่ระบบเปิดนานเท่าใด",
    options: { "3h": "3 ชั่วโมง", until_17: "ถึง 17:00 ของวันนี้", "7d": "7 วัน" },
    start: "เริ่มชั้นเรียน",
    newCode: "รหัสใหม่",
    end: "จบชั้นเรียน",
    help: "นักเรียนใช้บัตรที่บ้านได้จนถึงเวลานี้ กดจบชั้นเรียนเพื่อหยุดการเข้าสู่ระบบก่อนเวลานี้",
    invalid: "ตัวเลือกนี้ใช้ไม่ได้ในขณะนี้ โปรดเลือกเวลาอื่น",
    generic: "เกิดข้อผิดพลาด โปรดลองใหม่",
    openUntil: "ใช้ได้ถึง",
    manual: "ชั้นเรียนปิดเองตามเวลาที่คุณเลือก",
  },
};

const results = {
  meta: {
    startedAt: new Date().toISOString(),
    baseUrl: BASE,
    chrome: CHROME,
    viewport: VIEWPORT,
    classroomId: IDS.classroomId,
    username: IDS.username,
    playwright: "1.61.0",
    realClockBangkok: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "full", timeStyle: "long" }).format(new Date()),
  },
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  captures: [],
  snapshots: [],
  notes: [],
};

/** Records one measured check. */
function check(id, locale, title, status, detail, data) {
  results.checks.push({ id, locale, title, status, detail, data: data ?? null });
  console.log(`[${status.toUpperCase()}] ${id} (${locale}): ${detail}`);
}

/** Escapes a text for a regular expression. */
function re(text) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

/** Removes every character that is not a letter or a digit. */
function norm(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z฀-๿]/g, "");
}

/** The parts of an instant in Asia/Bangkok for one locale. */
function bkkParts(iso, locale, withDate) {
  const options = withDate
    ? { timeZone: "Asia/Bangkok", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { timeZone: "Asia/Bangkok", hour: "numeric", minute: "2-digit" };
  const format = new Intl.DateTimeFormat(locale, options);
  const parts = format.formatToParts(new Date(iso));
  const pick = (type) => parts.filter((part) => part.type === type).map((part) => part.value).join("");
  return {
    full: format.format(new Date(iso)),
    day: pick("day"),
    month: pick("month"),
    hour: pick("hour"),
    minute: pick("minute"),
    dayPeriod: pick("dayPeriod"),
  };
}

/** The Bangkok calendar day of an instant as a date string. */
function bkkDay(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Saves a PNG capture and records it. */
async function shot(page, name) {
  const file = `${OUT}/${name}.png`;
  try {
    await page.screenshot({ path: file });
    results.captures.push(file);
  } catch (error) {
    results.notes.push(`screenshot ${name} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return file;
}

/** Saves an accessibility snapshot and records it. */
async function a11y(locator, name) {
  const file = `${OUT}/${name}.txt`;
  let text = "";
  try {
    text = await locator.ariaSnapshot();
  } catch (error) {
    text = `aria snapshot failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  writeFileSync(file, text);
  results.snapshots.push(file);
  return text;
}

/** Signs the teacher in through the sign-in page. */
async function signIn(page, locale) {
  await page.goto(`${BASE}/${locale}/auth/signin`, { waitUntil: "domcontentloaded" });
  const tabs = page.getByRole("tab");
  const tabCount = await tabs.count();
  for (let index = 0; index < tabCount; index += 1) {
    await tabs.nth(index).click().catch(() => undefined);
    const visible = await page
      .locator('input[name="username"]')
      .isVisible()
      .catch(() => false);
    if (visible) break;
  }
  await page.locator('input[name="username"]').waitFor({ state: "visible", timeout: 20000 });
  await page.locator('input[name="username"]').fill(IDS.username);
  await page.locator('input[name="password"]').fill(IDS.password);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login") && r.request().method() === "POST", { timeout: 30000 }),
    page.locator('form:has(input[name="username"]) button[type="submit"]').click(),
  ]);
  const status = response.status();
  const setCookie = response.headers()["set-cookie"] ?? "";
  if ((await page.context().cookies()).length === 0) {
    const pair = setCookie.split(";")[0] ?? "";
    const index = pair.indexOf("=");
    if (index > 0) {
      await page.context().addCookies([
        { name: pair.slice(0, index), value: pair.slice(index + 1), domain: "127.0.0.1", path: "/" },
      ]);
    }
  }
  return { status, cookies: (await page.context().cookies()).map((cookie) => cookie.name) };
}

/** Opens the teacher class page and waits for the lifetime control. */
async function openClassPage(page, locale) {
  await page.goto(`${BASE}/${locale}/teacher/class-roster/${IDS.classroomId}`, { waitUntil: "domcontentloaded" });
  await page.locator('[role="radiogroup"]').waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(600);
}

/** The radio group of the panel. */
function groupOf(page) {
  return page.locator('[role="radiogroup"]');
}

/** The option radio of one lifetime. */
function radioOf(page, value) {
  return page.locator(`input[type="radio"][value="${value}"]`);
}

/** The visible label of one option. */
function optionLabelOf(page, value) {
  return page.locator(`label:has(input[type="radio"][value="${value}"])`);
}

/** The checked radio values of the group. */
async function checkedValues(page) {
  return groupOf(page)
    .locator('input[type="radio"]:checked')
    .evaluateAll((nodes) => nodes.map((node) => node.value));
}

/** The text of the expiry line. */
async function expiryText(page, locale) {
  const locator = page.locator("p").filter({ hasText: re(TEXT[locale].openUntil) }).first();
  if ((await locator.count()) === 0) return null;
  return (await locator.innerText()).trim();
}

/**
 * Compares the shown expiry text with the server value in Asia/Bangkok.
 * @param shown The text on the page.
 * @param expected The parts of the expiry instant.
 * @param withDate True when the text must hold the date.
 * @returns Whether the text agrees with the instant.
 */
function expiryMatches(shown, expected, withDate) {
  if (shown === null) return false;
  const flat = norm(shown);
  const timeCore = norm(`${expected.hour}${expected.minute}`);
  if (!flat.includes(timeCore)) return false;
  if (withDate) {
    const dateCore = norm(`${expected.day}${expected.month}`);
    if (dateCore === "") return false;
    return flat.includes(dateCore);
  }
  if (expected.month === "") return true;
  return !flat.includes(norm(expected.month));
}

/** Runs the start route and returns the posted body and the response body. */
async function startSession(page, locale, buttonName) {
  const bodies = [];
  const listener = (request) => {
    if (request.method() === "POST" && request.url().includes(START_ROUTE)) {
      try {
        bodies.push(request.postDataJSON());
      } catch {
        bodies.push({ raw: request.postData() });
      }
    }
  };
  page.on("request", listener);
  const button = page.getByRole("button", { name: buttonName, exact: true });
  await button.waitFor({ state: "visible", timeout: 20000 });
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(START_ROUTE) && r.request().method() === "POST", { timeout: 30000 }),
    button.click(),
  ]);
  await page.waitForTimeout(800);
  page.off("request", listener);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status(), body: bodies[bodies.length - 1] ?? null, payload };
}

/** Collects the console errors and the page errors of a page. */
function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      results.consoleErrors.push({ label, text: message.text().slice(0, 400), url: page.url() });
    }
  });
  page.on("pageerror", (error) => {
    results.pageErrors.push({ label, text: String(error).slice(0, 400), url: page.url() });
  });
}

/** Clicks every collapsed accordion button of the page. */
async function expandAll(page) {
  for (let round = 0; round < 6; round += 1) {
    const collapsed = page.locator('button[aria-expanded="false"]');
    const count = await collapsed.count();
    if (count === 0) break;
    let clicked = 0;
    for (let index = 0; index < Math.min(count, 12); index += 1) {
      const target = collapsed.nth(index);
      if ((await target.count()) === 0) continue;
      await target.click({ timeout: 2000 }).catch(() => undefined);
      clicked += 1;
    }
    if (clicked === 0) break;
    await page.waitForTimeout(200);
  }
}

/** Runs the checks of the real clock page for one locale. */
async function runRealClockLocale(browser, locale) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: locale === "th" ? "th-TH" : "en-US" });
  const page = await context.newPage();
  watch(page, `${locale}:real`);

  const login = await signIn(page, locale);
  check(`${locale}-signin`, locale, "The teacher signs in", login.status === 200 ? "pass" : "fail", `login status ${login.status}, cookies ${login.cookies.join(",") || "none"}`, login);
  if (login.status !== 200) {
    await context.close();
    return;
  }

  await openClassPage(page, locale);
  const group = groupOf(page);

  // The radio group has a visible label and the accessible name of that label.
  const labelledBy = await group.getAttribute("aria-labelledby");
  let labelText = null;
  let labelVisible = false;
  let labelBox = null;
  if (labelledBy) {
    const label = page.locator(`#${labelledBy}`).first();
    labelText = (await label.innerText().catch(() => null)) ?? null;
    labelVisible = await label.isVisible().catch(() => false);
    labelBox = await label.boundingBox().catch(() => null);
  }
  check(
    `${locale}-group-label`,
    locale,
    "The radio group has a visible label",
    labelVisible && labelText === TEXT[locale].label && labelledBy ? "pass" : "fail",
    `visible label "${labelText ?? ""}" visible=${labelVisible} aria-labelledby=${labelledBy ?? "none"}`,
    { labelText, labelVisible, labelBox, ariaLabelledBy: labelledBy },
  );
  await a11y(group, `${locale}-a11y-radiogroup`);
  await a11y(page.locator("#class-login"), `${locale}-a11y-panel`);

  const optionRows = [];
  for (const value of ["3h", "until_17", "7d"]) {
    const radio = radioOf(page, value);
    const visible = (await radio.count()) > 0 && (await radio.isVisible().catch(() => false));
    if (!visible) {
      optionRows.push({ value, visible: false });
      continue;
    }
    const label = optionLabelOf(page, value);
    const labelBox = await label.boundingBox();
    const radioBox = await radio.boundingBox();
    optionRows.push({
      value,
      visible: true,
      labelText: (await label.innerText()).trim(),
      labelWidth: labelBox ? Math.round(labelBox.width) : null,
      labelHeight: labelBox ? Math.round(labelBox.height) : null,
      radioWidth: radioBox ? Math.round(radioBox.width) : null,
      radioHeight: radioBox ? Math.round(radioBox.height) : null,
    });
  }
  const visibleRows = optionRows.filter((row) => row.visible);
  const minHeight = visibleRows.length ? Math.min(...visibleRows.map((row) => row.labelHeight)) : null;
  const labelsOk = visibleRows.every((row) => row.labelText === TEXT[locale].options[row.value]);
  check(
    `${locale}-targets`,
    locale,
    "Every visible option has a visible label and a target of 44 px or more",
    visibleRows.length > 0 && minHeight >= 44 && labelsOk ? "pass" : "fail",
    `option_min_height_px=${minHeight ?? "none"} visible_options=${visibleRows.length} labels_match=${labelsOk}`,
    { optionRows, option_min_height_px: minHeight },
  );

  const defaultChecked = await checkedValues(page);
  check(
    `${locale}-default`,
    locale,
    "The default choice is 3 hours",
    defaultChecked.length === 1 && defaultChecked[0] === "3h" ? "pass" : "fail",
    `checked at first render: ${defaultChecked.join(",") || "none"}`,
    { checked: defaultChecked },
  );

  // The arrow keys move the selection, and the focus ring shows.
  const firstRadio = group.locator('input[type="radio"]').first();
  await firstRadio.focus();
  const focusedBefore = await page.evaluate(() => document.activeElement?.getAttribute("value") ?? null);
  const ringFocused = await firstRadio.evaluate((node) => {
    const style = getComputedStyle(node);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, boxShadow: style.boxShadow };
  });
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  const afterArrowDown = await checkedValues(page);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  const afterArrowRight = await checkedValues(page);
  const ringVisible =
    (ringFocused.outlineStyle !== "none" && parseFloat(ringFocused.outlineWidth) > 0) ||
    (ringFocused.boxShadow !== "none" && ringFocused.boxShadow !== "");
  check(
    `${locale}-keyboard`,
    locale,
    "The arrow keys change the checked radio and the focus ring shows",
    afterArrowDown.length === 1 && afterArrowDown[0] !== focusedBefore && afterArrowRight.length === 1 && ringVisible ? "pass" : "fail",
    `focus=${focusedBefore} arrow_down=${afterArrowDown.join(",") || "none"} arrow_right=${afterArrowRight.join(",") || "none"} ring=${ringVisible}`,
    { focusedBefore, afterArrowDown, afterArrowRight, ringFocused, ringVisible },
  );
  await shot(page, `${locale}-02-focus-ring`);

  // The 7-day help text shows only with 7 days, and it describes the group.
  await radioOf(page, "3h").click();
  await page.waitForTimeout(250);
  const helpAtThree = await page.locator("#class-session-lifetime-help").count();
  const describedAtThree = await group.getAttribute("aria-describedby");
  await radioOf(page, "7d").click();
  await page.waitForTimeout(300);
  const helpAtSeven = page.locator("#class-session-lifetime-help");
  const helpVisible = (await helpAtSeven.count()) > 0 ? await helpAtSeven.isVisible() : false;
  const helpText = (await helpAtSeven.count()) > 0 ? (await helpAtSeven.innerText()).trim() : null;
  const describedAtSeven = await group.getAttribute("aria-describedby");
  check(
    `${locale}-help-text`,
    locale,
    "The 7-day help text shows only with 7 days and describes the group",
    helpAtThree === 0 && describedAtThree === null && helpVisible && helpText === TEXT[locale].help && describedAtSeven === "class-session-lifetime-help" ? "pass" : "fail",
    `help_at_3h=${helpAtThree} described_at_3h=${describedAtThree ?? "none"} help_at_7d=${helpVisible} described_at_7d=${describedAtSeven ?? "none"}`,
    { helpAtThree, describedAtThree, helpText, helpVisible, describedAtSeven },
  );
  await shot(page, `${locale}-03-help-7d`);

  // Start with 3 hours: the posted body and the expiry text.
  await radioOf(page, "3h").click();
  await page.waitForTimeout(250);
  const startThree = await startSession(page, locale, TEXT[locale].start);
  const bodyThree = startThree.body;
  const keysThree = bodyThree ? Object.keys(bodyThree).sort() : [];
  const sameDayThree = bkkDay(startThree.payload?.expiresAt ?? "") === bkkDay(await page.evaluate(() => Date.now()));
  const expectedThree = bkkParts(startThree.payload?.expiresAt ?? "", locale, !sameDayThree);
  const shownThree = await expiryText(page, locale);
  const textThreeOk = expiryMatches(shownThree, expectedThree, !sameDayThree);
  check(
    `${locale}-start-3h`,
    locale,
    "Start with 3 hours posts the body and shows the expiry time",
    startThree.status === 200 &&
      keysThree.join(",") === "classroomId,lifetime" &&
      bodyThree?.lifetime === "3h" &&
      bodyThree?.classroomId === IDS.classroomId &&
      textThreeOk ? "pass" : "fail",
    `status=${startThree.status} body=${JSON.stringify(bodyThree)} expiresAt=${startThree.payload?.expiresAt ?? "none"} shown="${shownThree ?? ""}" expected="${expectedThree.full}" same_bangkok_day=${sameDayThree}`,
    { status: startThree.status, body: bodyThree, expiresAt: startThree.payload?.expiresAt ?? null, shown: shownThree, expected: expectedThree, sameDay: sameDayThree },
  );
  await shot(page, `${locale}-04-start-3h`);

  // New code with 7 days: the posted body and the expiry text with the date.
  await radioOf(page, "7d").click();
  await page.waitForTimeout(300);
  const startSeven = await startSession(page, locale, TEXT[locale].newCode);
  const bodySeven = startSeven.body;
  const keysSeven = bodySeven ? Object.keys(bodySeven).sort() : [];
  const sameDaySeven = bkkDay(startSeven.payload?.expiresAt ?? "") === bkkDay(await page.evaluate(() => Date.now()));
  const expectedSeven = bkkParts(startSeven.payload?.expiresAt ?? "", locale, !sameDaySeven);
  const shownSeven = await expiryText(page, locale);
  const textSevenOk = expiryMatches(shownSeven, expectedSeven, !sameDaySeven);
  check(
    `${locale}-start-7d`,
    locale,
    "New code with 7 days posts the body and shows the expiry date and time",
    startSeven.status === 200 &&
      keysSeven.join(",") === "classroomId,lifetime" &&
      bodySeven?.lifetime === "7d" &&
      bodySeven?.classroomId === IDS.classroomId &&
      textSevenOk ? "pass" : "fail",
    `status=${startSeven.status} body=${JSON.stringify(bodySeven)} expiresAt=${startSeven.payload?.expiresAt ?? "none"} shown="${shownSeven ?? ""}" expected="${expectedSeven.full}" same_bangkok_day=${sameDaySeven}`,
    { status: startSeven.status, body: bodySeven, expiresAt: startSeven.payload?.expiresAt ?? null, shown: shownSeven, expected: expectedSeven, sameDay: sameDaySeven },
  );
  await shot(page, `${locale}-05-start-7d`);

  // A refused start shows the lifetime text in an alert, and the alert clears.
  const intercepted = [];
  await page.route(`**${START_ROUTE}`, async (route) => {
    try {
      intercepted.push(route.request().postDataJSON());
    } catch {
      intercepted.push(null);
    }
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid input", code: "invalid_input" }),
    });
  });
  await radioOf(page, "3h").click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: TEXT[locale].newCode, exact: true }).click();
  await page.waitForTimeout(1200);
  const alert = page.locator('[role="alert"]').filter({ hasText: re(TEXT[locale].invalid) });
  const alertCount = await alert.count();
  const alertText = alertCount > 0 ? (await alert.first().innerText()).trim() : null;
  const genericShown = (await page.locator('[role="alert"]').filter({ hasText: re(TEXT[locale].generic) }).count()) > 0;
  await shot(page, `${locale}-06-refusal`);
  await radioOf(page, "7d").click();
  await page.waitForTimeout(400);
  const alertAfterChoice = await page.locator('[role="alert"]').filter({ hasText: re(TEXT[locale].invalid) }).count();
  await page.unroute(`**${START_ROUTE}`);
  check(
    `${locale}-refusal`,
    locale,
    "A refused start shows the lifetime text in an alert and the alert clears on a new choice",
    alertCount > 0 && alertText === TEXT[locale].invalid && !genericShown && alertAfterChoice === 0 ? "pass" : "fail",
    `alert="${alertText ?? ""}" generic_shown=${genericShown} alert_after_new_choice=${alertAfterChoice} intercepted=${JSON.stringify(intercepted)}`,
    { alertText, alertCount, genericShown, alertAfterChoice, intercepted },
  );

  // End class closes the session and returns the panel to the start state.
  await page.getByRole("button", { name: TEXT[locale].end, exact: true }).click();
  await page.waitForTimeout(1500);
  const startButtonBack = await page.getByRole("button", { name: TEXT[locale].start, exact: true }).count();
  const codeShown = (await page.locator('p[role="status"]').count()) > 0;
  check(
    `${locale}-end-class`,
    locale,
    "End class closes the session and returns the panel to the start state",
    startButtonBack > 0 && !codeShown ? "pass" : "fail",
    `start_button_back=${startButtonBack} code_shown=${codeShown}`,
    { startButtonBack, codeShown },
  );
  await shot(page, `${locale}-07-after-end`);

  // The teacher manual shows the new step 4 sentence.
  await page.goto(`${BASE}/${locale}/teacher/manual`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await expandAll(page);
  const manualText = await page.locator("body").innerText();
  const manualFound = manualText.includes(TEXT[locale].manual);
  const at = manualText.indexOf(TEXT[locale].manual);
  const manualSentence = manualFound ? manualText.slice(Math.max(0, at - 140), at + 180) : manualText.slice(0, 400);
  check(
    `${locale}-manual`,
    locale,
    "The teacher manual shows the new step 4 sentence",
    manualFound ? "pass" : "fail",
    `manual_sentence_found=${manualFound} around="${manualSentence.replace(/\s+/g, " ")}"`,
    { manualFound, around: manualSentence.replace(/\s+/g, " ") },
  );
  await shot(page, `${locale}-08-manual`);

  await context.close();
}

/**
 * The 17:00 rule on a page whose clock is set to 16:59:30 Bangkok.
 * @param browser The browser.
 * @param locale The locale.
 */
async function runClockLocale(browser, locale) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: locale === "th" ? "th-TH" : "en-US" });

  // Page one: the option shows at 16:59 and hides at 17:00.
  const page = await context.newPage();
  watch(page, `${locale}:clock`);
  await page.clock.install({ time: new Date("2026-11-11T09:59:30Z") });
  const login = await signIn(page, locale);
  if (login.status !== 200) {
    check(`${locale}-clock-signin`, locale, "The teacher signs in on the faked clock page", "fail", `login status ${login.status}`, login);
    await context.close();
    return;
  }
  await openClassPage(page, locale);

  const untilVisible = await radioOf(page, "until_17").isVisible().catch(() => false);
  check(
    `${locale}-clock-1659`,
    locale,
    "At 16:59 Bangkok the option Until 17:00 today shows",
    untilVisible ? "pass" : "fail",
    `until_17_visible=${untilVisible}`,
    { untilVisible },
  );
  await shot(page, `${locale}-10-clock-1659`);

  await page.clock.fastForward(45_000);
  const deadline = Date.now() + 30_000;
  let hidden = false;
  while (Date.now() < deadline) {
    hidden = !(await radioOf(page, "until_17").isVisible().catch(() => false));
    if (hidden) break;
    await page.waitForTimeout(500);
  }
  const checkedAfter = await checkedValues(page);
  await shot(page, `${locale}-12-clock-1700`);
  const startAfter = await startSession(page, locale, TEXT[locale].start);
  check(
    `${locale}-clock-1700`,
    locale,
    "At 17:00 Bangkok the option hides, one radio stays checked, and the start posts 3h",
    hidden && checkedAfter.length === 1 && checkedAfter[0] === "3h" && startAfter.body?.lifetime === "3h" && startAfter.status === 200 ? "pass" : "fail",
    `until_17_hidden=${hidden} checked=${checkedAfter.join(",") || "none"} posted=${JSON.stringify(startAfter.body)} status=${startAfter.status}`,
    { hidden, checkedAfter, posted: startAfter.body, status: startAfter.status },
  );
  await shot(page, `${locale}-13-clock-1700-started`);
  await page.close();

  // Page two: the body and the expiry text of the choice until 17:00 today.
  const pageTwo = await context.newPage();
  watch(pageTwo, `${locale}:clock-stub`);
  await pageTwo.clock.install({ time: new Date("2026-11-11T09:59:30Z") });
  const stubBodies = [];
  let rosterCalls = 0;
  await pageTwo.route(`**${START_ROUTE}`, async (route) => {
    try {
      stubBodies.push(route.request().postDataJSON());
    } catch {
      stubBodies.push(null);
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessionId: STUB_SESSION_ID, code: "UXSTUB1", expiresAt: UNTIL17_EXPIRES_AT }),
    });
  });
  await pageTwo.route(`**${ROSTER_ROUTE}`, async (route) => {
    rosterCalls += 1;
    const response = await route.fetch();
    if (rosterCalls === 1) {
      await route.fulfill({ response });
      return;
    }
    const json = await response.json();
    json.openSession = { id: STUB_SESSION_ID, expiresAt: UNTIL17_EXPIRES_AT };
    await route.fulfill({ response, json });
  });
  await pageTwo.goto(`${BASE}/${locale}/teacher/class-roster/${IDS.classroomId}`, { waitUntil: "domcontentloaded" });
  await pageTwo.locator('[role="radiogroup"]').waitFor({ state: "visible", timeout: 60000 });
  await pageTwo.waitForTimeout(800);
  await radioOf(pageTwo, "until_17").click();
  await pageTwo.waitForTimeout(300);
  const stubStart = await startSession(pageTwo, locale, TEXT[locale].start);
  const stubBody = stubBodies[stubBodies.length - 1] ?? null;
  const expectedUntil = bkkParts(UNTIL17_EXPIRES_AT, locale, false);
  const shownUntil = await expiryText(pageTwo, locale);
  const untilTextOk = expiryMatches(shownUntil, expectedUntil, false);
  check(
    `${locale}-until17-body`,
    locale,
    "The choice Until 17:00 today posts lifetime until_17 and shows the time only",
    stubBody?.lifetime === "until_17" &&
      Object.keys(stubBody ?? {}).sort().join(",") === "classroomId,lifetime" &&
      untilTextOk ? "pass" : "fail",
    `body=${JSON.stringify(stubBody)} expiresAt=${UNTIL17_EXPIRES_AT} shown="${shownUntil ?? ""}" expected="${expectedUntil.full}" status=${stubStart.status}`,
    { body: stubBody, expiresAt: UNTIL17_EXPIRES_AT, shown: shownUntil, expected: expectedUntil, status: stubStart.status },
  );
  await shot(pageTwo, `${locale}-11-until17-expiry`);
  await pageTwo.close();

  await context.close();
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

try {
  for (const locale of ["en", "th"]) {
    try {
      await runRealClockLocale(browser, locale);
    } catch (error) {
      check(`${locale}-real-harness`, locale, "The real clock checks run", "fail", String(error).slice(0, 400));
      results.notes.push(`real clock ${locale}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    }
    try {
      await runClockLocale(browser, locale);
    } catch (error) {
      check(`${locale}-clock-harness`, locale, "The faked clock checks run", "fail", String(error).slice(0, 400));
      results.notes.push(`faked clock ${locale}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    }
  }
} finally {
  await browser.close();
  results.meta.finishedAt = new Date().toISOString();
  results.summary = {
    total: results.checks.length,
    pass: results.checks.filter((row) => row.status === "pass").length,
    fail: results.checks.filter((row) => row.status === "fail").length,
    consoleErrors: results.consoleErrors.length,
    pageErrors: results.pageErrors.length,
    captures: results.captures.length,
    snapshots: results.snapshots.length,
  };
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log(`ux: wrote ${OUT}/results.json`);
  process.exitCode = results.summary.fail > 0 ? 1 : 0;
}
