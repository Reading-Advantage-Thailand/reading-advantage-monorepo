import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { vocabularyInputSchema, type VocabularyInput } from "@reading-advantage/game-contracts";
import {
  dragonRiderHostProofClientActionSubmissionSchema,
  replayDragonRiderHostProofTranscript,
  type DragonRiderHostProofAction,
  type DragonRiderHostProofRecordedAction,
} from "@reading-advantage/game-cartridges/dragon-rider-host-proof";
import { z } from "zod";

import { gameDifficultyEnum } from "./schema.js";

/** Duration in milliseconds for which a Dragon Rider attempt credential remains valid. */
export const DRAGON_RIDER_HOST_PROOF_ATTEMPT_TTL_MS = 10 * 60 * 1_000;

/** Authenticated server actor bound to a Dragon Rider proof attempt. */
export interface DragonRiderHostProofActor {
  /** Authenticated user identifier. */
  readonly userId: string;
  /** Server-derived tenant school identifier. */
  readonly schoolId: string;
}

/** Server-owned data issued to one Dragon Rider client session. */
export interface DragonRiderHostProofAttempt {
  /** Opaque attempt identifier used as the persistence idempotency key. */
  readonly attemptId: string;
  /** Signed actor-, school-, input-, and expiry-bound credential. */
  readonly credential: string;
  /** Server-loaded vocabulary for the deterministic gate rounds. */
  readonly input: VocabularyInput;
  /** Deterministic seed bound into the credential and replay. */
  readonly seed: string;
  /** Credential expiration timestamp. */
  readonly expiresAt: string;
}

/** Signed server observation of exactly one ordered Dragon Rider input. */
export interface DragonRiderHostProofActionAttestation {
  /** Opaque action receipt included unchanged in completion. */
  readonly checkpoint: string;
}

/** Server-derived result persisted through the canonical game-completion boundary. */
export interface DragonRiderHostProofCompletion {
  /** XP awarded by the canonical persistence boundary. */
  readonly xpEarned: number;
  /** Replay-derived title score. */
  readonly score: number;
  /** Replay-derived correct gate count. */
  readonly correctAnswers: number;
  /** Replay-derived gate attempt count. */
  readonly totalAttempts: number;
  /** Elapsed time derived from server receipt timestamps. */
  readonly duration: number;
  /** Whether the transcript completed every gate and boss transition. */
  readonly victory: boolean;
  /** Whether the canonical persistence boundary replayed an existing attempt. */
  readonly duplicate: boolean;
}

/** Immutable server-owned snapshot and ordered receipts retained for one issued attempt. */
export interface DragonRiderHostProofStoredAttempt {
  /** Signed attempt claims retained without trusting a later content loader. */
  readonly claims: string;
  /** Exact vocabulary snapshot loaded when the credential was issued. */
  readonly input: VocabularyInput;
  /** Signed server action receipts in their durable server-observed order. */
  readonly checkpoints: readonly string[];
}

/** Durable title-local state store for issued snapshots, server receipts, and fire-once results. */
export interface DragonRiderHostProofAttemptStore {
  /** Persists the immutable snapshot before it is exposed to the client. */
  issue(input: DragonRiderHostProofStoredAttempt): Promise<void>;
  /** Appends one verified server receipt to the immutable attempt sequence. */
  appendCheckpoint(input: { readonly attemptId: string; readonly checkpoint: string }): Promise<void>;
  /** Reads the server-owned snapshot and receipts for an authenticated attempt. */
  read(attemptId: string): Promise<DragonRiderHostProofStoredAttempt | null>;
  /** Retains one canonical completion or returns the original result on a retry. */
  complete(input: { readonly attemptId: string; readonly result: DragonRiderHostProofCompletion }): Promise<DragonRiderHostProofCompletion>;
}

/** External dependencies required by the transport-independent Dragon Rider commands. */
export interface DragonRiderHostProofAttemptDependencies {
  /** High-entropy secret for attempt and checkpoint HMACs. */
  readonly secret: string;
  /** Supplies a server-owned ISO timestamp. */
  readonly now: () => string;
  /** Creates an opaque UUID attempt identifier. */
  readonly createAttemptId: () => string;
  /** Creates a high-entropy seed after server authorization. */
  readonly createSeed: () => string;
  /** Loads learner vocabulary using server-derived actor and tenant scope. */
  readonly loadVocabularyInput: (input: {
    readonly userId: string;
    readonly schoolId: string;
    readonly gameType: "dragon-rider";
    readonly difficulty: z.infer<typeof gameDifficultyEnum>;
  }) => Promise<VocabularyInput>;
  /** Persists canonical completion facts and computes authoritative XP. */
  readonly recordCompletion: (input: {
    readonly gameType: "dragon-rider";
    readonly difficulty: z.infer<typeof gameDifficultyEnum>;
    readonly score: number;
    readonly accuracy: number;
    readonly correctAnswers: number;
    readonly totalAttempts: number;
    readonly duration: number;
    readonly victory: boolean;
    readonly idempotencyKey: string;
  }) => Promise<{ readonly xpEarned: number; readonly duplicate: boolean }>;
  /** Durable title-local storage for frozen snapshots and server-generated receipts. */
  readonly store: DragonRiderHostProofAttemptStore;
}

const actorSchema = z.object({ userId: z.string().min(1), schoolId: z.string().min(1) }).strict();

/** Strict request accepted to issue a server-owned Dragon Rider session. */
export const issueDragonRiderHostProofAttemptSchema = z.object({
  gameType: z.literal("dragon-rider"),
  difficulty: gameDifficultyEnum,
}).strict();

/** Strict request that asks the server to observe one title-owned action. */
export const attestDragonRiderHostProofActionSchema = dragonRiderHostProofClientActionSubmissionSchema.extend({
  attemptId: z.string().uuid(),
}).strict();

/** Strict request that submits only signed action receipts for server replay. */
export const completeDragonRiderHostProofAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  credential: z.string().min(1),
}).strict();

const claimsSchema = z.object({
  version: z.literal(1), attemptId: z.string().uuid(), userId: z.string().min(1), schoolId: z.string().min(1),
  gameType: z.literal("dragon-rider"), difficulty: gameDifficultyEnum, seed: z.string().min(16),
  inputDigest: z.string().regex(/^[a-f0-9]{64}$/u), issuedAt: z.string().datetime(), expiresAt: z.string().datetime(),
}).strict();
const checkpointSchema = z.object({
  version: z.literal(1), attemptId: z.string().uuid(), userId: z.string().min(1), schoolId: z.string().min(1),
  sequence: z.number().int().positive(), action: dragonRiderHostProofClientActionSubmissionSchema.shape.action, actionDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  previousCheckpointDigest: z.string().regex(/^[a-f0-9]{64}$/u).nullable(), observedAt: z.string().datetime(), expiresAt: z.string().datetime(),
}).strict();
type Claims = z.infer<typeof claimsSchema>;
type CheckpointClaims = z.infer<typeof checkpointSchema>;

/**
 * Produces a stable digest for the exact JSON value represented by a signed claim.
 * @param value JSON-safe data to digest.
 * @returns Lowercase SHA-256 text.
 */
function digest(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

/**
 * Signs server-owned claims with a minimum-length HMAC secret.
 * @param claims Validated immutable claims.
 * @param secret Server-only signing secret.
 * @returns Opaque payload and signature credential.
 * @throws When the secret is too short for this boundary.
 */
function sign(claims: Claims | CheckpointClaims, secret: string): string {
  if (secret.length < 32) throw new Error("Dragon Rider host-proof signing secret must contain at least 32 characters");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

/**
 * Verifies an HMAC-signed payload before parsing its claim data.
 * @param value Candidate opaque credential or checkpoint.
 * @param secret Server-only signing secret.
 * @param schema Exact schema expected from the signed payload.
 * @returns Validated claims.
 * @throws When the value is malformed, altered, or not valid for the supplied schema.
 */
function verify<T extends z.ZodType>(value: string, secret: string, schema: T): z.infer<T> {
  const [payload, supplied, ...extra] = value.split(".");
  if (!payload || !supplied || extra.length > 0 || secret.length < 32) throw new Error("Dragon Rider host-proof credential is malformed");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("Dragon Rider host-proof credential signature is invalid");
  try { return schema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))); }
  catch { throw new Error("Dragon Rider host-proof credential payload is invalid"); }
}

/**
 * Calculates the server-derived matching gate for one frozen vocabulary round.
 * @param seed Signed attempt seed.
 * @param index Zero-based vocabulary round index.
 * @returns The route that matches this round's vocabulary prompt.
 */
function correctGate(seed: string, index: number): "left" | "right" {
  const offset = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2;
  return (offset + index) % 2 === 0 ? "left" : "right";
}

/**
 * Asserts that a server actor matches an immutable signed attempt claim.
 * @param actor Authenticated server actor.
 * @param claims Signed attempt claims.
 * @returns Nothing when actor and tenant are exact matches.
 * @throws When the credential belongs to another user or school.
 */
function assertIdentity(actor: DragonRiderHostProofActor, claims: Claims): void {
  if (actor.userId !== claims.userId || actor.schoolId !== claims.schoolId) throw new Error("Dragon Rider credential does not belong to this actor");
}

/**
 * Validates a signed attempt clock window against a server timestamp.
 * @param claims Signed attempt claims.
 * @param now Server-owned current timestamp.
 * @returns Nothing when the credential remains fresh.
 * @throws When the clock data is invalid or the credential has expired.
 */
function assertFresh(claims: Claims, now: string): void {
  const current = Date.parse(now); const expires = Date.parse(claims.expiresAt);
  if (!Number.isFinite(current) || !Number.isFinite(expires) || current > expires) throw new Error("Dragon Rider host-proof credential has expired");
}

/**
 * Issues server-loaded input and a short-lived signed Dragon Rider attempt.
 * @param actor Authenticated actor and server-derived tenant.
 * @param input Untrusted request containing only title and difficulty.
 * @param dependencies Server adapters for identity-safe input and signing.
 * @returns A client-mountable signed attempt with immutable vocabulary and seed.
 */
export async function issueDragonRiderHostProofAttempt(actor: DragonRiderHostProofActor, input: unknown, dependencies: DragonRiderHostProofAttemptDependencies): Promise<DragonRiderHostProofAttempt> {
  const safeActor = actorSchema.parse(actor); const request = issueDragonRiderHostProofAttemptSchema.parse(input);
  const issuedAt = dependencies.now(); const issuedMilliseconds = Date.parse(issuedAt);
  if (!Number.isFinite(issuedMilliseconds)) throw new Error("Dragon Rider host-proof clock returned an invalid timestamp");
  const attemptId = z.string().uuid().parse(dependencies.createAttemptId()); const seed = z.string().min(16).parse(dependencies.createSeed());
  const vocabulary = vocabularyInputSchema.parse(await dependencies.loadVocabularyInput({ ...safeActor, gameType: request.gameType, difficulty: request.difficulty }));
  const expiresAt = new Date(issuedMilliseconds + DRAGON_RIDER_HOST_PROOF_ATTEMPT_TTL_MS).toISOString();
  const claims = claimsSchema.parse({ version: 1, attemptId, ...safeActor, gameType: request.gameType, difficulty: request.difficulty, seed, inputDigest: digest(vocabulary), issuedAt, expiresAt });
  const credential = sign(claims, dependencies.secret);
  await dependencies.store.issue(Object.freeze({ claims: credential, input: vocabulary, checkpoints: Object.freeze([]) }));
  return Object.freeze({ attemptId, credential, input: vocabulary, seed, expiresAt });
}

/**
 * Attests a single ordered Dragon Rider transition as observed by the server.
 * @param actor Authenticated actor and server-derived tenant.
 * @param input Untrusted action submission with the prior signed receipt.
 * @param dependencies Server clock and signing adapters.
 * @returns A signed receipt which binds the action to this actor and prior receipt.
 */
export async function attestDragonRiderHostProofAction(actor: DragonRiderHostProofActor, input: unknown, dependencies: DragonRiderHostProofAttemptDependencies): Promise<DragonRiderHostProofActionAttestation> {
  const safeActor = actorSchema.parse(actor); const request = attestDragonRiderHostProofActionSchema.parse(input); const claims = verify(request.credential, dependencies.secret, claimsSchema);
  if (request.attemptId !== claims.attemptId) throw new Error("Dragon Rider credential does not match the requested attempt");
  assertIdentity(safeActor, claims); const observedAt = dependencies.now(); assertFresh(claims, observedAt);
  let previousCheckpointDigest: string | null = null;
  if (request.action.sequence === 1) {
    if (request.previousCheckpoint !== undefined) throw new Error("The first Dragon Rider action cannot supply a prior checkpoint");
  } else {
    if (!request.previousCheckpoint) throw new Error("Dragon Rider action requires the prior checkpoint");
    const previous = verify(request.previousCheckpoint, dependencies.secret, checkpointSchema);
    if (previous.attemptId !== claims.attemptId || previous.userId !== claims.userId || previous.schoolId !== claims.schoolId || previous.sequence !== request.action.sequence - 1 || previous.expiresAt !== claims.expiresAt) throw new Error("Dragon Rider action checkpoint is out of order");
    previousCheckpointDigest = digest(request.previousCheckpoint);
  }
  const checkpoint = checkpointSchema.parse({ version: 1, attemptId: claims.attemptId, userId: claims.userId, schoolId: claims.schoolId, sequence: request.action.sequence, action: request.action, actionDigest: digest(request.action), previousCheckpointDigest, observedAt, expiresAt: claims.expiresAt });
  const signedCheckpoint = sign(checkpoint, dependencies.secret);
  await dependencies.store.appendCheckpoint({ attemptId: claims.attemptId, checkpoint: signedCheckpoint });
  return Object.freeze({ checkpoint: signedCheckpoint });
}

/**
 * Verifies signed receipts, replays Dragon Rider rules, and persists canonical completion facts.
 * @param actor Authenticated actor and server-derived tenant.
 * @param input Untrusted transcript containing no client score, XP, victory, content, or elapsed claims.
 * @param dependencies Server adapters for replay inputs and canonical persistence.
 * @returns The server-derived canonical result or its idempotent replay.
 */
export async function completeDragonRiderHostProofAttempt(actor: DragonRiderHostProofActor, input: unknown, dependencies: DragonRiderHostProofAttemptDependencies): Promise<DragonRiderHostProofCompletion> {
  const safeActor = actorSchema.parse(actor); const request = completeDragonRiderHostProofAttemptSchema.parse(input); const claims = verify(request.credential, dependencies.secret, claimsSchema);
  if (request.attemptId !== claims.attemptId) throw new Error("Dragon Rider completion does not match the signed attempt");
  const completedAt = dependencies.now();
  assertIdentity(safeActor, claims); assertFresh(claims, completedAt);
  const stored = await dependencies.store.read(claims.attemptId);
  if (!stored || stored.claims !== request.credential) throw new Error("Dragon Rider stored attempt is missing or does not match its credential");
  let prior: string | null = null; let firstObserved: number | undefined; let lastObserved: number | undefined;
  const recordedActions: DragonRiderHostProofRecordedAction[] = [];
  for (const [index, checkpoint] of stored.checkpoints.entries()) {
    const receipt = verify(checkpoint, dependencies.secret, checkpointSchema);
    if (receipt.attemptId !== claims.attemptId || receipt.userId !== claims.userId || receipt.schoolId !== claims.schoolId || receipt.expiresAt !== claims.expiresAt || receipt.sequence !== index + 1 || receipt.actionDigest !== digest(receipt.action) || receipt.previousCheckpointDigest !== prior) throw new Error("Dragon Rider action checkpoint does not match the signed transcript");
    const observed = Date.parse(receipt.observedAt); if (!Number.isFinite(observed) || observed < Date.parse(claims.issuedAt) || observed > Date.parse(claims.expiresAt) || (lastObserved !== undefined && observed <= lastObserved)) throw new Error("Dragon Rider checkpoint time is invalid");
    firstObserved ??= observed; lastObserved = observed; prior = digest(checkpoint);
    recordedActions.push(Object.freeze({ action: receipt.action, observedElapsedMs: observed - Date.parse(claims.issuedAt) }));
  }
  const vocabulary = vocabularyInputSchema.parse(stored.input);
  if (digest(vocabulary) !== claims.inputDigest || !firstObserved || !lastObserved) throw new Error("Dragon Rider frozen attempt snapshot cannot be replayed");
  const terminalElapsedMs = Date.parse(completedAt) - Date.parse(claims.issuedAt);
  const replay = replayDragonRiderHostProofTranscript(vocabulary, claims.seed, recordedActions, terminalElapsedMs);
  if (!replay.victory) throw new Error("Dragon Rider transcript is not victorious");
  const persisted = await dependencies.recordCompletion({ gameType: claims.gameType, difficulty: claims.difficulty, score: replay.score, accuracy: replay.correctAnswers / replay.totalAttempts, correctAnswers: replay.correctAnswers, totalAttempts: replay.totalAttempts, duration: replay.elapsedMs, victory: replay.victory, idempotencyKey: claims.attemptId });
  const completed = await dependencies.store.complete({ attemptId: claims.attemptId, result: Object.freeze({ xpEarned: persisted.xpEarned, score: replay.score, correctAnswers: replay.correctAnswers, totalAttempts: replay.totalAttempts, duration: replay.elapsedMs, victory: replay.victory, duplicate: persisted.duplicate }) });
  return Object.freeze({ ...completed, duplicate: persisted.duplicate || completed.duplicate });
}
