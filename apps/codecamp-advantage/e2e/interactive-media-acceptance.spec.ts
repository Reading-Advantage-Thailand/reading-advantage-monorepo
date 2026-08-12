import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
  getInteractiveMediaAuthGate,
  resolveMediaStorageStatePath,
  selectInteractiveMediaAuthPlan,
  type InteractiveMediaAuthMode,
  type InteractiveMediaAuthPlan,
} from "./interactive-media-auth-gating.js";

const username =
  process.env.PHASE5_MEDIA_TEST_USERNAME ?? process.env.CODECAMP_E2E_USERNAME;
const password =
  process.env.PHASE5_MEDIA_TEST_PASSWORD ?? process.env.CODECAMP_E2E_PASSWORD;
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const storageStatePath = resolveMediaStorageStatePath(
  process.env.CODECAMP_MEDIA_STORAGE_STATE,
  appRoot,
);
const authGate = getInteractiveMediaAuthGate({
  hasUsername: Boolean(username),
  hasPassword: Boolean(password),
  storageStatePath,
});
const hasExplicitAuthInput =
  authGate.hasCompanyStorageState || authGate.hasLegacyCredentials;

if (storageStatePath) {
  test.use({ storageState: storageStatePath });
}

/**
 * Resolves the server authentication mode used by the media acceptance environment.
 * @param page Browser page used to request the authentication mode.
 * @returns The validated server authentication mode.
 */
async function readAuthMode(page: Page): Promise<InteractiveMediaAuthMode> {
  const response = await page.request.get("/api/auth/mode");
  if (!response.ok()) {
    throw new Error(
      `Unable to resolve Codecamp authentication mode (HTTP ${response.status()}).`,
    );
  }
  const payload = (await response.json()) as { mode?: unknown };
  if (payload.mode !== "company" && payload.mode !== "legacy") {
    throw new Error("Codecamp returned an unsupported authentication mode.");
  }
  return payload.mode;
}

/**
 * Authenticates the media fixture through an explicit company session or legacy credentials.
 * @param page Browser page used for the authenticated flow.
 * @param plan Auth path selected after reading the server's auth mode.
 * @returns Resolves after the dashboard is available.
 */
async function login(
  page: Page,
  plan: InteractiveMediaAuthPlan,
): Promise<void> {
  await page.goto("/en/", { waitUntil: "domcontentloaded" });

  if (plan === "company-session") {
    const sessionResponse = await page.request.get("/api/auth/session");
    if (!sessionResponse.ok()) {
      throw new Error(
        `Unable to inspect the company authentication session (HTTP ${sessionResponse.status()}).`,
      );
    }
    const sessionPayload = (await sessionResponse.json()) as {
      session?: { user?: unknown } | null;
    };
    if (!sessionPayload.session?.user) {
      throw new Error(
        "Company authentication requires an approved pre-authenticated Accounts session; no local session was provided.",
      );
    }
    await expect(page.getByText("Overall Progress")).toBeVisible({
      timeout: 30_000,
    });
    return;
  }

  if (plan !== "legacy-credentials") {
    throw new Error(
      "The media fixture has no explicitly configured authentication path.",
    );
  }

  await page.getByLabel("Username", { exact: true }).fill(username!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Overall Progress")).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Phase 5 interactive media browser acceptance", () => {
  test.skip(
    !hasExplicitAuthInput,
    "Set CODECAMP_MEDIA_STORAGE_STATE to an app-contained storage-state file, or provide explicit legacy-mode credentials, to run the authenticated browser check.",
  );

  test("renders a seeded diagram and YouTube embed on a lesson page", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const mode = await readAuthMode(page);
    const plan = selectInteractiveMediaAuthPlan(mode, authGate);
    if (plan === "blocked") {
      test.skip(
        true,
        mode === "company"
          ? "Set CODECAMP_MEDIA_STORAGE_STATE to a readable app-contained Playwright storage-state file for company-mode acceptance."
          : "Set PHASE5_MEDIA_TEST_USERNAME and PHASE5_MEDIA_TEST_PASSWORD (or CODECAMP_E2E_USERNAME/CODECAMP_E2E_PASSWORD) for explicit legacy-mode acceptance.",
      );
      return;
    }
    await login(page, plan);
    await page.goto("/en/module/cloud-docker", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("link", { name: "Docker Basics" }).click();

    const diagram = page.getByRole("img", { name: "Docker Concepts" });
    await expect(diagram).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () =>
        diagram.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);

    const video = page.locator('iframe[title="Docker Concepts"]');
    await expect(video).toBeVisible({ timeout: 30_000 });
    await expect(video).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/Gjnup-PuquQ",
    );
    await expect
      .poll(() =>
        page
          .frames()
          .some((frame) =>
            frame.url().includes("youtube.com/embed/Gjnup-PuquQ"),
          ),
      )
      .toBe(true);
  });
});
