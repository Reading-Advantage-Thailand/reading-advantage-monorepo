import { describe, expect, it, vi } from "vitest";
import { createActivityRouter } from "../routers/activity.js";

const summary = {
  sessionId: "session-1",
  activityId: "activity-1",
  completed: false,
  playback: "idle" as const,
  positionSeconds: 0,
  watchedRanges: [],
  checkpointAttempts: {},
  assessedCheckpointResults: {},
  assessedTutorialResults: {},
  completedStepIds: [],
  openedResourceIds: [],
  unresolvedCheckpointIds: [],
  support: { hintsUsed: 0, revealsUsed: 0, interventionLevel: 0 },
};

describe("activity tRPC adapter", () => {
  it("derives learner and tenant identity from authenticated context", async () => {
    const start = vi.fn().mockResolvedValue(summary);
    const activityRouter = createActivityRouter(() => ({ start, append: vi.fn(), get: vi.fn(), assessCheckpoint: vi.fn(), assessTutorial: vi.fn(), prepareTutorial: vi.fn(), reissueTutorialCredential: vi.fn(), reportTutorial: vi.fn(), getTeacherSummary: vi.fn(), getCodecampTeacherSummary: vi.fn() }));
    const caller = activityRouter.createCaller({
      auth: { user: { id: "learner-1" }, tenant: { schoolId: "school-1" } },
      db: {} as never,
      tenantDb: {} as never,
    } as never);
    await caller.start({ activityId: "activity-1", activityVersion: "1.0.0" });
    expect(start).toHaveBeenCalledWith(
      { learnerId: "learner-1", schoolId: "school-1" },
      { activityId: "activity-1", activityVersion: "1.0.0" },
    );
  });

  it("uses the server-owned Codecamp tenant and rejects caller identity fields", async () => {
    const start = vi.fn().mockResolvedValue(summary);
    const activityRouter = createActivityRouter(() => ({ start, append: vi.fn(), get: vi.fn(), assessCheckpoint: vi.fn(), assessTutorial: vi.fn(), prepareTutorial: vi.fn(), reissueTutorialCredential: vi.fn(), reportTutorial: vi.fn(), getTeacherSummary: vi.fn(), getCodecampTeacherSummary: vi.fn() }));
    const caller = activityRouter.createCaller({
      auth: { user: { id: "learner-1" }, tenant: { schoolId: null } },
      db: {} as never,
      tenantDb: {} as never,
    } as never);
    await caller.start({ activityId: "activity-1", activityVersion: "1.0.0" });
    expect(start).toHaveBeenCalledWith(
      { learnerId: "learner-1", schoolId: null, tenantKey: "codecamp" },
      expect.any(Object),
    );
    await expect(caller.start({ activityId: "activity-1", activityVersion: "1.0.0", learnerId: "attacker" } as never)).rejects.toThrow();
  });

  it("exposes teacher summaries only to school-scoped educators", async () => {
    const getTeacherSummary = vi.fn().mockResolvedValue(summary);
    const activityRouter = createActivityRouter(() => ({ start: vi.fn(), append: vi.fn(), get: vi.fn(), assessCheckpoint: vi.fn(), assessTutorial: vi.fn(), prepareTutorial: vi.fn(), reissueTutorialCredential: vi.fn(), reportTutorial: vi.fn(), getTeacherSummary, getCodecampTeacherSummary: vi.fn() }));
    const context = (role: string) => ({ auth: { user: { id: "teacher-1", role }, tenant: { schoolId: "school-1" } }, db: {}, tenantDb: {} } as never);
    const teacher = activityRouter.createCaller(context("TEACHER"));
    await expect(teacher.teacherGet({ learnerId: "learner-1", sessionId: "00000000-0000-4000-8000-000000000001" })).resolves.toEqual(summary);
    expect(getTeacherSummary).toHaveBeenCalledWith("school-1", "learner-1", "00000000-0000-4000-8000-000000000001");
    const student = activityRouter.createCaller(context("STUDENT"));
    await expect(student.teacherGet({ learnerId: "learner-1", sessionId: "00000000-0000-4000-8000-000000000001" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exposes Codecamp learner evidence to platform administrators", async () => {
    const getCodecampTeacherSummary = vi.fn().mockResolvedValue(summary);
    const activityRouter = createActivityRouter(() => ({ start: vi.fn(), append: vi.fn(), get: vi.fn(), assessCheckpoint: vi.fn(), assessTutorial: vi.fn(), prepareTutorial: vi.fn(), reissueTutorialCredential: vi.fn(), reportTutorial: vi.fn(), getTeacherSummary: vi.fn(), getCodecampTeacherSummary }));
    const caller = activityRouter.createCaller({ auth: { user: { id: "admin-1", role: "ADMIN" }, tenant: { schoolId: null } }, db: {}, tenantDb: {} } as never);
    await expect(caller.teacherGet({ learnerId: "learner-1", sessionId: "00000000-0000-4000-8000-000000000001" })).resolves.toEqual(summary);
    expect(getCodecampTeacherSummary).toHaveBeenCalledWith("learner-1", "00000000-0000-4000-8000-000000000001");
  });

  it("derives tutorial report ownership from the authenticated context", async () => {
    const reportTutorial = vi.fn().mockResolvedValue({ verified: { submissionId: "submission-1", sessionId: "session-1", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "graph-1", repositoryId: "repo-1", learnerId: "learner-1", tenantKey: "codecamp", stepId: "step-1", passed: true, checks: [], verifiedAt: "2026-07-10T00:01:00Z" }, session: summary });
    const activityRouter = createActivityRouter(() => ({ start: vi.fn(), append: vi.fn(), get: vi.fn(), assessCheckpoint: vi.fn(), assessTutorial: vi.fn(), prepareTutorial: vi.fn(), reissueTutorialCredential: vi.fn(), reportTutorial, getTeacherSummary: vi.fn(), getCodecampTeacherSummary: vi.fn() }));
    const caller = activityRouter.createCaller({ auth: { user: { id: "learner-1" }, tenant: { schoolId: null } }, db: {}, tenantDb: {} } as never);
    const localResult = { schemaVersion: "activity-tutorial-result.v1" as const, repositoryId: "repo-1", activityId: "activity-1", stepId: "step-1", passed: true, checkedAt: "2026-07-10T00:00:00Z", evidenceDigest: `sha256:${"a".repeat(64)}`, checks: [] };
    await caller.reportTutorial({ submissionId: "submission-1", credential: "credential", repositoryStateId: "snapshot-1", localResult });
    expect(reportTutorial).toHaveBeenCalledWith({ learnerId: "learner-1", schoolId: null, tenantKey: "codecamp" }, expect.objectContaining({ submissionId: "submission-1" }));
  });

  it("derives repository-capture ownership before issuing a tutorial credential", async () => {
    const prepared = { submissionId: "submission-1", repositoryStateId: "snapshot-1", repositoryCapturedAt: "2026-07-10T00:00:00Z", credential: "credential", expiresAt: "2026-07-10T00:10:00Z" };
    const prepareTutorial = vi.fn().mockResolvedValue(prepared);
    const activityRouter = createActivityRouter(() => ({ start: vi.fn(), append: vi.fn(), get: vi.fn(), assessCheckpoint: vi.fn(), assessTutorial: vi.fn(), prepareTutorial, reissueTutorialCredential: vi.fn(), reportTutorial: vi.fn(), getTeacherSummary: vi.fn(), getCodecampTeacherSummary: vi.fn() }));
    const caller = activityRouter.createCaller({ auth: { user: { id: "learner-1" }, tenant: { schoolId: null } }, db: {}, tenantDb: {} } as never);
    await expect(caller.prepareTutorial({ sessionId: "00000000-0000-4000-8000-000000000001", submissionId: "submission-1", repositoryId: "repo.apk.guided", stepId: "wedo.apk.manifest" })).resolves.toEqual(prepared);
    expect(prepareTutorial).toHaveBeenCalledWith({ learnerId: "learner-1", schoolId: null, tenantKey: "codecamp" }, expect.objectContaining({ repositoryId: "repo.apk.guided" }));
  });

  it("reissues an expired credential against the same authenticated snapshot", async () => {
    const prepared = { submissionId: "submission-1", repositoryStateId: "snapshot-1", repositoryCapturedAt: "2026-07-10T00:00:00Z", credential: "refreshed", expiresAt: "2026-07-10T00:10:00Z" };
    const reissueTutorialCredential = vi.fn().mockResolvedValue(prepared);
    const activityRouter = createActivityRouter(() => ({ start: vi.fn(), append: vi.fn(), get: vi.fn(), assessCheckpoint: vi.fn(), assessTutorial: vi.fn(), prepareTutorial: vi.fn(), reissueTutorialCredential, reportTutorial: vi.fn(), getTeacherSummary: vi.fn(), getCodecampTeacherSummary: vi.fn() }));
    const caller = activityRouter.createCaller({ auth: { user: { id: "learner-1" }, tenant: { schoolId: null } }, db: {}, tenantDb: {} } as never);
    await expect(caller.reissueTutorialCredential({ sessionId: "00000000-0000-4000-8000-000000000001", submissionId: "submission-1", repositoryStateId: "snapshot-1", stepId: "wedo.apk.manifest" })).resolves.toEqual(prepared);
    expect(reissueTutorialCredential).toHaveBeenCalledWith({ learnerId: "learner-1", schoolId: null, tenantKey: "codecamp" }, expect.objectContaining({ repositoryStateId: "snapshot-1" }));
  });
});
