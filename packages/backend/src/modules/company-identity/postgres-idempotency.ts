import { createHash, randomBytes } from "node:crypto";

import type postgres from "postgres";

import {
  idempotencyAcquireRequestSchema,
  idempotencyConflictBehaviorSchema,
  idempotencyFailureSettlementSchema,
  type DurableIdempotencyPort,
  type IdempotencyAcquireRequest,
  type IdempotencyAcquireResult,
  type IdempotencyConflictBehavior,
  type IdempotencyFailureSettlement,
} from "../../kernel/index.js";

interface IdentityIdempotencyRow {
  readonly request_hash: string;
  readonly state: "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  readonly owner_token_hash: string | null;
  readonly safe_result: unknown | null;
  readonly lease_expired: boolean;
  readonly record_expired: boolean;
}

/**
 * Calculates a lowercase SHA-256 digest for an opaque value.
 * @param value Opaque value to fingerprint.
 * @returns Lowercase hexadecimal digest.
 */
function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Removes the validated algorithm prefix from a kernel fingerprint.
 * @param fingerprint Validated SHA-256 fingerprint.
 * @returns Lowercase hexadecimal digest accepted by identity persistence.
 */
function fingerprintHex(fingerprint: string): string {
  return fingerprint.slice("sha256:".length);
}

/**
 * Maps a kernel capability ID into the canonical identity operation namespace.
 * @param capabilityId Validated kernel capability identifier.
 * @returns Colon-namespaced identity operation key accepted by stored-row contracts.
 * @throws When the identity operation would exceed its persistence limit.
 */
function operationKey(capabilityId: string): string {
  const operation = `capability:${capabilityId}`;
  if (operation.length > 128) {
    throw new Error("Company identity capability operation exceeds 128 characters.");
  }
  return operation;
}

/**
 * Resolves the only idempotency scope supported by company identity capabilities.
 * @param request Validated capability acquisition request.
 * @returns Canonical global identity scope key.
 * @throws When a tenant-scoped capability is supplied.
 */
function scopeKey(request: Readonly<IdempotencyAcquireRequest>): string {
  if (request.namespace.scope !== "global-capability") {
    throw new Error("Company identity capabilities require global idempotency scope.");
  }
  return "global";
}

/**
 * Acquires or replays one identity capability request under a row lock.
 * @param sql Active PostgreSQL transaction.
 * @param request Validated acquisition request.
 * @param conflict Completed-result policy.
 * @returns Ownership, replay, or a deterministic conflict.
 */
async function acquireInTransaction<TOutput>(
  sql: postgres.TransactionSql,
  request: Readonly<IdempotencyAcquireRequest>,
  conflict: IdempotencyConflictBehavior,
): Promise<IdempotencyAcquireResult<TOutput>> {
  const operation = operationKey(request.namespace.capabilityId);
  const scope = scopeKey(request);
  const keyHash = fingerprintHex(request.keyFingerprint);
  const requestHash = fingerprintHex(request.inputFingerprint);
  const ownershipToken = randomBytes(32).toString("base64url");
  const ownerHash = digest(ownershipToken);
  const inserted = await sql<readonly { id: string }[]>`
    INSERT INTO company_identity_idempotency_records (
      operation, scope_key, idempotency_key_hash, request_hash, state,
      owner_token_hash, lease_expires_at, expires_at
    ) VALUES (
      ${operation}, ${scope}, ${keyHash}, ${requestHash}, 'IN_PROGRESS',
      ${ownerHash}, now() + interval '60 seconds',
      now() + (${request.retentionSeconds} * interval '1 second')
    )
    ON CONFLICT (operation, scope_key, idempotency_key_hash) DO NOTHING
    RETURNING id::text
  `;
  if (inserted[0] !== undefined) {
    return { status: "owner", ownershipToken };
  }

  const rows = await sql<readonly IdentityIdempotencyRow[]>`
    SELECT request_hash, state, owner_token_hash, safe_result,
           lease_expires_at <= now() AS lease_expired,
           expires_at <= now() AS record_expired
      FROM company_identity_idempotency_records
     WHERE operation = ${operation}
       AND scope_key = ${scope}
       AND idempotency_key_hash = ${keyHash}
     FOR UPDATE
  `;
  const row = rows[0];
  if (row === undefined) {
    throw new Error("Company identity idempotency row disappeared during acquisition.");
  }

  const reclaim = async (): Promise<IdempotencyAcquireResult<TOutput>> => {
    const reclaimed = await sql<readonly { id: string }[]>`
      UPDATE company_identity_idempotency_records
         SET request_hash = ${requestHash}, state = 'IN_PROGRESS',
             owner_token_hash = ${ownerHash}, safe_result = NULL,
             safe_error_code = NULL, completed_at = NULL,
             lease_expires_at = now() + interval '60 seconds',
             expires_at = now() + (${request.retentionSeconds} * interval '1 second')
       WHERE operation = ${operation}
         AND scope_key = ${scope}
         AND idempotency_key_hash = ${keyHash}
      RETURNING id::text
    `;
    if (reclaimed.length !== 1) {
      throw new Error("Company identity idempotency ownership could not be reclaimed.");
    }
    return { status: "owner", ownershipToken };
  };

  if (row.record_expired) return await reclaim();
  if (row.request_hash !== requestHash) {
    return { status: "conflict", code: "IDEMPOTENCY_INPUT_CONFLICT", retryable: false };
  }
  if (row.state === "SUCCEEDED") {
    if (conflict === "reject") {
      return { status: "conflict", code: "IDEMPOTENCY_REPLAY_REJECTED", retryable: false };
    }
    if (row.safe_result === null) {
      throw new Error("Completed company identity idempotency row has no result.");
    }
    return { status: "replay", output: row.safe_result as TOutput };
  }
  if (row.state === "FAILED") {
    return { status: "conflict", code: "IDEMPOTENCY_TERMINAL", retryable: false };
  }
  if (row.lease_expired) return await reclaim();
  return { status: "conflict", code: "IDEMPOTENCY_IN_PROGRESS", retryable: true };
}

/**
 * Creates the capability idempotency port backed by the identity-owned store.
 * @param sql Least-privilege company identity PostgreSQL client.
 * @returns Durable global-capability ownership, replay, and settlement behavior.
 */
export function createCompanyIdentityDurableIdempotencyPort(
  sql: postgres.Sql,
): DurableIdempotencyPort {
  return Object.freeze({
    async acquire<TOutput>(candidate: Readonly<IdempotencyAcquireRequest>) {
      const request = idempotencyAcquireRequestSchema.parse(candidate);
      return await sql.begin(async (transaction) =>
        await acquireInTransaction<TOutput>(transaction, request, "replay"),
      );
    },

    async acquireWithPolicy<TOutput>(
      candidate: Readonly<IdempotencyAcquireRequest>,
      candidateConflict: IdempotencyConflictBehavior,
    ) {
      const request = idempotencyAcquireRequestSchema.parse(candidate);
      const conflict = idempotencyConflictBehaviorSchema.parse(candidateConflict);
      return await sql.begin(async (transaction) =>
        await acquireInTransaction<TOutput>(transaction, request, conflict),
      );
    },

    async complete<TOutput>(ownershipToken: string, output: TOutput): Promise<void> {
      const ownerHash = digest(ownershipToken);
      const rows = await sql<readonly { id: string }[]>`
        UPDATE company_identity_idempotency_records
           SET state = 'SUCCEEDED', owner_token_hash = NULL,
               lease_expires_at = NULL,
               safe_result = ${sql.json(output as postgres.JSONValue)},
               safe_error_code = NULL, completed_at = now()
         WHERE owner_token_hash = ${ownerHash}
           AND state = 'IN_PROGRESS'
        RETURNING id::text
      `;
      if (rows.length !== 1) {
        throw new Error("Company identity idempotency completion lost ownership.");
      }
    },

    async fail(candidate: Readonly<IdempotencyFailureSettlement>): Promise<void> {
      const settlement = idempotencyFailureSettlementSchema.parse(candidate);
      const ownerHash = digest(settlement.ownershipToken);
      if (settlement.disposition === "release") {
        const rows = await sql<readonly { id: string }[]>`
          DELETE FROM company_identity_idempotency_records
           WHERE owner_token_hash = ${ownerHash}
             AND state = 'IN_PROGRESS'
          RETURNING id::text
        `;
        if (rows.length !== 1) {
          throw new Error("Company identity idempotency release lost ownership.");
        }
        return;
      }
      if (settlement.disposition === "store-retryable") {
        const retryOwnerHash = digest(randomBytes(32).toString("base64url"));
        const rows = await sql<readonly { id: string }[]>`
          UPDATE company_identity_idempotency_records
             SET owner_token_hash = ${retryOwnerHash},
                 lease_expires_at = now() - interval '1 second'
           WHERE owner_token_hash = ${ownerHash}
             AND state = 'IN_PROGRESS'
          RETURNING id::text
        `;
        if (rows.length !== 1) {
          throw new Error("Company identity retryable settlement lost ownership.");
        }
        return;
      }
      const rows = await sql<readonly { id: string }[]>`
        UPDATE company_identity_idempotency_records
           SET state = 'FAILED', owner_token_hash = NULL,
               lease_expires_at = NULL, safe_result = NULL,
               safe_error_code = ${settlement.error.code}, completed_at = now()
         WHERE owner_token_hash = ${ownerHash}
           AND state = 'IN_PROGRESS'
        RETURNING id::text
      `;
      if (rows.length !== 1) {
        throw new Error("Company identity idempotency failure settlement lost ownership.");
      }
    },
  });
}
