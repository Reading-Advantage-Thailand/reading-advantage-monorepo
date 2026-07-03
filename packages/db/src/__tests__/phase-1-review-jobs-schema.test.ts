import { describe, it, expect } from "vitest";
import { reviewJobs, codecampReviewJobStatusEnum } from "../schema/codecamp.js";

describe("Phase 1 — review_jobs schema contract", () => {
  it("exports the reviewJobs table", () => {
    expect(reviewJobs, "reviewJobs must be exported from codecamp schema").toBeDefined();
  });

  it("has the required columns", () => {
    const columnNames = Object.keys(reviewJobs).filter(
      (k) => !k.startsWith("_") && !k.startsWith("["),
    );

    const required = [
      "id",
      "prOwner",
      "prRepo",
      "prPullNumber",
      "payloadJson",
      "status",
      "attempts",
      "maxAttempts",
      "nextAttemptAt",
      "lastError",
      "claimedAt",
      "claimedBy",
      "reviewId",
      "createdAt",
      "updatedAt",
    ];

    for (const col of required) {
      expect(
        columnNames,
        `reviewJobs must expose a ${col} column`,
      ).toContain(col);
    }
  });

  it("exports the review job status enum", () => {
    expect(codecampReviewJobStatusEnum, "codecampReviewJobStatusEnum must be exported").toBeDefined();
  });

  it("status enum contains the five required values", () => {
    const values = codecampReviewJobStatusEnum.enumValues;
    expect(values, "status enum values").toEqual(
      expect.arrayContaining(["pending", "claimed", "succeeded", "failed", "dead"]),
    );
    expect(values.length, "status enum value count").toBe(5);
  });
});
