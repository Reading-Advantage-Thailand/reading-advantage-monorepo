import { randomUUID } from "node:crypto";
import { createActivityTransportHandlers, type ActivityTransportHandlers } from "@reading-advantage/activity-runtime/transport";
import type { ActivitySessionSummary } from "@reading-advantage/activity-runtime";
import { createCodecampAPKActivity } from "@reading-advantage/codecamp-knowledge";
import type { TenantDB } from "../db-contract.js";
import { DrizzleActivityPersistence } from "./drizzle-activity-persistence.js";

const codecampPilotActivity = createCodecampAPKActivity("en");

/** Activity handlers plus the separately authorized teacher summary boundary. */
export type CodecampActivityHandlers = ActivityTransportHandlers & {
  getTeacherSummary(schoolId: string, learnerId: string, sessionId: string): Promise<ActivitySessionSummary | null>;
};

/**
 * Composes the Codecamp pilot repository, Drizzle persistence, and transport handlers.
 * @param tenantDb Authenticated tenant database from the request context.
 * @returns Request-scoped learner and teacher activity handlers.
 */
export function createCodecampActivityHandlers(tenantDb: TenantDB): CodecampActivityHandlers {
  const persistence = new DrizzleActivityPersistence(tenantDb);
  const handlers = createActivityTransportHandlers({
    activities: { async getActivity(activityId, activityVersion) { return activityId === codecampPilotActivity.activityId && activityVersion === codecampPilotActivity.activityVersion ? codecampPilotActivity : null; } },
    persistence, createSessionId: randomUUID, now: () => new Date().toISOString(),
    executeTutorialCheck: () => { throw new Error("Tutorial checks require the server repository verifier"); },
  });
  return {
    ...handlers,
    getTeacherSummary: (schoolId, learnerId, sessionId) => persistence.getTeacherSummary(
      schoolId, learnerId, sessionId, codecampPilotActivity.checkpoints.map(({ checkpointId }) => checkpointId),
    ),
  };
}
