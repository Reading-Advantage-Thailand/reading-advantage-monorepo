/**
 * Phase 2 — Database Schema (Marketing Production Platform)
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 2 → "Verify")
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §4 edge case 4:
 *   "Drizzle FK cascade (Phase 2): deleting a campaigns row must cascade
 *    to video_projects and video_assets."
 *
 * Per §7 the Green gate is
 *   `phase-2-insert-roundtrip (live Postgres)`
 * and §6 says "P2 Schema: ... FK cascade test ... live behavior".
 *
 * This file owns the LIVE-BEHAVIOR half of the Phase 2 contract:
 *
 *   1. **FK cascade deletion:** insert a campaign → video_project →
 *      video_asset chain, then DELETE the campaign and assert that
 *      BOTH child rows vanish in the same transaction. This proves
 *      the `ON DELETE CASCADE` declared in migration 0021 actually
 *      fires at runtime — the artifact contract test
 *      (`phase-2-marketing-schema.test.ts`) only proves the SQL
 *      text says CASCADE, not that PostgreSQL honors it.
 *
 *   2. **JSONB script round-trip:** insert a `video_projects.script`
 *      payload, read it back, assert it parses to the same shape
 *      (5–7 scene structure — see FR-4 in spec.md).
 *
 * **No live infrastructure assumption.** The describe block is
 * `describe.skip`-ed when `DATABASE_URL` is unset (the default in
 * CI without docker-compose), so this file is registered as "owned
 * by task Phase 2 → Verify" in the suite without blocking red phases
 * in unprovisioned environments. When DATABASE_URL points at a real
 * Postgres (or a testcontainers / pglite instance — see Q-VP-04 in
 * OPEN-QUESTIONS.md), the describe flips to `.run` and the full
 * round-trip executes.
 *
 * Per test-strategy.md §8, this file's first line would be
 * `describe.skip(...)` *and* the file is added to the vitest
 * `exclude` list under a `// owned by task Phase 2 → Verify`
 * comment. The Mid-agent scope is the artifact contract test
 * (phase-2-marketing-schema.test.ts); this file is parked for the
 * Jr agent to enable once infrastructure lands. Both gates are
 * present here.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  campaigns,
  videoAssets,
  videoProjects,
} from "../schema/index.js";

const HAS_DB = Boolean(process.env.DATABASE_URL);

const liveBehavior = HAS_DB ? describe : describe.skip;

// ───────────────────────────────────────────────────────────────────────
// Live FK cascade + JSONB round-trip
// ───────────────────────────────────────────────────────────────────────

liveBehavior("Phase 2 marketing: live FK cascade + JSONB round-trip", () => {
  // Imported lazily so unit-only test runs (no DATABASE_URL) don't
  // attempt to construct a postgres client at module load.
  let db: typeof import("../client.js").db;

  beforeAll(async () => {
    const mod = await import("../client.js");
    db = mod.db;
    // Sanity ping — bail loudly if DATABASE_URL is set but unreachable.
    await db.execute(sql`SELECT 1`);
  });

  afterAll(async () => {
    // Best-effort cleanup of any rows left behind from a failed insert.
    await db.execute(sql`DELETE FROM video_assets WHERE prompt = 'phase-2-test-fixture'`);
    await db.execute(sql`DELETE FROM video_projects WHERE topic = 'phase-2-test-fixture'`);
    await db.execute(sql`DELETE FROM campaigns WHERE name = 'phase-2-test-fixture'`);
  });

  it("FK cascade: deleting a campaigns row removes its video_projects and video_assets", async () => {
    // 1. Insert a campaign.
    const [campaign] = await db
      .insert(campaigns)
      .values({
        type: "video",
        app: "reading-advantage",
        name: "phase-2-test-fixture",
        status: "draft",
      })
      .returning({ id: campaigns.id });
    expect(campaign).toBeDefined();

    // 2. Insert a video_project under it.
    const [project] = await db
      .insert(videoProjects)
      .values({
        campaignId: campaign!.id,
        topic: "phase-2-test-fixture",
        script: [
          { scene: 1, narration: "สวัสดีค่ะ", image: "classroom", motion: "ken-burns" },
          { scene: 2, narration: "วันนี้เรียนอะไรดี", image: "books", motion: "zoom-in" },
        ],
        status: "draft",
      })
      .returning({ id: videoProjects.id });
    expect(project).toBeDefined();

    // 3. Insert a video_asset under the project.
    const [asset] = await db
      .insert(videoAssets)
      .values({
        projectId: project!.id,
        sceneIndex: "1",
        type: "image",
        url: "s3://stub/phase-2-fixture.png",
        prompt: "phase-2-test-fixture",
        status: "generated",
      })
      .returning({ id: videoAssets.id });
    expect(asset).toBeDefined();

    // 4. Delete the campaign. Both children must vanish.
    await db.delete(campaigns).where(sql`id = ${campaign!.id}`);

    const remainingProjects = await db
      .select({ id: videoProjects.id })
      .from(videoProjects)
      .where(sql`campaign_id = ${campaign!.id}`);
    expect(remainingProjects).toEqual([]);

    const remainingAssets = await db
      .select({ id: videoAssets.id })
      .from(videoAssets)
      .where(sql`project_id = ${project!.id}`);
    expect(remainingAssets).toEqual([]);
  });

  it("JSONB round-trip: video_projects.script preserves 5–7 scene structure", async () => {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        type: "video",
        app: "primary-advantage",
        name: "phase-2-test-fixture",
        status: "draft",
      })
      .returning({ id: campaigns.id });

    const sixSceneScript = Array.from({ length: 6 }, (_, i) => ({
      scene: i + 1,
      narration: `ฉากที่ ${i + 1}`,
      image: `image-${i + 1}`,
      motion: "ken-burns",
    }));

    const [project] = await db
      .insert(videoProjects)
      .values({
        campaignId: campaign!.id,
        topic: "phase-2-test-fixture",
        script: sixSceneScript,
        status: "draft",
      })
      .returning({ id: videoProjects.id, script: videoProjects.script });

    expect(project!.script).toEqual(sixSceneScript);
    expect(Array.isArray(project!.script)).toBe(true);
    expect((project!.script as unknown[]).length).toBe(6);

    // Cleanup.
    await db.delete(campaigns).where(sql`id = ${campaign!.id}`);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Skip-reason marker — keeps the file discoverable in reports.
// ───────────────────────────────────────────────────────────────────────

describe("Phase 2 marketing: live round-trip environment probe", () => {
  it("skips when DATABASE_URL is not set (CI without docker-compose)", () => {
    if (!HAS_DB) {
      // Surfaced in test output so reviewers know why the live tests
      // are not running. Does NOT fail the suite.
      expect(HAS_DB).toBe(false);
    } else {
      expect(HAS_DB).toBe(true);
    }
  });
});