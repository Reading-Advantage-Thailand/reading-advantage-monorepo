import { ZodError } from "zod";
import { describe, expect, it, vi } from "vitest";

import type { FinanceAuditEvent } from "../audit.js";
import type { FinanceRecord, FinanceRecordRepository } from "../records.js";

/** Flattened tenant scope passed across the db-to-backend record-store seam. */
interface FinanceRecordStoreScope {
  readonly companyId: string;
  readonly schoolId?: string;
}

/** Raw succeeded audit event accepted by the database-owned atomic seam. */
interface FinanceRecordSuccessAuditInput extends FinanceRecordStoreScope {
  readonly eventId: string;
  readonly actorSubjectId: string;
  readonly operation:
    | "financial-record:import"
    | "financial-record:append-correction";
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
}

/** Raw immutable record projection returned by the db-owned Finance store. */
type FinanceRecordStoreRow = FinanceRecordStoreScope & {
  readonly recordId: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly sourceSystem: string;
  readonly sourceVersion: string;
  readonly sourceRecordId: string;
  readonly importBatchId: string;
  readonly payloadDigest: string;
  readonly evidenceReference: string;
  readonly supersedesRecordId?: string;
  readonly correctionReason?: string;
};

/** Expected raw store boundary used by the Finance backend repository adapter. */
interface FinanceOperationsRecordStore {
  /** Finds one record within the explicit company and optional school scope. */
  findByRecordId(
    identity: Readonly<FinanceRecordStoreScope & { readonly recordId: string }>,
  ): Promise<FinanceRecordStoreRow | null>;
  /** Appends a raw row and its succeeded audit event in one transaction. */
  appendWithSuccessAudit(
    input: Readonly<FinanceRecordStoreRow>,
    audit: Readonly<FinanceRecordSuccessAuditInput>,
  ): Promise<
    Readonly<{
      readonly outcome: "inserted" | "existing";
      readonly row: FinanceRecordStoreRow;
    }>
  >;
}

/** Expected exports of the future backend Finance PostgreSQL repository adapter. */
interface FinanceRecordRepositoryModule {
  /** Adapts raw PostgreSQL Finance rows to validated transport-neutral repository records. */
  createPostgresFinanceRecordRepository(
    store: FinanceOperationsRecordStore,
  ): FinanceRecordRepository;
}

/** Produces a valid Finance record candidate with its tenant boundary kept separate from storage fields. */
function financeRecord(overrides: Partial<FinanceRecord> = {}): FinanceRecord {
  return {
    scope: { companyId: "company-amber", schoolId: "school-north" },
    recordId: "finance-record-001",
    money: { amountMinor: "12500", currency: "THB" },
    provenance: {
      sourceSystem: "tutor-export",
      sourceVersion: "2026-08-10",
      sourceRecordId: "tutor-row-001",
      importBatchId: "batch-001",
      payloadDigest: "a".repeat(64),
      evidenceReference: "private-evidence://company-amber/finance/receipt-001",
    },
    ...overrides,
  };
}

/** Flattens a validated Finance domain record into the raw database-store row contract. */
function storeRow(record: Readonly<FinanceRecord>): FinanceRecordStoreRow {
  return {
    companyId: record.scope.companyId,
    ...(record.scope.schoolId === undefined
      ? {}
      : { schoolId: record.scope.schoolId }),
    recordId: record.recordId,
    amountMinor: record.money.amountMinor,
    currency: record.money.currency,
    sourceSystem: record.provenance.sourceSystem,
    sourceVersion: record.provenance.sourceVersion,
    sourceRecordId: record.provenance.sourceRecordId,
    importBatchId: record.provenance.importBatchId,
    payloadDigest: record.provenance.payloadDigest,
    evidenceReference: record.provenance.evidenceReference,
    ...(record.supersedesRecordId === undefined
      ? {}
      : { supersedesRecordId: record.supersedesRecordId }),
    ...(record.correctionReason === undefined
      ? {}
      : { correctionReason: record.correctionReason }),
  };
}

/** Creates a valid succeeded event that the adapter must flatten for persistence. */
function successAudit(
  record: Readonly<FinanceRecord>,
  eventId = "finance-audit-001",
): FinanceAuditEvent {
  return {
    eventId,
    actorSubjectId: "employee-0001",
    operation: "financial-record:import",
    objectType: "financial-record",
    objectId: record.recordId,
    occurredAt: "2026-08-10T02:04:05.678Z",
    requestId: "request-001",
    correlationId: "correlation-001",
    scope: record.scope,
    outcome: "succeeded",
  };
}

/** Creates a controllable raw store double without coupling this RED test to postgres.js. */
function storeDouble(): {
  readonly store: FinanceOperationsRecordStore;
  readonly findByRecordId: ReturnType<typeof vi.fn>;
  readonly appendWithSuccessAudit: ReturnType<typeof vi.fn>;
} {
  const findByRecordId = vi.fn();
  const appendWithSuccessAudit = vi.fn();
  return {
    store: {
      findByRecordId,
      appendWithSuccessAudit,
    } as FinanceOperationsRecordStore,
    findByRecordId,
    appendWithSuccessAudit,
  };
}

/** Loads the future adapter only when a RED test executes. */
async function loadRepository(): Promise<FinanceRecordRepositoryModule> {
  return (await import("../postgres-record-repository.js")) as FinanceRecordRepositoryModule;
}

describe("Finance Operations PostgreSQL record repository adapter", () => {
  it("maps an accepted raw row to the exact validated Finance record contract", async () => {
    const candidate = financeRecord();
    const double = storeDouble();
    double.appendWithSuccessAudit.mockResolvedValue({
      outcome: "inserted",
      row: storeRow(candidate),
    });
    const { createPostgresFinanceRecordRepository } = await loadRepository();
    const repository = createPostgresFinanceRecordRepository(double.store);
    const audit = successAudit(candidate);

    expect(repository).not.toHaveProperty("compareAndAppend");
    await expect(
      repository.appendWithSuccessAudit(candidate, audit),
    ).resolves.toEqual({
      status: "accepted",
      record: candidate,
    });
    expect(double.appendWithSuccessAudit).toHaveBeenCalledWith(
      storeRow(candidate),
      {
        companyId: "company-amber",
        schoolId: "school-north",
        eventId: "finance-audit-001",
        actorSubjectId: "employee-0001",
        operation: "financial-record:import",
        objectId: "finance-record-001",
        occurredAt: "2026-08-10T02:04:05.678Z",
        requestId: "request-001",
        correlationId: "correlation-001",
      },
    );
  });

  it("preserves the requested school scope through lookup and maps the raw row back to that scope", async () => {
    const record = financeRecord();
    const double = storeDouble();
    double.findByRecordId.mockResolvedValue(storeRow(record));
    const { createPostgresFinanceRecordRepository } = await loadRepository();
    const repository = createPostgresFinanceRecordRepository(double.store);

    await expect(
      repository.findByRecordId({
        scope: record.scope,
        recordId: record.recordId,
      }),
    ).resolves.toEqual(record);
    expect(double.findByRecordId).toHaveBeenCalledWith({
      companyId: "company-amber",
      schoolId: "school-north",
      recordId: "finance-record-001",
    });
  });

  it("rejects a raw row that financeRecordSchema would not accept instead of leaking it across the repository boundary", async () => {
    const candidate = financeRecord();
    const double = storeDouble();
    double.appendWithSuccessAudit.mockResolvedValue({
      outcome: "existing",
      row: {
        ...storeRow(candidate),
        payloadDigest: "not-a-sha256-digest",
      },
    });
    const { createPostgresFinanceRecordRepository } = await loadRepository();
    const repository = createPostgresFinanceRecordRepository(double.store);

    await expect(
      repository.appendWithSuccessAudit(candidate, successAudit(candidate)),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("keeps otherwise-identical identities independent across companies and schools", async () => {
    const companyPeer = financeRecord({
      scope: { companyId: "company-indigo", schoolId: "school-north" },
      provenance: {
        sourceSystem: "tutor-export",
        sourceVersion: "2026-08-10",
        sourceRecordId: "tutor-row-001",
        importBatchId: "batch-001",
        payloadDigest: "a".repeat(64),
        evidenceReference:
          "private-evidence://company-indigo/finance/receipt-001",
      },
    });
    const schoolPeer = financeRecord({
      scope: { companyId: "company-amber", schoolId: "school-south" },
    });
    const double = storeDouble();
    double.appendWithSuccessAudit.mockImplementation(
      async (input: FinanceRecordStoreRow) => ({
        outcome: "inserted",
        row: input,
      }),
    );
    const { createPostgresFinanceRecordRepository } = await loadRepository();
    const repository = createPostgresFinanceRecordRepository(double.store);

    await expect(
      repository.appendWithSuccessAudit(companyPeer, successAudit(companyPeer)),
    ).resolves.toEqual({
      status: "accepted",
      record: companyPeer,
    });
    await expect(
      repository.appendWithSuccessAudit(
        schoolPeer,
        successAudit(schoolPeer, "finance-audit-002"),
      ),
    ).resolves.toEqual({
      status: "accepted",
      record: schoolPeer,
    });
    expect(double.appendWithSuccessAudit).toHaveBeenNthCalledWith(
      1,
      storeRow(companyPeer),
      expect.objectContaining({ companyId: "company-indigo" }),
    );
    expect(double.appendWithSuccessAudit).toHaveBeenNthCalledWith(
      2,
      storeRow(schoolPeer),
      expect.objectContaining({ schoolId: "school-south" }),
    );
  });
});
