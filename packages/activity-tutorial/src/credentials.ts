import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Short-lived claims binding tutorial reports to an activity learner and tenant. */
export const tutorialCredentialClaimsSchema = z.object({
  tokenId: z.string().min(1), sessionId: z.string().min(1), activityId: z.string().min(1), repositoryId: z.string().min(1),
  activityVersion: z.string().regex(/^\d+\.\d+\.\d+$/), graphVersion: z.string().min(1), purpose: z.literal("tutorial-report"),
  learnerId: z.string().min(1), tenantKey: z.string().min(1), allowedStepIds: z.array(z.string().min(1)).min(1),
  issuedAt: z.string().datetime({ offset: true }), expiresAt: z.string().datetime({ offset: true }), nonce: z.string().min(16),
}).strict();

/** Validated tutorial credential claims. */
export type TutorialCredentialClaims = z.infer<typeof tutorialCredentialClaimsSchema>;

/** Replay store that atomically consumes a credential nonce once. */
export interface TutorialReplayStore {
  /**
   * Consumes a nonce only if it has not been seen before.
   * @param nonce Signed credential nonce.
   * @param expiresAt Credential expiry used for replay-store retention.
   * @returns Whether the nonce was consumed for the first time.
   */
  consumeOnce(nonce: string, expiresAt: string): Promise<boolean>;
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

/**
 * Signs short-lived tutorial claims without exposing the server secret.
 * @param claimsInput Tutorial identity and expiry claims.
 * @param secret Server credential-signing secret.
 * @returns Compact payload and HMAC signature.
 */
export function issueTutorialCredential(claimsInput: unknown, secret: string): string {
  if (Buffer.byteLength(secret) < 32) throw new Error("Tutorial credential secret must be at least 32 bytes");
  const claims = tutorialCredentialClaimsSchema.parse(claimsInput);
  if (Date.parse(claims.expiresAt) <= Date.parse(claims.issuedAt)) throw new Error("Credential expiry must follow issue time");
  if (Date.parse(claims.expiresAt) - Date.parse(claims.issuedAt) > 15 * 60 * 1000) throw new Error("Tutorial credential lifetime cannot exceed 15 minutes");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

/**
 * Verifies a tutorial credential without changing replay state.
 * @param token Compact signed credential.
 * @param secret Server credential-signing secret.
 * @param stepId Submitted authored step identifier.
 * @param now Server current time.
 * @returns Verified tenant- and learner-bound claims.
 */
export function verifyTutorialCredential(token: string, secret: string, stepId: string, now: string): TutorialCredentialClaims {
  if (Buffer.byteLength(secret) < 32) throw new Error("Tutorial credential secret must be at least 32 bytes");
  const [payload, encodedSignature, extra] = token.split(".");
  if (!payload || !encodedSignature || extra) throw new Error("Malformed tutorial credential");
  const expected = signature(payload, secret);
  const actual = Buffer.from(encodedSignature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid tutorial credential signature");
  const claims = tutorialCredentialClaimsSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  if (Date.parse(now) >= Date.parse(claims.expiresAt)) throw new Error("Tutorial credential expired");
  if (Date.parse(now) < Date.parse(claims.issuedAt)) throw new Error("Tutorial credential is not active");
  if (!claims.allowedStepIds.includes(stepId)) throw new Error(`Tutorial step is not authorized: ${stepId}`);
  return claims;
}

/**
 * Verifies and atomically consumes a tutorial credential for one submitted step.
 * @param token Compact signed credential.
 * @param secret Server credential-signing secret.
 * @param stepId Submitted authored step identifier.
 * @param now Server current time.
 * @param replayStore Atomic nonce replay store.
 * @returns Verified tenant- and learner-bound claims.
 */
export async function verifyAndConsumeTutorialCredential(token: string, secret: string, stepId: string, now: string, replayStore: TutorialReplayStore): Promise<TutorialCredentialClaims> {
  const claims = verifyTutorialCredential(token, secret, stepId, now);
  if (!await replayStore.consumeOnce(claims.nonce, claims.expiresAt)) throw new Error("Tutorial credential replayed");
  return claims;
}
