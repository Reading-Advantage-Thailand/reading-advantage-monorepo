/**
 * Phase 7.1 — Marketing schema integrity Red contracts.
 *
 * This file owns Drizzle metadata and migration contracts for the Marketing
 * tables. It deliberately separates source-level guarantees from the live
 * duplicate behavior characterized in the Marketing-app test.
 */

import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "../schema/index.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(TEST_DIR, "../..");
const MARKETING_CONSTANTS_PATH = resolve(
  PACKAGE_ROOT,
  "src/schema/marketing-constants.ts",
);
const MARKETING_SOURCE = readFileSync(
  resolve(PACKAGE_ROOT, "src/schema/marketing.ts"),
  "utf8",
);
const MIGRATION_SOURCE = readdirSync(resolve(PACKAGE_ROOT, "drizzle"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(resolve(PACKAGE_ROOT, "drizzle", name), "utf8"))
  .join("\n");
const MARKETING_AUDIT_MIGRATION = readdirSync(resolve(PACKAGE_ROOT, "drizzle"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(resolve(PACKAGE_ROOT, "drizzle", name), "utf8"))
  .find((source) =>
    /ALTER TABLE\s+["']video_projects["'][\s\S]{0,500}["']updated_at["']/i.test(
      source,
    ),
  );

const EXPECTED_APPS = [
  "reading-advantage",
  "primary-advantage",
  "storytime",
  "math-advantage",
  "science-advantage",
  "stem-advantage",
  "zhongwen-advantage",
  "tutor-advantage",
] as const;

type Table = Record<string, unknown>;

const OLD_MARKETING_SCHEMA = `
  CREATE TABLE campaigns (
    id uuid PRIMARY KEY,
    type text NOT NULL,
    app text NOT NULL,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  );
  CREATE TABLE video_projects (
    id uuid PRIMARY KEY,
    campaign_id uuid NOT NULL,
    topic text NOT NULL,
    script jsonb,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamp NOT NULL DEFAULT now()
  );
  CREATE TABLE video_assets (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL,
    scene_index text NOT NULL,
    type text NOT NULL,
    url text,
    prompt text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp NOT NULL DEFAULT now()
  );
  CREATE TABLE past_topics (
    id uuid PRIMARY KEY,
    app text NOT NULL,
    topic text NOT NULL,
    normalized_key text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  );
`;

let liveClient: PGlite | undefined;

function columns(table: Table): Record<string, Table> {
  return Object.fromEntries(
    Object.entries(table).filter(
      ([key]) => !key.startsWith("_") && !key.startsWith("[") && key !== "enableRLS",
    ),
  ) as Record<string, Table>;
}

function expectColumn(table: Table, tableName: string, columnName: string): Table {
  const column = columns(table)[columnName];
  expect(column, `${tableName} is missing ${columnName}`).toBeDefined();
  return column ?? {};
}

describe("Phase 7.1: typed videoProjects.script contract", () => {
  it("adds a database CHECK that rejects non-array video_projects.script JSONB", () => {
    const hasScriptArrayCheck = /(?:video_projects[\s\S]{0,500}CHECK|CHECK[\s\S]{0,500}video_projects)[\s\S]{0,500}jsonb_typeof\(\s*["']?script["']?\s*\)\s*=\s*["']array["']/i.test(
      MIGRATION_SOURCE,
    );
    expect(hasScriptArrayCheck).toBe(true);
  });
});

describe("Phase 7.1: Marketing audit columns", () => {
  it("adds updatedAt to videoProjects and videoAssets as non-null timestamps", () => {
    for (const [tableName, table] of [
      ["videoProjects", schema.videoProjects],
      ["videoAssets", schema.videoAssets],
    ] as const) {
      const updatedAt = expectColumn(table as unknown as Table, tableName, "updatedAt");
      expect(updatedAt.columnType, `${tableName}.updatedAt type`).toBe("PgTimestamp");
      expect(updatedAt.dataType, `${tableName}.updatedAt data type`).toBe("date");
      expect(updatedAt.notNull, `${tableName}.updatedAt nullability`).toBe(true);
      expect(updatedAt.hasDefault, `${tableName}.updatedAt default`).toBe(true);
    }
  });

  it("declares updated_at touch triggers for every mutable Marketing table", () => {
    for (const tableName of ["video_projects", "video_assets"]) {
      const hasUpdatedAtTrigger = new RegExp(
        `CREATE TRIGGER[^;]*${tableName}[^;]*updated_at`,
        "i",
      ).test(MIGRATION_SOURCE);
      expect(
        hasUpdatedAtTrigger,
        `${tableName} is missing an updated_at auto-touch trigger`,
      ).toBe(true);
    }
  });

  it("refreshes videoProjects and videoAssets updatedAt on a live update", async () => {
    expect(MARKETING_AUDIT_MIGRATION).toBeDefined();
    if (!MARKETING_AUDIT_MIGRATION) return;

    liveClient = new PGlite();
    await liveClient.exec(OLD_MARKETING_SCHEMA);
    await liveClient.exec(MARKETING_AUDIT_MIGRATION);

    const projectId = "77777777-7777-4777-8777-777777777777";
    const assetId = "88888888-8888-4888-8888-888888888888";
    const campaignId = "99999999-9999-4999-8999-999999999999";
    await liveClient.exec(`
      INSERT INTO campaigns (id, type, app, name)
      VALUES ('${campaignId}', 'video', 'reading-advantage', 'Red contract campaign');
    `);
    const insertedProject = await liveClient.query<{ updated_at: string }>(`
      INSERT INTO video_projects (id, campaign_id, topic, script)
      VALUES ('${projectId}', '${campaignId}', 'Red contract topic', '[{"narration":"scene"}]'::jsonb)
      RETURNING updated_at;
    `);
    const insertedAsset = await liveClient.query<{ updated_at: string }>(`
      INSERT INTO video_assets (id, project_id, scene_index, type)
      VALUES ('${assetId}', '${projectId}', '0', 'image')
      RETURNING updated_at;
    `);
    expect(insertedProject.rows[0]?.updated_at).toBeTruthy();
    expect(insertedAsset.rows[0]?.updated_at).toBeTruthy();

    await expect(
      liveClient.exec(`
        INSERT INTO video_projects (id, campaign_id, topic, script)
        VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '${campaignId}', 'Invalid script', '{}'::jsonb);
      `),
    ).rejects.toThrow(/check|array/i);

    await new Promise((resolveAfterDelay) => setTimeout(resolveAfterDelay, 10));
    const refreshedProject = await liveClient.query<{ updated_at: string }>(`
      UPDATE video_projects
      SET topic = 'Updated Red contract topic'
      WHERE id = '${projectId}'
      RETURNING updated_at;
    `);
    const refreshedAsset = await liveClient.query<{ updated_at: string }>(`
      UPDATE video_assets
      SET prompt = 'Updated Red contract prompt'
      WHERE id = '${assetId}'
      RETURNING updated_at;
    `);
    expect(
      new Date(refreshedProject.rows[0]!.updated_at).getTime(),
    ).toBeGreaterThan(new Date(insertedProject.rows[0]!.updated_at).getTime());
    expect(
      new Date(refreshedAsset.rows[0]!.updated_at).getTime(),
    ).toBeGreaterThan(new Date(insertedAsset.rows[0]!.updated_at).getTime());
  }, 60_000);

  it("adds nullable UUID createdBy and updatedBy columns to the audited tables", () => {
    const createdByTables = [
      ["campaigns", schema.campaigns],
      ["videoProjects", schema.videoProjects],
      ["videoAssets", schema.videoAssets],
      ["pastTopics", schema.pastTopics],
    ] as const;
    const updatedByTables = [
      ["campaigns", schema.campaigns],
      ["videoProjects", schema.videoProjects],
      ["videoAssets", schema.videoAssets],
    ] as const;

    for (const [tableName, table] of createdByTables) {
      const createdBy = expectColumn(table as unknown as Table, tableName, "createdBy");
      expect(createdBy.columnType, `${tableName}.createdBy type`).toBe("PgUUID");
      expect(createdBy.notNull, `${tableName}.createdBy backfill nullability`).toBe(false);
    }
    for (const [tableName, table] of updatedByTables) {
      const updatedBy = expectColumn(table as unknown as Table, tableName, "updatedBy");
      expect(updatedBy.columnType, `${tableName}.updatedBy type`).toBe("PgUUID");
      expect(updatedBy.notNull, `${tableName}.updatedBy backfill nullability`).toBe(false);
    }
  });
});

afterEach(async () => {
  await liveClient?.close();
  liveClient = undefined;
});

describe("Phase 7.1: shared APPS tuple", () => {
  it("stores APPS in one pure client-safe constants module", () => {
    expect(existsSync(MARKETING_CONSTANTS_PATH)).toBe(true);
    if (!existsSync(MARKETING_CONSTANTS_PATH)) return;

    const constantsSource = readFileSync(MARKETING_CONSTANTS_PATH, "utf8");
    expect(constantsSource).toMatch(/export\s+const\s+APPS\s*=\s*\[/);
    expect(constantsSource).not.toMatch(/drizzle-orm/);
    expect(MARKETING_SOURCE).toMatch(
      /import\s*\{\s*APPS\s*\}\s*from\s*["']\.\/marketing-constants\.js["']/,
    );
  });

  it("exports the exact app catalog as APPS", () => {
    const exportedApps = (schema as Record<string, unknown>).APPS;
    expect(exportedApps).toEqual(EXPECTED_APPS);
  });

  it("derives the database app enum from APPS", () => {
    const derivesFromApps = /export\s+const\s+appEnum\s*=\s*pgEnum\(\s*["']app["']\s*,\s*(?:APPS|\[\.\.\.APPS\])/s.test(
      MARKETING_SOURCE,
    );
    expect(derivesFromApps).toBe(true);
  });
});
