import { describe, expect, it, vi } from "vitest";

type FinanceThbPolicyApprovalScope = {
  readonly companyId: string;
  readonly schoolId?: string;
};

type FinanceThbApprovalReceipt = {
  readonly decisionId: string;
  readonly contentDigest: string;
  readonly scope: FinanceThbPolicyApprovalScope;
};

type FinanceThbAttestorVerifyInput = {
  readonly operation: "finance-thb-policy-approval";
  readonly receipt: unknown;
  readonly expectedScope: FinanceThbPolicyApprovalScope;
  readonly existingReceipt?: unknown;
};

type FinanceThbPolicyApprovalAttestor = {
  readonly verify: (input: FinanceThbAttestorVerifyInput) => Promise<unknown>;
};

type FinanceThbEvidencePort = {
  readonly getEvidence: (input: {
    readonly billId: string;
    readonly sourceAmountDecimal: string;
    readonly sourceCurrency: string;
  }) => Promise<unknown>;
};

type FinanceThbValuationPreparer = {
  readonly prepare: (input: unknown) => Promise<unknown>;
};

type FinanceThbModule = {
  readonly createFinanceThbValuationPreparer?: (input: {
    readonly attestor: FinanceThbPolicyApprovalAttestor;
    readonly evidencePort: FinanceThbEvidencePort;
  }) => FinanceThbValuationPreparer;
};

type FinanceThbValuationInput = {
  readonly bill: {
    readonly billId: string;
    readonly sourceAmountDecimal: string;
    readonly sourceCurrency: string;
  };
  readonly approvalReceipt: unknown;
  readonly expectedScope: FinanceThbPolicyApprovalScope;
};

const EXPECTED_SCOPE: FinanceThbPolicyApprovalScope = {
  companyId: "company-a",
};
const SOURCE_BILL = {
  billId: "bill-usd-001",
  sourceAmountDecimal: "10.00",
  sourceCurrency: "USD",
} as const;
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
const SCHOOL_SCOPE: FinanceThbPolicyApprovalScope = {
  companyId: "company-a",
  schoolId: "school-a",
};
const SCHOOL_CALLER_RECEIPT: FinanceThbApprovalReceipt = {
  decisionId: "caller-school-decision-001",
  contentDigest: "d".repeat(64),
  scope: SCHOOL_SCOPE,
};
const SCHOOL_AUTHORITY_RECEIPT: FinanceThbApprovalReceipt = {
  decisionId: "server-school-decision-001",
  contentDigest: "e".repeat(64),
  scope: SCHOOL_SCOPE,
};
const TRUSTED_EVIDENCE = {
  billId: SOURCE_BILL.billId,
  sourceAmountDecimal: SOURCE_BILL.sourceAmountDecimal,
  sourceCurrency: SOURCE_BILL.sourceCurrency,
  thbAmountDecimal: "350.00",
  conversionRateDecimal: "35.00",
  rateEffectiveDate: "opaque-effective-date",
  rateSourceId: "opaque-rate-source",
};

/** Loads the Finance barrel without importing missing exports statically. */
async function loadFinanceModule(): Promise<FinanceThbModule> {
  return (await import("../index.js")) as unknown as FinanceThbModule;
}

/** Requires the future preparer and reports one bounded Red failure. */
function requirePreparerFactory(
  value: FinanceThbModule["createFinanceThbValuationPreparer"],
): NonNullable<FinanceThbModule["createFinanceThbValuationPreparer"]> {
  if (value === undefined) {
    throw new Error(
      "THB contract missing export: createFinanceThbValuationPreparer",
    );
  }
  return value;
}

/** Creates an accepted Company Identity attestor fake. */
function createAttestor(
  result: unknown = { decision: "allow", receipt: AUTHORITY_RECEIPT },
): FinanceThbPolicyApprovalAttestor & {
  readonly verify: ReturnType<typeof vi.fn>;
} {
  return {
    verify: vi.fn(async () => result),
  };
}

/** Creates the caller-facing valuation input with opaque policy identifiers. */
function valuationInput(
  input: {
    readonly bill?: FinanceThbValuationInput["bill"];
    readonly approvalReceipt?: unknown;
    readonly expectedScope?: FinanceThbPolicyApprovalScope;
  } = {},
): FinanceThbValuationInput {
  return {
    bill: input.bill ?? SOURCE_BILL,
    approvalReceipt: input.approvalReceipt ?? CALLER_RECEIPT,
    expectedScope: { ...(input.expectedScope ?? EXPECTED_SCOPE) },
  };
}

/** Creates an evidence port fake that records all access attempts. */
function createEvidencePort(result: unknown): FinanceThbEvidencePort & {
  readonly getEvidence: ReturnType<typeof vi.fn>;
} {
  return {
    getEvidence: vi.fn(async () => result),
  };
}

/** Loads the future preparer with the accepted Company Identity attestor shape. */
async function createHarness(
  input: {
    readonly attestorResult?: unknown;
    readonly attestor?: FinanceThbPolicyApprovalAttestor & {
      readonly verify: ReturnType<typeof vi.fn>;
    };
    readonly evidence?: unknown;
  } = {},
): Promise<{
  readonly preparer: FinanceThbValuationPreparer;
  readonly attestor: FinanceThbPolicyApprovalAttestor & {
    readonly verify: ReturnType<typeof vi.fn>;
  };
  readonly evidencePort: FinanceThbEvidencePort & {
    readonly getEvidence: ReturnType<typeof vi.fn>;
  };
}> {
  const subject = await loadFinanceModule();
  const factory = requirePreparerFactory(
    subject.createFinanceThbValuationPreparer,
  );
  const attestor = input.attestor ?? createAttestor(input.attestorResult);
  const evidencePort = createEvidencePort(input.evidence ?? TRUSTED_EVIDENCE);
  return {
    preparer: factory({ attestor, evidencePort }),
    attestor,
    evidencePort,
  };
}

describe("Finance THB valuation integration with Company Identity", () => {
  it("requires the accepted Finance THB valuation preparer export", async () => {
    const subject = await loadFinanceModule();
    requirePreparerFactory(subject.createFinanceThbValuationPreparer);
  });

  it("passes the accepted attestor verify envelope before evidence access", async () => {
    const attestor = createAttestor();
    const evidencePort = createEvidencePort(TRUSTED_EVIDENCE);
    const subject = await loadFinanceModule();
    const factory = requirePreparerFactory(
      subject.createFinanceThbValuationPreparer,
    );
    const preparer = factory({ attestor, evidencePort });

    await preparer.prepare(valuationInput());
    expect(attestor.verify).toHaveBeenCalledWith({
      operation: "finance-thb-policy-approval",
      receipt: CALLER_RECEIPT,
      expectedScope: EXPECTED_SCOPE,
    });
    expect(evidencePort.getEvidence).toHaveBeenCalledTimes(1);
  });

  it("allows evidence after an attestor allow and binds its receipt", async () => {
    const { preparer } = await createHarness();
    const result = (await preparer.prepare(valuationInput())) as Record<
      string,
      unknown
    >;

    expect(result).toMatchObject({
      decisionId: AUTHORITY_RECEIPT.decisionId,
      contentDigest: AUTHORITY_RECEIPT.contentDigest,
    });
    expect(JSON.stringify(result)).not.toContain(CALLER_RECEIPT.decisionId);
  });

  it("allows evidence after an attestor replay and uses its receipt", async () => {
    const { preparer, evidencePort } = await createHarness({
      attestorResult: { decision: "replay", receipt: AUTHORITY_RECEIPT },
    });
    const result = (await preparer.prepare(valuationInput())) as Record<
      string,
      unknown
    >;

    expect(result).toMatchObject({
      decisionId: AUTHORITY_RECEIPT.decisionId,
      contentDigest: AUTHORITY_RECEIPT.contentDigest,
    });
    expect(evidencePort.getEvidence).toHaveBeenCalledTimes(1);
  });

  it("denies before evidence access when the attestor denies", async () => {
    const { preparer, evidencePort } = await createHarness({
      attestorResult: { decision: "deny", reason: "role-denied" },
    });

    await expect(preparer.prepare(valuationInput())).rejects.toMatchObject({
      code: "FINANCE_THB_POLICY_APPROVAL_DENIED",
    });
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("conflicts before evidence access when the attestor reports replay conflict", async () => {
    const { preparer, evidencePort } = await createHarness({
      attestorResult: { decision: "conflict", reason: "replay-conflict" },
    });

    await expect(preparer.prepare(valuationInput())).rejects.toMatchObject({
      code: "FINANCE_THB_POLICY_APPROVAL_CONFLICT",
    });
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("maps an attestor dependency failure without exposing its message", async () => {
    const attestor = createAttestor();
    attestor.verify.mockRejectedValue(
      new Error("POISON_DEPENDENCY_SECRET_73f94"),
    );
    const { preparer, evidencePort } = await createHarness({ attestor });

    await expect(preparer.prepare(valuationInput())).rejects.toSatisfy(
      (error: unknown) => {
        const text = String(error);
        return (
          text.includes("FINANCE_THB_POLICY_APPROVAL_FAILED") &&
          !text.includes("POISON_DEPENDENCY_SECRET_73f94")
        );
      },
    );
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects an invalid attestor receipt before evidence access", async () => {
    const { preparer, evidencePort } = await createHarness({
      attestorResult: {
        decision: "allow",
        receipt: { ...AUTHORITY_RECEIPT, contentDigest: "not-a-digest" },
      },
    });

    await expect(preparer.prepare(valuationInput())).rejects.toMatchObject({
      code: "FINANCE_THB_POLICY_APPROVAL_INVALID",
    });
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it.each([
    ["missing decision", { receipt: AUTHORITY_RECEIPT }],
    ["missing receipt", { decision: "allow" }],
    ["unknown decision", { decision: "hold", receipt: AUTHORITY_RECEIPT }],
    ["deny without reason", { decision: "deny" }],
  ] as const)(
    "rejects malformed attestor result: %s",
    async (_label, attestorResult) => {
      const { preparer, evidencePort } = await createHarness({
        attestorResult,
      });

      await expect(preparer.prepare(valuationInput())).rejects.toMatchObject({
        code: "FINANCE_THB_POLICY_APPROVAL_INVALID",
      });
      expect(evidencePort.getEvidence).not.toHaveBeenCalled();
    },
  );

  it("rejects an attestor result with an unknown key", async () => {
    const { preparer, evidencePort } = await createHarness({
      attestorResult: {
        decision: "allow",
        receipt: AUTHORITY_RECEIPT,
        unreviewedResultSecret: "POISON_ATTESTOR_RESULT_SECRET",
      },
    });

    await expect(preparer.prepare(valuationInput())).rejects.toMatchObject({
      code: "FINANCE_THB_POLICY_APPROVAL_INVALID",
    });
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects a getter-bearing attestor result without dependency leakage", async () => {
    const attestorResult: Record<string, unknown> = {
      decision: "allow",
      receipt: AUTHORITY_RECEIPT,
    };
    Object.defineProperty(attestorResult, "receipt", {
      enumerable: true,
      get() {
        throw new Error("POISON_ATTESTOR_RESULT_GETTER");
      },
    });
    const { preparer, evidencePort } = await createHarness({
      attestorResult,
    });

    await expect(preparer.prepare(valuationInput())).rejects.toSatisfy(
      (error: unknown) => {
        const text = String(error);
        return (
          text.includes("FINANCE_THB_POLICY_APPROVAL_INVALID") &&
          !text.includes("POISON_ATTESTOR_RESULT_GETTER")
        );
      },
    );
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("binds an optional school through the accepted attestor receipt", async () => {
    const attestor = createAttestor({
      decision: "allow",
      receipt: SCHOOL_AUTHORITY_RECEIPT,
    });
    const { preparer } = await createHarness({ attestor });
    const result = (await preparer.prepare(
      valuationInput({
        approvalReceipt: SCHOOL_CALLER_RECEIPT,
        expectedScope: SCHOOL_SCOPE,
      }),
    )) as Record<string, unknown>;

    expect(attestor.verify).toHaveBeenCalledWith({
      operation: "finance-thb-policy-approval",
      receipt: SCHOOL_CALLER_RECEIPT,
      expectedScope: SCHOOL_SCOPE,
    });
    expect(result).toMatchObject({
      decisionId: SCHOOL_AUTHORITY_RECEIPT.decisionId,
      contentDigest: SCHOOL_AUTHORITY_RECEIPT.contentDigest,
      scope: SCHOOL_SCOPE,
    });
  });

  it("rejects an attestor receipt with a different optional school", async () => {
    const mismatchedReceipt: FinanceThbApprovalReceipt = {
      ...SCHOOL_AUTHORITY_RECEIPT,
      scope: { companyId: "company-a", schoolId: "school-b" },
    };
    const { preparer, evidencePort } = await createHarness({
      attestorResult: { decision: "allow", receipt: mismatchedReceipt },
    });

    await expect(
      preparer.prepare(
        valuationInput({
          approvalReceipt: SCHOOL_CALLER_RECEIPT,
          expectedScope: SCHOOL_SCOPE,
        }),
      ),
    ).rejects.toMatchObject({ code: "FINANCE_THB_POLICY_APPROVAL_INVALID" });
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects a getter-bearing request before attestor access", async () => {
    const request = {
      approvalReceipt: CALLER_RECEIPT,
      expectedScope: { ...EXPECTED_SCOPE },
    } as Record<string, unknown>;
    Object.defineProperty(request, "bill", {
      enumerable: true,
      get() {
        throw new Error("POISON_THB_REQUEST_GETTER");
      },
    });
    const { preparer, attestor, evidencePort } = await createHarness();

    await expect(preparer.prepare(request)).rejects.toSatisfy(
      (error: unknown) => {
        const text = String(error);
        return (
          text.includes("FINANCE_THB_INPUT_INVALID") &&
          !text.includes("POISON_THB_REQUEST_GETTER")
        );
      },
    );
    expect(attestor.verify).not.toHaveBeenCalled();
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects unknown request keys before attestor access", async () => {
    const { preparer, attestor, evidencePort } = await createHarness();
    const request = {
      ...valuationInput(),
      unreviewedRequestSecret: "POISON_THB_REQUEST_SECRET",
    };

    await expect(preparer.prepare(request)).rejects.toMatchObject({
      code: "FINANCE_THB_INPUT_INVALID",
    });
    expect(attestor.verify).not.toHaveBeenCalled();
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects a Proxy request before attestor access", async () => {
    const request = new Proxy(valuationInput(), {
      get() {
        throw new Error("POISON_THB_REQUEST_PROXY");
      },
    });
    const { preparer, attestor, evidencePort } = await createHarness();

    await expect(preparer.prepare(request)).rejects.toSatisfy(
      (error: unknown) => {
        const text = String(error);
        return (
          text.includes("FINANCE_THB_INPUT_INVALID") &&
          !text.includes("POISON_THB_REQUEST_PROXY")
        );
      },
    );
    expect(attestor.verify).not.toHaveBeenCalled();
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects an attestor result mutated after promise resolution", async () => {
    let resolveResult!: (result: unknown) => void;
    const resultPromise = new Promise<unknown>((resolve) => {
      resolveResult = resolve;
    });
    const attestor = createAttestor();
    attestor.verify.mockImplementation(() => resultPromise);
    const { preparer, evidencePort } = await createHarness({ attestor });
    const operation = preparer.prepare(valuationInput());
    const mutableResult = {
      decision: "allow",
      receipt: { ...AUTHORITY_RECEIPT },
    };

    resolveResult(mutableResult);
    mutableResult.receipt.contentDigest = "not-a-digest";

    await expect(operation).rejects.toMatchObject({
      code: "FINANCE_THB_POLICY_APPROVAL_INVALID",
    });
    expect(evidencePort.getEvidence).not.toHaveBeenCalled();
  });

  it("rejects a caller receipt that differs from the attestor receipt", async () => {
    const { preparer } = await createHarness();
    const result = (await preparer.prepare(
      valuationInput({
        approvalReceipt: { ...CALLER_RECEIPT, decisionId: "other" },
      }),
    )) as Record<string, unknown>;

    expect(result.decisionId).toBe(AUTHORITY_RECEIPT.decisionId);
    expect(result.contentDigest).toBe(AUTHORITY_RECEIPT.contentDigest);
  });

  it("snapshots the request before the attestor await", async () => {
    let resolveAuthority!: () => void;
    const authorityReady = new Promise<void>((resolve) => {
      resolveAuthority = resolve;
    });
    const request = valuationInput();
    const attestor = createAttestor();
    attestor.verify.mockImplementation(async (input) => {
      await authorityReady;
      expect(input.receipt).toEqual(CALLER_RECEIPT);
      expect(input.expectedScope).toEqual(EXPECTED_SCOPE);
      return { decision: "allow", receipt: AUTHORITY_RECEIPT };
    });
    const { preparer } = await createHarness({ attestor });
    const pending = preparer.prepare(request);

    (request as { approvalReceipt: unknown }).approvalReceipt = {
      ...CALLER_RECEIPT,
      decisionId: "poisoned-caller-decision",
    };
    (request.expectedScope as { companyId: string }).companyId = "company-b";
    resolveAuthority();
    await pending;
  });

  it("uses only the attestor receipt for the output identity and digest", async () => {
    const { preparer } = await createHarness();
    const result = (await preparer.prepare(
      valuationInput({ approvalReceipt: CALLER_RECEIPT }),
    )) as Record<string, unknown>;

    expect(result).toMatchObject({
      decisionId: AUTHORITY_RECEIPT.decisionId,
      contentDigest: AUTHORITY_RECEIPT.contentDigest,
    });
    expect(JSON.stringify(result)).not.toContain(CALLER_RECEIPT.decisionId);
    expect(JSON.stringify(result)).not.toContain(CALLER_RECEIPT.contentDigest);
  });
});
