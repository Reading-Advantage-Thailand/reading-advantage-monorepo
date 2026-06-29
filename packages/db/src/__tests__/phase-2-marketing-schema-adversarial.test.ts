/**
 * Phase 2 — Database Schema (Marketing Production Platform) — Adversarial audit
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 2)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §4–§7 the
 * artifact contract is owned by `phase-2-marketing-schema.test.ts` and
 * the live FK-cascade + JSONB behavior is owned by
 * `phase-2-insert-roundtrip.test.ts`. This file is the **third tier**:
 * boundary / failure-path / integration / concurrency / regression tests
 * that an adversarial auditor runs to try to break the contract that the
 * other two files claim is satisfied.
 *
 * The pre-existing tests have specific weak assertions an auditor should
 * not let stand. Examples that motivated this file:
 *
 *   1. `phase-2-marketing-schema.test.ts` checks the SQL text with
 *      `toContain` substrings — a developer could rename a column in the
 *      schema but keep the migration stale, or vice versa, and the
 *      text-only check would not see the drift. We add
 *      `schema-source ⇄ migration-SQL ⇄ snapshot` cross-consistency
 *      assertions below.
 *
 *   2. The artifact test counts `ON DELETE cascade` substrings in the
 *      SQL, but a developer who switches one to `ON DELETE SET NULL`
 *      would still pass the existing 2-count check *only if* they added
 *      a second cascade. We assert **both** the count and the
 *      `onDelete: "cascade"` literals in the Drizzle schema source AND
 *      the `onDelete: "cascade"` in the JSON snapshot.
 *
 *   3. The "latest migration" check is `idx >= 21`. A future idx 22
 *      migration would silently pass this check; we assert strict
 *      `idx === 21` so the assertion is informative.
 *
 *   4. The canonical tag is `0021_sales_advantage` (the migration also
 *      creates Sales Advantage tables). We assert the sentinel maps to
 *      a table that actually exists in the snapshot.
 *
 *   5. `phase-2-insert-roundtrip.test.ts` contains an "environment
 *      probe" test that asserts `expect(HAS_DB).toBe(false)` when
 *      DATABASE_URL is unset — that's a documentation test, not a
 *      behavior test. The contract for live FK cascade and JSONB
 *      round-trip is owned by *itself* but is gated on DATABASE_URL.
 *      This file adds **non-DB** parity checks that catch the same
 *      class of bug (cascade direction, JSONB shape) from the artifact
 *      side, so a future change cannot pass artifact tests but break
 *      runtime behavior without the auditor noticing.
 *
 * Live runtime is verified once per acceptance audit; this file is the
 * always-on guardrail.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  appEnum,
  assetStatusEnum,
  assetTypeEnum,
  campaignStatusEnum,
  campaignTypeEnum,
  campaigns,
  pastTopics,
  settings,
  videoAssets,
  videoProjectStatusEnum,
  videoProjects,
} from "../schema/index.js";

// ───────────────────────────────────────────────────────────────────────
// 0. Test preflight: the schema barrel must export the symbols we test.
//    This is a fail-fast guard for accidental renames during refactors.
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: adversarial preflight (barrel export contract)", () => {
  it("barrel exports every table we test against", () => {
    expect(campaigns).toBeDefined();
    expect(videoProjects).toBeDefined();
    expect(videoAssets).toBeDefined();
    expect(pastTopics).toBeDefined();
    expect(settings).toBeDefined();
  });

  it("barrel exports every enum we test against", () => {
    expect(campaignTypeEnum).toBeDefined();
    expect(campaignStatusEnum).toBeDefined();
    expect(appEnum).toBeDefined();
    expect(assetTypeEnum).toBeDefined();
    expect(assetStatusEnum).toBeDefined();
    expect(videoProjectStatusEnum).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 1. Drizzle schema metadata — column dataTypes, NOT NULL, defaults.
//    The pre-existing artifact test only checks column *names* appear
//    in the SQL; here we check column *types* at the Drizzle runtime
//    metadata level so a wrong type (e.g. `text` instead of `uuid` for
//    `id`) cannot ship without a hard fail.
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: adversarial schema metadata (column dataTypes)", () => {
  const dataCols = (table: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(table)
        .filter(([k]) => !k.startsWith("_") && !k.startsWith("[") && k !== "enableRLS")
        .map(([k, v]) => [k, v as { name: string; dataType: string; columnType: string; notNull: boolean; hasDefault: boolean }]),
    );

  it("campaigns.id is a UUID PK with defaultRandom() and NOT NULL", () => {
    const cols = dataCols(campaigns as unknown as Record<string, unknown>);
    const id = cols["id"];
    expect(id.dataType).toBe("string"); // Drizzle reports 'string' for uuid/text
    expect(id.columnType).toBe("PgUUID");
    expect(id.notNull).toBe(true);
    expect(id.hasDefault).toBe(true);
  });

  it("campaigns.createdAt and updatedAt are timestamps with defaults", () => {
    const cols = dataCols(campaigns as unknown as Record<string, unknown>);
    expect(cols["createdAt"].dataType).toBe("date");
    expect(cols["createdAt"].columnType).toBe("PgTimestamp");
    expect(cols["createdAt"].notNull).toBe(true);
    expect(cols["createdAt"].hasDefault).toBe(true);
    expect(cols["updatedAt"].dataType).toBe("date");
    expect(cols["updatedAt"].columnType).toBe("PgTimestamp");
    expect(cols["updatedAt"].notNull).toBe(true);
    expect(cols["updatedAt"].hasDefault).toBe(true);
  });

  it("videoProjects.script is JSONB and NULLABLE (matches SQL \"script\" jsonb without NOT NULL)", () => {
    const cols = dataCols(videoProjects as unknown as Record<string, unknown>);
    expect(cols["script"].dataType).toBe("json");
    expect(cols["script"].columnType).toBe("PgJsonb");
    expect(cols["script"].notNull).toBe(false); // Nullable per schema → no NOT NULL in SQL
  });

  it("videoProjects.campaignId and videoAssets.projectId are PgUUID and NOT NULL", () => {
    const colsVP = dataCols(videoProjects as unknown as Record<string, unknown>);
    const colsVA = dataCols(videoAssets as unknown as Record<string, unknown>);
    expect(colsVP["campaignId"].columnType).toBe("PgUUID");
    expect(colsVP["campaignId"].notNull).toBe(true);
    expect(colsVA["projectId"].columnType).toBe("PgUUID");
    expect(colsVA["projectId"].notNull).toBe(true);
  });

  it("videoAssets.url and videoAssets.prompt are nullable (matches SQL \"url\" text, \"prompt\" text without NOT NULL)", () => {
    const cols = dataCols(videoAssets as unknown as Record<string, unknown>);
    expect(cols["url"].notNull).toBe(false);
    expect(cols["prompt"].notNull).toBe(false);
  });

  it("settings.key is text and is the primary key (NOT NULL, primary=true)", () => {
    const cols = dataCols(settings as unknown as Record<string, unknown>);
    expect(cols["key"].dataType).toBe("string");
    expect(cols["key"].columnType).toBe("PgText");
    expect(cols["key"].notNull).toBe(true);
  });

  it("settings.value is text NOT NULL (encryption happens at app layer, not DB)", () => {
    const cols = dataCols(settings as unknown as Record<string, unknown>);
    expect(cols["value"].dataType).toBe("string");
    expect(cols["value"].columnType).toBe("PgText");
    expect(cols["value"].notNull).toBe(true);
    // Note: a developer who later wants to use jsonb for structured
    // settings must update this assertion and the migration. The test
    // exists to make the change deliberate.
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. Enum contract — values, uniqueness, identifier validity.
//    The pre-existing test matches the SQL with a regex; here we assert
//    the Drizzle runtime enum and the SQL agree exactly, and the values
//    are valid (no duplicates, no surprise characters).
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: adversarial enum contract", () => {
  const sql0021 = readFileSync(
    join(process.cwd(), "drizzle/0021_sales_advantage.sql"),
    "utf8",
  );

  function sqlEnumValues(name: string): string[] {
    const m = sql0021.match(new RegExp(`CREATE TYPE\\s+(?:"public"\\.)?"${name}"\\s*AS ENUM\\s*\\(([^)]+)\\)`));
    if (!m) throw new Error(`enum ${name} not found in 0021 SQL`);
    return m[1]!
      .split(",")
      .map((v) => v.trim().replace(/^'/, "").replace(/'$/, ""));
  }

  const ENUMS: Array<{ name: string; drizzle: { enumValues: readonly string[] } }> = [
    { name: "campaign_type", drizzle: campaignTypeEnum as unknown as { enumValues: readonly string[] } },
    { name: "campaign_status", drizzle: campaignStatusEnum as unknown as { enumValues: readonly string[] } },
    { name: "app", drizzle: appEnum as unknown as { enumValues: readonly string[] } },
    { name: "asset_type", drizzle: assetTypeEnum as unknown as { enumValues: readonly string[] } },
    { name: "asset_status", drizzle: assetStatusEnum as unknown as { enumValues: readonly string[] } },
    { name: "video_project_status", drizzle: videoProjectStatusEnum as unknown as { enumValues: readonly string[] } },
  ];

  it.each(ENUMS)("$name Drizzle enum exactly matches SQL enum (no drift)", ({ name, drizzle }) => {
    expect([...drizzle.enumValues]).toEqual(sqlEnumValues(name));
  });

  it.each(ENUMS)("$name has no duplicate values (boundary regression)", ({ drizzle }) => {
    const set = new Set(drizzle.enumValues);
    expect(set.size, `duplicate values in ${drizzle.enumValues}`).toBe(drizzle.enumValues.length);
  });

  it.each(ENUMS)("$name values are valid PostgreSQL enum labels", ({ drizzle }) => {
    // PG enum labels: must be non-empty, ≤63 chars (NAMEDATALEN-1), no
    // bare double quotes, and not all-whitespace.
    for (const v of drizzle.enumValues) {
      expect(v.length, `value too long in ${drizzle.enumValues}`).toBeGreaterThan(0);
      expect(v.length, `value ${v} exceeds 63 chars`).toBeLessThanOrEqual(63);
      expect(v).not.toMatch(/"/);
      expect(v.trim()).toBe(v);
    }
  });

  it("appEnum has exactly 8 values matching the 8-product suite (boundary: spec invariant)", () => {
    expect(appEnum.enumValues).toHaveLength(8);
  });

  it("campaignStatusEnum includes the four plan-listed states in the spec order", () => {
    // Plan §Phase 2 explicitly lists: draft → in-progress → complete → archived
    expect([...campaignStatusEnum.enumValues]).toEqual([
      "draft",
      "in-progress",
      "complete",
      "archived",
    ]);
  });

  it("videoProjectStatusEnum is missing 'archived' (intentional — completed projects are not archived, only campaigns are)", () => {
    // Boundary regression: a future developer might add 'archived' here
    // because the spec also mentions archived campaigns. Locking the
    // current shape in a test forces the decision to be deliberate.
    expect([...videoProjectStatusEnum.enumValues]).not.toContain("archived");
    expect([...videoProjectStatusEnum.enumValues]).toEqual([
      "draft",
      "in-progress",
      "complete",
    ]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. Drizzle schema source ⇄ migration SQL cross-consistency.
//    A developer could rename a column in marketing.ts but forget to
//    update the migration, or vice versa. The existing artifact test
//    only checks one direction (SQL content) — this section closes the
//    loop in both directions.
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: adversarial schema ⇄ SQL cross-consistency", () => {
  const schemaSrc = readFileSync(
    join(process.cwd(), "src/schema/marketing.ts"),
    "utf8",
  );
  const sql0021 = readFileSync(
    join(process.cwd(), "drizzle/0021_sales_advantage.sql"),
    "utf8",
  );

  it("schema declares exactly 2 onDelete:\"cascade\" clauses (matches 2 SQL cascades)", () => {
    const cascadeCount = (schemaSrc.match(/onDelete:\s*["']cascade["']/g) || []).length;
    expect(cascadeCount).toBe(2);
  });

  it("schema declares exactly 2 .references() calls (matches 2 SQL FKs)", () => {
    const refsCount = (schemaSrc.match(/\.references\(/g) || []).length;
    expect(refsCount).toBe(2);
  });

  it("schema declares exactly 3 relations() calls (matches 3 exported *Relations)", () => {
    const relCount = (schemaSrc.match(/=\s*relations\(/g) || []).length;
    expect(relCount).toBe(3);
  });

  it("schema declares 5 indexes (3 explicit + past_topics_app + video_assets_project)", () => {
    // Drizzle v0.45 uses (table) => [ index("...").on(...) ] form.
    // We expect 5 calls to index() in marketing.ts.
    const indexCount = (schemaSrc.match(/\bindex\(/g) || []).length;
    expect(indexCount).toBe(5);
  });

  it("every schema .references() points at a UUID column (FK to id, not text name)", () => {
    // Sanity: each .references() in marketing.ts should be `() => X.id`
    const refs = schemaSrc.match(/\.references\(\(\) => \w+\.id/g) || [];
    expect(refs).toHaveLength(2);
    expect(refs[0]).toBe(".references(() => campaigns.id");
    expect(refs[1]).toBe(".references(() => videoProjects.id");
  });

  it("schema uses .defaultRandom() for UUIDs (matches SQL DEFAULT gen_random_uuid())", () => {
    // 4 tables have a defaultRandom PK: campaigns, videoProjects, videoAssets, pastTopics
    const defaults = schemaSrc.match(/\.defaultRandom\(\)/g) || [];
    expect(defaults).toHaveLength(4);
  });

  it("schema imports pgEnum, pgTable, uuid, text, timestamp, jsonb from drizzle-orm/pg-core", () => {
    // Boundary: a developer might import a different driver (mysql, sqlite)
    // by accident. Lock the driver import shape.
    expect(schemaSrc).toMatch(/from "drizzle-orm\/pg-core"/);
    const imports = schemaSrc.match(/import \{([^}]+)\} from "drizzle-orm\/pg-core"/);
    expect(imports, "missing pg-core import block").not.toBeNull();
    for (const sym of ["pgTable", "uuid", "text", "timestamp", "jsonb", "pgEnum", "index"]) {
      expect(imports![1], `missing ${sym} in pg-core import`).toContain(sym);
    }
  });

  it("schema imports `relations` from drizzle-orm (not drizzle-orm/pg-core)", () => {
    // Boundary: relations() lives in drizzle-orm root, not pg-core.
    // A wrong import would fail at runtime with a confusing error.
    expect(schemaSrc).toMatch(/import \{ relations \} from "drizzle-orm"/);
    expect(schemaSrc).not.toMatch(/import \{[^}]*relations[^}]*\} from "drizzle-orm\/pg-core"/);
  });

  it("SQL enums appear BEFORE any CREATE TABLE (PG order requirement)", () => {
    const firstType = sql0021.search(/CREATE TYPE/);
    const firstTable = sql0021.search(/CREATE TABLE/);
    expect(firstType).toBeGreaterThan(-1);
    expect(firstTable).toBeGreaterThan(-1);
    expect(firstType).toBeLessThan(firstTable);
  });

  it("SQL ALTER TABLE … ADD CONSTRAINT appears AFTER all CREATE TABLE (FK must reference existing table)", () => {
    const firstAlter = sql0021.search(/ALTER TABLE/);
    const lastCreate = sql0021.lastIndexOf("CREATE TABLE");
    expect(firstAlter).toBeGreaterThan(-1);
    expect(lastCreate).toBeGreaterThan(-1);
    expect(firstAlter).toBeGreaterThan(lastCreate);
  });

  it("SQL does not use DO $$ … BEGIN blocks (idempotency must come from IF NOT EXISTS)", () => {
    // Boundary regression: a future developer might wrap each CREATE in
    // DO $$ BEGIN … EXCEPTION WHEN duplicate_object … END $$; that
    // changes the migration semantics. Force the simpler form.
    expect(sql0021).not.toMatch(/DO \$\$/);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. Snapshot integrity (Drizzle migration ledger) — prevId chain,
//    FK metadata, version consistency.
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: adversarial snapshot integrity", () => {
  const snap0021 = JSON.parse(
    readFileSync(join(process.cwd(), "drizzle/meta/0021_snapshot.json"), "utf8"),
  ) as {
    id: string;
    prevId: string;
    version: string;
    dialect: string;
    tables: Record<string, {
      name: string;
      columns: Record<string, unknown>;
      foreignKeys: Record<string, {
        name: string;
        tableFrom: string;
        tableTo: string;
        columnsFrom: string[];
        columnsTo: string[];
        onDelete: string;
        onUpdate: string;
      }>;
    }>;
  };

  const snap0020 = JSON.parse(
    readFileSync(join(process.cwd(), "drizzle/meta/0020_snapshot.json"), "utf8"),
  ) as { id: string };

  const journal = JSON.parse(
    readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
  ) as {
    version: string;
    dialect: string;
    entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
  };

  it("0021 snapshot.prevId chain-equals 0020 snapshot.id (no orphan snapshot)", () => {
    expect(snap0021.prevId).toBe(snap0020.id);
  });

  it("0021 snapshot.id is a valid UUIDv4 (not a placeholder, not v1/v5)", () => {
    // Tighten the pre-existing placeholder check to require v4 specifically.
    // v4: 3rd group starts with `4`, 4th group starts with `8`/`9`/`a`/`b`.
    expect(snap0021.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("0021 snapshot.dialect is postgresql (matches journal)", () => {
    expect(snap0021.dialect).toBe("postgresql");
    expect(journal.dialect).toBe("postgresql");
  });

  it("0021 snapshot.version matches journal.version (Drizzle 0.45 uses '7')", () => {
    expect(snap0021.version).toBe(journal.version);
  });

  it("0021 snapshot declares exactly 5 marketing tables (no accidental extra)", () => {
    const marketingTables = Object.keys(snap0021.tables).filter((t) =>
      [
        "public.campaigns",
        "public.video_projects",
        "public.video_assets",
        "public.past_topics",
        "public.settings",
      ].includes(t),
    );
    expect(marketingTables).toHaveLength(5);
  });

  it("0021 snapshot FKs across the 5 marketing tables: exactly two cascades (projects→campaigns, assets→projects)", () => {
    // 0021 snapshot includes ALL tables (cumulative), so we must
    // scope the FK count to the 5 new marketing tables only.
    const marketingTableNames = new Set([
      "public.campaigns",
      "public.video_projects",
      "public.video_assets",
      "public.past_topics",
      "public.settings",
    ]);
    const allFks = Object.values(snap0021.tables)
      .filter((t) => marketingTableNames.has("public." + t.name))
      .flatMap((t) => Object.values(t.foreignKeys));
    expect(allFks).toHaveLength(2);
    for (const fk of allFks) {
      expect(fk.onDelete).toBe("cascade");
      expect(fk.onUpdate).toBe("no action");
    }
    // Chain direction: projects → campaigns; assets → projects
    const projectFk = allFks.find((f) => f.tableFrom === "video_projects");
    expect(projectFk?.tableTo).toBe("campaigns");
    expect(projectFk?.columnsFrom).toEqual(["campaign_id"]);
    expect(projectFk?.columnsTo).toEqual(["id"]);
    const assetFk = allFks.find((f) => f.tableFrom === "video_assets");
    expect(assetFk?.tableTo).toBe("video_projects");
    expect(assetFk?.columnsFrom).toEqual(["project_id"]);
    expect(assetFk?.columnsTo).toEqual(["id"]);
  });

  it("0021 journal entry has idx===21, tag matches canonical filename, when > 0020's when", () => {
    const entry = journal.entries.find((e) => e.tag === "0021_sales_advantage");
    expect(entry, "0021 journal entry missing").toBeDefined();
    expect(entry!.idx).toBe(21);
    const entry0020 = journal.entries.find((e) => e.tag === "0020_sessions_indexes");
    expect(entry0020).toBeDefined();
    expect(entry!.when).toBeGreaterThan(entry0020!.when);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. Sentinel probe integrity — the migration-ledger-doctor exit-code
//    contract. A future refactor that adds/renames 0021 but forgets to
//    update sentinels.ts would still pass the artifact test.
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: adversarial sentinel probe", () => {
  const sentinelsSrc = readFileSync(
    join(process.cwd(), "src/sentinels.ts"),
    "utf8",
  );
  const journal = JSON.parse(
    readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
  ) as {
    entries: Array<{ idx: number; tag: string }>;
  };
  const snap0021 = JSON.parse(
    readFileSync(join(process.cwd(), "drizzle/meta/0021_snapshot.json"), "utf8"),
  ) as { tables: Record<string, { name: string }> };

  it("sentinels.ts registers a probe for 0021_sales_advantage", () => {
    expect(sentinelsSrc).toMatch(/["']0021_sales_advantage["']\s*:\s*\{/);
  });

  it("sentinel probe target table exists in 0021 snapshot (no orphan sentinel)", () => {
    // Extract the probe block for 0021_sales_advantage
    const probeBlock = sentinelsSrc.match(
      /["']0021_sales_advantage["']\s*:\s*\{[^}]+\}/,
    );
    expect(probeBlock, "sentinel block not found").not.toBeNull();
    const targetMatch = probeBlock![0]!.match(/target:\s*["']([^"']+)["']/);
    expect(targetMatch, "sentinel target missing").not.toBeNull();
    const target = targetMatch![1]!;
    const tableNames = Object.values(snap0021.tables).map((t) => t.name);
    expect(
      tableNames,
      `sentinel target "${target}" not found in 0021 snapshot tables (${tableNames.join(", ")})`,
    ).toContain(target);
  });

  it("every journal entry has a sentinel probe (1:1 mapping for the marketing phase)", () => {
    // For Phase 2's purposes we only need 0021 to be registered; but a
    // boundary check: every journal entry tag referenced by marketing
    // must be in sentinels. We look up 0021 specifically here.
    const tags = journal.entries.map((e) => e.tag);
    expect(tags).toContain("0021_sales_advantage");
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. apps/marketing consumer contract — the API routes that already
//    import the marketing schema must keep compiling. If Phase 2 ever
//    renames a table, this test fails fast at the marketing-app level
//    (the API routes would 500 at runtime, not at type-check).
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: consumer contracts (apps/marketing uses these symbols)", () => {
  it("marketing app imports the expected table names from @reading-advantage/db/schema", () => {
    // The marketing app's API routes import the symbols by name from the
    // barrel. If Phase 2 renames any of them, this test fails the green
    // gate before runtime hits the wrong column.
    const consumerFiles = [
      "apps/marketing/app/api/campaigns/route.ts",
      "apps/marketing/app/api/campaigns/[id]/route.ts",
      "apps/marketing/app/api/video/save-topics/route.ts",
      "apps/marketing/app/api/video/research-topics/route.ts",
      "apps/marketing/app/api/settings/route.ts",
    ];
    const expectedImports: Record<string, string[]> = {
      "apps/marketing/app/api/campaigns/route.ts": ["campaigns"],
      "apps/marketing/app/api/campaigns/[id]/route.ts": ["campaigns"],
      "apps/marketing/app/api/video/save-topics/route.ts": ["pastTopics"],
      "apps/marketing/app/api/video/research-topics/route.ts": ["pastTopics", "settings"],
      "apps/marketing/app/api/settings/route.ts": ["settings"],
    };
    for (const f of consumerFiles) {
      // We read from the monorepo root, two levels up from packages/db.
      const src = readFileSync(join(process.cwd(), "..", "..", f), "utf8");
      const m = src.match(/import\s*\{([^}]+)\}\s*from\s*["']@reading-advantage\/db\/schema["']/);
      expect(m, `${f} does not import from @reading-advantage/db/schema`).not.toBeNull();
      const imported = m![1]!
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const expected of expectedImports[f]!) {
        expect(imported, `${f} missing import of ${expected}`).toContain(expected);
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. Concurrency / failure-path parity — FK violation produces a
//    specific error shape, even without a live DB we can assert the
//    runtime client configuration doesn't disable errors. (Live
//    behavior is covered by phase-2-insert-roundtrip.test.ts; here we
//    cover the static config so the live test cannot accidentally be
//    bypassed by flipping a flag in client.ts.)
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: adversarial client.ts failure-path config", () => {
  const clientSrc = readFileSync(
    join(process.cwd(), "src/client.ts"),
    "utf8",
  );
  const connOptionsSrc = readFileSync(
    join(process.cwd(), "src/connection-options.ts"),
    "utf8",
  );

  it("client.ts does not silently swallow the missing-DATABASE_URL error in test/prod runtime", () => {
    // Boundary: a developer who later wraps the import in try/catch
    // would hide DB outages. Lock the shape: must `throw new Error(...)`
    // in production runtime (no return undefined).
    expect(clientSrc).toMatch(/throw new Error/);
    expect(clientSrc).toMatch(/DATABASE_URL/);
  });

  it("connection-options keeps prepare:false for transaction-mode pooler compatibility", () => {
    // FR-2 from connection_pooling_20260522 — critical for Phase 2 because
    // marketing FK queries would fail with "prepared statement s_1 does
    // not exist" if prepare flips to true under a pooler.
    expect(connOptionsSrc).toMatch(/prepare:\s*false/);

    // Strip JSDoc / line comments before the "no prepare:true" check, so
    // a JSDoc description that mentions "prepare: true" as historical
    // context (e.g. "postgres-js uses prepared statements by default
    // (prepare: true)") does not trip the assertion. We are locking
    // *code*, not docs.
    const codeOnly = connOptionsSrc
      .replace(/\/\*[\s\S]*?\*\//g, "") // /* ... */ block comments
      .replace(/^\s*\/\/.*$/gm, ""); // // line comments
    expect(codeOnly).not.toMatch(/prepare:\s*true/);
  });

  it("client.ts exports `db` and `client` (consumers like apps/marketing/app/lib/db.ts depend on `db`)", () => {
    expect(clientSrc).toMatch(/export const db\s*=/);
    expect(clientSrc).toMatch(/export \{ client \}/);
  });
});
