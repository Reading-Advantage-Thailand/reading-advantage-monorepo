/**
 * FR-4 behavioral tests: the level-test placement endpoint computes XP
 * server-side from the posted assessment and ignores any client-sent XP.
 *
 * Runs in the node environment because NextResponse requires the undici
 * Response implementation; the jsdom polyfill is incomplete.
 *
 * @jest-environment node
 */

jest.mock("@/utils/openai", () => ({
  openai: {},
  openaiModel5: "test-model",
}));

jest.mock("@reading-advantage/ai/internal-sdk", () => ({
  streamText: jest.fn(),
}));

jest.mock("@reading-advantage/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  and: jest.fn((...args: unknown[]) => ({ and: args })),
  eq: jest.fn((...args: unknown[]) => ({ eq: args })),
}));

import { NextRequest } from "next/server";
import { db } from "@reading-advantage/db";
import { handleLevelTestPlacement } from "@/server/controllers/level-test-controller";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

const dbMock = db as jest.Mocked<typeof db>;

function placementRequest(
  body: unknown,
  user?: { id: string } | null,
): ExtendedNextRequest {
  const req = new NextRequest("http://localhost/api/v1/level-test/placement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as ExtendedNextRequest;
  req.session = user ? { user: user as any } : undefined;
  return req;
}

function pendingRow(level: string, sublevel: string) {
  return {
    id: "pending-1",
    details: {
      assessment: {
        level,
        sublevel,
        explanation: "Consistent performance across tasks.",
        strengths: ["Vocabulary"],
        improvements: ["Past tense"],
        nextSteps: "Keep reading daily.",
      },
    },
  };
}

function selectLimit(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  };
}

describe("level-test placement endpoint", () => {
  const insertValues = jest.fn();
  const updateSet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    insertValues.mockReturnValue({
      onConflictDoNothing: () => ({
        returning: () => Promise.resolve([{ id: "activity-1" }]),
      }),
    });
    (dbMock.insert as jest.Mock).mockReturnValue({ values: insertValues });
    updateSet.mockReturnValue({
      where: () => Promise.resolve(undefined),
    });
    (dbMock.update as jest.Mock).mockReturnValue({ set: updateSet });
    (dbMock.delete as jest.Mock).mockReturnValue({
      where: () => Promise.resolve(undefined),
    });
    (dbMock.select as jest.Mock)
      .mockReturnValueOnce(selectLimit([pendingRow("B1", "+")]))
      .mockReturnValue(selectLimit([]));
  });

  it("computes placement from the stored assessment and ignores client-sent XP", async () => {
    const res = await handleLevelTestPlacement(
      placementRequest(
        {
          level: "C2",
          sublevel: "+",
          messageCount: 12,
          xpEarned: 999999, // a forged client value that must be ignored
        },
        { id: "student-1" },
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // Stored B1+ maps to 68000 XP per the CEFR table, never the forged value.
    expect(body.placement.systemXp).toBe(68000);
    expect(body.placement.raLevel).toBe(9);

    // The XP log records the server-computed value.
    const xpLogValues = insertValues.mock.calls.find(
      ([values]: [Record<string, unknown>]) =>
        values && typeof values === "object" && "activityId" in values,
    );
    expect(xpLogValues).toBeDefined();
    expect(xpLogValues![0].xpEarned).toBe(68000);
  });

  it("rejects placement when no server assessment is stored", async () => {
    (dbMock.select as jest.Mock).mockReset();
    (dbMock.select as jest.Mock).mockReturnValue(selectLimit([]));

    const res = await handleLevelTestPlacement(
      placementRequest({ level: "C2", sublevel: "+" }, { id: "student-1" }),
    );

    expect(res.status).toBe(400);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    const res = await handleLevelTestPlacement(
      placementRequest({ level: "B1" }, null),
    );
    expect(res.status).toBe(401);
  });

  it("rejects an invalid assessment payload", async () => {
    (dbMock.select as jest.Mock).mockReset();
    (dbMock.select as jest.Mock).mockReturnValue(selectLimit([]));
    const res = await handleLevelTestPlacement(
      placementRequest({ sublevel: "+" }, { id: "student-1" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a stored assessment that fails the contract schema with zero inserts", async () => {
    // A row planted through a now-blocked path: a valid CEFR level pair
    // without the remaining required assessment fields.
    (dbMock.select as jest.Mock).mockReset();
    (dbMock.select as jest.Mock).mockReturnValue(
      selectLimit([
        {
          id: "pending-1",
          details: { assessment: { level: "B1", sublevel: "+" } },
        },
      ]),
    );

    const res = await handleLevelTestPlacement(
      placementRequest({}, { id: "student-1" }),
    );

    expect(res.status).toBe(400);
    expect(insertValues).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalled();
    expect(dbMock.delete as jest.Mock).not.toHaveBeenCalled();
  });
});
