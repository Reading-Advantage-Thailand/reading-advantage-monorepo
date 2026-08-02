import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import playwrightConfig from "../../playwright.config";

describe("Primary host-proof Playwright configuration", () => {
  it("runs the authenticated Chromium host proof in a touch-capable browser context", () => {
    const chromiumProject = playwrightConfig.projects?.find(
      (project) => project.name === "chromium",
    );

    expect(chromiumProject?.use).toEqual(expect.objectContaining({ hasTouch: true }));
  });

  it("writes a Primary-specific JSON result artifact", () => {
    expect(playwrightConfig.reporter).toEqual(
      expect.arrayContaining([
        ["json", { outputFile: "test-results/host-proof-results.json" }],
      ]),
    );
  });

  it("allows browser-proof report and auth artifacts to be redirected outside the app worktree", () => {
    const configSource = readFileSync(resolve(process.cwd(), "playwright.config.ts"), "utf-8");
    const setupSource = readFileSync(
      resolve(process.cwd(), "tests/e2e/host-proof-auth.setup.ts"),
      "utf-8",
    );

    expect(configSource).toContain("process.env.HOST_PROOF_TEST_RESULTS_PATH");
    expect(configSource).toContain("process.env.HOST_PROOF_TEST_AUTH_FILE");
    expect(configSource).toContain("process.env.HOST_PROOF_TEST_OUTPUT_DIR");
    expect(setupSource).toContain("process.env.HOST_PROOF_TEST_AUTH_FILE");
    expect(setupSource).toContain('import { dirname } from "node:path"');
    expect(setupSource).toContain("mkdirSync(dirname(authFile)");
  });

  it("keeps the isolated host-proof startup timeout bounded at five minutes", () => {
    const webServer = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer[0]
      : playwrightConfig.webServer;

    expect(webServer?.timeout).toBe(300_000);
  });

  it("uses a requested output directory so its browser server cannot reuse the normal Next build", () => {
    const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf-8");
    const webServer = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer[0]
      : playwrightConfig.webServer;

    expect(source).toContain('distDir: process.env.NEXT_DIST_DIR ?? ".next"');
    expect(webServer?.command).toContain("NEXT_DIST_DIR=.next/host-proof-3001");
  });

  it("allows the local Kimi browser origin during development", () => {
    const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf-8");

    expect(source).toMatch(/allowedDevOrigins:\s*\["127\.0\.0\.1"\]/);
  });
});
