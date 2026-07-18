/**
 * Phase 3 — Red contract: integration gate assertions for the
 * Drizzle 0.45 era.
 *
 * Spec: measure/tracks/drizzle045_major_migration/spec.md §AC 1, §AC 3,
 *       §AC 5
 *       ("Drizzle upgraded to 0.45 across all workspaces" +
 *        "All migrations run cleanly against a fresh database" +
 *        "drizzle-zod integration updated for the new schema API").
 * Strategy: measure/tracks/drizzle045_major_migration/test-strategy.md §5
 *           ("Phase 3: Implement (Green) — drizzle-kit generate diff,
 *            drizzle-kit migrate fresh-DB apply, drizzle-zod schema
 *            round-trip").
 *
 * Per test-strategy.md §3.8 ("No drizzle-kit in build-graph. CLI-only
 * tool. Phase 3 integration tests must exercise via shell commands,
 * not Vitest imports.") and §7 ("Phase 3 row ... drizzle-kit generate
 * zero-diff. drizzle-kit migrate fresh-DB apply."), this file pins
 * the Phase 3 integration-gate contract by asserting the COMMAND
 * PATH and the PRECONDITIONS required for `drizzle-kit generate` and the
 * reviewed PostgreSQL-aware migration runner to behave correctly.
 *
 * It does NOT shell out to `drizzle-kit` against a real database —
 * that requires Docker Postgres and is owned by the Green phase
 * (JR role) per test-strategy §3.8. Instead it asserts the
 * preconditions (config, scripts, journal, version pins) that the
 * JR role's `pnpm --filter @reading-advantage/db migrate` step
 * will rely on. If the preconditions are wrong, the real-DB gate
 * will fail; if they're right, the gate has a defined command
 * surface to exercise.
 *
 * Phase 2 `drizzle045-zod-contract.test.ts` (8be48308) is the
 * drizzle-zod RED contract for Task 4 (Update drizzle-zod
 * integration). This file adds the Phase 3 Task 1 (drizzle-kit
 * version) and Task 5 (gate contracts) assertions.
 *
 * Targeted Red command (Phase 3 Mid, bounded):
 *   cd packages/db && ./node_modules/.bin/vitest run \
 *     src/__tests__/drizzle045-phase3-integration-gates.test.ts
 *
 * Red rationale (per describe block):
 *
 *   1. "drizzle-kit version (Task 1)" — the installed drizzle-kit
 *      must be at the 0.32+ line that ships the drizzle-orm 0.45
 *      companion. test-strategy.md §3 (Cross-Phase Edge Cases) and
 *      Phase 4 "pnpm outdated -r" gate both call for drizzle-kit
 *      0.32+. packages/db currently declares ^0.31.0 and the
 *      lockfile resolves to 0.31.10. Phase 3 must bump.
 *
 *   2. "drizzle-kit generate command path (Task 5)" — packages/db
 *      must expose a `generate` script that invokes `drizzle-kit
 *      generate` (per packages/db/package.json script section and
 *      test-strategy §5). regression guard.
 *
 *   3. "reviewed migrate command path (Task 5)" — packages/db must expose a
 *      `migrate` script that invokes the PostgreSQL-aware runner. The runner
 *      must preserve exact ledger hashes and use DIRECT_DATABASE_URL when set.
 *
 *   4. "Journal entries for full migration apply (Task 5)" — the
 *      `_journal.json` must expose 21 entries in idx order 0..20
 *      with `tag` values that map 1:1 to on-disk migration SQL
 *      files. This is the precondition for the migration runner
 *      to apply all 21 migrations on a fresh DB.
 *
 *   5. "Root pnpm.overrides resolves every workspace to the same
 *      drizzle-orm (Task 5)" — per test-strategy §3.7 ("Root pins
 *      drizzle-orm: 0.44.7. Phase 3 bumps to 0.45.x; all 5
 *      dependent packages resolve via overrides."), the root
 *      pnpm.overrides must pin drizzle-orm at a 0.45.x range and
 *      the lockfile must agree. regression guard (was added by
 *      Phase 2 audit-fix 23779af0; this assertion re-pins it
 *      under the Phase 3 namespace).
 *
 * Intentionally excluded from this Red command:
 *
 *   - `drizzle045-zod-contract.test.ts` — owned by Phase 3 Task 4;
 *     this file's RED baseline is verified separately per
 *     test-strategy §7.
 *   - The full `packages/db` suite — out of scope for the
 *     targeted Red gate per test-strategy §7.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");
const ROOT_PACKAGE_JSON_PATH = join(REPO_ROOT, "package.json");
const DRIZZLE_CONFIG_PATH = join(PACKAGE_ROOT, "drizzle.config.ts");
const JOURNAL_PATH = join(PACKAGE_ROOT, "drizzle/meta/_journal.json");
const requireFromDb = createRequire(join(PACKAGE_ROOT, "package.json"));

function resolvePackageJson(pkgName: string): string | null {
  let current = dirname(requireFromDb.resolve(pkgName));
  const root = parse(current).root;
  while (current !== root) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) return candidate;
    current = dirname(current);
  }
  return null;
}

interface PkgJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  pnpm?: {
    overrides?: Record<string, string>;
  };
}

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

// ---------------------------------------------------------------------------
// Task 1 — drizzle-kit is at the 0.31.7+ line that ships the drizzle-orm 0.45
// companion. (No stable 0.32.x exists; latest stable is 0.31.10.)
// ---------------------------------------------------------------------------

describe("drizzle045-phase3-integration-gates — drizzle-kit version (Task 1)", () => {
  let dbPkg: PkgJson;

  beforeAll(() => {
    dbPkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as PkgJson;
  });

  it("packages/db/package.json declares drizzle-kit at a >=0.31.7 range", () => {
    const declared =
      dbPkg.devDependencies?.["drizzle-kit"] ??
      dbPkg.dependencies?.["drizzle-kit"];
    expect(
      declared,
      "packages/db/package.json must declare drizzle-kit (Phase 3 Task 1).",
    ).toBeDefined();
    // Extract the leading semver major.minor.patch from the declared range.
    const match = (declared ?? "").match(/(\d+)\.(\d+)\.(\d+)/);
    expect(match, `drizzle-kit range "${declared}" is not parseable`).not.toBeNull();
    const major = Number(match![1]);
    const minor = Number(match![2]);
    const patch = Number(match![3]);
    const satisfies =
      major > 0 || (major === 0 && minor > 31) || (major === 0 && minor === 31 && patch >= 7);
    expect(
      satisfies,
      `drizzle-kit declared as "${declared}" — Phase 3 must bump to ` +
        `>=0.31.7 (drizzle-orm 0.45-era companion). See ` +
        `test-strategy.md §3 / Phase 4 "pnpm outdated" gate.`,
    ).toBe(true);
  });

  it("the installed drizzle-kit in packages/db resolves to >=0.31.7", () => {
    // Resolve from packages/db so pnpm's symlinked workspace layout is handled.
    const drizzleKitPackageJson = resolvePackageJson("drizzle-kit");
    expect(
      drizzleKitPackageJson && existsSync(drizzleKitPackageJson),
      `drizzle-kit must be resolvable from packages/db at ${drizzleKitPackageJson}.`,
    ).toBe(true);
    if (!drizzleKitPackageJson) {
      throw new Error("drizzle-kit package.json could not be resolved");
    }
    const pkg = JSON.parse(
      readFileSync(drizzleKitPackageJson, "utf8"),
    ) as { version?: string };
    expect(
      pkg.version,
      "drizzle-kit/package.json must export a version string",
    ).toBeDefined();
    const version = pkg.version as string;
    const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
    expect(match, `drizzle-kit version "${version}" is not parseable`).not.toBeNull();
    const major = Number(match![1]);
    const minor = Number(match![2]);
    const patch = Number(match![3]);
    const satisfies =
      major > 0 || (major === 0 && minor > 31) || (major === 0 && minor === 31 && patch >= 7);
    expect(
      satisfies,
      `installed drizzle-kit is ${version} — Phase 3 must install ` +
        `>=0.31.7 (drizzle-orm 0.45-era companion).`,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 5 — packages/db must expose the `generate` / `migrate` shell entry
// points the test-strategy §5 calls out. GREEN today (regression guard).
// ---------------------------------------------------------------------------

describe("drizzle045-phase3-integration-gates — drizzle-kit generate command path (Task 5)", () => {
  let dbPkg: PkgJson;

  beforeAll(() => {
    dbPkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as PkgJson;
  });

  it("packages/db exposes a `generate` script that invokes drizzle-kit", () => {
    const script = dbPkg.scripts?.["generate"];
    expect(
      script,
      "packages/db/package.json must expose a `generate` script.",
    ).toBeDefined();
    expect(
      script,
      "`generate` must invoke drizzle-kit generate.",
    ).toMatch(/drizzle-kit\s+generate/);
  });

  it("drizzle.config.ts references the 0.45-era schema barrel", () => {
    expect(
      existsSync(DRIZZLE_CONFIG_PATH),
      "packages/db/drizzle.config.ts must exist.",
    ).toBe(true);
    const text = readFileSync(DRIZZLE_CONFIG_PATH, "utf8");
    // The 0.45-era barrel exports marketing.js (committed at 5284e0bf);
    // drizzle-kit reads the same barrel, so the config must point at
    // it (not at a legacy per-table file list).
    expect(
      text,
      "drizzle.config.ts must reference src/schema/index.ts (the 0.45-era barrel).",
    ).toMatch(/src\/schema\/index\.ts/);
    expect(
      text,
      "drizzle.config.ts must declare dialect: postgresql.",
    ).toMatch(/dialect:\s*["']postgresql["']/);
    expect(
      text,
      "drizzle.config.ts must emit migrations under ./drizzle.",
    ).toMatch(/out:\s*["']\.\/drizzle["']/);
  });
});

describe("drizzle045-phase3-integration-gates — reviewed migrate command path (Task 5)", () => {
  let dbPkg: PkgJson;

  beforeAll(() => {
    dbPkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as PkgJson;
  });

  it("packages/db exposes a `migrate` script that invokes the PostgreSQL-aware runner", () => {
    const script = dbPkg.scripts?.["migrate"];
    expect(
      script,
      "packages/db/package.json must expose a `migrate` script.",
    ).toBeDefined();
    expect(
      script,
      "`migrate` must invoke the reviewed PostgreSQL-aware runner.",
    ).toMatch(/tsx\s+scripts\/migrate\.ts/);
  });

  it("drizzle.config.ts prefers DIRECT_DATABASE_URL (connection_pooling FR-3)", () => {
    expect(existsSync(DRIZZLE_CONFIG_PATH)).toBe(true);
    const text = readFileSync(DRIZZLE_CONFIG_PATH, "utf8");
    expect(
      text,
      "drizzle.config.ts must read DIRECT_DATABASE_URL before falling back to DATABASE_URL.",
    ).toMatch(/DIRECT_DATABASE_URL/);
    expect(
      text,
      "drizzle.config.ts must declare dialect: postgresql for migrate.",
    ).toMatch(/dialect:\s*["']postgresql["']/);
  });
});

// ---------------------------------------------------------------------------
// Task 5 — the journal must expose all committed entries in idx order; this is
// the precondition for the reviewed runner to apply all migrations
// against a fresh DB. GREEN today (regression guard).
// ---------------------------------------------------------------------------

const EXPECTED_JOURNAL_TAGS = [
  "0000_wide_vengeance",
  "0001_thick_santa_claus",
  "0002_quick_skreet",
  "0003_slow_firebrand",
  "0004_sturdy_forge",
  "0005_codecamp_schema",
  "0006_codecamp_indexes",
  "0007_codecamp_repos_reviews",
  "0008_codecamp_phase",
  "0009_add_github_username",
  "0010_codecamp_uniqueness",
  "0011_codecamp_webhook_events",
  "0012_codecamp_intern_role",
  "0013_prisma_drizzle_schema_unification",
  "0014_users_license_expired_date",
  "0015_science_junction_tables",
  "0016_users_grade_level",
  "0017_science_school_id",
  "0018_audit_events",
  "0019_session_token_hash",
  "0020_sessions_indexes",
  "0021_sales_advantage",
  "0022_flowery_black_tarantula",
  "0023_cultured_sunspot",
  "0024_futuristic_vulture",
  "0025_review_jobs",
] as const;

describe("drizzle045-phase3-integration-gates — Journal entries for full migration apply (Task 5)", () => {
  let journal: Journal;

  beforeAll(() => {
    journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
  });

  it("_journal.json exposes one entry per committed migration", () => {
    expect(
      journal.entries.length,
      `_journal.json must expose exactly ${EXPECTED_JOURNAL_TAGS.length} entries (one per committed migration).`,
    ).toBe(EXPECTED_JOURNAL_TAGS.length);
  });

  it("journal entries are contiguous in idx order", () => {
    const idxs = journal.entries.map((e) => e.idx);
    for (let i = 0; i < EXPECTED_JOURNAL_TAGS.length; i++) {
      expect(
        idxs[i],
        `journal entry at position ${i} must have idx=${i}.`,
      ).toBe(i);
    }
  });

  it("every journal entry's tag matches an on-disk migration SQL file", () => {
    for (let i = 0; i < EXPECTED_JOURNAL_TAGS.length; i++) {
      const sqlPath = join(
        PACKAGE_ROOT,
        "drizzle",
        `${EXPECTED_JOURNAL_TAGS[i]}.sql`,
      );
      expect(
        existsSync(sqlPath),
        `migration SQL file for tag "${EXPECTED_JOURNAL_TAGS[i]}" must exist on disk.`,
      ).toBe(true);
      expect(
        journal.entries[i].tag,
        `journal entry idx=${i} must have tag "${EXPECTED_JOURNAL_TAGS[i]}".`,
      ).toBe(EXPECTED_JOURNAL_TAGS[i]);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 5 — every workspace resolves to the same drizzle-orm version.
// The root override may be absent when workspace ranges already resolve to 0.45.
// (test-strategy §5 Cross-package tests). GREEN today (added by
// Phase 2 audit-fix 23779af0).
// ---------------------------------------------------------------------------

describe("drizzle045-phase3-integration-gates — Root dependency resolution keeps drizzle-orm at 0.45.x (Task 5)", () => {
  let rootPkg: PkgJson;
  let lockfileText: string;

  beforeAll(() => {
    rootPkg = JSON.parse(readFileSync(ROOT_PACKAGE_JSON_PATH, "utf8")) as PkgJson;
    lockfileText = readFileSync(join(REPO_ROOT, "pnpm-lock.yaml"), "utf8");
  });

  it("root package.json devDependencies declare drizzle-orm at a 0.45.x range", () => {
    const declared = rootPkg.devDependencies?.["drizzle-orm"];
    expect(
      declared,
      "root package.json devDependencies must declare drizzle-orm.",
    ).toBeDefined();
    const match = (declared ?? "").match(/(\d+)\.(\d+)/);
    expect(match, `drizzle-orm range "${declared}" is not parseable`).not.toBeNull();
    const major = Number(match![1]);
    const minor = Number(match![2]);
    const satisfies =
      major > 0 || (major === 0 && minor >= 45);
    expect(
      satisfies,
      `root devDependencies drizzle-orm is "${declared}" — must be >=0.45 ` +
        `for cross-package consistency (test-strategy §3.7).`,
    ).toBe(true);
  });

  it("root pnpm.overrides does not pin drizzle-orm below 0.45.x", () => {
    const override = rootPkg.pnpm?.overrides?.["drizzle-orm"];
    if (!override) return;
    const match = (override ?? "").match(/(\d+)\.(\d+)/);
    expect(match, `drizzle-orm override "${override}" is not parseable`).not.toBeNull();
    const major = Number(match![1]);
    const minor = Number(match![2]);
    const satisfies =
      major > 0 || (major === 0 && minor >= 45);
    expect(
      satisfies,
      `root pnpm.overrides drizzle-orm is "${override}" — must be >=0.45 ` +
        `(test-strategy §3.7: every workspace resolves consistently).`,
    ).toBe(true);
  });

  it("pnpm-lock.yaml resolves drizzle-orm to 0.45.x", () => {
    const lockEntry =
      lockfileText.match(/^\s{2}drizzle-orm@(\d+\.\d+\.\d+)(?:_|:)/m) ??
      lockfileText.match(/^\s*\/drizzle-orm@(\d+\.\d+\.\d+)/m);
    expect(
      lockEntry,
      "pnpm-lock.yaml must contain a drizzle-orm@<version> entry.",
    ).not.toBeNull();
    expect(
      lockEntry![1].startsWith("0.45."),
      `lockfile drizzle-orm is ${lockEntry![1]}, expected 0.45.*.`,
    ).toBe(true);
  });
});
