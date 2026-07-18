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
});
