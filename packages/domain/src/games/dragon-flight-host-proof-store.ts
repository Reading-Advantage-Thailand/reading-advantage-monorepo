import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { hostProofAttempts } from "@reading-advantage/db/schema";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";
import type {
  DragonFlightHostProofAttemptStore,
  DragonFlightHostProofClaim,
  DragonFlightHostProofCompletion,
  DragonFlightHostProofRecoveryLookup,
} from "./dragon-flight-host-proof-attempt.js";

const completionSchema = z.object({
  xpEarned: z.number().int().min(0),
  score: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  correctAnswers: z.number().int().min(0),
  totalAttempts: z.number().int().min(1),
  duration: z.number().int().min(0),
  victory: z.boolean(),
  duplicate: z.boolean(),
}).strict();

type BeginInput = Parameters<DragonFlightHostProofAttemptStore["begin"]>[0];

/**
 * Reads a completed attempt result without trusting JSONB persistence shape.
 * @param result JSONB result stored by the replay claim adapter.
 * @returns The validated immutable completion result, or undefined when absent.
 * @throws When persisted result JSON is malformed.
 */
function parseStoredCompletion(
  result: unknown,
): DragonFlightHostProofCompletion | undefined {
  if (result === null || result === undefined) return undefined;
  return Object.freeze({ ...completionSchema.parse(result), duplicate: false });
}

/**
 * Normalizes a completion into the immutable non-replay form retained by durable storage.
 * @param result Completion candidate supplied by the domain command.
 * @returns A validated completion whose duplicate flag is always false.
 */
function normalizeBaseCompletion(
  result: DragonFlightHostProofCompletion,
): DragonFlightHostProofCompletion {
  return Object.freeze({ ...completionSchema.parse(result), duplicate: false });
}

/**
 * Determines whether two validated completion results have the same immutable facts.
 * @param left Existing durable completion result.
 * @param right Candidate completion result for the same execution claim.
 * @returns True only when neither result could overwrite different facts.
 */
function isSameCompletion(
  left: DragonFlightHostProofCompletion,
  right: DragonFlightHostProofCompletion,
): boolean {
  return (
    left.xpEarned === right.xpEarned
    && left.score === right.score
    && left.accuracy === right.accuracy
    && left.correctAnswers === right.correctAnswers
    && left.totalAttempts === right.totalAttempts
    && left.duration === right.duration
    && left.victory === right.victory
    && left.duplicate === right.duplicate
  );
}

/**
 * Determines whether an existing durable record is the same actor-bound transcript.
 * @param record Persisted tenant-scoped attempt record.
 * @param input Candidate transcript claim.
 * @returns True only when the immutable claim facts exactly agree.
 */
function isSameClaim(
  record: {
    userId: string;
    schoolId: string;
    transcriptDigest: string;
    expiresAt: Date;
  },
  input: BeginInput,
): boolean {
  return (
    record.userId === input.userId
    && record.schoolId === input.schoolId
    && record.transcriptDigest === input.transcriptDigest
    && record.expiresAt.toISOString() === new Date(input.expiresAt).toISOString()
  );
}

/**
 * Creates the tenant-scoped durable replay-claim adapter for Dragon Flight proof attempts.
 * @param db TenantDB bound to the authenticated server-derived school.
 * @returns A store that atomically executes, replays, or rejects each signed attempt transcript.
 */
export function createDragonFlightHostProofAttemptStore(
  db: TenantDB,
): DragonFlightHostProofAttemptStore {
  const inspectExisting = async (
    input: BeginInput,
    options: { readonly reclaimAbandoned: boolean } = { reclaimAbandoned: true },
  ): Promise<DragonFlightHostProofClaim | undefined> => {
    const rows = await db
      .select({
        userId: hostProofAttempts.userId,
        schoolId: hostProofAttempts.schoolId,
        transcriptDigest: hostProofAttempts.transcriptDigest,
        expiresAt: hostProofAttempts.expiresAt,
        status: hostProofAttempts.status,
        claimId: hostProofAttempts.claimId,
        result: hostProofAttempts.result,
      })
      .from(hostProofAttempts)
      .where(eq(hostProofAttempts.attemptId, input.attemptId))
      .limit(1);
    const existing = rows[0];
    if (!existing) return undefined;
    if (!isSameClaim(existing, input)) return { kind: "conflict" };
    if (existing.status === "completed") {
      const result = parseStoredCompletion(existing.result);
      if (!result) throw new Error("Completed host-proof attempt has no result");
      return { kind: "replay", result: Object.freeze({ ...result, duplicate: true }) };
    }
    if (existing.status === "pending") {
      if (!existing.claimId) return { kind: "conflict" };
      return { kind: "recover", claimId: existing.claimId };
    }
    if (existing.status === "abandoned") {
      if (!options.reclaimAbandoned) return { kind: "conflict" };
      const claimId = randomUUID();
      const reclaimed = await db
        .update(hostProofAttempts)
        .set({ status: "pending", claimId, completedAt: null })
        .where(and(
          eq(hostProofAttempts.attemptId, input.attemptId),
          eq(hostProofAttempts.status, "abandoned"),
          eq(hostProofAttempts.transcriptDigest, input.transcriptDigest),
        ))
        .returning({ id: hostProofAttempts.id });
      return reclaimed.length > 0 ? { kind: "execute", claimId } : { kind: "conflict" };
    }
    return { kind: "conflict" };
  };

  return Object.freeze({
    async begin(input: BeginInput) {
      const existing = await inspectExisting(input);
      if (existing) return existing;
      const claimId = randomUUID();
      const inserted = await db
        .insert(hostProofAttempts)
        .values({
          attemptId: input.attemptId,
          schoolId: input.schoolId,
          userId: input.userId,
          transcriptDigest: input.transcriptDigest,
          expiresAt: new Date(input.expiresAt),
          status: "pending",
          claimId,
        })
        .onConflictDoNothing()
        .returning({ id: hostProofAttempts.id });
      if (inserted.length > 0) return { kind: "execute", claimId } as const;
      return (await inspectExisting(input)) ?? { kind: "conflict" };
    },
    async lookupRecovery(input: BeginInput): Promise<DragonFlightHostProofRecoveryLookup> {
      const existing = await inspectExisting(input, { reclaimAbandoned: false });
      if (!existing) return { kind: "missing" };
      if (existing.kind === "replay") return existing;
      if (existing.kind === "recover") {
        return { kind: "pending", claimId: existing.claimId };
      }
      return { kind: "conflict" };
    },
    async complete(claimId: string, result: DragonFlightHostProofCompletion) {
      const parsedResult = normalizeBaseCompletion(result);
      const completed = await db
        .update(hostProofAttempts)
        .set({
          status: "completed",
          result: parsedResult,
          completedAt: new Date(),
        })
        .where(and(
          eq(hostProofAttempts.claimId, claimId),
          eq(hostProofAttempts.status, "pending"),
        ))
        .returning({ id: hostProofAttempts.id });
      if (completed.length === 1) return;

      const rows = await db
        .select({
          status: hostProofAttempts.status,
          result: hostProofAttempts.result,
        })
        .from(hostProofAttempts)
        .where(eq(hostProofAttempts.claimId, claimId))
        .limit(1);
      const existing = rows[0];
      const existingResult = existing?.status === "completed"
        ? parseStoredCompletion(existing.result)
        : undefined;
      if (existingResult && isSameCompletion(existingResult, parsedResult)) return;
      throw new Error("Host-proof attempt execution claim is no longer active");
    },
    async abandon(claimId: string) {
      await db
        .update(hostProofAttempts)
        .set({ status: "abandoned" })
        .where(and(
          eq(hostProofAttempts.claimId, claimId),
          eq(hostProofAttempts.status, "pending"),
        ));
    },
  });
}
