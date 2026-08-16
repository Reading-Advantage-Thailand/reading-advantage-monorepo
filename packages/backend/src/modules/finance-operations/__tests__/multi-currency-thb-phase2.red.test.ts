import { describe, expect, it, vi } from "vitest";

type FinanceThbConversionEvidence = {
  readonly billId: string;
  readonly sourceAmountDecimal: string;
  readonly sourceCurrency: string;
  readonly thbAmountDecimal: string;
  readonly conversionRateDecimal: string;
  readonly rateEffectiveDate: string;
  readonly rateSourceId: string;
};

type FinanceThbValuationReplayOperand = FinanceThbConversionEvidence & {
  readonly decisionId: string;
  readonly contentDigest: string;
  readonly scope: FinanceThbPolicyApprovalScope;
};

type FinanceThbPolicyApprovalScope = {
  readonly companyId: string;
  readonly schoolId?: string;
};

type FinanceThbApprovalReceipt = {
  readonly decisionId: string;
  readonly contentDigest: string;
  readonly scope: FinanceThbPolicyApprovalScope;
};

type FinanceThbPolicyApprovalAttestor = {
  readonly verify: (input: {
    readonly operation: "finance-thb-policy-approval";
    readonly receipt: unknown;
    readonly expectedScope: FinanceThbPolicyApprovalScope;
    readonly existingReceipt?: unknown;
  }) => Promise<unknown>;
};

type FinanceThbEvidencePort = {
  readonly getEvidence: (input: {
    readonly billId: string;
    readonly sourceAmountDecimal: string;
    readonly sourceCurrency: string;
  }) => Promise<unknown>;
};

type FinanceThbBill = {
  readonly billId: string;
  readonly sourceAmountDecimal: string;
  readonly sourceCurrency: string;
};

type FinanceThbValuationRequest = {
  readonly bill: FinanceThbBill;
  readonly approvalReceipt: unknown;
  readonly expectedScope: FinanceThbPolicyApprovalScope;
};

type FinanceThbValuationPreparer = {
  readonly prepare: (input: unknown) => Promise<unknown>;
};

type FinanceThbModule = {
  readonly financeThbConversionEvidenceSchema?: {
    readonly safeParse: (input: unknown) => { readonly success: boolean };
  };
  readonly createFinanceThbValuationPreparer?: (input: {
    readonly attestor: FinanceThbPolicyApprovalAttestor;
    readonly evidencePort: FinanceThbEvidencePort;
  }) => FinanceThbValuationPreparer;
  readonly classifyFinanceThbValuationReplay?: (input: {
    readonly existing: unknown;
    readonly incoming: unknown;
  }) => unknown;
};

const RATE_SOURCE_ID = "owner-selected-source-identity";
const EFFECTIVE_DATE = "2026-08-01";
const EXPECTED_SCOPE: FinanceThbPolicyApprovalScope = {
  companyId: "company-a",
};
const CALLER_RECEIPT: FinanceThbApprovalReceipt = {
  decisionId: "caller-decision-001",
  contentDigest: "c".repeat(64),
  scope: EXPECTED_SCOPE,
};
const AUTHORITY_RECEIPT: FinanceThbApprovalReceipt = {
  decisionId: "server-decision-001",
  contentDigest: "a".repeat(64),
  scope: EXPECTED_SCOPE,
};

/** Loads the future THB contract without requiring a production implementation. */
async function loadFinanceThbModule(): Promise<FinanceThbModule> {
  return (await import("../index.js")) as unknown as FinanceThbModule;
}

/** Requires one THB contract export and reports a bounded Red failure. */
function requireThbExport<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`THB contract missing export: ${name}`);
  }
  return value;
}

/** Creates one exact source bill for the THB valuation contract. */
function bill(input: {
  readonly billId?: string;
  readonly sourceAmountDecimal: string;
  readonly sourceCurrency: string;
}): FinanceThbBill {
  return {
    billId: input.billId ?? `bill-${input.sourceCurrency.toLowerCase()}-001`,
    sourceAmountDecimal: input.sourceAmountDecimal,
    sourceCurrency: input.sourceCurrency,
  };
}

/** Creates trusted conversion evidence with exact decimal strings. */
function evidence(
  sourceBill: FinanceThbBill,
  input: {
    readonly thbAmountDecimal: string;
    readonly conversionRateDecimal: string;
    readonly rateEffectiveDate?: string;
    readonly rateSourceId?: string;
  },
): FinanceThbConversionEvidence {
  return {
    billId: sourceBill.billId,
    sourceAmountDecimal: sourceBill.sourceAmountDecimal,
    sourceCurrency: sourceBill.sourceCurrency,
    thbAmountDecimal: input.thbAmountDecimal,
    conversionRateDecimal: input.conversionRateDecimal,
    rateEffectiveDate: input.rateEffectiveDate ?? EFFECTIVE_DATE,
    rateSourceId: input.rateSourceId ?? RATE_SOURCE_ID,
  };
}

/** Creates a future valuation request with an untrusted caller receipt. */
function valuationInput(
  sourceBill: FinanceThbBill,
  approvalReceipt: unknown = CALLER_RECEIPT,
  expectedScope: FinanceThbPolicyApprovalScope = EXPECTED_SCOPE,
): FinanceThbValuationRequest {
  return {
    bill: sourceBill,
    approvalReceipt,
    expectedScope: { ...expectedScope },
  };
}

/** Creates a provider-neutral evidence port fake for the Red contract. */
function evidencePort(result: unknown): FinanceThbEvidencePort & {
  readonly getEvidence: ReturnType<typeof vi.fn>;
} {
  return {
    getEvidence: vi.fn(async () => result),
  };
}

/** Creates the accepted Company Identity attestor shape for integration tests. */
function approvalAttestor(
  result: unknown = { decision: "allow", receipt: AUTHORITY_RECEIPT },
): FinanceThbPolicyApprovalAttestor & {
  readonly verify: ReturnType<typeof vi.fn>;
} {
  return {
    verify: vi.fn(async () => result),
  };
}

/** Creates the future THB preparer over the accepted attestor and evidence port. */
async function createPreparer(
  result: unknown,
  input: {
    readonly attestor?: FinanceThbPolicyApprovalAttestor & {
      readonly verify: ReturnType<typeof vi.fn>;
    };
    readonly attestorResult?: unknown;
  } = {},
): Promise<{
  readonly preparer: FinanceThbValuationPreparer;
  readonly port: FinanceThbEvidencePort & {
    readonly getEvidence: ReturnType<typeof vi.fn>;
  };
  readonly attestor: FinanceThbPolicyApprovalAttestor & {
    readonly verify: ReturnType<typeof vi.fn>;
  };
}> {
  const subject = await loadFinanceThbModule();
  const factory = requireThbExport(
    subject.createFinanceThbValuationPreparer,
    "createFinanceThbValuationPreparer",
  );
  const port = evidencePort(result);
  const attestor = input.attestor ?? approvalAttestor(input.attestorResult);
  return {
    preparer: factory({ attestor, evidencePort: port }),
    port,
    attestor,
  };
}

/** Loads the future replay classifier while preserving the bounded Red failure. */
async function createReplayClassifier(): Promise<
  NonNullable<FinanceThbModule["classifyFinanceThbValuationReplay"]>
> {
  const subject = await loadFinanceThbModule();
  return requireThbExport(
    subject.classifyFinanceThbValuationReplay,
    "classifyFinanceThbValuationReplay",
  );
}

/** Creates one complete replay operand with the required company-first scope. */
function replayValuation(
  overrides: Partial<FinanceThbValuationReplayOperand> = {},
): FinanceThbValuationReplayOperand {
  return {
    billId: "bill-usd-001",
    sourceAmountDecimal: "10.00",
    sourceCurrency: "USD",
    thbAmountDecimal: "350.00",
    conversionRateDecimal: "35.00",
    rateEffectiveDate: EFFECTIVE_DATE,
    rateSourceId: RATE_SOURCE_ID,
    decisionId: AUTHORITY_RECEIPT.decisionId,
    contentDigest: AUTHORITY_RECEIPT.contentDigest,
    scope: { ...EXPECTED_SCOPE },
    ...overrides,
  };
}

/** Removes one required replay field without changing the other operand fields. */
function withoutReplayField(
  value: FinanceThbValuationReplayOperand,
  field: keyof FinanceThbValuationReplayOperand,
): Record<string, unknown> {
  const copy = { ...value } as Record<string, unknown>;
  delete copy[field];
  return copy;
}

const nonThbCases = [
  {
    name: "USD",
    sourceAmountDecimal: "10.00",
    conversionRateDecimal: "35.00",
    thbAmountDecimal: "350.00",
  },
  {
    name: "EUR",
    sourceAmountDecimal: "12.50",
    conversionRateDecimal: "40.00",
    thbAmountDecimal: "500.00",
  },
  {
    name: "JPY",
    sourceAmountDecimal: "100",
    conversionRateDecimal: "0.25",
    thbAmountDecimal: "25.00",
  },
  {
    name: "XOF",
    sourceAmountDecimal: "7.00",
    conversionRateDecimal: "4.00",
    thbAmountDecimal: "28.00",
  },
] as const;

describe("Finance multi-currency THB Red contract", () => {
  it("defines strict conversion evidence with exact decimal strings", async () => {
    const subject = await loadFinanceThbModule();
    const schema = requireThbExport(
      subject.financeThbConversionEvidenceSchema,
      "financeThbConversionEvidenceSchema",
    );
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const valid = evidence(sourceBill, {
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
    });

    expect(schema.safeParse(valid).success).toBe(true);
    expect(
      schema.safeParse({ ...valid, sourceAmountDecimal: 10 }),
    ).toMatchObject({ success: false });
    expect(
      schema.safeParse({ ...valid, conversionRateDecimal: 35 }),
    ).toMatchObject({ success: false });
    expect(schema.safeParse({ ...valid, thbAmountDecimal: 350 })).toMatchObject(
      { success: false },
    );
    expect(
      schema.safeParse({ ...valid, conversionRateDecimal: "3.5e1" }),
    ).toMatchObject({ success: false });
    expect(
      schema.safeParse({ ...valid, unreviewedProviderObject: {} }),
    ).toMatchObject({ success: false });
    for (const sourceCurrency of ["usd", "US", "USDT", "THB-"]) {
      expect(schema.safeParse({ ...valid, sourceCurrency }).success).toBe(
        false,
      );
    }
  });

  it("calls the accepted attestor before evidence access", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const trustedEvidence = evidence(sourceBill, {
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
    });
    let evidenceReads = 0;
    const attestor = approvalAttestor();
    attestor.verify.mockImplementation(async (input) => {
      expect(evidenceReads).toBe(0);
      expect(input.operation).toBe("finance-thb-policy-approval");
      return { decision: "allow", receipt: AUTHORITY_RECEIPT };
    });
    const port = evidencePort(trustedEvidence);
    port.getEvidence.mockImplementation(async () => {
      evidenceReads += 1;
      return trustedEvidence;
    });
    const subject = await loadFinanceThbModule();
    const factory = requireThbExport(
      subject.createFinanceThbValuationPreparer,
      "createFinanceThbValuationPreparer",
    );
    const preparer = factory({ attestor, evidencePort: port });

    await preparer.prepare(valuationInput(sourceBill));
    expect(attestor.verify).toHaveBeenCalledWith({
      operation: "finance-thb-policy-approval",
      receipt: CALLER_RECEIPT,
      expectedScope: EXPECTED_SCOPE,
    });
    expect(evidenceReads).toBe(1);
  });

  it.each(nonThbCases)(
    "preserves exact $name source amount and currency",
    async ({
      name,
      sourceAmountDecimal,
      conversionRateDecimal,
      thbAmountDecimal,
    }) => {
      const sourceBill = bill({
        sourceAmountDecimal,
        sourceCurrency: name,
      });
      const trustedEvidence = evidence(sourceBill, {
        conversionRateDecimal,
        thbAmountDecimal,
      });
      const { preparer, port } = await createPreparer(trustedEvidence);
      const result = await preparer.prepare(valuationInput(sourceBill));
      const valuation = result as Record<string, unknown>;

      expect(valuation).toMatchObject({
        billId: sourceBill.billId,
        sourceAmountDecimal,
        sourceCurrency: name,
        thbAmountDecimal,
        conversionRateDecimal,
        rateEffectiveDate: EFFECTIVE_DATE,
        rateSourceId: RATE_SOURCE_ID,
        decisionId: AUTHORITY_RECEIPT.decisionId,
        contentDigest: AUTHORITY_RECEIPT.contentDigest,
      });
      expect(port.getEvidence).toHaveBeenCalledWith({
        billId: sourceBill.billId,
        sourceAmountDecimal,
        sourceCurrency: name,
      });
    },
  );

  it("uses exact identity conversion for a THB bill", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "98765432101234567890.123",
      sourceCurrency: "THB",
    });
    const trustedEvidence = evidence(sourceBill, {
      conversionRateDecimal: "1",
      thbAmountDecimal: sourceBill.sourceAmountDecimal,
    });
    const { preparer } = await createPreparer(trustedEvidence);
    const result = (await preparer.prepare(
      valuationInput(sourceBill),
    )) as Record<string, unknown>;

    expect(result).toMatchObject({
      sourceAmountDecimal: "98765432101234567890.123",
      sourceCurrency: "THB",
      thbAmountDecimal: "98765432101234567890.123",
      conversionRateDecimal: "1",
    });
  });

  it("rejects a non-identity rate for a THB source bill", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "100.125",
      sourceCurrency: "THB",
    });
    const trustedEvidence = evidence(sourceBill, {
      conversionRateDecimal: "1.01",
      thbAmountDecimal: "101.12625",
    });
    const { preparer } = await createPreparer(trustedEvidence);

    await expect(
      preparer.prepare(valuationInput(sourceBill)),
    ).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_CONFLICT",
    });
  });

  it("rejects caller-only conversion fields before evidence lookup", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const { preparer, port, attestor } = await createPreparer(undefined);

    await expect(
      preparer.prepare({
        ...valuationInput(sourceBill),
        thbAmountDecimal: "350.00",
        conversionRateDecimal: "35.00",
        rateEffectiveDate: EFFECTIVE_DATE,
        rateSourceId: RATE_SOURCE_ID,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_THB_INPUT_INVALID" });
    expect(attestor.verify).toHaveBeenCalledTimes(1);
    expect(port.getEvidence).not.toHaveBeenCalled();
  });

  it.each([
    "thbAmountDecimal",
    "conversionRateDecimal",
    "rateEffectiveDate",
    "rateSourceId",
  ] as const)("rejects missing trusted %s evidence", async (missingField) => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const trustedEvidence = evidence(sourceBill, {
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
    });
    const incompleteEvidence = { ...trustedEvidence } as Record<
      string,
      unknown
    >;
    delete incompleteEvidence[missingField];
    const { preparer } = await createPreparer(incompleteEvidence);

    await expect(
      preparer.prepare(valuationInput(sourceBill)),
    ).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_INVALID",
    });
  });

  it("rejects contradictory trusted evidence", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const contradictoryEvidence = {
      ...evidence(sourceBill, {
        thbAmountDecimal: "350.00",
        conversionRateDecimal: "35.00",
      }),
      sourceCurrency: "EUR",
    };
    const { preparer } = await createPreparer(contradictoryEvidence);

    await expect(
      preparer.prepare(valuationInput(sourceBill)),
    ).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_CONFLICT",
    });
  });

  it("rejects trusted evidence for a different source bill", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const mismatchedEvidence = {
      ...evidence(sourceBill, {
        thbAmountDecimal: "350.00",
        conversionRateDecimal: "35.00",
      }),
      billId: "bill-usd-002",
    };
    const { preparer } = await createPreparer(mismatchedEvidence);

    await expect(
      preparer.prepare(valuationInput(sourceBill)),
    ).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_CONFLICT",
    });
  });

  it("rejects a duplicate conversion-evidence form", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const trustedEvidence = evidence(sourceBill, {
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
    });
    const { preparer } = await createPreparer([
      trustedEvidence,
      trustedEvidence,
    ]);

    await expect(
      preparer.prepare(valuationInput(sourceBill)),
    ).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_INVALID",
    });
  });

  it("rejects conversion facts mutated before the evidence promise resolves", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const trustedEvidence = evidence(sourceBill, {
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
    });
    let resolveEvidence!: (value: unknown) => void;
    const pendingEvidence = new Promise<unknown>((resolve) => {
      resolveEvidence = resolve;
    });
    const subject = await loadFinanceThbModule();
    const factory = requireThbExport(
      subject.createFinanceThbValuationPreparer,
      "createFinanceThbValuationPreparer",
    );
    const port = {
      getEvidence: vi.fn(() => pendingEvidence),
    };
    const preparer = factory({
      attestor: approvalAttestor(),
      evidencePort: port,
    });
    const operation = preparer.prepare(valuationInput(sourceBill));

    (trustedEvidence as { thbAmountDecimal: string }).thbAmountDecimal =
      "999.00";
    resolveEvidence(trustedEvidence);

    await expect(operation).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_INVALID",
    });
  });

  it("does not alias conversion evidence after preparation", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const trustedEvidence = evidence(sourceBill, {
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
    });
    const { preparer } = await createPreparer(trustedEvidence);
    const result = (await preparer.prepare(
      valuationInput(sourceBill),
    )) as Record<string, unknown>;

    (trustedEvidence as { thbAmountDecimal: string }).thbAmountDecimal =
      "999.00";
    expect(result.thbAmountDecimal).toBe("350.00");
  });

  it("uses the attestor receipt instead of caller receipt fields", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const trustedEvidence = evidence(sourceBill, {
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
    });
    const { preparer } = await createPreparer(trustedEvidence);
    const result = (await preparer.prepare(
      valuationInput(sourceBill, CALLER_RECEIPT),
    )) as Record<string, unknown>;

    expect(result).toMatchObject({
      decisionId: AUTHORITY_RECEIPT.decisionId,
      contentDigest: AUTHORITY_RECEIPT.contentDigest,
    });
    expect(JSON.stringify(result)).not.toContain(CALLER_RECEIPT.decisionId);
    expect(JSON.stringify(result)).not.toContain(CALLER_RECEIPT.contentDigest);
  });

  it("blocks evidence after attestor denial", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const { preparer, port } = await createPreparer(undefined, {
      attestorResult: { decision: "deny", reason: "role-denied" },
    });

    await expect(
      preparer.prepare(valuationInput(sourceBill)),
    ).rejects.toMatchObject({ code: "FINANCE_THB_POLICY_APPROVAL_DENIED" });
    expect(port.getEvidence).not.toHaveBeenCalled();
  });

  it("classifies unchanged trusted conversion evidence as replay", async () => {
    const classify = await createReplayClassifier();
    const valuation = replayValuation();

    expect(
      classify({ existing: valuation, incoming: { ...valuation } }),
    ).toMatchObject({ status: "replay" });
  });

  it.each([
    ["conversionRateDecimal", "36.00"],
    ["rateEffectiveDate", "2026-08-02"],
    ["thbAmountDecimal", "351.00"],
    ["rateSourceId", "owner-selected-source-identity-v2"],
  ] as const)(
    "classifies changed trusted %s as conflict",
    async (field, value) => {
      const classify = await createReplayClassifier();
      const valuation = replayValuation();

      expect(
        classify({
          existing: valuation,
          incoming: { ...valuation, [field]: value },
        }),
      ).toMatchObject({
        status: "conflict",
        reason: "conversion-evidence-mismatch",
      });
    },
  );

  it.each([
    ["empty operand objects", {}, {}],
    [
      "missing scope from both operands",
      withoutReplayField(replayValuation(), "scope"),
      withoutReplayField(replayValuation(), "scope"),
    ],
    [
      "missing content digest from both operands",
      withoutReplayField(replayValuation(), "contentDigest"),
      withoutReplayField(replayValuation(), "contentDigest"),
    ],
  ] as const)(
    "classifies %s as conflict instead of replay",
    async (_name, existing, incoming) => {
      const classify = await createReplayClassifier();

      expect(classify({ existing, incoming })).toMatchObject({
        status: "conflict",
        reason: "conversion-evidence-mismatch",
      });
    },
  );

  it("classifies malformed complete-looking operands as conflict", async () => {
    const classify = await createReplayClassifier();
    const malformed = {
      ...replayValuation(),
      sourceAmountDecimal: 10,
      scope: null,
    };

    expect(
      classify({ existing: malformed, incoming: malformed }),
    ).toMatchObject({
      status: "conflict",
      reason: "conversion-evidence-mismatch",
    });
  });

  it.each(["top-level unknown key", "nested scope unknown key"] as const)(
    "classifies a %s as conflict",
    async (unknownKeyLocation) => {
      const classify = await createReplayClassifier();
      const operand =
        unknownKeyLocation === "top-level unknown key"
          ? {
              ...replayValuation(),
              unreviewedReplayField: "must-reject",
            }
          : {
              ...replayValuation(),
              scope: {
                ...EXPECTED_SCOPE,
                unreviewedScopeField: "must-reject",
              },
            };

      expect(classify({ existing: operand, incoming: operand })).toMatchObject({
        status: "conflict",
        reason: "conversion-evidence-mismatch",
      });
    },
  );

  it("classifies an own __proto__ replay key as conflict", async () => {
    const classify = await createReplayClassifier();
    const withOwnProto = (): Record<string, unknown> => {
      const operand = { ...replayValuation() } as Record<string, unknown>;
      Object.defineProperty(operand, "__proto__", {
        configurable: true,
        enumerable: true,
        value: "POISON_THB_PROTO_REPLAY",
        writable: true,
      });
      return operand;
    };

    expect(
      classify({ existing: withOwnProto(), incoming: withOwnProto() }),
    ).toMatchObject({
      status: "conflict",
      reason: "conversion-evidence-mismatch",
    });
  });

  const scopeChangeCases = [
    {
      name: "company scope change",
      existing: replayValuation(),
      incoming: replayValuation({ scope: { companyId: "company-b" } }),
    },
    {
      name: "school addition",
      existing: replayValuation(),
      incoming: replayValuation({
        scope: { companyId: "company-a", schoolId: "school-a" },
      }),
    },
    {
      name: "school removal",
      existing: replayValuation({
        scope: { companyId: "company-a", schoolId: "school-a" },
      }),
      incoming: replayValuation(),
    },
    {
      name: "school change",
      existing: replayValuation({
        scope: { companyId: "company-a", schoolId: "school-a" },
      }),
      incoming: replayValuation({
        scope: { companyId: "company-a", schoolId: "school-b" },
      }),
    },
  ] as const;

  it.each(scopeChangeCases)(
    "classifies %s as conflict",
    async ({ existing, incoming }) => {
      const classify = await createReplayClassifier();

      expect(classify({ existing, incoming })).toMatchObject({
        status: "conflict",
        reason: "conversion-evidence-mismatch",
      });
    },
  );

  it("classifies a getter-bearing replay envelope as conflict without reading it", async () => {
    const classify = await createReplayClassifier();
    const input = {} as Record<string, unknown>;
    let getterReads = 0;
    Object.defineProperty(input, "existing", {
      enumerable: true,
      get: () => {
        getterReads += 1;
        return replayValuation();
      },
    });
    Object.defineProperty(input, "incoming", {
      enumerable: true,
      get: () => {
        getterReads += 1;
        return replayValuation();
      },
    });

    expect(
      classify(
        input as {
          readonly existing: unknown;
          readonly incoming: unknown;
        },
      ),
    ).toMatchObject({
      status: "conflict",
      reason: "conversion-evidence-mismatch",
    });
    expect(getterReads).toBe(0);
  });

  it("classifies a Proxy replay envelope as conflict without reading it", async () => {
    const classify = await createReplayClassifier();
    let proxyReads = 0;
    const input = new Proxy(
      {
        existing: replayValuation(),
        incoming: replayValuation(),
      },
      {
        get(target, property, receiver) {
          proxyReads += 1;
          return Reflect.get(target, property, receiver);
        },
      },
    );

    expect(
      classify(
        input as {
          readonly existing: unknown;
          readonly incoming: unknown;
        },
      ),
    ).toMatchObject({
      status: "conflict",
      reason: "conversion-evidence-mismatch",
    });
    expect(proxyReads).toBe(0);
  });

  it("classifies a post-call unknown-key mutation as conflict", async () => {
    const classify = await createReplayClassifier();
    const existing = replayValuation();
    const incoming = replayValuation();
    const input = { existing, incoming };

    expect(classify(input)).toMatchObject({ status: "replay" });
    (incoming as Record<string, unknown>).postCallMutation = "must-reject";

    expect(classify(input)).toMatchObject({
      status: "conflict",
      reason: "conversion-evidence-mismatch",
    });
  });
});
