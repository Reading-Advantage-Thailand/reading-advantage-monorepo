import { describe, it, expect, vi } from "vitest";
import { reviewExercise } from "../codecamp/review-exercise.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const admin = {
  id: "a1",
  username: "admin1",
  name: "Admin",
  role: "ADMIN" as const,
  schoolId: "s1",
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const globalTenant = { schoolId: null };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, globalTenant);
}

describe("reviewExercise", () => {
  it("returns LLM review result for a PR diff", async () => {
    const mockReview = {
      passed: true,
      summary: "Great work!",
      comments: [{ line: 5, body: "Nice variable naming." }],
    };

    const generateReview = vi.fn().mockResolvedValue(mockReview);
    const db = createMockDb();

    const result = await reviewExercise({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      prDiff: "diff --git a/file.ts b/file.ts\n+const x = 1;",
      generateReview,
    });

    expect(result.passed).toBe(true);
    expect(result.summary).toBe("Great work!");
    expect(generateReview).toHaveBeenCalled();
  });

  it("looks up module context when moduleId is provided", async () => {
    const moduleRow = {
      id: "m1",
      title: "TypeScript Basics",
      description: "Learn TS fundamentals",
      slug: "ts-basics",
      order: 1,
      phase: "A",
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = createMockDb({ selectResults: [moduleRow] });
    const generateReview = vi.fn().mockResolvedValue({
      passed: true,
      summary: "Good",
      comments: [],
    });

    await reviewExercise({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      prDiff: "diff",
      moduleId: "m1",
      generateReview,
    });

    const callArgs = generateReview.mock.calls[0];
    expect(callArgs[0]).toContain("TypeScript Basics");
    expect(callArgs[0]).toContain("Learn TS fundamentals");
  });

  it("looks up module context via repoUrl when no moduleId", async () => {
    const repoRow = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo",
      description: "Repo",
      order: 1,
      createdAt: new Date(),
    };
    const moduleRow = {
      id: "m1",
      title: "React Fundamentals",
      description: "Learn React",
      slug: "react",
      order: 7,
      phase: "B",
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          const self = Object.assign(Promise.resolve(selectCallCount === 1 ? [repoRow] : [moduleRow]), {
            limit: vi.fn().mockReturnThis(),
          });
          return self;
        }),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          const self = Object.assign(Promise.resolve(selectCallCount === 1 ? [repoRow] : [moduleRow]), {
            limit: vi.fn().mockReturnThis(),
          });
          return self;
        }),
      }),
    });

    const generateReview = vi.fn().mockResolvedValue({
      passed: true,
      summary: "Good",
      comments: [],
    });

    await reviewExercise({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      prDiff: "diff",
      repoUrl: "https://github.com/org/repo",
      generateReview,
    });

    const callArgs = generateReview.mock.calls[0];
    expect(callArgs[0]).toContain("React Fundamentals");
  });

  it("rejects non-admin users", async () => {
    const intern = { ...admin, role: "INTERN" as const };
    const db = createMockDb();

    await expect(
      reviewExercise({
        db: wrapDb(db),
        user: intern,
        tenant: globalTenant,
        prDiff: "diff",
        generateReview: vi.fn(),
      })
    ).rejects.toThrow(/admin:dashboard/);
  });
});
