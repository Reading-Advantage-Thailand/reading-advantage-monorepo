import { describe, expect, it, vi } from "vitest";
import { createActivityRouter } from "../routers/activity.js";

const summary = {
  sessionId: "session-1",
  activityId: "activity-1",
  completed: false,
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
    const activityRouter = createActivityRouter({ start, append: vi.fn(), get: vi.fn() });
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
    const activityRouter = createActivityRouter({ start, append: vi.fn(), get: vi.fn() });
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
});
