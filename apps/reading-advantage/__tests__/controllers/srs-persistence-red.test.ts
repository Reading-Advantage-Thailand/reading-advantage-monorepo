/**
 * Red Test — SRS review persistence (track reading_qa_srs_persistence_20260918).
 *
 * Browser QA (tests C1c/C2) showed rated flashcards never persist and session
 * XP is never awarded. The dev log recorded two faults:
 *
 * 1. `POST /api/v1/flashcard/progress/update` throws FSRSValidationError for
 *    stored New cards with `stability: 0` but nonzero difficulty
 *    ("Invalid memory state"). The catch-all returns HTTP 200, so the client
 *    counts the card as correct while nothing is written.
 * 2. `POST /api/v1/users/{id}/activitylog` rejects the flashcard session
 *    payload with 400 "Target ID is required" because resolveActivityTarget
 *    ignores the explicit top-level `targetId` field the client sends
 *    (`flashcard-vocabulary-<timestamp>`).
 *
 * Falsification conditions:
 *  - If rating a stability-0 card does not call db.update with advanced
 *    reps/due/stability, the SRS persistence assertion fails.
 *  - If the flashcard activitylog payload does not insert user_activity and
 *    xp_logs rows with server-computed XP, the XP assertion fails.
 *
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var insertMock: jest.Mock;
var valuesMock: jest.Mock;
var returningMock: jest.Mock;
var updateMock: jest.Mock;
var setMock: jest.Mock;

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  selectMock = jest.fn();
  fromMock = jest.fn();
  whereMock = jest.fn();
  limitMock = jest.fn();
  insertMock = jest.fn();
  valuesMock = jest.fn();
  returningMock = jest.fn();
  updateMock = jest.fn();
  setMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.insert = insertMock.mockImplementation(() => mockDb);
  mockDb.values = valuesMock.mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockResolvedValue([]);
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.set = setMock.mockImplementation(() => mockDb);

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { POST as updateFlashcardProgress } from "@/app/api/v1/flashcard/progress/update/route";
import { postActivityLog } from "@/server/controllers/user-controller";

const mockedGetCurrentUser = getCurrentUser as jest.Mock;

function makeUpdateRequest(body: object): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/v1/flashcard/progress/update",
    { method: "POST", body: JSON.stringify(body) },
  );
}

function makeActivityRequest(userId: string, body: object): ExtendedNextRequest {
  const req = new NextRequest(
    `http://localhost:3000/api/v1/users/${userId}/activitylog`,
    { method: "POST", body: JSON.stringify(body) },
  ) as ExtendedNextRequest;
  req.session = {
    user: {
      id: userId,
      role: "STUDENT",
      schoolId: "school-a",
    },
  } as any;
  return req;
}

function makeActivityContext(userId: string) {
  return { params: Promise.resolve({ id: userId }) };
}

// Stored New card as seeded in the dev DB: reviewed zero times, FSRS memory
// state never initialized (stability 0) with seed-written difficulty.
const STABILITY_ZERO_CARD = {
  id: "card-stability-zero",
  userId: "user-1",
  word: { vocabulary: "abandon", definition: { en: "give up" } },
  difficulty: 0.5463865,
  due: new Date("2026-09-15T23:24:15.177Z"),
  elapsedDays: 0,
  lapses: 0,
  reps: 0,
  scheduledDays: 0,
  stability: 0,
  state: 0,
  articleId: "article-1",
  saveToFlashcard: true,
  createdAt: new Date("2026-09-15T23:24:15.178Z"),
  updatedAt: new Date("2026-09-15T23:24:15.178Z"),
};

describe("SRS persistence (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    limitMock.mockResolvedValue([]);
    returningMock.mockResolvedValue([]);
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("persists a Good rating on a stability-0 New card", async () => {
    limitMock.mockResolvedValue([{ ...STABILITY_ZERO_CARD }]);

    const res = await updateFlashcardProgress(
      makeUpdateRequest({ cardId: "card-stability-zero", rating: 3, type: "vocabulary" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Card progress updated");
    expect(updateMock).toHaveBeenCalled();
    const updateData = setMock.mock.calls[0]?.[0];
    expect(updateData.reps).toBe(1);
    expect(updateData.stability).toBeGreaterThan(0);
    expect(new Date(updateData.due).getTime()).toBeGreaterThan(
      new Date(STABILITY_ZERO_CARD.due).getTime(),
    );
  });

  it("returns a real HTTP error status when the card is missing", async () => {
    limitMock.mockResolvedValue([]);

    const res = await updateFlashcardProgress(
      makeUpdateRequest({ cardId: "card-missing", rating: 3, type: "vocabulary" }),
    );

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("records the flashcard session activity and awards server-computed XP", async () => {
    const schema = jest.requireActual("@reading-advantage/db/schema");
    limitMock.mockImplementation(async () => {
      const lastFrom =
        fromMock.mock.calls[fromMock.mock.calls.length - 1]?.[0];
      if (lastFrom === schema.users) {
        return [{ xp: 64192, level: 8, cefrLevel: "B1" }];
      }
      return [];
    });
    returningMock.mockImplementation(async () => {
      const lastInsert =
        insertMock.mock.calls[insertMock.mock.calls.length - 1]?.[0];
      if (lastInsert === schema.userActivity) return [{ id: "activity-1" }];
      return [];
    });

    const res: NextResponse = await postActivityLog(
      makeActivityRequest("user-1", {
        activityType: "vocabulary_flashcards",
        activityStatus: "completed",
        xpEarned: 15,
        timeTaken: 60,
        targetId: "flashcard-vocabulary-1758156000000",
        details: {
          deckId: "deck-1",
          deckName: "Vocabulary",
          deckType: "VOCABULARY",
          totalCards: 5,
          correctAnswers: 5,
          incorrectAnswers: 0,
        },
      }),
      makeActivityContext("user-1"),
    );

    expect(res.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: "flashcard-vocabulary-1758156000000",
        activityType: "VOCABULARY_FLASHCARDS",
      }),
    );
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ xpEarned: 15, activityType: "VOCABULARY_FLASHCARDS" }),
    );
  });

  it("still rejects the reserved level-test assessment target", async () => {
    const res: NextResponse = await postActivityLog(
      makeActivityRequest("user-1", {
        activityType: "vocabulary_flashcards",
        activityStatus: "completed",
        targetId: "pending-level-test-assessment",
      }),
      makeActivityContext("user-1"),
    );

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
