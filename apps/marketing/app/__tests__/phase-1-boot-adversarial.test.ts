/**
 * Phase 1 Adversarial — boundary, failure-path, integration hardening
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 1)
 *
 * Strengthens the existing phase-1-boot.test.ts with adversarial checks:
 *   1. Substring-assertion hardening: lib/*.ts files must use REAL export
 *      statements, not comments that match the regex. Protects against future
 *      regressions where a comment matches `/export\s*\{\s*db/` without an
 *      actual re-export.
 *   2. Accounts handoff integrity: login page has one Accounts handoff and no
 *      product-local credential form (HTML5 contract that cannot be replaced
 *      by mocked auth).
 *
 * These tests assert behavior the original phase-1-boot.test.ts cannot:
 *   - It uses substring regex like `/export\s*\{\s*db/` which matches the
 *     literal text "export {db" inside a comment.
 *   - It does not exercise the login form's submit handler.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

function readText(relPath: string): string {
  return readFileSync(resolve(APP_ROOT, relPath), "utf8");
}

// Strip /* */ block comments and // line comments so substring matches only
// test real source code, not commented-out exports. This protects against
// regressions where someone writes `// export { db }` to satisfy the regex.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("Phase 1 Adversarial: Vinext Scaffold hardening", () => {
  describe("Substring-assertion hardening (lib/*.ts)", () => {
    it("app/lib/db.ts has a REAL export of `db`, not a comment", () => {
      const raw = readText("app/lib/db.ts");
      const code = stripComments(raw);
      // Original phase-1-boot.test.ts asserts:
      //   expect(lib).toMatch(/export\s*\{\s*db/);
      // That regex matches comments like `// export { db as something }`.
      // After stripping comments, the only `export { db` must remain.
      expect(code).toMatch(/export\s*\{\s*db/);
      // Tighten: it must be a complete export clause ending with `}`.
      expect(code).toMatch(/export\s*\{[^}]*\bdb\b[^}]*\}\s*from\s+["']@reading-advantage\/db["']/);
    });

    it("app/lib/ai.ts re-exports createAIClient AND getAIClient (not just one)", () => {
      const code = stripComments(readText("app/lib/ai.ts"));
      // Original test allows EITHER name (alternation regex). Real contract
      // requires BOTH — both are imported by future phases.
      expect(code).toMatch(/createAIClient/);
      expect(code).toMatch(/getAIClient/);
      // Both must come from @reading-advantage/ai in a single export clause.
      expect(code).toMatch(
        /export\s*\{[^}]*\bcreateAIClient\b[^}]*\bgetAIClient\b[^}]*\}\s*from\s+["']@reading-advantage\/ai["']/,
      );
    });

    it("app/lib/storage.ts re-exports createStorageClient AND getStorageClient", () => {
      const code = stripComments(readText("app/lib/storage.ts"));
      expect(code).toMatch(/createStorageClient/);
      expect(code).toMatch(/getStorageClient/);
      expect(code).toMatch(
        /export\s*\{[^}]*\bcreateStorageClient\b[^}]*\bgetStorageClient\b[^}]*\}\s*from\s+["']@reading-advantage\/storage["']/,
      );
    });
  });

  describe("Accounts handoff integrity", () => {
    it("login page has one Accounts handoff and no product-local credential form", async () => {
      const { default: LoginPage } = await import("@/login/page");
      const src = readText("app/login/page.tsx");
      // The single Accounts handoff now carries the preserved return path.
      expect(src).toContain(
        "const startHref = `/api/auth/company/start?${new URLSearchParams({ returnTo }).toString()}`",
      );
      expect(src).toContain("href={startHref}");
      expect(src.match(/\/api\/auth\/company\/start/g)).toHaveLength(1);
      expect(src).not.toMatch(/type\s*=\s*["']password["']/);
      expect(src).not.toMatch(/onSubmit|handleSubmit|useAuth|await\s+login/);
      expect(LoginPage).toBeDefined();
    });
  });
});
