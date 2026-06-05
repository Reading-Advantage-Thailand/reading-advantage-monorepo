import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, "..", "..");
const REPO_ROOT = resolve(PKG_ROOT, "..", "..");

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Phase 0: Setup invariants for @reading-advantage/ai", () => {
  describe("Task 1: packages/ai/ scaffold", () => {
    it("packages/ai/package.json exists and names the workspace package", () => {
      const pkg = readJson(resolve(PKG_ROOT, "package.json"));
      expect(pkg.name).toBe("@reading-advantage/ai");
      expect(pkg.private).toBe(true);
    });

    it("packages/ai/tsconfig.json extends the shared monorepo config", () => {
      const tsconfig = readJson(resolve(PKG_ROOT, "tsconfig.json"));
      expect(tsconfig.extends).toBe("@reading-advantage/config/tsconfig");
    });

    it("packages/ai/src/index.ts barrel exists", () => {
      expect(existsSync(resolve(PKG_ROOT, "src", "index.ts"))).toBe(true);
    });

    it("barrel re-exports the public Phase 0/1 surface", async () => {
      const mod = await import("../index.js");
      expect(mod).toHaveProperty("createAIClient");
      expect(mod).toHaveProperty("getAIClient");
      expect(mod).toHaveProperty("resetAIClient");
      expect(mod).toHaveProperty("AIClientError");
      expect(mod).toHaveProperty("ProviderNotConfiguredError");
      expect(mod).toHaveProperty("SchemaValidationError");
    });
  });

  describe("Task 2: provider SDK dependencies pinned", () => {
    it("packages/ai/package.json declares ai, @ai-sdk/openai, @ai-sdk/google as dependencies", () => {
      const pkg = readJson(resolve(PKG_ROOT, "package.json"));
      const deps = (pkg.dependencies ?? {}) as Record<string, string>;
      expect(deps).toHaveProperty("ai");
      expect(deps).toHaveProperty("@ai-sdk/openai");
      expect(deps).toHaveProperty("@ai-sdk/google");
      expect(deps).toHaveProperty("zod");
    });

    it("packages/ai/package.json pins zod to the monorepo-wide version", () => {
      const pkg = readJson(resolve(PKG_ROOT, "package.json"));
      const deps = (pkg.dependencies ?? {}) as Record<string, string>;
      expect(deps.zod).toMatch(/^\^?3\./);
    });
  });

  describe("Task 3: monorepo workspace registration", () => {
    it("pnpm-workspace.yaml includes packages/*", () => {
      const yaml = readText(resolve(REPO_ROOT, "pnpm-workspace.yaml"));
      expect(yaml).toMatch(/packages\/\*/);
    });

    it("packages/ai/node_modules is populated (pnpm install ran for this package)", () => {
      // Phase 0 task 3 requires the workspace to be installed end-to-end.
      // A populated local node_modules is the simplest cross-platform proof
      // pnpm has linked the package into the workspace.
      const localNm = resolve(PKG_ROOT, "node_modules");
      expect(existsSync(localNm)).toBe(true);
      expect(existsSync(resolve(localNm, "vitest"))).toBe(true);
      expect(existsSync(resolve(localNm, "zod"))).toBe(true);
    });
  });

  describe("Task 4: Phase 0 build smoke (per test-strategy.md §1)", () => {
    it("`pnpm -F @reading-advantage/ai build` succeeds with no tsc errors", () => {
      // Per measure/tracks/ai_adapter_package_20260603/test-strategy.md §1,
      // the Phase 0 integration test is the build smoke. We run `tsc --noEmit`
      // from the package root to assert the compile gate is green before
      // any later phase work proceeds.
      let exitCode = 0;
      let stderr = "";
      try {
        execSync("./node_modules/.bin/tsc --noEmit", {
          cwd: PKG_ROOT,
          stdio: "pipe",
          encoding: "utf8",
        });
      } catch (error) {
        const err = error as { status?: number; stderr?: Buffer; stdout?: Buffer };
        exitCode = err.status ?? 1;
        stderr =
          (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? "");
      }
      expect(
        exitCode,
        `tsc exited ${exitCode}; output:\n${stderr}`
      ).toBe(0);
    });
  });
});
