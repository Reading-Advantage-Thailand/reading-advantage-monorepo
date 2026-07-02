// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  saveAttemptEvaluation,
  getCohortOverview,
} from "../sales/index.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const salesRepA = {
  id: "rep-a",
  username: "repa",
  name: "Rep A",
  role: "SALES_REP" as const,
  schoolId: "school-a",
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const salesAdminA = {
  ...salesRepA,
  id: "admin-a",
  username: "admina",
  name: "Admin A",
  role: "SALES_ADMIN" as const,
};

const salesAdminB = {
  ...salesRepA,
  id: "admin-b",
  username: "adminb",
  name: "Admin B",
  schoolId: "school-b",
  role: "SALES_ADMIN" as const,
};

const tenantA = { schoolId: "school-a" };
const tenantB = { schoolId: "school-b" };

function wrapDb(db: ReturnType<typeof createMockDb>, tenant = tenantA) {
  return createTenantDB(db as unknown as DB, tenant);
}

const ownerRecordRepA = {
  id: "rep-a",
  username: "repa",
  name: "Rep A",
  role: "SALES_REP",
  schoolId: "school-a",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

const baseEvaluation = {
  overallScore: 75,
  passed: false,
  criteria: [],
  summary: "ok",
  strengths: [],
  weaknesses: [],
  suggestedNextAction: "practice",
  transcriptExcerpt: "hello",
};

describe("Sales authorization / IDOR hardening", () => {
  it("saveAttemptEvaluation rejects updating an attempt owned by another user", async () => {
    const otherAttempt = {
      id: "attempt-other",
      scenarioId: "scenario-1",
      userId: "rep-b",
      audioStorageKey: null,
      durationMs: 5000,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      attemptNumber: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectResults: [otherAttempt],
      updateReturning: [otherAttempt],
    });

    let threw = false;
    try {
      await saveAttemptEvaluation(
        { db: wrapDb(db), user: salesRepA, tenant: tenantA },
        {
          attemptId: "attempt-other",
          evaluation: baseEvaluation,
          rubricId: "rubric-1",
        },
      );
    } catch {
      threw = true;
    }

    expect(
      threw,
      "saveAttemptEvaluation must reject IDOR when attempt row exists and userId differs",
    ).toBe(true);
    expect(
      (db.update as ReturnType<typeof vi.fn>).mock.calls.length,
      "update call count must be 0 when ownership check fails before write",
    ).toBe(0);
  });

  it("saveAttemptEvaluation allows same-tenant SALES_ADMIN to update a rep's attempt", async () => {
    const repAttempt = {
      id: "attempt-rep-a",
      scenarioId: "scenario-1",
      userId: "rep-a",
      audioStorageKey: null,
      durationMs: 5000,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      attemptNumber: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[repAttempt], [ownerRecordRepA]],
      updateReturning: [repAttempt],
    });

    const result = await saveAttemptEvaluation(
      { db: wrapDb(db), user: salesAdminA, tenant: tenantA },
      {
        attemptId: "attempt-rep-a",
        evaluation: baseEvaluation,
        rubricId: "rubric-1",
      },
    );

    expect(result.id, "same-tenant admin update must succeed").toBe("attempt-rep-a");
    expect(
      (db.update as ReturnType<typeof vi.fn>).mock.calls.length,
      "update call count must be 1 for authorized admin update",
    ).toBe(1);
  });

  it("saveAttemptEvaluation rejects cross-tenant SALES_ADMIN update", async () => {
    const repAttempt = {
      id: "attempt-rep-a",
      scenarioId: "scenario-1",
      userId: "rep-a",
      audioStorageKey: null,
      durationMs: 5000,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      attemptNumber: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[repAttempt], []],
      updateReturning: [repAttempt],
    });

    let threw = false;
    try {
      await saveAttemptEvaluation(
        { db: wrapDb(db, tenantB), user: salesAdminB, tenant: tenantB },
        {
          attemptId: "attempt-rep-a",
          evaluation: baseEvaluation,
          rubricId: "rubric-1",
        },
      );
    } catch {
      threw = true;
    }

    expect(
      threw,
      "cross-tenant admin must not be allowed to mutate another tenant's attempt",
    ).toBe(true);
    expect(
      (db.update as ReturnType<typeof vi.fn>).mock.calls.length,
      "update call count must be 0 for cross-tenant admin rejection",
    ).toBe(0);
  });

  it("getCohortOverview does not return cross-tenant rep progress rows", async () => {
    const cohortRows = [
      {
        id: "progress-a",
        userId: "rep-a",
        lessonId: "lesson-1",
        status: "completed",
        completedAt: new Date(),
        score: "90",
        createdAt: new Date(),
      },
      {
        id: "progress-b",
        userId: "rep-b",
        lessonId: "lesson-1",
        status: "completed",
        completedAt: new Date(),
        score: "80",
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({ selectResults: cohortRows });

    const result = await getCohortOverview({
      db: wrapDb(db),
      user: salesAdminA,
      tenant: tenantA,
    });

    const crossTenantRowCount = result.filter((r) => r.userId !== "rep-a").length;
    expect(
      crossTenantRowCount,
      `cross-tenant row count: ${crossTenantRowCount} (expected 0)`,
    ).toBe(0);
  });
});
