import { defineConfig, devices } from "@playwright/test";
import { createHostProofPlaywrightWebServerCommand } from "./host-proof-test-config";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;
const DIST_DIR = `.next/host-proof-${PORT}`;
const RESULTS_PATH = process.env.HOST_PROOF_TEST_RESULTS_PATH
  ?? "test-results/host-proof-results.json";
const AUTH_FILE = process.env.HOST_PROOF_TEST_AUTH_FILE
  ?? "playwright/.auth/host-proof-reading-student.json";
const OUTPUT_DIR = process.env.HOST_PROOF_TEST_OUTPUT_DIR ?? "test-results";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: OUTPUT_DIR,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    [process.env.CI ? "dot" : "list"],
    ["json", { outputFile: RESULTS_PATH }],
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
        storageState: AUTH_FILE,
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
    timeout: 300_000,
  },
});
