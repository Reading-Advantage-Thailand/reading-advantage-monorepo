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

  it("allows the local Kimi browser origin during development", () => {
    const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf-8");

    expect(source).toMatch(/allowedDevOrigins:\s*\["127\.0\.0\.1"\]/);
  });
});
