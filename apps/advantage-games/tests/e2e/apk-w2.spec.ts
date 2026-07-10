import { expect, test } from "@playwright/test";

const username = process.env.APK_W2_TEST_USERNAME;
const password = process.env.APK_W2_TEST_PASSWORD;

test.describe("APK Advantage Games Arcade Host W2", () => {
  test("fails closed for unauthenticated production routes", async ({ page }) => {
    await page.goto("/en/student/arcade/dragon-flight");

    await expect(
      page.getByText("Sign in with a student account to play.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("rejects invalid credentials with an accessible error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("not-a-student");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Invalid username or password", { exact: true }),
    ).toBeVisible();
  });

  test("signs in, mounts one cartridge canvas, and persists once", async ({
    context,
    page,
  }, testInfo) => {
    test.skip(!username || !password, "Local W2 student fixture is required");

    await page.goto("/login");
    await page.getByLabel("Username").fill(username!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/student\/arcade\/dragon-flight$/u);
    await expect(
      page.getByRole("heading", { name: "Dragon Flight" }),
    ).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(1);

    const sessionCookie = (await context.cookies()).find(
      (cookie) => cookie.name === "session_token",
    );
    expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });

    await page.screenshot({
      path: testInfo.outputPath("apk-w2-authenticated-mobile.png"),
      fullPage: true,
    });

    const idempotencyKey = crypto.randomUUID();
    const persist = () =>
      page.evaluate(async (key) => {
        const response = await fetch("/api/v1/apk/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameType: "dragon-flight",
            difficulty: "medium",
            score: 420,
            accuracy: 0.8,
            correctAnswers: 8,
            totalAttempts: 10,
            duration: 12_345,
            victory: true,
            idempotencyKey: key,
            clientTimestamp: Date.now(),
            metadata: { editionId: "primary-chibi" },
          }),
        });
        return { status: response.status, body: await response.json() };
      }, idempotencyKey);

    const first = await persist();
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ duplicate: false, status: 200 });

    const duplicate = await persist();
    expect(duplicate.status).toBe(200);
    expect(duplicate.body).toMatchObject({
      duplicate: true,
      status: 200,
      xpEarned: 0,
    });
  });
});
