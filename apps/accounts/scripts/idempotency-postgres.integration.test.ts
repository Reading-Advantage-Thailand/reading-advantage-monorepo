import { createHash } from "node:crypto";

import {
  createCompanyIdentityDurableIdempotencyPort,
  type IdempotencyAcquireRequest,
} from "@reading-advantage/backend";
import {
  companyIdentityIdempotencyStoredRowSchema,
} from "@reading-advantage/db/company-identity";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.COMPANY_IDENTITY_PG_TEST_URL;
const postgresSuite = DATABASE_URL === undefined ? describe.skip : describe;
const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const capabilityIds = {
  atomic: `company-identity.integration-${suffix}.atomic`,
  retry: `company-identity.integration-${suffix}.retry`,
  terminal: `company-identity.integration-${suffix}.terminal`,
  expired: `company-identity.integration-${suffix}.expired`,
};
const operationKeys = Object.values(capabilityIds).map((id) => `capability:${id}`);

/**
 * Calculates the kernel SHA-256 fingerprint form used by the adapter boundary.
 * @param value Deterministic test input.
 * @returns Prefixed lowercase SHA-256 fingerprint.
 */
function fingerprint(value: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

/**
 * Creates one globally scoped company identity acquisition request.
 * @param capabilityId Unique integration capability identifier.
 * @param input Deterministic input fingerprint source.
 * @returns Valid acquisition request for the identity adapter.
 */
function request(
  capabilityId: string,
  input = "identity-integration-input",
): IdempotencyAcquireRequest {
  return {
    namespace: { capabilityId, scope: "global-capability" },
    keyFingerprint: fingerprint(`${capabilityId}:key`),
    inputFingerprint: fingerprint(input),
    retentionSeconds: 3_600,
  };
}

let first: ReturnType<typeof postgres> | undefined;
let second: ReturnType<typeof postgres> | undefined;

postgresSuite("Accounts identity idempotency PostgreSQL composition", () => {
  beforeAll(() => {
    if (DATABASE_URL === undefined) return;
    first = postgres(DATABASE_URL, { max: 1 });
    second = postgres(DATABASE_URL, { max: 1 });
  });

  afterAll(async () => {
    if (first !== undefined) {
      await first`
        DELETE FROM company_identity_idempotency_records
         WHERE operation IN ${first(operationKeys)}
      `;
    }
    await first?.end({ timeout: 5 });
    await second?.end({ timeout: 5 });
  });

  it("proves atomic ownership, canonical rows, replay, and settlement semantics", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Company identity PostgreSQL clients were not initialized.");
    }
    const firstPort = createCompanyIdentityDurableIdempotencyPort(first);
    const secondPort = createCompanyIdentityDurableIdempotencyPort(second);
    const atomicRequest = request(capabilityIds.atomic);
    const raced = await Promise.all([
      firstPort.acquire<{ value: number }>(atomicRequest),
      secondPort.acquire<{ value: number }>(atomicRequest),
    ]);
    const ownerIndex = raced.findIndex((result) => result.status === "owner");
    const conflict = raced.find((result) => result.status === "conflict");
    expect(ownerIndex).toBeGreaterThanOrEqual(0);
    expect(conflict).toMatchObject({
      status: "conflict",
      code: "IDEMPOTENCY_IN_PROGRESS",
      retryable: true,
    });
    const owner = raced[ownerIndex];
    if (owner?.status !== "owner") throw new Error("Atomic owner was not acquired.");
    const ownerPort = ownerIndex === 0 ? firstPort : secondPort;
    const replayPort = ownerIndex === 0 ? secondPort : firstPort;
    await ownerPort.complete(owner.ownershipToken, { value: 7 });
    await expect(replayPort.acquire(atomicRequest)).resolves.toEqual({
      status: "replay",
      output: { value: 7 },
    });
    await expect(replayPort.acquireWithPolicy?.(atomicRequest, "reject")).resolves
      .toMatchObject({ status: "conflict", code: "IDEMPOTENCY_REPLAY_REJECTED" });
    await expect(replayPort.acquire(request(
      capabilityIds.atomic,
      "different-input",
    ))).resolves.toMatchObject({
      status: "conflict",
      code: "IDEMPOTENCY_INPUT_CONFLICT",
    });

    const [row] = await first<readonly {
      id: string; operation: string; scope_key: string;
      idempotency_key_hash: string; request_hash: string; state: "SUCCEEDED";
      owner_token_hash: string | null; safe_result: unknown;
      safe_error_code: string | null; created_at: Date; lease_expires_at: Date | null;
      completed_at: Date | null; expires_at: Date;
    }[]>`
      SELECT id::text, operation, scope_key, idempotency_key_hash, request_hash,
             state, owner_token_hash, safe_result, safe_error_code, created_at,
             lease_expires_at, completed_at, expires_at
        FROM company_identity_idempotency_records
       WHERE operation = ${`capability:${capabilityIds.atomic}`}
    `;
    expect(companyIdentityIdempotencyStoredRowSchema.safeParse({
      id: row?.id,
      operation: row?.operation,
      scopeKey: row?.scope_key,
      idempotencyKeyHash: row?.idempotency_key_hash,
      requestHash: row?.request_hash,
      state: row?.state,
      ownerTokenHash: row?.owner_token_hash,
      safeResult: row?.safe_result,
      safeErrorCode: row?.safe_error_code,
      createdAt: row?.created_at,
      leaseExpiresAt: row?.lease_expires_at,
      completedAt: row?.completed_at,
      expiresAt: row?.expires_at,
    }).success).toBe(true);

    const retryRequest = request(capabilityIds.retry);
    const retryOwner = await firstPort.acquire(retryRequest);
    if (retryOwner.status !== "owner") throw new Error("Retry owner was not acquired.");
    await firstPort.fail({
      ownershipToken: retryOwner.ownershipToken,
      error: { code: "RETRYABLE_FAILURE", message: "Retry later.", retryable: true },
      disposition: "store-retryable",
    });
    await expect(secondPort.acquire(retryRequest)).resolves.toMatchObject({ status: "owner" });

    const terminalRequest = request(capabilityIds.terminal);
    const terminalOwner = await firstPort.acquire(terminalRequest);
    if (terminalOwner.status !== "owner") throw new Error("Terminal owner was not acquired.");
    await firstPort.fail({
      ownershipToken: terminalOwner.ownershipToken,
      error: { code: "TERMINAL_FAILURE", message: "Private detail.", retryable: false },
      disposition: "store-terminal",
    });
    await expect(secondPort.acquire(terminalRequest)).resolves.toMatchObject({
      status: "conflict", code: "IDEMPOTENCY_TERMINAL", retryable: false,
    });
    const [terminalRow] = await first<readonly { safe_error_code: string }[]>`
      SELECT safe_error_code FROM company_identity_idempotency_records
       WHERE operation = ${`capability:${capabilityIds.terminal}`}
    `;
    expect(terminalRow?.safe_error_code).toBe("TERMINAL_FAILURE");
    expect(JSON.stringify(terminalRow)).not.toContain("Private detail");

    const expiredRequest = request(capabilityIds.expired);
    const expiredOwner = await firstPort.acquire(expiredRequest);
    if (expiredOwner.status !== "owner") throw new Error("Expiry owner was not acquired.");
    await first`
      UPDATE company_identity_idempotency_records
         SET created_at = now() - interval '2 seconds',
             expires_at = now() - interval '1 second'
       WHERE operation = ${`capability:${capabilityIds.expired}`}
    `;
    await expect(secondPort.acquire(request(
      capabilityIds.expired,
      "replacement-input",
    ))).resolves.toMatchObject({ status: "owner" });
  }, 30_000);
});
