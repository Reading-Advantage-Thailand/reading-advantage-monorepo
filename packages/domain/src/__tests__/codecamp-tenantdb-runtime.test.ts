import { describe, it, expect, vi } from "vitest";

// Restore the real tenant registry so this test exercises live table
// classification rather than the setup-time mock that hides REFERENTIAL
// tables behind EXEMPT.
vi.unmock("../tenant-registry.js");

import { createTenantDB, TenantScopeError } from "../db-contract.js";
import {
  getPrReviewsForUser,
  createPrReview,
  completeApprovedPrReviewLesson,
  getExerciseRepos,
  logWebhookEvent,
} from "../codecamp/index.js";
import {
  codecampPrReviews,
  codecampExerciseRepos,
  codecampWebhookEvents,
} from "@reading-advantage/db/schema";
import { classifyTable } from "../tenant-registry.js";
import { createMockDb } from "./mock-db.js";
import type { DB } from "@reading-advantage/db";

const globalTenant = { schoolId: null as string | null };

const systemUser = {
  id: "system",
  username: "system",
  name: "System",
  role: "SYSTEM" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const internUser = {
  id: "i1",
  username: "intern1",
  name: "Intern 1",
  role: "INTERN" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, globalTenant);
}

describe("CodeCamp REFERENTIAL table runtime classification", () => {
  it("classifies codecamp tables as REFERENTIAL, not EXEMPT", () => {
    expect(classifyTable(codecampPrReviews)).toBe("REFERENTIAL");
    expect(classifyTable(codecampExerciseRepos)).toBe("REFERENTIAL");
    expect(classifyTable(codecampWebhookEvents)).toBe("REFERENTIAL");
  });
});

describe("CodeCamp domain functions against real TenantDB", () => {
  it("does not throw TenantScopeError for REFERENTIAL codecamp tables", async () => {
    const db = createMockDb();

    const cases = [
      {
        name: "getPrReviewsForUser",
        call: () =>
          getPrReviewsForUser({
            db: wrapDb(db),
            user: internUser,
            tenant: globalTenant,
          }),
      },
      {
        name: "getExerciseRepos",
        call: () =>
          getExerciseRepos({
            db: wrapDb(db),
            user: internUser,
            tenant: globalTenant,
            input: {},
          }),
      },
      {
        name: "createPrReview",
        call: () =>
          createPrReview({
            db: wrapDb(db),
            user: internUser,
            tenant: globalTenant,
            input: {
              exerciseRepoId: "r1",
              prUrl: "https://github.com/org/repo/pull/1",
            },
          }),
      },
      {
        name: "completeApprovedPrReviewLesson",
        call: () =>
          completeApprovedPrReviewLesson({
            db: wrapDb(db),
            user: systemUser,
            tenant: globalTenant,
            input: { reviewId: "pr1" },
          }),
      },
      {
        name: "logWebhookEvent",
        call: () =>
          logWebhookEvent({
            db: wrapDb(db),
            user: systemUser,
            tenant: globalTenant,
            input: {
              deliveryId: "d1",
              event: "pull_request",
              outcome: "ignored",
              reason: "runtime classification test",
            },
          }),
      },
    ];

    let attemptedCount = 0;
    let tenantScopeErrorCount = 0;
    const errors: string[] = [];

    for (const testCase of cases) {
      attemptedCount++;
      try {
        await testCase.call();
      } catch (err) {
        if (err instanceof TenantScopeError) {
          tenantScopeErrorCount++;
          errors.push(`${testCase.name}: ${err.message}`);
        }
        // Other errors are ignored: this Red test targets TenantScopeError only.
      }
    }

    expect({
      attemptedCount,
      tenantScopeErrorCount,
      errors,
    }).toEqual({
      attemptedCount: cases.length,
      tenantScopeErrorCount: 0,
      errors: [],
    });
  });
});
