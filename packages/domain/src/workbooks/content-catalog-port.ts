import type {
  WorkbookIncompatibilityIssue,
  WorkbookSourceApp,
  WorkbookSourceIdentity,
  WorkbookSourceRecord,
} from "./contracts.js";

/** Portable error codes exposed by content catalog adapters. */
export type WorkbookCatalogErrorCode =
  | "VALIDATION_ERROR"
  | "TENANT_SCOPE_ERROR"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_NOT_ELIGIBLE"
  | "INCOMPATIBLE_SOURCE_SHAPE"
  | "CATALOG_UNAVAILABLE"
  | "CATALOG_TIMEOUT"
  | "INTERNAL_ERROR";

/** Construction metadata for a portable content catalog error. */
export interface WorkbookCatalogErrorOptions {
  /** Whether callers may safely retry the failed read. */
  retryable?: boolean;
  /** Provider error retained for server-side diagnostics. */
  cause?: unknown;
  /** Shape incompatibilities that made a source record unusable. */
  issues?: WorkbookIncompatibilityIssue[];
}

const DEFAULT_RETRYABILITY: Readonly<Record<WorkbookCatalogErrorCode, boolean>> = {
  VALIDATION_ERROR: false,
  TENANT_SCOPE_ERROR: false,
  SOURCE_NOT_FOUND: false,
  SOURCE_NOT_ELIGIBLE: false,
  INCOMPATIBLE_SOURCE_SHAPE: false,
  CATALOG_UNAVAILABLE: true,
  CATALOG_TIMEOUT: true,
  INTERNAL_ERROR: false,
};

/** Provider-neutral error returned by content catalog adapters. */
export class WorkbookCatalogError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: WorkbookCatalogErrorCode;

  /** Whether callers may safely retry the failed read. */
  readonly retryable: boolean;

  /** Shape incompatibilities that made a source record unusable. */
  readonly issues: readonly WorkbookIncompatibilityIssue[];

  /**
   * Creates a portable content catalog error.
   * @param code Stable machine-readable failure code.
   * @param message Safe provider-neutral explanation.
   * @param options Retryability, internal diagnostic cause, and incompatibility issues.
   */
  constructor(
    code: WorkbookCatalogErrorCode,
    message: string,
    options: WorkbookCatalogErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WorkbookCatalogError";
    this.code = code;
    this.retryable = options.retryable ?? DEFAULT_RETRYABILITY[code];
    this.issues = options.issues ?? [];
  }
}

/** Caller's authorization scope required for every content catalog read. */
export interface WorkbookCatalogContext {
  /** Tenant the caller is acting on behalf of. */
  tenantId: string;
  /** Identity of the editor performing the read. */
  editorId: string;
  /** Roles held by the caller within the tenant. */
  roles: readonly string[];
}

/**
 * Read-only query for listing eligible curriculum content.
 * The catalog rejects any request outside the caller's authorization scope.
 */
export interface WorkbookCatalogQuery {
  /** Owning app whose curriculum content is being listed. */
  sourceApp: WorkbookSourceApp;
  /** Optional CEFR level filter applied before eligibility checks. */
  cefrLevel?: string;
  /** Optional maximum number of sources to return. */
  limit?: number;
  /** Optional opaque cursor for paging through additional results. */
  cursor?: string;
}

/** Compact, eligibility-checked summary of one curriculum source. */
export interface WorkbookSourceSummary {
  /** Stable identity of the source record in the owning app. */
  identity: WorkbookSourceIdentity;
  /** Human-readable title of the source record. */
  title: string;
  /** CEFR level assigned to the source record. */
  cefrLevel: string;
}

/**
 * Read-only ownership boundary through which the workbook publishing platform
 * consumes curriculum content owned by Reading Advantage and Primary Advantage.
 *
 * The owning apps remain the canonical holders of this content; the workbook
 * platform only reads it and must never mutate it, copy it as canonical, or
 * join the owning databases. Implementations reject ineligible or
 * out-of-scope requests by throwing WorkbookCatalogError rather than
 * returning partial data.
 */
export interface ContentCatalogPort {
  /**
   * Lists sources in the owning app that are eligible for workbook use.
   * @param context Caller's authorization scope.
   * @param query App, filters, and paging for the listing.
   * @returns Eligible source summaries matching the query.
   * @throws WorkbookCatalogError when the request is out of scope or ineligible.
   */
  listEligibleSources(
    context: WorkbookCatalogContext,
    query: WorkbookCatalogQuery,
  ): Promise<readonly WorkbookSourceSummary[]>;

  /**
   * Reads the normalized source record for one eligible identity.
   * @param context Caller's authorization scope.
   * @param identity Stable identity of the source in the owning app.
   * @returns The normalized source record and its shape-compatible content.
   * @throws WorkbookCatalogError when the source is missing, ineligible, or incompatible.
   */
  getSourceRecord(
    context: WorkbookCatalogContext,
    identity: WorkbookSourceIdentity,
  ): Promise<WorkbookSourceRecord>;
}
