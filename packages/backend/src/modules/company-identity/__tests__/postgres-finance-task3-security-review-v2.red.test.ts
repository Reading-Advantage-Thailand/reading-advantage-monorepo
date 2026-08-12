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

/** Proves the durable Company Identity projection keeps the full Finance audit envelope. */
describe.skipIf(!databaseUrl)(
  "Finance Task 3 security Review A v2 PostgreSQL RED contract",
  () => {
    it(
      "persists actor, object, request, event, time, versions, and FAILED outcome without dropping metadata",
      { timeout: 60_000 },
      async () => {
        if (!databaseUrl) return;
        await migrateCompanyIdentityWithLock(databaseUrl);

        const sql = postgres(databaseUrl, { max: 2, prepare: false });
        try {
          const companyId = await ensureOneActiveInternalCompany(sql);
          const subject = (await import("../index.js")) as unknown as FinanceAuditModule;
          const factory = subject.createCompanyIdentityFinanceAttestationAuditPort;
          expect(factory).toBeTypeOf("function");
          if (typeof factory !== "function") return;

          const eventId = randomUUID();
          const requestId = randomUUID();
          const correlationId = randomUUID();
          const occurredAt = "2026-08-12T06:00:00.000Z";
          const objectId = "finance-review-a-v2-object";
          const subjectId = "finance-review-a-v2-subject";
          const claimsVersion = "company-identity-claims-v9";
          const policyVersion = "finance-role-policy-v11";
          const auditPort = factory({
            repository: createPostgresCompanyIdentityRepository(sql),
          });

          await auditPort.append({
            eventId,
            objectId,
            occurredAt,
            requestId,
            correlationId,
            actor: { kind: "authenticated-owner", subjectId },
            operation: "historical-private-evidence:import",
            scope: { companyId },
            outcome: "failed",
            reason: "authentication-failed",
            claimsVersion,
            policyVersion,
          });

          const [stored] = await sql<
            Array<{
              readonly outcome: string;
              readonly reason_code: string | null;
              readonly metadata: Record<string, unknown>;
            }>
          >`
            select outcome, metadata
              from company_identity_audit_events
             where correlation_id = ${correlationId}
          `;

          expect(stored).toMatchObject({
            outcome: "FAILED",
            reason_code: "authentication-failed",
            metadata: {
              actorKind: "authenticated-owner",
              actorSubjectId: subjectId,
              source: "finance-operations",
              resourceType: "historical-private-evidence",
              objectId,
              requestId,
              eventId,
              occurredAt,
              claimsVersion,
              policyVersion,
            },
          });
        } finally {
          await sql.end({ timeout: 5 });
        }
      },
    );
  },
);
