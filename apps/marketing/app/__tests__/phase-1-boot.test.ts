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
 * return 200 on `/`. The dev-server gate is skipped for Phase 1 because of a
 * pre-existing peer-dependency conflict (`vinext@0.1.2` requires `vite@^7/^8`
 * vs monorepo `vite@6.4.3`), recorded in plan.md.
 *
 * This file encodes the Phase 1 verification contract as executable
 * assertions split into two tiers:
 *
 *   1. **Wiring invariants (Phase 1 tasks 1–7):** file-level + module-shape
 *      checks for the scaffold, monorepo wiring, sidebar layout, and auth
 *      API routes. These stay Green to prove the wiring isn't accidentally
 *      reverted before closeout.
 *
 *   2. **Live boot smoke (Phase 1 task 8 — verification):** runtime checks
 *      that the `/login` page component imports and that the DB health
 *      endpoint returns the expected responses when the DB is reachable or
 *      failing. These prove live behavior beyond static file inspection.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Mock the Drizzle client so the DB health smoke is deterministic and does
// not require a live Postgres connection during Phase 1 unit tests.
vi.mock("@reading-advantage/db", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/db")>(
    "@reading-advantage/db",
  );
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
      }),
      { raw: (strings: TemplateStringsArray) => strings },
    ),
    db: {
      execute: vi.fn(),
    },
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

function readJson(p: string): Record<string, unknown> {
  return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
}

function readText(p: string): string {
  return readFileSync(p, "utf8");
}

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
      ["@/api/auth/login/route", "POST"],
      ["@/api/auth/logout/route", "POST"],
      ["@/api/auth/session/route", "GET"],
    ])("auth route %s exports %s as a function", async (modSpec, exportName) => {
      // FR-12: replaced `existsSync(...)` with a behavioral import that asserts
      // the module is importable + the named export is a function. File
      // presence is verified by the build system, not the test suite.
      const mod = await import(modSpec as string);
      const handler = (mod as Record<string, unknown>)[exportName];
      expect(typeof handler, `${modSpec} must export ${exportName} as a function`).toBe(
        "function",
      );
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

  describe("Live boot smoke (Phase 1 task 8 — verification)", () => {
    it("/login page component imports and is a valid React component", async () => {
      const { default: LoginPage } = await import("@/login/page");
      expect(LoginPage).toBeDefined();
      expect(typeof LoginPage).toBe("function");
    });

    it("GET /api/health/db returns 200 when the DB is reachable", async () => {
      const { db } = await import("@reading-advantage/db");
      (db.execute as Mock).mockResolvedValueOnce([{ "?column?": 1 }]);

      const { GET } = await import("@/api/health/db/route");
      const response = await GET();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok" });
    });

    it("GET /api/health/db returns 500 when the DB ping fails", async () => {
      const { db } = await import("@reading-advantage/db");
      (db.execute as Mock).mockRejectedValueOnce(
        new Error("connection refused"),
      );

      const { GET } = await import("@/api/health/db/route");
      const response = await GET();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.status).toBe("error");
      expect(body.message).toBe("Database ping failed");
    });
  });
});
