import { randomUUID } from "node:crypto";

import { gameCompletions } from "@reading-advantage/db/schema";
import type { Tenant, UserContext } from "@reading-advantage/auth";
import { and, eq } from "drizzle-orm";
import type { VocabularyInput } from "@reading-advantage/game-contracts";

import type { TenantDB } from "../db-contract.js";
import { recordGameCompletion } from "./mutations.js";
import {
  DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS,
  type DragonFlightHostProofAttemptDependencies,
} from "./dragon-flight-host-proof-attempt.js";
import { createDragonFlightHostProofAttemptStore } from "./dragon-flight-host-proof-store.js";

type VocabularyRequest = Parameters<DragonFlightHostProofAttemptDependencies["loadVocabularyInput"]>[0];
type CompletionRequest = Parameters<DragonFlightHostProofAttemptDependencies["recordCompletion"]>[0];
type CanonicalCompletionRequest = Parameters<DragonFlightHostProofAttemptDependencies["readCanonicalCompletion"]>[0];

const DRAGON_FLIGHT_HOST_PROOF_VOCABULARY: VocabularyInput = [
  { term: "dragon", translation: "drago" },
];

/**
 * Resolves the server-owned Dragon Flight gate-to-launch dwell policy.
 * @param environment Server environment that may configure a test-only stricter dwell.
 * @returns The production default or a validated, stricter test-only dwell.
 * @throws When the configured test dwell is malformed, weaker than production, or enabled in production.
 */
export function resolveDragonFlightHostProofGateToLaunchDwellMs(
  environment: Partial<Pick<NodeJS.ProcessEnv, "HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS" | "NODE_ENV">> = process.env,
): number {
  const rawDwell = environment.HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS;
  if (rawDwell === undefined) {
    return DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS;
  }
  if (environment.NODE_ENV === "production") {
    throw new Error("Host-proof test dwell cannot be enabled in production");
  }
  if (!/^\d+$/u.test(rawDwell)) {
    throw new Error("Host-proof test dwell must be a whole-number integer");
  }
  const dwell = Number(rawDwell);
  if (!Number.isSafeInteger(dwell)) {
    throw new Error("Host-proof test dwell must be a safe integer");
  }
  if (dwell < DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS) {
    throw new Error(
      `Host-proof test dwell must be at least ${DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS}ms`,
    );
  }
  return dwell;
}

/**
 * Creates server-only dependencies for the bounded Dragon Flight proof fixture.
 *
 * This is deliberately a narrow corrective host-proof source, not a production
 * curriculum resolver. It keeps the current real vocabulary input on the
 * trusted side of the transport while future title cutovers bind to their
 * owning assignment/content modules.
 *
 * @param input Tenant database, authenticated user, tenant, and signing secret.
 * @returns Transport-independent dependencies for issue and completion commands.
 * @throws When the server-derived tenant has no school identifier or the authenticated user is not assigned to that school.
 */
export function createDragonFlightHostProofAttemptDependencies(input: {
  readonly db: TenantDB;
  readonly user: UserContext;
  readonly tenant: Tenant;
  readonly secret: string;
}): DragonFlightHostProofAttemptDependencies {
  if (!input.tenant.schoolId) {
    throw new Error("Dragon Flight host-proof attempts require a tenant schoolId");
  }
  if (input.user.schoolId !== input.tenant.schoolId) {
    throw new Error("Dragon Flight host-proof attempts require the authenticated user schoolId to match the tenant schoolId");
  }
  const schoolId = input.tenant.schoolId;
  const dependencies: DragonFlightHostProofAttemptDependencies = {
    secret: input.secret,
    gateToLaunchDwellMs: resolveDragonFlightHostProofGateToLaunchDwellMs(),
    now: () => new Date().toISOString(),
    createAttemptId: randomUUID,
    loadVocabularyInput: async (request: VocabularyRequest) => {
      if (request.userId !== input.user.id || request.schoolId !== schoolId) {
        throw new Error("Dragon Flight host-proof input request is not bound to the authenticated actor");
      }
      return DRAGON_FLIGHT_HOST_PROOF_VOCABULARY;
    },
    recordCompletion: async (completion: CompletionRequest) => {
      const result = await recordGameCompletion({
        db: input.db,
        user: input.user,
        tenant: input.tenant,
        input: {
          ...completion,
          clientTimestamp: Date.now(),
          metadata: {
            source: "dragon-flight-host-proof-signed-attempt",
          },
        },
      });
      return { xpEarned: result.xpEarned, duplicate: result.duplicate };
    },
    readCanonicalCompletion: async (request: CanonicalCompletionRequest) => {
      if (request.userId !== input.user.id || request.schoolId !== schoolId) {
        throw new Error("Dragon Flight canonical completion request is not bound to the authenticated actor");
      }
      const rows = await input.db
        .select({
          gameType: gameCompletions.gameType,
          difficulty: gameCompletions.difficulty,
          xpEarned: gameCompletions.xpEarned,
          score: gameCompletions.score,
          accuracy: gameCompletions.accuracy,
          correctAnswers: gameCompletions.correctAnswers,
          totalAttempts: gameCompletions.totalAttempts,
          duration: gameCompletions.duration,
          victory: gameCompletions.victory,
        })
        .from(gameCompletions)
        .where(and(
          eq(gameCompletions.schoolId, schoolId),
          eq(gameCompletions.userId, input.user.id),
          eq(gameCompletions.activityId, `game:${request.gameType}:${request.attemptId}`),
          eq(gameCompletions.gameType, request.gameType),
          eq(gameCompletions.difficulty, request.difficulty),
        ))
        .limit(1);
      const canonical = rows[0];
      if (!canonical) return null;
      if (canonical.gameType !== request.gameType || canonical.difficulty !== request.difficulty) {
        throw new Error("Dragon Flight canonical completion does not match the signed game identity");
      }
      return Object.freeze({
        xpEarned: canonical.xpEarned,
        score: canonical.score,
        accuracy: canonical.accuracy,
        correctAnswers: canonical.correctAnswers,
        totalAttempts: canonical.totalAttempts,
        duration: canonical.duration,
        victory: canonical.victory,
      });
    },
    store: createDragonFlightHostProofAttemptStore(input.db),
  };
  return Object.freeze(dependencies);
}
