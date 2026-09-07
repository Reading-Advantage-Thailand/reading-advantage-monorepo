/** @jest-environment node */
import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

const insertedRows: Array<{ table: unknown; values: unknown }> = [];
const updatedTables: unknown[] = [];

function containsValue(value: unknown, expected: string, seen = new WeakSet<object>()): boolean {
  if (value === expected) return true;
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((child) => containsValue(child, expected, seen));
}

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  const schema = jest.requireActual("@reading-advantage/db/schema");
  const questionRows = new Map<unknown, { id: string; articleId: string; question: string; answer?: string }>([
    [schema.shortAnswerQuestions, { id: "sa-1", articleId: "article-1", question: "Short?", answer: "Short." }],
    [schema.multipleChoiceQuestions, { id: "mc-1", articleId: "article-1", question: "Choice?", answer: "A" }],
    [schema.longAnswerQuestions, { id: "la-1", articleId: "article-1", question: "Long?" }],
  ]);

  function selectChain(table: unknown) {
    let condition: unknown;
    const chain: any = {
      where(nextCondition: unknown) {
        condition = nextCondition;
        return chain;
      },
      limit() {
        const row = questionRows.get(table);
        if (!row || !containsValue(condition, row.id)) return Promise.resolve([]);
        const hasRouteArticle = containsValue(condition, "article-2");
        return Promise.resolve(hasRouteArticle ? [] : [row]);
      },
      then(resolve: (rows: unknown[]) => unknown) {
        return Promise.resolve([]).then(resolve);
      },
    };
    return chain;
  }

  const db = {
    select: jest.fn(() => ({ from: (table: unknown) => selectChain(table) })),
    insert: jest.fn((table: unknown) => ({
      values: (values: unknown) => {
        insertedRows.push({ table, values });
        return { returning: async () => [{ id: "inserted" }], onConflictDoUpdate: async () => [] };
      },
    })),
    update: jest.fn((table: unknown) => {
      updatedTables.push(table);
      return { set: () => ({ where: async () => [] }) };
    }),
  };

  return { ...actual, db };
});

jest.mock("@/server/controllers/assistant-controller", () => ({
  getFeedbackWritter: jest.fn(),
}));
jest.mock("@/server/utils/generators/mc-question-generator", () => ({
  generateMCQuestion: jest.fn(),
}));
jest.mock("@/server/utils/generators/sa-question-generator", () => ({
  generateSAQuestion: jest.fn(),
}));
jest.mock("@/server/utils/generators/la-question-generator", () => ({
  generateLAQuestion: jest.fn(),
}));

import {
  answerLAQuestion,
  answerMCQuestion,
  answerSAQuestion,
} from "@/server/controllers/question-controller";

function request(body: object): ExtendedNextRequest {
  const req = new NextRequest("http://localhost.test/answer", {
    method: "POST",
    body: JSON.stringify(body),
  }) as ExtendedNextRequest;
  req.session = {
    user: { id: "student-1", role: "STUDENT", schoolId: "school-1" },
  } as never;
  return req;
}

function context(questionId: string) {
  return {
    params: Promise.resolve({ article_id: "article-2", question_id: questionId }),
  };
}

describe("question and article association", () => {
  beforeEach(() => {
    insertedRows.length = 0;
    updatedTables.length = 0;
  });

  it.each([
    ["short answer", answerSAQuestion, "sa-1", { answer: "Short.", timeRecorded: 3 }],
    ["multiple choice", answerMCQuestion, "mc-1", { selectedAnswer: "B", timeRecorded: 3 }],
    ["long answer", answerLAQuestion, "la-1", { answer: "Long.", feedback: {}, timeRecorded: 3 }],
  ])("rejects a %s question from another article before writes", async (_name, handler, questionId, body) => {
    const response = await handler(request(body), context(questionId) as never);

    expect(response.status).toBe(404);
    expect(insertedRows).toHaveLength(0);
    expect(updatedTables).toHaveLength(0);
  });
});
