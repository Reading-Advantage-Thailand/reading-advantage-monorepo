import { expect, type Page, test } from "@playwright/test";

const username = process.env.PHASE11_TEST_INTERN_USERNAME;
const password = process.env.PHASE11_TEST_INTERN_PASSWORD;
const hasInternCreds = Boolean(username && password);

async function expectNoHorizontalOverflow(page: Page, projectName: string) {
  const viewport = page.viewportSize();
  expect(viewport, `${projectName} project must define an explicit viewport`).not.toBeNull();

  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    return documentElement.scrollWidth - documentElement.clientWidth;
  });

  expect(
    overflow,
    `${projectName} has horizontal overflow at ${viewport?.width}x${viewport?.height}`,
  ).toBeLessThanOrEqual(1);
}

async function expectAccessibleTapTargets(page: Page, projectName: string) {
  const tooSmallTargets = await page.locator("a, button").evaluateAll((elements) =>
    elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          label: element.textContent?.trim() ?? element.getAttribute("aria-label") ?? element.tagName,
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
        };
      })
      .filter((target) => target.visible && (target.width < 32 || target.height < 32)),
  );

  expect(
    tooSmallTargets,
    `${projectName} has visible tap targets below 32px: ${JSON.stringify(tooSmallTargets)}`,
  ).toEqual([]);
}

test.describe("Phase 11 cross-browser and device rendering", () => {
  test("localized shell renders without horizontal overflow at target viewport", async ({ page }, testInfo) => {
    await page.goto("/en/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("meta[name='viewport']")).toHaveAttribute("content", /width=device-width/);
    await expect(page.locator("body")).toBeVisible();

    await expectNoHorizontalOverflow(page, testInfo.project.name);
    await expectAccessibleTapTargets(page, testInfo.project.name);
  });

  test("chat page auth wall remains responsive on target viewport", async ({ page }, testInfo) => {
    await page.goto("/en/chat", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "AI Tutor" })).toBeVisible();
    await expect(page.getByText("Log in to CodeCamp")).toBeVisible();

    await expectNoHorizontalOverflow(page, testInfo.project.name);
    await expectAccessibleTapTargets(page, testInfo.project.name);
  });

  test("authenticated module page preserves mobile-friendly layout", async ({ page }, testInfo) => {
    test.skip(!hasInternCreds, "Set PHASE11_TEST_INTERN_USERNAME and PHASE11_TEST_INTERN_PASSWORD to run module E2E.");

    await page.goto("/en/", { waitUntil: "domcontentloaded" });
    await page.locator("#dashboard-username").fill(username!);
    await page.locator("#dashboard-password").fill(password!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Overall Progress")).toBeVisible({ timeout: 15_000 });

    await page.goto("/en/module/dev-environment", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Lessons", { exact: true })).toBeVisible();

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length, `${testInfo.project.name} should render real page content`).toBeGreaterThan(100);

    await expectNoHorizontalOverflow(page, testInfo.project.name);
    await expectAccessibleTapTargets(page, testInfo.project.name);
  });
});
