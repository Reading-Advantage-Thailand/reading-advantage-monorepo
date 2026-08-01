import { expect, test, type Locator, type Page } from "@playwright/test";

const TITLES = [
  { id: "dragon-rider", title: "Dragon Rider", descriptors: 4 },
  { id: "spellweavers-run", title: "Spellweaver's Run", descriptors: 3 },
  { id: "shadow-gate-dungeon", title: "Shadow Gate Dungeon", descriptors: 4 },
  { id: "labyrinth-goblin-king", title: "Labyrinth of the Goblin King", descriptors: 4 },
  { id: "griffin-riders-escape", title: "Griffin Rider's Escape", descriptors: 4 },
] as const;

/** Selects a traversal title from the isolated Advantage Games `/qc` registry. */
async function selectTitle(page: Page, id: string, title: string, descriptors: number): Promise<{ surface: Locator; canvas: Locator }> {
  const surface = page.getByRole("region", { name: "Legacy traversal cartridge QC" });
  await surface.getByLabel("QC cartridge").selectOption(id);
  await expect(surface).toHaveAttribute("data-loaded-cartridge", id);
  const canvas = surface.getByRole("img", { name: `${title} traversal QC canvas` });
  await expect(canvas).toBeVisible();
  await expect(surface.getByTestId("legacy-traversal-descriptor-registration")).toHaveCount(descriptors);
  await expect(surface.getByTestId("legacy-traversal-mechanic-snapshot")).toContainText("claimIds");
  return { surface, canvas };
}

/** Asserts that native evidence remains local and cannot emit a host completion. */
async function expectHostQuarantine(surface: Locator): Promise<void> {
  await expect(surface.getByTestId("legacy-traversal-host-completion-count")).toHaveText("0");
  await expect(surface.getByTestId("legacy-traversal-mechanic-snapshot")).toContainText("claimIds");
}

test.describe("legacy traversal cartridge Advantage Games QC", () => {
  test.setTimeout(90_000);

  test("proves native keyboard and pointer input through compact, resize, and wide layouts", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title, title.descriptors);
      await expect(surface.getByTestId("legacy-traversal-layout-profile")).toHaveText("compact");
      await expect(surface.getByTestId("legacy-traversal-geometry-issues")).toHaveText("0");

      const canvasHandle = await canvas.elementHandle();
      expect(canvasHandle).not.toBeNull();
      await canvas.scrollIntoViewIfNeeded();
      await canvas.focus();
      await page.keyboard.press("ArrowRight");
      await canvas.click({ position: { x: 20, y: 20 } });
      await expect(surface.getByTestId("legacy-traversal-input-counts")).toContainText("keyboard 1");
      await expect(surface.getByTestId("legacy-traversal-input-counts")).toContainText("pointer 1");
      await expectHostQuarantine(surface);

      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("legacy-traversal-layout-profile")).toHaveText("wide");
      await expect(surface.getByTestId("legacy-traversal-geometry-issues")).toHaveText("0");
      expect(await canvasHandle!.evaluate((node) => node === document.querySelector("[data-testid='legacy-traversal-qc-canvas']"))).toBe(true);
      await canvas.focus();
      await page.keyboard.press("Enter");
      await canvas.click({ position: { x: 30, y: 30 } });
      await expect(surface.getByTestId("legacy-traversal-input-counts")).toContainText("keyboard 2");
      await expect(surface.getByTestId("legacy-traversal-input-counts")).toContainText("pointer 2");
      await expectHostQuarantine(surface);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${title.id} wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });

  test("proves native touch input through compact and wide layouts without host completion", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title, title.descriptors);
      await expect(surface.getByTestId("legacy-traversal-layout-profile")).toHaveText("compact");
      await canvas.scrollIntoViewIfNeeded();
      const compactBox = await canvas.boundingBox();
      expect(compactBox).not.toBeNull();
      await page.touchscreen.tap(compactBox!.x + compactBox!.width * 0.75, compactBox!.y + compactBox!.height * 0.5);
      await expect(surface.getByTestId("legacy-traversal-input-counts")).toContainText("touch 1");
      await expectHostQuarantine(surface);

      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("legacy-traversal-layout-profile")).toHaveText("wide");
      await canvas.scrollIntoViewIfNeeded();
      const wideBox = await canvas.boundingBox();
      expect(wideBox).not.toBeNull();
      await page.touchscreen.tap(wideBox!.x + wideBox!.width * 0.25, wideBox!.y + wideBox!.height * 0.5);
      await expect(surface.getByTestId("legacy-traversal-input-counts")).toContainText("touch 2");
      await expectHostQuarantine(surface);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${title.id} touch-wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await context.close();
  });
});
