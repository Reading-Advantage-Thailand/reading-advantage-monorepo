import { auditMetadataSchema } from "@reading-advantage/db/company-identity";
import { z } from "zod";

/** Opaque credential accepted by the Company Identity Finance attestation boundary. */
export interface FinanceAttestationCredential {
  /** Credential transport selected by the authenticated caller. */
  readonly kind: "session" | "token";
  /** Opaque credential value that this adapter never records. */
  readonly value: string;
}

/** Company-first scope requested for a Finance attestation. */
export interface FinanceAttestationScope {
  /** Company that owns the requested operation. */
  readonly companyId: string;
  /** Optional school that narrows the requested operation. */
  readonly schoolId?: string;
}

/** Authenticated owner claims issued by the Company Identity owner boundary. */
export interface FinanceAuthenticatedOwnerClaims {
  /** Version of the claims contract. */
  readonly claimsVersion: string;
  /** Authenticated employee subject. */
  readonly subjectId: string;
  /** Organization bound to the authenticated subject. */
  readonly organizationId: string;
  /** Application role identifiers issued to the subject. */
  readonly appRoleIds: readonly string[];
  /** School attestations issued for the subject, when available. */
  readonly schoolIds?: readonly string[];
}

/** Authentication port that resolves an opaque owner credential. */
export interface CompanyIdentityFinanceAuthenticator {
  /** Resolves one credential to verified owner claims. */
  authenticate(input: {
    readonly credential: Readonly<FinanceAttestationCredential>;
  }): Promise<Readonly<FinanceAuthenticatedOwnerClaims> | undefined>;
}

/** Injected and versioned role decision for the bounded Finance operation. */
export interface FinanceRolePolicy {
  /** Version of the reviewed role decision. */
  readonly policyVersion: string;
  /** Role identifiers accepted by this role decision. */
  readonly acceptedRoleIds: readonly string[];
}

/** Exact correlation fields recorded by the immutable attestation audit. */
export interface FinanceAttestationAuditContext {
  /** Immutable authorization event identity. */
  readonly eventId: string;
  /** Finance packet identity bound to the authorization event. */
  readonly objectId: string;
  /** UTC instant at which attestation was requested. */
  readonly occurredAt: string;
  /** Request identifier propagated through the authorization boundary. */
  readonly requestId: string;
  /** Correlation identifier shared with the Finance command. */
  readonly correlationId: string;
}

/** Actor identity retained without recording a credential. */
export type FinanceAttestationAuditActor =
  | { readonly kind: "authenticated-owner"; readonly subjectId: string }
  | { readonly kind: "unauthenticated" };

/** Stable result reason for a Finance attestation audit event. */
export type FinanceAttestationAuditReason =
  | "role-policy-accepted"
  | "unauthenticated"
  | "claims-version-missing"
  | "organization-mismatch"
  | "role-not-accepted"
  | "school-attestation-missing"
  | "authentication-failed";

/** Immutable audit event for one Finance attestation decision. */
export interface FinanceAttestationAuditEvent extends FinanceAttestationAuditContext {
  /** Actor recovered from the credential, when available. */
  readonly actor: FinanceAttestationAuditActor;
  /** Finance operation evaluated by this attestation. */
  readonly operation: "historical-private-evidence:import";
  /** Exact company-first scope evaluated by this attestation. */
  readonly scope: Readonly<FinanceAttestationScope>;
  /** Authorization result retained by the immutable audit boundary. */
  readonly outcome: "allowed" | "denied" | "failed";
  /** Stable reason for the recorded result. */
  readonly reason: FinanceAttestationAuditReason;
  /** Version of the reviewed role policy used for this decision. */
  readonly policyVersion: string;
  /** Version of the authenticated claims, or null when authentication produced none. */
  readonly claimsVersion: string | null;
}

/** Append-only audit port controlled by the Company Identity owner. */
export interface FinanceAttestationAuditPort {
  /** Appends one immutable Finance attestation audit event. */
  append(event: Readonly<FinanceAttestationAuditEvent>): Promise<void>;
}

/** Trusted server-owned values for a Finance attestation audit event. */
export interface FinanceAttestationTrustedAuditSources {
  /** Creates one immutable audit event identifier. */
  readonly createEventId: () => string;
  /** Creates one request identifier. */
  readonly createRequestId: () => string;
  /** Creates one correlation identifier. */
  readonly createCorrelationId: () => string;
  /** Gets the trusted current time. */
  readonly now: () => Date;
}

/** Minimal durable Company Identity audit repository used by the Finance adapter. */
export interface CompanyIdentityFinanceAuditRepository {
  /** Appends one immutable Company Identity audit event. */
  appendAudit(input: Readonly<Record<string, unknown>>): Promise<void>;
}

/** Allowed or denied result from the Finance attestation boundary. */
export type FinanceAttestationDecision =
  | {
      readonly decision: "allow";
      readonly evidence: Readonly<{
        readonly source: "company-identity";
        readonly claimsVersion: string;
        readonly subjectId: string;
        readonly organizationId: string;
        readonly appRoleIds: readonly string[];
        readonly schoolIds?: readonly string[];
        /** Version of the injected role policy. */
        readonly policyVersion: string;
      }>;
    }
  | {
      readonly decision: "deny";
      readonly reason: Exclude<
        FinanceAttestationAuditReason,
        "role-policy-accepted" | "authentication-failed"
      >;
    };

/** Company Identity adapter consumed by the Finance historical packet command. */
export interface FinanceCompanyIdentityAttestor {
  /** Attests one Finance operation with an authenticated owner credential. */
  attest(input: {
    readonly operation: "historical-private-evidence:import";
    readonly scope: Readonly<FinanceAttestationScope>;
    readonly credential: Readonly<FinanceAttestationCredential>;
    readonly audit: Readonly<FinanceAttestationAuditContext>;
  }): Promise<FinanceAttestationDecision>;
}

/** Freezes an object and each direct nested object or array. */
function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      freezeDeep(nested);
    }
    Object.freeze(value);
  }
  return value;
}

/** Returns true when a string is safe for bounded audit persistence. */
function isBoundedAuditString(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    !/\S/u.test(value)
  ) {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return false;
    }
  }
  return true;
}

const attestationRequestTextSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/\S/u)
  .refine(isBoundedAuditString);
const attestationCredentialValueSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/\S/u)
  .refine((value) => {
    for (const character of value) {
      const codePoint = character.codePointAt(0);
      if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
        return false;
      }
    }
    return true;
  });
const attestationRequestSchema = z.strictObject({
  operation: z.literal("historical-private-evidence:import"),
  scope: z.strictObject({
    companyId: attestationRequestTextSchema,
    schoolId: attestationRequestTextSchema.optional(),
  }),
  credential: z.strictObject({
    kind: z.enum(["session", "token"]),
    value: attestationCredentialValueSchema,
  }),
  audit: z.strictObject({
    eventId: attestationRequestTextSchema,
    objectId: attestationRequestTextSchema,
    occurredAt: attestationRequestTextSchema,
    requestId: attestationRequestTextSchema,
    correlationId: attestationRequestTextSchema,
  }),
});

const financeAttestationAuditEventSchema = z.strictObject({
  eventId: attestationRequestTextSchema,
  objectId: attestationRequestTextSchema,
  occurredAt: z.string().datetime({ offset: true }),
  requestId: attestationRequestTextSchema,
  correlationId: attestationRequestTextSchema,
  actor: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("authenticated-owner"),
      subjectId: attestationRequestTextSchema,
    }),
    z.strictObject({ kind: z.literal("unauthenticated") }),
  ]),
  operation: z.literal("historical-private-evidence:import"),
  scope: z.strictObject({
    companyId: attestationRequestTextSchema,
    schoolId: attestationRequestTextSchema.optional(),
  }),
  outcome: z.enum(["allowed", "denied", "failed"]),
  reason: z.enum([
    "role-policy-accepted",
    "unauthenticated",
    "claims-version-missing",
    "organization-mismatch",
    "role-not-accepted",
    "school-attestation-missing",
    "authentication-failed",
  ]),
  policyVersion: attestationRequestTextSchema,
  claimsVersion: attestationRequestTextSchema.nullable(),
});

type NormalizedFinanceClaims = {
  readonly claimsVersion: string | null;
  readonly subjectId: string | null;
  readonly organizationId: string | null;
  readonly appRoleIds: readonly string[] | undefined;
  readonly schoolIds: readonly string[] | undefined;
};

/** Reads one bounded claim string without retaining malformed provider data. */
function readBoundedClaimString(
  candidate: Record<string, unknown>,
  key: string,
): string | null {
  try {
    const value = candidate[key];
    return isBoundedAuditString(value) ? value : null;
  } catch {
    return null;
  }
}

/** Reads a copied bounded claim list without retaining malformed provider data. */
function readBoundedClaimList(
  candidate: Record<string, unknown>,
  key: string,
): readonly string[] | undefined {
  try {
    const value = candidate[key];
    if (!Array.isArray(value)) return undefined;
    const copy: string[] = [];
    for (const entry of value) {
      if (!isBoundedAuditString(entry)) return undefined;
      copy.push(entry);
    }
    if (copy.length === 0) return undefined;
    return Object.freeze(copy);
  } catch {
    return undefined;
  }
}

/** Snapshots authenticator claims into bounded, audit-safe values immediately after authentication. */
function normalizeFinanceClaims(
  value: unknown,
): NormalizedFinanceClaims | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") {
    return Object.freeze({
      claimsVersion: null,
      subjectId: null,
      organizationId: null,
      appRoleIds: undefined,
      schoolIds: undefined,
    });
  }
  const candidate = value as Record<string, unknown>;
  return Object.freeze({
    claimsVersion: readBoundedClaimString(candidate, "claimsVersion"),
    subjectId: readBoundedClaimString(candidate, "subjectId"),
    organizationId: readBoundedClaimString(candidate, "organizationId"),
    appRoleIds: readBoundedClaimList(candidate, "appRoleIds"),
    schoolIds: readBoundedClaimList(candidate, "schoolIds"),
  });
}

const MAX_FINANCE_ACCEPTED_ROLE_IDS = 128;

/** Returns a bounded, single-pass copy when every role entry is present and audit-safe. */
function copyStringArray(value: unknown): readonly string[] | undefined {
  try {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const length = value.length;
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > MAX_FINANCE_ACCEPTED_ROLE_IDS
    ) {
      return undefined;
    }
    const copy = new Array<string>(length);
    for (let index = 0; index < length; index += 1) {
      if (!(index in value)) return undefined;
      const entry = value[index];
      if (!isBoundedAuditString(entry)) return undefined;
      copy[index] = entry;
    }
    return Object.freeze(copy);
  } catch {
    return undefined;
  }
}

/** Returns true when a boundary value is a plain object with no custom prototype. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  try {
    return (
      value !== null &&
      typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
}

/** Reads one required own property without retaining a provider-backed object. */
function readRequiredProperty(
  value: Record<string, unknown>,
  key: string,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    throw new Error("missing audit property");
  }
  return value[key];
}

/** Reads one optional own property without invoking an accessor more than once. */
function readOptionalProperty(
  value: Record<string, unknown>,
  key: string,
): unknown {
  return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
}

/** Captures and validates the complete Finance audit event before any await. */
function snapshotFinanceAttestationAuditEvent(
  value: unknown,
): FinanceAttestationAuditEvent | undefined {
  try {
    if (!isPlainRecord(value)) return undefined;
    const actorValue = readRequiredProperty(value, "actor");
    const scopeValue = readRequiredProperty(value, "scope");
    if (!isPlainRecord(actorValue) || !isPlainRecord(scopeValue)) {
      return undefined;
    }
    const actorKind = readRequiredProperty(actorValue, "kind");
    const actor =
      actorKind === "authenticated-owner"
        ? {
            kind: actorKind,
            subjectId: readRequiredProperty(actorValue, "subjectId"),
          }
        : actorKind === "unauthenticated"
          ? { kind: actorKind }
          : undefined;
    if (actor === undefined) return undefined;
    const snapshot = {
      eventId: readRequiredProperty(value, "eventId"),
      objectId: readRequiredProperty(value, "objectId"),
      occurredAt: readRequiredProperty(value, "occurredAt"),
      requestId: readRequiredProperty(value, "requestId"),
      correlationId: readRequiredProperty(value, "correlationId"),
      actor,
      operation: readRequiredProperty(value, "operation"),
      scope: {
        companyId: readRequiredProperty(scopeValue, "companyId"),
        schoolId: readOptionalProperty(scopeValue, "schoolId"),
      },
      outcome: readRequiredProperty(value, "outcome"),
      reason: readRequiredProperty(value, "reason"),
      policyVersion: readRequiredProperty(value, "policyVersion"),
      claimsVersion: readRequiredProperty(value, "claimsVersion"),
    };
    const parsed = financeAttestationAuditEventSchema.safeParse(snapshot);
    return parsed.success
      ? freezeDeep(parsed.data as FinanceAttestationAuditEvent)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Creates a Company Identity-owned attestor for Finance historical evidence packets.
 * @param input Authenticator, reviewed policy, durable audit port, and trusted audit sources.
 * @returns A frozen Finance Company Identity attestor.
 */
export function createFinanceCompanyIdentityAttestor(input: {
  /** Authenticator that resolves the opaque credential once. */
  readonly authenticator: CompanyIdentityFinanceAuthenticator;
  /** Injected reviewed role policy for this bounded operation. */
  readonly rolePolicy: FinanceRolePolicy;
  /** Append-only audit boundary for each result. */
  readonly auditPort: FinanceAttestationAuditPort;
  /** Trusted server-owned audit IDs and time used instead of caller values. */
  readonly trustedAuditSources: FinanceAttestationTrustedAuditSources;
}): FinanceCompanyIdentityAttestor {
  let authenticator: CompanyIdentityFinanceAuthenticator | undefined;
  let rolePolicy: FinanceRolePolicy | undefined;
  let auditPort: FinanceAttestationAuditPort | undefined;
  let trustedAuditSources: FinanceAttestationTrustedAuditSources | undefined;
  try {
    authenticator = input?.authenticator;
    rolePolicy = input?.rolePolicy;
    auditPort = input?.auditPort;
    trustedAuditSources = input?.trustedAuditSources;
  } catch {
    throw new Error("COMPANY_IDENTITY_FINANCE_ATTESTOR_DEPENDENCY_INVALID");
  }

  if (trustedAuditSources === undefined) {
    throw new Error("COMPANY_IDENTITY_FINANCE_TRUSTED_AUDIT_SOURCES_REQUIRED");
  }

  let authenticateMethod: unknown;
  let appendMethod: unknown;
  let policyVersionValue: unknown;
  let acceptedRoleIdsValue: unknown;
  let createEventIdMethod: unknown;
  let createRequestIdMethod: unknown;
  let createCorrelationIdMethod: unknown;
  let nowMethod: unknown;
  try {
    authenticateMethod = authenticator?.authenticate;
    appendMethod = auditPort?.append;
    policyVersionValue = rolePolicy?.policyVersion;
    acceptedRoleIdsValue = rolePolicy?.acceptedRoleIds;
    createEventIdMethod = trustedAuditSources.createEventId;
    createRequestIdMethod = trustedAuditSources.createRequestId;
    createCorrelationIdMethod = trustedAuditSources.createCorrelationId;
    nowMethod = trustedAuditSources.now;
  } catch {
    throw new Error("COMPANY_IDENTITY_FINANCE_ATTESTOR_DEPENDENCY_INVALID");
  }

  const acceptedRoleIds = copyStringArray(acceptedRoleIdsValue);
  if (
    typeof authenticateMethod !== "function" ||
    typeof appendMethod !== "function" ||
    !isBoundedAuditString(policyVersionValue) ||
    acceptedRoleIds === undefined
  ) {
    throw new Error("COMPANY_IDENTITY_FINANCE_ATTESTOR_DEPENDENCY_INVALID");
  }
  if (
    typeof createEventIdMethod !== "function" ||
    typeof createRequestIdMethod !== "function" ||
    typeof createCorrelationIdMethod !== "function" ||
    typeof nowMethod !== "function"
  ) {
    throw new Error("COMPANY_IDENTITY_FINANCE_TRUSTED_AUDIT_SOURCES_INVALID");
  }

  const policyVersion = policyVersionValue;
  const authenticate = authenticateMethod.bind(authenticator);
  const append = appendMethod.bind(auditPort);
  const appendAuditEvent = async (
    event: Readonly<FinanceAttestationAuditEvent>,
  ): Promise<void> => {
    try {
      await append(event);
    } catch {
      throw new Error("COMPANY_IDENTITY_FINANCE_AUDIT_APPEND_FAILED");
    }
  };
  const createEventId = createEventIdMethod.bind(trustedAuditSources);
  const createRequestId = createRequestIdMethod.bind(trustedAuditSources);
  const createCorrelationId = createCorrelationIdMethod.bind(
    trustedAuditSources,
  );
  const now = nowMethod.bind(trustedAuditSources);

  /** Builds an audit context with trusted server-owned values. */
  function createAuditContext(
    audit: Readonly<FinanceAttestationAuditContext>,
  ): FinanceAttestationAuditContext {
    try {
      const eventId = createEventId();
      const requestId = createRequestId();
      const correlationId = createCorrelationId();
      const currentTime = now();
      if (!(currentTime instanceof Date) || Number.isNaN(currentTime.getTime())) {
        throw new Error("invalid trusted time");
      }
      if (
        !isBoundedAuditString(eventId) ||
        !isBoundedAuditString(requestId) ||
        !isBoundedAuditString(correlationId)
      ) {
        throw new Error("invalid trusted audit identity");
      }
      return {
        eventId,
        objectId: audit.objectId,
        occurredAt: currentTime.toISOString(),
        requestId,
        correlationId,
      };
    } catch {
      throw new Error("COMPANY_IDENTITY_FINANCE_TRUSTED_AUDIT_SOURCE_FAILED");
    }
  }

  return Object.freeze({
    async attest(
      inputRequest: Parameters<FinanceCompanyIdentityAttestor["attest"]>[0],
    ) {
      let request: z.infer<typeof attestationRequestSchema>;
      try {
        const requestResult = attestationRequestSchema.safeParse(inputRequest);
        if (!requestResult.success) {
          throw new Error("invalid Finance attestation request");
        }
        request = freezeDeep(requestResult.data);
      } catch {
        throw new Error("COMPANY_IDENTITY_FINANCE_ATTESTATION_REQUEST_INVALID");
      }

      const audit = createAuditContext(request.audit);
      let claims: Readonly<FinanceAuthenticatedOwnerClaims> | undefined;
      try {
        claims = await authenticate({
          credential: request.credential,
        });
      } catch {
        const event = freezeDeep({
          ...audit,
          actor: { kind: "unauthenticated" as const },
          operation: request.operation,
          scope: { ...request.scope },
          outcome: "failed" as const,
          reason: "authentication-failed" as const,
          policyVersion,
          claimsVersion: null,
        });
        await appendAuditEvent(event);
        throw new Error("COMPANY_IDENTITY_FINANCE_AUTHENTICATION_FAILED");
      }

      const normalizedClaims = normalizeFinanceClaims(claims);
      const actor: FinanceAttestationAuditActor =
        normalizedClaims?.subjectId !== null && normalizedClaims !== undefined
          ? { kind: "authenticated-owner", subjectId: normalizedClaims.subjectId }
          : { kind: "unauthenticated" };
      const appRoleIds = normalizedClaims?.appRoleIds;
      const schoolIds = normalizedClaims?.schoolIds;
      const reason: Exclude<
        FinanceAttestationAuditReason,
        "authentication-failed"
      > =
        normalizedClaims === undefined
          ? "unauthenticated"
          : normalizedClaims.claimsVersion === null
            ? "claims-version-missing"
            : normalizedClaims.subjectId === null ||
                normalizedClaims.organizationId === null ||
                normalizedClaims.organizationId !== request.scope.companyId
              ? "organization-mismatch"
              : appRoleIds === undefined ||
                  !appRoleIds.some((roleId) => acceptedRoleIds.includes(roleId))
                ? "role-not-accepted"
                : request.scope.schoolId !== undefined &&
                    (schoolIds === undefined ||
                      !schoolIds.includes(request.scope.schoolId))
                  ? "school-attestation-missing"
                  : "role-policy-accepted";
      const allowed = reason === "role-policy-accepted";
      const event = {
        ...audit,
        actor,
        operation: request.operation,
        scope: { ...request.scope },
        outcome: allowed ? ("allowed" as const) : ("denied" as const),
        reason,
        policyVersion,
        claimsVersion: normalizedClaims?.claimsVersion ?? null,
      };
      freezeDeep(event);
      await appendAuditEvent(event);

      if (
        !allowed ||
        normalizedClaims === undefined ||
        appRoleIds === undefined ||
        normalizedClaims.claimsVersion === null ||
        normalizedClaims.subjectId === null ||
        normalizedClaims.organizationId === null
      ) {
        return freezeDeep({
          decision: "deny" as const,
          reason: reason as Extract<
            FinanceAttestationDecision,
            { decision: "deny" }
          >["reason"],
        });
      }

      const evidence = {
        source: "company-identity" as const,
        claimsVersion: normalizedClaims.claimsVersion,
        subjectId: normalizedClaims.subjectId,
        organizationId: normalizedClaims.organizationId,
        appRoleIds,
        ...(schoolIds === undefined ? {} : { schoolIds }),
        policyVersion,
      };
      return freezeDeep({
        decision: "allow" as const,
        evidence,
      });
    },
  });
}

/**
 * Creates an append-only Company Identity audit port for Finance attestation events.
 * @param input Repository that owns immutable Company Identity audit persistence.
 * @returns A frozen Finance attestation audit port.
 */
export function createCompanyIdentityFinanceAttestationAuditPort(input: {
  /** Repository that owns durable Company Identity audit persistence. */
  readonly repository: CompanyIdentityFinanceAuditRepository;
}): FinanceAttestationAuditPort {
  let repository: CompanyIdentityFinanceAuditRepository | undefined;
  let appendMethod:
    | CompanyIdentityFinanceAuditRepository["appendAudit"]
    | undefined;
  try {
    repository = input?.repository;
    appendMethod = repository?.appendAudit;
  } catch {
    throw new Error("COMPANY_IDENTITY_FINANCE_AUDIT_PORT_DEPENDENCY_INVALID");
  }
  if (repository === undefined || typeof appendMethod !== "function") {
    throw new Error("COMPANY_IDENTITY_FINANCE_AUDIT_PORT_DEPENDENCY_INVALID");
  }
  const appendAudit = appendMethod.bind(repository);

  return Object.freeze({
    async append(event: Readonly<FinanceAttestationAuditEvent>): Promise<void> {
      const snapshot = snapshotFinanceAttestationAuditEvent(event);
      if (snapshot === undefined) {
        throw new Error("COMPANY_IDENTITY_FINANCE_AUDIT_METADATA_INVALID");
      }
      let metadataResult: ReturnType<typeof auditMetadataSchema.safeParse>;
      try {
        metadataResult = auditMetadataSchema.safeParse({
          source: "finance-operations",
          resourceType: "historical-private-evidence",
          eventId: snapshot.eventId,
          objectId: snapshot.objectId,
          requestId: snapshot.requestId,
          occurredAt: snapshot.occurredAt,
          ...(snapshot.scope.schoolId === undefined
            ? {}
            : { schoolId: snapshot.scope.schoolId }),
          actorKind: snapshot.actor.kind,
          actorSubjectId:
            snapshot.actor.kind === "authenticated-owner"
              ? snapshot.actor.subjectId
              : null,
          claimsVersion: snapshot.claimsVersion,
          policyVersion: snapshot.policyVersion,
        });
      } catch {
        throw new Error("COMPANY_IDENTITY_FINANCE_AUDIT_METADATA_INVALID");
      }
      if (!metadataResult.success) {
        throw new Error("COMPANY_IDENTITY_FINANCE_AUDIT_METADATA_INVALID");
      }
      try {
        await appendAudit(
          Object.freeze({
            correlationId: snapshot.correlationId,
            organizationId: snapshot.scope.companyId,
            operation: snapshot.operation,
            outcome:
              snapshot.outcome === "allowed"
              ? "SUCCEEDED"
              : snapshot.outcome === "failed"
                ? "FAILED"
                : "DENIED",
            reasonCode: snapshot.reason,
            metadata: Object.freeze(metadataResult.data),
          }),
        );
      } catch {
        throw new Error("COMPANY_IDENTITY_FINANCE_AUDIT_APPEND_FAILED");
      }
    },
  });
}
