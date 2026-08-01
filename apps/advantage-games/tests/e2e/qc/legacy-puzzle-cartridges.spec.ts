import { expect, test, type Locator, type Page } from "@playwright/test";

const TITLES = [
  { id: "enchanted-library", title: "Enchanted Library", asset: "side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747" },
  { id: "rune-match", title: "Rune Match", asset: "ui/20x20/inventory/slot" },
  { id: "alchemists-synthesis", title: "Alchemist's Synthesis", asset: "effects/32x32/combat/hit-01" },
  { id: "potion-rush", title: "Potion Rush", asset: "ui/16x16/controls/gamepad-buttons" },
  { id: "rune-forge-chamber", title: "Rune Forge Chamber", asset: "top-down/32x32/characters/hero-01" },
] as const;

/** Selects one title from the Legacy Puzzle `/qc`-only registration. */
async function selectTitle(page: Page, id: string, title: string): Promise<{ surface: Locator; canvas: Locator }> {
  const surface = page.getByRole("region", { name: "Legacy Puzzle cartridge QC" });
  await surface.getByLabel("QC cartridge").selectOption(id);
  await expect(surface).toHaveAttribute("data-loaded-cartridge", id);
  const canvas = surface.getByRole("img", { name: `${title} puzzle QC canvas` });
  await expect(canvas).toBeVisible();
  return { surface, canvas };
}

test.describe("Legacy Puzzle Advantage Games QC", () => {
  test("proves Chromium compact/wide accessibility, keyboard, pointer, and selected media for every quarantined title", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");
    const selectedMediaUrls = new Set<string>();

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title);
      await expect(surface.getByTestId("legacy-puzzle-layout-profile")).toHaveText("compact");
      await expect(surface.getByTestId("legacy-puzzle-geometry-issues")).toHaveText("0");
      await expect(canvas).toHaveAttribute("tabindex", "0");
      await expect(surface.getByTestId("legacy-puzzle-claim-ids")).not.toHaveText("[]");

      const selected = surface.getByTestId("legacy-puzzle-selected-asset");
      await expect(selected).toHaveCount(1);
      await expect(selected).toHaveAttribute("data-selected-asset-key", title.asset);
      const selectedImage = selected.getByRole("img", { name: `Selected Legacy Puzzle QC asset ${title.asset}` });
      await expect(selectedImage).toBeVisible();
      await selected.scrollIntoViewIfNeeded();
      await expect.poll(() => selected.locator("img").evaluateAll((images) => images.every((image) => (
        (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
      )))).toBe(true);
      const selectedMediaUrl = await selectedImage.getAttribute("src");
      expect(selectedMediaUrl).toMatch(/^\/assets\/apk\/standard-pack-qc\/asset-[a-f0-9]+\.png$/u);
      selectedMediaUrls.add(selectedMediaUrl!);

      await canvas.focus();
      await page.keyboard.press("Enter");
      await expect(surface.getByTestId("legacy-puzzle-input-counts")).toContainText("keyboard 1");
      await canvas.click({ position: { x: 30, y: 30 } });
      await expect(surface.getByTestId("legacy-puzzle-input-counts")).toContainText("pointer 1");
      await expect(surface.getByTestId("legacy-puzzle-last-actions")).not.toHaveText("none");

      const canvasHandle = await canvas.elementHandle();
      expect(canvasHandle).not.toBeNull();
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("legacy-puzzle-layout-profile")).toHaveText("wide");
      await expect(surface.getByTestId("legacy-puzzle-geometry-issues")).toHaveText("0");
      expect(await canvasHandle!.evaluate((node) => node === document.querySelector("[data-testid='legacy-puzzle-qc-canvas']"))).toBe(true);
      const wideOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(wideOverflow, `${title.id} wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
      const compactOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(compactOverflow, `${title.id} compact horizontal overflow`).toBeLessThanOrEqual(0);
    }

    const loadedResourceUrls = await page.evaluate(() => [...new Set(
      performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => url.includes("/assets/apk/standard-pack-qc/")),
    )]);
    expect(selectedMediaUrls.size).toBe(TITLES.length);
    expect([...selectedMediaUrls].every((url) => loadedResourceUrls.includes(new URL(url, page.url()).href))).toBe(true);
  });

  test("proves Chromium native touch dispatch at the compact reference viewport", async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title);
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await expect(surface.getByTestId("legacy-puzzle-input-counts")).toContainText("touch 1");
      await expect(surface.getByTestId("legacy-puzzle-layout-profile")).toHaveText("compact");
    }

    await context.close();
  });
});
