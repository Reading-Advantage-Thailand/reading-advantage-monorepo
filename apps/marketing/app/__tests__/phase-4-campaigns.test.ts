/**
 * Phase 4 — Campaign Management
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 4)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "P4 Campaigns: CRUD integration, status-transition state-machine unit
 *    test (rejects invalid transitions)."
 *
 * Per §7 the Red command is `pnpm --filter marketing test phase-4-campaigns`
 * and the Green gate additionally requires `phase-4-status-machine`.
 *
 * This file encodes the Phase 4 verification contract as executable
 * assertions split into three tiers:
 *
 *   1. **Wiring invariants (Phase 4 tasks 1–5):** file-level + module-shape
 *      checks for the campaigns list page, detail page, and API routes.
 *      These stay Green to prove the wiring isn't accidentally reverted.
 *
 *   2. **CRUD integration (Phase 4 task 6 — create/list/view):** runtime
 *      checks that GET /api/campaigns, POST /api/campaigns, and
 *      GET /api/campaigns/[id] behave correctly with a mocked Drizzle
 *      client. Passes at HEAD because the routes are already implemented.
 *
 *   3. **Status-transition state machine (Phase 4 task 6 — update status):**
 *      asserts that a shared `isValidCampaignStatusTransition` helper exists
 *      and that PATCH /api/campaigns/[id] rejects invalid transitions such
 *      as `draft → complete`. **Red at HEAD** because no helper module
 *      exists and the PATCH route currently accepts any `body.status`.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The Vinext shims configured in vitest.config.ts point to a hoisted
// node_modules path that is not resolvable in this test environment.
// Mock the Next.js server primitives directly so route handlers can be
// imported and exercised without requiring a full Next.js runtime.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

// Mock the Drizzle client so CRUD tests are deterministic and do not
// require a live Postgres connection during Phase 4 unit tests.
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

function readText(relPath: string): string {
  return readFileSync(resolve(APP_ROOT, relPath), "utf8");
}

const mockCampaign = {
  id: "11111111-1111-1111-1111-111111111111",
  type: "video" as const,
  app: "reading-advantage" as const,
  name: "Term 2 Reading Advantage Launch",
  status: "draft" as const,
  createdAt: new Date("2026-06-22T00:00:00Z"),
  updatedAt: new Date("2026-06-22T00:00:00Z"),
};

/**
 * Build a chainable Drizzle select mock that records `.from().where()` calls
 * and resolves to a configured result set.
 */
function makeSelectChainMock(rows: unknown[]) {
  const whereMock = vi.fn().mockResolvedValue(rows);
  const orderByMock = vi.fn().mockResolvedValue(rows);
  const fromMock = vi.fn().mockReturnValue({ where: whereMock, orderBy: orderByMock });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });
  return { selectMock, fromMock, orderByMock, whereMock };
}

/**
 * Build a chainable Drizzle insert mock that records `.values()` and supports
 * `.returning()`.
 */
function makeInsertChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
  const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
  return { insertMock, valuesMock, returningMock };
}

/**
 * Build a chainable Drizzle update mock that records `.set().where()` and
 * supports `.returning()`.
 */
function makeUpdateChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  const updateMock = vi.fn().mockReturnValue({ set: setMock });
  return { updateMock, setMock, whereMock, returningMock };
}

// ─────────────────────────────────────────────────────────────────────
// Tier 1: Wiring invariants — pass at HEAD, kept as regression guards
// ─────────────────────────────────────────────────────────────────────

describe("Phase 4: Campaign Management — wiring invariants (tasks 1-5)", () => {
  // FR-12: removed brittle `existsSync(...)` and source-regex assertions
  // (file existence is verified by the build system, not the test suite;
  // CSS literals and `export default function` source matches break on
  // benign refactors and assert nothing about runtime behavior).

  it("apps/marketing/app/api/campaigns/route.ts exports GET and POST", async () => {
    const mod = await import("@/api/campaigns/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  }, 10000);

  it("apps/marketing/app/api/campaigns/[id]/route.ts exports GET and PATCH", async () => {
    const mod = await import("@/api/campaigns/[id]/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.PATCH).toBe("function");
  }, 10000);
});

// ─────────────────────────────────────────────────────────────────────
// Tier 2: CRUD integration — passes at HEAD (regression guard)
// ─────────────────────────────────────────────────────────────────────

describe("Phase 4: Campaign Management — CRUD integration (task 6: create/list/view)", () => {
  it("GET /api/campaigns returns the list ordered by createdAt desc", async () => {
    const { db } = await import("@reading-advantage/db");
    const { selectMock } = makeSelectChainMock([mockCampaign]);
    (db.select as Mock).mockImplementation(selectMock);

    const { GET } = await import("@/api/campaigns/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof mockCampaign[];
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe(mockCampaign.name);
  });

  it("POST /api/campaigns inserts a new campaign and returns it", async () => {
    const { db } = await import("@reading-advantage/db");
    const input = {
      type: "video" as const,
      app: "reading-advantage" as const,
      name: "New Campaign",
    };
    const { insertMock, valuesMock, returningMock } = makeInsertChainMock([
      { ...mockCampaign, ...input },
    ]);
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/campaigns/route");
    const response = await POST(
      new Request("http://localhost/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof mockCampaign;
    expect(body.name).toBe(input.name);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: input.type,
        app: input.app,
        name: input.name,
      }),
    );
    expect(returningMock).toHaveBeenCalled();
  });

  it("GET /api/campaigns/[id] returns 200 for an existing campaign", async () => {
    const { db } = await import("@reading-advantage/db");
    const { selectMock } = makeSelectChainMock([mockCampaign]);
    (db.select as Mock).mockImplementation(selectMock);

    const { GET } = await import("@/api/campaigns/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/campaigns/${mockCampaign.id}`),
      { params: { id: mockCampaign.id } },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof mockCampaign;
    expect(body.id).toBe(mockCampaign.id);
  });

  it("GET /api/campaigns/[id] returns 404 when campaign is not found", async () => {
    const { db } = await import("@reading-advantage/db");
    const { selectMock } = makeSelectChainMock([]);
    (db.select as Mock).mockImplementation(selectMock);

    const { GET } = await import("@/api/campaigns/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/campaigns/${mockCampaign.id}`),
      { params: { id: mockCampaign.id } },
    );
    expect(response.status).toBe(404);
  });

  it("PATCH /api/campaigns/[id] updates status for a valid forward transition", async () => {
    const { db } = await import("@reading-advantage/db");
    const selectChain = makeSelectChainMock([{ ...mockCampaign, status: "draft" }]);
    (db.select as Mock).mockImplementation(selectChain.selectMock);

    const updated = { ...mockCampaign, status: "in-progress" };
    const { updateMock, setMock, whereMock } = makeUpdateChainMock([updated]);
    (db.update as Mock).mockImplementation(updateMock);

    const { PATCH } = await import("@/api/campaigns/[id]/route");
    const response = await PATCH(
      new Request(`http://localhost/api/campaigns/${mockCampaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      }),
      { params: { id: mockCampaign.id } },
    );

    // At HEAD this returns 200 because the route accepts any status.
    // Once the state machine is wired, it must still return 200 for valid
    // transitions — this test guards against over-rejection.
    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof updated;
    expect(body.status).toBe("in-progress");

    // Sanity-check the update payload shape.
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in-progress" }),
    );
    expect(whereMock).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 3: Status-transition state machine — RED at HEAD
// ─────────────────────────────────────────────────────────────────────

describe("Phase 4: Campaign Management — status-transition state machine (task 6: update status, RED)", () => {
  it("exports a shared isValidCampaignStatusTransition helper", async () => {
    // Expected to FAIL at HEAD: no apps/marketing/app/lib/campaign-status.ts
    // module exists yet. The Jr agent must add it.
    const mod = await import("../lib/campaign-status.js");
    expect(typeof mod.isValidCampaignStatusTransition).toBe("function");
  });

  it("exports a shared nextCampaignStatuses helper", async () => {
    const mod = await import("../lib/campaign-status.js");
    expect(typeof mod.nextCampaignStatuses).toBe("function");
  });

  it.each([
    ["draft", "in-progress", true],
    ["in-progress", "complete", true],
    ["complete", "archived", true],
    ["draft", "complete", false],
    ["draft", "archived", false],
    ["in-progress", "draft", false],
    ["in-progress", "archived", false],
    ["complete", "in-progress", false],
    ["complete", "draft", false],
    ["archived", "draft", false],
    ["archived", "in-progress", false],
    ["archived", "complete", false],
  ])(
    "status machine unit > %s → %s should be %s",
    async (from, to, expected) => {
      const { isValidCampaignStatusTransition } = await import(
        "../lib/campaign-status.js"
      );
      expect(isValidCampaignStatusTransition(from, to)).toBe(expected);
    },
  );

  it.each([
    ["draft", ["in-progress"]],
    ["in-progress", ["complete"]],
    ["complete", ["archived"]],
    ["archived", []],
  ])(
    "nextCampaignStatuses(%s) returns %s",
    async (status, expected) => {
      const { nextCampaignStatuses } = await import("../lib/campaign-status.js");
      expect(nextCampaignStatuses(status)).toEqual(expected);
    },
  );

  it("PATCH /api/campaigns/[id] rejects invalid status transitions with 400", async () => {
    const { db } = await import("@reading-advantage/db");
    const selectChain = makeSelectChainMock([{ ...mockCampaign, status: "draft" }]);
    (db.select as Mock).mockImplementation(selectChain.selectMock);

    // Provide a working update chain so that, at HEAD, the route would
    // succeed in persisting the invalid transition. The expected Red
    // failure is 200 (transition accepted) vs 400 (transition rejected).
    const { updateMock } = makeUpdateChainMock([
      { ...mockCampaign, status: "complete" },
    ]);
    (db.update as Mock).mockImplementation(updateMock);

    const { PATCH } = await import("@/api/campaigns/[id]/route");
    const response = await PATCH(
      new Request(`http://localhost/api/campaigns/${mockCampaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "complete" }),
      }),
      { params: { id: mockCampaign.id } },
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { message: string };
    expect(body.message).toMatch(/invalid transition|cannot transition/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("PATCH /api/campaigns/[id] rejects updates when the campaign is archived", async () => {
    const { db } = await import("@reading-advantage/db");
    const selectChain = makeSelectChainMock([
      { ...mockCampaign, status: "archived" },
    ]);
    (db.select as Mock).mockImplementation(selectChain.selectMock);

    const { updateMock } = makeUpdateChainMock([
      { ...mockCampaign, status: "in-progress" },
    ]);
    (db.update as Mock).mockImplementation(updateMock);

    const { PATCH } = await import("@/api/campaigns/[id]/route");
    const response = await PATCH(
      new Request(`http://localhost/api/campaigns/${mockCampaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      }),
      { params: { id: mockCampaign.id } },
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
