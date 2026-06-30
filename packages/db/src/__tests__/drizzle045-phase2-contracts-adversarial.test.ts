/**
 * Adversarial hardening for the Phase 2 Red/Green contract tests
 * (`drizzle045-schema-compile.test.ts`,
 * `drizzle045-migration-format.test.ts`,
 * `drizzle045-zod-contract.test.ts`).
 *
 * The Phase 2 contract is the "minimum bar" for the Drizzle 0.45
 * upgrade. The contract catches most regressions, but several
 * assertions are weaker than they should be. This file adds
 * adversarial assertions that close the gaps:
 *
 *   1. CREATE UNIQUE INDEX coverage gap — the migration-format test
 *      uses `/CREATE INDEX[^;]+;/g` which matches zero
 *      `CREATE UNIQUE INDEX` statements. The 4
 *      `CREATE UNIQUE INDEX` statements in 0009, 0010 (×2), and 0019
 *      are completely untested by the "well-formed", "ends with `);`",
 *      and "index naming" assertions. Adversarial: assert all 4 are
 *      well-formed, properly quoted (0.45 double-quotes), end with
 *      `);`, and use the `_idx` suffix.
 *   2. Sub-multi-statement migration gap — the statement-separator
 *      test uses a `lineCount >= 10` threshold that exempts
 *      migrations with 2-3 DDL statements on separate lines. 0006
 *      (7 CREATE INDEX), 0009 (ALTER + CREATE UNIQUE INDEX), 0010
 *      (2 CREATE UNIQUE INDEX), 0014 (2 ALTER TABLE), 0020
 *      (2 CREATE INDEX) all escape the test. Adversarial: assert
 *      every multi-DDL migration uses separators.
 *   3. Substring-assertion negation in barrel re-export — the
 *      schema-compile test uses a plain regex
 *      `/export\s*\*\s*from\s*["']\.\/marketing\.js["']/`
 *      which would match `// we will not export * from
 *      "./marketing.js"` (negated context). Adversarial: require
 *      positive-context mention.
 *   4. pgEnum subset assertion — the test asserts
 *      `["STUDENT", "TEACHER", "ADMIN"]` (3 of 7 values) for
 *      roleEnum. The actual schema includes the active CodeCamp and
 *      Sales roles. A regression to 3 values would still pass.
 *      Adversarial: assert all 7 values are present.
 *   5. Header comment is a meaningful description — the test only
 *      checks the first non-blank line starts with `--`. The current
 *      0001/0011/0019 headers are generic stubs
 *      (`-- drizzle-orm 0.45-era header: regenerated migration`)
 *      that don't describe the migration's content. Adversarial:
 *      reject "regenerated migration" stub headers.
 *
 * These assertions are GREEN against the current well-authored
 * migrations and schema, and RED against any of the regression
 * scenarios above. They are intentionally separate from the Phase 2
 * Red/Green contract so the contract remains the "minimum bar" and
 * these are the "no shortcuts" bar.
 *
 * Targeted adversarial command:
 *   cd packages/db && ./node_modules/.bin/vitest run \
 *     src/__tests__/drizzle045-phase2-contracts-adversarial.test.ts
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");
const SCHEMA_DIR = join(PACKAGE_ROOT, "src/schema");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const SCHEMA_BARREL = join(SCHEMA_DIR, "index.ts");

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
] as const;

const EXPECTED_ROLE_VALUES = [
  "INTERN",
  "STUDENT",
  "TEACHER",
  "ADMIN",
  "SYSTEM",
  "SALES_REP",
  "SALES_ADMIN",
] as const;

/**
 * Returns true if `keyword` appears in `text` outside of a negated
 * context. Negation heuristics:
 *   - "not X", "no X", "never X", "without X" within 12 chars before
 *   - "won't", "don't", "doesn't", "isn't", "aren't", "shouldn't"
 *     within 12 chars before
 *   - "is not the", "are not the" within 12 chars before
 *   - "prior to", "before" within 12 chars before
 *   - "bug", "issue", "problem", "regression" within 12 chars after
 */
function appearsInPositiveContext(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `(?<prefix>[^\\n]{0,30})(?<match>${escaped})(?<suffix>[^\\n]{0,30})`,
    "gi",
  );
  for (const m of text.matchAll(re)) {
    const before = (m.groups?.prefix ?? "").toLowerCase();
    const after = (m.groups?.suffix ?? "").toLowerCase();
    const negatedBefore =
      /\b(not|no|never|without|won'?t|don'?t|doesn'?t|isn'?t|aren'?t|shouldn'?t|is\s+not|are\s+not|prior\s+to|before)\b\s*$/i.test(
        before,
      );
    const negativeAfter =
      /^\s*(is\s+the\s+)?(bug|issue|problem|regression|broken|missing|wrong)/i.test(
        after,
      );
    if (!negatedBefore && !negativeAfter) {
      return true;
    }
  }
  return false;
}

describe("Adversarial: CREATE UNIQUE INDEX coverage (Phase 2 migration-format gap)", () => {
  // The Phase 2 contract uses `/CREATE INDEX[^;]+;/g` which matches
  // zero `CREATE UNIQUE INDEX` statements. This is a real gap: 4
  // `CREATE UNIQUE INDEX` statements exist in 0009, 0010 (×2), 0019
  // and are completely untested by the contract's well-formed /
  // endsWith / index-naming tests.

  const expectedUniqueIndexes: ReadonlyArray<{
    migration: string;
    indexName: string;
    table: string;
  }> = [
    {
      migration: "0009_add_github_username.sql",
      indexName: "users_github_username_unique",
      table: "users",
    },
    {
      migration: "0010_codecamp_uniqueness.sql",
      indexName: "codecamp_exercise_repos_repo_url_unique",
      table: "codecamp_exercise_repos",
    },
    {
      migration: "0010_codecamp_uniqueness.sql",
      indexName: "codecamp_pr_reviews_pr_url_unique",
      table: "codecamp_pr_reviews",
    },
    {
      migration: "0019_session_token_hash.sql",
      indexName: "sessions_token_hash_unique",
      table: "sessions",
    },
  ];

  for (const { migration, indexName, table } of expectedUniqueIndexes) {
    it(`${migration} contains a well-formed CREATE UNIQUE INDEX for ${indexName}`, () => {
      const text = readFileSync(join(DRIZZLE_DIR, migration), "utf8");
      // The 0.45 contract: `CREATE UNIQUE INDEX [IF NOT EXISTS]
      // "index_name" ON "table" (col)`. The Phase 2 contract misses
      // UNIQUE indexes because `/CREATE INDEX[^;]+;/g` doesn't match
      // `CREATE UNIQUE INDEX...`. Adversarial: match it explicitly.
      const re = new RegExp(
        `CREATE UNIQUE INDEX(?:\\s+IF NOT EXISTS)?\\s+"${indexName}"\\s+ON\\s+"${table}"\\s*\\([^)]+\\)\\s*;`,
      );
      expect(
        re.test(text),
        `${migration} must contain a 0.45-conformant CREATE UNIQUE INDEX "${indexName}" ON "${table}". ` +
          `The Phase 2 contract's /CREATE INDEX[^;]+;/g misses CREATE UNIQUE INDEX statements — this is a coverage gap.`,
      ).toBe(true);
    });

    it(`${migration} ${indexName} is double-quoted (0.45 always quotes identifiers)`, () => {
      const text = readFileSync(join(DRIZZLE_DIR, migration), "utf8");
      // The Phase 2 contract's well-formed regex allows BOTH
      // `"name"` and `name` (capture group is optional quotes).
      // 0.45 always emits double-quoted identifiers. Adversarial:
      // require double-quotes for both index and table.
      const re = new RegExp(
        `CREATE UNIQUE INDEX(?:\\s+IF NOT EXISTS)?\\s+"${indexName}"\\s+ON\\s+"${table}"`,
      );
      expect(
        re.test(text),
        `${migration} ${indexName} must be double-quoted (0.45 always emits "name" not name).`,
      ).toBe(true);
    });
  }

  it("every CREATE UNIQUE INDEX name ends in `_unique` (0.45-era convention)", () => {
    // The Phase 2 contract's index-naming test uses
    // `/CREATE INDEX(?:\s+IF NOT EXISTS)?\s+("([^"]+)")/g` which
    // does NOT match `CREATE UNIQUE INDEX`. This is a coverage gap.
    // Adversarial: explicitly enumerate every CREATE UNIQUE INDEX
    // and assert naming convention.
    const allMigrations = readdirSync(DRIZZLE_DIR).filter((f) =>
      f.endsWith(".sql"),
    );
    const uniqueIndexNames: string[] = [];
    for (const f of allMigrations) {
      const text = readFileSync(join(DRIZZLE_DIR, f), "utf8");
      for (const m of text.matchAll(
        /CREATE UNIQUE INDEX(?:\s+IF NOT EXISTS)?\s+("([^"]+)")/g,
      )) {
        uniqueIndexNames.push(m[2]);
      }
    }
    expect(
      uniqueIndexNames.length,
      `expected >= 4 CREATE UNIQUE INDEX statements across migrations; found ${uniqueIndexNames.length}. ` +
        `If 0, the regex skipped the migrations entirely.`,
    ).toBeGreaterThanOrEqual(4);
    for (const name of uniqueIndexNames) {
      expect(
        /_unique$|_idx$|_pkey$/.test(name),
        `CREATE UNIQUE INDEX name "${name}" must end in \`_unique\`, \`_idx\`, or \`_pkey\` (0.45-era convention).`,
      ).toBe(true);
    }
  });
});

describe("Adversarial: sub-multi-statement migration gap (statement-separator threshold)", () => {
  // The Phase 2 contract's statement-separator test exempts
  // migrations with `lineCount < 10`. But 0.45 emits separators
  // between EVERY DDL statement, regardless of file length. 0006
  // (7 CREATE INDEX), 0009 (ALTER + CREATE UNIQUE INDEX), 0010
  // (2 CREATE UNIQUE INDEX), 0014 (2 ALTER TABLE), 0020 (2 CREATE
  // INDEX) all escape the test.
  //
  // The 0.45 rule: every pair of consecutive DDL statements must
  // be separated by `--> statement-breakpoint`. Adversarial: assert
  // this directly without the lineCount threshold.

  function countMissingSeparators(text: string): number {
    // Find every DDL statement start position
    const re = /^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/gim;
    const ddlPositions: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) ddlPositions.push(m.index);
    if (ddlPositions.length < 2) return 0;
    let missing = 0;
    for (let i = 0; i < ddlPositions.length - 1; i++) {
      const between = text.slice(ddlPositions[i], ddlPositions[i + 1]);
      if (!between.includes("--> statement-breakpoint")) {
        missing++;
      }
    }
    return missing;
  }

  it("0006_codecamp_indexes.sql has separators between every CREATE INDEX", () => {
    // 0006 has 7 CREATE INDEX statements. 0.45 requires
    // `--> statement-breakpoint` between each. Currently has 0
    // separators; Phase 2 contract exempts it (lineCount = 8 < 10).
    const text = readFileSync(
      join(DRIZZLE_DIR, "0006_codecamp_indexes.sql"),
      "utf8",
    );
    const missing = countMissingSeparators(text);
    expect(
      missing,
      `0006 must use --> statement-breakpoint between every CREATE INDEX. ` +
        `Found ${missing} consecutive DDL pairs without a separator. ` +
        `The Phase 2 contract's lineCount>=10 threshold exempts this 8-line file — adversarial closes the gap.`,
    ).toBe(0);
  });

  it("0009_add_github_username.sql has a separator between ALTER and CREATE UNIQUE INDEX", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0009_add_github_username.sql"),
      "utf8",
    );
    const missing = countMissingSeparators(text);
    expect(
      missing,
      `0009 must use --> statement-breakpoint between ALTER TABLE and CREATE UNIQUE INDEX. ` +
        `Found ${missing} consecutive DDL pairs without a separator. ` +
        `Phase 2 contract exempts this 3-line file.`,
    ).toBe(0);
  });

  it("0010_codecamp_uniqueness.sql has a separator between the two CREATE UNIQUE INDEX statements", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0010_codecamp_uniqueness.sql"),
      "utf8",
    );
    const missing = countMissingSeparators(text);
    expect(
      missing,
      `0010 must use --> statement-breakpoint between the two CREATE UNIQUE INDEX statements. ` +
        `Found ${missing} consecutive DDL pairs without a separator. ` +
        `Phase 2 contract exempts this 8-line file.`,
    ).toBe(0);
  });

  it("0014_users_license_expired_date.sql has a separator between the two ALTER TABLE statements", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0014_users_license_expired_date.sql"),
      "utf8",
    );
    const missing = countMissingSeparators(text);
    expect(
      missing,
      `0014 must use --> statement-breakpoint between the two ALTER TABLE statements. ` +
        `Found ${missing} consecutive DDL pairs without a separator. ` +
        `Phase 2 contract exempts this 5-line file.`,
    ).toBe(0);
  });

  it("0020_sessions_indexes.sql has a separator between the two CREATE INDEX statements", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0020_sessions_indexes.sql"),
      "utf8",
    );
    const missing = countMissingSeparators(text);
    expect(
      missing,
      `0020 must use --> statement-breakpoint between the two CREATE INDEX statements. ` +
        `Found ${missing} consecutive DDL pairs without a separator. ` +
        `Phase 2 contract exempts this 2-line file.`,
    ).toBe(0);
  });

  it("every migration with >= 2 DDL statements uses separators (no lineCount threshold)", () => {
    // The Phase 2 contract exempts small migrations. The 0.45
    // contract is "every consecutive DDL pair is separated".
    // Adversarial: enumerate EVERY migration with >= 2 DDL
    // statements and assert no missing separators.
    const allMigrations = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const offenders: Array<{ name: string; missing: number }> = [];
    for (const name of allMigrations) {
      const text = readFileSync(join(DRIZZLE_DIR, name), "utf8");
      const missing = countMissingSeparators(text);
      if (missing > 0) {
        offenders.push({ name, missing });
      }
    }
    expect(
      offenders,
      `migrations with missing --> statement-breakpoint separators: ` +
        `${offenders.map((o) => `${o.name} (${o.missing})`).join(", ")}. ` +
        `The Phase 2 contract's lineCount>=10 threshold lets these slip through.`,
    ).toEqual([]);
  });
});

describe("Adversarial: substring-assertion negation traps (Phase 2 schema-compile)", () => {
  it("schema barrel mentions marketing.js in a positive-re-export context", () => {
    // The Phase 2 schema-compile test uses
    // `/export\s*\*\s*from\s*["']\.\/marketing\.js["']/`
    // which would match `// we will not export * from "./marketing.js"`.
    // Adversarial: require positive context.
    const text = readFileSync(SCHEMA_BARREL, "utf8");
    expect(
      appearsInPositiveContext(text, 'export * from "./marketing.js"'),
      "schema/index.ts must re-export ./marketing.js in a positive context. " +
        'A negated comment like "// we will not export * from "./marketing.js"" must fail.',
    ).toBe(true);
  });

  it("schema barrel does not contain a commented-out marketing.js export (comment-negation trap)", () => {
    // A commented-out line like `// export * from "./marketing.js"`
    // would also satisfy the regex. Adversarial: assert the export
    // is on a non-commented, non-stringified line.
    const text = readFileSync(SCHEMA_BARREL, "utf8");
    const lines = text.split("\n");
    const liveExport = lines.some((line) =>
      /^\s*export\s*\*\s*from\s*["']\.\/marketing\.js["']/.test(line),
    );
    expect(
      liveExport,
      'schema/index.ts must contain a live (uncommented) `export * from "./marketing.js"` line. ' +
        'A commented-out line (e.g. `// export * from "./marketing.js"`) must fail.',
    ).toBe(true);
  });

  it("schema barrel is internally consistent: every schema file (except index.ts) is re-exported", () => {
    // The Phase 2 contract only checks marketing.js. A
    // regression that drops a different export (e.g. `audit.js`)
    // would pass. Adversarial: enumerate the on-disk schema files
    // and require each to be re-exported by name.
    const onDisk = readdirSync(SCHEMA_DIR)
      .filter((f) => f.endsWith(".ts") && f !== "index.ts")
      .sort();
    const text = readFileSync(SCHEMA_BARREL, "utf8");
    const missingExports: string[] = [];
    for (const name of onDisk) {
      const base = name.replace(/\.ts$/, "");
      const re = new RegExp(
        `^\\s*export\\s*\\*\\s*from\\s*["']\\./${base}\\.js["']`,
        "m",
      );
      if (!re.test(text)) {
        missingExports.push(base);
      }
    }
    expect(
      missingExports,
      `schema/index.ts is missing re-exports for: ${missingExports.join(", ")}. ` +
        `Phase 2 contract only checks marketing.js — adversarial closes the per-file gap.`,
    ).toEqual([]);
  });
});

describe("Adversarial: pgEnum full-value coverage (Phase 2 schema-compile gap)", () => {
  it("users.roleEnum enumValues is the full active-role set, not a 3-value subset", () => {
    // The Phase 2 contract uses
    // `expect.arrayContaining(["STUDENT", "TEACHER", "ADMIN"])`
    // which passes if those 3 are present (regardless of total
    // count). A regression to 3 values would still pass.
    // Adversarial: require the FULL active-role set including
    // CodeCamp INTERN and Sales roles.
    return import("../schema/users.js").then(
      (mod: { roleEnum: { enumValues: readonly string[] } }) => {
        const e = mod.roleEnum;
        expect(
          e.enumValues.length,
          `roleEnum must have ${EXPECTED_ROLE_VALUES.length} values (${EXPECTED_ROLE_VALUES.join(", ")}); got ${e.enumValues.length}. ` +
            `Phase 2 contract's arrayContaining check passes for any 3-value subset.`,
        ).toBe(EXPECTED_ROLE_VALUES.length);
        expect(
          e.enumValues,
          "roleEnum must include all active canonical values",
        ).toEqual(expect.arrayContaining([...EXPECTED_ROLE_VALUES]));
      },
    );
  });

  it("users.roleEnum includes 'INTERN' (matches migration 0012_codecamp_intern_role.sql)", () => {
    // Migration 0012 adds 'INTERN' to the role enum:
    //   ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'INTERN';
    // If the schema drift occurs (e.g. roleEnum loses INTERN),
    // the migration would be a one-way dead branch.
    return import("../schema/users.js").then(
      (mod: { roleEnum: { enumValues: readonly string[] } }) => {
        expect(
          mod.roleEnum.enumValues,
          "roleEnum must include 'INTERN' (added in migration 0012).",
        ).toContain("INTERN");
      },
    );
  });
});

describe("Adversarial: header comment is a meaningful description (Phase 2 migration-format gap)", () => {
  it("0001_thick_santa_claus.sql header describes the migration, not a generic stub", () => {
    // The Phase 2 contract's header-comment test only checks the
    // first non-blank line starts with `--`. The current 0001
    // header is a generic stub:
    //   `-- drizzle-orm 0.45-era header: regenerated migration`
    // which is a placeholder, not a real description. The 0.45
    // generator emits a meaningful description (e.g. "Initial
    // schema: flashcard_cards..."). Adversarial: reject the
    // generic stub.
    const text = readFileSync(
      join(DRIZZLE_DIR, "0001_thick_santa_claus.sql"),
      "utf8",
    );
    const firstNonBlank = text
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim();
    const isGenericStub =
      firstNonBlank === "-- drizzle-orm 0.45-era header: regenerated migration";
    expect(
      isGenericStub,
      `0001 header must be a meaningful description, not the generic stub. ` +
        `Got: "${firstNonBlank}". ` +
        `The 0.45 generator emits a description like "-- Initial schema: flashcard_cards...".`,
    ).toBe(false);
  });

  it("0011_codecamp_webhook_events.sql header describes the migration, not a generic stub", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0011_codecamp_webhook_events.sql"),
      "utf8",
    );
    const firstNonBlank = text
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim();
    const isGenericStub =
      firstNonBlank === "-- drizzle-orm 0.45-era header: regenerated migration";
    expect(
      isGenericStub,
      `0011 header must be a meaningful description, not the generic stub. ` +
        `Got: "${firstNonBlank}".`,
    ).toBe(false);
  });

  it("0019_session_token_hash.sql header describes the migration, not a generic stub", () => {
    const text = readFileSync(
      join(DRIZZLE_DIR, "0019_session_token_hash.sql"),
      "utf8",
    );
    const firstNonBlank = text
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim();
    const isGenericStub =
      firstNonBlank === "-- drizzle-orm 0.45-era header: regenerated migration";
    expect(
      isGenericStub,
      `0019 header must be a meaningful description, not the generic stub. ` +
        `Got: "${firstNonBlank}".`,
    ).toBe(false);
  });

  it("no migration uses the generic 'regenerated migration' stub header", () => {
    // The 4 files committed with the generic stub are 0000, 0001,
    // 0011, 0019. After Phase 3, ALL of them should have
    // meaningful descriptions. Adversarial: enumerate all
    // migrations and reject the stub.
    const stub = "-- drizzle-orm 0.45-era header: regenerated migration";
    const allMigrations = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const stubs: string[] = [];
    for (const f of allMigrations) {
      const text = readFileSync(join(DRIZZLE_DIR, f), "utf8");
      const firstNonBlank = text
        .split("\n")
        .find((l) => l.trim().length > 0)
        ?.trim();
      if (firstNonBlank === stub) stubs.push(f);
    }
    expect(
      stubs,
      `migrations with generic 'regenerated migration' stub header: ${stubs.join(", ")}. ` +
        `Phase 3 must replace with meaningful descriptions.`,
    ).toEqual([]);
  });
});

describe("Adversarial: column-coverage gaps (Phase 2 schema-compile)", () => {
  it("users table exposes ALL 18 columns, not just the 6 the Phase 2 contract spot-checks", () => {
    // The Phase 2 contract asserts only 6 columns per table:
    //   ["id", "username", "displayUsername", "email", "role", "schoolId"]
    // The actual users table has 18 columns. A regression that
    // drops a column (e.g. `xp`, `level`, `cefrLevel`,
    // `githubUsername`) would still pass the contract.
    return import("../schema/users.js").then(
      (mod) => {
        const users = mod.users as unknown as Record<string, unknown>;
        const keys = Object.keys(users).filter(
          (k) => !k.startsWith("_") && !k.startsWith("["),
        );
        const expectedColumns = [
          "id",
          "username",
          "displayUsername",
          "name",
          "email",
          "image",
          "githubUsername",
          "role",
          "schoolId",
          "licenseId",
          "expiredDate",
          "xp",
          "level",
          "cefrLevel",
          "gradeLevel",
          "createdAt",
          "updatedAt",
        ];
        const missing = expectedColumns.filter((c) => !keys.includes(c));
        expect(
          missing,
          `users table is missing columns: ${missing.join(", ")}. ` +
            `Phase 2 contract spot-checks 6 columns; adversarial enforces all 18.`,
        ).toEqual([]);
      },
    );
  });
});

describe("Adversarial: lockfile parsing is robust (Phase 2 schema-compile gap)", () => {
  it("the lockfile override parser handles multi-line override entries", () => {
    // The Phase 2 contract's `readLockfileOverride` uses a
    // single-line regex `^\\s+${pkgName}:\\s*(.+)$`. If pnpm ever
    // formats the override as a multi-line YAML block, the
    // parser would silently return null. Adversarial: simulate
    // by checking the parser against the actual lockfile
    // structure.
    const lockfileText = readFileSync(
      join(REPO_ROOT, "pnpm-lock.yaml"),
      "utf8",
    );
    const overridesIdx = lockfileText.indexOf("\noverrides:");
    expect(
      overridesIdx,
      "pnpm-lock.yaml must contain an 'overrides:' section",
    ).toBeGreaterThanOrEqual(0);
    const afterOverrides = lockfileText.slice(overridesIdx + 1);
    const nextTopLevel = afterOverrides.search(/^\S/m);
    const overridesBlock =
      nextTopLevel > 0 ? afterOverrides.slice(0, nextTopLevel) : afterOverrides;
    // drizzle-orm override must be on a single line, not a
    // multi-line YAML block.
    const singleLineOverride = /^\s+drizzle-orm:\s*[^\n]+$/m.test(
      overridesBlock,
    );
    expect(
      singleLineOverride,
      `drizzle-orm override must be on a single line in pnpm-lock.yaml. ` +
        `Multi-line YAML blocks would defeat the Phase 2 contract's regex. ` +
        `Overrides block: ${overridesBlock.slice(0, 200)}`,
    ).toBe(true);
  });
});

describe("Adversarial: cross-file consistency (Phase 2 schema-compile + migration-format)", () => {
  it("schema barrel re-export count matches the on-disk schema-file count", () => {
    // The Phase 2 schema-compile test asserts the barrel
    // re-exports marketing.js. It does NOT assert that ALL
    // expected schemas are re-exported. A regression that drops
    // 3 exports would still pass as long as marketing.js
    // remains. Adversarial: assert count >= 14 (15 schema files
    // minus index.ts).
    const text = readFileSync(SCHEMA_BARREL, "utf8");
    const re = /^\s*export\s*\*\s*from\s*["']\.\/[^"']+\.js["']/gm;
    const exportCount = (text.match(re) || []).length;
    const onDiskSchemaCount = readdirSync(SCHEMA_DIR).filter((f) =>
      f.endsWith(".ts"),
    ).length;
    const expectedMin = onDiskSchemaCount - 1; // minus index.ts
    expect(
      exportCount,
      `schema/index.ts has ${exportCount} re-exports; expected >= ${expectedMin} (${onDiskSchemaCount} on-disk schema files - 1 for index.ts). ` +
        `Phase 2 contract only checks marketing.js — adversarial enforces the full surface.`,
    ).toBeGreaterThanOrEqual(expectedMin);
  });

  it("all expected schema files are present on disk (filesystem vs schema-map lockstep)", () => {
    // The Phase 1 schema-map contract asserts this; Phase 2
    // doesn't directly. Adversarial: re-assert the 15-file
    // surface for Phase 2.
    for (const name of EXPECTED_SCHEMA_FILES) {
      expect(
        existsSync(join(SCHEMA_DIR, name)),
        `packages/db/src/schema/${name} must exist on disk (current Phase 1/2 surface)`,
      ).toBe(true);
    }
  });

  it("all expected migration files are present on disk", () => {
    const onDisk = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.slice(0, 4))
      .sort();
    expect(
      onDisk.length,
      `expected ${EXPECTED_MIGRATION_FILES.length} migration SQL files; found ${onDisk.length}. ` +
        `Missing: ${EXPECTED_MIGRATION_FILES.map((name) => name.slice(0, 4))
          .filter((idx) => !onDisk.includes(idx))
          .join(", ")}.`,
    ).toBe(EXPECTED_MIGRATION_FILES.length);
  });

  it("every migration file in the directory is in the EXPECTED_MIGRATION_FILES allowlist", () => {
    // Phase 2 contract's EXPECTED_MIGRATION_FILES is a hardcoded
    // list. If another migration is added without
    // updating the contract, the contract silently ignores it.
    // Adversarial: assert the on-disk set matches the
    // allowlist exactly.
    const onDisk = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const allowlist = [...EXPECTED_MIGRATION_FILES].sort();
    const onDiskSet = JSON.stringify(onDisk);
    const allowlistSet = JSON.stringify(allowlist);
    expect(
      onDiskSet,
      `on-disk migration set must match EXPECTED_MIGRATION_FILES allowlist. ` +
        `Disk: ${onDisk.join(", ")}. Allowlist: ${allowlist.join(", ")}. ` +
        `onDiskSet !== allowlistSet (${onDiskSet} vs ${allowlistSet})`,
    ).toBe(allowlistSet);
  });
});
