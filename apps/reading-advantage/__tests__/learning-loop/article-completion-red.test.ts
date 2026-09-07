/** @jest-environment node */
import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

const activityWrites: Array<Record<string, unknown>> = [];
let completedMcqCount = 5;
let licenseId: string | null = null;
let expiredDate: Date | null = null;
let hasCompletedLaq = false;

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

  function chainFor(table: unknown) {
    let condition: unknown;
    const resolveRows = () => {
      if (table === schema.shortAnswerQuestions) {
        return containsValue(condition, "saq-1") && containsValue(condition, "article-1")
          ? [{ id: "saq-1", articleId: "article-1", question: "What?", answer: "That." }]
          : [];
      }
      if (table === schema.users) {
        return [{
          id: "student-1",
          xp: 0,
          licenseId,
          expiredDate,
        }];
      }
      if (table === schema.licenses) return [{ licenseType: "ENTERPRISE" }];
      if (table === schema.userActivity) {
        if (containsValue(condition, "MC_QUESTION")) {
          return Array.from({ length: completedMcqCount }, (_, index) => ({
            id: `mcq-${index}`,
            activityType: "MC_QUESTION",
            completed: true,
            details: { articleId: "article-1" },
          }));
        }
        if (containsValue(condition, "SA_QUESTION")) {
          return activityWrites.filter((row) => row.activityType === "SA_QUESTION");
        }
        if (containsValue(condition, "LA_QUESTION")) {
          return hasCompletedLaq ? [{ id: "laq-1", completed: true }] : [];
        }
        if (containsValue(condition, "ARTICLE_READ")) {
          return activityWrites.filter((row) => row.activityType === "ARTICLE_READ");
        }
      }
      return [];
    };
    const chain: any = {
      where(nextCondition: unknown) {
        condition = nextCondition;
        return chain;
      },
      limit() {
        return Promise.resolve(resolveRows());
      },
      then(resolve: (rows: unknown[]) => unknown) {
        return Promise.resolve(resolveRows()).then(resolve);
      },
    };
    return chain;
  }

  const db = {
    select: jest.fn(() => ({ from: (table: unknown) => chainFor(table) })),
    insert: jest.fn((table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        if (table === schema.userActivity) activityWrites.push(values);
        return { returning: async () => [{ id: `activity-${activityWrites.length}` }] };
      },
    })),
    update: jest.fn(() => ({ set: () => ({ where: async () => [] }) })),
  };
  return { ...actual, db };
});

jest.mock("@/server/controllers/assistant-controller", () => ({
  getFeedbackWritter: jest.fn(),
}));
jest.mock("@/server/utils/generators/sa-question-generator", () => ({
  generateSAQuestion: jest.fn(),
}));
jest.mock("@/server/utils/generators/mc-question-generator", () => ({
  generateMCQuestion: jest.fn(),
}));
jest.mock("@/server/utils/generators/la-question-generator", () => ({
  generateLAQuestion: jest.fn(),
}));

import { answerSAQuestion } from "@/server/controllers/question-controller";

function request(): ExtendedNextRequest {
  const req = new NextRequest("http://localhost.test/answer", {
    method: "POST",
    body: JSON.stringify({ answer: "That.", timeRecorded: 10 }),
  }) as ExtendedNextRequest;
  req.session = {
    user: { id: "student-1", role: "STUDENT", schoolId: "school-1", xp: 0 },
  } as never;
  return req;
}

describe("article completion requirements", () => {
  beforeEach(() => {
    activityWrites.length = 0;
    completedMcqCount = 5;
    licenseId = null;
    expiredDate = null;
    hasCompletedLaq = false;
  });

  it("does not complete an article with fewer than five MCQs", async () => {
    completedMcqCount = 4;

    await answerSAQuestion(request(), {
      params: Promise.resolve({ article_id: "article-1", question_id: "saq-1" }),
    });

    expect(activityWrites.some((row) => row.activityType === "ARTICLE_READ")).toBe(false);
  });

  it("creates one article completion after five MCQs and one SAQ", async () => {
    const response = await answerSAQuestion(request(), {
      params: Promise.resolve({ article_id: "article-1", question_id: "saq-1" }),
    });

    expect(response.status).toBe(200);
    expect(activityWrites.filter((row) => row.activityType === "ARTICLE_READ")).toHaveLength(1);
    expect(activityWrites).toContainEqual(
      expect.objectContaining({
        activityType: "ARTICLE_READ",
        targetId: "article-1",
        completed: true,
      }),
    );
  });

  it("does not repeat article completion when it already exists", async () => {
    activityWrites.push({
      id: "existing-read",
      userId: "student-1",
      activityType: "ARTICLE_READ",
      targetId: "article-1",
      completed: true,
    });

    await answerSAQuestion(request(), {
      params: Promise.resolve({ article_id: "article-1", question_id: "saq-1" }),
    });

    expect(activityWrites.filter((row) => row.activityType === "ARTICLE_READ")).toHaveLength(1);
  });

  it("requires LAQ completion for a valid Enterprise license", async () => {
    licenseId = "license-1";
    expiredDate = new Date(Date.now() + 86_400_000);

    await answerSAQuestion(request(), {
      params: Promise.resolve({ article_id: "article-1", question_id: "saq-1" }),
    });

    expect(activityWrites.some((row) => row.activityType === "ARTICLE_READ")).toBe(false);
  });

  it("uses Basic requirements after an Enterprise license expires", async () => {
    licenseId = "license-1";
    expiredDate = new Date(Date.now() - 86_400_000);

    await answerSAQuestion(request(), {
      params: Promise.resolve({ article_id: "article-1", question_id: "saq-1" }),
    });

    expect(activityWrites.some((row) => row.activityType === "ARTICLE_READ")).toBe(true);
  });
});
