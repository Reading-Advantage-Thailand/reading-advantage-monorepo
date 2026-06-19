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
 *      against `packages/db/drizzle/0021_marketing_tables.sql`. These
 *      pass at HEAD because the committed migration already matches
 *      the contract; they serve as regression guards against silent
 *      schema drift before Phase 3 (Settings encryption) and Phase 4
 *      (Campaign CRUD) land.
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
    join(process.cwd(), "drizzle/0021_marketing_tables.sql"),
    "utf8",
  );

  describe("enums (six total)", () => {
    it("declares campaign_type enum with video + infocard", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE "campaign_type"\s+AS ENUM \('video',\s*'infocard'\)/,
      );
    });

    it("declares campaign_status enum with draft/in-progress/complete/archived", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE "campaign_status"\s+AS ENUM \('draft',\s*'in-progress',\s*'complete',\s*'archived'\)/,
      );
    });

    it("declares app enum with all 8 products", () => {
      const appEnumMatch = sql0021.match(
        /CREATE TYPE "app"\s+AS ENUM \(([^)]+)\)/,
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
        /CREATE TYPE "asset_type"\s+AS ENUM \('image',\s*'voiceover',\s*'clip'\)/,
      );
    });

    it("declares asset_status enum with pending/generated/approved/rejected", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE "asset_status"\s+AS ENUM \('pending',\s*'generated',\s*'approved',\s*'rejected'\)/,
      );
    });

    it("declares video_project_status enum with draft/in-progress/complete", () => {
      expect(sql0021).toMatch(
        /CREATE TYPE "video_project_status"\s+AS ENUM \('draft',\s*'in-progress',\s*'complete'\)/,
      );
    });
  });

  describe("tables (five total)", () => {
    it("creates campaigns with id/type/app/name/status + timestamps + indexes", () => {
      expect(sql0021).toContain('CREATE TABLE IF NOT EXISTS "campaigns"');
      expect(sql0021).toContain('"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(sql0021).toContain('"type" "campaign_type" NOT NULL');
      expect(sql0021).toContain('"app" "app" NOT NULL');
      expect(sql0021).toContain('"name" text NOT NULL');
      expect(sql0021).toContain('"status" "campaign_status" DEFAULT \'draft\' NOT NULL');
      expect(sql0021).toContain('"created_at" timestamp DEFAULT now() NOT NULL');
      expect(sql0021).toContain('"updated_at" timestamp DEFAULT now() NOT NULL');
      expect(sql0021).toContain('CREATE INDEX IF NOT EXISTS "campaigns_app_idx"');
      expect(sql0021).toContain('CREATE INDEX IF NOT EXISTS "campaigns_status_idx"');
    });

    it("creates video_projects with FK to campaigns and JSONB script", () => {
      expect(sql0021).toContain('CREATE TABLE IF NOT EXISTS "video_projects"');
      expect(sql0021).toContain('"campaign_id" uuid NOT NULL');
      expect(sql0021).toContain('"topic" text NOT NULL');
      expect(sql0021).toContain('"script" jsonb');
      expect(sql0021).toContain('"status" "video_project_status" DEFAULT \'draft\' NOT NULL');
      expect(sql0021).toContain(
        'ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE cascade',
      );
      expect(sql0021).toContain(
        'CREATE INDEX IF NOT EXISTS "video_projects_campaign_idx"',
      );
    });

    it("creates video_assets with FK to video_projects and scene_index/url/prompt columns", () => {
      expect(sql0021).toContain('CREATE TABLE IF NOT EXISTS "video_assets"');
      expect(sql0021).toContain('"project_id" uuid NOT NULL');
      expect(sql0021).toContain('"scene_index" text NOT NULL');
      expect(sql0021).toContain('"type" "asset_type" NOT NULL');
      expect(sql0021).toContain('"url" text');
      expect(sql0021).toContain('"prompt" text');
      expect(sql0021).toContain('"status" "asset_status" DEFAULT \'pending\' NOT NULL');
      expect(sql0021).toContain(
        'ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "video_projects"("id") ON DELETE cascade',
      );
      expect(sql0021).toContain(
        'CREATE INDEX IF NOT EXISTS "video_assets_project_idx"',
      );
    });

    it("creates past_topics with FK-shaped app enum and topic text", () => {
      expect(sql0021).toContain('CREATE TABLE IF NOT EXISTS "past_topics"');
      expect(sql0021).toContain('"app" "app" NOT NULL');
      expect(sql0021).toContain('"topic" text NOT NULL');
      expect(sql0021).toContain(
        'CREATE INDEX IF NOT EXISTS "past_topics_app_idx"',
      );
    });

    it("creates settings with key PK and value text (encryption happens in app layer Phase 3)", () => {
      expect(sql0021).toContain('CREATE TABLE IF NOT EXISTS "settings"');
      expect(sql0021).toContain('"key" text PRIMARY KEY NOT NULL');
      expect(sql0021).toContain('"value" text NOT NULL');
    });
  });

  describe("FK cascade invariants (Phase 2 §4 edge case 4)", () => {
    it("has exactly two ON DELETE CASCADE clauses (campaigns→projects, projects→assets)", () => {
      const cascadeCount = (sql0021.match(/ON DELETE cascade/g) || []).length;
      expect(cascadeCount).toBe(2);
    });

    it("does not accidentally set ON DELETE SET NULL or RESTRICT", () => {
      expect(sql0021).not.toMatch(/ON DELETE SET NULL/i);
      expect(sql0021).not.toMatch(/ON DELETE RESTRICT/i);
      expect(sql0021).not.toMatch(/ON DELETE NO ACTION/i);
    });
  });

  describe("migration ordering (drizzle045 rebaseline contract)", () => {
    it("is the latest migration in drizzle/meta/_journal.json", () => {
      const journal = JSON.parse(
        readFileSync(
          join(process.cwd(), "drizzle/meta/_journal.json"),
          "utf8",
        ),
      ) as { entries: Array<{ idx: number; when: number; tag: string; breakpoints: boolean }> };
      const lastEntry = journal.entries[journal.entries.length - 1];
      expect(lastEntry.tag).toBe("0021_marketing_tables");
      // Confirm sentinel probe is registered (added in commit 021e13cc).
      expect(lastEntry.idx).toBeGreaterThanOrEqual(21);
    });

    it("has a matching sentinel probe registered in packages/db/src/sentinels.ts", () => {
      const sentinelsSrc = readFileSync(
        join(process.cwd(), "src/sentinels.ts"),
        "utf8",
      );
      expect(sentinelsSrc).toContain('"0021_marketing_tables"');
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

  it("pastTopics table has id/app/topic/createdAt columns", () => {
    const cols = Object.keys(schema.pastTopics).filter(
      (k) => !k.startsWith("_") && !k.startsWith("["),
    );
    for (const col of ["id", "app", "topic", "createdAt"]) {
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