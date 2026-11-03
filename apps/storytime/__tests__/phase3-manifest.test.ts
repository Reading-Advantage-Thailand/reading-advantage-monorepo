// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("Phase 3 test tooling manifest", () => {
  it("declares task tooling from the workspace catalog", () => {
    const manifest = JSON.parse(readFileSync(resolve(app, "package.json"), "utf8"));
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    for (const name of ["tsx", "@playwright/test", "jsdom", "@testing-library/react", "@testing-library/dom", "@testing-library/jest-dom"]) {
      expect(dependencies[name], `Missing ${name}`).toBe("catalog:");
    }
  });
});
