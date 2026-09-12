import { test } from "@playwright/test";

import { verifyAuthenticatedMagicDefenseLifecycle } from "../../../advantage-games/tests/e2e/apk/authenticated-magic-defense-lifecycle";

test.describe("real authenticated APK lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("Magic Defense loads student content, saves Replay, and exits", async ({ page }) => {
    test.skip(
      process.env.APK_E2E_AUTHENTICATED_LIFECYCLE !== "true",
      "Set APK_E2E_AUTHENTICATED_LIFECYCLE=true for the isolated local database flow.",
    );
    await verifyAuthenticatedMagicDefenseLifecycle(page, {
      gamePath: "/th/student/games/apk/magic-defense",
      catalogPath: "/th/student/games",
    });
  });
});
