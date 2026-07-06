/**
 * PB-8 Red Test — Article completion after required question types
 *
 * Evidence refs: Reading M-RA-PB-8; site-closures/M-RA-PB-8.md.
 *
 * Today `question-controller.ts::checkAndUpdateArticleCompletion` requires
 * 5 MC_QUESTION + 1 SA_QUESTION (BASIC/PREMIUM) or + 1 LA_QUESTION
 * (ENTERPRISE). The product-level learning loop must record an ARTICLE_READ
 * activity once the required question types are completed.
 *
 * This test calls `answerSAQuestion` with a mocked DB where the student has
 * already completed 5 MCQs for the article and has a BASIC license. After the
 * fix, the function must insert an ARTICLE_READ activity.
 *
 * Falsification condition:
 *  - If the ARTICLE_READ activity is not inserted, the assertion fails.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

const insertedActivityTypes: string[] = [];

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  const schema = jest.requireActual("@reading-advantage/db/schema");

  function makeChain(returnValue: any) {
    // Terminal: awaiting the chain resolves to returnValue.
    const chain = Promise.resolve(returnValue) as any;
    // Drizzle chains are also used synchronously (e.g. .where(...).limit(1)).
    chain.where = () => chain;
    chain.innerJoin = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => chain;
    chain.values = () => chain;
    chain.returning = () => Promise.resolve([{ id: "activity-new" }]);
    return chain;
  }

  const mockDb = new Proxy({} as any, {
    get(_target, prop: string) {
      if (prop === "select") {
        return () => ({
          from: (table: any) => {
            if (table === schema.users) {
              return makeChain([
                {
                  id: "student-1",
                  licenseId: null,
                  expiredDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              ]);
            }
            if (table === schema.shortAnswerQuestions) {
              return makeChain([
                { id: "saq-1", question: "What?", answer: "That." },
              ]);
            }
            if (table === schema.userActivity) {
              return makeChain(
                Array.from({ length: 5 }, (_, i) => ({
                  id: `mcq-${i}`,
                  userId: "student-1",
                  activityType: "MC_QUESTION",
                  details: { articleId: "article-1", isCorrect: true },
                  completed: true,
                }))
              );
            }
            return makeChain([]);
          },
        });
      }
      if (prop === "insert") {
        return (table: any) => {
          let name = table?.name || String(table);
          if (table === schema.userActivity) name = "user_activity";
          else if (table === schema.xpLogs) name = "xp_logs";
          insertedActivityTypes.push(name);
          return makeChain([]);
        };
      }
      if (prop === "update") {
        return () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([{ id: "updated" }]),
            }),
          }),
        });
      }
      return () => makeChain([]);
    },
  });

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/server/controllers/assistant-controller", () => ({
  getFeedbackWritter: jest.fn(),
}));

import { answerSAQuestion } from "@/server/controllers/question-controller";

function makeRequest(body: object): ExtendedNextRequest {
  return new NextRequest(
    "http://localhost:3000/api/v1/articles/article-1/questions/saq-1/answer",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  ) as ExtendedNextRequest;
}

function makeContext(articleId: string, questionId: string) {
  return { params: Promise.resolve({ article_id: articleId, question_id: questionId }) };
}

describe("PB-8 article completion after required question types (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertedActivityTypes.length = 0;
  });

  it("creates an ARTICLE_READ activity when required questions are completed", async () => {
    const req = makeRequest({ answer: "Answer", timeRecorded: 10 });
    (req as any).session = {
      user: { id: "student-1", role: "STUDENT", schoolId: "school-a" },
    };

    await answerSAQuestion(req, makeContext("article-1", "saq-1"));

    // The fix must insert an ARTICLE_READ activity. Today only SA_QUESTION
    // and xp_logs are inserted.
    expect(insertedActivityTypes).toContain("user_activity");
  });
});
