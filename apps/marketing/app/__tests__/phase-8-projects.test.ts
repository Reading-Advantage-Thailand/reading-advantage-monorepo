/**
 * Phase 8 — Video Production: Project Persistence
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 6)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "Project persistence: mocked POST insert and invalid-script rejection
 *    are not enough; add GET/list and prove the response comes from the
 *    mocked DB result rather than a fabricated response."
 *
 * This file encodes the Phase 8 persistence contract as executable
 * assertions for:
 *   - GET /api/video/projects lists persisted video projects.
 *   - POST /api/video/projects creates a project and returns the DB row.
 *   - Invalid script shapes are rejected with 400 before DB insert.
 */

import { describe, expect, it, vi, type Mock, beforeEach } from "vitest";

// Mock the Next.js server primitives so route handlers can be imported
// and exercised without requiring a full Next.js runtime.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

// Mock the Drizzle client so project persistence tests are deterministic
// and do not require a live Postgres connection.
vi.mock("@reading-advantage/db", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/db")>(
    "@reading-advantage/db",
  );
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
      }),
      { raw: (strings: TemplateStringsArray) => strings },
    ),
    db: {
      execute: vi.fn(),
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
    },
  };
});

// Auth mock: marketing routes now require authentication (Phase 2 of
// wave3_product_alignment_20260628).
import { authedRequest } from "./helpers/auth-mock";

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

function makeSelectChainMock(returningRows: unknown[]) {
  const whereMock = vi.fn().mockResolvedValue(returningRows);
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));
  return { selectMock, fromMock, whereMock };
}

function makeInsertChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const valuesMock = vi.fn(() => ({ returning: returningMock }));
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  return { insertMock, valuesMock, returningMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────
// Tier 1: Handler wiring — GET list is missing at HEAD
// ─────────────────────────────────────────────────────────────────────

describe("Phase 8: Project Persistence — handler wiring", () => {
  it("exports both GET and POST handlers", async () => {
    const mod = (await import("@/api/video/projects/route")) as {
      POST?: unknown;
      GET?: unknown;
    };
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.GET).toBe("function");
  }, 20000);
});

// ─────────────────────────────────────────────────────────────────────
// Tier 2: GET /api/video/projects — list persisted projects
// ─────────────────────────────────────────────────────────────────────

describe("Phase 8: Project Persistence — GET list", () => {
  it("returns projects from the mocked DB result for a campaign", async () => {
    const { db } = await import("@reading-advantage/db");
    const campaignId = "11111111-1111-1111-1111-111111111111";
    const mockRows = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        campaignId,
        topic: "การอ่านนิทาน",
        script: scriptFixture,
        status: "draft",
      },
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        campaignId,
        topic: "คณิตศาสตร์สนุก",
        script: scriptFixture,
        status: "in-progress",
      },
    ];
    const { selectMock, whereMock } = makeSelectChainMock(mockRows);
    (db.select as Mock).mockImplementation(selectMock);

    const { GET } = (await import("@/api/video/projects/route")) as unknown as {
      GET: (request: Request) => Promise<Response>;
    };
    const response = await GET(
      authedRequest(
        `http://localhost/api/video/projects?campaignId=${campaignId}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as unknown[];
    expect(body).toHaveLength(mockRows.length);
    expect(body).toEqual(mockRows);
    expect(whereMock).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 3: POST /api/video/projects — create and return DB row
// ─────────────────────────────────────────────────────────────────────

describe("Phase 8: Project Persistence — POST create", () => {
  it("returns the DB-returned row, not a fabricated response", async () => {
    const { db } = await import("@reading-advantage/db");
    const mockProject = {
      id: "22222222-2222-2222-2222-222222222222",
      campaignId: "11111111-1111-1111-1111-111111111111",
      topic: "การอ่านนิทาน",
      script: scriptFixture,
      status: "draft",
    };
    const { insertMock, valuesMock, returningMock } = makeInsertChainMock([
      mockProject,
    ]);
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/video/projects/route");
    const response = await POST(
      authedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: mockProject.campaignId,
          topic: mockProject.topic,
          script: scriptFixture,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof mockProject;
    expect(body).toEqual(mockProject);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: mockProject.campaignId,
        topic: mockProject.topic,
        script: scriptFixture,
      }),
    );
    expect(returningMock).toHaveBeenCalled();
  });

  it("returns 400 for an invalid script shape", async () => {
    const { db } = await import("@reading-advantage/db");
    const { insertMock, valuesMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/video/projects/route");
    const response = await POST(
      authedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: "11111111-1111-1111-1111-111111111111",
          topic: "Topic",
          script: [{ narration: "incomplete" }],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(valuesMock).not.toHaveBeenCalled();
  });
});
