import { describe, it, expect, vi } from "vitest";
import {
  markTheoryLessonComplete,
  createRoleplayAttempt,
  saveAttemptEvaluation,
  submitQuiz,
  saveChatMessage,
  createRepAccount,
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

describe("sales mutations", () => {
  it("markTheoryLessonComplete upserts progress to completed", async () => {
    const db = createMockDb({ selectResults: [], insertReturning: [{ id: "p1", userId: "u1", lessonId: "l1", status: "completed", completedAt: new Date(), score: null, createdAt: new Date() }] });
    const result = await markTheoryLessonComplete({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { lessonId: "l1" });
    expect(result.status).toBe("completed");
  });

  it("createRoleplayAttempt computes attemptNumber from prior attempts", async () => {
    const scenario = { id: "s1", lessonId: "l1", personaName: "D", personaRole: "Dir", situation: "s", objective: "o", prospectContextJson: {}, rubricId: "r1", order: 1, createdAt: new Date() };
    const priorAttempts = [{ id: "a1" }, { id: "a2" }];
    const newAttempt = { id: "a3", scenarioId: "s1", userId: "u1", audioStorageKey: "key", durationMs: 60, attemptNumber: 3, transcriptExcerpt: null, llmScoreJson: null, overallScore: null, passed: null, llmFeedback: null, createdAt: new Date() };
    const db = createMockDb({ selectSequence: [[scenario], priorAttempts], insertReturning: [newAttempt] });
    const result = await createRoleplayAttempt(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { scenarioId: "s1", audioStorageKey: "key", durationMs: 60 },
    );
    expect(result.attemptNumber).toBe(3);
  });

  it("createRoleplayAttempt throws ScenarioNotFoundError", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(
      createRoleplayAttempt({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { scenarioId: "s999", audioStorageKey: "k", durationMs: 0 }),
    ).rejects.toThrow(/not found/);
  });

  it("saveAttemptEvaluation saves the evaluation and marks lesson complete on pass", async () => {
    const updated = { id: "a1", scenarioId: "s1", userId: "u1", audioStorageKey: "k", durationMs: 60, attemptNumber: 1, overallScore: "85", passed: true, llmFeedback: "good", transcriptExcerpt: "hi", llmScoreJson: {}, createdAt: new Date() };
    const db = createMockDb({ selectSequence: [[updated], [updated], [{ id: "s1", lessonId: "l1" }]], updateReturning: [updated], insertReturning: [{ id: "p1", status: "completed" }] });
    const result = await saveAttemptEvaluation(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      {
        attemptId: "a1",
        evaluation: { overallScore: 85, passed: true, criteria: [], summary: "good", strengths: [], weaknesses: [], suggestedNextAction: "next", transcriptExcerpt: "hi" },
        rubricId: "r1",
      },
    );
    expect(result.passed).toBe(true);
  });

  it("submitQuiz grades answers with 70% pass threshold", async () => {
    const questions = [
      { id: "q1", lessonId: "l1", question: "Q1", optionsJson: ["a", "b"], correctAnswer: "a", explanation: "ex", order: 1, createdAt: new Date() },
      { id: "q2", lessonId: "l1", question: "Q2", optionsJson: ["c", "d"], correctAnswer: "c", explanation: "ex", order: 2, createdAt: new Date() },
    ];
    const db = createMockDb({ selectSequence: [questions, []], insertReturning: [{ id: "p1", status: "completed" }] });
    const result = await submitQuiz(
      { db: wrapDb(db), user: salesRep, tenant: globalTenant },
      { lessonId: "l1", answers: { q1: "a", q2: "d" } },
    );
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].correct).toBe(true);
    expect(result.results[1].correct).toBe(false);
  });

  it("submitQuiz passes at 100%", async () => {
    const questions = [{ id: "q1", lessonId: "l1", question: "Q1", optionsJson: ["a", "b"], correctAnswer: "a", explanation: "ex", order: 1, createdAt: new Date() }];
    const db = createMockDb({ selectSequence: [questions, []], insertReturning: [{ id: "p1", status: "completed" }] });
    const result = await submitQuiz({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { lessonId: "l1", answers: { q1: "a" } });
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("saveChatMessage creates a conversation when none provided", async () => {
    const conv = { id: "c1", userId: "u1", lessonId: null, moduleId: null, createdAt: new Date() };
    const msg = { id: "m1", conversationId: "c1", role: "user", content: "hi", createdAt: new Date() };
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

  it("createRepAccount requires SALES_ADMIN", async () => {
    const db = createMockDb();
    await expect(
      createRepAccount({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { username: "r2", password: "password1", displayName: "R2" }),
    ).rejects.toThrow(/lacks permission/);
    const result = await createRepAccount({ db: wrapDb(db), user: salesAdmin, tenant: globalTenant }, { username: "r2", password: "password1", displayName: "R2" });
    expect(result.username).toBe("r2");
  });

  it("approveCurriculumContent flips a lesson to approved (admin only)", async () => {
    const updated = { id: "l1", moduleId: "m1", title: "L", type: "theory", content: "", order: 1, reviewStatus: "approved", createdAt: new Date() };
    const db = createMockDb({ updateReturning: [updated] });
    await expect(
      approveCurriculumContent({ db: wrapDb(db), user: salesRep, tenant: globalTenant }, { lessonId: "l1" }),
    ).rejects.toThrow(/lacks permission/);
    const result = await approveCurriculumContent({ db: wrapDb(db), user: salesAdmin, tenant: globalTenant }, { lessonId: "l1" });
    expect(result.reviewStatus).toBe("approved");
  });

  it("approveCurriculumContent throws when neither lessonId nor rubricId given", async () => {
    const db = createMockDb();
    await expect(
      approveCurriculumContent({ db: wrapDb(db), user: salesAdmin, tenant: globalTenant }, {}),
    ).rejects.toThrow(/Either lessonId or rubricId is required/);
  });
});
