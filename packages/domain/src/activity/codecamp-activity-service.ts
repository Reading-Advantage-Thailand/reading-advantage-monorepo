import { randomUUID } from "node:crypto";
import { createActivityTransportHandlers, type ActivityTransportHandlers } from "@reading-advantage/activity-runtime/transport";
import type { ActivitySessionSummary } from "@reading-advantage/activity-runtime";
import type { ActivityActor } from "@reading-advantage/activity-runtime/server";
import { createCodecampAPKActivity, createCodecampAPKTutorialActivity } from "@reading-advantage/codecamp-knowledge";
import type { TenantDB } from "../db-contract.js";
import { DrizzleActivityPersistence } from "./drizzle-activity-persistence.js";
import { HttpTutorialRepositoryCaptureAdapter, prepareCodecampTutorialReport, processCodecampTutorialReport, reissueCodecampTutorialReportCredential } from "./tutorial-reporting.js";

const codecampPilotActivity = createCodecampAPKActivity("en");
const codecampTutorialActivity = createCodecampAPKTutorialActivity("en");

/** Activity handlers plus the separately authorized teacher summary boundary. */
export type CodecampActivityHandlers = ActivityTransportHandlers & {
  /**
   * Reads an educator-authorized learner session summary.
   * @param schoolId Educator school scope.
   * @param learnerId Owned learner.
   * @param sessionId Activity session.
   * @returns Teacher-readable session or null.
   */
  getTeacherSummary(schoolId: string, learnerId: string, sessionId: string): Promise<ActivitySessionSummary | null>;
  /**
   * Reads a Codecamp administrator-authorized platform session summary.
   * @param learnerId Platform learner identity.
   * @param sessionId Activity session identity.
   * @returns Codecamp teacher-readable session or null.
   */
  getCodecampTeacherSummary(learnerId: string, sessionId: string): Promise<ActivitySessionSummary | null>;
  /**
   * Verifies and persists a local tutorial report.
   * @param actor Authenticated learner.
   * @param input Untrusted local report.
   * @returns Verified and persisted tutorial evidence.
   */
  reportTutorial(actor: ActivityActor, input: unknown): ReturnType<typeof processCodecampTutorialReport>;
  /**
   * Captures a registered repository and prepares reporting.
   * @param actor Authenticated learner.
   * @param input Snapshot preparation request.
   * @returns Worker-captured snapshot credential.
   */
  prepareTutorial(actor: ActivityActor, input: unknown): ReturnType<typeof prepareCodecampTutorialReport>;
  /**
   * Reissues reporting authority for the same owned snapshot.
   * @param actor Authenticated learner.
   * @param input Existing snapshot binding.
   * @returns Refreshed credential for the same report identity.
   */
  reissueTutorialCredential(actor: ActivityActor, input: unknown): ReturnType<typeof reissueCodecampTutorialReportCredential>;
};

/**
 * Composes the Codecamp pilot repository, Drizzle persistence, and transport handlers.
 * @param tenantDb Authenticated tenant database from the request context.
 * @returns Request-scoped learner and teacher activity handlers.
 */
export function createCodecampActivityHandlers(tenantDb: TenantDB): CodecampActivityHandlers {
  const persistence = new DrizzleActivityPersistence(tenantDb);
  const handlers = createActivityTransportHandlers({
    activities: { async getActivity(activityId, activityVersion) {
      return [codecampPilotActivity, codecampTutorialActivity].find((activity) => activity.activityId === activityId && activity.activityVersion === activityVersion) ?? null;
    } },
    persistence, createSessionId: randomUUID, now: () => new Date().toISOString(),
    executeTutorialCheck: () => { throw new Error("Tutorial checks require the server repository verifier"); },
  });
  return {
    ...handlers,
    getTeacherSummary: (schoolId, learnerId, sessionId) => persistence.getTeacherSummary(
      schoolId, learnerId, sessionId, codecampPilotActivity.checkpoints.map(({ checkpointId }) => checkpointId),
    ),
    getCodecampTeacherSummary: (learnerId, sessionId) => persistence.getPlatformTeacherSummary(
      learnerId, sessionId, codecampPilotActivity.checkpoints.map(({ checkpointId }) => checkpointId),
    ),
    reportTutorial: (actor, input) => processCodecampTutorialReport(
      tenantDb,
      actor,
      input,
      process.env.TUTORIAL_REPORT_SECRET ?? "",
    ),
    prepareTutorial: (actor, input) => prepareCodecampTutorialReport(
      tenantDb, actor, input, process.env.TUTORIAL_REPORT_SECRET ?? "",
      new HttpTutorialRepositoryCaptureAdapter(process.env.TUTORIAL_REPOSITORY_WORKER_URL ?? "", process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN ?? ""),
    ),
    reissueTutorialCredential: (actor, input) => reissueCodecampTutorialReportCredential(tenantDb, actor, input, process.env.TUTORIAL_REPORT_SECRET ?? ""),
  };
}
