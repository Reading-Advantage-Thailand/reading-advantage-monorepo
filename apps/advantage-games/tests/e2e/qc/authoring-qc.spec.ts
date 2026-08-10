import { expect, test } from "@playwright/test";

test.describe("APK authoring and QC field lab", () => {
  test("recomposes compact and wide controls with real browser input and exposes attribution", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    await expect(page.getByRole("heading", { name: "Cartridge Field Lab" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Composition preview" })).toContainText("compact · pointer-keyboard");
    await expect(page.getByRole("region", { name: "Game result" })).toBeVisible();
    await expect(page.getByTestId("asset-contract-v2-qc-fixture")).toBeVisible();
    await expect(page.getByTestId("asset-contract-v2-scope-note")).toContainText(
      "Contract-only evidence: no resolver result, suitability verdict, or real media rendering.",
    );
    await expect(page.getByTestId("asset-contract-v2-semantic")).toContainText("player:walk");
    await expect(page.getByTestId("asset-contract-v2-physical")).toContainText("exemplar-player-walk-six-frame");
    await expect(page.getByTestId("asset-contract-v2-animation")).toContainText("12 FPS");

    await page.getByRole("button", { name: "wide" }).click();
    await page.getByLabel("Input mode").selectOption("touch");
    await page.getByRole("checkbox", { name: "Safe-region overlays" }).check();
    await expect(page.getByRole("region", { name: "Composition preview" })).toContainText("wide · touch");
    await expect(page.getByTestId("safe-region-overlay").first()).toBeVisible();

    await page.getByLabel("Content fixture").selectOption("thai-long");
    await expect(
      page.getByLabel("Current learning prompt").getByText("การเรียนรู้ผ่านการผจญภัย"),
    ).toBeVisible();
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
      const contractFixture = page.getByTestId("asset-contract-v2-qc-fixture");
      await expect(contractFixture).toBeVisible();
      expect(
        await contractFixture.evaluate((element) => element.scrollWidth <= element.clientWidth),
        `Asset Contract v2 fixture overflow at ${width}px`,
      ).toBe(true);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);

      await page.getByLabel("Search semantic metadata").fill("audio");
      await expect(page.getByLabel(/preview audio for/i).first()).toBeAttached();

      const scrollWidthAfterAudio = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidthAfterAudio, `horizontal overflow with audio preview at ${width}px`).toBeLessThanOrEqual(width);
    }
  });

  test("previews a standard briefing with scoped responsive controls, complete Thai content, and one validated Start transition", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/qc");

    const briefingPreview = page.getByRole("region", { name: "Standard game briefing preview" });
    const dialog = briefingPreview.getByRole("dialog");
    await expect(briefingPreview).toBeVisible();
    await expect(dialog).toHaveAttribute("data-apk-layout-profile", "compact");
    await expect(dialog.getByRole("heading", { name: /objective/i })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /how to play|rules/i })).toBeVisible();
    await expect(dialog.getByText("Arrow keys")).toBeVisible();
    await expect(dialog.getByText("Pointer")).toBeVisible();
    await expect(dialog.getByText("Tap")).toHaveCount(0);

    await page.getByLabel("Content fixture").selectOption("thai-long");
    await expect(dialog.getByText("การเรียนรู้ผ่านการผจญภัย")).toBeVisible();
    await expect(dialog.getByText("learning through adventure")).toBeVisible();
    await expect(dialog.getByText("ความรับผิดชอบต่อสิ่งแวดล้อม")).toBeVisible();
    await expect(dialog.getByText("environmental responsibility")).toBeVisible();
    await expect(briefingPreview.locator("[data-apk-briefing-region='body']")).toHaveCSS("overflow-y", "auto");
    expect(
      await briefingPreview.evaluate((element) => element.scrollWidth <= element.clientWidth),
      "briefing preview horizontal overflow at compact width",
    ).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      "page horizontal overflow at compact width",
    ).toBe(true);

    const keyboardStart = dialog.getByRole("button", { name: /start/i });
    await expect(keyboardStart).toHaveCSS("min-height", "48px");
    await keyboardStart.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(briefingPreview.getByRole("status")).toContainText(/briefing\s*(?:→|->)\s*playing/i);
    await expect(briefingPreview.getByRole("status")).toContainText(/count:\s*1/i);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/qc");
    await page.getByRole("button", { name: "wide" }).click();
    await page.getByLabel("Input mode").selectOption("touch");
    const touchPreview = page.getByRole("region", { name: "Standard game briefing preview" });
    const touchDialog = touchPreview.getByRole("dialog");
    await expect(touchDialog).toHaveAttribute("data-apk-layout-profile", "wide");
    await expect(touchDialog).toHaveAttribute("data-apk-input-mode", "touch");
    await expect(touchDialog.getByText("Tap")).toBeVisible();
    await expect(touchDialog.getByText("Arrow keys")).toHaveCount(0);
    await expect(touchDialog.getByText("Pointer")).toHaveCount(0);
    await touchDialog.getByRole("button", { name: /start/i }).click();
    await expect(touchPreview.getByRole("status")).toContainText(/briefing\s*(?:→|->)\s*playing/i);
    await expect(touchPreview.getByRole("status")).toContainText(/count:\s*1/i);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      "page horizontal overflow at wide width",
    ).toBe(true);
  });
});
