import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  claimJobsResultSchema,
  createJobEnvelopeSchema,
} from "../index.js";

const envelopeSchema = createJobEnvelopeSchema(
  z.strictObject({ task: z.string() }),
  z.strictObject({ ok: z.boolean() }),
);

const runningEnvelope = {
  id: "018f0d8f-31d1-7d50-9f4f-550d34295095",
  jobName: "test.jobs.attempt",
  queueName: "default",
  tenant: { mode: "global" },
  idempotencyKey: "attempt-contract",
  payload: { task: "verify" },
  state: "running",
  attempt: 1,
  maxAttempts: 2,
  availableAt: "2026-07-22T10:00:00.000Z",
  createdAt: "2026-07-22T09:59:00.000Z",
  updatedAt: "2026-07-22T10:00:00.000Z",
  lease: {
    token: "opaque-lease-token",
    workerId: "worker-a",
    expiresAt: "2026-07-22T10:01:00.000Z",
  },
};

describe("durable job attempt invariants", () => {
  it("requires running attempts to be one-based", () => {
    expect(envelopeSchema.safeParse(runningEnvelope).success).toBe(true);
    expect(
      envelopeSchema.safeParse({ ...runningEnvelope, attempt: 0 }).success,
    ).toBe(false);
  });

  it("rejects envelope and claim attempts beyond the declared maximum", () => {
    const invalid = { ...runningEnvelope, attempt: 3 };
    expect(
      claimJobsResultSchema.safeParse({
        outcome: "claimed",
        jobs: [runningEnvelope],
      }).success,
    ).toBe(true);
    expect(envelopeSchema.safeParse(invalid).success).toBe(false);
    expect(
      claimJobsResultSchema.safeParse({
        outcome: "claimed",
        jobs: [invalid],
      }).success,
    ).toBe(false);
  });
});
