/**
 * Phase 2 — Task 2 (Red): migration smoke tests for the Drizzle 0.45 era.
 *
 * Spec: measure/tracks/drizzle045_major_migration/spec.md §AC 3
 *       ("All migrations run cleanly against a fresh database").
 * Strategy: measure/tracks/drizzle045_major_migration/test-strategy.md §5
 *           (Phase 2: Test — migration-SQL parity).
 *
 * Per test-strategy.md §5 ("Phase 2: Pure unit + contract. No DB, no
 * network. ... migration-SQL string checks, journal JSON integrity."),
 * these are pure SQL-file-string tests, NOT real-database integration
 * tests. The real-database apply (`drizzle-kit migrate` against fresh
 * Docker Postgres) is Phase 3 work. This file is owned by Phase 2.
 *
 * Per test-strategy.md §4 ("No migration loss ... `migration-sql.test.ts`
 * asserts SQL content for key migrations ... If 0.45 changes DDL output,
 * these assertions must be updated to match the new format — but the
 * *semantic* invariants (constraint names, column presence, FK
 * references) must be preserved."), this file pins the format-level
 * invariants the 0.45 upgrade must preserve. If drizzle-orm 0.45 changes
 * the SQL output, Phase 3 must update BOTH the migration files AND these
 * assertions in lockstep.
 *
 * Red rationale (per describe block):
 *
 *   - "File presence" — every expected migration is on disk. Regression
 *     guard. GREEN today.
 *
 *   - "Statement separator" — every non-trivial migration uses
 *     `--> statement-breakpoint` between DDL statements. drizzle-orm
 *     0.45 emits this separator. Some 0.44.7 migrations skip it.
 *
 *   - "CREATE TABLE format" — every CREATE TABLE block ends with
 *     `);` and is well-formed. Regression guard.
 *
 *   - "Enum format" — every CREATE TYPE uses `AS ENUM`. Regression
 *     guard. GREEN today.
 *
 *   - "Foreign-key format" — every FK constraint uses double-quoted
 *     identifiers and the expected cascade semantics. Regression
 *     guard. GREEN today.
 *
 *   - "Index format" — every CREATE INDEX is well-formed. Regression
 *     guard. GREEN today.
 *
 *   - "Index naming" — every CREATE INDEX name ends in `_idx` or
 *     `_pkey` (0.45-era convention). GREEN today.
 *
 *   - "Migration header comment" — every migration file starts with a
 *     `--` comment block. drizzle-orm 0.45 emits this on regenerate;
 *     some 0.44.7 hand-authored migrations skip it.
 *
 * Targeted Red command:
 *   cd packages/db && ./node_modules/.bin/vitest run \
 *     src/__tests__/drizzle045-migration-format.test.ts
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");

// 0.45-era Phase 2 Red expects every SQL file in the canonical migration
// surface. The existing migration-sql.test.ts already pins 0002/0003/0004/
// 0015/0017; this file adds 0.45-era FORMAT invariants.
const EXPECTED_MIGRATION_FILES = [
  "0000_wide_vengeance.sql",
  "0001_thick_santa_claus.sql",
  "0002_quick_skreet.sql",
  "0003_slow_firebrand.sql",
  "0004_sturdy_forge.sql",
  "0005_codecamp_schema.sql",
  "0006_codecamp_indexes.sql",
  "0007_codecamp_repos_reviews.sql",
  "0008_codecamp_phase.sql",
  "0009_add_github_username.sql",
  "0010_codecamp_uniqueness.sql",
  "0011_codecamp_webhook_events.sql",
  "0012_codecamp_intern_role.sql",
  "0013_prisma_drizzle_schema_unification.sql",
  "0014_users_license_expired_date.sql",
  "0015_science_junction_tables.sql",
  "0016_users_grade_level.sql",
  "0017_science_school_id.sql",
  "0018_audit_events.sql",
  "0019_session_token_hash.sql",
  "0020_sessions_indexes.sql",
  "0021_sales_advantage.sql",
  "0022_flowery_black_tarantula.sql",
  "0023_cultured_sunspot.sql",
  "0024_futuristic_vulture.sql",
  "0025_review_jobs.sql",
] as const;

interface MigrationFile {
  name: string;
  text: string;
}

// Initialize at module load. The file-content reads are synchronous
// and fast, so no beforeAll is needed.
const migrations: MigrationFile[] = EXPECTED_MIGRATION_FILES.map((name) => ({
  name,
  text: readFileSync(join(DRIZZLE_DIR, name), "utf8"),
}));

// ---------------------------------------------------------------------------
// File presence: every expected migration is on disk.
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — every expected migration is on disk (FR-3)", () => {
  for (const name of EXPECTED_MIGRATION_FILES) {
    it(`${name} exists in packages/db/drizzle/`, () => {
      const onDisk = readdirSync(DRIZZLE_DIR);
      expect(onDisk, `Migration ${name} must exist on disk`).toContain(name);
    });
  }
});

// ---------------------------------------------------------------------------
// Statement separator: every non-trivial migration uses
// `--> statement-breakpoint` between DDL statements (0.45-era).
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — statement separator (FR-3)", () => {
  for (const { name, text } of migrations) {
    it(`${name} uses the 0.45-era statement separator`, () => {
      const statementCount = (text.match(/--> statement-breakpoint/g) || [])
        .length;
      const lineCount = text
        .split("\n")
        .filter((l) => l.trim().length > 0).length;
      // Multi-statement migrations (>=10 non-empty lines) must use the
      // separator. drizzle-orm 0.45 emits this on regenerate. Some
      // hand-authored 0.44.7-era migrations skip it — Phase 3 must
      // add it.
      if (lineCount >= 10) {
        expect(
          statementCount,
          `${name} must contain \`--> statement-breakpoint\` separators between ` +
            `statements. Found ${statementCount} separators in ${lineCount} non-empty lines. ` +
            `drizzle-orm 0.45 emits this separator between every DDL statement.`,
        ).toBeGreaterThan(0);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// CREATE TABLE format: every CREATE TABLE statement is well-formed.
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — CREATE TABLE format (FR-3)", () => {
  it("every CREATE TABLE is followed by `);`", () => {
    for (const { name, text } of migrations) {
      const matches = text.match(/CREATE TABLE[^;]+;/gs) || [];
      for (const stmt of matches) {
        const trimmed = stmt.trim();
        expect(
          trimmed.endsWith(");"),
          `${name}: CREATE TABLE statement must end with \`);\` — got: ${trimmed.slice(-20)}`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Enum format: every CREATE TYPE uses `AS ENUM`.
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — enum format (FR-3)", () => {
  it("every CREATE TYPE statement uses `AS ENUM` (0.45-era contract)", () => {
    for (const { name, text } of migrations) {
      const enumMatches = text.match(/CREATE TYPE[^;]+;/g) || [];
      for (const stmt of enumMatches) {
        expect(
          /AS\s+ENUM/i.test(stmt),
          `${name}: CREATE TYPE statement must use \`AS ENUM\` (0.45-era contract). ` +
            `Got: ${stmt.slice(0, 80)}`,
        ).toBe(true);
      }
    }
  });

  it("0000 role enum is defined with the canonical 4-value list", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0000_wide_vengeance.sql"),
      "utf8",
    );
    expect(text).toMatch(
      /CREATE TYPE\s+(?:"public"\.)?"role"\s+AS ENUM\('STUDENT',\s*'USER',\s*'TEACHER',\s*'ADMIN'\)/,
    );
  });
});

// ---------------------------------------------------------------------------
// Foreign-key format: every FK constraint uses double-quoted identifiers.
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — foreign-key constraint format (FR-3)", () => {
  it("every FK constraint uses double-quoted column and table names (0.45-era)", () => {
    for (const { name, text } of migrations) {
      const fkStatements =
        text.match(/ADD CONSTRAINT[^;]+FOREIGN KEY[^;]+;/g) || [];
      for (const stmt of fkStatements) {
        expect(
          /FOREIGN KEY\s*\(\s*"[^"]+"/.test(stmt),
          `${name}: FK constraint must use double-quoted column name. Got: ${stmt.slice(0, 80)}`,
        ).toBe(true);
        expect(
          /REFERENCES\s+(?:"public"\.)?"[^"]+"\s*\(\s*"[^"]+"/.test(stmt),
          `${name}: FK constraint must use double-quoted target. Got: ${stmt.slice(0, 80)}`,
        ).toBe(true);
      }
    }
  });

  it("0015 cascade-on-delete count remains at 8 (4 tables × 2 FKs)", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0015_science_junction_tables.sql"),
      "utf8",
    );
    const cascadeCount = (text.match(/ON DELETE CASCADE/g) || []).length;
    expect(
      cascadeCount,
      "0015 must have 8 ON DELETE CASCADE (4 junction tables × 2 FKs)",
    ).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Index format: every CREATE INDEX is well-formed.
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — CREATE INDEX format (FR-3)", () => {
  it("every CREATE INDEX statement is well-formed (0.45-era)", () => {
    for (const { name, text } of migrations) {
      const indexMatches = text.match(/CREATE INDEX[^;]+;/g) || [];
      for (const stmt of indexMatches) {
        // 0.45-era format: `CREATE INDEX [IF NOT EXISTS] "name" ON
        // "table" [USING btree] (cols);`. Identifiers may be quoted or unquoted in
        // existing migrations — the 0.45 upgrade normalizes to
        // double-quoted. The space between the table name and `(` is
        // optional in some migrations (e.g. 0020) — allow both.
        const re =
          /CREATE INDEX(?:\s+IF NOT EXISTS)?\s+("?)[^"\s]+\1\s+ON\s+("?)[^"\s]+\2(?:\s+USING\s+\w+)?\s*\([^)]+\)/;
        expect(
          re.test(stmt),
          `${name}: CREATE INDEX must be well-formed. Got: ${stmt}`,
        ).toBe(true);
      }
    }
  });

  it("every CREATE INDEX statement ends with `);`", () => {
    for (const { name, text } of migrations) {
      const indexMatches = text.match(/CREATE INDEX[^;]+;/g) || [];
      for (const stmt of indexMatches) {
        expect(
          stmt.trim().endsWith(");"),
          `${name}: CREATE INDEX must end with \`);\`. Got: ${stmt.slice(-30)}`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 0.45-era index naming: every CREATE INDEX follows `<table>_<col>_idx`.
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — index naming convention (FR-3)", () => {
  it("every CREATE INDEX name ends in `_idx` or `_pkey`", () => {
    for (const { name, text } of migrations) {
      const indexNames = Array.from(
        text.matchAll(/CREATE INDEX(?:\s+IF NOT EXISTS)?\s+("([^"]+)")/g),
      ).map((m) => m[2]);
      for (const idxName of indexNames) {
        expect(
          /_idx$|_pkey$/.test(idxName),
          `${name}: index name "${idxName}" must end in \`_idx\` or \`_pkey\` (0.45-era convention)`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Migration header comment: drizzle-orm 0.45 emits a leading file
// comment on regenerate. Hand-authored 0.44.7-era migrations may skip
// it; Phase 3 must add it.
// ---------------------------------------------------------------------------

describe("drizzle045-migration-format — migration header comment (FR-3)", () => {
  it("every non-trivial migration file starts with a `--` comment block", () => {
    for (const { name, text } of migrations) {
      const firstNonBlank = text.split("\n").find((l) => l.trim().length > 0);
      expect(firstNonBlank, `${name} must not be empty`).toBeDefined();
      // drizzle-orm 0.45 emits a leading `--` comment block describing
      // the change. The 0.44.7 generator does this for some migrations
      // (0000, 0005) but not for hand-authored ones (0009, 0018). Phase 3
      // must add headers to all migrations.
      // Only enforce this on migrations with >= 5 non-empty lines; tiny
      // single-statement files (e.g. 0019) are exempt.
      const lineCount = text
        .split("\n")
        .filter((l) => l.trim().length > 0).length;
      if (lineCount >= 5) {
        expect(
          firstNonBlank!.trim().startsWith("--"),
          `${name} must start with a \`--\` comment block. Got: ${firstNonBlank!.slice(0, 60)}. ` +
            `drizzle-orm 0.45 emits a leading file comment on regenerate describing the change.`,
        ).toBe(true);
      }
    }
  });
});
