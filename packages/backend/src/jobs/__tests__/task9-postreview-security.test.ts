import { describe, expect, it } from "vitest";

import {
  enqueueJobRequestSchema,
  jsonSafeValueSchema,
  replayAuthorizationEvidenceSchema,
  settleJobRequestSchema,
  type ReplayAuthorizationVerifier,
} from "../contracts.js";
import { createDurableJobQueuePort } from "../adapters/postgres/index.js";

const NOW = "2030-01-01T00:00:00.000Z";
const JOB_ID = "00000000-0000-4000-8000-000000000001";

/** Creates a valid request with a caller-supplied durable value. */
function enqueueRequest(payload: unknown) {
  return {
    jobName: "review.process",
    queueName: "review.queue",
    tenant: { mode: "global" } as const,
    idempotencyKey: "postreview-json-value",
    payload,
    maxAttempts: 1,
    availableAt: NOW,
  };
}

/** Creates a valid settlement request with a caller-supplied durable value. */
function settleRequest(result: unknown) {
  return {
    jobId: JOB_ID,
    tenant: { mode: "global" } as const,
    leaseToken: "lease-token-123456789",
    now: NOW,
    result,
  };
}

/** Creates a port whose transaction counter proves pre-transaction rejection. */
function replayPort(verifier: ReplayAuthorizationVerifier) {
  let transactionCount = 0;
  const sql = Object.assign(() => Promise.resolve([]), {
    begin: async <TResult>(_callback: unknown): Promise<TResult> => {
      transactionCount += 1;
      throw new Error("The verifier output must reject before a transaction.");
    },
  });
  return {
    port: createDurableJobQueuePort({
      sql: sql as unknown as Parameters<
        typeof createDurableJobQueuePort
      >[0]["sql"],
      replayAuthorizationVerifier: verifier,
    }),
    transactionCount: () => transactionCount,
  };
}

describe("Task 9 post-review persistence contracts", () => {
  it("preserves every valid JSON value without coercion", () => {
    const values = [
      null,
      true,
      false,
      0,
      -12.5,
      "plain text",
      ["nested", 1, null],
      { nested: { enabled: true }, items: [1, 2, 3] },
    ];

    for (const value of values) {
      expect(jsonSafeValueSchema.parse(value)).toEqual(value);
      expect(
        enqueueJobRequestSchema.parse(enqueueRequest(value)).payload,
      ).toEqual(value);
      expect(settleJobRequestSchema.parse(settleRequest(value)).result).toEqual(
        value,
      );
    }
  });

  it("rejects values that JSON serialization would change or omit", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const values = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      { nested: undefined },
      [undefined],
      new Date(NOW),
      1n,
      () => undefined,
      Symbol("postreview"),
      cyclic,
      new (class DurableValue {})(),
    ];

    for (const value of values) {
      expect(jsonSafeValueSchema.safeParse(value).success).toBe(false);
      expect(
        enqueueJobRequestSchema.safeParse(enqueueRequest(value)).success,
      ).toBe(false);
      expect(
        settleJobRequestSchema.safeParse(settleRequest(value)).success,
      ).toBe(false);
    }
  });

  it("rejects malformed verifier evidence before a transaction or audit write", async () => {
    const validEvidence = {
      subjectId: "verified-admin",
      permission: "admin:dashboard" as const,
      decisionId: "signed-decision",
      authorizedAt: NOW,
    };
    const malformedEvidence = [
      { ...validEvidence, subjectId: undefined },
      { ...validEvidence, extra: "unknown" },
      { ...validEvidence, decisionId: 3 },
      { ...validEvidence, subjectId: "x".repeat(201) },
      { ...validEvidence, authorizedAt: "not-a-time" },
      { ...validEvidence, permission: "jobs:replay" },
    ];

    for (const evidence of malformedEvidence) {
      const { port, transactionCount } = replayPort({
        verify: async () => evidence,
      });
      await expect(
        port.replay({
          jobId: JOB_ID,
          tenant: { mode: "global" },
          authorization: validEvidence,
          reason: "Post-review verifier validation.",
          correlationId: "postreview-correlation",
          now: NOW,
        }),
      ).rejects.toBeDefined();
      expect(transactionCount()).toBe(0);
      expect(
        replayAuthorizationEvidenceSchema.safeParse(evidence).success,
      ).toBe(false);
    }
  });
});
