import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

type ReceiptScope = {
  readonly companyId: string;
  readonly schoolId?: string;
};

type ReceiptSigner = {
  readonly source: "company-identity";
  readonly actorKind: "authenticated-owner";
  readonly subjectId: string;
  readonly organizationId: string;
  readonly appRoleIds: readonly string[];
  readonly schoolIds?: readonly string[];
  readonly claimsVersion: string;
  readonly policyVersion: string;
};

type ReceiptDecisionEvidence = {
  readonly source: "company-identity";
  readonly operation: "finance-thb-policy-approval";
  readonly attestationId: string;
  readonly signature: string;
};

type OwnerDecisionReceipt = {
  readonly receiptVersion: string;
  readonly canonicalizationVersion: string;
  readonly operation: "finance-thb-valuation";
  readonly decisionId: string;
  readonly scope: ReceiptScope;
  readonly signer: ReceiptSigner;
  readonly decisionEvidence: ReceiptDecisionEvidence;
  readonly rateSource: {
    readonly sourceId: string;
    readonly contractVersion: string;
  };
  readonly effectiveDateRule: {
    readonly ruleId: string;
    readonly ruleVersion: string;
  };
  readonly roundingRule: {
    readonly ruleId: string;
    readonly ruleVersion: string;
  };
  readonly validFrom: string;
  readonly expiresAt: string;
  readonly supersedesDecisionId?: string;
  readonly replayIdentity: string;
  readonly contentDigest: string;
  readonly audit: {
    readonly eventId: string;
    readonly requestId: string;
    readonly correlationId: string;
    readonly occurredAt: string;
  };
};

type SafeParseResult = {
  readonly success: boolean;
};

type OwnerDecisionReceiptModule = {
  readonly financeThbOwnerDecisionReceiptSchema?: {
    readonly safeParse: (value: unknown) => SafeParseResult;
  };
  readonly verifyFinanceThbOwnerDecisionReceipt?: (
    input: OwnerDecisionReceiptVerificationInput,
  ) => Promise<unknown>;
};

type OwnerDecisionAuthorizationInput = {
  readonly operation: "finance-thb-policy-approval";
  readonly scope: ReceiptScope;
  readonly authorizationEvidence: ReceiptSigner;
};

type OwnerDecisionAuthorityInput = {
  readonly operation: "finance-thb-policy-approval";
  readonly decisionId: string;
  readonly decisionEvidence: ReceiptDecisionEvidence;
  readonly expectedScope: ReceiptScope;
  readonly contentDigest: string;
};

type OwnerDecisionAuthorityResult =
  | {
      readonly decision: "allow";
      readonly decisionId: string;
      readonly decisionEvidence: ReceiptDecisionEvidence;
      readonly scope: ReceiptScope;
      readonly signer: ReceiptSigner;
      readonly contentDigest: string;
      readonly signatureVerified: true;
    }
  | { readonly decision: "deny"; readonly reason: string };

type OwnerDecisionAuthorityPort = {
  readonly verifyFinanceThbPolicyApproval: (
    input: OwnerDecisionAuthorityInput,
  ) => Promise<OwnerDecisionAuthorityResult>;
};

type OwnerDecisionAuthorizationPort = {
  readonly authorizeFinanceOperation: (
    input: OwnerDecisionAuthorizationInput,
  ) => Promise<
    | { readonly decision: "allow" }
    | { readonly decision: "deny"; readonly reason: string }
  >;
};

type OwnerDecisionAuditPort = {
  readonly append: (event: unknown) => Promise<void>;
};

type OwnerDecisionReceiptVerificationInput = {
  readonly receipt: unknown;
  readonly expectedScope: ReceiptScope;
  readonly authorityPort: OwnerDecisionAuthorityPort;
  readonly authorizationPort: OwnerDecisionAuthorizationPort;
  readonly auditPort: OwnerDecisionAuditPort;
  readonly now: () => Date;
  readonly existingReceipt?: unknown;
};

/** Loads the future owner-decision contract without importing missing exports statically. */
async function loadOwnerDecisionModule(): Promise<OwnerDecisionReceiptModule> {
  return (await import("../index.js")) as unknown as OwnerDecisionReceiptModule;
}

/** Frames one canonical segment by UTF-8 byte length. */
function frameCanonicalSegment(label: string, value: string): string {
  const segment = `${label}=${value}`;
  return `${Buffer.byteLength(segment, "utf8")}:${segment}`;
}

/** Encodes optional values without conflating absence with a literal sentinel. */
function encodeOptionalCanonicalValue(value: string | undefined): string {
  return value === undefined
    ? "absent"
    : `present:${frameCanonicalSegment("value", value)}`;
}

/** Encodes lists without conflating order, duplicates, or list absence. */
function encodeCanonicalList(values: readonly string[] | undefined): string {
  return values === undefined
    ? "absent"
    : `present:${values.length}:${values
        .map((value) => frameCanonicalSegment("member", value))
        .join(",")}`;
}

/** Creates the policy-neutral canonical payload used by the receipt digest. */
function canonicalReceiptPayload(
  value: Omit<OwnerDecisionReceipt, "contentDigest" | "replayIdentity">,
  domain: string,
): string {
  return [
    domain,
    frameCanonicalSegment("receiptVersion", value.receiptVersion),
    frameCanonicalSegment(
      "canonicalizationVersion",
      value.canonicalizationVersion,
    ),
    frameCanonicalSegment("operation", value.operation),
    frameCanonicalSegment("decisionId", value.decisionId),
    frameCanonicalSegment("scope.companyId", value.scope.companyId),
    frameCanonicalSegment(
      "scope.schoolId",
      encodeOptionalCanonicalValue(value.scope.schoolId),
    ),
    frameCanonicalSegment("signer.source", value.signer.source),
    frameCanonicalSegment("signer.actorKind", value.signer.actorKind),
    frameCanonicalSegment("signer.subjectId", value.signer.subjectId),
    frameCanonicalSegment("signer.organizationId", value.signer.organizationId),
    frameCanonicalSegment(
      "signer.appRoleIds",
      encodeCanonicalList(value.signer.appRoleIds),
    ),
    frameCanonicalSegment(
      "signer.schoolIds",
      encodeCanonicalList(value.signer.schoolIds),
    ),
    frameCanonicalSegment("signer.claimsVersion", value.signer.claimsVersion),
    frameCanonicalSegment("signer.policyVersion", value.signer.policyVersion),
    frameCanonicalSegment(
      "decisionEvidence.source",
      value.decisionEvidence.source,
    ),
    frameCanonicalSegment(
      "decisionEvidence.operation",
      value.decisionEvidence.operation,
    ),
    frameCanonicalSegment(
      "decisionEvidence.attestationId",
      value.decisionEvidence.attestationId,
    ),
    frameCanonicalSegment(
      "decisionEvidence.signature",
      value.decisionEvidence.signature,
    ),
    frameCanonicalSegment("rateSource.sourceId", value.rateSource.sourceId),
    frameCanonicalSegment(
      "rateSource.contractVersion",
      value.rateSource.contractVersion,
    ),
    frameCanonicalSegment(
      "effectiveDateRule.ruleId",
      value.effectiveDateRule.ruleId,
    ),
    frameCanonicalSegment(
      "effectiveDateRule.ruleVersion",
      value.effectiveDateRule.ruleVersion,
    ),
    frameCanonicalSegment("roundingRule.ruleId", value.roundingRule.ruleId),
    frameCanonicalSegment(
      "roundingRule.ruleVersion",
      value.roundingRule.ruleVersion,
    ),
    frameCanonicalSegment("validFrom", value.validFrom),
    frameCanonicalSegment("expiresAt", value.expiresAt),
    frameCanonicalSegment(
      "supersedesDecisionId",
      encodeOptionalCanonicalValue(value.supersedesDecisionId),
    ),
    frameCanonicalSegment("audit.eventId", value.audit.eventId),
    frameCanonicalSegment("audit.requestId", value.audit.requestId),
    frameCanonicalSegment("audit.correlationId", value.audit.correlationId),
    frameCanonicalSegment("audit.occurredAt", value.audit.occurredAt),
  ].join("|");
}

/** Computes the independent SHA-256 oracle for one canonical receipt payload. */
function canonicalReceiptDigest(
  value: Omit<OwnerDecisionReceipt, "contentDigest" | "replayIdentity">,
  domain: string,
): string {
  return createHash("sha256")
    .update(canonicalReceiptPayload(value, domain), "utf8")
    .digest("hex");
}

/** Requires one future receipt export and keeps the initial Red failure bounded. */
function requireReceiptExport<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`THB owner-decision receipt missing export: ${name}`);
  }
  return value;
}

/** Loads the strict owner-decision receipt schema. */
async function requireReceiptSchema(): Promise<{
  readonly safeParse: (value: unknown) => SafeParseResult;
}> {
  const subject = await loadOwnerDecisionModule();
  return requireReceiptExport(
    subject.financeThbOwnerDecisionReceiptSchema,
    "financeThbOwnerDecisionReceiptSchema",
  );
}

/** Loads the owner-decision verifier boundary. */
async function requireReceiptVerifier(): Promise<
  (input: OwnerDecisionReceiptVerificationInput) => Promise<unknown>
> {
  const subject = await loadOwnerDecisionModule();
  return requireReceiptExport(
    subject.verifyFinanceThbOwnerDecisionReceipt,
    "verifyFinanceThbOwnerDecisionReceipt",
  );
}

/** Creates one policy-neutral receipt fixture with opaque owner-selected identifiers. */
function receipt(
  overrides: Record<string, unknown> = {},
): OwnerDecisionReceipt {
  const base: OwnerDecisionReceipt = {
    receiptVersion: "finance-thb-owner-decision-receipt.v1",
    canonicalizationVersion: "finance-thb-owner-decision-canonical.v1",
    operation: "finance-thb-valuation",
    decisionId: "owner-decision-001",
    scope: {
      companyId: "company-a",
      schoolId: "school-a",
    },
    signer: {
      source: "company-identity",
      actorKind: "authenticated-owner",
      subjectId: "owner-a",
      organizationId: "company-a",
      appRoleIds: ["finance-owner"],
      schoolIds: ["school-a"],
      claimsVersion: "claims-contract-opaque-v1",
      policyVersion: "role-policy-opaque-v1",
    },
    decisionEvidence: {
      source: "company-identity",
      operation: "finance-thb-policy-approval",
      attestationId: "company-identity-attestation-001",
      signature: "company-identity-signature-opaque-v1",
    },
    rateSource: {
      sourceId: "rate-source-opaque-v1",
      contractVersion: "rate-contract-opaque-v1",
    },
    effectiveDateRule: {
      ruleId: "effective-date-rule-opaque-v1",
      ruleVersion: "effective-date-contract-opaque-v1",
    },
    roundingRule: {
      ruleId: "rounding-rule-opaque-v1",
      ruleVersion: "rounding-contract-opaque-v1",
    },
    validFrom: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    replayIdentity: "",
    contentDigest: "",
    audit: {
      eventId: "owner-decision-event-001",
      requestId: "owner-decision-request-001",
      correlationId: "owner-decision-correlation-001",
      occurredAt: "2026-08-10T00:00:00.000Z",
    },
  };

  const candidate = {
    ...base,
    ...overrides,
    scope: { ...base.scope, ...(overrides.scope as Partial<ReceiptScope>) },
    signer: { ...base.signer, ...(overrides.signer as Partial<ReceiptSigner>) },
    decisionEvidence: {
      ...base.decisionEvidence,
      ...(overrides.decisionEvidence as Partial<ReceiptDecisionEvidence>),
    },
    rateSource: { ...base.rateSource, ...(overrides.rateSource as object) },
    effectiveDateRule: {
      ...base.effectiveDateRule,
      ...(overrides.effectiveDateRule as object),
    },
    roundingRule: {
      ...base.roundingRule,
      ...(overrides.roundingRule as object),
    },
    audit: { ...base.audit, ...(overrides.audit as object) },
  } as OwnerDecisionReceipt;
  const canonicalInput = candidate as Omit<
    OwnerDecisionReceipt,
    "contentDigest" | "replayIdentity"
  >;
  const contentDigest =
    (overrides.contentDigest as string | undefined) ??
    canonicalReceiptDigest(
      canonicalInput,
      "finance-thb-owner-decision-content.v1",
    );
  const replayIdentity =
    (overrides.replayIdentity as string | undefined) ??
    canonicalReceiptDigest(
      canonicalInput,
      "finance-thb-owner-decision-replay.v1",
    );
  return { ...candidate, contentDigest, replayIdentity };
}

/** Removes the optional school from both scope and signer evidence. */
function companyReceipt(): OwnerDecisionReceipt {
  const candidate = receipt();
  const scope = { companyId: candidate.scope.companyId };
  const signer: Record<string, unknown> = { ...candidate.signer };
  delete signer.schoolIds;
  const companyCandidate = {
    ...candidate,
    scope,
    signer,
  } as OwnerDecisionReceipt;
  const canonicalInput = companyCandidate as Omit<
    OwnerDecisionReceipt,
    "contentDigest" | "replayIdentity"
  >;
  return {
    ...companyCandidate,
    contentDigest: canonicalReceiptDigest(
      canonicalInput,
      "finance-thb-owner-decision-content.v1",
    ),
    replayIdentity: canonicalReceiptDigest(
      canonicalInput,
      "finance-thb-owner-decision-replay.v1",
    ),
  };
}

/** Creates an independent authority fake that returns reviewed owner evidence. */
function allowingAuthorityPort(
  authoritativeReceipt: OwnerDecisionReceipt = receipt(),
): OwnerDecisionAuthorityPort {
  const verifyFinanceThbPolicyApproval = vi.fn(
    async (_input: OwnerDecisionAuthorityInput) => ({
      decision: "allow" as const,
      decisionId: authoritativeReceipt.decisionId,
      decisionEvidence: authoritativeReceipt.decisionEvidence,
      scope: authoritativeReceipt.scope,
      signer: authoritativeReceipt.signer,
      contentDigest: authoritativeReceipt.contentDigest,
      signatureVerified: true as const,
    }),
  );
  return {
    verifyFinanceThbPolicyApproval,
  } satisfies OwnerDecisionAuthorityPort;
}

/** Creates an authorization fake that accepts the validated owner evidence. */
function allowingAuthorizationPort() {
  const authorizeFinanceOperation = vi.fn(
    async (_input: OwnerDecisionAuthorizationInput) => ({
      decision: "allow" as const,
    }),
  );
  return { authorizeFinanceOperation } satisfies OwnerDecisionAuthorizationPort;
}

/** Creates an audit fake that records every attempted append. */
function recordingAuditPort() {
  const append = vi.fn(async (_event: unknown): Promise<void> => undefined);
  return { append } satisfies OwnerDecisionAuditPort;
}

/** Creates one verifier input with a fixed clock and company-a school scope. */
function verificationInput(
  receiptValue: unknown,
  overrides: Partial<
    Omit<OwnerDecisionReceiptVerificationInput, "receipt">
  > = {},
): OwnerDecisionReceiptVerificationInput {
  return {
    receipt: receiptValue,
    expectedScope: { companyId: "company-a", schoolId: "school-a" },
    authorityPort: allowingAuthorityPort(),
    authorizationPort: allowingAuthorizationPort(),
    auditPort: recordingAuditPort(),
    now: () => new Date("2026-08-10T00:00:00.000Z"),
    ...overrides,
  };
}

/** Checks a stable error without exposing dependency text, cause, or stack. */
async function expectStableFailure(
  operation: Promise<unknown>,
  code: string,
  secret?: string,
): Promise<void> {
  try {
    await operation;
    throw new Error("Expected the owner-decision verifier to reject");
  } catch (error) {
    expect(error).toMatchObject({ code });
    expect((error as { cause?: unknown }).cause).toBeUndefined();
    if (secret !== undefined) {
      const rendered = `${String(error)}\n${String(
        (error as { stack?: unknown }).stack ?? "",
      )}`;
      expect(rendered).not.toContain(secret);
    }
  }
}

describe("Finance THB owner-decision receipt Red contract", () => {
  it("defines a strict receipt schema with opaque policy identifiers", async () => {
    const schema = await requireReceiptSchema();
    const valid = receipt();

    expect(schema.safeParse(valid).success).toBe(true);
    expect(
      schema.safeParse({ ...valid, unreviewedSecret: "must-not-enter" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...valid,
        signer: { ...valid.signer, policyVersion: 7 },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...valid,
        rateSource: { ...valid.rateSource, sourceId: "" },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...valid,
        receiptVersion: "finance-thb-owner-decision-receipt.v2",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...valid,
        canonicalizationVersion: "finance-thb-owner-decision-canonical.v2",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...valid, contentDigest: "g".repeat(64) }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...valid, replayIdentity: "f".repeat(63) }).success,
    ).toBe(false);

    const nestedUnknowns: readonly unknown[] = [
      { ...valid, scope: { ...valid.scope, unreviewedSecret: "drop" } },
      { ...valid, signer: { ...valid.signer, unreviewedSecret: "drop" } },
      {
        ...valid,
        decisionEvidence: {
          ...valid.decisionEvidence,
          unreviewedSecret: "drop",
        },
      },
      {
        ...valid,
        rateSource: { ...valid.rateSource, unreviewedSecret: "drop" },
      },
      {
        ...valid,
        effectiveDateRule: {
          ...valid.effectiveDateRule,
          unreviewedSecret: "drop",
        },
      },
      {
        ...valid,
        roundingRule: { ...valid.roundingRule, unreviewedSecret: "drop" },
      },
      { ...valid, audit: { ...valid.audit, unreviewedSecret: "drop" } },
    ];
    for (const candidate of nestedUnknowns) {
      expect(schema.safeParse(candidate).success).toBe(false);
    }
  });

  it("requires authenticated signer evidence for company scope", async () => {
    const verify = await requireReceiptVerifier();
    const candidate = companyReceipt();
    const authorityPort = allowingAuthorityPort(candidate);
    const authorizationPort = allowingAuthorizationPort();
    const auditPort = recordingAuditPort();

    const result = await verify(
      verificationInput(candidate, {
        authorityPort,
        authorizationPort,
        auditPort,
        expectedScope: { companyId: "company-a" },
      }),
    );

    expect(result).toMatchObject({ status: "accepted" });
    expect(authorityPort.verifyFinanceThbPolicyApproval).toHaveBeenCalledWith({
      operation: "finance-thb-policy-approval",
      decisionId: candidate.decisionId,
      decisionEvidence: candidate.decisionEvidence,
      expectedScope: { companyId: "company-a" },
      contentDigest: candidate.contentDigest,
    });
    expect(authorizationPort.authorizeFinanceOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "finance-thb-policy-approval",
        scope: { companyId: "company-a" },
      }),
    );
  });

  it("rejects caller signer data when independent authority disagrees", async () => {
    const verify = await requireReceiptVerifier();
    const candidate = receipt({ signer: { subjectId: "caller-forged-owner" } });
    const authorityPort = allowingAuthorityPort(receipt());
    const authorizationPort = allowingAuthorizationPort();
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(
        verificationInput(candidate, {
          authorityPort,
          authorizationPort,
          auditPort,
        }),
      ),
      "FINANCE_THB_OWNER_RECEIPT_AUTHORITY_INVALID",
    );
    expect(authorizationPort.authorizeFinanceOperation).not.toHaveBeenCalled();
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it("rejects a decision identity or signature result that is not authoritative", async () => {
    const verify = await requireReceiptVerifier();
    const candidate = receipt();
    const authorityPort = {
      verifyFinanceThbPolicyApproval: vi.fn(
        async (_input: OwnerDecisionAuthorityInput) => ({
          decision: "allow" as const,
          decisionId: "forged-decision-id",
          decisionEvidence: candidate.decisionEvidence,
          scope: candidate.scope,
          signer: candidate.signer,
          contentDigest: candidate.contentDigest,
          signatureVerified: false as unknown as true,
        }),
      ),
    } satisfies OwnerDecisionAuthorityPort;
    const authorizationPort = allowingAuthorizationPort();
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(
        verificationInput(candidate, {
          authorityPort,
          authorizationPort,
          auditPort,
        }),
      ),
      "FINANCE_THB_OWNER_RECEIPT_AUTHORITY_INVALID",
    );
    expect(authorizationPort.authorizeFinanceOperation).not.toHaveBeenCalled();
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it.each([
    ["receiptVersion", "finance-thb-owner-decision-receipt.v2"],
    ["canonicalizationVersion", "finance-thb-owner-decision-canonical.v2"],
  ] as const)(
    "rejects unsupported %s before authority or audit writes",
    async (field, value) => {
      const verify = await requireReceiptVerifier();
      const candidate = receipt({ [field]: value });
      const authorityPort = allowingAuthorityPort();
      const auditPort = recordingAuditPort();

      await expectStableFailure(
        verify(
          verificationInput(candidate, {
            authorityPort,
            auditPort,
          }),
        ),
        "FINANCE_THB_OWNER_RECEIPT_VERSION_UNSUPPORTED",
      );
      expect(
        authorityPort.verifyFinanceThbPolicyApproval,
      ).not.toHaveBeenCalled();
      expect(auditPort.append).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid content and forged replay digests before side effects", async () => {
    const verify = await requireReceiptVerifier();
    const invalidContent = receipt({ contentDigest: "g".repeat(64) });
    const invalidContentAudit = recordingAuditPort();
    await expectStableFailure(
      verify(
        verificationInput(invalidContent, { auditPort: invalidContentAudit }),
      ),
      "FINANCE_THB_OWNER_RECEIPT_DIGEST_INVALID",
    );
    expect(invalidContentAudit.append).not.toHaveBeenCalled();

    const forgedReplay = receipt({ replayIdentity: "f".repeat(64) });
    const forgedReplayAudit = recordingAuditPort();
    await expectStableFailure(
      verify(verificationInput(forgedReplay, { auditPort: forgedReplayAudit })),
      "FINANCE_THB_OWNER_RECEIPT_REPLAY_IDENTITY_INVALID",
    );
    expect(forgedReplayAudit.append).not.toHaveBeenCalled();
  });

  it("binds company and optional school scope to the signer", async () => {
    const verify = await requireReceiptVerifier();
    const authorizationPort = allowingAuthorizationPort();
    const foreignCompany = receipt({
      scope: { companyId: "company-b", schoolId: "school-a" },
      signer: { organizationId: "company-b" },
    });
    const input = verificationInput(foreignCompany, {
      authorizationPort,
      expectedScope: { companyId: "company-a", schoolId: "school-a" },
    });

    await expectStableFailure(
      verify(input),
      "FINANCE_THB_OWNER_RECEIPT_SCOPE_INVALID",
    );
    expect(input.auditPort.append).not.toHaveBeenCalled();
  });

  it("requires school membership when the requested scope includes a school", async () => {
    const verify = await requireReceiptVerifier();
    const missingSchool = receipt({
      signer: { schoolIds: undefined },
    });
    const input = verificationInput(missingSchool);

    await expectStableFailure(
      verify(input),
      "FINANCE_THB_OWNER_RECEIPT_SCOPE_INVALID",
    );
    expect(input.auditPort.append).not.toHaveBeenCalled();
  });

  it("binds claims and role-policy versions before authorization", async () => {
    const verify = await requireReceiptVerifier();
    const authorizationPort = allowingAuthorizationPort();
    const input = verificationInput(receipt(), { authorizationPort });

    await verify(input);

    expect(authorizationPort.authorizeFinanceOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationEvidence: expect.objectContaining({
          claimsVersion: "claims-contract-opaque-v1",
          policyVersion: "role-policy-opaque-v1",
        }),
      }),
    );
  });

  it("separates canonical identities for framed, delimiter, Unicode, case, and list values", async () => {
    const verify = await requireReceiptVerifier();
    const pairs: readonly (readonly [
      OwnerDecisionReceipt,
      OwnerDecisionReceipt,
    ])[] = [
      [
        receipt({
          scope: { companyId: "ab", schoolId: "c" },
          signer: { organizationId: "ab", schoolIds: ["c"] },
        }),
        receipt({
          scope: { companyId: "a", schoolId: "bc" },
          signer: { organizationId: "a", schoolIds: ["bc"] },
        }),
      ],
      [
        receipt({
          decisionId: "owner|decision",
          audit: { eventId: "event-001" },
        }),
        receipt({
          decisionId: "owner",
          audit: { eventId: "decision|event-001" },
        }),
      ],
      [
        receipt({ signer: { subjectId: "owner-é" } }),
        receipt({ signer: { subjectId: "owner-e\u0301" } }),
      ],
      [
        receipt({ signer: { subjectId: "Owner-A" } }),
        receipt({ signer: { subjectId: "owner-a" } }),
      ],
      [
        receipt({
          signer: { appRoleIds: ["finance-owner", "finance-auditor"] },
        }),
        receipt({
          signer: { appRoleIds: ["finance-auditor", "finance-owner"] },
        }),
      ],
      [
        receipt({ signer: { appRoleIds: ["finance-owner"] } }),
        receipt({
          signer: { appRoleIds: ["finance-owner", "finance-owner"] },
        }),
      ],
      [
        companyReceipt(),
        receipt({
          scope: { schoolId: "none" },
          signer: { schoolIds: ["none"] },
        }),
      ],
    ];

    for (const [firstCandidate, secondCandidate] of pairs) {
      const first = (await verify(
        verificationInput(firstCandidate, {
          authorityPort: allowingAuthorityPort(firstCandidate),
          expectedScope: firstCandidate.scope,
        }),
      )) as { readonly replayIdentity: string };
      const second = (await verify(
        verificationInput(secondCandidate, {
          authorityPort: allowingAuthorityPort(secondCandidate),
          expectedScope: secondCandidate.scope,
        }),
      )) as { readonly replayIdentity: string };

      expect(first.replayIdentity).not.toBe(second.replayIdentity);
    }
  });

  it("returns replay for canonical-equivalent receipts and the authoritative receipt", async () => {
    const verify = await requireReceiptVerifier();
    const existing = receipt();
    const reordered = {
      audit: existing.audit,
      decisionEvidence: existing.decisionEvidence,
      contentDigest: existing.contentDigest,
      replayIdentity: existing.replayIdentity,
      expiresAt: existing.expiresAt,
      validFrom: existing.validFrom,
      roundingRule: existing.roundingRule,
      effectiveDateRule: existing.effectiveDateRule,
      rateSource: existing.rateSource,
      signer: existing.signer,
      scope: existing.scope,
      decisionId: existing.decisionId,
      operation: existing.operation,
      canonicalizationVersion: existing.canonicalizationVersion,
      receiptVersion: existing.receiptVersion,
    };
    const auditPort = recordingAuditPort();
    const result = (await verify(
      verificationInput(reordered, {
        existingReceipt: existing,
        auditPort,
      }),
    )) as { readonly status: string; readonly receipt: unknown };

    expect(result).toMatchObject({ status: "replay", receipt: existing });
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it.each([
    ["rateSource", { sourceId: "rate-source-opaque-v2" }],
    ["effectiveDateRule", { ruleId: "effective-date-rule-opaque-v2" }],
    ["roundingRule", { ruleId: "rounding-rule-opaque-v2" }],
    ["signer", { policyVersion: "role-policy-opaque-v2" }],
  ] as const)(
    "returns conflict when trusted %s changes",
    async (field, value) => {
      const verify = await requireReceiptVerifier();
      const existing = receipt();
      const changed = receipt({ [field]: value });

      const result = await verify(
        verificationInput(changed, {
          authorityPort: allowingAuthorityPort(changed),
          existingReceipt: existing,
        }),
      );

      expect(result).toMatchObject({
        status: "conflict",
        reason: "owner-decision-mismatch",
      });
    },
  );

  it("returns conflict when trusted scope changes", async () => {
    const verify = await requireReceiptVerifier();
    const existing = receipt();
    const changed = receipt({
      scope: { companyId: "company-b", schoolId: "school-b" },
      signer: { organizationId: "company-b", schoolIds: ["school-b"] },
    });

    const result = await verify(
      verificationInput(changed, {
        authorityPort: allowingAuthorityPort(changed),
        expectedScope: changed.scope,
        existingReceipt: existing,
      }),
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "owner-decision-mismatch",
    });
  });

  it("accepts a valid successor and rejects self or unknown supersession", async () => {
    const verify = await requireReceiptVerifier();
    const existing = receipt();
    const successor = receipt({
      decisionId: "owner-decision-002",
      supersedesDecisionId: existing.decisionId,
    });

    await expect(
      verify(
        verificationInput(successor, {
          authorityPort: allowingAuthorityPort(successor),
          existingReceipt: existing,
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    const selfSupersession = receipt({
      supersedesDecisionId: "owner-decision-001",
    });
    await expectStableFailure(
      verify(
        verificationInput(selfSupersession, {
          authorityPort: allowingAuthorityPort(selfSupersession),
        }),
      ),
      "FINANCE_THB_OWNER_RECEIPT_SUPERSESSION_INVALID",
    );
    const unknownSupersession = receipt({
      decisionId: "owner-decision-003",
      supersedesDecisionId: "owner-decision-unknown",
    });
    await expectStableFailure(
      verify(
        verificationInput(unknownSupersession, {
          authorityPort: allowingAuthorityPort(unknownSupersession),
        }),
      ),
      "FINANCE_THB_OWNER_RECEIPT_SUPERSESSION_INVALID",
    );
  });

  it.each([
    ["expired", new Date("2026-09-01T00:00:00.000Z")],
    ["not-yet-valid", new Date("2026-07-31T23:59:59.999Z")],
  ] as const)("rejects a %s receipt before any append", async (_name, now) => {
    const verify = await requireReceiptVerifier();
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(verificationInput(receipt(), { auditPort, now: () => now })),
      "FINANCE_THB_OWNER_RECEIPT_VALIDITY_INVALID",
    );
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it("projects only existing compact audit metadata keys", async () => {
    const verify = await requireReceiptVerifier();
    const candidate = receipt();
    const auditPort = recordingAuditPort();

    await verify(
      verificationInput(candidate, {
        authorityPort: allowingAuthorityPort(candidate),
        auditPort,
      }),
    );

    const event = auditPort.append.mock.calls[0]?.[0] as {
      readonly metadata?: Record<string, unknown>;
    };
    expect(event.metadata).toMatchObject({
      source: "finance-operations",
      resourceType: "finance-thb-owner-decision",
      objectId: "owner-decision-001",
      schoolId: "school-a",
      claimsVersion: "claims-contract-opaque-v1",
      policyVersion: "role-policy-opaque-v1",
      sourceFingerprint: candidate.contentDigest,
      idempotencyReplay: false,
    });
    expect(event.metadata).not.toHaveProperty("rateSourceId");
    expect(event.metadata).not.toHaveProperty("roundingRule");

    const { projectSecretSafeAuditMetadata } =
      await import("../../company-identity/protocol.js");
    const projected = projectSecretSafeAuditMetadata({
      ...event.metadata,
      rateSourceId: "must-drop",
      roundingRule: "must-drop",
      secret: "must-drop",
    });
    expect(projected).toEqual(event.metadata);
    expect(projected).not.toHaveProperty("secret");
  });

  it("performs zero writes when signer authorization denies", async () => {
    const verify = await requireReceiptVerifier();
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(
        async (_input: OwnerDecisionAuthorizationInput) => ({
          decision: "deny" as const,
          reason: "role-not-approved",
        }),
      ),
    } satisfies OwnerDecisionAuthorizationPort;
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(verificationInput(receipt(), { authorizationPort, auditPort })),
      "FINANCE_THB_OWNER_RECEIPT_DENIED",
    );
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it("maps dependency poison to a stable secret-safe error", async () => {
    const verify = await requireReceiptVerifier();
    const secret = "OWNER_DECISION_DEPENDENCY_SECRET_42";
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(async () => {
        throw new Error(secret);
      }),
    } satisfies OwnerDecisionAuthorizationPort;
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(verificationInput(receipt(), { authorizationPort, auditPort })),
      "FINANCE_THB_OWNER_RECEIPT_AUTHORIZATION_FAILED",
      secret,
    );
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it("maps getter poison to a stable secret-safe error", async () => {
    const verify = await requireReceiptVerifier();
    const secret = "OWNER_DECISION_GETTER_SECRET_42";
    const poisoned = { ...receipt() } as Record<string, unknown>;
    Object.defineProperty(poisoned, "decisionId", {
      enumerable: true,
      get: () => {
        throw new Error(secret);
      },
    });
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(verificationInput(poisoned, { auditPort })),
      "FINANCE_THB_OWNER_RECEIPT_INVALID",
      secret,
    );
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it("maps nested proxy getter poison to a stable secret-safe error", async () => {
    const verify = await requireReceiptVerifier();
    const secret = "OWNER_DECISION_PROXY_SECRET_42";
    const poisoned = new Proxy(receipt(), {
      get(target, property, receiver) {
        if (property === "decisionEvidence") {
          throw new Error(secret);
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(verificationInput(poisoned, { auditPort })),
      "FINANCE_THB_OWNER_RECEIPT_INVALID",
      secret,
    );
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it("maps authority dependency stacks to a stable secret-safe error", async () => {
    const verify = await requireReceiptVerifier();
    const secret = "OWNER_DECISION_AUTHORITY_STACK_SECRET_99";
    const authorityPort = {
      verifyFinanceThbPolicyApproval: vi.fn(async () => {
        const error = new Error(secret);
        error.stack = `Error: ${secret}`;
        throw error;
      }),
    } satisfies OwnerDecisionAuthorityPort;
    const authorizationPort = allowingAuthorizationPort();
    const auditPort = recordingAuditPort();

    await expectStableFailure(
      verify(
        verificationInput(receipt(), {
          authorityPort,
          authorizationPort,
          auditPort,
        }),
      ),
      "FINANCE_THB_OWNER_RECEIPT_AUTHORITY_FAILED",
      secret,
    );
    expect(authorizationPort.authorizeFinanceOperation).not.toHaveBeenCalled();
    expect(auditPort.append).not.toHaveBeenCalled();
  });

  it("snapshots the receipt before deferred authorization can mutate it", async () => {
    const verify = await requireReceiptVerifier();
    let releaseAuthorization!: () => void;
    const authorizationPending = new Promise<void>((resolve) => {
      releaseAuthorization = resolve;
    });
    const authorizationPort = {
      authorizeFinanceOperation: vi.fn(
        async (input: OwnerDecisionAuthorizationInput) => {
          await authorizationPending;
          expect(input.scope.companyId).toBe("company-a");
          expect(input.authorizationEvidence.policyVersion).toBe(
            "role-policy-opaque-v1",
          );
          return { decision: "allow" as const };
        },
      ),
    } satisfies OwnerDecisionAuthorizationPort;
    const auditPort = recordingAuditPort();
    const mutable = receipt() as unknown as {
      scope: { companyId: string; schoolId?: string };
      signer: { policyVersion: string };
    };
    const operation = verify(
      verificationInput(mutable, { authorizationPort, auditPort }),
    );

    mutable.scope.companyId = "company-b";
    mutable.signer.policyVersion = "POISONED_POLICY_VERSION";
    releaseAuthorization();

    await expect(operation).resolves.toMatchObject({ status: "accepted" });
    expect(auditPort.append).toHaveBeenCalledTimes(1);
  });
});
