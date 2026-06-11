import { expect, test } from "@playwright/test";

const username = process.env.PHASE10_TEST_INTERN_USERNAME;
const password = process.env.PHASE10_TEST_INTERN_PASSWORD;
const hasInternCreds = Boolean(username && password);

test.describe("Phase 10 concurrent browser sessions", () => {
  test.skip(!hasInternCreds, "Set PHASE10_TEST_INTERN_USERNAME and PHASE10_TEST_INTERN_PASSWORD to run prod session E2E.");

  test("two browser contexts can log in concurrently without session conflicts", async ({ browser }) => {
    const [firstContext, secondContext] = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);

    try {
      const [firstPage, secondPage] = await Promise.all([
        firstContext.newPage(),
        secondContext.newPage(),
      ]);

      await Promise.all([firstPage.goto("/en/"), secondPage.goto("/en/")]);

      await Promise.all([
        firstPage.locator("#dashboard-username").fill(username!),
        secondPage.locator("#dashboard-username").fill(username!),
      ]);
      await Promise.all([
        firstPage.locator("#dashboard-password").fill(password!),
        secondPage.locator("#dashboard-password").fill(password!),
      ]);
      await Promise.all([
        firstPage.getByRole("button", { name: "Log in" }).click(),
        secondPage.getByRole("button", { name: "Log in" }).click(),
      ]);

      await Promise.all([
        expect(firstPage.getByText("Overall Progress")).toBeVisible({ timeout: 15_000 }),
        expect(secondPage.getByText("Overall Progress")).toBeVisible({ timeout: 15_000 }),
      ]);

      const [firstSession, secondSession] = await Promise.all([
        firstPage.request.get("/api/auth/session"),
        secondPage.request.get("/api/auth/session"),
      ]);

      expect(firstSession.status()).toBe(200);
      expect(secondSession.status()).toBe(200);

      const [firstBody, secondBody] = await Promise.all([
        firstSession.json(),
        secondSession.json(),
      ]);

      expect(firstBody.session?.user?.id).toBeTruthy();
      expect(secondBody.session?.user?.id).toBe(firstBody.session?.user?.id);
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()]);
    }
  });
});
