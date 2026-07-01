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

const tenantA = { schoolId: "school-a" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, tenantA);
}

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
    const db = createMockDb({ updateReturning: [otherAttempt] });

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
      "saveAttemptEvaluation must reject IDOR: attempt userId is rep-b but caller is rep-a",
    ).toBe(true);
    expect(
      (db.update as ReturnType<typeof vi.fn>).mock.calls.length,
      "update call count must be 0 when ownership check fails before write",
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
