import { createHash } from "node:crypto";

import { hostProofAttempts } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";
import type {
  DragonRiderHostProofAttemptStore,
  DragonRiderHostProofCompletion,
  DragonRiderHostProofStoredAttempt,
} from "./dragon-rider-host-proof-attempt.js";

const storedSchema = z.object({ claims: z.string().min(1), input: z.array(z.object({ term: z.string(), translation: z.string() }).strict()).min(1), checkpoints: z.array(z.string().min(1)), completion: z.object({ xpEarned: z.number().int().min(0), score: z.number().int().min(0), correctAnswers: z.number().int().min(0), totalAttempts: z.number().int().min(0), duration: z.number().int().min(0), victory: z.boolean(), duplicate: z.boolean() }).strict().optional() }).strict();

/**
 * Creates the title-local durable snapshot and receipt store for Dragon Rider attempts.
 * @param db Tenant-scoped database bound to the authenticated school.
 * @returns A store retaining immutable input, signed receipts, and one completed result per attempt.
 */
export function createDragonRiderHostProofAttemptStore(db: TenantDB): DragonRiderHostProofAttemptStore {
  const readState = async (attemptId: string) => {
    const rows = await db.select({ result: hostProofAttempts.result, status: hostProofAttempts.status }).from(hostProofAttempts).where(eq(hostProofAttempts.attemptId, attemptId)).limit(1);
    const row = rows[0];
    return row ? { state: storedSchema.parse(row.result), status: row.status } : null;
  };
  return Object.freeze({
    async issue(input) {
      const payload = storedSchema.parse(input);
      const claims = JSON.parse(Buffer.from(input.claims.split(".")[0] ?? "", "base64url").toString("utf8")) as { attemptId?: string; userId?: string; schoolId?: string; expiresAt?: string };
      if (!claims.attemptId || !claims.userId || !claims.schoolId || !claims.expiresAt) throw new Error("Dragon Rider attempt claims cannot be stored");
      await db.insert(hostProofAttempts).values({ attemptId: claims.attemptId, userId: claims.userId, schoolId: claims.schoolId, transcriptDigest: createHash("sha256").update(input.claims).digest("hex"), expiresAt: new Date(claims.expiresAt), status: "issued", result: payload }).onConflictDoNothing();
    },
    async appendCheckpoint(input) {
      const current = await readState(input.attemptId);
      if (!current || current.status !== "issued" || current.state.completion) throw new Error("Dragon Rider attempt cannot accept another receipt");
      await db.update(hostProofAttempts).set({ result: { ...current.state, checkpoints: [...current.state.checkpoints, input.checkpoint] } }).where(eq(hostProofAttempts.attemptId, input.attemptId));
    },
    async read(attemptId) {
      const current = await readState(attemptId);
      if (!current) return null;
      return Object.freeze({ claims: current.state.claims, input: current.state.input.map((item) => ({ ...item })), checkpoints: Object.freeze([...current.state.checkpoints]) });
    },
    async complete(input) {
      const current = await readState(input.attemptId);
      if (!current) throw new Error("Dragon Rider attempt is missing");
      if (current.state.completion) {
        const existing = current.state.completion;
        if (
          existing.xpEarned !== input.result.xpEarned || existing.score !== input.result.score
          || existing.correctAnswers !== input.result.correctAnswers || existing.totalAttempts !== input.result.totalAttempts
          || existing.duration !== input.result.duration || existing.victory !== input.result.victory
        ) throw new Error("Dragon Rider attempt has a conflicting durable completion");
        return Object.freeze({ ...existing, duplicate: true });
      }
      const completion = Object.freeze({ ...input.result, duplicate: false });
      await db.update(hostProofAttempts).set({ status: "completed", result: { ...current.state, completion }, completedAt: new Date() }).where(eq(hostProofAttempts.attemptId, input.attemptId));
      return completion;
    },
  } satisfies DragonRiderHostProofAttemptStore);
}
