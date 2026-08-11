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
}

/** Append-only audit port controlled by the Company Identity owner. */
export interface FinanceAttestationAuditPort {
  /** Appends one immutable Finance attestation audit event. */
  append(event: Readonly<FinanceAttestationAuditEvent>): Promise<void>;
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

/** Returns true when a value is a nonblank string. */
function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && /\S/u.test(value);
}

/** Returns a copied array when every entry is a nonblank string. */
function copyStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || !value.every(isNonBlankString)) return undefined;
  return Object.freeze([...value]);
}

/** Creates a Company Identity-owned attestor for Finance historical evidence packets. */
export function createFinanceCompanyIdentityAttestor(input: {
  /** Authenticator that resolves the opaque credential once. */
  readonly authenticator: CompanyIdentityFinanceAuthenticator;
  /** Injected reviewed role policy for this bounded operation. */
  readonly rolePolicy: FinanceRolePolicy;
  /** Append-only audit boundary for each result. */
  readonly auditPort: FinanceAttestationAuditPort;
}): FinanceCompanyIdentityAttestor {
  if (
    typeof input?.authenticator?.authenticate !== "function" ||
    typeof input?.auditPort?.append !== "function" ||
    !isNonBlankString(input?.rolePolicy?.policyVersion) ||
    copyStringArray(input.rolePolicy.acceptedRoleIds) === undefined
  ) {
    throw new Error("COMPANY_IDENTITY_FINANCE_ATTESTOR_DEPENDENCY_INVALID");
  }

  const acceptedRoleIds = copyStringArray(input.rolePolicy.acceptedRoleIds)!;

  return Object.freeze({
    async attest(
      request: Parameters<FinanceCompanyIdentityAttestor["attest"]>[0],
    ) {
      let claims: Readonly<FinanceAuthenticatedOwnerClaims> | undefined;
      try {
        claims = await input.authenticator.authenticate({
          credential: request.credential,
        });
      } catch {
        const event = freezeDeep({
          ...request.audit,
          actor: { kind: "unauthenticated" as const },
          operation: request.operation,
          scope: { ...request.scope },
          outcome: "failed" as const,
          reason: "authentication-failed" as const,
        });
        await input.auditPort.append(event);
        throw new Error("COMPANY_IDENTITY_FINANCE_AUTHENTICATION_FAILED");
      }

      const actor: FinanceAttestationAuditActor =
        claims !== undefined && isNonBlankString(claims.subjectId)
          ? { kind: "authenticated-owner", subjectId: claims.subjectId }
          : { kind: "unauthenticated" };
      const appRoleIds = claims === undefined ? undefined : copyStringArray(claims.appRoleIds);
      const schoolIds = claims === undefined ? undefined : copyStringArray(claims.schoolIds);
      const reason: Exclude<
        FinanceAttestationAuditReason,
        "authentication-failed"
      > =
        claims === undefined
          ? "unauthenticated"
          : !isNonBlankString(claims.claimsVersion)
            ? "claims-version-missing"
            : !isNonBlankString(claims.subjectId) ||
                !isNonBlankString(claims.organizationId) ||
                claims.organizationId !== request.scope.companyId
              ? "organization-mismatch"
              : appRoleIds === undefined ||
                  !appRoleIds.some((roleId) => acceptedRoleIds.includes(roleId))
                ? "role-not-accepted"
                : request.scope.schoolId !== undefined &&
                    (schoolIds === undefined || !schoolIds.includes(request.scope.schoolId))
                  ? "school-attestation-missing"
                  : "role-policy-accepted";
      const allowed = reason === "role-policy-accepted";
      const event = freezeDeep({
        ...request.audit,
        actor,
        operation: request.operation,
        scope: { ...request.scope },
        outcome: allowed ? ("allowed" as const) : ("denied" as const),
        reason,
      });
      await input.auditPort.append(event);

      if (!allowed || claims === undefined || appRoleIds === undefined) {
        return freezeDeep({
          decision: "deny" as const,
          reason: reason as Extract<
            FinanceAttestationDecision,
            { decision: "deny" }
          >["reason"],
        });
      }

      return freezeDeep({
        decision: "allow" as const,
        evidence: {
          source: "company-identity" as const,
          claimsVersion: claims.claimsVersion,
          subjectId: claims.subjectId,
          organizationId: claims.organizationId,
          appRoleIds,
          ...(schoolIds === undefined ? {} : { schoolIds }),
        },
      });
    },
  });
}
