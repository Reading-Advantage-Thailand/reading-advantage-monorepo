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
  readonly createFinanceCompanyIdentityAttestor?: (input: {
    readonly authenticator: {
      authenticate(input: Readonly<Record<string, unknown>>): Promise<unknown>;
    };
    readonly rolePolicy: {
      readonly policyVersion: string;
      readonly acceptedRoleIds: readonly string[];
    };
    readonly auditPort: {
      append(event: Readonly<Record<string, unknown>>): Promise<void>;
    };
    readonly trustedAuditSources: {
      readonly createEventId: () => string;
      readonly createRequestId: () => string;
      readonly createCorrelationId: () => string;
      readonly now: () => Date;
    };
  }) => {
    attest(input: Readonly<Record<string, unknown>>): Promise<unknown>;
  };
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
          const subject =
            (await import("../index.js")) as unknown as FinanceAuditModule;
          const attestorFactory = subject.createFinanceCompanyIdentityAttestor;
          const adapterFactory =
            subject.createCompanyIdentityFinanceAttestationAuditPort;
          expect(attestorFactory).toBeTypeOf("function");
          expect(adapterFactory).toBeTypeOf("function");
          if (
            typeof attestorFactory !== "function" ||
            typeof adapterFactory !== "function"
          ) {
            return;
          }

          const eventId = randomUUID();
          const requestId = randomUUID();
          const correlationId = randomUUID();
          const occurredAt = "2026-08-12T06:00:00.000Z";
          const objectId = "finance-review-a-v2-object";
          const policyVersion = "finance-role-policy-v11";
          const schoolId = "school-sensitive-scope";
          const secret = "authenticator-secret-must-not-reach-postgres";
          const auditPort = adapterFactory({
            repository: createPostgresCompanyIdentityRepository(sql),
          });
          const attestor = attestorFactory({
            authenticator: {
              authenticate: async () => {
                throw new Error(secret);
              },
            },
            rolePolicy: {
              policyVersion,
              acceptedRoleIds: ["finance-historical-private-evidence-import"],
            },
            auditPort,
            trustedAuditSources: {
              createEventId: () => eventId,
              createRequestId: () => requestId,
              createCorrelationId: () => correlationId,
              now: () => new Date(occurredAt),
            },
          });

          await expect(
            attestor.attest({
              operation: "historical-private-evidence:import",
              scope: { companyId, schoolId },
              credential: { kind: "token", value: secret },
              audit: {
                eventId: "caller-event-id",
                objectId,
                occurredAt: "1999-01-01T00:00:00.000Z",
                requestId: "caller-request-id",
                correlationId: "caller-correlation-id",
              },
            }),
          ).rejects.toThrow("COMPANY_IDENTITY_FINANCE_AUTHENTICATION_FAILED");

          const [stored] = await sql<
            Array<{
              readonly outcome: string;
              readonly reason_code: string | null;
              readonly metadata: Record<string, unknown>;
            }>
          >`
            select outcome, reason_code, metadata
              from company_identity_audit_events
             where correlation_id = ${correlationId}
          `;

          expect(stored).toMatchObject({
            outcome: "FAILED",
            reason_code: "authentication-failed",
            metadata: {
              actorKind: "unauthenticated",
              actorSubjectId: null,
              source: "finance-operations",
              resourceType: "historical-private-evidence",
              objectId,
              requestId,
              eventId,
              occurredAt,
              claimsVersion: null,
              policyVersion,
              schoolId,
            },
          });
          expect(JSON.stringify(stored)).not.toContain(secret);
        } finally {
          await sql.end({ timeout: 5 });
        }
      },
    );
  },
);
