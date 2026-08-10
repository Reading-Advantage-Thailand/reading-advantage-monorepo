import { describe, expect, it, vi } from "vitest";

import type { FinanceAuditEvent, FinanceAuditPort } from "../audit.js";
import type {
  FinanceAuthorizationEvidence,
  FinanceOperationAuthorizationInput,
  FinanceOperationScope,
} from "../contracts.js";
import { FinanceMoneyOperationError, sumFinanceMoney } from "../money.js";
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
  money: {
    amountMinor: "250",
    currency: "THB",
  },
  provenance: sourceProvenance,
} as const satisfies FinanceRecordInput;

const storedFinanceRecord = {
  ...financeRecord,
  scope,
} as const satisfies FinanceRecord;

/** Compares two Finance scopes without allowing a record identity to cross tenants. */
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

/** Creates a deterministic in-memory atomic repository that scopes both unique identities. */
function createAtomicRepository(
  initialRecords: readonly FinanceRecord[] = [],
): {
  readonly records: FinanceRecord[];
  readonly findByRecordId: ReturnType<typeof vi.fn>;
  readonly compareAndAppend: ReturnType<typeof vi.fn>;
  readonly repository: FinanceRecordRepository;
} {
  const records = [...initialRecords];
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
  const repository = {
    findByRecordId,
    compareAndAppend,
  } satisfies FinanceRecordRepository;

  return { records, findByRecordId, compareAndAppend, repository };
}

/** Creates an allowing Company Identity port for an explicitly authenticated test command. */
function createAllowingAuthorizationPort(): CompanyIdentityAuthorizationPort {
  return {
    authorizeFinanceOperation: async () => ({ decision: "allow" }),
  };
}

/** Creates a provider-neutral audit port that retains command audit evidence in memory. */
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

describe("Finance Operations money and immutable record history", () => {
  it("sums canonical minor-unit strings exactly without conversion or rounding", () => {
    const money = [
      { amountMinor: "90071992547409931234567890", currency: "THB" },
      { amountMinor: "-90071992547409931234567889", currency: "THB" },
      { amountMinor: "2", currency: "THB" },
      { amountMinor: "-1", currency: "THB" },
      { amountMinor: "0", currency: "THB" },
    ] as const;
    const beforeSum = structuredClone(money);

    expect(sumFinanceMoney(money)).toEqual({
      amountMinor: "2",
      currency: "THB",
    });
    expect(sumFinanceMoney([{ amountMinor: "0", currency: "THB" }])).toEqual({
      amountMinor: "0",
      currency: "THB",
    });
    expect(money).toEqual(beforeSum);
  });

  it("rejects mixed currencies before summing with an explicit currency-mismatch error", () => {
    const money = [
      { amountMinor: "90071992547409931234567890", currency: "THB" },
      { amountMinor: "-90071992547409931234567889", currency: "USD" },
    ] as const;

    expect(() => sumFinanceMoney(money)).toThrow(FinanceMoneyOperationError);
    try {
      sumFinanceMoney(money);
    } catch (error) {
      expect(error).toMatchObject({ reason: "currency-mismatch" });
    }
  });

  it("atomically appends a record, replays an identical source, and rejects a conflicting payload", async () => {
    const { records, repository } = createAtomicRepository();
    const { port: auditPort } = createAuditPort();
    const authorizationPort = createAllowingAuthorizationPort();

    await expect(
      acceptFinanceRecord({
        repository,
        record: financeRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-record-accepted-0001",
        correlationId: "correlation-record-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({ status: "accepted", recordId: "finance-record-0001" });
    await expect(
      acceptFinanceRecord({
        repository,
        record: {
          ...financeRecord,
          provenance: {
            ...sourceProvenance,
            importBatchId: "finance-import-0002",
          },
        },
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-record-replay-0001",
        correlationId: "correlation-record-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "replay",
      acceptedRecordId: "finance-record-0001",
    });
    await expect(
      acceptFinanceRecord({
        repository,
        record: {
          ...financeRecord,
          provenance: { ...sourceProvenance, payloadDigest: digest("b") },
        },
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-record-conflict-0001",
        correlationId: "correlation-record-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "conflict",
      acceptedRecordId: "finance-record-0001",
      reason: "payload-digest-mismatch",
    });
    expect(records).toEqual([storedFinanceRecord]);
  });

  it("does not treat a changed source identity as a replay", async () => {
    const { records, repository } = createAtomicRepository([
      storedFinanceRecord,
    ]);
    const { port: auditPort } = createAuditPort();
    const authorizationPort = createAllowingAuthorizationPort();
    const distinctRecord = {
      ...financeRecord,
      recordId: "finance-record-0002",
      provenance: {
        ...sourceProvenance,
        sourceRecordId: "tutor-export-0002",
      },
    } as const satisfies FinanceRecordInput;
    const storedDistinctRecord = {
      ...distinctRecord,
      scope,
    } as const satisfies FinanceRecord;

    await expect(
      acceptFinanceRecord({
        repository,
        record: { ...distinctRecord, recordId: "finance-record-0001" },
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-record-id-conflict-0001",
        correlationId: "correlation-record-0002",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({
      status: "conflict",
      acceptedRecordId: "finance-record-0001",
      reason: "record-id-conflict",
    });
    await expect(
      acceptFinanceRecord({
        repository,
        record: distinctRecord,
        authorizationInput: acceptanceAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-distinct-record-0001",
        correlationId: "correlation-record-0002",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({ status: "accepted", recordId: "finance-record-0002" });
    expect(records).toEqual([storedFinanceRecord, storedDistinctRecord]);
  });

  it("appends a distinct correction without altering its accepted snapshot", async () => {
    const { records, repository } = createAtomicRepository([
      storedFinanceRecord,
    ]);
    const { port: auditPort } = createAuditPort();
    const authorizationPort = createAllowingAuthorizationPort();
    const acceptedSnapshot = structuredClone(storedFinanceRecord);
    const correction = {
      operation: "append-correction",
      recordId: "finance-record-0002",
      supersedesRecordId: "finance-record-0001",
      reason: "Correcting a duplicated source adjustment.",
      money: { amountMinor: "-250", currency: "THB" },
      provenance: {
        ...sourceProvenance,
        sourceRecordId: "tutor-export-0001-correction",
        payloadDigest: digest("c"),
      },
    } as const;
    const storedCorrection = {
      recordId: correction.recordId,
      money: correction.money,
      provenance: correction.provenance,
      supersedesRecordId: correction.supersedesRecordId,
      correctionReason: correction.reason,
      scope,
    } as const satisfies FinanceRecord;

    await expect(
      appendFinanceCorrection({
        repository,
        correction,
        authorizationInput: correctionAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-correction-accepted-0001",
        correlationId: "correlation-correction-0001",
        occurredAt: canonicalOccurredAt,
      }),
    ).resolves.toEqual({ status: "accepted", recordId: "finance-record-0002" });
    expect(storedFinanceRecord).toEqual(acceptedSnapshot);
    expect(records).toEqual([storedFinanceRecord, storedCorrection]);
  });

  it("rejects missing or self-superseding corrections without writing", async () => {
    const { records, repository } = createAtomicRepository([
      storedFinanceRecord,
    ]);
    const { port: auditPort } = createAuditPort();
    const authorizationPort = createAllowingAuthorizationPort();
    const acceptedBeforeCorrections = structuredClone(records);
    const correction = {
      operation: "append-correction",
      recordId: "finance-record-0002",
      supersedesRecordId: "finance-record-0001",
      reason: "Correcting a duplicated source adjustment.",
      money: { amountMinor: "-250", currency: "THB" },
      provenance: {
        ...sourceProvenance,
        sourceRecordId: "tutor-export-0001-correction",
        payloadDigest: digest("c"),
      },
    } as const;

    await expect(
      appendFinanceCorrection({
        repository,
        correction: { ...correction, supersedesRecordId: "missing-record" },
        authorizationInput: correctionAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-correction-missing-0001",
        correlationId: "correlation-correction-0002",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toThrow();
    await expect(
      appendFinanceCorrection({
        repository,
        correction: {
          ...correction,
          recordId: "finance-record-0001",
          supersedesRecordId: "finance-record-0001",
        },
        authorizationInput: correctionAuthorization,
        authorizationPort,
        auditPort,
        requestId: "request-correction-self-0001",
        correlationId: "correlation-correction-0002",
        occurredAt: canonicalOccurredAt,
      }),
    ).rejects.toThrow();
    expect(records).toEqual(acceptedBeforeCorrections);
  });
});
