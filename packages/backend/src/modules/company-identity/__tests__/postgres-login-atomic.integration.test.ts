import { randomBytes, randomUUID } from "node:crypto";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";
import {
  ensureOneActiveInternalCompany,
  migrateCompanyIdentityWithLock,
} from "./postgres-task3-test-support.js";

const databaseUrl =
  process.env.COMPANY_IDENTITY_PG_TEST_URL ??
  process.env.COMPANY_IDENTITY_INTEGRATION_DATABASE_URL;

describe.skipIf(!databaseUrl)(
  "company identity PostgreSQL login atomicity",
  () => {
    it(
      "rolls back a real SSO insert when the real audit insert in its atomic seam fails",
      { timeout: 60_000 },
      async () => {
        if (!databaseUrl) return;
        await migrateCompanyIdentityWithLock(databaseUrl);

        const sql = postgres(databaseUrl, { max: 2, prepare: false });
        const accountId = randomUUID();
        const organizationId = await ensureOneActiveInternalCompany(sql);
        const membershipId = randomUUID();
        const username = `login-atomic-${randomBytes(6).toString("hex")}`;

        try {
          await sql.begin(async (transaction) => {
            await transaction`
              insert into company_accounts
                (id, username, normalized_username, display_name)
              values
                (${accountId}, ${username}, ${username}, 'Login Atomic Employee')
            `;
            await transaction`
              insert into company_organization_memberships
                (id, organization_id, account_id)
              values (${membershipId}, ${organizationId}, ${accountId})
            `;
            await transaction`
              insert into company_password_credentials
                (account_id, password_hash, algorithm)
              values (${accountId}, '$argon2id$integration', 'ARGON2ID')
            `;
          });

          const atomicRepository = createPostgresCompanyIdentityRepository(sql);
          const createdAt = new Date("2026-08-11T00:01:00.000Z");

          await expect(
            atomicRepository.createSsoSessionWithAudit({
              session: {
                id: randomUUID(),
                tokenHash: randomBytes(32).toString("hex"),
                organizationId,
                membershipId,
                authVersion: 1,
                createdAt,
                idleExpiresAt: new Date("2026-08-11T01:00:00.000Z"),
                absoluteExpiresAt: new Date("2026-08-11T02:00:00.000Z"),
                userAgent: "integration-test",
              },
              audit: {
                // This field belongs only to the audit write; every session field above is valid.
                correlationId: "not-a-valid-audit-correlation-id",
                actorAccountId: accountId,
                organizationId,
                targetAccountId: accountId,
                operation: "identity:login",
                outcome: "SUCCEEDED",
                metadata: { clientId: "accounts" },
              },
            }),
          ).rejects.toMatchObject({ code: "22P02" });

          const [sessionCount] = await sql<Array<{ count: number }>>`
            select count(*)::int as count
              from company_sso_sessions
             where membership_id = ${membershipId}
          `;
          const [auditCount] = await sql<Array<{ count: number }>>`
            select count(*)::int as count
              from company_identity_audit_events
             where actor_account_id = ${accountId}
               and operation = 'identity:login'
          `;

          expect(sessionCount?.count).toBe(0);
          expect(auditCount?.count).toBe(0);
        } finally {
          // The explicit URL must point at a disposable, migrated least-privilege test database.
          await sql.end({ timeout: 5 });
        }
      },
    );
  },
);
