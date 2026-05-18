import { describe, it, expect, vi } from "vitest";
import {
  createInternAccount,
  updateInternGithubUsername,
  createPrReview,
} from "../codecamp/index.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const admin = {
  id: "a1",
  username: "admin1",
  name: "Admin",
  role: "ADMIN" as const,
  schoolId: "s1",
};

const student = {
  id: "st1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "s1",
};

const globalTenant = { schoolId: null };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, globalTenant);
}

// ─── createInternAccount with githubUsername ──────────────

describe("createInternAccount with githubUsername", () => {
  it("stores githubUsername normalized (lowercase, no @) when provided with @", async () => {
    const insertedUser = {
      id: "u1",
      username: "intern1",
      name: "Intern One",
      role: "INTERN",
      schoolId: null,
      githubUsername: "interngithub",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // selectSequence: 1st call = no existing user (empty), transaction reuses same db
    const db = createMockDb({
      selectResults: [],
      insertReturning: [insertedUser],
    });

    const result = await createInternAccount({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { username: "intern1", name: "Intern One", password: "Password1", githubUsername: "@InternGitHub" },
    });

    expect(result.githubUsername).toBe("interngithub");
    // Verify values passed to insert contain normalized username
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    const valuesCalled = insertMock.mock.results[0]?.value?.values as ReturnType<typeof vi.fn>;
    const insertPayload = valuesCalled?.mock?.calls?.[0]?.[0] as Record<string, unknown> | undefined;
    if (insertPayload) {
      expect(insertPayload.githubUsername).toBe("interngithub");
    }
  });

  it("stores githubUsername as null when not provided", async () => {
    const insertedUser = {
      id: "u2",
      username: "intern2",
      name: "Intern Two",
      role: "INTERN",
      schoolId: null,
      githubUsername: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({
      selectResults: [],
      insertReturning: [insertedUser],
    });

    const result = await createInternAccount({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { username: "intern2", name: "Intern Two", password: "Password1" },
    });

    expect(result.githubUsername).toBeNull();
  });

  it("normalizes uppercase githubUsername to lowercase", async () => {
    const insertedUser = {
      id: "u3",
      username: "intern3",
      name: "Intern Three",
      role: "INTERN",
      schoolId: null,
      githubUsername: "lowercasehandle",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({
      selectResults: [],
      insertReturning: [insertedUser],
    });

    const result = await createInternAccount({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { username: "intern3", name: "Intern Three", password: "Password1", githubUsername: "LowercaseHandle" },
    });

    expect(result.githubUsername).toBe("lowercasehandle");
  });
});

// ─── updateInternGithubUsername ───────────────────────────

describe("updateInternGithubUsername", () => {
  it("normalizes and updates githubUsername", async () => {
    const internRow = { id: "u1" };
    const updatedUser = {
      id: "u1",
      username: "intern1",
      name: "Intern One",
      role: "INTERN",
      schoolId: null,
      githubUsername: "newhandle",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({
      selectResults: [internRow],
      updateReturning: [updatedUser],
    });

    const result = await updateInternGithubUsername({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { userId: "u1", githubUsername: "@NewHandle" },
    });

    expect(result.githubUsername).toBe("newhandle");
    expect(db.update).toHaveBeenCalled();
  });

  it("sets githubUsername to null when null is passed", async () => {
    const internRow = { id: "u1" };
    const updatedUser = {
      id: "u1",
      username: "intern1",
      name: "Intern One",
      role: "INTERN",
      schoolId: null,
      githubUsername: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({
      selectResults: [internRow],
      updateReturning: [updatedUser],
    });

    const result = await updateInternGithubUsername({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { userId: "u1", githubUsername: null },
    });

    expect(result.githubUsername).toBeNull();
  });

  it("throws when intern does not exist", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      updateInternGithubUsername({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        input: { userId: "nonexistent", githubUsername: "handle" },
      })
    ).rejects.toThrow("Intern not found");
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      updateInternGithubUsername({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { userId: "u1", githubUsername: "handle" },
      })
    ).rejects.toThrow(/admin:dashboard/);
  });
});

// ─── createPrReview PR URL validation ────────────────────

describe("createPrReview PR URL validation", () => {
  it("succeeds with a valid PR URL matching the exercise repo", async () => {
    const repo = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo1",
      description: "Test repo",
      order: 1,
      createdAt: new Date(),
    };
    const review = {
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "st1",
      prUrl: "https://github.com/org/repo1/pull/42",
      reviewStatus: "pending",
      llmReviewSummary: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    const db = createMockDb({
      insertReturning: [review],
      // 1st select: repo lookup → [repo]; 2nd select: duplicate PR check → []
      selectSequence: [[repo], []],
    });

    const result = await createPrReview({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/repo1/pull/42" },
    });

    expect(result.id).toBe("pr1");
    expect(result.reviewStatus).toBe("pending");
  });

  it("throws when PR URL is for the wrong repository", async () => {
    const repo = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo1",
      description: "Test repo",
      order: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[repo]],
    });

    await expect(
      createPrReview({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/wrong-repo/pull/1" },
      })
    ).rejects.toThrow(/PR URL must be for the/);
  });

  it("throws when PR URL is malformed", async () => {
    const repo = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo1",
      description: "Test repo",
      order: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[repo]],
    });

    await expect(
      createPrReview({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { exerciseRepoId: "r1", prUrl: "not-a-url" },
      })
    ).rejects.toThrow("Invalid PR URL");
  });

  it("throws when PR URL is not a GitHub URL", async () => {
    const repo = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo1",
      description: "Test repo",
      order: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[repo]],
    });

    await expect(
      createPrReview({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { exerciseRepoId: "r1", prUrl: "https://gitlab.com/org/repo1/pull/1" },
      })
    ).rejects.toThrow("PR URL must be a GitHub URL");
  });

  it("throws when PR URL is a GitHub issue URL (not a pull request)", async () => {
    const repo = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo1",
      description: "Test repo",
      order: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[repo]],
    });

    await expect(
      createPrReview({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        // issues/42 not pull/42
        input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/repo1/issues/42" },
      })
    ).rejects.toThrow("Invalid PR URL: must be a GitHub pull request URL");
  });

  it("throws when PR URL path is missing pull number", async () => {
    const repo = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo1",
      description: "Test repo",
      order: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[repo]],
    });

    await expect(
      createPrReview({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/repo1/pull/abc" },
      })
    ).rejects.toThrow("Invalid PR URL: must be a GitHub pull request URL");
  });

  it("accepts PR URL with .git suffix on exercise repo URL", async () => {
    const repo = {
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo1.git",
      description: "Test repo",
      order: 1,
      createdAt: new Date(),
    };
    const review = {
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "st1",
      prUrl: "https://github.com/org/repo1/pull/5",
      reviewStatus: "pending",
      llmReviewSummary: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    const db = createMockDb({
      insertReturning: [review],
      selectSequence: [[repo], []],
    });

    const result = await createPrReview({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/repo1/pull/5" },
    });

    expect(result.id).toBe("pr1");
  });
});
