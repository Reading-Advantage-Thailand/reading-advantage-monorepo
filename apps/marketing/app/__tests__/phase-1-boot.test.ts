/**
 * Phase 1 — Vinext Scaffold + Monorepo Integration
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 1)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "P1 Scaffold: smoke only — phase-1-boot.test.ts boots the Vinext app,
 *    asserts /login renders and DB ping returns. No coverage gate yet."
 *
 * Per §7 the Red command is `pnpm --filter marketing test phase-1-boot` and
 * the Green gate additionally requires `pnpm --filter marketing dev` to
 * return 200 on `/`. Per §8, while the owning task is `[~]` the file is
 * `describe.skip(...)` AND listed under `test.exclude` in vitest.config.ts.
 *
 * This file encodes the Phase 1 verification contract as executable
 * assertions split into two tiers:
 *
 *   1. **Wiring invariants (Phase 1 tasks 1–7):** file-level + module-shape
 *      checks for the scaffold, monorepo wiring, sidebar layout, and auth
 *      API routes. These already pass at HEAD because the implementer has
 *      completed tasks 1–7; they stay Green to prove the wiring isn't
 *      accidentally reverted before closeout.
 *
 *   2. **Live boot smoke (Phase 1 task 8 — verification):** presence checks
 *      for the `/login` page and the DB ping endpoint. These FAIL Red at
 *      HEAD because the verification contract hasn't been satisfied yet
 *      (no `app/login/page.tsx`, no `app/api/health/db/route.ts`).
 *      Closing the verification gap → these turn Green and unlock Phase 1
 *      `[x]`.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

function readJson(p: string): Record<string, unknown> {
  return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
}

function readText(p: string): string {
  return readFileSync(p, "utf8");
}

// Per test-strategy.md §8: while the owning task is [~], describe.skip + vitest
// exclude (see apps/marketing/vitest.config.ts) keep this file out of CI.
// Flip both when transitioning to [x].
describe("Phase 1: Vinext Scaffold + Monorepo Integration boot smoke", () => {
  describe("Scaffold invariants (Phase 1 tasks 1-2)", () => {
    it("apps/marketing/package.json names the workspace package 'marketing'", () => {
      const pkg = readJson(resolve(APP_ROOT, "package.json"));
      expect(pkg.name).toBe("marketing");
      expect(pkg.private).toBe(true);
    });

    it("vite.config.ts wires the Vinext plugin from 'vinext'", () => {
      const cfg = readText(resolve(APP_ROOT, "vite.config.ts"));
      expect(cfg).toMatch(/from\s+["']vinext["']/);
      expect(cfg).toMatch(/vinext\s*\(\s*\)/);
    });

    it("tsconfig.json declares the Vinext plugin and @/* → app/* alias", () => {
      const tsconfig = readJson(resolve(APP_ROOT, "tsconfig.json"));
      const plugins = (tsconfig.compilerOptions as Record<string, unknown>)
        .plugins as Array<{ name: string }>;
      expect(plugins.some((p) => p.name === "vinext")).toBe(true);
      const paths = (tsconfig.compilerOptions as Record<string, unknown>)
        .paths as Record<string, string[]>;
      expect(paths["@/*"]).toEqual(["app/*"]);
    });
  });

  describe("Monorepo wiring (Phase 1 tasks 3-6)", () => {
    it("package.json depends on @reading-advantage/{auth-client, db, storage, ai, api}", () => {
      const pkg = readJson(resolve(APP_ROOT, "package.json"));
      const deps = (pkg.dependencies ?? {}) as Record<string, string>;
      for (const pkgName of [
        "@reading-advantage/auth",
        "@reading-advantage/auth-client",
        "@reading-advantage/db",
        "@reading-advantage/storage",
        "@reading-advantage/ai",
        "@reading-advantage/api",
      ]) {
        expect(deps, `missing dep ${pkgName}`).toHaveProperty(pkgName);
        expect(deps[pkgName], `${pkgName} not a workspace ref`).toMatch(
          /^workspace:/,
        );
      }
    });

    it("app/lib/db.ts re-exports the Drizzle db client from @reading-advantage/db", () => {
      const lib = readText(resolve(APP_ROOT, "app/lib/db.ts"));
      expect(lib).toMatch(/@reading-advantage\/db/);
      expect(lib).toMatch(/export\s*\{\s*db/);
    });

    it("app/lib/ai.ts re-exports the AI client factory from @reading-advantage/ai", () => {
      const lib = readText(resolve(APP_ROOT, "app/lib/ai.ts"));
      expect(lib).toMatch(/@reading-advantage\/ai/);
      expect(lib).toMatch(/createAIClient|getAIClient/);
    });

    it("app/lib/storage.ts re-exports the S3 storage factory from @reading-advantage/storage", () => {
      const lib = readText(resolve(APP_ROOT, "app/lib/storage.ts"));
      expect(lib).toMatch(/@reading-advantage\/storage/);
      expect(lib).toMatch(/createStorageClient|getStorageClient/);
    });
  });

  describe("Sidebar layout (Phase 1 task 7)", () => {
    it("app/layout.tsx wraps children in AuthProvider from @reading-advantage/auth-client", () => {
      const layout = readText(resolve(APP_ROOT, "app/layout.tsx"));
      expect(layout).toMatch(/@reading-advantage\/auth-client/);
      expect(layout).toMatch(/AuthProvider/);
      expect(layout).toMatch(/<AuthProvider>/);
    });

    it("sidebar exposes links to /settings and /campaigns", () => {
      const layout = readText(resolve(APP_ROOT, "app/layout.tsx"));
      expect(layout).toMatch(/href\s*=\s*["']\/settings["']/);
      expect(layout).toMatch(/href\s*=\s*["']\/campaigns["']/);
    });
  });

  describe("Auth API routes (Phase 1 task 3 sub-contract)", () => {
    it.each([
      ["app/api/auth/login/route.ts"],
      ["app/api/auth/logout/route.ts"],
      ["app/api/auth/session/route.ts"],
    ])("auth route %s exists", (relPath) => {
      expect(existsSync(resolve(APP_ROOT, relPath))).toBe(true);
    });

    it("login route delegates to handleLogin from @reading-advantage/api", () => {
      const route = readText(
        resolve(APP_ROOT, "app/api/auth/login/route.ts"),
      );
      expect(route).toMatch(/@reading-advantage\/api\/routes\/auth/);
      expect(route).toMatch(/handleLogin/);
    });

    it("session route delegates to handleSession from @reading-advantage/api", () => {
      const route = readText(
        resolve(APP_ROOT, "app/api/auth/session/route.ts"),
      );
      expect(route).toMatch(/handleSession/);
    });
  });

  describe("Live boot smoke (Phase 1 task 8 — verification, currently [~])", () => {
    // These two assertions are the RED proof for Phase 1 verification:
    // they encode the contracts from test-strategy.md §6 ("/login renders"
    // and "DB ping returns"). They fail at HEAD because the corresponding
    // files do not exist in apps/marketing/. Closing the verification gap
    // (creating the pages/routes and adding the live runtime gate in §7)
    // is what flips these to Green.

    it("/login page renders — app/login/page.tsx must exist", () => {
      // Per test-strategy.md §6 P1: "asserts /login renders".
      // The plan.md Phase 1 task 3 explicitly requires a login page; only
      // the API route /api/auth/login is currently implemented.
      const loginPagePath = resolve(APP_ROOT, "app/login/page.tsx");
      expect(
        existsSync(loginPagePath),
        `missing ${loginPagePath} — auth login UI is incomplete`,
      ).toBe(true);
    });

    it("DB ping endpoint exists — app/api/health/db/route.ts must export GET", () => {
      // Per test-strategy.md §6 P1: "DB ping returns".
      // A dedicated healthcheck route gives Phase 1 (and CI) a deterministic
      // way to prove DB connectivity without coupling to /api/campaigns.
      const pingPath = resolve(APP_ROOT, "app/api/health/db/route.ts");
      expect(
        existsSync(pingPath),
        `missing ${pingPath} — no dedicated DB ping endpoint`,
      ).toBe(true);

      if (existsSync(pingPath)) {
        const ping = readText(pingPath);
        expect(ping).toMatch(/export\s+(?:async\s+)?function\s+GET|export\s+const\s+GET/);
      }
    });
  });
});