import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { getStory, listStories, recordStoryRead } from "../stories/index.js";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/db/schema", () => ({
  stories: { id: "id", isPublic: "isPublic" },
  storyRecords: { userId: "userId", storyId: "storyId", status: "status" },
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
}));

const mockStudent = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const mockAdmin = { id: "a1", role: "ADMIN" as const, schoolId: "school-1" };
const mockTenant = { schoolId: "school-1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, mockTenant);
}

describe("getStory", () => {
  it("returns a story by ID", async () => {
    const story = { id: "story-1", title: "The Dragon", genre: "fantasy" };
    const db = createMockDb({ selectResults: [story] });

    const result = await getStory({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { storyId: "story-1" },
    });

    expect(result).toEqual(story);
  });

  it("throws when story is not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      getStory({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { storyId: "nonexistent" },
      })
    ).rejects.toThrow(/Story not found/);
  });

  it("throws when user lacks story:read permission", async () => {
    const db = createMockDb();
    const intern = { id: "i1", role: "INTERN" as const, schoolId: "school-1" };

    await expect(
      getStory({
        db: wrapDb(db),
        user: intern,
        tenant: mockTenant,
        input: { storyId: "story-1" },
      })
    ).rejects.toThrow(/story:read/);
  });
});

describe("listStories", () => {
  it("returns a list of stories", async () => {
    const db = createMockDb({
      selectResults: [
        { id: "s1", title: "Story 1" },
        { id: "s2", title: "Story 2" },
      ],
    });

    const result = await listStories({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { limit: 10, offset: 0 },
    });

    expect(result).toHaveLength(2);
  });

  it("returns empty array when no stories exist", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await listStories({
      db: wrapDb(db),
      user: mockAdmin,
      tenant: mockTenant,
      input: { limit: 10, offset: 0 },
    });

    expect(result).toEqual([]);
  });
});

describe("recordStoryRead", () => {
  it("creates a story read record", async () => {
    const record = { id: "rec-1", userId: "s1", storyId: "story-1", status: "READ" };
    const db = createMockDb({ insertReturning: [record] });

    const result = await recordStoryRead({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { storyId: "story-1", status: "READ" },
    });

    expect(result.storyId).toBe("story-1");
    expect(db.insert).toHaveBeenCalled();
  });

  it("throws when non-student tries to record progress", async () => {
    const db = createMockDb();
    const teacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };

    await expect(
      recordStoryRead({
        db: wrapDb(db),
        user: teacher,
        tenant: mockTenant,
        input: { storyId: "story-1", status: "READ" },
      })
    ).rejects.toThrow(/progress:record/);
  });
});
