import { expect, test } from "@playwright/test";

test.describe("APK authoring and QC field lab", () => {
  test("recomposes compact and wide controls with real browser input and exposes attribution", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    await expect(page.getByRole("heading", { name: "Cartridge Field Lab" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Composition preview" })).toContainText("compact · pointer-keyboard");
    await expect(page.getByRole("region", { name: "Game result" })).toBeVisible();

    await page.getByRole("button", { name: "wide" }).click();
    await page.getByLabel("Input mode").selectOption("touch");
    await page.getByRole("checkbox", { name: "Safe-region overlays" }).check();
    await expect(page.getByRole("region", { name: "Composition preview" })).toContainText("wide · touch");
    await expect(page.getByTestId("safe-region-overlay").first()).toBeVisible();

    await page.getByLabel("Content fixture").selectOption("thai-long");
    await expect(page.getByText("การเรียนรู้ผ่านการผจญภัย")).toBeVisible();
    await page.getByRole("button", { name: "Pause game" }).click();
    await page.getByRole("button", { name: "Mute game" }).click();
    await page.getByRole("button", { name: "Restart game" }).click();
    await expect(page.getByRole("button", { name: "Resume game" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unmute game" })).toBeVisible();
    await expect(page.getByText(/restart 1/i)).toBeVisible();
    await expect(page.locator("[data-apk-attribution]")).toHaveText("Pixel art assets by ElvGames");

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("heading", { name: "Standard Pack preview" })).toBeVisible();
  });

  test("does not overflow horizontally at compact reference widths including audio preview", async ({ page }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/qc");

      await expect(page.getByRole("heading", { name: "Standard Pack preview" })).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);

      await page.getByLabel("Search semantic metadata").fill("audio");
      await expect(page.getByLabel(/preview audio for/i).first()).toBeAttached();

      const scrollWidthAfterAudio = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidthAfterAudio, `horizontal overflow with audio preview at ${width}px`).toBeLessThanOrEqual(width);
    }
  });
});
