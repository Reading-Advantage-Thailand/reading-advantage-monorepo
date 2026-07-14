import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";
import {
  CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION,
  prReviewOverrideInputSchema,
  recordPrReviewOverride,
} from "../codecamp/pr-review-overrides.js";

const admin = { id: "admin-1", username: "admin", name: "Admin", role: "ADMIN" as const, schoolId: null, xp: 0, level: 1, cefrLevel: "A1" as const };
const tenant = { schoolId: null };
const attemptId = "27bc82f7-27bb-4815-9855-3e20d7f5a513";

describe("PR review overrides", () => {
  it("requires a bounded human correction rather than a history edit", () => {
    expect(prReviewOverrideInputSchema.safeParse({ attemptId, correctedDisposition: "pass", reason: "short", correctedObjectives: [] }).success).toBe(false);
    expect(prReviewOverrideInputSchema.safeParse({
      attemptId,
      correctedDisposition: "revise",
      reason: "The deterministic CI artifact shows the required accessibility failure.",
      correctedObjectives: [{ objectiveId: "codecamp.workflow.skill.git-branches", correctedScore: 40, correctedConfidence: 95, reason: "The branch check failed in the cited CI artifact." }],
    }).success).toBe(true);
  });

  it("appends a tenant-verified correction to the immutable audit log", async () => {
    const event = { id: "audit-1", action: CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION };
    const db = createMockDb({ selectResults: [{ id: attemptId }], insertReturning: [event] });
    await expect(recordPrReviewOverride({
      db: createTenantDB(db as unknown as DB, tenant),
      user: admin,
      tenant,
      input: {
        attemptId,
        correctedDisposition: "revise",
        reason: "The deterministic CI artifact shows the required accessibility failure.",
        correctedObjectives: [],
      },
    })).resolves.toEqual(event);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
