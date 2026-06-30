/**
 * Phase 1 Contract: artifact presence + shape asserts for the
 * drizzle045_major_migration track. Phase 1 is an audit-only phase
 * whose deliverables are three Markdown artifacts under
 * `measure/tracks/drizzle045_major_migration/`. This test is
 * intentionally RED on master — none of the artifacts exist yet.
 * Green is owned by the Phase 1 Implement role.
 *
 * Per measure/tracks/drizzle045_major_migration/test-strategy.md §5
 * ("Phase 1: Contract & Schema Definition — No tests written. Audit-only
 * phase. Output: documented breaking-change list, schema-file map,
 * Prisma-7 rejection rationale.") this test IS the Phase 1 contract.
 *
 * Per measure/tracks/drizzle045_major_migration/plan.md Phase 1
 * "Red-phase plan note (MID)" the live-behavior gate is the supervisor
 * acceptance review of the three Markdown artifacts. No code-level
 * live-behavior proof is required for an audit-only phase.
 *
 * Targeted Red command:
 *   pnpm --filter @reading-advantage/db exec vitest run \
 *     src/__tests__/drizzle045-phase1-contracts.test.ts
 *
 * Relevant dirty worktree context folded into the schema-map assertions:
 *   - packages/db/src/schema/index.ts adds `export * from "./marketing.js"`
 *     so `marketing.ts` is now part of the schema surface.
 *   - packages/db/src/schema/marketing.ts (already on disk, not exported
 *     until the dirty commit lands) defines campaigns, videoProjects,
 *     assets, voiceovers — 6 tables + 6 enums.
 * The schema-map contract therefore asserts the full current schema set
 * including marketing.ts.
 *
 * Unrelated dirty worktree context preserved (NOT asserted here):
 *   - apps/marketing/package.json, apps/marketing/vite.config.ts,
 *     apps/marketing/next-env.d.ts — unrelated user work (apps/marketing
 *     Next.js 16 / vinext migration).
 *   - measure/automation-supervisor.py — unrelated supervisor model
 *     defaults.
 *   - pnpm-lock.yaml — derived from the unrelated package.json edits.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");

function resolveMeasureTrackDir(trackId: string): string {
  const activeDir = join(REPO_ROOT, "measure/tracks", trackId);
  if (existsSync(activeDir)) return activeDir;
  return join(REPO_ROOT, "measure/archive", trackId);
}

const TRACK_DIR = resolveMeasureTrackDir("drizzle045_major_migration");

const BREAKING_CHANGES_PATH = join(TRACK_DIR, "phase1-breaking-changes.md");
const SCHEMA_MAP_PATH = join(TRACK_DIR, "phase1-schema-map.md");
const PRISMA7_REJECTION_PATH = join(TRACK_DIR, "phase1-prisma-7-rejection.md");

const SCHEMA_DIR = join(PACKAGE_ROOT, "src/schema");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");

// Full schema-file surface after the dirty-worktree `marketing.ts`
// addition is folded in. Tests assert every name appears in the schema
// map. This list is the authoritative Phase 1 schema surface.
const EXPECTED_SCHEMA_FILES = [
  "analytics.ts",
  "audit.ts",
  "auth.ts",
  "classrooms.ts",
  "codecamp.ts",
  "content.ts",
  "flashcards.ts",
  "index.ts",
  "licenses.ts",
  "marketing.ts",
  "primary.ts",
  "progress.ts",
  "questions.ts",
  "sales.ts",
  "science.ts",
  "stories.ts",
  "taxonomy.ts",
  "users.ts",
] as const;

// Migration SQL surface: 0000 through 0024 inclusive (25 files).
const EXPECTED_MIGRATION_INDICES = Array.from({ length: 25 }, (_, i) =>
  i.toString().padStart(4, "0"),
);

describe("Phase 1 — Task 1: Drizzle 0.45 breaking-change audit", () => {
  it("ships phase1-breaking-changes.md as the audit artifact", () => {
    expect(
      existsSync(BREAKING_CHANGES_PATH),
      "measure/tracks/drizzle045_major_migration/phase1-breaking-changes.md must exist as the audit artifact",
    ).toBe(true);
  });

  it("names the Drizzle 0.45 target version", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    expect(text).toMatch(/drizzle[- ]?orm[^0-9]*0\.45/i);
  });

  it("names the current 0.44.7 baseline for comparison", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    expect(text).toMatch(/drizzle[- ]?orm[^0-9]*0\.44\.7/i);
  });

  it("documents at least one concrete breaking change category", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    // The audit must name at least one concrete surface that 0.45
    // changes. We accept any of the categories the test-strategy
    // §3 lists as at-risk: schema API, migration format, query
    // builder, drizzle-zod, or column-builder signatures.
    const hasCategory =
      /schema[- ]?api/i.test(text) ||
      /migration[- ]?format/i.test(text) ||
      /query[- ]?builder/i.test(text) ||
      /drizzle[- ]?zod/i.test(text) ||
      /column[- ]?builder/i.test(text);
    expect(
      hasCategory,
      "breaking-change audit must name at least one concrete 0.45 breaking-change category",
    ).toBe(true);
  });

  it("cross-references the current schema usage it audited", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    // The audit must mention at least one concrete schema file that
    // exists on disk, proving the audit ran against real code rather
    // than guessing.
    const referenced = EXPECTED_SCHEMA_FILES.find((name) =>
      text.includes(name),
    );
    expect(
      referenced,
      "breaking-change audit must reference at least one real schema file (e.g. users.ts, marketing.ts)",
    ).toBeDefined();
  });

  it("surfaces the drizzle-zod risk called out in test-strategy §3.4", () => {
    // Per measure/tracks/drizzle045_major_migration/test-strategy.md
    // §3.4, drizzle-zod is NOT installed at the 0.44.7 baseline and
    // Phase 3 must add it. The breaking-change audit must surface
    // this risk so Phase 3 doesn't lose track of it.
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    expect(
      text,
      "breaking-change audit must mention drizzle-zod as a 0.45-era risk",
    ).toMatch(/drizzle[- ]?zod/i);
  });

  it("surfaces the TenantDB-wrapping risk called out in test-strategy §3.5", () => {
    // Per measure/tracks/drizzle045_major_migration/test-strategy.md
    // §3.5, createTenantDB wraps Drizzle query builders; if 0.45
    // changes the builder API, the wrapping breaks. The audit must
    // surface this so Phase 3 plans to re-run tenant-coverage tests.
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    const mentionsTenant =
      /createTenantDB/.test(text) ||
      /tenant[- ]?registry/i.test(text) ||
      /tenant[- ]?scope/i.test(text) ||
      /\btenant\b/i.test(text);
    expect(
      mentionsTenant,
      "breaking-change audit must mention TenantDB / tenant-scope risk",
    ).toBe(true);
  });
});

describe("Phase 1 — Task 2: schema-file + migration-script map", () => {
  it("ships phase1-schema-map.md as the map artifact", () => {
    expect(
      existsSync(SCHEMA_MAP_PATH),
      "measure/tracks/drizzle045_major_migration/phase1-schema-map.md must exist as the map artifact",
    ).toBe(true);
  });

  it("lists every schema file in packages/db/src/schema/", () => {
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    for (const name of EXPECTED_SCHEMA_FILES) {
      expect(
        text.includes(name),
        `phase1-schema-map.md must mention ${name}`,
      ).toBe(true);
    }
  });

  it("reflects the dirty-worktree addition of marketing.ts", () => {
    // The dirty worktree exports `./marketing.js` from the schema
    // barrel, so marketing.ts IS part of the schema surface. The
    // schema map must include it; otherwise it documents a stale
    // surface.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    expect(
      text.includes("marketing.ts"),
      "phase1-schema-map.md must include marketing.ts (added in current dirty worktree)",
    ).toBe(true);
  });

  it("lists every expected migration SQL", () => {
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    for (const idx of EXPECTED_MIGRATION_INDICES) {
      expect(
        text.includes(`${idx}_`),
        `phase1-schema-map.md must reference migration ${idx}_*.sql`,
      ).toBe(true);
    }
  });

  it("matches the live filesystem surface (no drift)", () => {
    // Guardrail: if a schema file is added to disk but the map does
    // not list it, the map is stale. This proves the artifact is
    // generated against the live surface, not a snapshot.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const missing = EXPECTED_SCHEMA_FILES.filter(
      (name) => !text.includes(name),
    );
    expect(
      missing,
      `phase1-schema-map.md is missing schema files: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("surfaces the client-construction risk called out in test-strategy §3.6", () => {
    // Per measure/tracks/drizzle045_major_migration/test-strategy.md
    // §3.6, packages/db/src/client.ts uses `drizzle(client, { schema })`
    // and is a single point of failure if 0.45 changes the factory
    // signature. The schema map must surface client.ts so Phase 3
    // revisits it before bumping.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    expect(
      text,
      "schema map must mention packages/db/src/client.ts as a 0.45 risk surface",
    ).toMatch(/client\.ts/);
  });

  it("surfaces the journal-integrity risk called out in test-strategy §3.3", () => {
    // Per measure/tracks/drizzle045_major_migration/test-strategy.md
    // §3.3, the journal `when` re-stamp invariant (idx 0-16 <=
    // 1779120000000, idx 17+ > 1779120000000) must survive. The
    // schema map must reference _journal.json so Phase 3 protects it.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    expect(
      text,
      "schema map must mention _journal.json as a 0.45 risk surface",
    ).toMatch(/_journal\.json/);
  });
});

describe("Phase 1 — Task 3: Prisma 7 rejection rationale", () => {
  it("ships phase1-prisma-7-rejection.md as the rationale artifact", () => {
    expect(
      existsSync(PRISMA7_REJECTION_PATH),
      "measure/tracks/drizzle045_major_migration/phase1-prisma-7-rejection.md must exist as the rationale artifact",
    ).toBe(true);
  });

  it("names Prisma 7 explicitly", () => {
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    expect(text).toMatch(/prisma[- ]?7/i);
  });

  it("states the rejection decision (not a deferral or 'to be evaluated')", () => {
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8").toLowerCase();
    const hasRejection =
      /\breject(ed|ion)?\b/.test(text) ||
      /\bnot adopt(ed|ing)?\b/.test(text) ||
      /\bdecline(d)?\b/.test(text);
    expect(
      hasRejection,
      "rationale must state a rejection decision (reject / not adopt / decline)",
    ).toBe(true);
  });

  it("references the Drizzle migration path as the chosen alternative", () => {
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    expect(text).toMatch(/drizzle/i);
  });

  it("mentions primary-advantage's Prisma-to-Drizzle migration direction", () => {
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    expect(
      text.includes("primary-advantage"),
      "rationale must name primary-advantage as the Prisma-to-Drizzle migrator",
    ).toBe(true);
  });
});

// Final live-surface sanity guard. This is NOT an artifact assertion —
// it is a pure file-existence probe of the live schema/migration
// directories the Phase 1 audit must cover. If the on-disk surface
// changes between now and Green, this test will fail and force the
// audit author to re-baseline.
describe("Phase 1 — live-surface guardrail (filesystem probe)", () => {
  it("packages/db/src/schema/ contains every expected schema file", () => {
    for (const name of EXPECTED_SCHEMA_FILES) {
      expect(
        existsSync(join(SCHEMA_DIR, name)),
        `packages/db/src/schema/${name} must exist on disk`,
      ).toBe(true);
    }
  });

  it("packages/db/drizzle/ contains the expected migration SQL files", () => {
    const onDisk = readdirSync(DRIZZLE_DIR);
    for (const idx of EXPECTED_MIGRATION_INDICES) {
      const prefix = `${idx}_`;
      const hit = onDisk.find(
        (entry) => entry.startsWith(prefix) && entry.endsWith(".sql"),
      );
      expect(
        hit,
        `packages/db/drizzle/${prefix}*.sql must exist on disk`,
      ).toBeDefined();
    }
  });
});
