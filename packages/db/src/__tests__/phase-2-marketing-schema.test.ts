/**
 * Phase 2 — Database Schema (Marketing Production Platform)
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 2)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "P2 Schema: migration-SQL test (round-trip up→down→up), FK cascade
 *    test, enum-value test. Contract test: generated *.sql matches a
 *    checked-in golden — that is an artifact contract test, not
 *    behavior; add phase-2-insert-roundtrip.test.ts for live behavior."
 *
 * Per §7 the Red command is
 *   `pnpm --filter @reading-advantage/db test phase-2-marketing-schema`
 * and the Green gate additionally requires `phase-2-insert-roundtrip`
 * (live Postgres).
 *
 * This file encodes the Phase 2 verification contract as executable
 * assertions split into two tiers:
 *
 *   1. **Migration 0021 SQL contract (artifact):** file-level assertions
 *      against `packages/db/drizzle/0021_sales_advantage.sql`. The
 *      canonical migration tag is `0021_sales_advantage`; it contains
 *      both Sales Advantage curriculum tables and the marketing tables
 *      required by the video pipeline. These assertions serve as
 *      regression guards against silent schema drift for the marketing
 *      tables specifically.
 *
 *   2. **Drizzle schema metadata (artifact):** column-presence and
 *      relation-declaration assertions against
 *      `packages/db/src/schema/marketing.ts`. Same as
 *      `packages/db/src/__tests__/schema.test.ts` precedent for other
 *      tables, but covering the new marketing tables specifically.
 *
 * Live behavior (FK cascade at runtime) is owned by
 * `phase-2-insert-roundtrip.test.ts` and is gated behind `DATABASE_URL`.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as schema from "../schema/index.js";

// ───────────────────────────────────────────────────────────────────────
// 1. Migration 0021 SQL contract
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: migration 0021 SQL contract", () => {
  const sql0021 = readFileSync(
    join(process.cwd(), "drizzle/0021_sales_advantage.sql"),
    "utf8",
  );

  describe("enums (six total)", () => {
    it("declares campaign_type enum with video + infocard", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE\s+(?:"public"\.)?"campaign_type"\s*AS ENUM\s*\('video',\s*'infocard'\)/,
      );
    });

    it("declares campaign_status enum with draft/in-progress/complete/archived", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE\s+(?:"public"\.)?"campaign_status"\s*AS ENUM\s*\('draft',\s*'in-progress',\s*'complete',\s*'archived'\)/,
      );
    });

    it("declares app enum with all 8 products", () => {
      const appEnumMatch = sql0021.match(
        /CREATE TYPE\s+(?:"public"\.)?"app"\s*AS ENUM\s*\(([^)]+)\)/,
      );
      expect(appEnumMatch, 'app enum not found in 0021').not.toBeNull();
      const values = (appEnumMatch![1] as string)
        .split(",")
        .map((v) => v.trim().replace(/^'/, "").replace(/'$/, ""));
      expect(values).toEqual([
        "reading-advantage",
        "primary-advantage",
        "storytime",
        "math-advantage",
        "science-advantage",
        "stem-advantage",
        "zhongwen-advantage",
        "tutor-advantage",
      ]);
    });

    it("declares asset_type enum with image/voiceover/clip", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE\s+(?:"public"\.)?"asset_type"\s*AS ENUM\s*\('image',\s*'voiceover',\s*'clip'\)/,
      );
    });

    it("declares asset_status enum with pending/generated/approved/rejected", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE\s+(?:"public"\.)?"asset_status"\s*AS ENUM\s*\('pending',\s*'generated',\s*'approved',\s*'rejected'\)/,
      );
    });

    it("declares video_project_status enum with draft/in-progress/complete", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE\s+(?:"public"\.)?"video_project_status"\s*AS ENUM\s*\('draft',\s*'in-progress',\s*'complete'\)/,
      );
    });
  });

  describe("tables (five total)", () => {
    it("creates campaigns with id/type/app/name/status + timestamps + indexes", () => {
      expect(sql0021).toContain('CREATE TABLE "campaigns"');
      expect(sql0021).toContain('"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql0021).toContain('"type" "campaign_type" NOT NULL');
      expect(sql0021).toContain('"app" "app" NOT NULL');
      expect(sql0021).toContain('"name" text NOT NULL');
      expect(sql0021).toContain('"status" "campaign_status" DEFAULT \'draft\' NOT NULL');
      expect(sql0021).toContain('"created_at" timestamp DEFAULT now() NOT NULL');
      expect(sql0021).toContain('"updated_at" timestamp DEFAULT now() NOT NULL');
      expect(sql0021).toContain('CREATE INDEX "campaigns_app_idx" ON "campaigns"');
      expect(sql0021).toContain('CREATE INDEX "campaigns_status_idx" ON "campaigns"');
    });

    it("creates video_projects with FK to campaigns and JSONB script", () => {
      expect(sql0021).toContain('CREATE TABLE "video_projects"');
      expect(sql0021).toContain('"campaign_id" uuid NOT NULL');
      expect(sql0021).toContain('"topic" text NOT NULL');
      expect(sql0021).toContain('"script" jsonb');
      expect(sql0021).toContain('"status" "video_project_status" DEFAULT \'draft\' NOT NULL');
      expect(sql0021).toContain(
        'ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade',
      );
      expect(sql0021).toContain(
        'CREATE INDEX "video_projects_campaign_idx" ON "video_projects"',
      );
    });

    it("creates video_assets with FK to video_projects and scene_index/url/prompt columns", () => {
      expect(sql0021).toContain('CREATE TABLE "video_assets"');
      expect(sql0021).toContain('"project_id" uuid NOT NULL');
      expect(sql0021).toContain('"scene_index" text NOT NULL');
      expect(sql0021).toContain('"type" "asset_type" NOT NULL');
      expect(sql0021).toContain('"url" text');
      expect(sql0021).toContain('"prompt" text');
      expect(sql0021).toContain('"status" "asset_status" DEFAULT \'pending\' NOT NULL');
      expect(sql0021).toContain(
        'ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade',
      );
      expect(sql0021).toContain(
        'CREATE INDEX "video_assets_project_idx" ON "video_assets"',
      );
    });

    it("creates past_topics with FK-shaped app enum and topic text", () => {
      expect(sql0021).toContain('CREATE TABLE "past_topics"');
      expect(sql0021).toContain('"app" "app" NOT NULL');
      expect(sql0021).toContain('"topic" text NOT NULL');
      expect(sql0021).toContain(
        'CREATE INDEX "past_topics_app_idx" ON "past_topics"',
      );
    });

    it("creates settings with key PK and value text (encryption happens in app layer Phase 3)", () => {
      expect(sql0021).toContain('CREATE TABLE "settings"');
      expect(sql0021).toContain('"key" text PRIMARY KEY NOT NULL');
      expect(sql0021).toContain('"value" text NOT NULL');
    });
  });

  describe("FK cascade invariants (Phase 2 §4 edge case 4)", () => {
    // 0021_sales_advantage.sql is a combined migration that also creates
    // Sales Advantage tables with their own FKs. Marketing FKs are the
    // two ALTER TABLE statements for video_projects and video_assets.
    const marketingFkPattern =
      /ALTER TABLE "(video_projects|video_assets)" ADD CONSTRAINT "(video_projects_campaign_id_campaigns_id_fk|video_assets_project_id_video_projects_id_fk)"[^;]+;/g;
    const marketingFkBlocks = (sql0021.match(marketingFkPattern) || []).join(" ");

    it("has exactly two ON DELETE CASCADE clauses on marketing FKs (campaigns→projects, projects→assets)", () => {
      const cascadeCount = (marketingFkBlocks.match(/ON DELETE cascade/g) || []).length;
      expect(cascadeCount).toBe(2);
    });

    it("does not accidentally set ON DELETE SET NULL or RESTRICT on marketing FKs", () => {
      expect(marketingFkBlocks).not.toMatch(/ON DELETE SET NULL/i);
      expect(marketingFkBlocks).not.toMatch(/ON DELETE RESTRICT/i);
      expect(marketingFkBlocks).not.toMatch(/ON DELETE NO ACTION/i);
    });
  });

  describe("migration ordering (drizzle045 rebaseline contract)", () => {
    const journal = JSON.parse(
      readFileSync(
        join(process.cwd(), "drizzle/meta/_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ idx: number; when: number; tag: string; breakpoints: boolean }> };

    it("has a journal entry at idx 21 with the canonical 0021 tag", () => {
      const entry21 = journal.entries.find((e) => e.idx === 21);
      expect(entry21, "journal entry at idx 21 missing").toBeDefined();
      expect(entry21!.tag).toBe("0021_sales_advantage");
      expect(entry21!.idx).toBe(21);
    });

    it("has a matching sentinel probe registered in packages/db/src/sentinels.ts", () => {
      const sentinelsSrc = readFileSync(
        join(process.cwd(), "src/sentinels.ts"),
        "utf8",
      );
      expect(sentinelsSrc).toContain('"0021_sales_advantage"');
    });

    it("has a valid UUID id (not a placeholder)", () => {
      const snapshot = JSON.parse(
        readFileSync(
          join(process.cwd(), "drizzle/meta/0021_snapshot.json"),
          "utf8",
        ),
      ) as { id: string };
      expect(snapshot.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(snapshot.id).not.toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    });
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. Drizzle schema metadata (artifact contract)
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: Drizzle schema exports (packages/db/src/schema/marketing.ts)", () => {
  it("exports all five tables", () => {
    expect(schema.campaigns).toBeDefined();
    expect(schema.videoProjects).toBeDefined();
    expect(schema.videoAssets).toBeDefined();
    expect(schema.pastTopics).toBeDefined();
    expect(schema.settings).toBeDefined();
  });

  it("exports all six enums", () => {
    expect(schema.campaignTypeEnum).toBeDefined();
    expect(schema.campaignStatusEnum).toBeDefined();
    expect(schema.appEnum).toBeDefined();
    expect(schema.assetTypeEnum).toBeDefined();
    expect(schema.assetStatusEnum).toBeDefined();
    expect(schema.videoProjectStatusEnum).toBeDefined();
  });

  it("exports the three relations declarations", () => {
    expect(schema.campaignsRelations).toBeDefined();
    expect(schema.videoProjectsRelations).toBeDefined();
    expect(schema.videoAssetsRelations).toBeDefined();
  });

  it("campaigns table has id/type/app/name/status/createdAt/updatedAt columns", () => {
    const cols = Object.keys(schema.campaigns).filter(
      (k) => !k.startsWith("_") && !k.startsWith("["),
    );
    for (const col of [
      "id",
      "type",
      "app",
      "name",
      "status",
      "createdAt",
      "updatedAt",
    ]) {
      expect(cols, `campaigns missing column ${col}`).toContain(col);
    }
  });

  it("videoProjects table has id/campaignId/topic/script/status/createdAt columns", () => {
    const cols = Object.keys(schema.videoProjects).filter(
      (k) => !k.startsWith("_") && !k.startsWith("["),
    );
    for (const col of [
      "id",
      "campaignId",
      "topic",
      "script",
      "status",
      "createdAt",
    ]) {
      expect(cols, `videoProjects missing column ${col}`).toContain(col);
    }
  });

  it("videoAssets table has id/projectId/sceneIndex/type/url/prompt/status/createdAt columns", () => {
    const cols = Object.keys(schema.videoAssets).filter(
      (k) => !k.startsWith("_") && !k.startsWith("["),
    );
    for (const col of [
      "id",
      "projectId",
      "sceneIndex",
      "type",
      "url",
      "prompt",
      "status",
      "createdAt",
    ]) {
      expect(cols, `videoAssets missing column ${col}`).toContain(col);
    }
  });

  it("pastTopics table has id/app/topic/normalizedKey/createdAt columns", () => {
    const cols = Object.keys(schema.pastTopics).filter(
      (k) => !k.startsWith("_") && !k.startsWith("["),
    );
    for (const col of ["id", "app", "topic", "normalizedKey", "createdAt"]) {
      expect(cols, `pastTopics missing column ${col}`).toContain(col);
    }
  });

  it("settings table has key/value columns", () => {
    const cols = Object.keys(schema.settings).filter(
      (k) => !k.startsWith("_") && !k.startsWith("["),
    );
    expect(cols).toContain("key");
    expect(cols).toContain("value");
  });
});