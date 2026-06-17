/**
 * Phase 2 — Task 1 (Red): schema compatibility tests for Drizzle 0.45 API.
 *
 * Spec: measure/tracks/drizzle045_major_migration/spec.md §AC 2
 *       ("All schema definitions compile under the new API").
 * Strategy: measure/tracks/drizzle045_major_migration/test-strategy.md §5
 *           (Phase 2: Test — schema-compile, column-presence, import-contract).
 *
 * Per test-strategy.md §5, this file is RED against the drizzle-orm 0.44.7
 * baseline. The Phase 3 Implement role will upgrade to drizzle-orm 0.45.x
 * and update the schema barrel, at which point these tests turn GREEN.
 *
 * Red rationale (per describe block):
 *
 *   1. "version-pinning" — drizzle-orm must be at 0.45.x and the root
 *      pnpm.overrides must not pin 0.44.x. RED at the 0.44.7 baseline.
 *      Phase 3 bumps the root override. (test-strategy §3.3 callout)
 *
 *   2. "schema barrel re-exports marketing.js" — The dirty worktree
 *      added marketing.ts to packages/db/src/schema/ but
 *      packages/db/src/schema/index.ts does NOT yet re-export it. The
 *      Phase 3 schema-update step must add the export. RED until then.
 *
 *   3. "every schema file imports" — Compile gate. Every schema file
 *      must continue to be importable under the new drizzle-orm 0.45
 *      surface. If Phase 3 renames or removes any column/table, this
 *      contract breaks. Regression guard.
 *
 *   4. "column presence" — Locks in the column keys per the Phase 1
 *      schema-map. If Phase 3 drops a column accidentally, this fails.
 *      Regression guard.
 *
 *   5. "column metadata `columnType` discriminator" — Locks in the
 *      0.45-era column-type discriminator values. If 0.45 changes
 *      them, Phase 3 must update both the schema and this test.
 *      Regression guard.
 *
 *   6. "pgEnum contract" — Locks in the enumName + enumValues shape
 *      that 0.45 stabilizes. If the upgrade renames either, both
 *      the schema and this test must be updated together.
 *      Regression guard.
 *
 * Targeted Red command:
 *   pnpm --filter @reading-advantage/db exec vitest run \
 *     src/__tests__/drizzle045-schema-compile.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");
const SCHEMA_DIR = join(PACKAGE_ROOT, "src/schema");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");
const ROOT_PKG_JSON_PATH = join(REPO_ROOT, "package.json");
const LOCKFILE_PATH = join(REPO_ROOT, "pnpm-lock.yaml");

interface PkgJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  pnpm?: {
    overrides?: Record<string, string>;
  };
}

function readPkg(path: string): PkgJson {
  return JSON.parse(readFileSync(path, "utf8")) as PkgJson;
}

let dbPkg: PkgJson;
let rootPkg: PkgJson;
let installedDrizzleOrmVersion: string | null;

beforeAll(() => {
  dbPkg = readPkg(PACKAGE_JSON_PATH);
  rootPkg = readPkg(ROOT_PKG_JSON_PATH);
  function readInstalledPkgJson(pkgPath: string): string | null {
    if (!existsSync(pkgPath)) return null;
    try {
      const meta = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        name?: string;
        version?: string;
      };
      return meta.version ?? null;
    } catch {
      return null;
    }
  }
  installedDrizzleOrmVersion = readInstalledPkgJson(
    join(PACKAGE_ROOT, "node_modules/drizzle-orm/package.json"),
  );
});

// Phase 1 schema-map authoritative 15-file surface.
const EXPECTED_SCHEMA_FILES = [
  "analytics.ts",
  "audit.ts",
  "classrooms.ts",
  "codecamp.ts",
  "content.ts",
  "flashcards.ts",
  "index.ts",
  "licenses.ts",
  "marketing.ts",
  "progress.ts",
  "questions.ts",
  "science.ts",
  "stories.ts",
  "taxonomy.ts",
  "users.ts",
] as const;

// Table-name → source-file mapping. drizzle() in client.ts resolves the
// schema barrel; the barrel currently does not re-export marketing.js
// (RED contract below), so we import from the source files directly.
// NOTE: Vite emits a dynamic-import-vars warning here because the entire
// filename (including .js) is in the variable. The warning is harmless;
// using `../schema/${base}.js` causes Vite to fail the runtime import in
// SSR mode, so we keep the opaque variable pattern.
const TABLE_TO_SOURCE: Readonly<Record<string, string>> = {
  users: "users.js",
  schools: "users.js",
  classrooms: "classrooms.js",
  articles: "content.js",
  campaigns: "marketing.js",
};

// Column-presence expectations per the Phase 1 schema-map. Subset only
// (full coverage lives in schema-parity.test.ts). These are the
// "existence" smoke checks the 0.45 upgrade must preserve.
const EXPECTED_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  users: ["id", "username", "displayUsername", "email", "role", "schoolId"],
  schools: ["id", "name", "createdAt"],
  classrooms: ["id", "name", "schoolId", "teacherId"],
  articles: ["id", "title", "content", "cefrLevel", "published"],
  campaigns: ["id", "type", "app", "name", "status"],
};

// ---------------------------------------------------------------------------
// Schema barrel: marketing.js must be re-exported (RED today).
// ---------------------------------------------------------------------------

describe("drizzle045-schema-compile — schema barrel re-exports marketing.js (FR-2)", () => {
  for (const file of EXPECTED_SCHEMA_FILES) {
    it(`${file} exists on disk`, () => {
      expect(
        existsSync(join(SCHEMA_DIR, file)),
        `Schema file ${file} must exist in ${SCHEMA_DIR}`,
      ).toBe(true);
    });
  }

  it("schema/index.ts re-exports ./marketing.js (Phase 1 schema-map invariant — RED until Phase 3 adds the export)", () => {
    // Phase 1 schema-map asserts marketing.ts is part of the 15-file
    // schema surface. For the drizzle() factory in packages/db/src/client.ts
    // to pick up the marketing tables (campaigns, videoProjects, assets,
    // voiceovers) at type-check time, the barrel MUST re-export them.
    const text = readFileSync(join(SCHEMA_DIR, "index.ts"), "utf8");
    expect(
      text,
      "schema/index.ts must re-export ./marketing.js — drizzle() in client.ts only sees tables that the schema barrel re-exports. " +
        'Phase 3 schema-update step must add `export * from "./marketing.js"` to the barrel.',
    ).toMatch(/export\s*\*\s*from\s*["']\.\/marketing\.js["']/);
  });
});

// ---------------------------------------------------------------------------
// Version-pinning: drizzle-orm 0.45.x and root pnpm.overrides (RED today).
// Per test-strategy §3.3 ("pnpm.overrides ... pins 0.44.7 ... Phase 3
// bumps to 0.45.x"), these assertions are Red at the 0.44.7 baseline.
// ---------------------------------------------------------------------------

describe("drizzle045-schema-compile — version-pinning (0.45 target)", () => {
  it("packages/db/package.json declares drizzle-orm at the 0.45.x range", () => {
    const declared = dbPkg.dependencies?.["drizzle-orm"] ?? "";
    const m = /\^?(\d+)\.(\d+)\.?(\d+)?/.exec(declared);
    expect(
      m,
      `packages/db/package.json must declare drizzle-orm at the 0.45.x range. ` +
        `Got: ${JSON.stringify(declared)}. Phase 3 bumps this from ^0.44.0.`,
    ).not.toBeNull();
    const major = Number(m![1]);
    const minor = Number(m![2]);
    expect(
      [major, minor],
      `drizzle-orm major.minor must be 0.45 to match the 0.45-era contract. ` +
        `Got: ${major}.${minor}.`,
    ).toEqual([0, 45]);
  });

  it("root pnpm.overrides does not pin drizzle-orm to a 0.44.x version", () => {
    // The 0.44.7 pin at the root forces every workspace onto 0.44.7.
    // Phase 3 must either bump the pin to 0.45.x or drop the override
    // so workspace ranges resolve. Either way, the override must NOT
    // still pin 0.44.x.
    const override = rootPkg.pnpm?.overrides?.["drizzle-orm"] ?? "";
    const m = /\^?(\d+)\.(\d+)\.?(\d+)?/.exec(override);
    if (!m) {
      // No override is acceptable (workspace ranges resolve freely).
      return;
    }
    const major = Number(m[1]);
    const minor = Number(m[2]);
    expect(
      [major, minor],
      `pnpm.overrides drizzle-orm must be 0.45.x, not 0.44.x. Got: ${override}.`,
    ).toEqual([0, 45]);
  });

  it("the installed drizzle-orm in packages/db resolves to 0.45.x", () => {
    expect(
      installedDrizzleOrmVersion,
      "packages/db/node_modules/drizzle-orm must be installed for a runtime check",
    ).not.toBeNull();
    const m = /^(\d+)\.(\d+)\.(\d+)/.exec(installedDrizzleOrmVersion!);
    expect(
      m,
      `installed drizzle-orm version must be semver. Got: ${installedDrizzleOrmVersion}`,
    ).not.toBeNull();
    const major = Number(m![1]);
    const minor = Number(m![2]);
    expect(
      [major, minor],
      `installed drizzle-orm must be 0.45.x. Got: ${installedDrizzleOrmVersion}. ` +
        `Phase 3 bumps the root pnpm.overrides to 0.45.x.`,
    ).toEqual([0, 45]);
  });
});

// ---------------------------------------------------------------------------
// Lockfile consistency: pnpm-lock.yaml must match the declared override so
// the upgrade is reproducible on a fresh install (regression audit fix).
// ---------------------------------------------------------------------------

function readLockfileOverride(pkgName: string): string | null {
  if (!existsSync(LOCKFILE_PATH)) return null;
  const lines = readFileSync(LOCKFILE_PATH, "utf8").split("\n");
  let inOverrides = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^overrides:\s*$/.test(line)) {
      inOverrides = true;
      continue;
    }
    if (!inOverrides) continue;
    // End of the overrides block when a de-dented top-level key appears.
    if (/^\S/.test(line)) {
      break;
    }
    const m = new RegExp(`^\\s+${pkgName}:\\s*(.+)$`).exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

describe("drizzle045-schema-compile — lockfile consistency (regression)", () => {
  it("pnpm-lock.yaml overrides drizzle-orm to 0.45.x (not 0.44.x)", () => {
    const override = readLockfileOverride("drizzle-orm");
    expect(
      override,
      "pnpm-lock.yaml must contain a drizzle-orm override entry",
    ).not.toBeNull();
    const m = /\^?(\d+)\.(\d+)\.?(\d+)?/.exec(override!);
    expect(
      m,
      `pnpm-lock.yaml drizzle-orm override must be a version. Got: ${override}`,
    ).not.toBeNull();
    const major = Number(m![1]);
    const minor = Number(m![2]);
    expect(
      [major, minor],
      `pnpm-lock.yaml drizzle-orm override must be 0.45.x. Got: ${override}. ` +
        `Run pnpm install after bumping the root override.`,
    ).toEqual([0, 45]);
  });

  it("pnpm-lock.yaml override matches root package.json pnpm.overrides", () => {
    const lockfileOverride = readLockfileOverride("drizzle-orm");
    const declaredOverride = rootPkg.pnpm?.overrides?.["drizzle-orm"] ?? "";
    expect(
      lockfileOverride,
      "pnpm-lock.yaml must contain a drizzle-orm override entry",
    ).not.toBeNull();
    expect(
      declaredOverride,
      "root package.json must declare a pnpm.overrides drizzle-orm entry",
    ).not.toBe("");
    expect(
      lockfileOverride,
      `pnpm-lock.yaml override (${lockfileOverride}) must match root package.json override (${declaredOverride}). ` +
        `Run pnpm install to resync.`,
    ).toBe(declaredOverride);
  });
});

// ---------------------------------------------------------------------------
// Compile gate: every schema file is importable under the 0.45 surface.
// ---------------------------------------------------------------------------

describe("drizzle045-schema-compile — every schema file imports (FR-2)", () => {
  for (const [tableName, sourceFile] of Object.entries(TABLE_TO_SOURCE)) {
    it(`${tableName} imports from ${sourceFile} under the 0.45 surface`, async () => {
      const mod = await import(`../schema/${sourceFile}`);
      const table = (mod as Record<string, { [k: string]: unknown }>)[
        tableName
      ];
      expect(
        table,
        `${tableName} must be exported from ${sourceFile} (regression guard against accidental removal during the 0.45 upgrade)`,
      ).toBeDefined();
    });
  }
});

// ---------------------------------------------------------------------------
// Column presence: every table has the expected columns (0.45 invariant).
// ---------------------------------------------------------------------------

describe("drizzle045-schema-compile — column presence (FR-2)", () => {
  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_COLUMNS)) {
    const sourceFile = TABLE_TO_SOURCE[tableName] ?? `${tableName}.js`;
    it(`${tableName} table exposes the expected columns (0.45 surface)`, async () => {
      const mod = await import(`../schema/${sourceFile}`);
      const table = (mod as Record<string, { [k: string]: unknown }>)[
        tableName
      ];
      expect(
        table,
        `${tableName} must be exported from ${sourceFile}`,
      ).toBeDefined();
      const colKeys = Object.keys(table).filter(
        (k) => !k.startsWith("_") && !k.startsWith("["),
      );
      for (const col of expectedColumns) {
        expect(
          colKeys,
          `${tableName} must expose column "${col}" (0.45 contract: every pgTable must continue to expose its column keys as direct properties of the table object).`,
        ).toContain(col);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Column metadata: every column has the 0.45-era `columnType` discriminator.
// ---------------------------------------------------------------------------

describe("drizzle045-schema-compile — column metadata exposes 0.45-era `columnType` (FR-2)", () => {
  it("users.id has columnType='PgText' for the text primary key (0.45-era)", async () => {
    const { users } = await import("../schema/users.js");
    const id = (users as unknown as Record<string, { columnType?: string; name?: string }>)
      .id;
    expect(id, "users.id must be defined").toBeDefined();
    expect(
      typeof id.columnType,
      "users.id.columnType must be a string (0.45-era discriminator)",
    ).toBe("string");
    expect(
      id.columnType,
      "users.id.columnType must be 'PgText' for a text primary key (0.45-era discriminator value)",
    ).toBe("PgText");
  });

  it("users.role has columnType='PgEnumColumn' for the pgEnum column (0.45-era)", async () => {
    const { users } = await import("../schema/users.js");
    const role = (users as unknown as Record<string, { columnType?: string }>).role;
    expect(role, "users.role must be defined").toBeDefined();
    expect(
      typeof role.columnType,
      "users.role.columnType must be a string (0.45-era discriminator)",
    ).toBe("string");
    expect(
      role.columnType,
      "users.role.columnType must be 'PgEnumColumn' on the 0.45-era surface",
    ).toBe("PgEnumColumn");
  });

  it("users.createdAt has columnType='PgTimestamp' for the timestamp column (0.45-era)", async () => {
    const { users } = await import("../schema/users.js");
    const createdAt = (users as unknown as Record<string, { columnType?: string }>)
      .createdAt;
    expect(createdAt, "users.createdAt must be defined").toBeDefined();
    expect(
      createdAt.columnType,
      "users.createdAt.columnType must be 'PgTimestamp' on the 0.45-era surface",
    ).toBe("PgTimestamp");
  });

  it("articles.content has columnType='PgText' for the text content column (0.45-era)", async () => {
    const { articles } = await import("../schema/content.js");
    const content = (articles as unknown as Record<string, { columnType?: string }>)
      .content;
    expect(content, "articles.content must be defined").toBeDefined();
    expect(
      content.columnType,
      "articles.content.columnType must be 'PgText' on the 0.45-era surface",
    ).toBe("PgText");
  });
});

// ---------------------------------------------------------------------------
// pgEnum contract: every enum exposes the 0.45-era runtime surface.
// ---------------------------------------------------------------------------

describe("drizzle045-schema-compile — pgEnum carries 0.45-era runtime surface (FR-2)", () => {
  it("users.roleEnum exposes enumName, enumValues (0.45-era)", async () => {
    const { roleEnum } = await import("../schema/users.js");
    const e = roleEnum as unknown as {
      enumName: string;
      enumValues: readonly string[];
    };
    expect(e.enumName, "roleEnum.enumName must be 'role'").toBe("role");
    expect(
      Array.isArray(e.enumValues),
      "roleEnum.enumValues must be an array (0.45-era)",
    ).toBe(true);
    expect(
      e.enumValues,
      "roleEnum.enumValues must contain canonical role values",
    ).toEqual(expect.arrayContaining(["STUDENT", "TEACHER", "ADMIN"]));
  });

  it("marketing.campaignTypeEnum has the 0.45-era enumValues contract", async () => {
    const { campaignTypeEnum } = await import("../schema/marketing.js");
    const e = campaignTypeEnum as unknown as {
      enumName: string;
      enumValues: readonly string[];
    };
    expect(
      e.enumName,
      "campaignTypeEnum.enumName must be 'campaign_type'",
    ).toBe("campaign_type");
    expect(
      Array.isArray(e.enumValues),
      "campaignTypeEnum.enumValues must be an array (0.45-era)",
    ).toBe(true);
    expect(
      e.enumValues,
      "campaignTypeEnum.enumValues must contain both variants",
    ).toEqual(expect.arrayContaining(["video", "infocard"]));
  });
});
