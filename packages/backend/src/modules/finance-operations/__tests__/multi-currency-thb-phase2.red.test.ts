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
  readonly financeThbConversionEvidenceSchema?: {
    readonly safeParse: (input: unknown) => { readonly success: boolean };
  };
  readonly createFinanceThbValuationPreparer?: (input: {
    readonly evidencePort: FinanceThbEvidencePort;
  }) => FinanceThbValuationPreparer;
  readonly classifyFinanceThbValuationReplay?: (input: {
    readonly existing: unknown;
    readonly incoming: unknown;
  }) => unknown;
};

type FinanceThbBill = {
  readonly billId: string;
  readonly sourceAmountDecimal: string;
  readonly sourceCurrency: string;
};

const RATE_SOURCE_ID = "owner-selected-source-identity";
const EFFECTIVE_DATE = "2026-08-01";

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

/** Creates a provider-neutral evidence port fake for the Red contract. */
function evidencePort(result: unknown): FinanceThbEvidencePort & {
  readonly getEvidence: ReturnType<typeof vi.fn>;
} {
  return {
    getEvidence: vi.fn(async () => result),
  };
}

/** Creates the expected future THB preparer over an injected internal port. */
async function createPreparer(result: unknown): Promise<{
  readonly preparer: FinanceThbValuationPreparer;
  readonly port: FinanceThbEvidencePort & {
    readonly getEvidence: ReturnType<typeof vi.fn>;
  };
}> {
  const subject = await loadFinanceThbModule();
  const factory = requireThbExport(
    subject.createFinanceThbValuationPreparer,
    "createFinanceThbValuationPreparer",
  );
  const port = evidencePort(result);
  return { preparer: factory({ evidencePort: port }), port };
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
      const result = await preparer.prepare(sourceBill);
      const valuation = result as Record<string, unknown>;

      expect(valuation).toMatchObject({
        billId: sourceBill.billId,
        sourceAmountDecimal,
        sourceCurrency: name,
        thbAmountDecimal,
        conversionRateDecimal,
        rateEffectiveDate: EFFECTIVE_DATE,
        rateSourceId: RATE_SOURCE_ID,
      });
      expect(port.getEvidence).toHaveBeenCalledWith(sourceBill);
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
    const result = (await preparer.prepare(sourceBill)) as Record<
      string,
      unknown
    >;

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

    await expect(preparer.prepare(sourceBill)).rejects.toMatchObject({
      code: "FINANCE_THB_CONVERSION_EVIDENCE_CONFLICT",
    });
  });

  it("rejects caller-only conversion fields before evidence lookup", async () => {
    const sourceBill = bill({
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
    });
    const { preparer, port } = await createPreparer(undefined);

    await expect(
      preparer.prepare({
        ...sourceBill,
        thbAmountDecimal: "350.00",
        conversionRateDecimal: "35.00",
        rateEffectiveDate: EFFECTIVE_DATE,
        rateSourceId: RATE_SOURCE_ID,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_THB_INPUT_INVALID" });
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

    await expect(preparer.prepare(sourceBill)).rejects.toMatchObject({
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

    await expect(preparer.prepare(sourceBill)).rejects.toMatchObject({
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

    await expect(preparer.prepare(sourceBill)).rejects.toMatchObject({
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

    await expect(preparer.prepare(sourceBill)).rejects.toMatchObject({
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
    const preparer = factory({ evidencePort: port });
    const operation = preparer.prepare(sourceBill);

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
    const result = (await preparer.prepare(sourceBill)) as Record<
      string,
      unknown
    >;

    (trustedEvidence as { thbAmountDecimal: string }).thbAmountDecimal =
      "999.00";
    expect(result.thbAmountDecimal).toBe("350.00");
  });

  it("classifies unchanged trusted conversion evidence as replay", async () => {
    const subject = await loadFinanceThbModule();
    const classify = requireThbExport(
      subject.classifyFinanceThbValuationReplay,
      "classifyFinanceThbValuationReplay",
    );
    const valuation = {
      billId: "bill-usd-001",
      sourceAmountDecimal: "10.00",
      sourceCurrency: "USD",
      thbAmountDecimal: "350.00",
      conversionRateDecimal: "35.00",
      rateEffectiveDate: EFFECTIVE_DATE,
      rateSourceId: RATE_SOURCE_ID,
    };

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
      const subject = await loadFinanceThbModule();
      const classify = requireThbExport(
        subject.classifyFinanceThbValuationReplay,
        "classifyFinanceThbValuationReplay",
      );
      const valuation = {
        billId: "bill-usd-001",
        sourceAmountDecimal: "10.00",
        sourceCurrency: "USD",
        thbAmountDecimal: "350.00",
        conversionRateDecimal: "35.00",
        rateEffectiveDate: EFFECTIVE_DATE,
        rateSourceId: RATE_SOURCE_ID,
      };

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
});
