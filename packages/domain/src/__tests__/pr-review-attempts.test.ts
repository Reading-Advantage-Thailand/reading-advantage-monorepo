import { describe, expect, it } from "vitest";
import { codecampAPKUnit } from "@reading-advantage/codecamp-knowledge";
import type { DB } from "@reading-advantage/db";
import { createInMemoryMasteryPersistence } from "../mastery/in-memory-mastery-persistence.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import {
  buildAdvisoryAPKObjectiveEvidence,
  buildAdvisoryPrObjectiveEvidence,
  listPriorPrReviewAttempts,
  projectVerifiedPrObjectiveToMastery,
  resolveGraphBoundPrObjectives,
} from "../codecamp/pr-review-attempts.js";

const systemUser = { id: "system", username: "system", name: "System", role: "SYSTEM" as const, schoolId: null, xp: 0, level: 1, cefrLevel: "A1" as const };
const globalTenant = { schoolId: null };

describe("buildAdvisoryAPKObjectiveEvidence", () => {
  it("maps a validated APK rubric to graph-bound advisory-only evidence", () => {
    const rows = buildAdvisoryAPKObjectiveEvidence({
      passed: true,
      summary: "Looks good.",
      comments: [],
      objectiveEvidence: [{ objectiveId: codecampAPKUnit.youdo.objectiveId, score: 86, confidence: 72, misconceptionTags: ["apk-contract"], references: [{ filePath: "src/cartridge.ts", startLine: 1, endLine: 3, testName: null }] }],
      apkEvaluation: {
        rubricId: "apk.rubric.independent-cartridge",
        dimensions: ["objective", "contract", "tests", "accessibility"].map((dimensionId) => ({ dimensionId, score: 1, evidence: "reviewed" })),
        requiredChecks: ["manifest ABI", "deterministic educational logic", "keyboard-equivalent input", "unit tests", "browser smoke test"].map((check) => ({ check, passed: true, evidence: "reviewed" })),
        totalScore: 0.86,
      },
    }, { reviewJobId: "job-1" });

    expect(rows).toEqual([expect.objectContaining({
      objectiveId: codecampAPKUnit.youdo.objectiveId,
      variantKey: codecampAPKUnit.youdo.variantKey,
      score: 86,
      confidence: 72,
      misconceptionTags: ["apk-contract"],
      supportHistory: { source: "advisory-model", supportEvents: [] },
    })]);
  });

  it("does not invent objective evidence for an unbound review", () => {
    expect(buildAdvisoryAPKObjectiveEvidence({ passed: false, summary: "Needs work.", comments: [] }, {})).toEqual([]);
  });

  it("derives generic advisory rows only from the repository's graph binding", () => {
    const [binding] = resolveGraphBoundPrObjectives("git-github");
    expect(buildAdvisoryPrObjectiveEvidence({
      passed: false,
      summary: "Use a topic branch.",
      comments: [],
      objectiveEvidence: [{ objectiveId: binding!.objectiveId, score: 55, confidence: 70, misconceptionTags: ["branch-workflow-confusion"], references: [{ filePath: "README.md", startLine: 1, endLine: 2, testName: null }] }],
    }, "git-github", { reviewJobId: "job-1" })).toEqual([expect.objectContaining({
      objectiveId: binding!.objectiveId,
      variantKey: binding!.variantKey,
      score: 55,
      confidence: 70,
    })]);
  });

  it("resolves only assessed graph-bound repository objectives", () => {
    expect(resolveGraphBoundPrObjectives("git-github")).toEqual([expect.objectContaining({
      activityId: "codecamp.git-github.repository",
      objectiveId: "codecamp.workflow.skill.git-branches",
      variantKey: "git-github-repository",
      evidenceWeight: 0.75,
    })]);
    expect(resolveGraphBoundPrObjectives("apk-game-creation")).toEqual([expect.objectContaining({
      activityId: codecampAPKUnit.youdo.activityId,
      objectiveId: codecampAPKUnit.youdo.objectiveId,
      variantKey: codecampAPKUnit.youdo.variantKey,
      rubricRefs: [codecampAPKUnit.youdo.rubric.rubricId],
    })]);
    expect(resolveGraphBoundPrObjectives("not-a-module")).toEqual([]);
  });

  it("projects evaluator-attested PR evidence idempotently without manufacturing extra variants", async () => {
    const [binding] = resolveGraphBoundPrObjectives("git-github");
    expect(binding).toBeDefined();
    const persistence = createInMemoryMasteryPersistence();
    const input = {
      objectiveId: binding!.objectiveId,
      score: 91,
      confidence: 88,
      passed: true,
      headSha: "a".repeat(40),
      submissionId: "pr-review:git:42",
      attemptNumber: 1,
      submittedAt: "2026-07-12T00:00:00.000Z",
      evidenceReferences: { ciRun: "https://github.com/example/repo/actions/runs/42" },
      supportHistory: { supportEvents: [] },
    };
    await expect(projectVerifiedPrObjectiveToMastery("11111111-1111-4111-8111-111111111111", "student-1", binding!, input, persistence)).resolves.toMatchObject({ status: "applied" });
    await expect(projectVerifiedPrObjectiveToMastery("11111111-1111-4111-8111-111111111111", "student-1", binding!, input, persistence)).resolves.toMatchObject({ status: "replayed" });
    const snapshot = await persistence.readSnapshot({ schoolId: "11111111-1111-4111-8111-111111111111" });
    expect(snapshot.evidence).toHaveLength(1);
    expect(snapshot.evidence[0]).toMatchObject({
      objectiveId: binding!.objectiveId,
      variantKey: binding!.variantKey,
      practiceCoverage: binding!.evidenceWeight,
      confidence: 0.88,
    });
    expect(new Set(snapshot.evidence.map(({ variantKey }) => variantKey))).toEqual(new Set([binding!.variantKey]));
  });

  it("refuses advisory or failed PR output before it can mutate mastery", async () => {
    const [binding] = resolveGraphBoundPrObjectives("git-github");
    const persistence = createInMemoryMasteryPersistence();
    await expect(projectVerifiedPrObjectiveToMastery("11111111-1111-4111-8111-111111111111", "student-1", binding!, {
      objectiveId: binding!.objectiveId, score: 79, confidence: 100, passed: true,
      headSha: "b".repeat(40), submissionId: "pr-review:git:43", attemptNumber: 1,
      submittedAt: "2026-07-12T00:00:00.000Z", evidenceReferences: {}, supportHistory: {},
    }, persistence)).rejects.toThrow("Only passing deterministic PR evidence");
    expect((await persistence.readSnapshot({ schoolId: "11111111-1111-4111-8111-111111111111" })).evidence).toHaveLength(0);
  });

  it("rejects a graph-objective mismatch before touching durable trusted evidence", async () => {
    const [binding] = resolveGraphBoundPrObjectives("git-github");
    const persistence = createInMemoryMasteryPersistence();
    await expect(projectVerifiedPrObjectiveToMastery("11111111-1111-4111-8111-111111111111", "student-1", binding!, {
      objectiveId: "codecamp.foundation.skill.functions", score: 100, confidence: 100, passed: true,
      headSha: "c".repeat(40), submissionId: "pr-review:git:44", attemptNumber: 1,
      submittedAt: "2026-07-12T00:00:00.000Z", evidenceReferences: {}, supportHistory: {},
    }, persistence)).rejects.toThrow("not authorized by the repository binding");
  });
});

describe("listPriorPrReviewAttempts", () => {
  it("returns only bounded, tenant-scoped summaries that exclude the current revision", async () => {
    const priorAttempt = {
      id: "11111111-1111-4111-8111-111111111111",
      headSha: "a".repeat(40),
      attemptStatus: "advisory",
      evidenceAuthority: "advisory_model",
    };
    const objective = {
      attemptId: priorAttempt.id,
      objectiveId: "codecamp.workflow.skill.git-branches",
      variantKey: "git-github-repository",
      score: 62,
      confidence: 71,
      evidenceState: "advisory",
    };
    const db = createMockDb({ selectSequence: [[priorAttempt], [objective]] });

    await expect(listPriorPrReviewAttempts({
      db: createTenantDB(db as unknown as DB, globalTenant),
      user: systemUser,
      tenant: globalTenant,
      input: { reviewId: "22222222-2222-4222-8222-222222222222", excludeHeadSha: "b".repeat(40) },
    })).resolves.toEqual([{
      headSha: "a".repeat(40),
      attemptStatus: "advisory",
      evidenceAuthority: "advisory_model",
      objectives: [{ objectiveId: objective.objectiveId, variantKey: objective.variantKey, score: 62, confidence: 71, evidenceState: "advisory" }],
    }]);
  });
});
