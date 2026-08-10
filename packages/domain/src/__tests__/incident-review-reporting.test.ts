import { describe, expect, it, vi } from "vitest";
import { createMockDb } from "./mock-db.js";

const tables = vi.hoisted(() => ({
  users: { id: "id", role: "role", createdAt: "createdAt" },
  accounts: {},
  codecampModules: { id: "id", slug: "slug", status: "status", order: "order" },
  codecampLessons: { id: "id", moduleId: "moduleId" },
  codecampCurriculumAssignments: { userId: "userId", curriculumVersion: "curriculumVersion" },
  codecampUserProgress: { userId: "userId", moduleId: "moduleId" },
  codecampExerciseRepos: { moduleId: "moduleId" },
  codecampPrReviews: { id: "id", userId: "userId", createdAt: "createdAt" },
  codecampTutorEvidenceJoins: { interventionId: "interventionId" },
  codecampTutorInterventions: {
    id: "id",
    interventionLevel: "interventionLevel",
    misconceptionTagsJson: "misconceptionTagsJson",
    createdAt: "createdAt",
    userId: "userId",
    tenantKey: "tenantKey",
  },
  codecampTutorResourceUses: { interventionId: "interventionId" },
  auditEvents: { id: "id", actorUserId: "actorUserId", actorRole: "actorRole", targetId: "targetId", metadata: "metadata", createdAt: "createdAt", action: "action", targetType: "targetType" },
  codecampPrReviewAttempts: { id: "id", reviewId: "reviewId", headSha: "headSha", attemptStatus: "attemptStatus", evidenceAuthority: "evidenceAuthority", modelAlias: "modelAlias", resolvedModel: "resolvedModel", createdAt: "createdAt", userId: "userId", tenantKey: "tenantKey" },
  codecampPrReviewObjectiveEvidence: { attemptId: "attemptId", objectiveId: "objectiveId", variantKey: "variantKey", score: "score", confidence: "confidence", evidenceState: "evidenceState" },
  reviewJobs: { reviewId: "reviewId", status: "status", attempts: "attempts" },
}));

vi.mock("@reading-advantage/db/schema", () => tables);
vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  hashPassword: vi.fn(),
}));
vi.mock("@reading-advantage/codecamp-knowledge", () => ({
  apkLearningBlueprint: { reviews: {} },
}));

import { getInternProgress, listInterns } from "../codecamp/intern-accounts.js";

/** Wraps the raw query mock in the only tenant operation used by these reports. */
function reportDb(selectSequence: unknown[][]) {
  const db = createMockDb({ selectSequence });
  return Object.assign(db, {
    unscoped: vi.fn(() => db),
  });
}

const admin = {
  id: "admin-1",
  username: "admin",
  name: "Admin",
  role: "ADMIN" as const,
  schoolId: "school-1",
};

const tenant = { schoolId: null };

describe("incident repair — PR review reporting", () => {
  it("counts editorial pending separately from processing, retrying, and failed jobs", async () => {
    const createdAt = new Date("2026-08-10T08:00:00Z");
    const reviews = [
      { id: "pr-editorial", exerciseRepoId: "repo-1", userId: "intern-1", prUrl: "https://github.com/org/repo/pull/1", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt },
      { id: "pr-processing", exerciseRepoId: "repo-1", userId: "intern-1", prUrl: "https://github.com/org/repo/pull/2", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date("2026-08-10T08:01:00Z") },
      { id: "pr-retrying", exerciseRepoId: "repo-1", userId: "intern-1", prUrl: "https://github.com/org/repo/pull/3", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date("2026-08-10T08:02:00Z") },
      { id: "pr-failed", exerciseRepoId: "repo-1", userId: "intern-1", prUrl: "https://github.com/org/repo/pull/4", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date("2026-08-10T08:03:00Z") },
    ];
    const db = reportDb([
      [{ id: "intern-1", username: "intern", name: "Intern", role: "INTERN", createdAt }],
      [{ id: "module-1", slug: "module-1", status: "published", order: 1 }],
      [], [], [], [{ id: "repo-1", moduleId: "module-1" }], reviews,
      [
        { reviewId: "pr-processing", status: "claimed", attempts: 1 },
        { reviewId: "pr-retrying", status: "pending", attempts: 2 },
        { reviewId: "pr-failed", status: "dead", attempts: 1 },
      ],
    ]);

    const [report] = await listInterns({ db: db as never, user: admin, tenant });

    expect(report).toMatchObject({
      prReviewsPending: 1,
      prReviewsProcessing: 1,
      prReviewsRetrying: 1,
      prReviewsFailed: 1,
      latestPrReview: {
        reviewStatus: "pending",
        operationalStatus: "failed",
      },
    });
  });

  it("preserves editorial pending while exposing failed operational status per review and module", async () => {
    const createdAt = new Date("2026-08-10T08:00:00Z");
    const review = {
      id: "pr-failed",
      exerciseRepoId: "repo-1",
      userId: "intern-1",
      prUrl: "https://github.com/org/repo/pull/1",
      reviewStatus: "pending",
      llmReviewSummary: null,
      reviewedAt: null,
      createdAt,
    };
    const db = reportDb([
      [{ id: "intern-1", username: "intern", name: "Intern", role: "INTERN", githubUsername: null, createdAt }],
      [{ id: "module-1", title: "Module 1", slug: "module-1", status: "published", order: 1 }],
      [], [], [], [{ id: "repo-1", moduleId: "module-1" }], [review],
      [], [], [{ reviewId: "pr-failed", status: "dead", attempts: 1 }],
    ]);

    const report = await getInternProgress({
      db: db as never,
      user: admin,
      tenant,
      input: { userId: "intern-1" },
    });

    expect(report.moduleBreakdown).toEqual([
      expect.objectContaining({
        latestPrReviewStatus: "pending",
        latestPrReviewOperationalStatus: "failed",
      }),
    ]);
    expect(report.prReviews).toEqual([
      expect.objectContaining({
        reviewStatus: "pending",
        operationalStatus: "failed",
      }),
    ]);
  });
});
