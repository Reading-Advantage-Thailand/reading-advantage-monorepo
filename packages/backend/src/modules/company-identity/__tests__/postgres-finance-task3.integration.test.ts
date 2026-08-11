import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";
import type { IdentityAuditInput } from "../repository.js";
import {
  ensureOneActiveInternalCompany,
  migrateCompanyIdentityWithLock,
} from "./postgres-task3-test-support.js";

const databaseUrl =
  process.env.COMPANY_IDENTITY_PG_TEST_URL ??
  process.env.COMPANY_IDENTITY_INTEGRATION_DATABASE_URL;

interface FinanceAuditModule {
  readonly createCompanyIdentityFinanceAttestationAuditPort?: (input: {
    readonly repository: {
      appendAudit(input: IdentityAuditInput): Promise<void>;
    };
  }) => {
    append(event: Readonly<Record<string, unknown>>): Promise<void>;
  };
}

type DatabaseError = Error & { readonly code?: string };

/** Asserts that PostgreSQL rejected a mutation against the immutable audit table. */
async function expectImmutableAuditMutation(
  operation: () => Promise<unknown>,
): Promise<void> {
  let error: DatabaseError | undefined;
  try {
    await operation();
  } catch (caught) {
    error = caught as DatabaseError;
  }
  expect(error).toBeDefined();
  expect(["55000", "42501"]).toContain(error?.code);
}

describe.skipIf(!databaseUrl)(
  "Finance Task 3 Company Identity PostgreSQL remediation",
  () => {
    it(
      "runs isolated migrations against one active internal company and proves durable immutable Finance audit storage",
      { timeout: 60_000 },
      async () => {
        if (!databaseUrl) return;

        await Promise.all([
          migrateCompanyIdentityWithLock(databaseUrl),
          migrateCompanyIdentityWithLock(databaseUrl),
        ]);

        const sql = postgres(databaseUrl, { max: 2, prepare: false });
        try {
          const organizationId = await ensureOneActiveInternalCompany(sql);
          const [activeCompanyCount] = await sql<Array<{ count: number }>>`
            select count(*)::int as count
              from company_organizations
             where organization_type = 'INTERNAL_COMPANY'
               and status = 'ACTIVE'
          `;
          expect(activeCompanyCount?.count).toBe(1);

          const subject = (await import("../index.js")) as unknown as FinanceAuditModule;
          const factory = subject.createCompanyIdentityFinanceAttestationAuditPort;
          expect(
            factory,
            "The Company Identity production audit adapter must exist before live Finance evidence is accepted.",
          ).toBeTypeOf("function");
          if (typeof factory !== "function") return;

          const repository = createPostgresCompanyIdentityRepository(sql);
          const auditPort = factory({ repository });
          const correlationId = randomUUID();
          await auditPort.append({
            eventId: randomUUID(),
            objectId: randomUUID(),
            occurredAt: "2026-08-11T05:02:00.000Z",
            requestId: randomUUID(),
            correlationId,
            actor: { kind: "unauthenticated" },
            operation: "historical-private-evidence:import",
            scope: { companyId: organizationId },
            outcome: "denied",
            reason: "unauthenticated",
          });

          const [stored] = await sql<
            Array<{
              readonly id: string;
              readonly correlation_id: string;
              readonly organization_id: string;
              readonly operation: string;
              readonly outcome: string;
              readonly reason_code: string | null;
            }>
          >`
            select id, correlation_id, organization_id, operation, outcome, reason_code
              from company_identity_audit_events
             where correlation_id = ${correlationId}
          `;
          expect(stored).toMatchObject({
            correlation_id: correlationId,
            organization_id: organizationId,
            operation: "historical-private-evidence:import",
            outcome: "DENIED",
            reason_code: "unauthenticated",
          });
          await expectImmutableAuditMutation(
            () => sql`
              update company_identity_audit_events
                 set outcome = 'FAILED'
               where correlation_id = ${correlationId}
            `,
          );
          await expectImmutableAuditMutation(
            () => sql`
              delete from company_identity_audit_events
               where correlation_id = ${correlationId}
            `,
          );
        } finally {
          await sql.end({ timeout: 5 });
        }
      },
    );
  },
);
