/**
 * Phase 2 — Task 3 (Red, intentionally): drizzle-zod contract stub.
 *
 * Spec: measure/tracks/drizzle045_major_migration/spec.md §AC 2
 *       ("All schema definitions compile under the new API").
 * Strategy: measure/tracks/drizzle045_major_migration/test-strategy.md §5
 *           ("drizzle045-zod-contract.test.ts — stub that imports
 *           `drizzle-zod` and asserts `createInsertSchema` /
 *           `createSelectSchema` are callable (RED until drizzle-zod is
 *           installed in Phase 3)").
 *
 * Per test-strategy.md §3.4 ("drizzle-zod not installed ... Must be
 * added in Phase 3. Phase 2 `drizzle045-zod-contract.test.ts` is
 * intentionally RED.") and §7 ("Excluded from Phase 2 Red gate by
 * targeted file list; not in `vitest run` glob"), this file is owned
 * by Phase 3 and is EXCLUDED from the Phase 2 Red gate.
 *
 * Targeted Red command (Phase 3 ownership, NOT Phase 2):
 *   pnpm --filter @reading-advantage/db exec vitest run \
 *     src/__tests__/drizzle045-zod-contract.test.ts
 *
 * Phase 2 Red gate (excludes this file):
 *   pnpm --filter @reading-advantage/db exec vitest run \
 *     src/__tests__/drizzle045-schema-compile.test.ts \
 *     src/__tests__/drizzle045-migration-format.test.ts
 *
 * Red rationale (per describe block):
 *
 *   1. "drizzle-zod is installed" — drizzle-zod is NOT installed at the
 *      0.44.7 baseline (test-strategy §6 build-graph finding).
 *      Phase 3 must `pnpm add drizzle-zod` in packages/db. RED until then.
 *
 *   2. "createInsertSchema / createSelectSchema are callable" — Once
 *      drizzle-zod is installed, these factories must be exported with
 *      callable signatures that accept a Drizzle pgTable. RED until then.
 *
 *   3. "Zod round-trip on a live table" — Once the factories are
 *      callable, Zod parse / safeParse must work on a real users-table
 *      insert payload. RED until then.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");

const require = createRequire(import.meta.url);

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// drizzle-zod install: package.json must declare it (RED today).
// ---------------------------------------------------------------------------

describe("drizzle045-zod-contract — drizzle-zod install (FR-2)", () => {
  let dbPkg: PkgJson;

  beforeAll(() => {
    dbPkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as PkgJson;
  });

  it("packages/db/package.json declares drizzle-zod as a dependency (any range)", () => {
    const deps = {
      ...(dbPkg.dependencies ?? {}),
      ...(dbPkg.devDependencies ?? {}),
    };
    const declared = deps["drizzle-zod"];
    expect(
      declared,
      `packages/db/package.json must declare drizzle-zod. Phase 3 adds it. ` +
        `drizzle-zod is required by 0.45 to expose createInsertSchema / ` +
        `createSelectSchema for runtime Zod contracts.`,
    ).toBeDefined();
  });

  it("the installed drizzle-zod is importable at runtime", () => {
    // Use createRequire so this test fails with a clear "Cannot find
    // module" error message at the 0.44.7 baseline, rather than a
    // silent TypeScript-resolve pass that would mask the gap.
    let imported: unknown = null;
    let importError: Error | null = null;
    try {
      imported = require("drizzle-zod");
    } catch (e) {
      importError = e as Error;
    }
    expect(
      importError,
      `drizzle-zod must be importable from packages/db. Got error: ` +
        `${importError?.message ?? "(none)"}. Phase 3 installs it.`,
    ).toBeNull();
    expect(imported, "drizzle-zod module must export a non-null surface").not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// drizzle-zod exports: createInsertSchema / createSelectSchema must be
// callable functions (RED today — module not installed).
// ---------------------------------------------------------------------------

describe("drizzle045-zod-contract — drizzle-zod exports (FR-2)", () => {
  it("drizzle-zod exports createInsertSchema and createSelectSchema", () => {
    // The 0.45-era contract relies on both factories. If Phase 3
    // installs a drizzle-zod version that lacks either factory, the
    // schema-side Zod wiring cannot be built.
    let mod: Record<string, unknown> | null = null;
    try {
      mod = require("drizzle-zod") as Record<string, unknown>;
    } catch {
      mod = null;
    }
    expect(mod, "drizzle-zod must be importable for this check").not.toBeNull();
    expect(
      typeof (mod as Record<string, unknown>).createInsertSchema,
      "drizzle-zod.createInsertSchema must be a function",
    ).toBe("function");
    expect(
      typeof (mod as Record<string, unknown>).createSelectSchema,
      "drizzle-zod.createSelectSchema must be a function",
    ).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Zod round-trip on a live table (RED today — drizzle-zod not installed).
// Phase 3 owns the live-round-trip test once drizzle-zod is wired into
// packages/db. Phase 2 only asserts the importable surface.
// ---------------------------------------------------------------------------

describe("drizzle045-zod-contract — Zod round-trip on users (FR-2, Phase 3 owns)", () => {
  it("createInsertSchema(users) produces a Zod schema that validates a canonical insert payload", async () => {
    let mod: Record<string, unknown> | null = null;
    try {
      mod = require("drizzle-zod") as Record<string, unknown>;
    } catch {
      mod = null;
    }
    expect(mod, "drizzle-zod must be importable for this check").not.toBeNull();
    const createInsertSchema = mod!.createInsertSchema as (
      table: unknown,
    ) => { parse: (data: unknown) => unknown };

    const { users } = await import("../schema/users.js");
    const insertSchema = createInsertSchema(users);
    expect(
      typeof insertSchema?.parse,
      "createInsertSchema(users) must return a Zod schema with a parse() method",
    ).toBe("function");
    const parsed = insertSchema.parse({
      id: "u_test_round_trip",
      username: "rt_user",
      displayUsername: "rt_user",
      role: "STUDENT",
    });
    expect(parsed, "parsed payload must include the username field").toMatchObject({
      username: "rt_user",
    });
  });
});
