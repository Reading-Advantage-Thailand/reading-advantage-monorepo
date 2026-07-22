import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  claimJobsResultSchema,
  createJobEnvelopeSchema,
  defineDurableJobHandler,
  enqueueJobRequestSchema,
  enqueueJobResultSchema,
  failJobResultSchema,
  heartbeatJobResultSchema,
  replayJobResultSchema,
  settleJobResultSchema,
} from "../index.js";

const payloadSchema = z.strictObject({ reviewId: z.string().uuid() });
const resultSchema = z.strictObject({ annotationCount: z.number().int().min(0) });
const envelopeSchema = createJobEnvelopeSchema(payloadSchema, resultSchema);

const baseEnvelope = {
  id: "018f0d8f-31d1-7d50-9f4f-550d34295095",
  jobName: "codecamp.review.pull-request",
  queueName: "reviews",
  tenant: { mode: "global" as const },
  idempotencyKey: "codecamp-review:owner/repo#123",
  payload: { reviewId: "018f0d8f-31d1-7d50-9f4f-550d34295096" },
  attempt: 1,
  maxAttempts: 5,
  availableAt: "2026-07-22T10:00:00.000Z",
  createdAt: "2026-07-22T09:59:00.000Z",
  updatedAt: "2026-07-22T10:00:00.000Z",
};

describe("durable job contract Red matrix", () => {
  it("validates enqueue requests at the provider-neutral boundary", () => {
    const request = {
      jobName: "codecamp.review.pull-request",
      queueName: "reviews",
      tenant: { mode: "global" },
      idempotencyKey: "codecamp-review:owner/repo#123",
      payload: { reviewId: "018f0d8f-31d1-7d50-9f4f-550d34295096" },
      maxAttempts: 5,
      availableAt: "2026-07-22T10:00:00.000Z",
    };

    expect(enqueueJobRequestSchema.safeParse(request).success).toBe(true);
    expect(
      enqueueJobRequestSchema.safeParse({ ...request, maxAttempts: 0 }).success,
    ).toBe(false);
    expect(
      enqueueJobRequestSchema.safeParse({
        ...request,
        tenant: { mode: "tenant" },
      }).success,
    ).toBe(false);
  });

  it("distinguishes newly enqueued, refreshed, and active-lease-retained outcomes", () => {
    expect(
      enqueueJobResultSchema.parse({
        outcome: "active-lease-retained",
        jobId: baseEnvelope.id,
        followUpScheduled: true,
      }),
    ).toEqual({
      outcome: "active-lease-retained",
      jobId: baseEnvelope.id,
      followUpScheduled: true,
    });
    expect(
      enqueueJobResultSchema.safeParse({
        outcome: "active-lease-retained",
        jobId: baseEnvelope.id,
      }).success,
    ).toBe(false);
  });

  it("requires a lease token and expiry for running envelopes", () => {
    const running = {
      ...baseEnvelope,
      state: "running",
      lease: {
        token: "opaque-lease-token",
        workerId: "worker-a",
        expiresAt: "2026-07-22T10:01:00.000Z",
      },
    };

    expect(envelopeSchema.safeParse(running).success).toBe(true);
    expect(
      envelopeSchema.safeParse({ ...running, lease: undefined }).success,
    ).toBe(false);
    expect(
      envelopeSchema.safeParse({
        ...running,
        payload: { reviewId: "not-a-uuid" },
      }).success,
    ).toBe(false);
  });

  it("validates successful results only on succeeded envelopes", () => {
    expect(
      envelopeSchema.safeParse({
        ...baseEnvelope,
        state: "succeeded",
        result: { annotationCount: 3 },
        completedAt: "2026-07-22T10:02:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      envelopeSchema.safeParse({
        ...baseEnvelope,
        state: "succeeded",
        result: { annotationCount: -1 },
        completedAt: "2026-07-22T10:02:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("keeps legacy failed rows readable without making them claimable", () => {
    expect(
      envelopeSchema.safeParse({
        ...baseEnvelope,
        state: "legacy-failed",
        lastError: { code: "LEGACY_FAILURE", safeSummary: "Safe summary" },
        completedAt: "2026-07-22T10:02:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      claimJobsResultSchema.safeParse({
        outcome: "claimed",
        jobs: [{ ...baseEnvelope, state: "legacy-failed" }],
      }).success,
    ).toBe(false);
  });

  it("makes empty and claimed polling outcomes explicit", () => {
    expect(claimJobsResultSchema.parse({ outcome: "empty" })).toEqual({
      outcome: "empty",
    });
    expect(
      claimJobsResultSchema.safeParse({ outcome: "claimed", jobs: [] }).success,
    ).toBe(false);
  });

  it("discriminates stale lease heartbeat and settlement outcomes", () => {
    expect(
      heartbeatJobResultSchema.parse({ outcome: "stale-lease" }),
    ).toEqual({ outcome: "stale-lease" });
    expect(settleJobResultSchema.parse({ outcome: "stale-lease" })).toEqual({
      outcome: "stale-lease",
    });
    expect(
      settleJobResultSchema.safeParse({
        outcome: "settled",
        state: "pending",
      }).success,
    ).toBe(false);
  });

  it("makes retry and terminal failure distinct from stale ownership", () => {
    expect(
      failJobResultSchema.safeParse({
        outcome: "retry-scheduled",
        availableAt: "2026-07-22T10:05:00.000Z",
      }).success,
    ).toBe(true);
    expect(failJobResultSchema.safeParse({ outcome: "dead" }).success).toBe(true);
    expect(
      failJobResultSchema.safeParse({ outcome: "stale-lease" }).success,
    ).toBe(true);
  });

  it("rejects active-lease replay as a typed outcome", () => {
    expect(
      replayJobResultSchema.parse({ outcome: "active-lease-rejected" }),
    ).toEqual({ outcome: "active-lease-rejected" });
    expect(
      replayJobResultSchema.safeParse({
        outcome: "replayed",
        priorState: "running",
      }).success,
    ).toBe(false);
  });

  it("defines handlers with runtime payload and result schemas", async () => {
    const handler = defineDurableJobHandler({
      jobName: "codecamp.review.pull-request",
      tenantMode: "global",
      payload: payloadSchema,
      result: resultSchema,
      async handle(_context, payload) {
        return { annotationCount: payload.reviewId.length };
      },
    });

    expect(handler.payload.parse(baseEnvelope.payload)).toEqual(baseEnvelope.payload);
    await expect(
      handler.handle(
        {
          jobId: baseEnvelope.id,
          attempt: 1,
          maxAttempts: 5,
          tenant: { mode: "global" },
          signal: new AbortController().signal,
        },
        baseEnvelope.payload,
      ),
    ).resolves.toEqual({ annotationCount: 36 });
  });
});
