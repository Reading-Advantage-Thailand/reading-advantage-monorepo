import { defineConfig, devices } from "@playwright/test";
import { createHostProofPlaywrightWebServerCommand } from "./host-proof-test-config";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3001);
const BASE_URL = `http://localhost:${PORT}`;

// The takeover test of the service worker (track primary_parity_pwa) needs only a small fixture
// server, not the Next app. `PWA_TAKEOVER=1` runs the `pwa-takeover` project alone with that server.
const PWA_PORT = Number(process.env.PWA_FIXTURE_PORT ?? 3111);
const pwaOnly = process.env.PWA_TAKEOVER === "1";

export default defineConfig(pwaOnly ? {
  testDir: "./tests/pwa",
  testMatch: process.env.PWA_SPEC ?? "takeover.spec.ts",
  reporter: [["list"]],
  projects: [{ name: "pwa-takeover", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "node tests/pwa/fixture-server.mjs",
    url: `http://127.0.0.1:${PWA_PORT}/__pings`,
    reuseExistingServer: false,
    timeout: 30000,
  },
} : {
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
  projects: [
    {
      name: "setup",
      testMatch: "**/*.setup.ts",
    },
    {
      // Visual baselines of the UX rework: signs in by itself, no host-proof storage state.
      name: "visual",
      testMatch: "**/visual-baselines.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: "**/visual-baselines.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
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
