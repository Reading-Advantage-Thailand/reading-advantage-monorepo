import { expect, test, type Locator, type Page } from "@playwright/test";

const browserQcEnabled = process.env.APK_TUTORIAL_QC_BROWSER === "1";

async function expectVisibleAndUnobstructed(locator: Locator, label: string) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator, `${label} must be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} must have a rendered box`).not.toBeNull();
  if (!box) return;

  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  expect(
    await locator.evaluate((element, point) => {
      const top = document.elementFromPoint(point.x, point.y);
      return top === element || Boolean(top && element.contains(top));
    }, center),
    `${label} must not be obstructed at its center`,
  ).toBe(true);
}

async function expectNoHorizontalOverflow(page: Page, qc: Locator, label: string) {
  expect(
    await qc.evaluate((element) => element.scrollWidth <= element.clientWidth),
    `${label} QC surface must not overflow horizontally`,
  ).toBe(true);
  expect(
    await page.evaluate(() => (
      document.documentElement.scrollWidth <= window.innerWidth
      && document.body.scrollWidth <= window.innerWidth
    )),
    `${label} page must not overflow horizontally`,
  ).toBe(true);
}

async function tapWithTouch(page: Page, locator: Locator, label: string) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box, `${label} must have a rendered box for touch input`).not.toBeNull();
  if (!box) return;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("APK guided tutorial QC", () => {
  test.use({ hasTouch: true });

  test.beforeEach(async ({}, testInfo) => {
    testInfo.skip(
      !browserQcEnabled,
      "Set APK_TUTORIAL_QC_BROWSER=1 to run the credential/runtime-gated browser QC.",
    );
  });

  test("previews tutorial states independently at compact and wide reference viewports", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");
    expect(await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))).toEqual({ width: 390, height: 844 });

    const qc = page.getByRole("region", { name: "Guided tutorial QC preview" });
    const tutorialScreen = qc.locator("[data-apk-tutorial-screen='true']");
    const target = tutorialScreen.getByRole("region", { name: "Highlighted tutorial target" });
    const action = tutorialScreen.getByRole("region", { name: "Demonstrated tutorial action" });
    await expect(qc).toBeVisible();
    await expect(qc).toHaveAttribute("data-apk-layout-profile", "compact");
    await expect(qc).toHaveAttribute("data-apk-input-mode", "keyboard");
    await expect(qc).toHaveAttribute("data-apk-reduced-motion", "false");
    await expect(qc.getByLabel("Tutorial input mode")).toHaveValue("keyboard");
    await expect(tutorialScreen).toHaveAttribute("data-apk-layout-profile", "compact");
    await expect(tutorialScreen).toHaveAttribute("data-apk-reduced-motion", "false");
    await expect(tutorialScreen).toHaveAttribute("data-apk-tutorial-animation", "host-controlled");
    await expect(qc.getByLabel("Tutorial fixture")).toBeVisible();
    await expect(tutorialScreen.getByText(/environmental responsibility through collaborative problem solving/i)).toBeVisible();
    await expect(tutorialScreen.getByText(/ความรับผิดชอบต่อสิ่งแวดล้อมผ่านการเรียนรู้ร่วมกัน/i)).toBeVisible();
    await expectVisibleAndUnobstructed(qc, "compact QC surface");
    await expectVisibleAndUnobstructed(tutorialScreen, "compact tutorial screen");
    await expectVisibleAndUnobstructed(target, "compact tutorial target");
    await expectVisibleAndUnobstructed(action, "compact tutorial action");
    await expectNoHorizontalOverflow(page, qc, "compact");
    await expect(qc.locator("[data-apk-canvas-host]")).toHaveCount(1);
    await expect(tutorialScreen).toHaveCount(1);

    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))).toEqual({ width: 1440, height: 900 });
    const wide = qc.getByRole("button", { name: /wide/i });
    const reducedMotion = qc.getByRole("button", { name: /reduced motion/i });
    await wide.focus();
    await expect(wide).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(qc).toHaveAttribute("data-apk-layout-profile", "wide");
    await qc.getByLabel("Tutorial input mode").selectOption("touch");
    await reducedMotion.click();
    await expect(reducedMotion).toHaveAttribute("aria-pressed", "true");
    await expect(qc).toHaveAttribute("data-apk-layout-profile", "wide");
    await expect(qc).toHaveAttribute("data-apk-input-mode", "touch");
    await expect(qc).toHaveAttribute("data-apk-reduced-motion", "true");
    await expect(tutorialScreen).toHaveAttribute("data-apk-layout-profile", "wide");
    await expect(tutorialScreen).toHaveAttribute("data-apk-reduced-motion", "true");
    await expect(tutorialScreen).toHaveAttribute("data-apk-tutorial-animation", "none");
    await expect(tutorialScreen.getByText(/environmental responsibility through collaborative problem solving/i)).toBeVisible();
    await expect(tutorialScreen.getByText(/ความรับผิดชอบต่อสิ่งแวดล้อมผ่านการเรียนรู้ร่วมกัน/i)).toBeVisible();
    await expectVisibleAndUnobstructed(qc, "wide QC surface");
    await expectVisibleAndUnobstructed(tutorialScreen, "wide tutorial screen");
    await expectVisibleAndUnobstructed(target, "wide tutorial target");
    await expectVisibleAndUnobstructed(action, "wide tutorial action");
    await expectNoHorizontalOverflow(page, qc, "wide");
    await expect(qc.locator("[data-apk-canvas-host]")).toHaveCount(1);
    await expect(tutorialScreen).toHaveCount(1);
  });

  test("replays and interrupts the tutorial with clean resource teardown", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    const qc = page.getByRole("region", { name: "Guided tutorial QC preview" });
    const status = qc.getByRole("status");
    await qc.getByLabel("Tutorial input mode").selectOption("touch");
    await expect(qc).toHaveAttribute("data-apk-input-mode", "touch");
    await tapWithTouch(page, qc.getByRole("button", { name: /start tutorial/i }), "start tutorial control");
    await expect(status).toHaveText(/Tutorial running/i);
    await expect(qc).toContainText("Listeners: 1");
    await expect(qc).toContainText("Phaser objects: 1");
    await qc.getByRole("button", { name: /replay tutorial/i }).click();
    await expect(status).toHaveText(/Tutorial clean after replay/i);
    await expect(qc).toContainText("Listeners: 0");
    await expect(qc).toContainText("Phaser objects: 0");
    await tapWithTouch(page, qc.getByRole("button", { name: /start tutorial/i }), "restart tutorial control");
    await expect(status).toHaveText(/Tutorial running/i);
    await expect(qc).toContainText("Listeners: 1");
    await expect(qc).toContainText("Phaser objects: 1");
    await qc.getByRole("button", { name: /interrupt tutorial/i }).click();

    await expect(status).toHaveText(/Tutorial interrupted and clean/i);
    await expect(qc).toContainText("Timers: 0");
    await expect(qc).toContainText("Listeners: 0");
    await expect(qc).toContainText("Phaser objects: 0");
    await expect(qc.locator("[data-apk-canvas-host]")).toHaveCount(1);
    await expect(qc.locator("[data-apk-tutorial-screen='true']")).toHaveCount(1);
  });
});
