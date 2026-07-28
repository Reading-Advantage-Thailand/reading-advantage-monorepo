import { expect, test, type Locator, type Page } from "@playwright/test";

const TITLES = [
  {
    id: "dragon-flight",
    title: "Dragon Flight",
    assets: [
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
    ],
  },
  {
    id: "magic-defense",
    title: "Magic Defense",
    assets: [
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "ui/20x20/inventory/slot",
      "ui/32x32/items/armor-icons",
    ],
  },
  {
    id: "dungeon-liberator",
    title: "Dungeon Liberator",
    assets: [
      "effects/32x32/combat/hit-01",
      "side-view/32x32/characters/enemy-001-idle",
      "top-down/32x32/characters/hero-01",
      "ui/16x16/controls/gamepad-buttons",
    ],
  },
  {
    id: "sorcerer-ziggurat",
    title: "The Sorcerer's Ziggurat",
    assets: [
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
      "ui/16x16/controls/gamepad-buttons",
    ],
  },
  {
    id: "astral-mage",
    title: "Astral Mage",
    assets: [
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
    ],
  },
] as const;

const FIXTURES = [
  ["english-short", "river"],
  ["english-long", "environmental responsibility through collaborative problem solving"],
  ["thai-short", "แม่น้ำ"],
  ["thai-long", "ความรับผิดชอบต่อสิ่งแวดล้อมผ่านการเรียนรู้ร่วมกัน"],
] as const;

async function verifyFixtures(surface: Locator) {
  for (const [fixture, expectedText] of FIXTURES) {
    await surface.getByLabel("Cartridge proof fixture").selectOption(fixture);
    const fixtureText = surface.getByTestId("existing-core-fixture-text");
    await expect(fixtureText).toContainText(expectedText);
    expect(await fixtureText.evaluate((element) =>
      element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1,
    ), `${fixture} text overflow`).toBe(true);
  }
}

async function selectTitle(page: Page, id: string, title: string) {
  const surface = page.getByRole("region", { name: "Existing-core cartridge QC" });
  await surface.getByLabel("QC cartridge").selectOption(id);
  await expect(surface).toHaveAttribute("data-loaded-cartridge", id);
  const canvas = surface.getByRole("img", { name: `${title} QC canvas` });
  await expect(canvas).toBeVisible();
  await expect(surface.getByTestId("existing-core-qc-canvas")).toHaveCount(1);
  return { surface, canvas };
}

test.describe("existing-core cartridge Advantage Games QC", () => {
  test("proves compact and wide one-canvas real keyboard and pointer behavior for all five titles", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title);
      await expect(surface.getByTestId("existing-core-layout-profile")).toHaveText("compact");
      await expect(surface.getByTestId("existing-core-geometry-issues")).toHaveText("0");

      await verifyFixtures(surface);

      const selectedKeys = await surface.getByTestId("existing-core-selected-asset").evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-selected-asset-key")),
      );
      expect(selectedKeys).toEqual(title.assets);
      await expect(surface.getByTestId("existing-core-delivery-count")).toHaveText(`${title.assets.length} of 43075`);
      await surface.getByTestId("existing-core-selected-asset").first().scrollIntoViewIfNeeded();
      await expect.poll(() => surface.locator("[data-testid='existing-core-selected-asset'] img").evaluateAll((images) =>
        images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
      )).toBe(true);
      expect(await surface.locator("[data-testid='existing-core-selected-asset'] audio").evaluateAll((audio) =>
        audio.every((element) => (element as HTMLAudioElement).src.includes("/assets/apk/standard-pack-qc/")),
      )).toBe(true);

      const canvasHandle = await canvas.elementHandle();
      expect(canvasHandle).not.toBeNull();
      await canvas.focus();
      await page.keyboard.press("Enter");
      await expect(surface.getByTestId("existing-core-input-counts")).toContainText("keyboard 1");
      const compactMechanic = await surface.getByTestId("existing-core-mechanic-snapshot").textContent();

      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(surface.getByTestId("existing-core-layout-profile")).toHaveText("wide");
      await expect(surface.getByTestId("existing-core-geometry-issues")).toHaveText("0");
      await verifyFixtures(surface);
      expect(await canvasHandle!.evaluate((node) => node === document.querySelector("[data-testid='existing-core-qc-canvas']"))).toBe(true);
      expect(await surface.getByTestId("existing-core-mechanic-snapshot").textContent()).toBe(compactMechanic);

      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await canvas.click({ position: { x: box!.width * 0.75, y: box!.height * 0.5 } });
      await expect(surface.getByTestId("existing-core-input-counts")).toContainText("pointer 1");
      await canvas.focus();
      await page.keyboard.press("KeyC");
      await page.keyboard.press("KeyC");
      await expect(surface.getByTestId("existing-core-completion-count")).toHaveText("1");

      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(horizontalOverflow, `${title.id} wide horizontal overflow`).toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(surface.getByTestId("existing-core-layout-profile")).toHaveText("compact");
      const compactOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(compactOverflow, `${title.id} compact horizontal overflow`).toBeLessThanOrEqual(0);
    }

    const deliveredAssetUrls = await page.evaluate(() => [...new Set(
      performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => url.includes("/assets/apk/standard-pack-qc/")),
    )]);
    expect(deliveredAssetUrls.length).toBeGreaterThan(0);
    expect(deliveredAssetUrls.length).toBeLessThanOrEqual(7);
    expect(deliveredAssetUrls.every((url) => /\/asset-[a-f0-9]+\.(?:png|ogg)$/u.test(url))).toBe(true);
    expect(deliveredAssetUrls.some((url) => url.includes("standard-pack-release"))).toBe(false);
  });

  test("proves real touch input at 390x844 for all five titles", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/qc");

    for (const title of TITLES) {
      const { surface, canvas } = await selectTitle(page, title.id, title.title);
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await page.touchscreen.tap(box!.x + box!.width * 0.75, box!.y + box!.height * 0.5);
      await expect(surface.getByTestId("existing-core-input-counts")).toContainText("touch 1");
      await expect(surface.getByTestId("existing-core-layout-profile")).toHaveText("compact");
      await expect(surface.getByTestId("existing-core-geometry-issues")).toHaveText("0");
    }

    await context.close();
  });
});
