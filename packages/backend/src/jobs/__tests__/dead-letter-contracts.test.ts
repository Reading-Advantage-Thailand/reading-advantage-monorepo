import { describe, expect, it } from "vitest";

import {
  deadJobSummarySchema,
  listDeadJobsRequestSchema,
  listDeadJobsResultSchema,
} from "../index.js";

const summary = {
  id: "018f0d8f-31d1-7d50-9f4f-550d34295095",
  jobName: "test.jobs.dead-letter",
  queueName: "default",
  tenant: { mode: "tenant", tenantId: "school-123" },
  attempt: 3,
  maxAttempts: 3,
  lastError: {
    code: "UPSTREAM_TIMEOUT",
    safeSummary: "The upstream service timed out.",
  },
  createdAt: "2026-07-22T10:00:00.000Z",
  updatedAt: "2026-07-22T10:05:00.000Z",
  completedAt: "2026-07-22T10:05:00.000Z",
};

describe("dead-letter visibility contracts", () => {
  it("requires a trusted tenant scope for bounded listing", () => {
    const request = {
      queueName: "default",
      tenant: { mode: "tenant", tenantId: "school-123" },
      limit: 25,
    };
    expect(listDeadJobsRequestSchema.safeParse(request).success).toBe(true);
    expect(
      listDeadJobsRequestSchema.safeParse({
        queueName: "default",
        limit: 25,
      }).success,
    ).toBe(false);
  });

  it("returns payload-free summaries and rejects secret-bearing fields", () => {
    expect(deadJobSummarySchema.safeParse(summary).success).toBe(true);
    expect(
      deadJobSummarySchema.safeParse({
        ...summary,
        attempt: summary.maxAttempts + 1,
      }).success,
    ).toBe(false);
    expect(
      deadJobSummarySchema.safeParse({
        ...summary,
        payload: { providerToken: "must-not-leak" },
      }).success,
    ).toBe(false);
    expect(
      listDeadJobsResultSchema.safeParse({
        jobs: [summary],
        nextCursor: "cursor-2",
      }).success,
    ).toBe(true);
  });
});
