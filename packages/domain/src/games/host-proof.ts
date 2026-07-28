import { AuthError, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  EXISTING_CORE_HOST_PROOF_BINDINGS,
  existingCoreHostProofCartridgeIdSchema,
  getExistingCoreHostProofBinding,
  type ExistingCoreHostProofBinding,
} from "@reading-advantage/game-contracts";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";
import { recordGameCompletion } from "./mutations.js";
import { getGameCompletions } from "./queries.js";
import { gameCompletionInputSchema, gameDifficultyEnum } from "./schema.js";

/**
 * Shared thin host adapter for the existing-core Reading/Primary host proof
 * (track `apk_existing_core_cutover_20260727`, Task 5).
 *
 * Both host apps call this module from their hidden host-proof route
 * handlers. The adapter:
 *   - restricts completions to the exact five accepted Task-4 bindings
 *     (shared contract in `@reading-advantage/game-contracts`),
 *   - derives tenant scope only from the authenticated server-side user —
 *     never from client-supplied school identifiers,
 *   - enforces `games:complete` / `games:read:own` permissions through the
 *     underlying domain functions,
 *   - keeps XP server-authoritative (`recordGameCompletion` recomputes XP;
 *     the strict request schema rejects client-supplied `xp`),
 *   - preserves race-safe fire-once idempotency via `recordGameCompletion`,
 *   - validates every outbound result through Zod before returning, and
 *   - raises structured `HostProofCompletionError`s with stable codes.
 *
 * Boundary: this adapter authorizes no production catalog exposure, no
 * retirement, no cutover, and no broader-cohort claim.
 */

/** Stable structured error codes for the host-proof boundary. */
export const HOST_PROOF_ERROR_CODES = {
  UNAUTHENTICATED: "HOST_PROOF_UNAUTHENTICATED",
  VALIDATION_FAILED: "HOST_PROOF_VALIDATION_FAILED",
  UNKNOWN_CARTRIDGE: "HOST_PROOF_UNKNOWN_CARTRIDGE",
  FORBIDDEN: "HOST_PROOF_FORBIDDEN",
  TENANT_REQUIRED: "HOST_PROOF_TENANT_REQUIRED",
  INTERNAL: "HOST_PROOF_INTERNAL",
} as const;

/** Union of the structured host-proof error codes. */
export type HostProofErrorCode =
  (typeof HOST_PROOF_ERROR_CODES)[keyof typeof HOST_PROOF_ERROR_CODES];

const HTTP_STATUS_BY_CODE: Readonly<Record<HostProofErrorCode, number>> = {
  HOST_PROOF_UNAUTHENTICATED: 401,
  HOST_PROOF_VALIDATION_FAILED: 400,
  HOST_PROOF_UNKNOWN_CARTRIDGE: 404,
  HOST_PROOF_FORBIDDEN: 403,
  HOST_PROOF_TENANT_REQUIRED: 403,
  HOST_PROOF_INTERNAL: 500,
};

/**
 * Maps a structured host-proof error code to its HTTP status.
 * @param code Structured host-proof error code.
 * @returns The HTTP status hosts must return for the code.
 */
export function hostProofErrorHttpStatus(code: HostProofErrorCode): number {
  return HTTP_STATUS_BY_CODE[code];
}

/**
 * Structured error raised at the host-proof boundary. Host route handlers
 * translate `code`/`httpStatus` verbatim into JSON error responses.
 */
export class HostProofCompletionError extends Error {
  /**
   * @param code Stable machine-readable error code.
   * @param message Human-readable summary (safe to return to clients).
   * @param issues Optional Zod issues for validation failures.
   */
  constructor(
    public readonly code: HostProofErrorCode,
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = "HostProofCompletionError";
  }

  /** HTTP status paired with `code`. */
  get httpStatus(): number {
    return hostProofErrorHttpStatus(this.code);
  }
}

/**
 * Host-proof completion request: the canonical game-completion contract with
 * `gameType` restricted to the five accepted Task-4 cartridges. Remains
 * `.strict()` so client-supplied `xp`, `schoolId`, or game-specific dead
 * fields are rejected before any persistence work.
 */
export const hostProofCompletionRequestSchema = gameCompletionInputSchema
  .extend({ gameType: existingCoreHostProofCartridgeIdSchema })
  .strict();

/** Inferred host-proof completion request type. */
export type HostProofCompletionRequest = z.infer<
  typeof hostProofCompletionRequestSchema
>;

/** Maximum number of host-proof history rows returned by one query. */
const HOST_PROOF_HISTORY_LIMIT_MAX = 100;

/**
 * Strict host-proof history input with an accepted optional cartridge filter
 * and a bounded positive integer limit.
 */
export const hostProofHistoryInputSchema = z
  .object({
    gameType: existingCoreHostProofCartridgeIdSchema.optional(),
    limit: z
      .number()
      .int()
      .positive()
      .max(HOST_PROOF_HISTORY_LIMIT_MAX)
      .optional(),
  })
  .strict();

/** Inferred host-proof history input type. */
export type HostProofHistoryInput = z.infer<typeof hostProofHistoryInputSchema>;

/**
 * Server-completed host-proof result: the canonical result contract plus the
 * accepted cartridge echo so hosts can verify binding parity end-to-end.
 */
export const hostProofCompletionResponseSchema = z.object({
  xpEarned: z.number().int().min(0),
  activityId: z.string().min(1),
  duplicate: z.boolean(),
  status: z.literal(200),
  gameType: existingCoreHostProofCartridgeIdSchema,
});

/** Inferred host-proof completion response type. */
export type HostProofCompletionResponse = z.infer<
  typeof hostProofCompletionResponseSchema
>;

/**
 * One validated host-proof history entry. Unknown columns from the wider
 * `gameCompletions` row are stripped by Zod's default object behavior. The
 * owning query applies the accepted cartridge allowlist in SQL; validation
 * fails closed if persistence nevertheless returns a row outside that set.
 */
export const hostProofHistoryEntrySchema = z.object({
  id: z.string().min(1),
  gameType: existingCoreHostProofCartridgeIdSchema,
  difficulty: gameDifficultyEnum,
  score: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  xpEarned: z.number().int().min(0),
  activityId: z.string().min(1),
  createdAt: z.date(),
});

/** Inferred host-proof history entry type. */
export type HostProofHistoryEntry = z.infer<typeof hostProofHistoryEntrySchema>;

const HOST_PROOF_CARTRIDGE_IDS = EXISTING_CORE_HOST_PROOF_BINDINGS.map(
  (binding) => binding.id,
);

/**
 * Returns the exact five accepted Task-4 cartridge bindings. Hosts render
 * navigation from this list so the hidden host-proof surface can never
 * drift from the accepted binding set.
 * @returns The frozen shared host-proof bindings.
 */
export function listHostProofCartridgeBindings(): readonly ExistingCoreHostProofBinding[] {
  return EXISTING_CORE_HOST_PROOF_BINDINGS;
}

function isAuthError(error: unknown): error is AuthError {
  return (
    error instanceof AuthError ||
    (error instanceof Error && error.name === "AuthError")
  );
}

/**
 * Asserts the authenticated user and the server-derived tenant are coherent.
 * The tenant scope must come from the server-side session — never from the
 * request payload (the strict request schema already rejects a client
 * `schoolId`). ADMIN/SYSTEM users may act on a foreign school scope;
 * every other role is pinned to its own school.
 * @param user Authenticated server-side user context.
 * @param tenant Server-derived tenant scope.
 * @throws {HostProofCompletionError} TENANT_REQUIRED when the tenant has no
 *   schoolId; FORBIDDEN on a user/tenant school mismatch.
 */
function assertHostProofTenantCoherence(user: UserContext, tenant: Tenant): void {
  if (!tenant.schoolId) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.TENANT_REQUIRED,
      "Host-proof completion requires a server-derived tenant schoolId",
    );
  }
  const privileged = user.role === "ADMIN" || user.role === "SYSTEM";
  if (!privileged && user.schoolId !== tenant.schoolId) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.FORBIDDEN,
      "User does not belong to the server-derived tenant scope",
    );
  }
}

/**
 * Records one host-proof game completion for an accepted Task-4 cartridge.
 *
 * Delegates persistence, server-authoritative XP, and race-safe fire-once
 * idempotency to `recordGameCompletion`, adding the five-cartridge binding
 * guard, user/tenant coherence, and structured error mapping.
 *
 * @param args.db TenantDB bound to the server-derived tenant.
 * @param args.user Authenticated server-side user context (null rejects).
 * @param args.tenant Server-derived tenant scope.
 * @param args.input Untrusted completion payload from the host client.
 * @returns The Zod-validated host-proof completion response.
 * @throws {HostProofCompletionError} Structured boundary error
 *   (UNAUTHENTICATED, VALIDATION_FAILED, UNKNOWN_CARTRIDGE, TENANT_REQUIRED,
 *   FORBIDDEN, or INTERNAL).
 */
export async function recordHostProofGameCompletion({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext | null;
  tenant: Tenant;
  input: unknown;
}): Promise<HostProofCompletionResponse> {
  if (!user) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.UNAUTHENTICATED,
      "Authentication is required for host-proof game completion",
    );
  }

  const baseParsed = gameCompletionInputSchema.safeParse(input);
  if (!baseParsed.success) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.VALIDATION_FAILED,
      "Host-proof completion payload failed validation",
      baseParsed.error.issues,
    );
  }

  const binding = getExistingCoreHostProofBinding(baseParsed.data.gameType);
  if (!binding) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.UNKNOWN_CARTRIDGE,
      `Cartridge ${baseParsed.data.gameType} is not one of the five accepted host-proof bindings`,
    );
  }

  assertHostProofTenantCoherence(user, tenant);

  let result;
  try {
    result = await recordGameCompletion({
      db,
      user,
      tenant,
      input: baseParsed.data,
    });
  } catch (error) {
    if (isAuthError(error)) {
      throw new HostProofCompletionError(
        HOST_PROOF_ERROR_CODES.FORBIDDEN,
        "User lacks the games:complete permission for this tenant",
      );
    }
    if (error instanceof z.ZodError) {
      throw new HostProofCompletionError(
        HOST_PROOF_ERROR_CODES.VALIDATION_FAILED,
        "Host-proof completion payload failed validation",
        error.issues,
      );
    }
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.INTERNAL,
      "Unable to persist host-proof game completion",
    );
  }

  const responseParsed = hostProofCompletionResponseSchema.safeParse({
    ...result,
    gameType: binding.id,
  });
  if (!responseParsed.success) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.INTERNAL,
      "Host-proof completion produced an invalid result",
      responseParsed.error.issues,
    );
  }
  return responseParsed.data;
}

/**
 * Returns the caller's host-proof completion history, newest first, limited
 * to the five accepted cartridges. Tenant safety is inherited from
 * `getGameCompletions`, which reads the FLAT `gameCompletions` table through
 * TenantDB auto-scoping.
 *
 * @param args.db TenantDB bound to the server-derived tenant.
 * @param args.user Authenticated server-side user context (null rejects).
 * @param args.tenant Server-derived tenant scope.
 * @param args.input Untrusted optional host-proof gameType filter and limit.
 * @returns Validated host-proof history entries.
 * @throws {HostProofCompletionError} Structured boundary error
 *   (UNAUTHENTICATED, VALIDATION_FAILED, UNKNOWN_CARTRIDGE, FORBIDDEN, or
 *   INTERNAL).
 */
export async function getHostProofGameCompletions({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext | null;
  tenant: Tenant;
  input?: unknown;
}): Promise<HostProofHistoryEntry[]> {
  if (!user) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.UNAUTHENTICATED,
      "Authentication is required for host-proof game history",
    );
  }

  const candidateGameType =
    input && typeof input === "object" && "gameType" in input
      ? (input as { gameType?: unknown }).gameType
      : undefined;
  if (
    typeof candidateGameType === "string" &&
    !getExistingCoreHostProofBinding(candidateGameType)
  ) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.UNKNOWN_CARTRIDGE,
      `Cartridge ${candidateGameType} is not one of the five accepted host-proof bindings`,
    );
  }

  const parsedInput = hostProofHistoryInputSchema.safeParse(input ?? {});
  if (!parsedInput.success) {
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.VALIDATION_FAILED,
      "Host-proof history input failed validation",
      parsedInput.error.issues,
    );
  }

  assertHostProofTenantCoherence(user, tenant);

  let rows;
  try {
    rows = await getGameCompletions({
      db,
      user,
      tenant,
      input: {
        gameTypes: HOST_PROOF_CARTRIDGE_IDS,
        ...(parsedInput.data.gameType
          ? { gameType: parsedInput.data.gameType }
          : {}),
        ...(parsedInput.data.limit !== undefined
          ? { limit: parsedInput.data.limit }
          : {}),
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      throw new HostProofCompletionError(
        HOST_PROOF_ERROR_CODES.FORBIDDEN,
        "User lacks the games:read:own permission for this tenant",
      );
    }
    throw new HostProofCompletionError(
      HOST_PROOF_ERROR_CODES.INTERNAL,
      "Unable to query host-proof game history",
    );
  }

  return rows.map((row) => {
    const parsed = hostProofHistoryEntrySchema.safeParse(row);
    if (!parsed.success) {
      throw new HostProofCompletionError(
        HOST_PROOF_ERROR_CODES.INTERNAL,
        "Host-proof history contained an invalid completion row",
        parsed.error.issues,
      );
    }
    return parsed.data;
  });
}
