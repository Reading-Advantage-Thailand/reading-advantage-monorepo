import { createHash } from "node:crypto";
import { z } from "zod";
import { tutorialCheckResultSchema, tutorialManifestSchema, type TutorialCheckResult, type TutorialManifest } from "./contracts.js";
import { verifyTutorialCredential, type TutorialCredentialClaims } from "./credentials.js";

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
  begin(input: { nonce: string; submissionId: string; requestDigest: string; expiresAt: string }): Promise<{ kind: "execute" } | { kind: "replay"; result: VerifiedTutorialReport } | { kind: "conflict" }>;
  /**
   * Completes an accepted report for deterministic retry responses.
   * @param submissionId Stable submission identifier.
   * @param result Server-verified response to cache.
   * @returns Completion after durable storage.
   */
  complete(submissionId: string, result: VerifiedTutorialReport): Promise<void>;
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
  now(): string;
  loadManifest(activityId: string): Promise<TutorialManifest | null>;
  verifier: TutorialRepositoryVerifier;
  store: TutorialReportStore;
};

function reportDigest(request: z.infer<typeof tutorialReportRequestSchema>, claims: TutorialCredentialClaims): string {
  return `sha256:${createHash("sha256").update(JSON.stringify({
    submissionId: request.submissionId,
    repositoryStateId: request.repositoryStateId,
    localResult: request.localResult,
    tokenId: claims.tokenId,
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
  const claims = verifyTutorialCredential(request.credential, dependencies.secret, request.localResult.stepId, now);
  if (claims.learnerId !== actor.learnerId || claims.tenantKey !== actor.tenantKey) throw new Error("Tutorial credential identity mismatch");
  if (claims.activityId !== request.localResult.activityId) throw new Error("Tutorial credential activity mismatch");
  const manifest = await dependencies.loadManifest(claims.activityId);
  if (!manifest) throw new Error(`Tutorial manifest not found: ${claims.activityId}`);
  tutorialManifestSchema.parse(manifest);
  if (manifest.activityId !== claims.activityId || manifest.repositoryId !== request.localResult.repositoryId) throw new Error("Tutorial report manifest mismatch");

  const claimed = await dependencies.store.begin({
    nonce: claims.nonce, submissionId: request.submissionId,
    requestDigest: reportDigest(request, claims), expiresAt: claims.expiresAt,
  });
  if (claimed.kind === "replay") return verifiedTutorialReportSchema.parse(claimed.result);
  if (claimed.kind === "conflict") throw new Error("Tutorial report replay conflict");

  const rerun = tutorialCheckResultSchema.parse(await dependencies.verifier.verify(manifest, request.localResult.stepId, request.repositoryStateId, claims));
  if (rerun.activityId !== claims.activityId || rerun.repositoryId !== manifest.repositoryId || rerun.stepId !== request.localResult.stepId) throw new Error("Server verifier returned mismatched tutorial evidence");
  const result = verifiedTutorialReportSchema.parse({
    submissionId: request.submissionId, sessionId: claims.sessionId, activityId: claims.activityId,
    stepId: rerun.stepId, passed: rerun.passed,
    checks: rerun.checks.map(({ checkId, passed }) => ({ checkId, passed })), verifiedAt: now,
  });
  await dependencies.store.complete(request.submissionId, result);
  return result;
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
