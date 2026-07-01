/**
 * AI Content Quality Gate Red Tests
 *
 * Proves that AI-generated content whose evaluated level deviates from the
 * requested level is rejected before persistence. Today
 * `generateUserArticle` persists whatever `calculateLevel` returns without a
 * quality gate.
 *
 * Evidence refs: Reading C-RA-CRIT-05; Reading migration PB-3 / M-RA-SEC-5.
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

let lastInsertedTable = "";
const insertedTables: string[] = [];

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
  mockDb.innerJoin = jest.fn(() => mockDb);
  mockDb.insert = jest.fn((table: any) => {
    const schema = jest.requireActual("@reading-advantage/db/schema");
    let name = table?.name || String(table);
    if (table === schema.articles) name = "articles";
    else if (table === schema.multipleChoiceQuestions) name = "multiple_choice_questions";
    else if (table === schema.shortAnswerQuestions) name = "short_answer_questions";
    else if (table === schema.longAnswerQuestions) name = "long_answer_questions";
    lastInsertedTable = name;
    insertedTables.push(name);
    return mockDb;
  });
  mockDb.values = valuesMock.mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockImplementation(() => {
    if (lastInsertedTable === "articles") {
      return Promise.resolve([
        {
          id: "article-generated-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          sentences: [],
        },
      ]);
    }
    return Promise.resolve([]);
  });
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.set = setMock.mockImplementation(() => mockDb);
  mockDb.delete = jest.fn(() => mockDb);
  mockDb.transaction = jest.fn((cb: any) => cb(mockDb));

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/calculateLevel", () => ({
  calculateLevel: jest.fn(),
}));

jest.mock("@/server/utils/generators/article-generator", () => ({
  generateArticle: jest.fn(),
}));

jest.mock("@/server/utils/generators/evaluate-rating-generator", () => ({
  evaluateRating: jest.fn(),
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

jest.mock("@/server/utils/generators/image-generator", () => ({
  generateImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/server/utils/generators/word-list-generator", () => ({
  generateWordList: jest.fn().mockResolvedValue({ word_list: [] }),
}));

jest.mock("@/server/utils/generators/audio-generator", () => ({
  generateAudio: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/server/utils/generators/audio-words-generator", () => ({
  generateAudioForWord: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/server/utils/generators/translation-generator", () => ({
  generateTranslatedSummary: jest.fn().mockResolvedValue(""),
  generateTranslatedPassage: jest.fn().mockResolvedValue(""),
  generateTranslatedPassageFromSentences: jest.fn().mockResolvedValue(""),
}));

import { getCurrentUser } from "@/lib/session";
import { generateUserArticle } from "@/server/controllers/generator-controller";
import { calculateLevel } from "@/lib/calculateLevel";
import { generateArticle } from "@/server/utils/generators/article-generator";
import { evaluateRating } from "@/server/utils/generators/evaluate-rating-generator";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockedCalculateLevel = calculateLevel as jest.MockedFunction<
  typeof calculateLevel
>;
const mockedGenerateArticle = generateArticle as jest.MockedFunction<
  typeof generateArticle
>;
const mockedEvaluateRating = evaluateRating as jest.MockedFunction<
  typeof evaluateRating
>;

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/generator/article", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("AI content quality gate (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertedTables.length = 0;
    lastInsertedTable = "";

    mockedGetCurrentUser.mockResolvedValue({
      id: "user-1",
      role: "TEACHER",
      schoolId: "school-a",
      license_id: "license-a",
      name: "Teacher One",
      email: "teacher@example.com",
    } as any);

    limitMock.mockImplementation(async () => {
      const schema = jest.requireActual("@reading-advantage/db/schema");
      const lastFrom = fromMock.mock.calls[fromMock.mock.calls.length - 1]?.[0];
      if (lastFrom === schema.users) {
        return [
          {
            id: "user-1",
            name: "Teacher One",
            email: "teacher@example.com",
          },
        ];
      }
      if (lastFrom === schema.articles) {
        return [
          {
            id: "article-generated-1",
            createdAt: new Date(),
            updatedAt: new Date(),
            sentences: [],
          },
        ];
      }
      return [];
    });

    mockedGenerateArticle.mockResolvedValue({
      title: "A very simple text",
      passage: "This is a short, simple passage.",
      summary: "Simple summary.",
      imageDesc: "Simple image.",
    });

    mockedEvaluateRating.mockResolvedValue({ rating: 5 });
  });

  it("rejects article when generated level is far below requested CEFR level", async () => {
    // User requests C2 content; AI pipeline claims it is A1/raLevel 1.
    mockedCalculateLevel.mockReturnValue({
      raLevel: 1,
      cefrLevel: "A1",
    });

    const res = await generateUserArticle(
      makeRequest({
        type: "fiction",
        genre: "Fantasy",
        topic: "dragons",
        cefrLevel: "C2",
        wordCount: 300,
      })
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("does not persist an off-level article", async () => {
    mockedCalculateLevel.mockReturnValue({
      raLevel: 1,
      cefrLevel: "A1",
    });

    await generateUserArticle(
      makeRequest({
        type: "fiction",
        genre: "Fantasy",
        topic: "dragons",
        cefrLevel: "C2",
        wordCount: 300,
      })
    );

    const articleInsertCount = insertedTables.filter(
      (t) => t === "articles"
    ).length;
    expect(articleInsertCount).toBe(0);
  });

  it("accepts article when generated level matches requested CEFR level", async () => {
    mockedCalculateLevel.mockReturnValue({
      raLevel: 12,
      cefrLevel: "C2",
    });

    const res = await generateUserArticle(
      makeRequest({
        type: "fiction",
        genre: "Fantasy",
        topic: "dragons",
        cefrLevel: "C2",
        wordCount: 300,
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.article.cefr_level).toBe("C2");
  });

  it("labeled off-level rejection count is 1 for a C2-request/A1-returned article", async () => {
    mockedCalculateLevel.mockReturnValue({
      raLevel: 1,
      cefrLevel: "A1",
    });

    const res = await generateUserArticle(
      makeRequest({
        type: "fiction",
        genre: "Fantasy",
        topic: "dragons",
        cefrLevel: "C2",
        wordCount: 300,
      })
    );

    const rejected = res.status >= 400;
    expect({
      offLevelContentRejectedCount: rejected ? 1 : 0,
      responseStatus: res.status,
    }).toEqual({
      offLevelContentRejectedCount: 1,
      responseStatus: 400,
    });
  });
});
