import { randomUUID } from "node:crypto";

import type { Tenant, UserContext } from "@reading-advantage/auth";
import { gameCompletions } from "@reading-advantage/db/schema";
import { and, eq } from "drizzle-orm";
import type { VocabularyInput } from "@reading-advantage/game-contracts";

import type { TenantDB } from "../db-contract.js";
import { recordGameCompletion } from "./mutations.js";
import type { DragonRiderHostProofAttemptDependencies } from "./dragon-rider-host-proof-attempt.js";
import { createDragonRiderHostProofAttemptStore } from "./dragon-rider-host-proof-store.js";

const DRAGON_RIDER_HOST_PROOF_VOCABULARY = Object.freeze([
  { term: "dragon", translation: "drago" },
  { term: "rider", translation: "jinete" },
  { term: "gate", translation: "puerta" },
  { term: "fire", translation: "fuego" },
]);

/**
 * Creates title-local server dependencies for Dragon Rider signed attempts.
 * @param input Authenticated tenant database, user, tenant scope, and signing secret.
 * @returns Server-only domain dependencies with user and school scope pinned to the session.
 * @throws When a tenant has no school or the authenticated user is from another school.
 */
export function createDragonRiderHostProofAttemptDependencies(input: {
  readonly db: TenantDB;
  readonly user: UserContext;
  readonly tenant: Tenant;
  readonly secret: string;
}): DragonRiderHostProofAttemptDependencies {
  if (!input.tenant.schoolId || input.user.schoolId !== input.tenant.schoolId) {
    throw new Error("Dragon Rider host-proof attempts require an authenticated user in the tenant school");
  }
  const schoolId = input.tenant.schoolId;
  return Object.freeze({
    secret: input.secret,
    now: () => new Date().toISOString(),
    createAttemptId: randomUUID,
    createSeed: () => randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", ""),
    store: createDragonRiderHostProofAttemptStore(input.db),
    loadVocabularyInput: async (request) => {
      if (request.userId !== input.user.id || request.schoolId !== schoolId || request.gameType !== "dragon-rider") {
        throw new Error("Dragon Rider vocabulary request is not bound to the authenticated actor");
      }
      const vocabulary: VocabularyInput = DRAGON_RIDER_HOST_PROOF_VOCABULARY.map(({ term, translation }) => ({ term, translation }));
      return vocabulary;
    },
    recordCompletion: async (completion) => {
      const saved = await recordGameCompletion({
        db: input.db,
        user: input.user,
        tenant: input.tenant,
        input: {
          ...completion,
          clientTimestamp: 0,
          metadata: { source: "dragon-rider-host-proof-signed-attempt" },
        },
      });
      if (!saved.duplicate) return { xpEarned: saved.xpEarned, duplicate: false };
      const rows = await input.db.select({ xpEarned: gameCompletions.xpEarned }).from(gameCompletions).where(and(
        eq(gameCompletions.schoolId, schoolId),
        eq(gameCompletions.userId, input.user.id),
        eq(gameCompletions.activityId, `game:dragon-rider:${completion.idempotencyKey}`),
      )).limit(1);
      const canonical = rows[0];
      if (!canonical) throw new Error("Dragon Rider duplicate completion has no canonical result");
      return { xpEarned: canonical.xpEarned, duplicate: true };
    },
  } satisfies DragonRiderHostProofAttemptDependencies);
}
