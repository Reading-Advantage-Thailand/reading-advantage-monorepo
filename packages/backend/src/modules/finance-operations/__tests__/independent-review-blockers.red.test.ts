import { describe, expect, it, vi } from "vitest";

import type { FinanceAuditEvent, FinanceAuditPort } from "../audit.js";
import { evaluateFinanceAuthorization } from "../authorization.js";
import type {
  FinanceAuthorizationEvidence,
  FinanceOperationAuthorizationInput,
  FinanceOperationScope,
} from "../contracts.js";
import { classifyDurableJobReplay } from "../port-contracts.js";
import type { CompanyIdentityAuthorizationPort } from "../ports.js";
import {
  acceptFinanceRecord,
  appendFinanceCorrection,
  type FinanceRecord,
  type FinanceRecordInput,
  type FinanceRecordRepository,
} from "../records.js";

const canonicalOccurredAt = "2026-08-10T02:04:05.678Z";

const digest = (character: string): string => character.repeat(64);

const scope = {
  companyId: "reading-advantage",
  schoolId: "school-0001",
} as const satisfies FinanceOperationScope;

const authorizationEvidence = {
  source: "company-identity",
  claimsVersion: "company-identity-v1",
  subjectId: "employee-0001",
  organizationId: "reading-advantage",
  appRoleIds: ["app-role:finance-operator"],
  schoolIds: [scope.schoolId],
} as const satisfies FinanceAuthorizationEvidence;

const acceptanceAuthorization = {
  operation: "financial-record:import",
  scope,
  authorizationEvidence,
} as const satisfies FinanceOperationAuthorizationInput;

const correctionAuthorization = {
  ...acceptanceAuthorization,
  operation: "financial-record:append-correction",
} as const satisfies FinanceOperationAuthorizationInput;

const sourceProvenance = {
  sourceSystem: "tutor-financial-export",
  sourceVersion: "tutor-v1",
  sourceRecordId: "tutor-export-0001",
  importBatchId: "finance-import-0001",
  payloadDigest: digest("a"),
  evidenceReference:
    "private-evidence://reading-advantage/tutor/exports/0001.json",
} as const;

const financeRecord = {
  recordId: "finance-record-0001",
  money: { amountMinor: "250", currency: "THB" },
  provenance: sourceProvenance,
} as const satisfies FinanceRecordInput;

const storedFinanceRecord = {
  ...financeRecord,
  scope,
} as const satisfies FinanceRecord;

/** Compares two Finance scopes without allowing either unique identity to cross tenants. */
function scopesMatch(
  left: Readonly<FinanceOperationScope>,
  right: Readonly<FinanceOperationScope>,
): boolean {
  return left.companyId === right.companyId && left.schoolId === right.schoolId;
}

/** Compares source-system identities after their tenant boundary has matched. */
function sourceIdentitiesMatch(
  left: FinanceRecord,
  right: FinanceRecord,
): boolean {
  return (
    left.provenance.sourceSystem === right.provenance.sourceSystem &&
    left.provenance.sourceVersion === right.provenance.sourceVersion &&
    left.provenance.sourceRecordId === right.provenance.sourceRecordId
  );
}

/** Creates a deterministic atomic repository that enforces scoped source and record identities. */
function createAtomicRepository(
  initialRecords: readonly FinanceRecord[] = [],
): {
  readonly records: FinanceRecord[];
  readonly findByRecordId: ReturnType<typeof vi.fn>;
  readonly compareAndAppend: ReturnType<typeof vi.fn>;
  readonly successAudits: FinanceAuditEvent[];
  readonly repository: FinanceRecordRepository;
} {
  const records = [...initialRecords];
  const successAudits: FinanceAuditEvent[] = [];
  const findByRecordId = vi.fn(async ({ scope: requestedScope, recordId }) =>
    records.find(
      (record) =>
        record.recordId === recordId &&
        scopesMatch(record.scope, requestedScope),
    ),
  );
  const compareAndAppend = vi.fn(async (record: FinanceRecord) => {
    const existing = records.find(
      (candidate) =>
        scopesMatch(candidate.scope, record.scope) &&
        (candidate.recordId === record.recordId ||
          sourceIdentitiesMatch(candidate, record)),
    );
    if (existing !== undefined) {
      return { status: "existing" as const, record: existing };
    }

    records.push(record);
    return { status: "accepted" as const, record };
  });
  const appendWithSuccessAudit = vi.fn(
    async (record: FinanceRecord, audit: FinanceAuditEvent) => {
      const existing = successAudits.find(
        (candidate) => candidate.eventId === audit.eventId,
      );
      if (existing !== undefined) {
        if (JSON.stringify(existing) !== JSON.stringify(audit)) {
          throw new Error("Finance success audit event identity conflict");
        }
      }
      const result = await compareAndAppend(record);
      if (existing === undefined) successAudits.push(audit);
      return result;
    },
  );
  const repository = {
    findByRecordId,
    appendWithSuccessAudit,
  } satisfies FinanceRecordRepository;

  return {
    records,
    findByRecordId,
    compareAndAppend,
    successAudits,
    repository,
  };
}

/** Creates a provider-neutral audit port while retaining the immutable event object received. */
function createAuditPort(): {
  readonly events: FinanceAuditEvent[];
  readonly port: FinanceAuditPort;
} {
  const events: FinanceAuditEvent[] = [];
  return {
    events,
    port: {
      append: async (event) => {
        events.push(event);
        return Object.freeze({
          eventId: event.eventId,
          receiptId: `receipt-${event.eventId}`,
        });
      },
    },
  };
}

/** Asserts that a command supplied an immutable audit event and immutable tenant scope. */
function expectFrozenAuditEvent(
  event: FinanceAuditEvent,
  expected: Pick<
    FinanceAuditEvent,
    "operation" | "objectId" | "requestId" | "correlationId" | "outcome"
  >,
): void {
  expect(event).toMatchObject({
    actorSubjectId: authorizationEvidence.subjectId,
    objectType: "financial-record",
    occurredAt: canonicalOccurredAt,
    scope,
    ...expected,
  });
  expect(Object.isFrozen(event)).toBe(true);
  expect(Object.isFrozen(event.scope)).toBe(true);
}

describe("Finance Operations independent review blockers", () => {
  it("conflicts when a durable-job replay changes company or school scope", () => {
    const input = {
      operation: "finance-import",
      idempotencyKey: "finance-import-0001",
      payloadDigest: digest("a"),
      scope,
      authorizationEvidence,
    } as const;
    const receipt = {
      jobId: "finance-job-0001",
      idempotencyKey: input.idempotencyKey,
    } as const;
    const existing = { input, receipt } as const;

    expect(
      classifyDurableJobReplay({
        existing,
        incoming: {
          ...input,
          scope: { companyId: "another-company", schoolId: "school-0001" },
          authorizationEvidence: {
            ...authorizationEvidence,
            organizationId: "another-company",
          },
        },
      }),
    ).toEqual({ status: "conflict", receipt, reason: "scope-mismatch" });
    expect(
      classifyDurableJobReplay({
        existing,
        incoming: {
          ...input,
          scope: { ...scope, schoolId: "school-0002" },
        },
      }),
    ).toEqual({ status: "conflict", receipt, reason: "scope-mismatch" });
  });

  it("binds a durable-job receipt idempotency key to the accepted request", () => {
    const input = {
      operation: "finance-import",
      idempotencyKey: "finance-import-0001",
      payloadDigest: digest("a"),
      scope,
      authorizationEvidence,
    } as const;
    const mismatchedReceipt = {
      jobId: "finance-job-0001",
      idempotencyKey: "another-request-key",
    } as const;

    expect(() =>
      classifyDurableJobReplay({
        existing: { input, receipt: mismatchedReceipt },
        incoming: input,
      }),
    ).toThrow(/idempotency key.*receipt|receipt.*idempotency key/i);
  });

  it("denies school operations without an attestation and with an attestation for another school", () => {
    const { schoolIds: _schoolIds, ...unattestedEvidence } =
      authorizationEvidence;
    const policy = {
      policyVersion: "finance-authorization-v1",
      allowedOperations: ["financial-record:import"],
      approvedAppRoleIds: ["app-role:finance-operator"],
      scopeKind: "school",
    } as const;

    expect(
      evaluateFinanceAuthorization({
        policy,
        input: {
          ...acceptanceAuthorization,
          authorizationEvidence: unattestedEvidence,
        },
      }),
    ).toEqual({ decision: "deny", reason: "scope-mismatch" });
    expect(
      evaluateFinanceAuthorization({
        policy,
        input: {
          ...acceptanceAuthorization,
          scope: { ...scope, schoolId: "school-0002" },
          authorizationEvidence: {
            ...authorizationEvidence,
            schoolIds: [scope.schoolId],
          },
        },
      }),
    ).toEqual({ decision: "deny", reason: "scope-mismatch" });
  });

  it("denies record acceptance before any repository access and records frozen denial evidence", async () => {
    const { records, findByRecordId, compareAndAppend, repository } =
      createAtomicRepository();
    const { events, port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "deny" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;

    await expect(
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-denied-0001",
        correlationId: "correlation-denied-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toMatchObject({ reason: "authorization-denied" });
    expect(authorizationPort.authorizeFinanceOperation).toHaveBeenCalledWith(
      acceptanceAuthorization,
    );
    expect(findByRecordId).not.toHaveBeenCalled();
    expect(compareAndAppend).not.toHaveBeenCalled();
    expect(records).toEqual([]);
    expect(events).toHaveLength(1);
    expectFrozenAuditEvent(events[0]!, {
      operation: "financial-record:import",
      objectId: financeRecord.recordId,
      requestId: "request-denied-0001",
      correlationId: "correlation-denied-0001",
      outcome: "denied",
    });
  });

  it("canonicalizes an import operation, then records immutable allowed and succeeded evidence", async () => {
    const { records, successAudits, repository } = createAtomicRepository();
    const { events, port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;

    await expect(
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: correctionAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-accepted-0001",
        correlationId: "correlation-accepted-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "accepted",
      recordId: financeRecord.recordId,
    });
    expect(authorizationPort.authorizeFinanceOperation).toHaveBeenCalledWith(
      acceptanceAuthorization,
    );
    expect(records).toEqual([storedFinanceRecord]);
    expect(events.map((event) => event.outcome)).toEqual(["allowed"]);
    for (const event of events) {
      expectFrozenAuditEvent(event, {
        operation: "financial-record:import",
        objectId: financeRecord.recordId,
        requestId: "request-accepted-0001",
        correlationId: "correlation-accepted-0001",
        outcome: event.outcome,
      });
    }
    expect(successAudits).toHaveLength(1);
    expectFrozenAuditEvent(successAudits[0]!, {
      operation: "financial-record:import",
      objectId: financeRecord.recordId,
      requestId: "request-accepted-0001",
      correlationId: "correlation-accepted-0001",
      outcome: "succeeded",
    });
  });

  it("denies corrections before reading records and records frozen denial evidence", async () => {
    const { findByRecordId, compareAndAppend, repository } =
      createAtomicRepository([storedFinanceRecord]);
    const { events, port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "deny" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const correction = {
      operation: "append-correction",
      recordId: "finance-record-0002",
      supersedesRecordId: financeRecord.recordId,
      reason: "Correcting a duplicated source adjustment.",
      money: { amountMinor: "-250", currency: "THB" },
      provenance: {
        ...sourceProvenance,
        sourceRecordId: "tutor-export-0001-correction",
        payloadDigest: digest("b"),
      },
    } as const;

    await expect(
      appendFinanceCorrection({
        repository,
        correction,
        authorizationInput: correctionAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-correction-denied-0001",
        correlationId: "correlation-correction-denied-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toMatchObject({ reason: "authorization-denied" });
    expect(findByRecordId).not.toHaveBeenCalled();
    expect(compareAndAppend).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expectFrozenAuditEvent(events[0]!, {
      operation: "financial-record:append-correction",
      objectId: correction.recordId,
      requestId: "request-correction-denied-0001",
      correlationId: "correlation-correction-denied-0001",
      outcome: "denied",
    });
  });

  it("canonicalizes a correction operation and records immutable allowed then failed evidence", async () => {
    const { repository } = createAtomicRepository();
    const { events, port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const correction = {
      operation: "append-correction",
      recordId: "finance-record-0002",
      supersedesRecordId: "missing-record",
      reason: "Correcting a duplicated source adjustment.",
      money: { amountMinor: "-250", currency: "THB" },
      provenance: {
        ...sourceProvenance,
        sourceRecordId: "tutor-export-0001-correction",
        payloadDigest: digest("b"),
      },
    } as const;

    await expect(
      appendFinanceCorrection({
        repository,
        correction,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-correction-failed-0001",
        correlationId: "correlation-correction-failed-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toMatchObject({ reason: "missing-superseded-record" });
    expect(authorizationPort.authorizeFinanceOperation).toHaveBeenCalledWith(
      correctionAuthorization,
    );
    expect(events.map((event) => event.outcome)).toEqual(["allowed", "failed"]);
    for (const event of events) {
      expectFrozenAuditEvent(event, {
        operation: "financial-record:append-correction",
        objectId: correction.recordId,
        requestId: "request-correction-failed-0001",
        correlationId: "correlation-correction-failed-0001",
        outcome: event.outcome,
      });
    }
  });

  it("keys source identity and record identity by company and school", async () => {
    const { records, compareAndAppend, repository } = createAtomicRepository();
    const firstAudit = createAuditPort();
    const secondAudit = createAuditPort();
    const firstAuthorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const secondScope = {
      companyId: "reading-advantage",
      schoolId: "school-0002",
    } as const satisfies FinanceOperationScope;
    const secondAuthorization = {
      operation: "financial-record:import",
      scope: secondScope,
      authorizationEvidence: {
        ...authorizationEvidence,
        schoolIds: [secondScope.schoolId],
      },
    } as const satisfies FinanceOperationAuthorizationInput;
    const secondAuthorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const secondTenantRecord = {
      ...financeRecord,
      recordId: "finance-record-0002",
    } as const satisfies FinanceRecordInput;
    const storedSecondTenantRecord = {
      ...secondTenantRecord,
      scope: secondScope,
    } as const satisfies FinanceRecord;

    await expect(
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort: firstAuthorizationPort,
        auditPort: firstAudit.port,
        requestId: "request-tenant-one-0001",
        correlationId: "correlation-tenant-scope-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "accepted",
      recordId: financeRecord.recordId,
    });
    await expect(
      acceptFinanceRecord({
        repository,
        record: secondTenantRecord,
        authorizationInput: secondAuthorization,
        authorizationPort: secondAuthorizationPort,
        auditPort: secondAudit.port,
        requestId: "request-tenant-two-0001",
        correlationId: "correlation-tenant-scope-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({ status: "accepted", recordId: "finance-record-0002" });
    expect(records).toEqual([storedFinanceRecord, storedSecondTenantRecord]);
    expect(compareAndAppend.mock.calls.map(([record]) => record.scope)).toEqual(
      [scope, secondScope],
    );
  });

  it("uses the atomic repository for two simultaneous authenticated source replays", async () => {
    const { records, compareAndAppend, repository } = createAtomicRepository();
    const firstAudit = createAuditPort();
    const secondAudit = createAuditPort();
    const firstAuthorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const secondAuthorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;

    const outcomes = await Promise.all([
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort: firstAuthorizationPort,
        auditPort: firstAudit.port,
        requestId: "request-concurrent-one-0001",
        correlationId: "correlation-concurrent-0001",
        occurredAt: canonicalOccurredAt,
      }),
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort: secondAuthorizationPort,
        auditPort: secondAudit.port,
        requestId: "request-concurrent-two-0001",
        correlationId: "correlation-concurrent-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "accepted")).toEqual(
      [{ status: "accepted", recordId: financeRecord.recordId }],
    );
    expect(outcomes.filter((outcome) => outcome.status === "replay")).toEqual([
      { status: "replay", acceptedRecordId: financeRecord.recordId },
    ]);
    expect(records).toEqual([storedFinanceRecord]);
    expect(compareAndAppend).toHaveBeenCalledTimes(2);
    expect("append" in repository).toBe(false);
  });

  it("rejects a correction with a different currency without appending a record", async () => {
    const { records, repository } = createAtomicRepository([
      storedFinanceRecord,
    ]);
    const { port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;

    await expect(
      appendFinanceCorrection({
        repository,
        correction: {
          operation: "append-correction",
          recordId: "finance-record-0002",
          supersedesRecordId: financeRecord.recordId,
          reason: "Correcting the source value.",
          money: { amountMinor: "-250", currency: "USD" },
          provenance: {
            ...sourceProvenance,
            sourceRecordId: "tutor-export-0001-correction",
            payloadDigest: digest("b"),
          },
        },
        authorizationInput: correctionAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-currency-mismatch-0001",
        correlationId: "correlation-currency-mismatch-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toMatchObject({ reason: "currency-mismatch" });
    expect(records).toEqual([storedFinanceRecord]);
  });

  it("replays an already accepted correction without a second atomic append", async () => {
    const correctionRecord = {
      recordId: "finance-record-0002",
      money: { amountMinor: "-250", currency: "THB" },
      provenance: {
        ...sourceProvenance,
        sourceRecordId: "tutor-export-0001-correction",
        payloadDigest: digest("b"),
      },
      supersedesRecordId: financeRecord.recordId,
      correctionReason: "Correcting the source value.",
      scope,
    } as const satisfies FinanceRecord;
    const { records, compareAndAppend, successAudits, repository } =
      createAtomicRepository([storedFinanceRecord, correctionRecord]);
    const { port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;

    await expect(
      appendFinanceCorrection({
        repository,
        correction: {
          operation: "append-correction",
          recordId: correctionRecord.recordId,
          supersedesRecordId: financeRecord.recordId,
          reason: correctionRecord.correctionReason,
          money: correctionRecord.money,
          provenance: correctionRecord.provenance,
        },
        authorizationInput: correctionAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-correction-replay-0001",
        correlationId: "correlation-correction-replay-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "replay",
      acceptedRecordId: correctionRecord.recordId,
    });
    expect(compareAndAppend).toHaveBeenCalledTimes(1);
    expect(records).toEqual([storedFinanceRecord, correctionRecord]);
    expect(successAudits).toHaveLength(1);
    expectFrozenAuditEvent(successAudits[0]!, {
      operation: "financial-record:append-correction",
      objectId: correctionRecord.recordId,
      requestId: "request-correction-replay-0001",
      correlationId: "correlation-correction-replay-0001",
      outcome: "succeeded",
    });
  });

  it("passes frozen scoped record, money, and provenance snapshots to the atomic repository", async () => {
    const { compareAndAppend, repository } = createAtomicRepository();
    const { port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;

    await expect(
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-frozen-record-0001",
        correlationId: "correlation-frozen-record-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "accepted",
      recordId: financeRecord.recordId,
    });
    const appendedRecord = compareAndAppend.mock.calls[0]?.[0];
    expect(appendedRecord).toBeDefined();
    expect(Object.isFrozen(appendedRecord)).toBe(true);
    expect(Object.isFrozen(appendedRecord.scope)).toBe(true);
    expect(Object.isFrozen(appendedRecord.money)).toBe(true);
    expect(Object.isFrozen(appendedRecord.provenance)).toBe(true);
  });

  it("does not let an allowed import bypass correction validation with correction-only fields", async () => {
    const { compareAndAppend, repository } = createAtomicRepository();
    const { events, port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const importWithCorrectionFields = {
      ...financeRecord,
      supersedesRecordId: "finance-record-previous-0001",
      correctionReason: "A correction must use the correction command.",
    } as const;

    await expect(
      acceptFinanceRecord({
        repository,
        record: importWithCorrectionFields,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-import-correction-bypass-0001",
        correlationId: "correlation-import-correction-bypass-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toThrow();
    expect(compareAndAppend).not.toHaveBeenCalled();
    expect(events.map((event) => event.outcome)).toEqual(["allowed", "failed"]);
    for (const event of events) {
      expectFrozenAuditEvent(event, {
        operation: "financial-record:import",
        objectId: financeRecord.recordId,
        requestId: "request-import-correction-bypass-0001",
        correlationId: "correlation-import-correction-bypass-0001",
        outcome: event.outcome,
      });
    }
  });

  it("prevents an allowing authorization adapter from mutating canonical operation, scope, or evidence", async () => {
    const { records, successAudits, repository } = createAtomicRepository();
    const { events, port: auditPort } = createAuditPort();
    const mutationSucceeded = {
      operation: false,
      scope: false,
      evidence: false,
    };
    const mutationErrors: string[] = [];
    let receivedInput: FinanceOperationAuthorizationInput | undefined;
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async (input) => {
        receivedInput = input;
        try {
          Object.assign(input, {
            operation: "financial-record:append-correction",
          });
          mutationSucceeded.operation = true;
        } catch {
          mutationErrors.push("operation");
        }
        try {
          Object.assign(input.scope, { schoolId: "school-attacker-0001" });
          mutationSucceeded.scope = true;
        } catch {
          mutationErrors.push("scope");
        }
        try {
          Object.assign(input.authorizationEvidence, {
            subjectId: "attacker-0001",
          });
          mutationSucceeded.evidence = true;
        } catch {
          mutationErrors.push("evidence");
        }
        return { decision: "allow" as const };
      }),
    } satisfies CompanyIdentityAuthorizationPort;

    await expect(
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-authorization-mutation-0001",
        correlationId: "correlation-authorization-mutation-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "accepted",
      recordId: financeRecord.recordId,
    });
    expect(receivedInput).toBeDefined();
    expect(receivedInput).toEqual(acceptanceAuthorization);
    expect(Object.isFrozen(receivedInput)).toBe(true);
    expect(Object.isFrozen(receivedInput?.scope)).toBe(true);
    expect(Object.isFrozen(receivedInput?.authorizationEvidence)).toBe(true);
    expect(
      Object.isFrozen(receivedInput?.authorizationEvidence.appRoleIds),
    ).toBe(true);
    expect(
      Object.isFrozen(receivedInput?.authorizationEvidence.schoolIds),
    ).toBe(true);
    expect(mutationSucceeded).toEqual({
      operation: false,
      scope: false,
      evidence: false,
    });
    expect(mutationErrors).toEqual(["operation", "scope", "evidence"]);
    expect(records).toEqual([storedFinanceRecord]);
    expect(events.map((event) => event.operation)).toEqual([
      acceptanceAuthorization.operation,
    ]);
    expect(events.map((event) => event.scope)).toEqual([scope]);
    expect(events.map((event) => event.actorSubjectId)).toEqual([
      authorizationEvidence.subjectId,
    ]);
    expect(successAudits).toHaveLength(1);
    expectFrozenAuditEvent(successAudits[0]!, {
      operation: "financial-record:import",
      objectId: financeRecord.recordId,
      requestId: "request-authorization-mutation-0001",
      correlationId: "correlation-authorization-mutation-0001",
      outcome: "succeeded",
    });
  });

  it("assigns distinct audit event IDs to legitimate commands that reuse one request ID", async () => {
    const secondScope = {
      companyId: "reading-advantage",
      schoolId: "school-0002",
    } as const satisfies FinanceOperationScope;
    const secondAuthorization = {
      operation: "financial-record:append-correction",
      scope: secondScope,
      authorizationEvidence: {
        ...authorizationEvidence,
        schoolIds: [secondScope.schoolId],
      },
    } as const satisfies FinanceOperationAuthorizationInput;
    const secondScopeBaseRecord = {
      ...storedFinanceRecord,
      recordId: "finance-record-school-two-base-0001",
      scope: secondScope,
      provenance: {
        ...sourceProvenance,
        sourceRecordId: "tutor-export-school-two-base-0001",
        payloadDigest: digest("b"),
      },
    } as const satisfies FinanceRecord;
    const { repository, successAudits } = createAtomicRepository([
      secondScopeBaseRecord,
    ]);
    const { events, port: auditPort } = createAuditPort();
    const importAuthorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const correctionAuthorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const requestId = "request-audit-id-reuse-0001";

    await expect(
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort: importAuthorizationPort,
        auditPort,
        requestId,
        correlationId: "correlation-audit-id-reuse-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "accepted",
      recordId: financeRecord.recordId,
    });
    await expect(
      appendFinanceCorrection({
        repository,
        correction: {
          operation: "append-correction",
          recordId: "finance-record-school-two-correction-0001",
          supersedesRecordId: secondScopeBaseRecord.recordId,
          reason: "Correcting the school-two source value.",
          money: { amountMinor: "-250", currency: "THB" },
          provenance: {
            ...sourceProvenance,
            sourceRecordId: "tutor-export-school-two-correction-0001",
            payloadDigest: digest("c"),
          },
        },
        authorizationInput: secondAuthorization,
        authorizationPort: correctionAuthorizationPort,
        auditPort,
        requestId,
        correlationId: "correlation-audit-id-reuse-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "accepted",
      recordId: "finance-record-school-two-correction-0001",
    });
    expect(events).toHaveLength(2);
    expect(new Set(events.map((event) => event.eventId)).size).toBe(
      events.length,
    );
    expect(
      events.some(
        (event) =>
          event.operation === "financial-record:import" &&
          event.objectId === financeRecord.recordId &&
          event.scope.schoolId === scope.schoolId,
      ),
    ).toBe(true);
    expect(successAudits).toHaveLength(2);
    expect(new Set(successAudits.map((event) => event.eventId)).size).toBe(
      successAudits.length,
    );
    expect(
      events.some(
        (event) =>
          event.operation === "financial-record:append-correction" &&
          event.objectId === "finance-record-school-two-correction-0001" &&
          event.scope.schoolId === secondScope.schoolId,
      ),
    ).toBe(true);
  });

  it("authorizes and denial-audits malformed runtime input before domain validation", async () => {
    const { findByRecordId, compareAndAppend, repository } =
      createAtomicRepository();
    const { events, port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "deny" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;
    const malformedRecord = {
      ...financeRecord,
      money: { amountMinor: 250, currency: "THB" },
    };

    await expect(
      acceptFinanceRecord({
        repository,
        // @ts-expect-error Deliberately inject a malformed runtime payload before authorization.
        record: malformedRecord as FinanceRecordInput,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-malformed-denied-0001",
        correlationId: "correlation-malformed-denied-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toMatchObject({ reason: "authorization-denied" });
    expect(authorizationPort.authorizeFinanceOperation).toHaveBeenCalledWith(
      acceptanceAuthorization,
    );
    expect(findByRecordId).not.toHaveBeenCalled();
    expect(compareAndAppend).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expectFrozenAuditEvent(events[0]!, {
      operation: "financial-record:import",
      objectId: financeRecord.recordId,
      requestId: "request-malformed-denied-0001",
      correlationId: "correlation-malformed-denied-0001",
      outcome: "denied",
    });
  });

  it("rejects evidence owned by another company before persistence and audits allowed then failed", async () => {
    const { compareAndAppend, repository } = createAtomicRepository();
    const { events, port: auditPort } = createAuditPort();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => ({
        decision: "allow" as const,
      })),
    } satisfies CompanyIdentityAuthorizationPort;

    await expect(
      acceptFinanceRecord({
        repository,
        record: {
          ...financeRecord,
          provenance: {
            ...sourceProvenance,
            evidenceReference:
              "private-evidence://another-company/tutor/exports/0001.json",
          },
        },
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-evidence-scope-mismatch-0001",
        correlationId: "correlation-evidence-scope-mismatch-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toMatchObject({ reason: "evidence-scope-mismatch" });
    expect(compareAndAppend).not.toHaveBeenCalled();
    expect(events.map((event) => event.outcome)).toEqual(["allowed", "failed"]);
    for (const event of events) {
      expectFrozenAuditEvent(event, {
        operation: "financial-record:import",
        objectId: financeRecord.recordId,
        requestId: "request-evidence-scope-mismatch-0001",
        correlationId: "correlation-evidence-scope-mismatch-0001",
        outcome: event.outcome,
      });
    }
  });
});
