import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { vocabularyInputSchema, type VocabularyInput } from "@reading-advantage/game-contracts";
import { z } from "zod";

import { gameDifficultyEnum } from "./schema.js";
import { calculateGameXP } from "./xp.js";

/** Duration in milliseconds for which a Dragon Flight proof credential remains valid. */
export const DRAGON_FLIGHT_HOST_PROOF_ATTEMPT_TTL_MS = 10 * 60 * 1_000;

/** Minimum server-observed dwell between a gate checkpoint and its launch checkpoint. */
export const DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS = 250;

/** Maximum acceptable precision difference when rereading PostgreSQL REAL accuracy values. */
const DRAGON_FLIGHT_CANONICAL_ACCURACY_TOLERANCE = 1e-6;

/** A server-authenticated actor allowed to issue or complete a host-proof attempt. */
export interface HostProofAttemptActor {
  /** Authenticated user identifier derived by the server. */
  readonly userId: string;
  /** Tenant identifier derived by the server session. */
  readonly schoolId: string;
}

/** Server result stored for one fire-once Dragon Flight proof attempt. */
export interface DragonFlightHostProofCompletion {
  /** XP produced only by the authoritative persistence boundary. */
  readonly xpEarned: number;
  /** Server-replayed title score. */
  readonly score: number;
  /** Server-replayed fractional accuracy. */
  readonly accuracy: number;
  /** Server-replayed count of correct gate choices. */
  readonly correctAnswers: number;
  /** Server-replayed count of all gate choices. */
  readonly totalAttempts: number;
  /** Server-replayed elapsed milliseconds at the launch action. */
  readonly duration: number;
  /** Whether the server-replayed launch completed the title successfully. */
  readonly victory: boolean;
  /** Whether this response is a saved fire-once replay rather than a new award. */
  readonly duplicate: boolean;
}

/** Canonical server-owned completion facts read after an authoritative persistence attempt. */
export interface DragonFlightHostProofCanonicalCompletion {
  /** XP awarded by the committed generic completion row. */
  readonly xpEarned: number;
  /** Persisted server-derived title score. */
  readonly score: number;
  /** Persisted server-derived fractional accuracy. */
  readonly accuracy: number;
  /** Persisted server-derived correct gate count. */
  readonly correctAnswers: number;
  /** Persisted server-derived gate attempt count. */
  readonly totalAttempts: number;
  /** Persisted server-derived launch duration. */
  readonly duration: number;
  /** Persisted server-derived victory state. */
  readonly victory: boolean;
}

/** Result returned while issuing an immutable Dragon Flight host-proof attempt. */
export interface DragonFlightHostProofAttempt {
  /** Server-created UUID for this exact attempt. */
  readonly attemptId: string;
  /** Opaque, tamper-evident credential bound to actor, tenant, input, and expiry. */
  readonly credential: string;
  /** Server-loaded vocabulary payload passed to the runtime cartridge. */
  readonly input: VocabularyInput;
  /** ISO timestamp at which the credential expires. */
  readonly expiresAt: string;
}

/** A server-observed, action-specific protocol checkpoint for one Dragon Flight attempt. */
export interface DragonFlightHostProofActionAttestation {
  /** Opaque signed receipt for one action in the ordered host-proof protocol. */
  readonly checkpoint: string;
  /** Server-owned minimum wait before a subsequent launch request after this gate receipt. */
  readonly minimumNextActionDwellMs: number;
}

/** Atomic replay-claim outcome returned by a durable host-proof store. */
export type DragonFlightHostProofClaim =
  | { readonly kind: "execute"; readonly claimId: string }
  | { readonly kind: "recover"; readonly claimId: string }
  | { readonly kind: "replay"; readonly result: DragonFlightHostProofCompletion }
  | { readonly kind: "conflict" };

/** Non-mutating recovery lookup result for an expired signed host-proof attempt. */
export type DragonFlightHostProofRecoveryLookup =
  | { readonly kind: "missing" }
  | { readonly kind: "conflict" }
  | { readonly kind: "pending"; readonly claimId: string }
  | { readonly kind: "replay"; readonly result: DragonFlightHostProofCompletion };

/** Durable storage adapter used to coordinate fire-once host-proof completion. */
export interface DragonFlightHostProofAttemptStore {
  /**
   * Claims one validated transcript or returns its persisted outcome.
   * @param input Identity, digest, and expiration constraints for the validated attempt.
   * @returns A new execution claim, recovery claim, prior replay result, or conflicting claim result.
   */
  begin(input: {
    readonly attemptId: string;
    readonly userId: string;
    readonly schoolId: string;
    readonly transcriptDigest: string;
    readonly expiresAt: string;
  }): Promise<DragonFlightHostProofClaim>;
  /**
   * Looks up one exact durable claim without creating, reclaiming, or abandoning anything.
   * @param input Identity, digest, and expiration constraints for the validated attempt.
   * @returns Missing, conflicting, pending, or completed replay state for the exact signed claim.
   */
  lookupRecovery(input: {
    readonly attemptId: string;
    readonly userId: string;
    readonly schoolId: string;
    readonly transcriptDigest: string;
    readonly expiresAt: string;
  }): Promise<DragonFlightHostProofRecoveryLookup>;
  /**
   * Persists an authoritative result under an execution claim.
   * @param claimId Store-created claim identifier.
   * @param result Completed server-derived result.
   * @returns Nothing when the result is durably stored.
   */
  complete(claimId: string, result: DragonFlightHostProofCompletion): Promise<void>;
  /**
   * Releases a failed execution claim when the durable adapter supports recovery.
   * @param claimId Store-created claim identifier.
   * @returns Nothing after the adapter releases the claim.
   */
  abandon?(claimId: string): Promise<void>;
}

/** Dependencies injected by application adapters into the transport-independent domain command. */
export interface DragonFlightHostProofAttemptDependencies {
  /** High-entropy secret used exclusively to authenticate proof credentials. */
  readonly secret: string;
  /** Server-only minimum dwell required between a gate receipt and a launch receipt. */
  readonly gateToLaunchDwellMs: number;
  /** Supplies an ISO timestamp from the application clock. */
  readonly now: () => string;
  /** Creates an opaque UUID without coupling domain logic to a transport. */
  readonly createAttemptId: () => string;
  /** Loads the learner-specific vocabulary payload under server-side authorization. */
  readonly loadVocabularyInput: (input: {
    readonly userId: string;
    readonly schoolId: string;
    readonly gameType: "dragon-flight" | "magic-defense" | "dungeon-liberator" | "castle-defense" | "wizard-vs-zombie" | "village-guardian" | "enchanted-library" | "rune-match" | "alchemists-synthesis" | "potion-rush" | "rune-forge-chamber" | "spellweavers-run" | "shadow-gate-dungeon" | "labyrinth-goblin-king" | "griffin-riders-escape";
    readonly difficulty: z.infer<typeof gameDifficultyEnum>;
  }) => Promise<VocabularyInput>;
  /** Persists a completion using the existing server-authoritative XP boundary. */
  readonly recordCompletion: (input: {
    readonly gameType: "dragon-flight" | "magic-defense" | "dungeon-liberator" | "castle-defense" | "wizard-vs-zombie" | "village-guardian" | "enchanted-library" | "rune-match" | "alchemists-synthesis" | "potion-rush" | "rune-forge-chamber" | "spellweavers-run" | "shadow-gate-dungeon" | "labyrinth-goblin-king" | "griffin-riders-escape";
    readonly difficulty: z.infer<typeof gameDifficultyEnum>;
    readonly score: number;
    readonly accuracy: number;
    readonly correctAnswers: number;
    readonly totalAttempts: number;
    readonly duration: number;
    readonly victory: boolean;
    readonly idempotencyKey: string;
  }) => Promise<{ readonly xpEarned: number; readonly duplicate: boolean }>;
  /**
   * Reads the canonical completion committed under one signed attempt identity.
   * @param input Server-bound tenant, actor, game, difficulty, and attempt identity.
   * @returns The canonical committed facts, or null when no matching completion exists.
   */
  readonly readCanonicalCompletion: (input: {
    readonly attemptId: string;
    readonly userId: string;
    readonly schoolId: string;
    readonly gameType: "dragon-flight" | "magic-defense" | "dungeon-liberator" | "castle-defense" | "wizard-vs-zombie" | "village-guardian" | "enchanted-library" | "rune-match" | "alchemists-synthesis" | "potion-rush" | "rune-forge-chamber" | "spellweavers-run" | "shadow-gate-dungeon" | "labyrinth-goblin-king" | "griffin-riders-escape";
    readonly difficulty: z.infer<typeof gameDifficultyEnum>;
  }) => Promise<DragonFlightHostProofCanonicalCompletion | null>;
  /** Durable replay-claim adapter for this boundary. */
  readonly store: DragonFlightHostProofAttemptStore;
}

const actorSchema = z.object({
  userId: z.string().min(1),
  schoolId: z.string().min(1),
}).strict();

/** Multi-title signed-attempt game types shared with host history/loaders. */
const hostProofAttemptGameTypeEnum = z.enum([
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "castle-defense",
  "wizard-vs-zombie",
  "village-guardian",
  "enchanted-library",
  "rune-match",
  "alchemists-synthesis",
  "potion-rush",
  "rune-forge-chamber",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "labyrinth-goblin-king",
  "griffin-riders-escape",
]);

/** Strict request accepted when issuing a Dragon Flight proof attempt. */
export const issueDragonFlightHostProofAttemptSchema = z.object({
  gameType: hostProofAttemptGameTypeEnum,
  difficulty: gameDifficultyEnum,
}).strict();

const actionSchema = z.discriminatedUnion("kind", [
  z.object({
    sequence: z.number().int().positive(),
    kind: z.literal("choose-gate"),
    gate: z.enum(["left", "right"]),
    elapsedMs: z.number().int().nonnegative(),
  }).strict(),
  z.object({
    sequence: z.number().int().positive(),
    kind: z.literal("launch"),
    elapsedMs: z.number().int().nonnegative(),
  }).strict(),
]);

/** Strict request accepted when the server observes one Dragon Flight action transition. */
export const attestDragonFlightHostProofActionSchema = z.object({
  attemptId: z.string().uuid(),
  credential: z.string().min(1),
  action: actionSchema,
  previousCheckpoint: z.string().min(1).optional(),
}).strict();

/** Strict server-verifiable completion request accepted from the runtime host. */
export const completeDragonFlightHostProofAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  credential: z.string().min(1),
  idempotencyKey: z.string().uuid(),
  actions: z.array(actionSchema).min(2).max(32),
  checkpoints: z.array(z.string().min(1)).min(2).max(32),
}).strict();

const claimsSchema = z.object({
  version: z.literal(1),
  attemptId: z.string().uuid(),
  userId: z.string().min(1),
  schoolId: z.string().min(1),
  gameType: hostProofAttemptGameTypeEnum,
  difficulty: gameDifficultyEnum,
  inputDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
}).strict();

const canonicalCompletionSchema = z.object({
  xpEarned: z.number().int().min(0),
  score: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  correctAnswers: z.number().int().min(0),
  totalAttempts: z.number().int().min(1),
  duration: z.number().int().min(0),
  victory: z.boolean(),
}).strict();

const actionCheckpointClaimsSchema = z.object({
  version: z.literal(1),
  attemptId: z.string().uuid(),
  userId: z.string().min(1),
  schoolId: z.string().min(1),
  actionDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  sequence: z.number().int().positive(),
  previousCheckpointDigest: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
  observedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
}).strict();

type DragonFlightHostProofClaims = z.infer<typeof claimsSchema>;
type DragonFlightHostProofAction = z.infer<typeof actionSchema>;
type DragonFlightHostProofActionCheckpointClaims = z.infer<typeof actionCheckpointClaimsSchema>;

interface DragonFlightReplayFacts {
  readonly score: number;
  readonly accuracy: number;
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly duration: number;
  readonly victory: boolean;
}

/**
 * Encodes one byte sequence as an unpadded URL-safe base64 string.
 * @param value Bytes to encode.
 * @returns URL-safe base64 text.
 */
function encodeBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

/**
 * Decodes one URL-safe base64 string with a stable validation error.
 * @param value Encoded credential segment.
 * @returns Decoded UTF-8 payload.
 * @throws When the segment cannot be decoded.
 */
function decodeBase64Url(value: string): string {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    throw new Error("Host-proof credential is malformed");
  }
}

/**
 * Calculates a stable SHA-256 digest for a canonical JSON value.
 * @param value JSON-safe value to digest.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * Validates the credential secret before it signs or verifies any claim.
 * @param secret Candidate high-entropy HMAC secret.
 * @returns The validated secret.
 * @throws When the secret is missing or too short for this security boundary.
 */
function requireSecret(secret: string): string {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Host-proof attempt signing secret must contain at least 32 characters");
  }
  return secret;
}

/**
 * Creates the tamper-evident credential for one compact attempt claim.
 * @param claims Server-owned attempt claims.
 * @param secret Signing secret.
 * @returns Opaque payload-and-signature credential.
 */
function signClaims(claims: DragonFlightHostProofClaims, secret: string): string {
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signature = createHmac("sha256", requireSecret(secret)).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verifies and parses an opaque attempt credential without trusting its contents.
 * @param credential Candidate payload-and-signature credential.
 * @param secret Signing secret.
 * @returns Validated signed claims.
 * @throws When the credential is malformed, altered, or invalid.
 */
function verifyClaims(credential: string, secret: string): DragonFlightHostProofClaims {
  const parts = credential.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Host-proof credential is malformed");
  }
  const [payload, providedSignature] = parts;
  const expectedSignature = createHmac("sha256", requireSecret(secret))
    .update(payload)
    .digest("base64url");
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Host-proof credential signature is invalid");
  }
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(decodeBase64Url(payload));
  } catch {
    throw new Error("Host-proof credential payload is invalid");
  }
  return claimsSchema.parse(parsedPayload);
}

/**
 * Signs one server-observed action checkpoint without representing it as gameplay proof.
 * @param claims Server-owned action receipt claims.
 * @param secret Signing secret.
 * @returns Opaque payload-and-signature checkpoint.
 */
function signActionCheckpoint(
  claims: DragonFlightHostProofActionCheckpointClaims,
  secret: string,
): string {
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signature = createHmac("sha256", requireSecret(secret)).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verifies one server-issued action checkpoint without trusting client-provided contents.
 * @param checkpoint Candidate payload-and-signature action receipt.
 * @param secret Signing secret.
 * @returns Validated server-observed action receipt claims.
 * @throws When the checkpoint is malformed, altered, or invalid.
 */
function verifyActionCheckpoint(
  checkpoint: string,
  secret: string,
): DragonFlightHostProofActionCheckpointClaims {
  const parts = checkpoint.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Host-proof action checkpoint is malformed");
  }
  const [payload, providedSignature] = parts;
  const expectedSignature = createHmac("sha256", requireSecret(secret))
    .update(payload)
    .digest("base64url");
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Host-proof action checkpoint signature is invalid");
  }
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(decodeBase64Url(payload));
  } catch {
    throw new Error("Host-proof action checkpoint payload is invalid");
  }
  return actionCheckpointClaimsSchema.parse(parsedPayload);
}

/**
 * Adds the fixed proof lifetime to an ISO timestamp.
 * @param issuedAt ISO timestamp supplied by the application clock.
 * @returns ISO timestamp exactly one proof lifetime later.
 * @throws When the supplied timestamp is invalid.
 */
function calculateExpiry(issuedAt: string): string {
  const milliseconds = Date.parse(issuedAt);
  if (!Number.isFinite(milliseconds)) throw new Error("Host-proof clock returned an invalid timestamp");
  return new Date(milliseconds + DRAGON_FLIGHT_HOST_PROOF_ATTEMPT_TTL_MS).toISOString();
}

/**
 * Replays the ordered Dragon Flight transcript into the canonical completion facts.
 * @param actions Validated title-owned action transcript.
 * @returns Server-derived score, accuracy, answer counts, duration, and victory.
 * @throws When sequencing, timing, or title mechanics are invalid.
 */
function replayDragonFlight(actions: readonly DragonFlightHostProofAction[]): DragonFlightReplayFacts {
  let previousElapsed = -1;
  let correctAnswers = 0;
  let totalAttempts = 0;
  let launchElapsed: number | undefined;

  for (const [index, action] of actions.entries()) {
    if (action.sequence !== index + 1) {
      throw new Error("Host-proof actions must use contiguous sequence numbers");
    }
    if (action.elapsedMs < previousElapsed) {
      throw new Error("Host-proof action timestamps must be nondecreasing");
    }
    previousElapsed = action.elapsedMs;
    if (action.kind === "launch") {
      if (index !== actions.length - 1 || totalAttempts === 0 || launchElapsed !== undefined) {
        throw new Error("Dragon Flight launch must follow at least one gate choice and end the transcript");
      }
      launchElapsed = action.elapsedMs;
    } else {
      if (launchElapsed !== undefined) throw new Error("Dragon Flight cannot choose a gate after launch");
      totalAttempts += 1;
      // Dragon Flight renders the server-issued translation in the right gate.
      if (action.gate === "right") correctAnswers += 1;
    }
  }

  if (launchElapsed === undefined) throw new Error("Dragon Flight completion requires a launch action");
  const accuracy = correctAnswers / totalAttempts;
  return {
    score: correctAnswers * 100,
    accuracy,
    correctAnswers,
    totalAttempts,
    duration: launchElapsed,
    victory: true,
  };
}

/**
 * Verifies that a canonical completion contains the exact facts replayed from the signed transcript.
 * @param canonical Persisted completion facts read under the signed attempt identity.
 * @param replayed Server-replayed completion facts for the submitted action chain.
 * @param expectedXp XP recomputed from the canonical server formula.
 * @returns Nothing when all replayed facts and XP match the canonical completion.
 * @throws When the canonical completion differs from the verified transcript or XP formula.
 */
function assertCanonicalCompletionMatchesReplay(
  canonical: DragonFlightHostProofCanonicalCompletion,
  replayed: DragonFlightReplayFacts,
  expectedXp: number,
): void {
  if (
    canonical.xpEarned !== expectedXp
    || canonical.score !== replayed.score
    || Math.abs(canonical.accuracy - replayed.accuracy) > DRAGON_FLIGHT_CANONICAL_ACCURACY_TOLERANCE
    || canonical.correctAnswers !== replayed.correctAnswers
    || canonical.totalAttempts !== replayed.totalAttempts
    || canonical.duration !== replayed.duration
    || canonical.victory !== replayed.victory
  ) {
    throw new Error("Canonical Dragon Flight completion does not match the verified transcript");
  }
}

/**
 * Calculates expected Dragon Flight XP through the canonical generic game formula.
 * @param claims Signed game and difficulty identity for the attempt.
 * @param replayed Server-replayed completion facts.
 * @returns The XP that the authoritative persistence boundary must have recorded.
 */
function calculateExpectedDragonFlightXP(
  claims: DragonFlightHostProofClaims,
  replayed: DragonFlightReplayFacts,
): number {
  return calculateGameXP({
    gameType: claims.gameType,
    difficulty: claims.difficulty,
    ...replayed,
    idempotencyKey: claims.attemptId,
    clientTimestamp: 0,
  });
}

/**
 * Builds the immutable base result retained by the durable replay store.
 * @param replayed Server-replayed completion facts.
 * @param xpEarned XP recorded by the canonical generic completion row.
 * @returns A non-duplicate completion result suitable for durable storage.
 */
function createBaseCompletion(
  replayed: DragonFlightReplayFacts,
  xpEarned: number,
): DragonFlightHostProofCompletion {
  return Object.freeze({ ...replayed, xpEarned, duplicate: false });
}

/**
 * Validates canonical persistence facts before they can be retained in a durable attempt result.
 * @param canonicalResult Canonical completion returned by the tenant-scoped persistence reader.
 * @param claims Signed game and difficulty identity for the attempt.
 * @param replayed Server-replayed completion facts.
 * @returns The immutable non-duplicate completion result suitable for durable storage.
 * @throws When canonical facts or XP differ from the signed replay.
 */
function createCanonicalCompletion(
  canonicalResult: DragonFlightHostProofCanonicalCompletion,
  claims: DragonFlightHostProofClaims,
  replayed: DragonFlightReplayFacts,
): DragonFlightHostProofCompletion {
  const canonical = canonicalCompletionSchema.parse(canonicalResult);
  const expectedXp = calculateExpectedDragonFlightXP(claims, replayed);
  assertCanonicalCompletionMatchesReplay(canonical, replayed, expectedXp);
  return createBaseCompletion(replayed, canonical.xpEarned);
}

/**
 * Asserts that server-derived actor identity matches the signed attempt claim.
 * @param actor Authenticated actor derived by the host route.
 * @param claims Signed opaque attempt claims.
 * @returns Nothing when the claim is bound to this active actor and tenant.
 * @throws When the actor or tenant does not match the signed claim.
 */
function assertClaimIdentity(
  actor: HostProofAttemptActor,
  claims: DragonFlightHostProofClaims,
): void {
  if (claims.userId !== actor.userId || claims.schoolId !== actor.schoolId) {
    throw new Error("Host-proof credential does not belong to this actor");
  }
}

/**
 * Determines whether the server clock is beyond a signed credential expiry.
 * @param claims Signed opaque attempt claims.
 * @param now Current server timestamp.
 * @returns True when the signed credential has expired.
 * @throws When the server clock or signed expiry timestamp is invalid.
 */
function isCredentialExpired(
  claims: DragonFlightHostProofClaims,
  now: string,
): boolean {
  const currentTime = Date.parse(now);
  const expiresAt = Date.parse(claims.expiresAt);
  if (!Number.isFinite(currentTime) || !Number.isFinite(expiresAt)) {
    throw new Error("Host-proof credential freshness timestamp is invalid");
  }
  return currentTime > expiresAt;
}

/**
 * Asserts that a signed credential is still fresh for a new completion write.
 * @param claims Signed opaque attempt claims.
 * @param now Current server timestamp.
 * @returns Nothing when the credential is still valid.
 * @throws When the credential has expired or freshness timestamps are invalid.
 */
function assertFreshCredential(
  claims: DragonFlightHostProofClaims,
  now: string,
): void {
  if (isCredentialExpired(claims, now)) {
    throw new Error("Host-proof credential has expired");
  }
}

/**
 * Asserts that a server-issued action checkpoint belongs to the active signed attempt.
 * @param actor Authenticated actor derived by the host route.
 * @param attemptClaims Validated signed attempt claims.
 * @param checkpointClaims Validated server-observed action receipt claims.
 * @returns Nothing when the checkpoint is bound to this actor, tenant, and attempt.
 * @throws When the checkpoint belongs to a different actor, attempt, or tenant.
 */
function assertActionCheckpointOwnership(
  actor: HostProofAttemptActor,
  attemptClaims: DragonFlightHostProofClaims,
  checkpointClaims: DragonFlightHostProofActionCheckpointClaims,
): void {
  if (
    checkpointClaims.attemptId !== attemptClaims.attemptId
    || checkpointClaims.userId !== actor.userId
    || checkpointClaims.schoolId !== actor.schoolId
    || checkpointClaims.expiresAt !== attemptClaims.expiresAt
  ) {
    throw new Error("Host-proof action checkpoint does not belong to this attempt actor or tenant");
  }
}

/**
 * Validates that one server-observed timestamp falls within a signed credential lifetime.
 * @param timestamp Server-issued ISO timestamp to validate.
 * @param claims Signed opaque attempt claims that define the valid time window.
 * @param label Human-readable name used only in a safe validation error.
 * @returns The parsed timestamp in milliseconds.
 * @throws When the timestamp is invalid or outside the signed credential lifetime.
 */
function assertTimestampWithinCredentialWindow(
  timestamp: string,
  claims: DragonFlightHostProofClaims,
  label: string,
): number {
  const observedAt = Date.parse(timestamp);
  const issuedAt = Date.parse(claims.issuedAt);
  const expiresAt = Date.parse(claims.expiresAt);
  if (
    !Number.isFinite(observedAt)
    || !Number.isFinite(issuedAt)
    || !Number.isFinite(expiresAt)
    || observedAt < issuedAt
    || observedAt > expiresAt
  ) {
    throw new Error(`${label} is outside the signed credential lifetime`);
  }
  return observedAt;
}

/**
 * Verifies an exact server-observed checkpoint chain before a transcript can claim persistence.
 * @param actions Untrusted ordered runtime actions supplied at completion.
 * @param checkpoints Server-issued action receipts supplied alongside the actions.
 * @param actor Authenticated actor derived by the host route.
 * @param attemptClaims Validated signed attempt claims.
 * @param secret Server-only signing secret.
 * @returns Nothing when every receipt proves the server observed this protocol sequence.
 * @throws When receipts are missing, altered, reordered, foreign, outside the credential lifetime, or bound to different actions.
 */
function assertActionCheckpointChain(
  actions: readonly DragonFlightHostProofAction[],
  checkpoints: readonly string[],
  actor: HostProofAttemptActor,
  attemptClaims: DragonFlightHostProofClaims,
  secret: string,
  gateToLaunchDwellMs: number,
): void {
  if (actions.length !== checkpoints.length) {
    throw new Error("Host-proof action checkpoint count does not match the transcript");
  }
  let previousCheckpointDigest: string | null = null;
  let previousObservedAtMilliseconds: number | undefined;
  for (const [index, action] of actions.entries()) {
    const checkpoint = checkpoints[index];
    if (checkpoint === undefined) {
      throw new Error("Host-proof action checkpoint is missing");
    }
    const checkpointClaims = verifyActionCheckpoint(checkpoint, secret);
    assertActionCheckpointOwnership(actor, attemptClaims, checkpointClaims);
    const observedAtMilliseconds = assertTimestampWithinCredentialWindow(
      checkpointClaims.observedAt,
      attemptClaims,
      "Host-proof action checkpoint",
    );
    if (previousObservedAtMilliseconds !== undefined) {
      if (observedAtMilliseconds <= previousObservedAtMilliseconds) {
        throw new Error("Host-proof action checkpoint time must strictly increase on the server");
      }
      if (
        action.kind === "launch"
        && observedAtMilliseconds - previousObservedAtMilliseconds < gateToLaunchDwellMs
      ) {
        throw new Error("Host-proof gate-to-launch server dwell is too short");
      }
    }
    if (
      checkpointClaims.sequence !== action.sequence
      || checkpointClaims.actionDigest !== digest(action)
      || checkpointClaims.previousCheckpointDigest !== previousCheckpointDigest
    ) {
      throw new Error("Host-proof action checkpoint does not match the ordered transcript");
    }
    previousCheckpointDigest = digest(checkpoint);
    previousObservedAtMilliseconds = observedAtMilliseconds;
  }
}

/**
 * Issues an opaque, short-lived Dragon Flight proof credential and server-owned vocabulary input.
 * @param actor Authenticated actor and tenant derived by the host server.
 * @param input Untrusted launch request containing only title and difficulty.
 * @param dependencies Server adapters for clock, signing, input loading, and future completion.
 * @returns Immutable attempt details for one mounted runtime cartridge.
 * @throws When external input, actor identity, server input, or signing configuration is invalid.
 */
export async function issueDragonFlightHostProofAttempt(
  actor: HostProofAttemptActor,
  input: unknown,
  dependencies: DragonFlightHostProofAttemptDependencies,
): Promise<DragonFlightHostProofAttempt> {
  const parsedActor = actorSchema.parse(actor);
  const parsedInput = issueDragonFlightHostProofAttemptSchema.parse(input);
  const issuedAt = dependencies.now();
  const expiresAt = calculateExpiry(issuedAt);
  const attemptId = z.string().uuid().parse(dependencies.createAttemptId());
  const vocabulary = vocabularyInputSchema.parse(await dependencies.loadVocabularyInput({
    userId: parsedActor.userId,
    schoolId: parsedActor.schoolId,
    gameType: parsedInput.gameType,
    difficulty: parsedInput.difficulty,
  }));
  const claims = claimsSchema.parse({
    version: 1,
    attemptId,
    userId: parsedActor.userId,
    schoolId: parsedActor.schoolId,
    gameType: parsedInput.gameType,
    difficulty: parsedInput.difficulty,
    inputDigest: digest(vocabulary),
    issuedAt,
    expiresAt,
  });

  return Object.freeze({
    attemptId,
    credential: signClaims(claims, dependencies.secret),
    input: vocabulary,
    expiresAt,
  });
}

/**
 * Records one Dragon Flight action as a server-observed, cryptographically chained protocol transition.
 *
 * This receipt proves that the server observed the authenticated action request in order. It does not
 * prove physical human play, bot resistance, answer comprehension, or any broader anti-cheat property.
 * @param actor Authenticated actor and tenant derived by the host server.
 * @param input Untrusted single-action request bound to an issued attempt.
 * @param dependencies Server ports for clock and credential signing.
 * @returns An opaque checkpoint plus the server-owned launch dwell required after a gate receipt.
 * @throws When credentials, ownership, expiry, action order, prior checkpoint, or server-observed dwell are invalid.
 */
export async function attestDragonFlightHostProofAction(
  actor: HostProofAttemptActor,
  input: unknown,
  dependencies: DragonFlightHostProofAttemptDependencies,
): Promise<DragonFlightHostProofActionAttestation> {
  const parsedActor = actorSchema.parse(actor);
  const parsedInput = attestDragonFlightHostProofActionSchema.parse(input);
  const claims = verifyClaims(parsedInput.credential, dependencies.secret);
  if (claims.attemptId !== parsedInput.attemptId) {
    throw new Error("Host-proof credential does not match the requested attempt");
  }
  const observedAt = dependencies.now();
  const gateToLaunchDwellMs = dependencies.gateToLaunchDwellMs;
  if (
    !Number.isSafeInteger(gateToLaunchDwellMs)
    || gateToLaunchDwellMs < DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS
  ) {
    throw new Error("Host-proof gate-to-launch dwell policy is invalid");
  }
  assertClaimIdentity(parsedActor, claims);
  assertFreshCredential(claims, observedAt);
  const observedAtMilliseconds = assertTimestampWithinCredentialWindow(
    observedAt,
    claims,
    "Host-proof action observation",
  );

  let previousCheckpointDigest: string | null = null;
  if (parsedInput.action.sequence === 1) {
    if (parsedInput.previousCheckpoint !== undefined) {
      throw new Error("The first Host-proof action cannot supply a previous checkpoint");
    }
  } else {
    if (parsedInput.previousCheckpoint === undefined) {
      throw new Error("Host-proof action checkpoint is required for the next action");
    }
    const previousClaims = verifyActionCheckpoint(parsedInput.previousCheckpoint, dependencies.secret);
    assertActionCheckpointOwnership(parsedActor, claims, previousClaims);
    if (previousClaims.sequence !== parsedInput.action.sequence - 1) {
      throw new Error("Host-proof action checkpoint is out of order");
    }
    const previousObservedAtMilliseconds = assertTimestampWithinCredentialWindow(
      previousClaims.observedAt,
      claims,
      "Host-proof action checkpoint",
    );
    if (observedAtMilliseconds <= previousObservedAtMilliseconds) {
      throw new Error("Host-proof action checkpoint time must strictly increase on the server");
    }
    if (
      parsedInput.action.kind === "launch"
      && observedAtMilliseconds - previousObservedAtMilliseconds < gateToLaunchDwellMs
    ) {
      throw new Error("Host-proof gate-to-launch server dwell is too short");
    }
    previousCheckpointDigest = digest(parsedInput.previousCheckpoint);
  }

  const checkpointClaims = actionCheckpointClaimsSchema.parse({
    version: 1,
    attemptId: claims.attemptId,
    userId: claims.userId,
    schoolId: claims.schoolId,
    actionDigest: digest(parsedInput.action),
    sequence: parsedInput.action.sequence,
    previousCheckpointDigest,
    observedAt,
    expiresAt: claims.expiresAt,
  });
  return Object.freeze({
    checkpoint: signActionCheckpoint(checkpointClaims, dependencies.secret),
    minimumNextActionDwellMs: parsedInput.action.kind === "choose-gate"
      ? gateToLaunchDwellMs
      : 0,
  });
}

/**
 * Verifies and completes a Dragon Flight proof using a signed attempt, ordered actions, and server-observed checkpoints.
 * @param actor Authenticated actor and tenant derived by the host server.
 * @param input Untrusted completion request containing no score, result, or vocabulary fields.
 * @param dependencies Server ports for signing, durable replay claims, and authoritative XP persistence.
 * @returns A persisted server-derived completion or its prior replay result.
 * @throws When credentials, ownership, timing, transcript, replay claim, or persistence are invalid.
 */
export async function completeDragonFlightHostProofAttempt(
  actor: HostProofAttemptActor,
  input: unknown,
  dependencies: DragonFlightHostProofAttemptDependencies,
): Promise<DragonFlightHostProofCompletion> {
  const parsedActor = actorSchema.parse(actor);
  const parsedInput = completeDragonFlightHostProofAttemptSchema.parse(input);
  const claims = verifyClaims(parsedInput.credential, dependencies.secret);
  if (claims.attemptId !== parsedInput.attemptId) {
    throw new Error("Host-proof credential does not match the requested attempt");
  }
  if (parsedInput.idempotencyKey !== claims.attemptId) {
    throw new Error("Host-proof idempotency key must equal the signed attempt identifier");
  }
  const now = dependencies.now();
  const gateToLaunchDwellMs = dependencies.gateToLaunchDwellMs;
  if (
    !Number.isSafeInteger(gateToLaunchDwellMs)
    || gateToLaunchDwellMs < DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS
  ) {
    throw new Error("Host-proof gate-to-launch dwell policy is invalid");
  }
  assertClaimIdentity(parsedActor, claims);
  const credentialExpired = isCredentialExpired(claims, now);
  assertActionCheckpointChain(
    parsedInput.actions,
    parsedInput.checkpoints,
    parsedActor,
    claims,
    dependencies.secret,
    gateToLaunchDwellMs,
  );
  const attemptId = claims.attemptId;
  const replayed = replayDragonFlight(parsedInput.actions);
  const transcriptDigest = digest({
    attemptId,
    actions: parsedInput.actions,
    checkpoints: parsedInput.checkpoints,
  });
  const claimInput = Object.freeze({
    attemptId,
    userId: claims.userId,
    schoolId: claims.schoolId,
    transcriptDigest,
    expiresAt: claims.expiresAt,
  });
  const canonicalInput = Object.freeze({
    attemptId,
    userId: claims.userId,
    schoolId: claims.schoolId,
    gameType: claims.gameType,
    difficulty: claims.difficulty,
  });

  if (credentialExpired) {
    const recovery = await dependencies.store.lookupRecovery(claimInput);
    if (recovery.kind === "replay") {
      return Object.freeze({ ...recovery.result, duplicate: true });
    }
    if (recovery.kind !== "pending") {
      throw new Error("Host-proof expired credential cannot recover the requested attempt");
    }
    const canonicalResult = await dependencies.readCanonicalCompletion(canonicalInput);
    if (!canonicalResult) {
      throw new Error("Host-proof expired credential has no canonical completion for recovery");
    }
    let result: DragonFlightHostProofCompletion;
    try {
      result = createCanonicalCompletion(canonicalResult, claims, replayed);
    } catch {
      throw new Error("Host-proof expired credential cannot reconcile the canonical completion");
    }
    await dependencies.store.complete(recovery.claimId, result);
    return Object.freeze({ ...result, duplicate: true });
  }

  assertFreshCredential(claims, now);
  const claim = await dependencies.store.begin(claimInput);
  if (claim.kind === "replay") return claim.result;
  if (claim.kind === "conflict") {
    throw new Error("Host-proof attempt has already been claimed with a different transcript");
  }

  let persisted: { readonly xpEarned: number; readonly duplicate: boolean } | undefined;
  let persistenceError: unknown;
  let persistenceFailed = false;
  try {
    persisted = await dependencies.recordCompletion({
      gameType: claims.gameType,
      difficulty: claims.difficulty,
      score: replayed.score,
      accuracy: replayed.accuracy,
      correctAnswers: replayed.correctAnswers,
      totalAttempts: replayed.totalAttempts,
      duration: replayed.duration,
      victory: replayed.victory,
      idempotencyKey: attemptId,
    });
  } catch (error) {
    persistenceFailed = true;
    persistenceError = error;
  }

  const canonicalResult = await dependencies.readCanonicalCompletion(canonicalInput);
  if (!canonicalResult) {
    if (persistenceFailed) throw persistenceError;
    throw new Error("Canonical Dragon Flight completion was not found after persistence");
  }
  const result = createCanonicalCompletion(canonicalResult, claims, replayed);
  await dependencies.store.complete(claim.claimId, result);
  return Object.freeze({
    ...result,
    duplicate: persistenceFailed || persisted?.duplicate === true,
  });

}
