import { randomUUID } from "node:crypto";

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
} from "./contracts/idempotency.js";
import {
  decodeDurableValue,
  encodeDurableValue,
} from "./durable-value.js";

interface IdempotencyRow {
  readonly input_fingerprint: string;
  readonly state: "owned" | "completed" | "retryable" | "terminal";
  readonly output_json: unknown | null;
}

function tenantKey(request: Readonly<IdempotencyAcquireRequest>): string {
  return request.namespace.scope === "global-capability"
    ? "__global__"
    : request.namespace.tenantId!;
}

function replayOutput(row: Readonly<IdempotencyRow>): unknown {
  if (row.output_json === null) {
    throw new Error("Completed idempotency row is missing replay output.");
  }
  return decodeDurableValue(row.output_json);
}

async function acquireInTransaction<TOutput>(
  sql: postgres.TransactionSql,
  request: Readonly<IdempotencyAcquireRequest>,
  conflict: IdempotencyConflictBehavior,
): Promise<IdempotencyAcquireResult<TOutput>> {
  const ownershipToken = randomUUID();
  const namespaceTenantKey = tenantKey(request);
  const inserted = await sql<readonly { ownership_token: string }[]>`
    INSERT INTO capability_idempotency_records (
      capability_id, scope, tenant_key, key_fingerprint, input_fingerprint,
      state, ownership_token, expires_at
    ) VALUES (
      ${request.namespace.capabilityId}, ${request.namespace.scope},
      ${namespaceTenantKey}, ${request.keyFingerprint},
      ${request.inputFingerprint}, 'owned', ${ownershipToken}::uuid,
      now() + (${request.retentionSeconds} * interval '1 second')
    )
    ON CONFLICT (
      capability_id, scope, tenant_key, key_fingerprint
    ) DO NOTHING
    RETURNING ownership_token::text
  `;
  if (inserted[0] !== undefined) {
    return { status: "owner", ownershipToken: inserted[0].ownership_token };
  }

  const rows = await sql<readonly IdempotencyRow[]>`
    SELECT input_fingerprint, state, output_json
      FROM capability_idempotency_records
     WHERE capability_id = ${request.namespace.capabilityId}
       AND scope = ${request.namespace.scope}
       AND tenant_key = ${namespaceTenantKey}
       AND key_fingerprint = ${request.keyFingerprint}
     FOR UPDATE
  `;
  const row = rows[0];
  if (row === undefined) {
    throw new Error("Idempotency row disappeared during atomic acquisition.");
  }
  const reclaimed = await sql<readonly { ownership_token: string }[]>`
    UPDATE capability_idempotency_records
       SET input_fingerprint = ${request.inputFingerprint},
           state = 'owned',
           ownership_token = ${ownershipToken}::uuid,
           output_json = NULL,
           error_json = NULL,
           expires_at = now() + (${request.retentionSeconds} * interval '1 second'),
           updated_at = now()
     WHERE capability_id = ${request.namespace.capabilityId}
       AND scope = ${request.namespace.scope}
       AND tenant_key = ${namespaceTenantKey}
       AND key_fingerprint = ${request.keyFingerprint}
       AND expires_at <= now()
    RETURNING ownership_token::text
  `;
  if (reclaimed[0] !== undefined) {
    return { status: "owner", ownershipToken: reclaimed[0].ownership_token };
  }
  if (row.input_fingerprint !== request.inputFingerprint) {
    return {
      status: "conflict",
      code: "IDEMPOTENCY_INPUT_CONFLICT",
      retryable: false,
    };
  }
  if (row.state === "completed") {
    if (conflict === "reject") {
      return {
        status: "conflict",
        code: "IDEMPOTENCY_REPLAY_REJECTED",
        retryable: false,
      };
    }
    return { status: "replay", output: replayOutput(row) as TOutput };
  }
  if (row.state === "terminal") {
    return {
      status: "conflict",
      code: "IDEMPOTENCY_TERMINAL",
      retryable: false,
    };
  }

  const acquired = await sql<readonly { ownership_token: string }[]>`
    UPDATE capability_idempotency_records
       SET state = 'owned',
           ownership_token = ${ownershipToken}::uuid,
           error_json = NULL,
           expires_at = now() + (${request.retentionSeconds} * interval '1 second'),
           updated_at = now()
     WHERE capability_id = ${request.namespace.capabilityId}
       AND scope = ${request.namespace.scope}
       AND tenant_key = ${namespaceTenantKey}
       AND key_fingerprint = ${request.keyFingerprint}
       AND state = 'retryable'
    RETURNING ownership_token::text
  `;
  if (acquired[0] !== undefined) {
    return { status: "owner", ownershipToken: acquired[0].ownership_token };
  }
  return {
    status: "conflict",
    code: "IDEMPOTENCY_IN_PROGRESS",
    retryable: true,
  };
}

/**
 * Creates a durable idempotency adapter backed by PostgreSQL transactions.
 * @param sql A dedicated postgres.js client configured by runtime composition.
 * @returns A fingerprint-only atomic ownership and replay adapter.
 */
export function createPostgresDurableIdempotencyPort(
  sql: postgres.Sql,
): DurableIdempotencyPort {
  return Object.freeze({
    async acquire<TOutput>(
      candidate: Readonly<IdempotencyAcquireRequest>,
    ): Promise<IdempotencyAcquireResult<TOutput>> {
      const request = idempotencyAcquireRequestSchema.parse(candidate);
      return await sql.begin(async (transaction) =>
        await acquireInTransaction<TOutput>(transaction, request, "replay"),
      );
    },

    async acquireWithPolicy<TOutput>(
      candidate: Readonly<IdempotencyAcquireRequest>,
      candidateConflict: IdempotencyConflictBehavior,
    ): Promise<IdempotencyAcquireResult<TOutput>> {
      const request = idempotencyAcquireRequestSchema.parse(candidate);
      const conflict = idempotencyConflictBehaviorSchema.parse(candidateConflict);
      return await sql.begin(async (transaction) =>
        await acquireInTransaction<TOutput>(transaction, request, conflict),
      );
    },

    async complete<TOutput>(
      ownershipToken: string,
      output: TOutput,
    ): Promise<void> {
      const encodedOutput = encodeDurableValue(output);
      const rows = await sql<readonly { id: string }[]>`
        UPDATE capability_idempotency_records
           SET state = 'completed',
               ownership_token = NULL,
               output_json = ${sql.json(
                 encodedOutput as unknown as postgres.JSONValue,
               )},
               error_json = NULL,
               updated_at = now()
         WHERE ownership_token = ${ownershipToken}::uuid
           AND state = 'owned'
        RETURNING id::text
      `;
      if (rows.length !== 1) {
        throw new Error("Idempotency completion lost ownership.");
      }
    },

    async fail(
      candidate: Readonly<IdempotencyFailureSettlement>,
    ): Promise<void> {
      const settlement = idempotencyFailureSettlementSchema.parse(candidate);
      if (settlement.disposition === "release") {
        const rows = await sql<readonly { id: string }[]>`
          DELETE FROM capability_idempotency_records
           WHERE ownership_token = ${settlement.ownershipToken}::uuid
             AND state = 'owned'
          RETURNING id::text
        `;
        if (rows.length !== 1) {
          throw new Error("Idempotency release lost ownership.");
        }
        return;
      }
      const nextState = settlement.disposition === "store-retryable"
        ? "retryable"
        : "terminal";
      const rows = await sql<readonly { id: string }[]>`
        UPDATE capability_idempotency_records
           SET state = ${nextState},
               ownership_token = NULL,
               output_json = NULL,
               error_json = ${sql.json(settlement.error)},
               updated_at = now()
         WHERE ownership_token = ${settlement.ownershipToken}::uuid
           AND state = 'owned'
        RETURNING id::text
      `;
      if (rows.length !== 1) {
        throw new Error("Idempotency failure settlement lost ownership.");
      }
    },
  });
}
