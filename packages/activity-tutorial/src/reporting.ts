import { createHash } from "node:crypto";
import { z } from "zod";
import { tutorialCheckResultSchema, tutorialManifestSchema, type TutorialCheckResult, type TutorialManifest } from "./contracts.js";
import { authenticateTutorialCredential, verifyTutorialCredential, type TutorialCredentialClaims } from "./credentials.js";

/** Authenticated actor supplied by the server transport, never by the report body. */
export type TutorialReportActor = { learnerId: string; tenantKey: string };

/** Untrusted local report uploaded by the tutorial CLI. */
export const tutorialReportRequestSchema = z.object({
  submissionId: z.string().trim().min(1),
  credential: z.string().trim().min(1),
  repositoryStateId: z.string().trim().min(1).max(200),
  localResult: tutorialCheckResultSchema,
}).strict();

/** Server-owned result returned after deterministic repository verification. */
export const verifiedTutorialReportSchema = z.object({
  submissionId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  activityId: z.string().trim().min(1),
  activityVersion: z.string().trim().min(1),
  graphVersion: z.string().trim().min(1),
  repositoryId: z.string().trim().min(1),
  learnerId: z.string().trim().min(1),
  tenantKey: z.string().trim().min(1),
  stepId: z.string().trim().min(1),
  passed: z.boolean(),
  checks: z.array(z.object({ checkId: z.string().trim().min(1), passed: z.boolean() }).strict()),
  verifiedAt: z.string().datetime({ offset: true }),
}).strict();

/** Server-owned verified tutorial report. */
export type VerifiedTutorialReport = z.infer<typeof verifiedTutorialReportSchema>;

/** Atomic idempotency port for tutorial report retries and credential replay protection. */
export interface TutorialReportStore {
  /**
   * Claims a signed nonce and submission digest or returns its completed response.
   * @param input Credential nonce, stable submission identity, digest, and expiry.
   * @returns Execute for first use, replay for an identical completed retry, or conflict.
   */
  begin(input: { scopedKey: string; nonce: string; requestDigest: string; expiresAt: string; leaseUntil: string }): Promise<{ kind: "execute"; claimId: string } | { kind: "replay"; result: VerifiedTutorialReport } | { kind: "busy"; retryAt: string } | { kind: "conflict" }>;
  /**
   * Completes an accepted report for deterministic retry responses.
   * @param claimId Store-issued fenced claim identity.
   * @param result Server-verified response to cache.
   * @returns Completion after durable storage.
   */
  complete(claimId: string, result: VerifiedTutorialReport): Promise<void>;
  /**
   * Releases a failed claim for bounded retry after its lease.
   * @param claimId Store-issued claim identity.
   * @param retryAt Earliest retry time.
   * @param error Safe failure description.
   * @returns Completion after failure state is durable.
   */
  fail(claimId: string, retryAt: string, error: string): Promise<void>;
}

/** Server repository verifier that reruns authored checks against trusted state. */
export interface TutorialRepositoryVerifier {
  /**
   * Reruns one manifest step against a server-controlled repository snapshot.
   * @param manifest Validated server-owned tutorial manifest.
   * @param stepId Credential-authorized step identifier.
   * @param repositoryStateId Opaque server-recognized repository snapshot identifier.
   * @param claims Verified learner, tenant, session, and activity claims.
   * @returns Structured check output produced by server-controlled execution.
   */
  verify(manifest: TutorialManifest, stepId: string, repositoryStateId: string, claims: TutorialCredentialClaims): Promise<TutorialCheckResult>;
}

/** Dependencies for authenticated tutorial reporting. */
export type TutorialReportingDependencies = {
  secret: string;
  /** @returns Server current time used for credential and lease decisions. */
  now(): string;
  /** @param activityId Credential-bound activity identity. @returns Server-authored manifest or null. */
  loadManifest(activityId: string): Promise<TutorialManifest | null>;
  verifier: TutorialRepositoryVerifier;
  store: TutorialReportStore;
};

function reportDigest(request: z.infer<typeof tutorialReportRequestSchema>): string {
  return `sha256:${createHash("sha256").update(JSON.stringify({
    submissionId: request.submissionId,
    repositoryStateId: request.repositoryStateId,
    localResult: request.localResult,
  })).digest("hex")}`;
}

/**
 * Authenticates a local report, reruns checks on trusted state, and makes retries idempotent.
 * @param actor Server-authenticated learner and tenant identity.
 * @param requestInput Untrusted local checker report and short-lived credential.
 * @param dependencies Server manifest, verifier, idempotency store, clock, and signing secret.
 * @returns Only server-verified correctness and per-check results.
 * @throws When identity, manifest, credential, replay, or repository verification is invalid.
 */
export async function reportTutorialResult(actor: TutorialReportActor, requestInput: unknown, dependencies: TutorialReportingDependencies): Promise<VerifiedTutorialReport> {
  const request = tutorialReportRequestSchema.parse(requestInput);
  const now = dependencies.now();
  const claims = authenticateTutorialCredential(request.credential, dependencies.secret);
  if (claims.learnerId !== actor.learnerId || claims.tenantKey !== actor.tenantKey) throw new Error("Tutorial credential identity mismatch");
  if (claims.activityId !== request.localResult.activityId) throw new Error("Tutorial credential activity mismatch");
  if (claims.submissionId !== request.submissionId || claims.repositoryStateId !== request.repositoryStateId) throw new Error("Tutorial credential submission mismatch");
  const manifest = await dependencies.loadManifest(claims.activityId);
  if (!manifest) throw new Error(`Tutorial manifest not found: ${claims.activityId}`);
  tutorialManifestSchema.parse(manifest);
  if (manifest.activityId !== claims.activityId || manifest.repositoryId !== claims.repositoryId || manifest.repositoryId !== request.localResult.repositoryId || manifest.activityVersion !== claims.activityVersion || manifest.graphVersion !== claims.graphVersion) throw new Error("Tutorial report manifest mismatch");

  const scopedKey = `${claims.tenantKey}\u0000${claims.learnerId}\u0000${claims.sessionId}\u0000${request.submissionId}`;
  const claimed = await dependencies.store.begin({
    scopedKey, nonce: claims.nonce, requestDigest: reportDigest(request), expiresAt: claims.expiresAt,
    leaseUntil: new Date(Date.parse(now) + 60_000).toISOString(),
  });
  if (claimed.kind === "replay") return verifiedTutorialReportSchema.parse(claimed.result);
  if (claimed.kind === "conflict") throw new Error("Tutorial report replay conflict");
  if (claimed.kind === "busy") throw new Error(`Tutorial report is already processing; retry after ${claimed.retryAt}`);

  try {
    verifyTutorialCredential(request.credential, dependencies.secret, request.localResult.stepId, now);
    const rerun = tutorialCheckResultSchema.parse(await dependencies.verifier.verify(manifest, request.localResult.stepId, request.repositoryStateId, claims));
    if (rerun.activityId !== claims.activityId || rerun.repositoryId !== manifest.repositoryId || rerun.stepId !== request.localResult.stepId) throw new Error("Server verifier returned mismatched tutorial evidence");
    const authoredStep = manifest.steps.find(({ stepId }) => stepId === rerun.stepId);
    if (!authoredStep) throw new Error("Server verifier returned an unauthored tutorial step");
    const authoredCheckIds = authoredStep.checks.map(({ checkId }) => checkId);
    const rerunCheckIds = rerun.checks.map(({ checkId }) => checkId);
    if (JSON.stringify(rerunCheckIds) !== JSON.stringify(authoredCheckIds)) throw new Error("Server verifier returned mismatched tutorial checks");
    if (rerun.passed !== rerun.checks.every(({ passed }) => passed)) throw new Error("Server verifier returned inconsistent tutorial correctness");
    const result = verifiedTutorialReportSchema.parse({
      submissionId: request.submissionId, sessionId: claims.sessionId, activityId: claims.activityId,
      activityVersion: claims.activityVersion, graphVersion: claims.graphVersion, repositoryId: claims.repositoryId,
      learnerId: claims.learnerId, tenantKey: claims.tenantKey, stepId: rerun.stepId, passed: rerun.passed,
      checks: rerun.checks.map(({ checkId, passed }) => ({ checkId, passed })), verifiedAt: now,
    });
    await dependencies.store.complete(claimed.claimId, result);
    return result;
  } catch (error) {
    await dependencies.store.fail(claimed.claimId, new Date(Date.parse(now) + 30_000).toISOString(), error instanceof Error ? error.message.slice(0, 500) : "Tutorial verification failed");
    throw error;
  }
}

/**
 * Creates a deterministic process-local report store for tests and single-process hosts.
 * @param now Store clock used for lease and retry decisions.
 * @returns Tenant-scoped report store with replay, conflict, lease, and failure recovery.
 */
export function createInMemoryTutorialReportStore(now: () => string): TutorialReportStore {
  type Entry = { claimId: string; nonce: string; digest: string; leaseUntil: string; retryAt?: string; result?: VerifiedTutorialReport };
  const entries = new Map<string, Entry>();
  const claims = new Map<string, string>();
  return {
    async begin(input) {
      const existingKey = claims.get(input.nonce);
      if (existingKey && existingKey !== input.scopedKey) return { kind: "conflict" };
      const existing = entries.get(input.scopedKey);
      if (existing) {
        if (existing.digest !== input.requestDigest) return { kind: "conflict" };
        if (existing.result) {
          claims.set(input.nonce, input.scopedKey);
          return { kind: "replay", result: existing.result };
        }
        const retryAt = existing.retryAt ?? existing.leaseUntil;
        if (Date.parse(now()) < Date.parse(retryAt)) return { kind: "busy", retryAt };
      }
      const claimId = `${input.scopedKey}\u0000${input.nonce}`;
      entries.set(input.scopedKey, { claimId, nonce: input.nonce, digest: input.requestDigest, leaseUntil: input.leaseUntil });
      claims.set(input.nonce, input.scopedKey);
      return { kind: "execute", claimId };
    },
    async complete(claimId, result) {
      const entry = [...entries.values()].find((candidate) => candidate.claimId === claimId);
      if (!entry) throw new Error("Unknown tutorial report claim");
      entry.result = verifiedTutorialReportSchema.parse(result);
    },
    async fail(claimId, retryAt) {
      const entry = [...entries.values()].find((candidate) => candidate.claimId === claimId);
      if (!entry) throw new Error("Unknown tutorial report claim");
      entry.retryAt = retryAt;
    },
  };
}

/**
 * Uploads one secret-free local report through an injected HTTP-compatible client.
 * @param endpoint Authenticated tutorial report endpoint.
 * @param request Validated report request.
 * @param send Injected network adapter suitable for offline queues and tests.
 * @returns Validated server-verified response.
 */
export async function uploadTutorialReport(endpoint: string, request: z.input<typeof tutorialReportRequestSchema>, send: (endpoint: string, body: unknown) => Promise<unknown>): Promise<VerifiedTutorialReport> {
  const body = tutorialReportRequestSchema.parse(request);
  return verifiedTutorialReportSchema.parse(await send(endpoint, body));
}
