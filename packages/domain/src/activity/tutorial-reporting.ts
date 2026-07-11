import { randomUUID } from "node:crypto";
import { summarizeActivitySession } from "@reading-advantage/activity-runtime";
import { assessTutorialStep, type ActivityActor } from "@reading-advantage/activity-runtime/server";
import { reportTutorialResult, runTutorialStep, tutorialReportRequestSchema, verifiedTutorialReportSchema, type TutorialCredentialClaims, type TutorialManifest, type TutorialReportStore, type TutorialRepositoryVerifier } from "@reading-advantage/activity-tutorial";
import { createCodecampAPKTutorialActivity, codecampAPKUnit } from "@reading-advantage/codecamp-knowledge/apk-unit";
import { activityTutorialReports, activityTutorialRepositoryStates } from "@reading-advantage/db";
import { and, eq } from "drizzle-orm";
import type { TenantDB } from "../db-contract.js";
import { DrizzleActivityPersistence } from "./drizzle-activity-persistence.js";

function actorTenantKey(actor: ActivityActor): string {
  return actor.schoolId ?? actor.tenantKey;
}

/** Durable Drizzle implementation of scoped tutorial report claims and leases. */
export class DrizzleTutorialReportStore implements TutorialReportStore {
  /** Creates a tutorial report store over the authenticated database boundary. */
  constructor(private readonly tenantDb: TenantDB) {}

  /** Claims or replays one tenant-, learner-, session-, and submission-scoped report. */
  async begin(input: Parameters<TutorialReportStore["begin"]>[0]): ReturnType<TutorialReportStore["begin"]> {
    const [tenantKey, learnerId, sessionId, submissionId, extra] = input.scopedKey.split("\u0000");
    if (!tenantKey || !learnerId || !sessionId || !submissionId || extra) throw new Error("Invalid tutorial report scope");
    const rawDb = this.tenantDb.unscoped("tutorial report claims manually scope tenant, learner, session, and submission");
    return rawDb.transaction(async (tx) => {
      const [existing] = await tx.select().from(activityTutorialReports).where(and(
        eq(activityTutorialReports.tenantKey, tenantKey), eq(activityTutorialReports.learnerId, learnerId),
        eq(activityTutorialReports.sessionId, sessionId), eq(activityTutorialReports.submissionId, submissionId),
      )).for("update");
      if (!existing) {
        const [created] = await tx.insert(activityTutorialReports).values({ tenantKey, learnerId, sessionId, submissionId, nonce: input.nonce, requestDigest: input.requestDigest, status: "processing", leaseUntil: new Date(input.leaseUntil) }).returning();
        if (!created) throw new Error("Tutorial report claim insert failed");
        return { kind: "execute" as const, claimId: created.id };
      }
      if (existing.requestDigest !== input.requestDigest || existing.nonce !== input.nonce) return { kind: "conflict" as const };
      if (existing.status === "completed" && existing.resultJson) return { kind: "replay" as const, result: verifiedTutorialReportSchema.parse(existing.resultJson) };
      const retryAt = existing.retryAt ?? existing.leaseUntil;
      if (retryAt && retryAt.getTime() > Date.now()) return { kind: "busy" as const, retryAt: retryAt.toISOString() };
      await tx.update(activityTutorialReports).set({ status: "processing", leaseUntil: new Date(input.leaseUntil), retryAt: null, error: null, updatedAt: new Date() }).where(eq(activityTutorialReports.id, existing.id));
      return { kind: "execute" as const, claimId: existing.id };
    });
  }

  /** Completes one store-issued claim with a server-verified result. */
  async complete(claimId: string, result: Parameters<TutorialReportStore["complete"]>[1]): Promise<void> {
    const rawDb = this.tenantDb.unscoped("tutorial report completion uses an unguessable store-issued claim id");
    const updated = await rawDb.update(activityTutorialReports).set({ status: "completed", resultJson: verifiedTutorialReportSchema.parse(result) as unknown as Record<string, unknown>, leaseUntil: null, retryAt: null, error: null, updatedAt: new Date() }).where(eq(activityTutorialReports.id, claimId)).returning({ id: activityTutorialReports.id });
    if (updated.length !== 1) throw new Error("Unknown tutorial report claim");
  }

  /** Releases a failed claim for a bounded retry. */
  async fail(claimId: string, retryAt: string, error: string): Promise<void> {
    const rawDb = this.tenantDb.unscoped("tutorial report failure uses an unguessable store-issued claim id");
    const updated = await rawDb.update(activityTutorialReports).set({ status: "failed", retryAt: new Date(retryAt), leaseUntil: null, error, updatedAt: new Date() }).where(eq(activityTutorialReports.id, claimId)).returning({ id: activityTutorialReports.id });
    if (updated.length !== 1) throw new Error("Unknown tutorial report claim");
  }
}

/** Server verifier backed by normalized repository state captured by a trusted worker. */
export class DrizzleTutorialRepositoryVerifier implements TutorialRepositoryVerifier {
  /** Creates a verifier over server-owned repository snapshots. */
  constructor(private readonly tenantDb: TenantDB) {}

  /** Reruns the manifest checks against the exact scoped normalized snapshot. */
  async verify(manifest: TutorialManifest, stepId: string, repositoryStateId: string, claims: TutorialCredentialClaims) {
    const rawDb = this.tenantDb.unscoped("tutorial verifier scopes server-owned repository state by credential identity");
    const [state] = await rawDb.select().from(activityTutorialRepositoryStates).where(and(
      eq(activityTutorialRepositoryStates.id, repositoryStateId), eq(activityTutorialRepositoryStates.tenantKey, claims.tenantKey),
      eq(activityTutorialRepositoryStates.learnerId, claims.learnerId), eq(activityTutorialRepositoryStates.sessionId, claims.sessionId),
      eq(activityTutorialRepositoryStates.repositoryId, claims.repositoryId),
    )).limit(1);
    if (!state) throw new Error("Tutorial repository state not found");
    return runTutorialStep(manifest, stepId, {
      readAllowedFile: async (filePath) => {
        const content = state.filesJson[filePath];
        if (content === undefined) throw new Error(`Repository snapshot is missing ${filePath}`);
        return content;
      },
      runAllowedCommand: async () => state.gitStatus,
      now: () => state.capturedAt.toISOString(),
    });
  }
}

/**
 * Stores a normalized repository snapshot captured by a trusted clone worker.
 * @param tenantDb Database boundary used for explicit ownership scoping.
 * @param actor Authenticated learner that owns the tutorial session.
 * @param input Server-captured repository files and Git status.
 * @returns Stable repository-state identifier accepted by reporting.
 */
export async function recordTutorialRepositoryState(tenantDb: TenantDB, actor: ActivityActor, input: { stateId?: string; sessionId: string; repositoryId: string; files: Record<string, string>; gitStatus: string; capturedAt: string }): Promise<string> {
  const rawDb = tenantDb.unscoped("tutorial clone worker writes normalized state for the exact authenticated owner");
  const stateId = input.stateId ?? randomUUID();
  await rawDb.insert(activityTutorialRepositoryStates).values({ id: stateId, tenantKey: actorTenantKey(actor), learnerId: actor.learnerId, sessionId: input.sessionId, repositoryId: input.repositoryId, filesJson: input.files, gitStatus: input.gitStatus, capturedAt: new Date(input.capturedAt) });
  return stateId;
}

/**
 * Verifies an authenticated Codecamp tutorial report and persists its assessed evidence.
 * @param tenantDb Request-scoped database boundary.
 * @param actor Authenticated learner identity.
 * @param requestInput Untrusted local tutorial report.
 * @param secret Server credential signing secret.
 * @returns Verified check result and updated activity session summary.
 */
export async function processCodecampTutorialReport(tenantDb: TenantDB, actor: ActivityActor, requestInput: unknown, secret: string) {
  const request = tutorialReportRequestSchema.parse(requestInput);
  const verified = await reportTutorialResult({ learnerId: actor.learnerId, tenantKey: actorTenantKey(actor) }, request, {
    secret, now: () => new Date().toISOString(),
    loadManifest: async (activityId) => activityId === codecampAPKUnit.wedo.activityId ? codecampAPKUnit.wedo.manifest : null,
    verifier: new DrizzleTutorialRepositoryVerifier(tenantDb), store: new DrizzleTutorialReportStore(tenantDb),
  });
  const activity = createCodecampAPKTutorialActivity("en");
  const byCheck = new Map(verified.checks.map((check) => [check.checkId, check.passed]));
  const persistence = new DrizzleActivityPersistence(tenantDb);
  const current = await persistence.getOwnedSession(actor, verified.sessionId);
  if (!current) throw new Error("Tutorial activity session not found");
  const eventId = `tutorial:${verified.submissionId}`;
  if (current.state.processedAssessedEventIds.includes(eventId)) {
    return { verified, session: summarizeActivitySession(current) };
  }
  const priorAttempt = current.state.assessedTutorialResults[verified.stepId]?.attemptNumber ?? 0;
  const support = current.state.support;
  const submittedAt = new Date().toISOString();
  const evidenceConfidence = Math.max(0.4, Math.min(1, 1 - support.hintsUsed * 0.1 - support.revealsUsed * 0.2 - support.interventionLevel * 0.15));
  const assessed = assessTutorialStep(activity, {
    eventId, stepId: verified.stepId, submissionId: verified.submissionId,
    attemptNumber: priorAttempt + 1, submittedAt, hintsUsed: support.hintsUsed, revealsUsed: support.revealsUsed,
    interventionLevel: support.interventionLevel, evidenceConfidence,
    timingMs: Math.max(0, Date.parse(submittedAt) - Date.parse(current.updatedAt)),
  }, (check) => byCheck.get(check.checkId) ?? false);
  const session = await persistence.recordAssessment(actor, verified.sessionId, assessed);
  return { verified, session: summarizeActivitySession(session) };
}
