/**
 * Phase 2 — Marketing App Public Workflow Security (Wave 3)
 * Group 2C: Campaigns unauthenticated + global-internal policy.
 *
 * Targets:
 *   app/api/campaigns/route.ts
 *   app/api/campaigns/[id]/route.ts
 * Evidence: LR-marketing-app-003-001 / -003.
 *
 * Tenant/owner reality: marketing tables are REFERENTIAL and have no schoolId
 * or owner column. The testable control is authentication plus an explicit
 * documented policy; no fabricated schoolId scoping is asserted.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { db } from "@reading-advantage/db";
import {
  KNOWN_TOKEN,
  authedRequest,
  introspectMarketingSession,
} from "./helpers/auth-mock";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.env.ENCRYPTION_KEY ??=
  "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

const CAMPAIGN_ID = "00000000-0000-0000-0000-000000000004";

// Future auth contract: list GET will accept a Request to read the session cookie.
type RouteGET = (request: Request) => Promise<Response>;

function readText(relPath: string): string {
  return readFileSync(resolve(APP_ROOT, relPath), "utf8");
}

function unauthedRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

function makeSelectChainMock(rows: unknown[]) {
  const whereMock = vi.fn().mockResolvedValue(rows);
  const orderByMock = vi.fn().mockResolvedValue(rows);
  const fromMock = vi
    .fn()
    .mockReturnValue({ where: whereMock, orderBy: orderByMock });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });
  return { selectMock, fromMock, orderByMock, whereMock };
}

function makeInsertChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
  const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
  return { insertMock, valuesMock, returningMock };
}

function makeUpdateChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  const updateMock = vi.fn().mockReturnValue({ set: setMock });
  return { updateMock, setMock, whereMock, returningMock };
}

const mockCampaign = {
  id: CAMPAIGN_ID,
  type: "video" as const,
  app: "reading-advantage" as const,
  name: "Term 2 Launch",
  status: "draft" as const,
  createdAt: new Date("2026-06-22T00:00:00Z"),
  updatedAt: new Date("2026-06-22T00:00:00Z"),
};

describe("Phase 2C: Campaigns auth — unauthenticated boundary (RED at baseline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/campaigns without session returns 401 and does not select", async () => {
    const { GET: rawGET } = await import("@/api/campaigns/route");
    const GET = rawGET as RouteGET;
    const { selectMock } = makeSelectChainMock([mockCampaign]);
    (db.select as Mock).mockImplementation(selectMock);

    const response = await GET(unauthedRequest("http://localhost/api/campaigns"));

    expect(response.status).toBe(401);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("POST /api/campaigns without session returns 401 and does not insert", async () => {
    const { POST } = await import("@/api/campaigns/route");
    const { insertMock } = makeInsertChainMock([mockCampaign]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      unauthedRequest("http://localhost/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "video",
          app: "reading-advantage",
          name: "New Campaign",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("GET /api/campaigns/[id] without session returns 401 and does not select", async () => {
    const { GET } = await import("@/api/campaigns/[id]/route");
    const { selectMock } = makeSelectChainMock([mockCampaign]);
    (db.select as Mock).mockImplementation(selectMock);

    const response = await GET(
      unauthedRequest(`http://localhost/api/campaigns/${CAMPAIGN_ID}`),
      { params: { id: CAMPAIGN_ID } },
    );

    expect(response.status).toBe(401);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("PATCH /api/campaigns/[id] without session returns 401 and does not update", async () => {
    const { PATCH } = await import("@/api/campaigns/[id]/route");
    const { updateMock } = makeUpdateChainMock([
      { ...mockCampaign, status: "in-progress" },
    ]);
    (db.update as Mock).mockImplementation(updateMock);

    const response = await PATCH(
      unauthedRequest(`http://localhost/api/campaigns/${CAMPAIGN_ID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      }),
      { params: { id: CAMPAIGN_ID } },
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("Phase 2C: Campaigns auth — authenticated positive controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/campaigns with valid session proceeds past the guard", async () => {
    const { GET: rawGET } = await import("@/api/campaigns/route");
    const GET = rawGET as RouteGET;
    const { selectMock } = makeSelectChainMock([mockCampaign]);
    (db.select as Mock).mockImplementation(selectMock);

    const response = await GET(authedRequest("http://localhost/api/campaigns"));

    expect(response.status).toBe(200);
    expect(introspectMarketingSession).toHaveBeenCalledWith(KNOWN_TOKEN);
  });

  it("POST /api/campaigns with valid session proceeds past the guard", async () => {
    const { POST } = await import("@/api/campaigns/route");
    const { insertMock } = makeInsertChainMock([mockCampaign]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "video",
          app: "reading-advantage",
          name: "New Campaign",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(introspectMarketingSession).toHaveBeenCalledWith(KNOWN_TOKEN);
  });

  it("GET /api/campaigns/[id] with valid session proceeds past the guard", async () => {
    const { GET } = await import("@/api/campaigns/[id]/route");
    const { selectMock } = makeSelectChainMock([mockCampaign]);
    (db.select as Mock).mockImplementation(selectMock);

    const response = await GET(
      authedRequest(`http://localhost/api/campaigns/${CAMPAIGN_ID}`),
      { params: { id: CAMPAIGN_ID } },
    );

    expect(response.status).toBe(200);
    expect(introspectMarketingSession).toHaveBeenCalledWith(KNOWN_TOKEN);
  });

  it("PATCH /api/campaigns/[id] with valid session proceeds past the guard", async () => {
    const { PATCH } = await import("@/api/campaigns/[id]/route");
    const { selectMock } = makeSelectChainMock([{ ...mockCampaign, status: "draft" }]);
    (db.select as Mock).mockImplementation(selectMock);
    const { updateMock } = makeUpdateChainMock([
      { ...mockCampaign, status: "in-progress" },
    ]);
    (db.update as Mock).mockImplementation(updateMock);

    const response = await PATCH(
      authedRequest(`http://localhost/api/campaigns/${CAMPAIGN_ID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      }),
      { params: { id: CAMPAIGN_ID } },
    );

    expect(response.status).toBe(200);
    expect(introspectMarketingSession).toHaveBeenCalledWith(KNOWN_TOKEN);
  });
});

describe("Phase 2C: Campaigns auth — global-internal policy documentation", () => {
  it("campaigns route source documents the global-internal auth policy", () => {
    const src = readText("app/api/campaigns/route.ts");
    // Assert presence of the policy statement, not a non-existent schoolId
    // column (A4). The expected text must be added by the Green role.
    expect(src).toContain("global-internal");
    expect(src).toContain("authenticated staff");
    expect(src).toContain("not scoped by schoolId");
  });

  it("campaigns [id] route source documents the global-internal auth policy", () => {
    const src = readText("app/api/campaigns/[id]/route.ts");
    expect(src).toContain("global-internal");
    expect(src).toContain("authenticated staff");
    expect(src).toContain("not scoped by schoolId");
  });
});
