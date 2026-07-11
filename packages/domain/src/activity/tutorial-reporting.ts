import { randomUUID } from "node:crypto";
import { summarizeActivitySession } from "@reading-advantage/activity-runtime";
import { assessTutorialStep, type ActivityActor } from "@reading-advantage/activity-runtime/server";
import { issueTutorialCredential, reportTutorialResult, runTutorialStep, tutorialReportRequestSchema, verifiedTutorialReportSchema, type TutorialCredentialClaims, type TutorialManifest, type TutorialReportStore, type TutorialRepositoryVerifier } from "@reading-advantage/activity-tutorial";
import { createCodecampAPKTutorialActivity, codecampAPKUnit } from "@reading-advantage/codecamp-knowledge/apk-unit";
import { activityTutorialReports, activityTutorialRepositoryStates } from "@reading-advantage/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { TenantDB } from "../db-contract.js";
import { DrizzleActivityPersistence } from "./drizzle-activity-persistence.js";

function actorTenantKey(actor: ActivityActor): string {
  return actor.schoolId ?? actor.tenantKey;
}

/** Strict learner request for a worker-captured tutorial reporting credential. */
export const prepareTutorialReportInputSchema = z.object({
  sessionId: z.string().uuid(), submissionId: z.string().trim().min(1), repositoryId: z.string().trim().min(1), stepId: z.string().trim().min(1),
}).strict();

/** Strict request to reissue a credential for an existing server-owned snapshot. */
export const reissueTutorialReportCredentialInputSchema = z.object({
  sessionId: z.string().uuid(), submissionId: z.string().trim().min(1), repositoryStateId: z.string().trim().min(1), stepId: z.string().trim().min(1),
}).strict();

/** Server response binding a short-lived credential to one exact repository snapshot. */
export const prepareTutorialReportResponseSchema = z.object({
  submissionId: z.string(), repositoryStateId: z.string(), repositoryCapturedAt: z.string().datetime({ offset: true }), credential: z.string(), expiresAt: z.string().datetime({ offset: true }),
}).strict();

const capturedRepositoryStateSchema = z.object({
  files: z.record(z.string(), z.string().max(256 * 1024)), gitStatus: z.string().max(256 * 1024), capturedAt: z.string().datetime({ offset: true }),
}).strict();

/** Trusted repository-worker port that resolves a registered learner clone server-side. */
export interface TutorialRepositoryCapturePort {
  /**
   * Captures allowlisted files and normalized Git status without accepting a client URL.
   * @param input Authenticated learner, session, repository, and allowlist binding.
   * @returns Server-owned normalized repository snapshot.
   */
  capture(input: { tenantKey: string; learnerId: string; sessionId: string; repositoryId: string; allowedFiles: string[] }): Promise<z.infer<typeof capturedRepositoryStateSchema>>;
}

/** HTTP adapter for the isolated repository clone and capture worker. */
export class HttpTutorialRepositoryCaptureAdapter implements TutorialRepositoryCapturePort {
  /**
   * Creates a server-to-server repository worker adapter.
   * @param endpoint Internal worker endpoint.
   * @param serviceToken Secret used only on the server-to-server request.
   */
  constructor(private readonly endpoint: string, private readonly serviceToken: string) {}

  /**
   * Requests a normalized snapshot for an authenticated registered repository.
   * @param input Server-derived learner, session, repository, and allowlist fields.
   * @returns Validated worker snapshot with bounded file and Git output.
   */
  async capture(input: Parameters<TutorialRepositoryCapturePort["capture"]>[0]): ReturnType<TutorialRepositoryCapturePort["capture"]> {
    if (!this.endpoint || !this.serviceToken) throw new Error("Tutorial repository worker is not configured");
    const response = await fetch(this.endpoint, { method: "POST", headers: { authorization: `Bearer ${this.serviceToken}`, "content-type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Tutorial repository worker failed with ${response.status}`);
    return capturedRepositoryStateSchema.parse(await response.json());
  }
}

/** Durable Drizzle implementation of scoped tutorial report claims and leases. */
export class DrizzleTutorialReportStore implements TutorialReportStore {
  /**
   * Creates a tutorial report store over the authenticated database boundary.
   * @param tenantDb Request-scoped database boundary.
   */
  constructor(private readonly tenantDb: TenantDB) {}

  /**
   * Claims or replays one tenant-, learner-, session-, and submission-scoped report.
   * @param input Scoped identity, digest, nonce, and lease timestamps.
   * @returns Atomic execute, replay, busy, or conflict result.
   */
  async begin(input: Parameters<TutorialReportStore["begin"]>[0]): ReturnType<TutorialReportStore["begin"]> {
    const [tenantKey, learnerId, sessionId, submissionId, extra] = input.scopedKey.split("\u0000");
    if (!tenantKey || !learnerId || !sessionId || !submissionId || extra) throw new Error("Invalid tutorial report scope");
    const rawDb = this.tenantDb.unscoped("tutorial report claims manually scope tenant, learner, session, and submission");
    return rawDb.transaction(async (tx) => {
      const claimToken = randomUUID();
      const [created] = await tx.insert(activityTutorialReports).values({ tenantKey, learnerId, sessionId, submissionId, nonce: input.nonce, requestDigest: input.requestDigest, status: "processing", claimToken, leaseUntil: new Date(input.leaseUntil) }).onConflictDoNothing().returning();
      if (created) return { kind: "execute" as const, claimId: `${created.id}\u0000${claimToken}` };
      const [existing] = await tx.select().from(activityTutorialReports).where(and(
        eq(activityTutorialReports.tenantKey, tenantKey), eq(activityTutorialReports.learnerId, learnerId),
        eq(activityTutorialReports.sessionId, sessionId), eq(activityTutorialReports.submissionId, submissionId),
      )).for("update");
      if (!existing || existing.requestDigest !== input.requestDigest) return { kind: "conflict" as const };
      if (existing.status === "completed" && existing.resultJson) return { kind: "replay" as const, result: verifiedTutorialReportSchema.parse(existing.resultJson) };
      const retryAt = existing.retryAt ?? existing.leaseUntil;
      if (retryAt && retryAt.getTime() > Date.now()) return { kind: "busy" as const, retryAt: retryAt.toISOString() };
      await tx.update(activityTutorialReports).set({ status: "processing", nonce: input.nonce, claimToken, leaseUntil: new Date(input.leaseUntil), retryAt: null, error: null, updatedAt: new Date() }).where(eq(activityTutorialReports.id, existing.id));
      return { kind: "execute" as const, claimId: `${existing.id}\u0000${claimToken}` };
    });
  }

  /**
   * Completes one store-issued claim with a server-verified result.
   * @param claimId Fenced store-issued row and lease token.
   * @param result Validated server verification result.
   * @returns Completion after the active lease is settled.
   */
  async complete(claimId: string, result: Parameters<TutorialReportStore["complete"]>[1]): Promise<void> {
    const rawDb = this.tenantDb.unscoped("tutorial report completion uses an unguessable store-issued claim id");
    const [id, claimToken] = claimId.split("\u0000");
    if (!id || !claimToken) throw new Error("Malformed tutorial report claim");
    const updated = await rawDb.update(activityTutorialReports).set({ status: "completed", resultJson: verifiedTutorialReportSchema.parse(result) as unknown as Record<string, unknown>, leaseUntil: null, retryAt: null, error: null, updatedAt: new Date() }).where(and(eq(activityTutorialReports.id, id), eq(activityTutorialReports.claimToken, claimToken), eq(activityTutorialReports.status, "processing"))).returning({ id: activityTutorialReports.id });
    if (updated.length !== 1) throw new Error("Unknown tutorial report claim");
  }

  /**
   * Releases a failed claim for a bounded retry.
   * @param claimId Fenced store-issued row and lease token.
   * @param retryAt Earliest safe retry timestamp.
   * @param error Safe bounded error text.
   * @returns Completion after the active lease is released.
   */
  async fail(claimId: string, retryAt: string, error: string): Promise<void> {
    const rawDb = this.tenantDb.unscoped("tutorial report failure uses an unguessable store-issued claim id");
    const [id, claimToken] = claimId.split("\u0000");
    if (!id || !claimToken) throw new Error("Malformed tutorial report claim");
    const updated = await rawDb.update(activityTutorialReports).set({ status: "failed", retryAt: new Date(retryAt), leaseUntil: null, error, updatedAt: new Date() }).where(and(eq(activityTutorialReports.id, id), eq(activityTutorialReports.claimToken, claimToken), eq(activityTutorialReports.status, "processing"))).returning({ id: activityTutorialReports.id });
    if (updated.length !== 1) throw new Error("Unknown tutorial report claim");
  }
}

/** Server verifier backed by normalized repository state captured by a trusted worker. */
export class DrizzleTutorialRepositoryVerifier implements TutorialRepositoryVerifier {
  /**
   * Creates a verifier over server-owned repository snapshots.
   * @param tenantDb Request-scoped database boundary.
   */
  constructor(private readonly tenantDb: TenantDB) {}

  /**
   * Reruns the manifest checks against the exact scoped normalized snapshot.
   * @param manifest Server-owned authored manifest.
   * @param stepId Credential-authorized step identifier.
   * @param repositoryStateId Exact worker-captured snapshot identifier.
   * @param claims Authenticated snapshot, activity, learner, and tenant binding.
   * @returns Deterministic check result over normalized snapshot data.
   */
  async verify(manifest: TutorialManifest, stepId: string, repositoryStateId: string, claims: TutorialCredentialClaims) {
    const rawDb = this.tenantDb.unscoped("tutorial verifier scopes server-owned repository state by credential identity");
    const [state] = await rawDb.select().from(activityTutorialRepositoryStates).where(and(
      eq(activityTutorialRepositoryStates.id, repositoryStateId), eq(activityTutorialRepositoryStates.tenantKey, claims.tenantKey),
      eq(activityTutorialRepositoryStates.learnerId, claims.learnerId), eq(activityTutorialRepositoryStates.sessionId, claims.sessionId),
      eq(activityTutorialRepositoryStates.repositoryId, claims.repositoryId), eq(activityTutorialRepositoryStates.activityId, claims.activityId),
      eq(activityTutorialRepositoryStates.activityVersion, claims.activityVersion), eq(activityTutorialRepositoryStates.graphVersion, claims.graphVersion),
    )).limit(1);
    if (!state) throw new Error("Tutorial repository state not found");
    if (claims.repositoryStateId !== repositoryStateId || state.capturedAt.toISOString() !== claims.repositoryCapturedAt) throw new Error("Tutorial repository state credential mismatch");
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
export async function recordTutorialRepositoryState(tenantDb: TenantDB, actor: ActivityActor, input: { stateId?: string; sessionId: string; repositoryId: string; activityId: string; activityVersion: string; graphVersion: string; files: Record<string, string>; gitStatus: string; capturedAt: string }): Promise<string> {
  const rawDb = tenantDb.unscoped("tutorial clone worker writes normalized state for the exact authenticated owner");
  const stateId = input.stateId ?? randomUUID();
  await rawDb.insert(activityTutorialRepositoryStates).values({ id: stateId, tenantKey: actorTenantKey(actor), learnerId: actor.learnerId, sessionId: input.sessionId, repositoryId: input.repositoryId, activityId: input.activityId, activityVersion: input.activityVersion, graphVersion: input.graphVersion, filesJson: input.files, gitStatus: input.gitStatus, capturedAt: new Date(input.capturedAt) });
  return stateId;
}

/**
 * Captures the learner's registered repository and issues a snapshot-bound report credential.
 * @param tenantDb Request-scoped database boundary.
 * @param actor Authenticated learner identity.
 * @param input Untrusted session, submission, repository, and step selection.
 * @param secret Server credential-signing secret.
 * @param capture Trusted repository clone-worker adapter.
 * @returns Exact snapshot identity and short-lived signed reporting credential.
 */
export async function prepareCodecampTutorialReport(tenantDb: TenantDB, actor: ActivityActor, input: unknown, secret: string, capture: TutorialRepositoryCapturePort): Promise<z.infer<typeof prepareTutorialReportResponseSchema>> {
  const request = prepareTutorialReportInputSchema.parse(input);
  const activity = createCodecampAPKTutorialActivity("en");
  if (request.repositoryId !== codecampAPKUnit.wedo.manifest.repositoryId || !codecampAPKUnit.wedo.manifest.steps.some(({ stepId }) => stepId === request.stepId)) throw new Error("Unknown Codecamp tutorial repository or step");
  const persistence = new DrizzleActivityPersistence(tenantDb);
  const session = await persistence.getOwnedSession(actor, request.sessionId);
  if (!session || session.activityId !== activity.activityId || session.activityVersion !== activity.activityVersion) throw new Error("Tutorial activity session not found");
  const snapshot = capturedRepositoryStateSchema.parse(await capture.capture({ tenantKey: actorTenantKey(actor), learnerId: actor.learnerId, sessionId: request.sessionId, repositoryId: request.repositoryId, allowedFiles: [...codecampAPKUnit.wedo.manifest.allowedFiles] }));
  const capturedAt = new Date(snapshot.capturedAt).toISOString();
  const files = Object.fromEntries(codecampAPKUnit.wedo.manifest.allowedFiles.flatMap((filePath) => snapshot.files[filePath] === undefined ? [] : [[filePath, snapshot.files[filePath]!]]));
  const repositoryStateId = await recordTutorialRepositoryState(tenantDb, actor, { sessionId: request.sessionId, repositoryId: request.repositoryId, activityId: activity.activityId, activityVersion: activity.activityVersion, graphVersion: activity.graphVersion, files, gitStatus: snapshot.gitStatus, capturedAt });
  const issuedAt = new Date().toISOString();
  if (Date.parse(issuedAt) - Date.parse(capturedAt) > 5 * 60_000 || Date.parse(capturedAt) > Date.parse(issuedAt)) throw new Error("Repository worker returned a stale capture");
  const expiresAt = new Date(Date.parse(issuedAt) + 10 * 60_000).toISOString();
  const credential = issueTutorialCredential({ tokenId: randomUUID(), sessionId: request.sessionId, submissionId: request.submissionId, activityId: activity.activityId, repositoryId: request.repositoryId, repositoryStateId, repositoryCapturedAt: capturedAt, activityVersion: activity.activityVersion, graphVersion: activity.graphVersion, purpose: "tutorial-report", learnerId: actor.learnerId, tenantKey: actorTenantKey(actor), allowedStepIds: [request.stepId], issuedAt, expiresAt, nonce: randomUUID() }, secret);
  return prepareTutorialReportResponseSchema.parse({ submissionId: request.submissionId, repositoryStateId, repositoryCapturedAt: capturedAt, credential, expiresAt });
}

/**
 * Reissues a short-lived credential for the same owned snapshot after offline expiry.
 * @param tenantDb Request-scoped database boundary.
 * @param actor Authenticated learner identity.
 * @param input Existing session, submission, snapshot, and step binding.
 * @param secret Server credential-signing secret.
 * @returns A new credential preserving the report's stable idempotency identity.
 */
export async function reissueCodecampTutorialReportCredential(tenantDb: TenantDB, actor: ActivityActor, input: unknown, secret: string): Promise<z.infer<typeof prepareTutorialReportResponseSchema>> {
  const request = reissueTutorialReportCredentialInputSchema.parse(input);
  const activity = createCodecampAPKTutorialActivity("en");
  const persistence = new DrizzleActivityPersistence(tenantDb);
  const session = await persistence.getOwnedSession(actor, request.sessionId);
  if (!session || session.activityId !== activity.activityId || session.activityVersion !== activity.activityVersion || !codecampAPKUnit.wedo.manifest.steps.some(({ stepId }) => stepId === request.stepId)) throw new Error("Tutorial activity session not found");
  const rawDb = tenantDb.unscoped("tutorial credential reissue scopes an existing server-owned snapshot by authenticated owner");
  const [state] = await rawDb.select().from(activityTutorialRepositoryStates).where(and(
    eq(activityTutorialRepositoryStates.id, request.repositoryStateId), eq(activityTutorialRepositoryStates.tenantKey, actorTenantKey(actor)),
    eq(activityTutorialRepositoryStates.learnerId, actor.learnerId), eq(activityTutorialRepositoryStates.sessionId, request.sessionId),
    eq(activityTutorialRepositoryStates.activityId, activity.activityId), eq(activityTutorialRepositoryStates.activityVersion, activity.activityVersion), eq(activityTutorialRepositoryStates.graphVersion, activity.graphVersion),
  )).limit(1);
  if (!state) throw new Error("Tutorial repository state not found");
  const issuedAt = new Date().toISOString();
  if (Date.parse(issuedAt) - state.capturedAt.getTime() > 30 * 60_000) throw new Error("Tutorial repository state must be recaptured");
  const repositoryCapturedAt = state.capturedAt.toISOString();
  const expiresAt = new Date(Date.parse(issuedAt) + 10 * 60_000).toISOString();
  const credential = issueTutorialCredential({ tokenId: randomUUID(), sessionId: request.sessionId, submissionId: request.submissionId, activityId: activity.activityId, repositoryId: state.repositoryId, repositoryStateId: state.id, repositoryCapturedAt, activityVersion: activity.activityVersion, graphVersion: activity.graphVersion, purpose: "tutorial-report", learnerId: actor.learnerId, tenantKey: actorTenantKey(actor), allowedStepIds: [request.stepId], issuedAt, expiresAt, nonce: randomUUID() }, secret);
  return prepareTutorialReportResponseSchema.parse({ submissionId: request.submissionId, repositoryStateId: state.id, repositoryCapturedAt, credential, expiresAt });
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
