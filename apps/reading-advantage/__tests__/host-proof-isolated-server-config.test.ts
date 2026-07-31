/**
 * @jest-environment node
 */

describe("host-proof isolated server configuration", () => {
  const originalDistDir = process.env.NEXT_DIST_DIR;
  const originalPlaywrightPort = process.env.PLAYWRIGHT_PORT;

  afterEach(() => {
    if (originalDistDir === undefined) {
      delete process.env.NEXT_DIST_DIR;
    } else {
      process.env.NEXT_DIST_DIR = originalDistDir;
    }

    if (originalPlaywrightPort === undefined) {
      delete process.env.PLAYWRIGHT_PORT;
    } else {
      process.env.PLAYWRIGHT_PORT = originalPlaywrightPort;
    }

    jest.resetModules();
  });

  it("keeps the normal Next output directory when no isolated directory is requested", async () => {
    delete process.env.NEXT_DIST_DIR;
    jest.resetModules();

    const { default: nextConfig } = await import("../next.config");

    expect(nextConfig.distDir).toBe(".next");
  });

  it("uses the requested ignored output directory for a concurrent host-proof server", async () => {
    process.env.NEXT_DIST_DIR = ".next/host-proof-3107";
    jest.resetModules();

    const { default: nextConfig } = await import("../next.config");

    expect(nextConfig.distDir).toBe(".next/host-proof-3107");
  });

  it("starts Playwright's dedicated server with a port-scoped isolated output directory", async () => {
    process.env.PLAYWRIGHT_PORT = "3107";
    jest.resetModules();

    const { default: playwrightConfig } = await import("../playwright.config");
    const webServer = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer[0]
      : playwrightConfig.webServer;

    expect(webServer?.command).toContain("scripts/seed-host-proof-session.ts");
    expect(webServer?.command).toContain("NEXT_DIST_DIR=.next/host-proof-3107");
    expect(webServer?.command).toContain("HOST_PROOF_ENABLED=true");
    expect(webServer?.command).toContain("PORT=3107");
    expect(webServer?.url).toBe("http://localhost:3107/api/auth/session");
    expect(playwrightConfig.projects?.find((project) => project.name === "chromium")?.use).toEqual(
      expect.objectContaining({ hasTouch: true }),
    );
    expect(playwrightConfig.reporter).toEqual(
      expect.arrayContaining([
        ["json", { outputFile: "test-results/host-proof-results.json" }],
      ]),
    );
    expect(playwrightConfig.projects?.find((project) => project.name === "setup")).toEqual(
      expect.objectContaining({ testMatch: "**/*.setup.ts" }),
    );
    expect(playwrightConfig.projects?.find((project) => project.name === "chromium")).toEqual(
      expect.objectContaining({ dependencies: ["setup"] }),
    );
  });
});
