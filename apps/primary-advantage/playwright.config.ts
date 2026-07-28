import { defineConfig, devices } from "@playwright/test";
import { createHostProofPlaywrightWebServerCommand } from "./host-proof-test-config";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3001);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["dot"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    viewport: {
      width: 390,
      height: 844,
    },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
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
        storageState: "playwright/.auth/host-proof-student.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: createHostProofPlaywrightWebServerCommand(PORT),
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
