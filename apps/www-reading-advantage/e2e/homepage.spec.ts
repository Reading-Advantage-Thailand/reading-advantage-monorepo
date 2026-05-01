import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("navigates to homepage and shows Reading Advantage heading", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(
      page.getByRole("heading", { name: "Reading Advantage", exact: true }),
    ).toBeVisible();
  });

  test("click Products nav link navigates to products page", async ({
    page,
  }) => {
    await page.goto("/en");
    await page
      .getByRole("link", { name: /products/i })
      .first()
      .click();
    await expect(page).toHaveURL(/.*\/en\/products/);
  });
});
