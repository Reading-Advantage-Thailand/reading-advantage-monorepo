import { defineConfig, devices } from "@playwright/test";
import { createHostProofPlaywrightWebServerCommand } from "./host-proof-test-config";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;
const DIST_DIR = `.next/host-proof-${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    [process.env.CI ? "dot" : "list"],
    ["json", { outputFile: "test-results/host-proof-results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: {
      width: 390,
      height: 844,
    },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  expect: {
    timeout: 15_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/*.setup.ts",
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
        storageState: "playwright/.auth/host-proof-reading-student.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: createHostProofPlaywrightWebServerCommand(PORT).replace(
      `NEXT_DIST_DIR=.next/host-proof-${PORT}`,
      `NEXT_DIST_DIR=${DIST_DIR}`,
    ),
    url: `${BASE_URL}/api/auth/session`,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
