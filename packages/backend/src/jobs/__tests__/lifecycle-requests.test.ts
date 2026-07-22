import { describe, expect, it } from "vitest";

import {
  failJobRequestSchema,
  heartbeatJobRequestSchema,
  heartbeatJobResultSchema,
  reclaimExpiredJobsRequestSchema,
  reclaimExpiredJobsResultSchema,
  replayJobRequestSchema,
  settleJobRequestSchema,
} from "../index.js";

const tenant = { mode: "tenant", tenantId: "school-123" };
const leaseMutation = {
  jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
  tenant,
  leaseToken: "opaque-lease-token",
  now: "2026-07-22T10:00:00.000Z",
};

describe("durable job lifecycle request contracts", () => {
  it("requires an opaque lease token and trusted tenant for worker mutations", () => {
    expect(
      heartbeatJobRequestSchema.safeParse({
        ...leaseMutation,
        extendBySeconds: 60,
      }).success,
    ).toBe(true);
    expect(
      settleJobRequestSchema.safeParse({
        ...leaseMutation,
        result: { ok: true },
      }).success,
    ).toBe(true);
    expect(
      failJobRequestSchema.safeParse({
        ...leaseMutation,
        error: { code: "UPSTREAM_TIMEOUT", safeSummary: "Safe summary" },
      }).success,
    ).toBe(true);
    expect(
      heartbeatJobRequestSchema.safeParse({
        ...leaseMutation,
        leaseToken: "guessable",
        extendBySeconds: 60,
      }).success,
    ).toBe(false);
    const { tenant: _tenant, ...unscoped } = leaseMutation;
    expect(
      settleJobRequestSchema.safeParse({
        ...unscoped,
        result: { ok: true },
      }).success,
    ).toBe(false);
  });

  it("requires a concrete expiry on successful heartbeat outcomes", () => {
    expect(
      heartbeatJobResultSchema.safeParse({
        outcome: "extended",
        expiresAt: "2026-07-22T10:01:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      heartbeatJobResultSchema.safeParse({ outcome: "extended" }).success,
    ).toBe(false);
    expect(
      heartbeatJobResultSchema.safeParse({ outcome: "stale-lease" }).success,
    ).toBe(true);
  });

  it("requires tenant-scoped admin authorization and audit metadata for replay", () => {
    const request = {
      jobId: leaseMutation.jobId,
      tenant,
      authorization: {
        subjectId: "account-123",
        permission: "admin:dashboard",
        decisionId: "authz-456",
        authorizedAt: leaseMutation.now,
      },
      reason: "Operator confirmed a corrected upstream payload.",
      correlationId: "request-456",
      now: leaseMutation.now,
    };
    expect(replayJobRequestSchema.safeParse(request).success).toBe(true);
    expect(
      replayJobRequestSchema.safeParse({
        ...request,
        authorization: {
          ...request.authorization,
          permission: "jobs:replay",
        },
      }).success,
    ).toBe(false);
    expect(
      replayJobRequestSchema.safeParse({
        ...request,
        authorization: undefined,
        actorId: "caller-supplied-only",
      }).success,
    ).toBe(false);
    expect(
      replayJobRequestSchema.safeParse({ ...request, reason: "" }).success,
    ).toBe(false);
    expect(
      replayJobRequestSchema.safeParse({ ...request, correlationId: "" })
        .success,
    ).toBe(false);
  });

  it("requires tenant scope and separates zero from positive reclamation", () => {
    expect(
      reclaimExpiredJobsRequestSchema.safeParse({
        queueName: "default",
        tenant,
        limit: 10,
        now: leaseMutation.now,
      }).success,
    ).toBe(true);
    expect(
      reclaimExpiredJobsRequestSchema.safeParse({
        queueName: "default",
        limit: 10,
        now: leaseMutation.now,
      }).success,
    ).toBe(false);
    expect(
      reclaimExpiredJobsResultSchema.safeParse({ outcome: "no-op" }).success,
    ).toBe(true);
    expect(
      reclaimExpiredJobsResultSchema.safeParse({
        outcome: "reclaimed",
        count: 0,
      }).success,
    ).toBe(false);
  });
});
