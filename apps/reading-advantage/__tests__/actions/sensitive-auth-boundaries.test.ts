/**
 * Sensitive Auth Boundary Red Tests
 *
 * Inventories sensitive actions/endpoints that must reject unauthenticated
 * callers and fails when any of them accepts the call. Today several
 * reading-advantage entry points proceed without auth.
 *
 * Covered boundaries:
 * - submitRating (server action)
 * - actions/pratice.ts getSentencesForOrderingGame (server action)
 * - refreshAIInsightsAutomated (controller)
 * - generateQueue (controller)
 * - refreshMaterializedViewsAutomated (controller)
 *
 * Evidence refs: Reading C-RA-CRIT-01, C-RA-CRIT-02, C-RA-CRIT-04, C-RA-CRIT-05, H-03;
 * Reading migration C-4 / M-RA-SEC-2.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";

var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var insertMock: jest.Mock;
var valuesMock: jest.Mock;
var returningMock: jest.Mock;
var updateMock: jest.Mock;
var setMock: jest.Mock;
var deleteMock: jest.Mock;
var executeMock: jest.Mock;

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
  deleteMock = jest.fn();
  executeMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.insert = insertMock.mockImplementation(() => mockDb);
  mockDb.values = valuesMock.mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockResolvedValue([{ id: "article-1" }]);
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.set = setMock.mockImplementation(() => mockDb);
  mockDb.delete = deleteMock.mockImplementation(() => mockDb);
  mockDb.execute = executeMock.mockResolvedValue([]);
  mockDb.transaction = jest.fn((cb: any) => cb(mockDb));
  // Make the mock chain awaitable so that queries ending in `.where()` resolve
  // to an empty array instead of returning the mock object.
  mockDb.then = (resolve: any) => resolve([]);

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/server/utils/send-discord-webhook", () => ({
  sendDiscordWebhook: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/server/utils/generators/random-select-genre", () => ({
  randomSelectGenre: jest.fn().mockResolvedValue({
    genre: "Fiction",
    subgenre: "Adventure",
  }),
}));

jest.mock("@/server/utils/generators/topic-generator", () => ({
  generateTopic: jest.fn().mockResolvedValue({ topics: ["space"] }),
}));

jest.mock("@/server/utils/generators/article-generator", () => ({
  generateArticle: jest.fn().mockResolvedValue({
    title: "Test",
    passage: "Test passage.",
    summary: "Summary.",
    imageDesc: "Image.",
  }),
}));

jest.mock("@/server/utils/generators/evaluate-rating-generator", () => ({
  evaluateRating: jest.fn().mockResolvedValue({ rating: 5 }),
}));

jest.mock("@/server/utils/generators/mc-question-generator", () => ({
  generateMCQuestion: jest.fn().mockResolvedValue({ questions: [] }),
}));

jest.mock("@/server/utils/generators/sa-question-generator", () => ({
  generateSAQuestion: jest.fn().mockResolvedValue({ questions: [] }),
}));

jest.mock("@/server/utils/generators/la-question-generator", () => ({
  generateLAQuestion: jest.fn().mockResolvedValue({ question: null }),
}));

jest.mock("@/server/utils/generators/audio-generator", () => ({
  generateAudio: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/server/utils/generators/image-generator", () => ({
  generateImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/server/utils/generators/word-list-generator", () => ({
  generateWordList: jest.fn().mockResolvedValue({ word_list: [] }),
}));

jest.mock("@/server/utils/generators/audio-words-generator", () => ({
  generateAudioForWord: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/server/utils/generators/translation-generator", () => ({
  generateTranslatedSummary: jest.fn().mockResolvedValue(""),
  generateTranslatedPassage: jest.fn().mockResolvedValue(""),
  generateTranslatedPassageFromSentences: jest.fn().mockResolvedValue(""),
}));

jest.mock("@/server/services/ai-insight-service", () => ({
  generateStudentInsights: jest.fn().mockResolvedValue([]),
  generateTeacherInsights: jest.fn().mockResolvedValue([]),
  generateClassroomInsights: jest.fn().mockResolvedValue([]),
  generateLicenseInsights: jest.fn().mockResolvedValue([]),
  generateSystemInsights: jest.fn().mockResolvedValue([]),
}));

import { getCurrentUser } from "@/lib/session";
import { submitRating } from "@/actions/rating";
import { getSentencesForOrderingGame } from "@/actions/pratice";
import { refreshAIInsightsAutomated } from "@/server/controllers/ai-insight-refresh-controller";
import { generateQueue } from "@/server/controllers/generator-controller";
import { refreshMaterializedViewsAutomated } from "@/server/controllers/system-controller";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

describe("sensitive auth boundaries reject unauthenticated callers (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue(null);
    limitMock.mockResolvedValue([]);
  });

  async function isAccepted(promise: Promise<unknown>): Promise<boolean> {
    try {
      const result = await promise;
      if (result && typeof result === "object" && "status" in result) {
        return (result as { status: number }).status < 400;
      }
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        (result as { success: boolean }).success === false
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  it("submitRating must reject unauthenticated calls", async () => {
    const accepted = await isAccepted(
      submitRating("user-1", "article-1", 5, {
        title: "Test",
        ra_level: 1,
        cefr_level: "A1",
      })
    );
    expect(accepted).toBe(false);
  });

  it("getSentencesForOrderingGame must reject unauthenticated calls", async () => {
    const accepted = await isAccepted(getSentencesForOrderingGame());
    expect(accepted).toBe(false);
  });

  it("refreshAIInsightsAutomated must reject unauthenticated calls", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/ai/insights/refresh",
      { method: "POST" }
    );
    const res = await refreshAIInsightsAutomated(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("generateQueue must reject unauthenticated calls", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/generator/queue",
      {
        method: "POST",
        body: JSON.stringify({ amountPerGenre: 1 }),
      }
    );
    const res = await generateQueue(req as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refreshMaterializedViewsAutomated must reject unauthenticated calls", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/system/refresh-views",
      { method: "POST" }
    );
    const res = await refreshMaterializedViewsAutomated(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("labeled unauthenticated-accepted endpoint inventory count is 0", async () => {
    const boundaries = await Promise.all([
      { name: "submitRating", accepted: await isAccepted(submitRating("user-1", "article-1", 5, { title: "Test", ra_level: 1, cefr_level: "A1" })) },
      { name: "getSentencesForOrderingGame", accepted: await isAccepted(getSentencesForOrderingGame()) },
      {
        name: "refreshAIInsightsAutomated",
        accepted: await isAccepted(
          refreshAIInsightsAutomated(
            new NextRequest("http://localhost:3000/api/v1/ai/insights/refresh", { method: "POST" })
          )
        ),
      },
      {
        name: "generateQueue",
        accepted: await isAccepted(
          generateQueue(
            new NextRequest("http://localhost:3000/api/v1/generator/queue", {
              method: "POST",
              body: JSON.stringify({ amountPerGenre: 1 }),
            }) as any
          )
        ),
      },
      {
        name: "refreshMaterializedViewsAutomated",
        accepted: await isAccepted(
          refreshMaterializedViewsAutomated(
            new NextRequest("http://localhost:3000/api/v1/system/refresh-views", { method: "POST" })
          )
        ),
      },
    ]);

    const acceptedCount = boundaries.filter((b) => b.accepted).length;
    const acceptedNames = boundaries.filter((b) => b.accepted).map((b) => b.name);

    // A3 labeled count: this will fail Red with the list of boundaries that accepted.
    expect({
      unauthenticatedAcceptedEndpointCount: acceptedCount,
      unauthenticatedAcceptedEndpointNames: acceptedNames,
    }).toEqual({
      unauthenticatedAcceptedEndpointCount: 0,
      unauthenticatedAcceptedEndpointNames: [],
    });
  });
});
