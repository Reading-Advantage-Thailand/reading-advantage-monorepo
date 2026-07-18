import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import {
  createCompanyIdentityDurableIdempotencyPort,
} from "../postgres-idempotency.js";

const request = {
  namespace: {
    capabilityId: "company-identity.employees.create",
    scope: "global-capability" as const,
  },
  keyFingerprint: `sha256:${"a".repeat(64)}` as const,
  inputFingerprint: `sha256:${"b".repeat(64)}` as const,
  retentionSeconds: 86_400,
};

interface ScriptedDatabase {
  readonly bindings: readonly (readonly unknown[])[];
  readonly sql: postgres.Sql;
  readonly statements: readonly string[];
}

/**
 * Creates a transaction-capable postgres.js test double with ordered results.
 * @param responses Query results returned in execution order.
 * @returns Scripted SQL client and captured statement text.
 */
function scriptedDatabase(
  responses: readonly (readonly Record<string, unknown>[])[],
): ScriptedDatabase {
  const pending = [...responses];
  const bindings: (readonly unknown[])[] = [];
  const statements: string[] = [];
  const tagged = vi.fn(async (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ) => {
    statements.push(strings.join("?"));
    bindings.push(values);
    const response = pending.shift();
    if (response === undefined) throw new Error("Unexpected SQL statement.");
    return response;
  });
  const sql = tagged as unknown as postgres.Sql;
  Object.assign(sql, {
    begin: async <T>(work: (transaction: postgres.TransactionSql) => Promise<T>) =>
      await work(sql as unknown as postgres.TransactionSql),
    json: (value: unknown) => value,
  });
  return { bindings, sql, statements };
}

describe("company identity capability idempotency", () => {
  it("acquires, completes, and replays through the identity-owned table", async () => {
    const output = { id: "11111111-1111-4111-8111-111111111111" };
    const database = scriptedDatabase([
      [{ id: "22222222-2222-4222-8222-222222222222" }],
      [{ id: "22222222-2222-4222-8222-222222222222" }],
      [],
      [{
        request_hash: "b".repeat(64),
        state: "SUCCEEDED",
        safe_result: output,
        owner_token_hash: null,
        lease_expired: false,
        record_expired: false,
      }],
    ]);
    const port = createCompanyIdentityDurableIdempotencyPort(database.sql);

    const acquired = await port.acquire(request);
    expect(acquired.status).toBe("owner");
    if (acquired.status !== "owner") throw new Error("Expected ownership.");
    await port.complete(acquired.ownershipToken, output);
    await expect(port.acquire(request)).resolves.toEqual({
      status: "replay",
      output,
    });

    expect(database.bindings[0]).toContain(
      "capability:company-identity.employees.create",
    );
    expect(database.statements).not.toContainEqual(
      expect.stringContaining("capability_idempotency_records"),
    );
    expect(database.statements.every((statement) =>
      statement.includes("company_identity_idempotency_records")
    )).toBe(true);
  });

  it("stores terminal failures without persisting unsafe error details", async () => {
    const database = scriptedDatabase([
      [{ id: "33333333-3333-4333-8333-333333333333" }],
      [{ id: "33333333-3333-4333-8333-333333333333" }],
    ]);
    const port = createCompanyIdentityDurableIdempotencyPort(database.sql);
    const acquired = await port.acquire(request);
    if (acquired.status !== "owner") throw new Error("Expected ownership.");

    await port.fail({
      ownershipToken: acquired.ownershipToken,
      error: {
        code: "EMPLOYEE_CREATE_FAILED",
        message: "Private database detail must not be persisted.",
        retryable: false,
      },
      disposition: "store-terminal",
    });

    expect(database.statements.at(-1)).toContain("safe_error_code");
    expect(database.statements.at(-1)).not.toContain("message");
    expect(database.bindings.flat()).not.toContain(
      "Private database detail must not be persisted.",
    );
  });

  it("persists retryable settlement distinctly from releasing ownership", async () => {
    const database = scriptedDatabase([
      [{ id: "44444444-4444-4444-8444-444444444444" }],
      [{ id: "44444444-4444-4444-8444-444444444444" }],
      [],
      [{
        request_hash: "b".repeat(64),
        state: "IN_PROGRESS",
        safe_result: null,
        owner_token_hash: "c".repeat(64),
        lease_expired: true,
        record_expired: false,
      }],
      [{ id: "44444444-4444-4444-8444-444444444444" }],
      [{ id: "44444444-4444-4444-8444-444444444444" }],
    ]);
    const port = createCompanyIdentityDurableIdempotencyPort(database.sql);
    const first = await port.acquire(request);
    if (first.status !== "owner") throw new Error("Expected ownership.");
    await port.fail({
      ownershipToken: first.ownershipToken,
      error: { code: "RETRYABLE_FAILURE", message: "Retry later.", retryable: true },
      disposition: "store-retryable",
    });
    expect(database.statements.at(1)).toContain("UPDATE");
    expect(database.statements.at(1)).not.toContain("DELETE");

    const second = await port.acquire(request);
    if (second.status !== "owner") throw new Error("Expected reclaimed ownership.");
    await port.fail({
      ownershipToken: second.ownershipToken,
      error: { code: "RELEASED_FAILURE", message: "Release now.", retryable: true },
      disposition: "release",
    });
    expect(database.statements.at(-1)).toContain("DELETE");
  });
});
