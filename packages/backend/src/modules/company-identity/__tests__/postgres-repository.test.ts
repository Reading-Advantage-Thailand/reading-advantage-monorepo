import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";

/**
 * Creates a tagged-SQL test double that returns one reviewed database row.
 * @param row Database row returned by every query.
 * @returns PostgreSQL client-shaped test double.
 */
function sqlReturning(row: Record<string, unknown>): postgres.Sql {
  return vi.fn(async () => [row]) as unknown as postgres.Sql;
}

/**
 * Creates a transaction-aware tagged-SQL test double with ordered query results.
 * @param results Rows returned by successive transactional statements.
 * @returns Outer SQL client, transaction handle, and begin spy.
 */
function transactionalSql(results: readonly unknown[][] = []) {
  const remaining = [...results];
  const transaction = Object.assign(
    vi.fn(async () => remaining.shift() ?? []),
    { json: vi.fn((value: unknown) => value) },
  );
  const begin = vi.fn(async (work: (tx: postgres.TransactionSql) => Promise<unknown>) =>
    work(transaction as unknown as postgres.TransactionSql));
  const sql = Object.assign(vi.fn(async () => []), { begin });
  return {
    begin,
    sql: sql as unknown as postgres.Sql,
    transaction,
  };
}

const sessionRow = {
  id: "10000000-0000-4000-8000-000000000001",
  account_id: "10000000-0000-4000-8000-000000000002",
  membership_id: "10000000-0000-4000-8000-000000000003",
  organization_id: "10000000-0000-4000-8000-000000000004",
  organization_key: "internal-company",
  absolute_expires_at: new Date("2030-01-01T00:00:00.000Z"),
};

describe("PostgreSQL company identity repository", () => {
  it("converts PostgreSQL bigint auth versions before returning SSO sessions", async () => {
    const repository = createPostgresCompanyIdentityRepository(
      sqlReturning({ ...sessionRow, auth_version: "7" }),
    );

    await expect(repository.findSsoSessionById(
      sessionRow.id,
      new Date("2029-01-01T00:00:00.000Z"),
      new Date("2029-01-01T01:00:00.000Z"),
    )).resolves.toMatchObject({ authVersion: 7 });
  });

  it.each(["0", "9007199254740992"])(
    "rejects the invalid database auth version %s",
    async (authVersion) => {
      const repository = createPostgresCompanyIdentityRepository(
        sqlReturning({ ...sessionRow, auth_version: authVersion }),
      );

      await expect(repository.findSsoSessionById(
        sessionRow.id,
        new Date("2029-01-01T00:00:00.000Z"),
        new Date("2029-01-01T01:00:00.000Z"),
      )).rejects.toThrow("COMPANY_IDENTITY_AUTH_VERSION_INVALID");
    },
  );

  it("commits authorization-code issuance and its audit event in one transaction", async () => {
    const database = transactionalSql();
    const repository = createPostgresCompanyIdentityRepository(database.sql);

    await repository.createAuthorizationCode({
      id: "10000000-0000-4000-8000-000000000005",
      codeHash: "c".repeat(64),
      clientId: "10000000-0000-4000-8000-000000000006",
      redirectUriId: "10000000-0000-4000-8000-000000000007",
      ssoSessionId: sessionRow.id,
      codeChallenge: "a".repeat(43),
      nonce: "nonce-value-with-entropy",
      scope: ["openid"],
      issuedAt: new Date("2029-01-01T00:00:00.000Z"),
      expiresAt: new Date("2029-01-01T00:05:00.000Z"),
      audit: {
        correlationId: "10000000-0000-4000-8000-000000000008",
        operation: "identity:authorization-code-issued",
        outcome: "SUCCEEDED",
        metadata: { source: "accounts-oidc" },
      },
    });

    expect(database.begin).toHaveBeenCalledOnce();
    expect(database.transaction).toHaveBeenCalledTimes(2);
    expect(database.transaction.mock.calls[1]?.slice(1)).toContain(
      "identity:authorization-code-issued",
    );
  });

  it("uses the code-exchange transaction for application-session issuance audit", async () => {
    const database = transactionalSql();
    const repository = createPostgresCompanyIdentityRepository(database.sql);

    await repository.createApplicationSession({
      transaction: database.transaction as unknown as postgres.TransactionSql,
      id: "10000000-0000-4000-8000-000000000013",
      tokenHash: "a".repeat(64),
      ssoSessionId: sessionRow.id,
      organizationId: "10000000-0000-4000-8000-000000000004",
      membershipId: "10000000-0000-4000-8000-000000000003",
      applicationId: "10000000-0000-4000-8000-000000000009",
      authVersion: 7,
      createdAt: new Date("2029-01-01T00:00:00.000Z"),
      expiresAt: new Date("2029-01-01T00:30:00.000Z"),
      audit: {
        correlationId: "10000000-0000-4000-8000-000000000014",
        operation: "identity:application-session-issued",
        outcome: "SUCCEEDED",
        metadata: { source: "accounts-oidc" },
      },
    });

    expect(database.begin).not.toHaveBeenCalled();
    expect(database.transaction).toHaveBeenCalledTimes(2);
    expect(database.transaction.mock.calls[1]?.slice(1)).toContain(
      "identity:application-session-issued",
    );
  });

  it("commits local and global revocation audit events in their revocation transactions", async () => {
    const local = transactionalSql([[
      {
        account_id: "10000000-0000-4000-8000-000000000002",
        application_id: "10000000-0000-4000-8000-000000000009",
        organization_id: "10000000-0000-4000-8000-000000000004",
      },
    ]]);
    const localRepository = createPostgresCompanyIdentityRepository(local.sql);
    await expect(localRepository.revokeApplicationSession({
      tokenHash: "a".repeat(64),
      now: new Date("2029-01-01T00:00:00.000Z"),
      audit: {
        correlationId: "10000000-0000-4000-8000-000000000010",
        operation: "identity:local-logout",
        outcome: "SUCCEEDED",
        metadata: { source: "accounts-oidc" },
      },
    })).resolves.toBe(true);

    expect(local.transaction).toHaveBeenCalledTimes(2);
    expect(local.transaction.mock.calls[1]?.slice(1)).toContain(
      "identity:local-logout",
    );
    expect(local.transaction.mock.calls[1]?.slice(1)).toContainEqual({
      sessionCount: 1,
      source: "accounts-oidc",
    });

    const global = transactionalSql([
      [{
        id: sessionRow.id,
        account_id: "10000000-0000-4000-8000-000000000002",
        organization_id: "10000000-0000-4000-8000-000000000004",
      }],
      [{ id: "10000000-0000-4000-8000-000000000011" }],
    ]);
    const globalRepository = createPostgresCompanyIdentityRepository(global.sql);
    await expect(globalRepository.revokeSsoSession({
      tokenHash: "s".repeat(64),
      now: new Date("2029-01-01T00:00:00.000Z"),
      audit: {
        correlationId: "10000000-0000-4000-8000-000000000012",
        operation: "identity:global-logout",
        outcome: "SUCCEEDED",
        metadata: { source: "accounts-session" },
      },
    })).resolves.toBe(1);

    expect(global.transaction).toHaveBeenCalledTimes(3);
    expect(global.transaction.mock.calls[2]?.slice(1)).toContain(
      "identity:global-logout",
    );
    expect(global.transaction.mock.calls[2]?.slice(1)).toContainEqual({
      sessionCount: 2,
      source: "accounts-session",
    });
  });
});
