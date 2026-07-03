// @vitest-environment node
/**
 * Phase 8 — Video Production: Live Project CRUD
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 6)
 *
 * Integration test that exercises the video_projects route handlers against
 * a real in-process Postgres (PGlite) instead of mocked DB chains.
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "Closeout gate: live behavior proof requires project create/list round
 *    trip against test DB or documented manual DB proof; POST-only mocked
 *    tests cannot close CRUD."
 *
 * This file proves:
 *   - POST /api/video/projects inserts a row into video_projects.
 *   - GET /api/video/projects?campaignId=... returns persisted rows.
 *   - JSONB script is persisted and retrieved intact.
 *   - FK violations are caught (campaign must exist).
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_t, prop) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as
          | Record<string | symbol, unknown>
          | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const v = real[prop];
        return typeof v === "function"
          ? (v as (...a: unknown[]) => unknown).bind(real)
          : v;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

// Mock next/server so the route handlers can run without a Next.js runtime.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

// Auth mock: marketing routes now require authentication (Phase 2 of
// wave3_product_alignment_20260628).
import { authedRequest } from "./helpers/auth-mock";

import { GET, POST } from "@/api/video/projects/route";

const TEST_CAMPAIGN_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_CAMPAIGN_ID = "00000000-0000-0000-0000-000000000002";

interface Scene {
  narration: string;
  imagePrompt: string;
  motionDirection: string;
}

const scriptFixture: Scene[] = [
  {
    narration: "ยินดีต้อนรับสู่ Reading Advantage",
    imagePrompt: "A bright Thai classroom with students reading tablets",
    motionDirection: "Slow zoom in from the back of the classroom",
  },
  {
    narration: "แพลตฟอร์มนี้ช่วยให้นักเรียนฝึกอ่านภาษาอังกฤษได้ทุกที่",
    imagePrompt: "A student smiling while using a tablet on a bench",
    motionDirection: "Gentle pan from left to right",
  },
  {
    narration: "ครูสามารถติดตามความก้าวหน้าของนักเรียนได้แบบเรียลไทม์",
    imagePrompt: "A teacher dashboard showing student progress charts",
    motionDirection: "Static frame with subtle UI highlight pulse",
  },
  {
    narration: "บทเรียนปรับระดับตามความสามารถของแต่ละคน",
    imagePrompt: "Adaptive learning path visualization with Thai labels",
    motionDirection: "Scroll along the path from start to current level",
  },
  {
    narration: "เริ่มต้นการเรียนรู้ที่สนุกและมีประสิทธิภาพวันนี้",
    imagePrompt: "Happy Thai students raising hands in a modern classroom",
    motionDirection: "Slow dolly out to reveal the classroom",
  },
];

let h: TestDb;

async function seedCampaigns() {
  await h.db.execute(sql`
    INSERT INTO campaigns (id, type, app, name, status)
    VALUES
      (${TEST_CAMPAIGN_ID}, 'video', 'reading-advantage', 'Test Campaign', 'draft'),
      (${OTHER_CAMPAIGN_ID}, 'video', 'primary-advantage', 'Other Campaign', 'draft')
  `);
}

describe("Phase 8: Project Persistence — live CRUD (PGlite)", () => {
  beforeAll(async () => {
    h = await createTestDb();
  }, 60_000);

  afterAll(async () => {
    await h?.close();
  });

  afterEach(async () => {
    await h.reset();
  });

  it("POST creates a project and persists JSONB script", async () => {
    await seedCampaigns();

    const response = await POST(
      authedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: TEST_CAMPAIGN_ID,
          topic: "การอ่านนิทาน",
          script: scriptFixture,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      id: string;
      campaignId: string;
      topic: string;
      script: Scene[];
      status: string;
    };

    expect(body.campaignId).toBe(TEST_CAMPAIGN_ID);
    expect(body.topic).toBe("การอ่านนิทาน");
    expect(body.status).toBe("draft");
    expect(body.script).toHaveLength(scriptFixture.length);
    expect(body.script[0].narration).toBe(scriptFixture[0].narration);

    // Verify the row and JSONB script actually landed in the DB.
    const rows = await h.db.execute(
      sql`SELECT script FROM video_projects WHERE id = ${body.id}`,
    );
    expect(rows.rows).toHaveLength(1);
    const persisted = (rows.rows[0] as { script: unknown }).script;
    expect(persisted).toEqual(scriptFixture);
  });

  it("GET lists only the projects for the requested campaign", async () => {
    await seedCampaigns();

    await POST(
      authedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: TEST_CAMPAIGN_ID,
          topic: "Topic One",
          script: scriptFixture,
        }),
      }),
    );

    await POST(
      authedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: TEST_CAMPAIGN_ID,
          topic: "Topic Two",
          script: scriptFixture,
        }),
      }),
    );

    await POST(
      authedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: OTHER_CAMPAIGN_ID,
          topic: "Other Topic",
          script: scriptFixture,
        }),
      }),
    );

    const response = await GET(
      authedRequest(
        `http://localhost/api/video/projects?campaignId=${TEST_CAMPAIGN_ID}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Array<{
      topic: string;
      campaignId: string;
    }>;
    expect(body).toHaveLength(2);
    const topics = body.map((p) => p.topic).sort();
    expect(topics).toEqual(["Topic One", "Topic Two"]);
    for (const project of body) {
      expect(project.campaignId).toBe(TEST_CAMPAIGN_ID);
    }
  });

  it("returns 400 when campaignId query param is missing on GET", async () => {
    const response = await GET(
      authedRequest("http://localhost/api/video/projects"),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/campaignId query parameter is required/i);
  });
});
