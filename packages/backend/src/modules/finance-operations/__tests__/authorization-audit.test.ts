import { describe, expect, it } from "vitest";

import {
  evaluateFinanceAuthorization,
  financeAuthorizationPolicySchema,
} from "../authorization.js";
import { financeAuditEventSchema, type FinanceAuditPort } from "../audit.js";
import type { FinanceOperationAuthorizationInput } from "../contracts.js";

const authorizationPolicy = {
  policyVersion: "finance-authorization-v1",
  allowedOperations: ["financial-record:import"],
  approvedAppRoleIds: ["app-role:finance-operator"],
  scopeKind: "school",
} as const;

const authorizationInput = {
  operation: "financial-record:import",
  scope: {
    companyId: "reading-advantage",
    schoolId: "school-0001",
  },
  authorizationEvidence: {
    source: "company-identity",
    claimsVersion: "company-identity-v1",
    subjectId: "employee-0001",
    organizationId: "reading-advantage",
    appRoleIds: ["app-role:viewer", "app-role:finance-operator"],
    schoolIds: ["school-0001"],
  },
} satisfies FinanceOperationAuthorizationInput;

const auditEvent = {
  eventId: "finance-audit-event-0001",
  actorSubjectId: "employee-0001",
  operation: "financial-record:import",
  objectType: "financial-record",
  objectId: "finance-record-0001",
  occurredAt: "2026-08-10T02:04:05.678Z",
  requestId: "request-0001",
  correlationId: "correlation-0001",
  scope: {
    companyId: "reading-advantage",
    schoolId: "school-0001",
  },
  outcome: "succeeded",
} as const;

describe("Finance Operations authorization and audit contracts", () => {
  it("requires a versioned, role- and operation-specific policy with an explicit scope kind", () => {
    expect(
      financeAuthorizationPolicySchema.safeParse(authorizationPolicy).success,
    ).toBe(true);
    expect(
      financeAuthorizationPolicySchema.safeParse({
        ...authorizationPolicy,
        scopeKind: "company",
      }).success,
    ).toBe(true);

    for (const policy of [
      { ...authorizationPolicy, policyVersion: "" },
      { ...authorizationPolicy, allowedOperations: [] },
      { ...authorizationPolicy, approvedAppRoleIds: [] },
      { ...authorizationPolicy, scopeKind: "region" },
    ]) {
      expect(financeAuthorizationPolicySchema.safeParse(policy).success).toBe(
        false,
      );
    }
  });

  it("allows an approved operation and role within matching company and school scope without mutating inputs", () => {
    const policyBeforeEvaluation = structuredClone(authorizationPolicy);
    const inputBeforeEvaluation = structuredClone(authorizationInput);

    expect(
      evaluateFinanceAuthorization({
        policy: authorizationPolicy,
        input: authorizationInput,
      }),
    ).toEqual({ decision: "allow" });
    expect(authorizationPolicy).toEqual(policyBeforeEvaluation);
    expect(authorizationInput).toEqual(inputBeforeEvaluation);
  });

  it("returns a specific reason when the operation, role, organization, or scope does not match policy", () => {
    expect(
      evaluateFinanceAuthorization({
        policy: authorizationPolicy,
        input: { ...authorizationInput, operation: "invoice:create" },
      }),
    ).toEqual({ decision: "deny", reason: "operation-not-allowed" });
    expect(
      evaluateFinanceAuthorization({
        policy: authorizationPolicy,
        input: {
          ...authorizationInput,
          authorizationEvidence: {
            ...authorizationInput.authorizationEvidence,
            appRoleIds: ["app-role:viewer"],
          },
        },
      }),
    ).toEqual({ decision: "deny", reason: "role-not-approved" });
    expect(
      evaluateFinanceAuthorization({
        policy: authorizationPolicy,
        input: {
          ...authorizationInput,
          authorizationEvidence: {
            ...authorizationInput.authorizationEvidence,
            organizationId: "another-company",
          },
        },
      }),
    ).toEqual({ decision: "deny", reason: "organization-mismatch" });
    expect(
      evaluateFinanceAuthorization({
        policy: authorizationPolicy,
        input: {
          ...authorizationInput,
          scope: { companyId: "reading-advantage" },
        },
      }),
    ).toEqual({ decision: "deny", reason: "scope-mismatch" });
  });

  it("accepts complete UTC audit events and rejects incomplete, blank, unknown, or invalid values", () => {
    expect(financeAuditEventSchema.safeParse(auditEvent).success).toBe(true);
    for (const outcome of ["allowed", "denied", "succeeded", "failed"]) {
      expect(
        financeAuditEventSchema.safeParse({ ...auditEvent, outcome }).success,
      ).toBe(true);
    }

    for (const field of [
      "eventId",
      "actorSubjectId",
      "operation",
      "objectType",
      "objectId",
      "occurredAt",
      "requestId",
      "correlationId",
      "scope",
      "outcome",
    ]) {
      const incompleteEvent: Record<string, unknown> = { ...auditEvent };
      delete incompleteEvent[field];
      expect(financeAuditEventSchema.safeParse(incompleteEvent).success).toBe(
        false,
      );
    }

    for (const field of [
      "eventId",
      "actorSubjectId",
      "operation",
      "objectType",
      "objectId",
      "requestId",
      "correlationId",
    ]) {
      expect(
        financeAuditEventSchema.safeParse({ ...auditEvent, [field]: "" })
          .success,
      ).toBe(false);
    }

    expect(
      financeAuditEventSchema.safeParse({
        ...auditEvent,
        occurredAt: "2026-08-10T09:04:05.678+07:00",
      }).success,
    ).toBe(false);
    expect(
      financeAuditEventSchema.safeParse({ ...auditEvent, outcome: "pending" })
        .success,
    ).toBe(false);
    expect(
      financeAuditEventSchema.safeParse({
        ...auditEvent,
        providerReceipt: "provider-specific",
      }).success,
    ).toBe(false);
  });

  it("defines a provider-neutral audit port that appends one validated event and returns an immutable receipt", async () => {
    const appendedEvents: unknown[] = [];
    const auditPort = {
      append: async (event) => {
        const validatedEvent = financeAuditEventSchema.parse(event);
        appendedEvents.push(validatedEvent);
        return Object.freeze({
          eventId: validatedEvent.eventId,
          receiptId: "finance-audit-receipt-0001",
        });
      },
    } satisfies FinanceAuditPort;
    const validatedEvent = financeAuditEventSchema.parse(auditEvent);

    const receipt = await auditPort.append(validatedEvent);

    expect(appendedEvents).toEqual([validatedEvent]);
    expect(receipt).toEqual({
      eventId: "finance-audit-event-0001",
      receiptId: "finance-audit-receipt-0001",
    });
    expect(Object.isFrozen(receipt)).toBe(true);
  });
});
