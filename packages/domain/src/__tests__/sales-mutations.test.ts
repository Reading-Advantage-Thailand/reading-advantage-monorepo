import { describe, it, expect, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { salesProgress } from "@reading-advantage/db/schema";
import {
  markTheoryLessonComplete,
  createRoleplayAttempt,
  submitRoleplayAttempt,
  saveAttemptEvaluation,
  submitQuiz,
  saveChatMessage,
  approveCurriculumContent,
} from "../sales/mutations.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const salesRep = {
  id: "u1",
  username: "rep1",
  name: "Rep One",
  role: "SALES_REP" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const salesAdmin = {
  ...salesRep,
  id: "a1",
  username: "admin1",
  name: "Admin",
  role: "SALES_ADMIN" as const,
};

const globalTenant = { schoolId: null };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, globalTenant);
}

function quizQuestions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `q${index + 1}`,
    lessonId: "l1",
    question: `Question ${index + 1}`,
    optionsJson: ["correct", "incorrect"],
    correctAnswer: "correct",
    explanation: "Explanation",
    order: index + 1,
    createdAt: new Date(),
  }));
}

function answersWithCorrectCount(count: number, correctCount: number) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `q${index + 1}`,
      index < correctCount ? "correct" : "incorrect",
    ]),
  );
}

const moduleRow = {
  id: "m1",
  slug: "foundations",
  title: "Foundations",
  description: "",
  phase: "Foundations",
  order: 1,
  createdAt: new Date(),
};

function approvedLesson(type: "theory" | "roleplay" | "quiz") {
  return {
    id: "l1",
    moduleId: moduleRow.id,
    title: "Lesson",
    type,
    content: "",
    order: 1,
    reviewStatus: "approved" as const,
    createdAt: new Date(),
  };
}

function lessonAccessSequence(
  lesson: ReturnType<typeof approvedLesson>,
  progress: unknown[] = [],
) {
  return [[lesson], [moduleRow], [lesson], progress];
}

const approvedRubric = {
  id: "r1",
  name: "Rubric",
  criteriaJson: [],
  reviewStatus: "approved" as const,
  createdAt: new Date(),
};

const roleplayScenario = {
  id: "s1",
  lessonId: "l1",
  personaName: "D",
  personaRole: "Dir",
  situation: "s",
  objective: "o",
  prospectContextJson: {},
  rubricId: "r1",
  order: 1,
  createdAt: new Date(),
};

describe("sales mutations", () => {
  it("markTheoryLessonComplete upserts progress to completed", async () => {
    const theoryLesson = approvedLesson("theory");
    const db = createMockDb({
      selectSequence: lessonAccessSequence(theoryLesson),
      insertReturning: [
        {
          id: "p1",
          userId: "u1",
          lessonId: "l1",
          status: "completed",
          completedAt: new Date(),
          score: null,
          createdAt: new Date(),
        },
      ],
    });
    const result = await markTheoryLessonComplete(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { lessonId: "l1" },
    );
    expect(result.status).toBe("completed");
  });

  it("markTheoryLessonComplete rejects draft and non-theory lessons before writing", async () => {
    const draftLesson = {
      ...approvedLesson("theory"),
      reviewStatus: "draft" as const,
    };
    const draftDb = createMockDb({ selectResults: [draftLesson] });
    await expect(
      markTheoryLessonComplete(
        { db: wrapDb(draftDb), user: salesRep, tenant: globalTenant },
        { lessonId: "l1" },
      ),
    ).rejects.toThrow(/not approved/);
    expect(draftDb.insert).not.toHaveBeenCalled();

    const quizLesson = approvedLesson("quiz");
    const quizDb = createMockDb({ selectResults: [quizLesson] });
    await expect(
      markTheoryLessonComplete(
        { db: wrapDb(quizDb), user: salesRep, tenant: globalTenant },
        { lessonId: "l1" },
      ),
    ).rejects.toThrow(/not 'theory'/);
    expect(quizDb.insert).not.toHaveBeenCalled();
  });

  it("createRoleplayAttempt computes attemptNumber from prior attempts", async () => {
    const priorAttempts = [{ id: "a1" }, { id: "a2" }];
    const newAttempt = {
      id: "a3",
      scenarioId: "s1",
      userId: "u1",
      audioStorageKey: "key",
      durationMs: 60,
      attemptNumber: 3,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      createdAt: new Date(),
    };
    const roleplayLesson = approvedLesson("roleplay");
    const db = createMockDb({
      selectSequence: [
        [roleplayScenario],
        ...lessonAccessSequence(roleplayLesson),
        [approvedRubric],
        priorAttempts,
      ],
      insertReturning: [newAttempt],
    });
    const result = await createRoleplayAttempt(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { scenarioId: "s1", audioStorageKey: "key", durationMs: 60 },
    );
    expect(result.attemptNumber).toBe(3);
  });

  it("createRoleplayAttempt retries the reviewed uniqueness collision in a fresh transaction", async () => {
    const roleplayLesson = approvedLesson("roleplay");
    const newAttempt = {
      id: "a2",
      scenarioId: "s1",
      userId: "u1",
      audioStorageKey: "key",
      durationMs: 60,
      attemptNumber: 2,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [
        [roleplayScenario],
        ...lessonAccessSequence(roleplayLesson),
        [approvedRubric],
      ],
      insertReturning: [newAttempt],
    });
    let transactionCalls = 0;
    db.transaction = vi.fn(async (complete) => {
      transactionCalls += 1;
      if (transactionCalls === 1) {
        throw {
          code: "23505",
          constraint: "sales_roleplay_attempts_user_scenario_number_unique",
        };
      }
      return complete(db);
    });

    const result = await createRoleplayAttempt(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { scenarioId: "s1", audioStorageKey: "key", durationMs: 60 },
    );

    expect(result.attemptNumber).toBe(2);
    expect(db.transaction).toHaveBeenCalledTimes(2);
  });

  it("submitRoleplayAttempt leaves no attempt row when evaluation fails", async () => {
    const roleplayLesson = approvedLesson("roleplay");
    const db = createMockDb({
      selectSequence: [
        [roleplayScenario],
        ...lessonAccessSequence(roleplayLesson),
        [approvedRubric],
      ],
    });

    await expect(
      submitRoleplayAttempt(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        {
          scenarioId: "s1",
          audioStorageKey: "key",
          durationMs: 60,
          audio: { buffer: Buffer.from("audio"), mimeType: "audio/webm" },
          consentGiven: true,
          retentionDays: 30,
          evaluate: vi.fn().mockRejectedValue(new Error("provider failed")),
        },
      ),
    ).rejects.toThrow("provider failed");

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("createRoleplayAttempt throws ScenarioNotFoundError", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      createRoleplayAttempt(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        { scenarioId: "s999", audioStorageKey: "k", durationMs: 0 },
      ),
    ).rejects.toThrow(/not found/);
  });

  it("saveAttemptEvaluation saves the evaluation and marks lesson complete on pass", async () => {
    const updated = {
      id: "a1",
      scenarioId: "s1",
      userId: "u1",
      audioStorageKey: "k",
      durationMs: 60,
      attemptNumber: 1,
      overallScore: "85",
      passed: true,
      llmFeedback: "good",
      transcriptExcerpt: "hi",
      llmScoreJson: {},
      createdAt: new Date(),
    };
    const roleplayLesson = approvedLesson("roleplay");
    const db = createMockDb({
      selectSequence: [
        [updated],
        [roleplayScenario],
        ...lessonAccessSequence(roleplayLesson),
        [approvedRubric],
      ],
      updateReturning: [updated],
      insertReturning: [{ id: "p1", status: "completed" }],
    });
    const result = await saveAttemptEvaluation(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      {
        attemptId: "a1",
        evaluation: {
          overallScore: 85,
          passed: true,
          criteria: [],
          summary: "good",
          strengths: [],
          weaknesses: [],
          suggestedNextAction: "next",
          transcriptExcerpt: "hi",
        },
        rubricId: "r1",
      },
    );
    expect(result.passed).toBe(true);
  });

  it("submitQuiz keeps progress in progress just below the 70% pass threshold", async () => {
    const questions = quizQuestions(100);
    const quizLesson = approvedLesson("quiz");
    const db = createMockDb({
      selectSequence: [...lessonAccessSequence(quizLesson), questions],
    });
    const result = await submitQuiz(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { lessonId: "l1", answers: answersWithCorrectCount(100, 69) },
    );
    expect(result.score).toBe(69);
    expect(result.passed).toBe(false);
    expect(result.results).toHaveLength(100);
    expect(result.results[0].correct).toBe(true);
    expect(result.results[99].correct).toBe(false);
    const values = db.insert.mock.results[0]?.value.values;
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "in_progress",
        score: "69",
        completedAt: null,
        updatedAt: expect.any(Date),
      }),
    );
  });

  it.each([
    { correctCount: 7, expectedScore: 70 },
    { correctCount: 8, expectedScore: 80 },
  ])(
    "submitQuiz completes progress at and above the threshold ($expectedScore%)",
    async ({ correctCount, expectedScore }) => {
      const questions = quizQuestions(10);
      const quizLesson = approvedLesson("quiz");
      const db = createMockDb({
        selectSequence: [...lessonAccessSequence(quizLesson), questions],
      });
      const result = await submitQuiz(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        { lessonId: "l1", answers: answersWithCorrectCount(10, correctCount) },
      );
      expect(result.score).toBe(expectedScore);
      expect(result.passed).toBe(true);
      const values = db.insert.mock.results[0]?.value.values;
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          score: String(expectedScore),
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    },
  );

  it("submitQuiz uses one atomic monotonic upsert for overlapping attempts", async () => {
    const questions = quizQuestions(10);
    const quizLesson = approvedLesson("quiz");
    const db = createMockDb({
      selectSequence: [...lessonAccessSequence(quizLesson), questions],
    });
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    db.insert = vi.fn().mockReturnValue({ values });

    const result = await submitQuiz(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { lessonId: "l1", answers: answersWithCorrectCount(10, 6) },
    );

    expect(result).toMatchObject({ score: 60, passed: false });
    expect(db.select).toHaveBeenCalledTimes(5);
    expect(db.update).not.toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: salesRep.id,
        lessonId: "l1",
        status: "in_progress",
        score: "60",
        completedAt: null,
        updatedAt: expect.any(Date),
      }),
    );
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);

    const config = onConflictDoUpdate.mock.calls[0]?.[0] as {
      target: unknown[];
      set: {
        status: SQL;
        score: SQL;
        completedAt: SQL;
        updatedAt: SQL;
      };
    };
    const dialect = new PgDialect();
    const render = (expression: SQL) =>
      dialect.sqlToQuery(expression).sql.replace(/\s+/g, " ").toLowerCase();
    const statusSql = render(config.set.status);
    const scoreSql = render(config.set.score);
    const completedAtSql = render(config.set.completedAt);
    const updatedAtSql = render(config.set.updatedAt);

    expect(config.target).toEqual([
      salesProgress.userId,
      salesProgress.lessonId,
    ]);
    expect(statusSql).toContain('"sales_progress"."status"');
    expect(statusSql).toContain("excluded.status");
    expect(statusSql).toContain("completed");
    expect(statusSql).toContain("in_progress");
    expect(scoreSql).toContain("greatest");
    expect(scoreSql).toContain('"sales_progress"."score"');
    expect(scoreSql).toContain("excluded.score");
    expect(completedAtSql).toContain("coalesce");
    expect(completedAtSql).toContain('"sales_progress"."completed_at"');
    expect(completedAtSql).toContain("excluded.completed_at");
    expect(updatedAtSql).toContain("excluded.updated_at");
  });

  it("submitQuiz rejects a locked lesson before grading or writing", async () => {
    const firstLesson = { ...approvedLesson("theory"), id: "l0", order: 1 };
    const quizLesson = { ...approvedLesson("quiz"), order: 2 };
    const db = createMockDb({
      selectSequence: [
        [quizLesson],
        [moduleRow],
        [firstLesson, quizLesson],
        [],
      ],
    });

    await expect(
      submitQuiz(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        { lessonId: "l1", answers: {} },
      ),
    ).rejects.toThrow(/prerequisite lesson 'l0'/);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("saveChatMessage creates a conversation when none provided", async () => {
    const conv = {
      id: "c1",
      userId: "u1",
      lessonId: null,
      moduleId: null,
      createdAt: new Date(),
    };
    const msg = {
      id: "m1",
      conversationId: "c1",
      role: "user",
      content: "hi",
      createdAt: new Date(),
    };
    const db = createMockDb({ selectResults: [], insertReturning: [conv] });
    // Override insert to return conv first, then msg
    let insertCall = 0;
    db.insert = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockImplementation(() => {
          insertCall += 1;
          return Promise.resolve(insertCall === 1 ? [conv] : [msg]);
        }),
      }),
    })) as unknown as typeof db.insert;
    const result = await saveChatMessage(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { role: "user", content: "hi" },
    );
    expect(result.conversationId).toBe("c1");
    expect(result.message.content).toBe("hi");
  });

  it("saveChatMessage denies a conversation not owned by the caller", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      saveChatMessage(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        {
          conversationId: "00000000-0000-4000-8000-000000000099",
          role: "user",
          content: "cross-user write",
        },
      ),
    ).rejects.toThrow("Conversation is unavailable");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("approveCurriculumContent flips a lesson to approved (admin only)", async () => {
    const updated = {
      id: "l1",
      moduleId: "m1",
      title: "L",
      type: "theory",
      content: "",
      order: 1,
      reviewStatus: "approved",
      createdAt: new Date(),
    };
    const db = createMockDb({ updateReturning: [updated] });
    await expect(
      approveCurriculumContent(
        { db: wrapDb(db), user: salesRep, tenant: globalTenant },
        { lessonId: "l1" },
      ),
    ).rejects.toThrow(/lacks permission/);
    const result = await approveCurriculumContent(
      { db: wrapDb(db), user: salesAdmin, tenant: globalTenant },
      { lessonId: "l1" },
    );
    expect(result.reviewStatus).toBe("approved");
  });

  it("approveCurriculumContent throws when neither lessonId nor rubricId given", async () => {
    const db = createMockDb();
    await expect(
      approveCurriculumContent(
        { db: wrapDb(db), user: salesAdmin, tenant: globalTenant },
        {},
      ),
    ).rejects.toThrow(/Either lessonId or rubricId is required/);
  });
});
