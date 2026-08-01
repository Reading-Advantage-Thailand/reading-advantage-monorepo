import { expect, test, type Locator, type Page } from "@playwright/test";

const TITLES = [
  { id: "archers-revenge", title: "Archer's Revenge" },
  { id: "paladins-twin-soul", title: "Paladin's Twin-Soul" },
  { id: "griffin-sky-joust", title: "Griffin Sky-Joust" },
  { id: "gryphon-patrol", title: "Gryphon Patrol" },
  { id: "realm-carver", title: "Realm Carver" },
] as const;

/** Selects one action title from the quarantined `/qc` registration. */
async function selectTitle(page: Page, id: string, title: string): Promise<{ surface: Locator; canvas: Locator }> {
  const surface = page.getByRole("region", { name: "Existing action cartridge QC" });
  await surface.getByLabel("QC cartridge").selectOption(id);
  await expect(surface).toHaveAttribute("data-loaded-cartridge", id);
  const canvas = surface.getByRole("img", { name: `${title} action QC canvas` });
  await expect(canvas).toBeVisible();
  await expect(surface.getByTestId("existing-action-descriptor-registration")).toHaveCount(4);
  return { surface, canvas };
}

/** Asserts that no native-input proof may become an unsupported learning result. */
async function expectProgressionBlocked(surface: Locator): Promise<void> {
  await expect(surface.getByTestId("existing-action-completion-count")).toHaveText("0");
  await expect(surface.getByTestId("existing-action-mechanic-snapshot")).toContainText('"status":"blocked"');
  await expect(surface.getByTestId("existing-action-mechanic-snapshot")).toContainText('"progress":0');
}

test.describe("existing-action cartridge Advantage Games QC", () => {
  test("records real native keyboard and pointer input through compact and wide profiles for all titles", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title);
      await expect(surface.getByTestId("existing-action-layout-profile")).toHaveText("compact");
      await expect(surface.getByTestId("existing-action-geometry-issues")).toHaveText("0");

      await canvas.focus();
      await page.keyboard.press("Enter");
      await canvas.click({ position: { x: 20, y: 20 } });
      await expect(surface.getByTestId("existing-action-input-counts")).toContainText("keyboard 1");
      await expect(surface.getByTestId("existing-action-input-counts")).toContainText("pointer 1");
      await expect(surface.getByTestId("existing-action-blocked-input-count")).toHaveText("2");
      await expectProgressionBlocked(surface);

      const canvasHandle = await canvas.elementHandle();
      expect(canvasHandle).not.toBeNull();
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("existing-action-layout-profile")).toHaveText("wide");
      await expect(surface.getByTestId("existing-action-geometry-issues")).toHaveText("0");
      expect(await canvasHandle!.evaluate((node) => node === document.querySelector("[data-testid='existing-action-qc-canvas']"))).toBe(true);
      await canvas.focus();
      await page.keyboard.press("Space");
      await canvas.click({ position: { x: 30, y: 30 } });
      await expect(surface.getByTestId("existing-action-input-counts")).toContainText("keyboard 2");
      await expect(surface.getByTestId("existing-action-input-counts")).toContainText("pointer 2");
      await expect(surface.getByTestId("existing-action-blocked-input-count")).toHaveText("4");
      await expectProgressionBlocked(surface);

      const wideOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(wideOverflow, `${title.id} wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });

  test("records real native touch input through compact and wide profiles for all titles", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title);
      await expect(surface.getByTestId("existing-action-layout-profile")).toHaveText("compact");
      await canvas.scrollIntoViewIfNeeded();
      const compactBox = await canvas.boundingBox();
      expect(compactBox).not.toBeNull();
      await page.touchscreen.tap(compactBox!.x + compactBox!.width * 0.75, compactBox!.y + compactBox!.height * 0.5);
      await expect(surface.getByTestId("existing-action-input-counts")).toContainText("touch 1");
      await expectProgressionBlocked(surface);

      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("existing-action-layout-profile")).toHaveText("wide");
      await canvas.scrollIntoViewIfNeeded();
      const wideBox = await canvas.boundingBox();
      expect(wideBox).not.toBeNull();
      await page.touchscreen.tap(wideBox!.x + wideBox!.width * 0.25, wideBox!.y + wideBox!.height * 0.5);
      await expect(surface.getByTestId("existing-action-input-counts")).toContainText("touch 2");
      await expect(surface.getByTestId("existing-action-blocked-input-count")).toHaveText("2");
      await expectProgressionBlocked(surface);

      const wideOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(wideOverflow, `${title.id} touch-wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await context.close();
  });
});
