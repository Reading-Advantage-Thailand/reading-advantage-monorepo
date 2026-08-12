import { describe, expect, it, vi } from "vitest";

interface FinanceOperationsModule {
  readonly createHistoricalPrivateEvidenceOutboxProjector?: (input: {
    readonly durableJobs: {
      enqueue(request: Readonly<Record<string, unknown>>): Promise<unknown>;
    };
    readonly projectionStore: {
      findByOutboxEventId(outboxEventId: string): Promise<unknown>;
      bindReceipt(receipt: Readonly<Record<string, unknown>>): Promise<unknown>;
      claimReceipt?: (
        input: Readonly<{
          readonly outboxEventId: string;
          readonly idempotencyKey: string;
        }>,
      ) => Promise<unknown>;
      releaseClaim?: (
        input: Readonly<Record<string, unknown>>,
      ) => Promise<void>;
    };
    readonly job: {
      readonly jobName: string;
      readonly queueName: string;
      readonly maxAttempts: number;
    };
  }) => unknown;
  readonly createHistoricalPrivateEvidenceBindingAdapter?: (input: {
    readonly reader: {
      readAuthorizedEvidence(
        input: Readonly<Record<string, unknown>>,
      ): Promise<unknown>;
    };
    readonly maxBytes: number;
  }) => unknown;
}

/** Loads Finance Operations through its public composition boundary. */
async function loadFinanceOperationsModule(): Promise<FinanceOperationsModule> {
  return (await import("../index.js")) as unknown as FinanceOperationsModule;
}

describe("Finance Task 3 security Review A v2 RED contract", () => {
  it("requires a durable claim/CAS dependency for every projector", async () => {
    const subject = await loadFinanceOperationsModule();
    const factory = subject.createHistoricalPrivateEvidenceOutboxProjector;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    expect(() =>
      factory({
        durableJobs: {
          enqueue: vi.fn(async () => ({
            outcome: "enqueued",
            jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
          })),
        },
        projectionStore: {
          findByOutboxEventId: vi.fn(async () => undefined),
          bindReceipt: vi.fn(async () => ({ status: "bound" as const })),
        },
        job: {
          jobName: "finance.historical-private-evidence.import",
          queueName: "finance-historical-imports",
          maxAttempts: 3,
        },
      }),
    ).toThrow("FINANCE_PROJECTOR_DEPENDENCY_INVALID");
  });

  it("validates the binding reader and owner byte ceiling before composition", async () => {
    const subject = await loadFinanceOperationsModule();
    const factory = subject.createHistoricalPrivateEvidenceBindingAdapter;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    expect(() =>
      factory({
        reader: undefined as never,
        maxBytes: 0,
      }),
    ).toThrow("FINANCE_PRIVATE_EVIDENCE_BINDING_DEPENDENCY_INVALID");

    expect(() =>
      factory({
        reader: {
          readAuthorizedEvidence: vi.fn(async () => undefined),
        },
        maxBytes: 1.5,
      }),
    ).toThrow("FINANCE_PRIVATE_EVIDENCE_BINDING_DEPENDENCY_INVALID");
  });
});
