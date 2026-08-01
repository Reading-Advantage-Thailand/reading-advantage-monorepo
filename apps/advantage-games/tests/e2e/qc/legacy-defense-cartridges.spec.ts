import { expect, test, type Locator, type Page } from "@playwright/test";

const TITLES = [
  { id: "castle-defense", title: "Castle Defense", registrations: 4, expectedStatus: "playing" },
  { id: "wizard-vs-zombie", title: "Wizard vs Zombie", registrations: 5, expectedStatus: "playing" },
  { id: "village-guardian", title: "Village Guardian", registrations: 4, expectedStatus: "playing" },
  { id: "storm-castle-tower", title: "Storm the Castle Tower", registrations: 3, expectedStatus: "blocked" },
] as const;

/** Selects one title from the quarantined Legacy Defense `/qc` registration. */
async function selectTitle(page: Page, id: string, title: string, registrations: number): Promise<{ surface: Locator; canvas: Locator }> {
  const surface = page.getByRole("region", { name: "Legacy defense cartridge QC" });
  await surface.getByLabel("QC cartridge").selectOption(id);
  await expect(surface).toHaveAttribute("data-loaded-cartridge", id);
  const canvas = surface.getByRole("img", { name: `${title} defense QC canvas` });
  await expect(canvas).toBeVisible();
  await expect(surface.getByTestId("legacy-defense-descriptor-registration")).toHaveCount(registrations);
  return { surface, canvas };
}

/** Confirms the browser proof did not construct a result-delivery lifecycle. */
async function expectNoCompletion(surface: Locator, status: string): Promise<void> {
  await expect(surface.getByTestId("legacy-defense-completion-count")).toHaveText("0");
  await expect(surface.getByTestId("legacy-defense-mechanic-snapshot")).toContainText(`"status":"${status}"`);
}

test.describe("Legacy Defense cartridge Advantage Games QC", () => {
  test("records Chromium keyboard and pointer input through compact and wide profiles for every title", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title, title.registrations);
      await expect(surface.getByTestId("legacy-defense-layout-profile")).toHaveText("compact");
      await expect(surface.getByTestId("legacy-defense-geometry-issues")).toHaveText("0");
      await canvas.focus();
      await page.keyboard.press("Enter");
      await canvas.click({ position: { x: 20, y: 20 } });
      await expect(surface.getByTestId("legacy-defense-input-counts")).toContainText("keyboard 1");
      await expect(surface.getByTestId("legacy-defense-input-counts")).toContainText("pointer 1");
      await expectNoCompletion(surface, title.expectedStatus);

      const canvasHandle = await canvas.elementHandle();
      expect(canvasHandle).not.toBeNull();
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("legacy-defense-layout-profile")).toHaveText("wide");
      await expect(surface.getByTestId("legacy-defense-geometry-issues")).toHaveText("0");
      expect(await canvasHandle!.evaluate((node) => node === document.querySelector("[data-testid='legacy-defense-qc-canvas']"))).toBe(true);
      await canvas.focus();
      await page.keyboard.press("Space");
      await canvas.click({ position: { x: 30, y: 30 } });
      await expect(surface.getByTestId("legacy-defense-input-counts")).toContainText("keyboard 2");
      await expect(surface.getByTestId("legacy-defense-input-counts")).toContainText("pointer 2");
      await expectNoCompletion(surface, title.expectedStatus);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${title.id} wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });

  test("records Chromium touch input through compact and wide profiles for every title", async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title, title.registrations);
      await expect(surface.getByTestId("legacy-defense-layout-profile")).toHaveText("compact");
      await canvas.scrollIntoViewIfNeeded();
      const compactBox = await canvas.boundingBox();
      expect(compactBox).not.toBeNull();
      await page.touchscreen.tap(compactBox!.x + compactBox!.width * 0.75, compactBox!.y + compactBox!.height * 0.5);
      await expect(surface.getByTestId("legacy-defense-input-counts")).toContainText("touch 1");
      await expectNoCompletion(surface, title.expectedStatus);

      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("legacy-defense-layout-profile")).toHaveText("wide");
      await canvas.scrollIntoViewIfNeeded();
      const wideBox = await canvas.boundingBox();
      expect(wideBox).not.toBeNull();
      await page.touchscreen.tap(wideBox!.x + wideBox!.width * 0.25, wideBox!.y + wideBox!.height * 0.5);
      await expect(surface.getByTestId("legacy-defense-input-counts")).toContainText("touch 2");
      await expectNoCompletion(surface, title.expectedStatus);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${title.id} touch-wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await context.close();
  });
});
