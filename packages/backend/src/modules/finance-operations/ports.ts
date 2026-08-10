import type {
  FinanceAuthorizationEvidence,
  FinanceOperationAuthorizationInput,
  FinanceOperationScope,
} from "./contracts.js";

/** Provider-neutral decision returned by Company Identity for a finance operation. */
export interface FinanceAuthorizationDecision {
  /** Whether the requested operation is allowed. */
  readonly decision: "allow" | "deny";
}

/** Internal Company Identity boundary used to authorize Finance Operations actions. */
export interface CompanyIdentityAuthorizationPort {
  /**
   * Evaluates a validated operation against Company Identity claims and scope.
   * @param input Validated operation authorization request.
   * @returns Company Identity's authorization decision.
   */
  authorizeFinanceOperation(
    input: FinanceOperationAuthorizationInput,
  ): Promise<FinanceAuthorizationDecision>;
}

/** Internal request for a versioned CRM billing-catalog snapshot. */
export interface CustomerBillingCatalogInput {
  /** CRM customer identity to read. */
  readonly customerId: string;
  /** Version of the CRM contract requested by the caller. */
  readonly sourceVersion: string;
  /** Explicit company and optional school scope for the read. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the read. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Versioned billing-catalog snapshot returned by the CRM boundary. */
export interface CustomerBillingCatalogSnapshot {
  /** CRM customer identity represented by the snapshot. */
  readonly customerId: string;
  /** Source contract version used to produce the snapshot. */
  readonly sourceVersion: string;
  /** Digest binding the snapshot payload. */
  readonly payloadDigest: string;
}

/** Internal CRM boundary used to read an authorized customer billing catalog. */
export interface CustomerBillingCatalogPort {
  /**
   * Reads one immutable, versioned customer billing-catalog snapshot.
   * @param input Versioned customer and authorization request.
   * @returns Immutable CRM billing-catalog snapshot.
   */
  readCustomerBillingCatalog(
    input: CustomerBillingCatalogInput,
  ): Promise<CustomerBillingCatalogSnapshot>;
}

/** Internal request for one versioned Tutor financial export. */
export interface TutorFinancialExportInput {
  /** Tutor export record identity to read. */
  readonly sourceRecordId: string;
  /** Version of the Tutor export contract requested by the caller. */
  readonly sourceVersion: string;
  /** Explicit company and optional school scope for the read. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the read. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Immutable financial export snapshot returned by the Tutor boundary. */
export interface TutorFinancialExportSnapshot {
  /** Tutor export record identity represented by the snapshot. */
  readonly sourceRecordId: string;
  /** Source contract version used to produce the snapshot. */
  readonly sourceVersion: string;
  /** Digest binding the export payload. */
  readonly payloadDigest: string;
  /** Private evidence reference for the export payload. */
  readonly evidenceReference: string;
}

/** Internal Tutor boundary used to read an authorized financial export. */
export interface TutorFinancialExportPort {
  /**
   * Reads one immutable, versioned Tutor financial export snapshot.
   * @param input Versioned Tutor export and authorization request.
   * @returns Immutable Tutor financial export snapshot.
   */
  readFinancialExport(
    input: TutorFinancialExportInput,
  ): Promise<TutorFinancialExportSnapshot>;
}

/** Internal request for an authorized private evidence read. */
export interface PrivateEvidenceStorageInput {
  /** Immutable reference to the evidence object. */
  readonly evidenceReference: string;
  /** Explicit company and optional school scope for the read. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the read. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Immutable evidence metadata returned by private storage. */
export interface PrivateEvidenceSnapshot {
  /** Immutable reference of the evidence object read. */
  readonly evidenceReference: string;
  /** Digest binding the evidence payload. */
  readonly payloadDigest: string;
}

/** Internal private-storage boundary used for authorized evidence reads. */
export interface PrivateEvidenceStoragePort {
  /**
   * Reads evidence metadata without exposing a storage-provider SDK.
   * @param input Evidence reference and authorization request.
   * @returns Immutable evidence metadata.
   */
  readAuthorizedEvidence(
    input: PrivateEvidenceStorageInput,
  ): Promise<PrivateEvidenceSnapshot>;
}

/** Internal request for one durable, idempotent finance job. */
export interface DurableJobInput {
  /** Logical operation the worker must execute. */
  readonly operation: string;
  /** Stable replay key for the requested job. */
  readonly idempotencyKey: string;
  /** Digest binding the job payload. */
  readonly payloadDigest: string;
  /** Explicit company and optional school scope for the job. */
  readonly scope: FinanceOperationScope;
  /** Company Identity evidence authorizing the job. */
  readonly authorizationEvidence: FinanceAuthorizationEvidence;
}

/** Durable-job identity returned after enqueueing a finance operation. */
export interface DurableJobReceipt {
  /** Durable job identity assigned by the job adapter. */
  readonly jobId: string;
  /** Idempotency key accepted by the job adapter. */
  readonly idempotencyKey: string;
}

/** Provider-neutral durable-job acceptance, replay, or conflict result. */
export type DurableJobResult =
  | {
      readonly status: "accepted" | "replay";
      readonly receipt: DurableJobReceipt;
    }
  | {
      readonly status: "conflict";
      readonly receipt: DurableJobReceipt;
      readonly reason:
        "operation-mismatch" | "payload-digest-mismatch" | "scope-mismatch";
    };

/** Internal durable-job boundary for asynchronous Finance Operations work. */
export interface DurableJobPort {
  /**
   * Enqueues one authenticated, versioned, idempotent finance operation.
   * @param input Authenticated operation and idempotency request.
   * @returns Durable job acceptance, replay, or conflict result.
   */
  enqueue(input: DurableJobInput): Promise<DurableJobResult>;
}
