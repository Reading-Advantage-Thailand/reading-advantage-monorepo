import { describe, expect, it, vi } from "vitest";

type Scope = {
  readonly companyId: string;
  readonly schoolId?: string;
};

type Bill = {
  readonly billId: string;
  readonly sourceAmountDecimal: string;
  readonly sourceCurrency: string;
};

type Evidence = Bill & {
  readonly thbAmountDecimal: string;
  readonly conversionRateDecimal: string;
  readonly rateEffectiveDate: string;
  readonly rateSourceId: string;
};

type ReplayValuation = Evidence & {
  readonly decisionId: string;
  readonly contentDigest: string;
  readonly scope: Scope;
};

type Attestor = {
  readonly verify: (input: unknown) => Promise<unknown>;
};

type EvidencePort = {
  readonly getEvidence: (input: unknown) => Promise<unknown>;
};

type Preparer = {
  readonly prepare: (input: unknown) => Promise<unknown>;
};

type FinanceThbModule = {
  readonly createFinanceThbValuationPreparer?: (input: {
    readonly attestor: Attestor;
    readonly evidencePort: EvidencePort;
  }) => Preparer;
  readonly classifyFinanceThbValuationReplay?: (input: {
    readonly existing: unknown;
    readonly incoming: unknown;
  }) => unknown;
};

const SCOPE: Scope = { companyId: "company-a" };
const BILL: Bill = {
  billId: "bill-adversarial-001",
  sourceAmountDecimal: "10.00",
  sourceCurrency: "USD",
};
const AUTHORITY_RECEIPT = {
  decisionId: "server-adversarial-001",
  contentDigest: "a".repeat(64),
  scope: SCOPE,
} as const;
const DEFAULT_EVIDENCE: Evidence = {
  ...BILL,
  thbAmountDecimal: "350.00",
  conversionRateDecimal: "35.00",
  rateEffectiveDate: "2026-08-01",
  rateSourceId: "owner-selected-source",
};

/** Loads the Finance THB public boundary without importing its types statically. */
async function loadFinanceModule(): Promise<FinanceThbModule> {
  return (await import("../index.js")) as unknown as FinanceThbModule;
}

/** Creates one caller request with a copied company scope. */
function request(overrides: Partial<Bill> = {}): Record<string, unknown> {
  return {
    bill: { ...BILL, ...overrides },
    approvalReceipt: {
      decisionId: "caller-adversarial-001",
      contentDigest: "c".repeat(64),
      scope: { ...SCOPE },
    },
    expectedScope: { ...SCOPE },
  };
}

/** Creates trusted evidence while preserving exact source fields. */
function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return { ...DEFAULT_EVIDENCE, ...overrides };
}

/** Creates an attestor fake with a stable allow result. */
function attestor(
  result: unknown = { decision: "allow", receipt: AUTHORITY_RECEIPT },
): {
  readonly dependency: Attestor & { readonly verify: ReturnType<typeof vi.fn> };
  readonly verify: ReturnType<typeof vi.fn>;
} {
  const verify = vi.fn(async () => result);
  return { dependency: { verify }, verify };
}

/** Creates an evidence port fake that records the trusted lookup. */
function evidencePort(result: unknown): {
  readonly dependency: EvidencePort & {
    readonly getEvidence: ReturnType<typeof vi.fn>;
  };
  readonly getEvidence: ReturnType<typeof vi.fn>;
} {
  const getEvidence = vi.fn(async () => result);
  return { dependency: { getEvidence }, getEvidence };
}

/** Creates a preparer and its dependency fakes for one adversarial case. */
async function createHarness(
  input: {
    readonly attestorResult?: unknown;
    readonly evidenceResult?: unknown;
  } = {},
): Promise<{
  readonly preparer: Preparer;
  readonly attestor: ReturnType<typeof attestor>;
  readonly evidencePort: ReturnType<typeof evidencePort>;
}> {
  const subject = await loadFinanceModule();
  if (typeof subject.createFinanceThbValuationPreparer !== "function") {
    throw new Error("THB preparer export is missing");
  }
  const authority = attestor(input.attestorResult);
  const conversionEvidence = evidencePort(
    Object.prototype.hasOwnProperty.call(input, "evidenceResult")
      ? input.evidenceResult
      : DEFAULT_EVIDENCE,
  );
  return {
    preparer: subject.createFinanceThbValuationPreparer({
      attestor: authority.dependency,
      evidencePort: conversionEvidence.dependency,
    }),
    attestor: authority,
    evidencePort: conversionEvidence,
  };
}

/** Creates one complete replay operand for strict replay comparisons. */
function replayValuation(
  overrides: Partial<ReplayValuation> = {},
): ReplayValuation {
  return {
    ...DEFAULT_EVIDENCE,
    decisionId: AUTHORITY_RECEIPT.decisionId,
    contentDigest: AUTHORITY_RECEIPT.contentDigest,
    scope: { ...SCOPE },
    ...overrides,
  };
}

/** Adds one own string or symbol key without invoking a prototype setter. */
function addOwnKey(
  value: Record<string, unknown>,
  key: string | symbol,
  payload: unknown,
): Record<string, unknown> {
  Object.defineProperty(value, key, {
    configurable: true,
    enumerable: true,
    value: payload,
    writable: true,
  });
  return value;
}

/** Builds a full public receipt lookalike with an intentionally secret extra field. */
function fullPublicReceipt(): Record<string, unknown> {
  return {
    receiptVersion: "finance-thb-owner-decision-receipt.v1",
    canonicalizationVersion: "finance-thb-owner-decision-canonical.v1",
    operation: "finance-thb-valuation",
    decisionId: AUTHORITY_RECEIPT.decisionId,
    scope: { ...SCOPE },
    signer: {
      source: "company-identity",
      actorKind: "authenticated-owner",
      subjectId: "owner-adversarial",
      organizationId: SCOPE.companyId,
      appRoleIds: ["finance-thb-policy-approver"],
      claimsVersion: "claims-v1",
      policyVersion: "policy-v1",
    },
    decisionEvidence: {
      source: "company-identity",
      operation: "finance-thb-policy-approval",
      decisionId: AUTHORITY_RECEIPT.decisionId,
      attestationId: "attestation-adversarial",
      signature: "opaque-signature",
      contentDigest: AUTHORITY_RECEIPT.contentDigest,
    },
    rules: {
      rateSourceId: "opaque-rate-source",
      effectiveDateRuleId: "opaque-date-rule",
      roundingRuleId: "opaque-rounding-rule",
    },
    validFrom: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    contentDigest: AUTHORITY_RECEIPT.contentDigest,
    replayIdentity: "b".repeat(64),
    audit: {
      eventId: "event-adversarial",
      requestId: "request-adversarial",
      correlationId: "correlation-adversarial",
      occurredAt: "2026-08-01T00:00:00.000Z",
    },
    dependencySecret: "POISON_FINANCE_THB_RECEIPT_SECRET",
  };
}

describe("Finance THB adversarial boundary", () => {
  it.each([
    [
      "large exact decimal",
      "123456789012345678901234567890123456789.123456789012",
      "35.25",
      "4351851812685185181268518518126851851816.60185181267300",
    ],
    [
      "tiny exact decimal",
      "0.000000000000000000000000000001",
      "0.000000000000000000000000000003",
      "0.000000000000000000000000000000000000000000000000000000000003",
    ],
  ] as const)(
    "handles %s without binary conversion or exponent notation",
    async (
      _label,
      sourceAmountDecimal,
      conversionRateDecimal,
      thbAmountDecimal,
    ) => {
      const { preparer } = await createHarness({
        evidenceResult: evidence({
          sourceAmountDecimal,
          conversionRateDecimal,
          thbAmountDecimal,
        }),
      });

      const result = (await preparer.prepare(
        request({ sourceAmountDecimal }),
      )) as Record<string, unknown>;

      expect(result).toMatchObject({
        sourceAmountDecimal,
        conversionRateDecimal,
        thbAmountDecimal,
      });
      expect(JSON.stringify(result)).not.toContain("e+");
    },
  );

  it("accepts trailing-zero-equivalent non-THB products while preserving source text", async () => {
    const sourceAmountDecimal = "10.00";
    const { preparer } = await createHarness({
      evidenceResult: evidence({
        sourceAmountDecimal,
        conversionRateDecimal: "35.0",
        thbAmountDecimal: "350.000",
      }),
    });

    const result = (await preparer.prepare(
      request({ sourceAmountDecimal }),
    )) as Record<string, unknown>;

    expect(result).toMatchObject({
      sourceAmountDecimal: "10.00",
      conversionRateDecimal: "35.0",
      thbAmountDecimal: "350.000",
    });
  });

  it("accepts a trailing-zero-equivalent exact identity rate for a THB bill", async () => {
    const sourceAmountDecimal = "10.00";
    const { preparer } = await createHarness({
      evidenceResult: evidence({
        sourceAmountDecimal,
        sourceCurrency: "THB",
        conversionRateDecimal: "1.00",
        thbAmountDecimal: sourceAmountDecimal,
      }),
    });

    await expect(
      preparer.prepare(request({ sourceAmountDecimal, sourceCurrency: "THB" })),
    ).resolves.toMatchObject({
      sourceAmountDecimal,
      sourceCurrency: "THB",
      conversionRateDecimal: "1.00",
    });
  });

  it("rejects a source amount spelling mismatch despite numeric trailing-zero equivalence", async () => {
    const { preparer } = await createHarness({
      evidenceResult: evidence({ sourceAmountDecimal: "10.0" }),
    });

    await expect(preparer.prepare(request())).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_CONFLICT",
    });
  });

  it("rejects a returned company or school scope mismatch before evidence access", async () => {
    const authority = attestor({
      decision: "allow",
      receipt: {
        ...AUTHORITY_RECEIPT,
        scope: { companyId: "company-other", schoolId: "school-other" },
      },
    });
    const conversionEvidence = evidencePort(DEFAULT_EVIDENCE);
    const subject = await loadFinanceModule();
    if (typeof subject.createFinanceThbValuationPreparer !== "function") {
      throw new Error("THB preparer export is missing");
    }
    const preparer = subject.createFinanceThbValuationPreparer({
      attestor: authority.dependency,
      evidencePort: conversionEvidence.dependency,
    });

    await expect(preparer.prepare(request())).rejects.toMatchObject({
      code: "FINANCE_THB_POLICY_APPROVAL_INVALID",
    });
    expect(conversionEvidence.getEvidence).not.toHaveBeenCalled();
  });

  it("projects a full public receipt and does not expose receipt internals or secrets", async () => {
    const { preparer } = await createHarness({
      attestorResult: { decision: "allow", receipt: fullPublicReceipt() },
    });

    const result = (await preparer.prepare(request())) as Record<
      string,
      unknown
    >;

    expect(Reflect.ownKeys(result).sort()).toEqual(
      [
        "billId",
        "contentDigest",
        "conversionRateDecimal",
        "decisionId",
        "rateEffectiveDate",
        "rateSourceId",
        "scope",
        "sourceAmountDecimal",
        "sourceCurrency",
        "thbAmountDecimal",
      ].sort(),
    );
    expect(result).not.toHaveProperty("signer");
    expect(JSON.stringify(result)).not.toContain(
      "POISON_FINANCE_THB_RECEIPT_SECRET",
    );
  });

  it("rejects nested accessors before dependency access", async () => {
    const candidate = request();
    let getterReads = 0;
    Object.defineProperty(
      candidate.bill as Record<string, unknown>,
      "sourceAmountDecimal",
      {
        configurable: true,
        enumerable: true,
        get: () => {
          getterReads += 1;
          return "10.00";
        },
      },
    );
    const {
      preparer,
      attestor: authority,
      evidencePort: conversionEvidence,
    } = await createHarness();

    await expect(preparer.prepare(candidate)).rejects.toMatchObject({
      code: "FINANCE_THB_INPUT_INVALID",
    });
    expect(getterReads).toBe(0);
    expect(authority.verify).not.toHaveBeenCalled();
    expect(conversionEvidence.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects a Proxy evidence result without reading its traps", async () => {
    const proxyReads: PropertyKey[] = [];
    const result = new Proxy(DEFAULT_EVIDENCE, {
      get(target, property, receiver) {
        proxyReads.push(property);
        return Reflect.get(target, property, receiver);
      },
    });
    const { preparer } = await createHarness({ evidenceResult: result });

    await expect(preparer.prepare(request())).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_INVALID",
    });
    expect(proxyReads).toEqual(["then"]);
  });

  it.each([
    ["constructor", "POISON_THB_CONSTRUCTOR"],
    ["prototype", "POISON_THB_PROTOTYPE"],
    [Symbol("finance-thb-symbol"), "POISON_THB_SYMBOL"],
  ] as const)(
    "rejects an own %s request key before dependency access",
    async (key, secret) => {
      const candidate = addOwnKey(request(), key, secret);
      const {
        preparer,
        attestor: authority,
        evidencePort: conversionEvidence,
      } = await createHarness();

      await expect(preparer.prepare(candidate)).rejects.toMatchObject({
        code: "FINANCE_THB_INPUT_INVALID",
      });
      expect(authority.verify).not.toHaveBeenCalled();
      expect(conversionEvidence.getEvidence).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["constructor", "POISON_THB_EVIDENCE_CONSTRUCTOR"],
    ["prototype", "POISON_THB_EVIDENCE_PROTOTYPE"],
    [Symbol("finance-thb-evidence-symbol"), "POISON_THB_EVIDENCE_SYMBOL"],
  ] as const)(
    "rejects an own %s evidence key after the trusted lookup",
    async (key, secret) => {
      const candidate = addOwnKey({ ...DEFAULT_EVIDENCE }, key, secret);
      const { preparer, evidencePort: conversionEvidence } =
        await createHarness({
          evidenceResult: candidate,
        });

      await expect(preparer.prepare(request())).rejects.toMatchObject({
        code: "FINANCE_THB_CONVERSION_EVIDENCE_INVALID",
      });
      expect(conversionEvidence.getEvidence).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects a post-resolution evidence mutation before producing a valuation", async () => {
    let resolveEvidence!: (value: unknown) => void;
    const pendingEvidence = new Promise<unknown>((resolve) => {
      resolveEvidence = resolve;
    });
    const authority = attestor();
    const conversionEvidence = {
      getEvidence: vi.fn(() => pendingEvidence),
    };
    const subject = await loadFinanceModule();
    if (typeof subject.createFinanceThbValuationPreparer !== "function") {
      throw new Error("THB preparer export is missing");
    }
    const preparer = subject.createFinanceThbValuationPreparer({
      attestor: authority.dependency,
      evidencePort: conversionEvidence,
    });
    const operation = preparer.prepare(request());
    const mutableEvidence = { ...DEFAULT_EVIDENCE };

    resolveEvidence(mutableEvidence);
    mutableEvidence.thbAmountDecimal = "351.00";

    await expect(operation).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_INVALID",
    });
  });

  it.each([
    "undefined",
    "null",
    "primitive",
    "array",
    "unknown object",
  ] as const)(
    "maps malformed evidence dependency result %s to a stable error",
    async (kind) => {
      const malformed: unknown =
        kind === "undefined"
          ? undefined
          : kind === "null"
            ? null
            : kind === "primitive"
              ? "POISON_FINANCE_THB_RESULT_SECRET"
              : kind === "array"
                ? [DEFAULT_EVIDENCE]
                : { secret: "POISON_FINANCE_THB_RESULT_SECRET" };
      const { preparer } = await createHarness({ evidenceResult: malformed });

      await expect(preparer.prepare(request())).rejects.toSatisfy(
        (error: unknown) =>
          String(error).includes("FINANCE_THB_CONVERSION_EVIDENCE_INVALID") &&
          !String(error).includes("POISON_FINANCE_THB_RESULT_SECRET"),
      );
    },
  );

  it("maps a poisoned evidence dependency without exposing its message", async () => {
    const authority = attestor();
    const conversionEvidence = {
      getEvidence: vi.fn(async () => {
        throw new Error("POISON_FINANCE_THB_EVIDENCE_DEPENDENCY_SECRET");
      }),
    };
    const subject = await loadFinanceModule();
    if (typeof subject.createFinanceThbValuationPreparer !== "function") {
      throw new Error("THB preparer export is missing");
    }
    const preparer = subject.createFinanceThbValuationPreparer({
      attestor: authority.dependency,
      evidencePort: conversionEvidence,
    });

    await expect(preparer.prepare(request())).rejects.toSatisfy(
      (error: unknown) =>
        String(error).includes("FINANCE_THB_CONVERSION_EVIDENCE_INVALID") &&
        !String(error).includes(
          "POISON_FINANCE_THB_EVIDENCE_DEPENDENCY_SECRET",
        ),
    );
  });

  it.each([
    ["cyclic request", "request"],
    ["cyclic evidence", "evidence"],
  ] as const)(
    "rejects a %s before leaking or accepting partial data",
    async (_label, location) => {
      const cyclic = { marker: "POISON_FINANCE_THB_CYCLE_SECRET" } as Record<
        string,
        unknown
      >;
      cyclic.self = cyclic;
      const harness =
        location === "request"
          ? await createHarness()
          : await createHarness({ evidenceResult: cyclic });
      const candidate =
        location === "request"
          ? { ...request(), approvalReceipt: cyclic }
          : request();

      await expect(harness.preparer.prepare(candidate)).rejects.toSatisfy(
        (error: unknown) =>
          String(error).includes(
            location === "request"
              ? "FINANCE_THB_INPUT_INVALID"
              : "FINANCE_THB_CONVERSION_EVIDENCE_INVALID",
          ) && !String(error).includes("POISON_FINANCE_THB_CYCLE_SECRET"),
      );
    },
  );

  it("rejects boundary input deeper than the supported capture depth", async () => {
    let nested: Record<string, unknown> = {
      secret: "POISON_FINANCE_THB_DEPTH",
    };
    for (let index = 0; index < 20; index += 1) {
      nested = { nested };
    }
    const { preparer } = await createHarness();

    await expect(
      preparer.prepare({ ...request(), approvalReceipt: nested }),
    ).rejects.toMatchObject({ code: "FINANCE_THB_INPUT_INVALID" });
  });

  it("keeps replay classification symmetric for changed, malformed, and scoped operands", async () => {
    const subject = await loadFinanceModule();
    if (typeof subject.classifyFinanceThbValuationReplay !== "function") {
      throw new Error("THB replay classifier export is missing");
    }
    const classify = subject.classifyFinanceThbValuationReplay;
    const unchanged = replayValuation();
    const variants: readonly [string, unknown][] = [
      ["changed rate", { ...unchanged, conversionRateDecimal: "36.00" }],
      [
        "changed school scope",
        { ...unchanged, scope: { ...SCOPE, schoolId: "school-a" } },
      ],
      ["malformed amount", { ...unchanged, sourceAmountDecimal: 10 }],
      ["own prototype key", addOwnKey({ ...unchanged }, "prototype", "poison")],
    ];

    expect(
      classify({ existing: unchanged, incoming: { ...unchanged } }),
    ).toMatchObject({ status: "replay" });
    for (const [_label, variant] of variants) {
      const forward = classify({ existing: unchanged, incoming: variant });
      const reverse = classify({ existing: variant, incoming: unchanged });
      expect(forward).toMatchObject({
        status: "conflict",
        reason: "conversion-evidence-mismatch",
      });
      expect(reverse).toEqual(forward);
    }
  });

  it.each([
    ["constructor", "POISON_THB_REPLAY_CONSTRUCTOR"],
    ["prototype", "POISON_THB_REPLAY_PROTOTYPE"],
    [Symbol("finance-thb-replay-symbol"), "POISON_THB_REPLAY_SYMBOL"],
  ] as const)(
    "classifies an own %s replay key as conflict",
    async (key, secret) => {
      const subject = await loadFinanceModule();
      if (typeof subject.classifyFinanceThbValuationReplay !== "function") {
        throw new Error("THB replay classifier export is missing");
      }
      const candidate = addOwnKey({ ...replayValuation() }, key, secret);

      expect(
        subject.classifyFinanceThbValuationReplay({
          existing: candidate,
          incoming: replayValuation(),
        }),
      ).toMatchObject({
        status: "conflict",
        reason: "conversion-evidence-mismatch",
      });
    },
  );
});
