import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { getStory, listStories, listPrimaryStories, getStoryForStudent, recordStoryRead } from "../stories/index.js";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/db/schema", () => ({
  stories: {
    id: "id", isPublic: "isPublic", raLevel: "raLevel", genre: "genre", title: "title",
    subgenre: "subgenre", image: "image", cefrLevel: "cefrLevel",
  },
  chapters: { id: "ch.id", storyId: "ch.storyId", chapterNumber: "chapterNumber" },
  userActivity: { userId: "ua.userId", activityType: "activityType", targetId: "targetId" },
  storyRecords: { userId: "userId", storyId: "storyId", status: "status" },
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
  or: vi.fn((...conds) => ({ type: "or", conds })),
  gte: vi.fn((col, val) => ({ col, val, type: "gte" })),
  lte: vi.fn((col, val) => ({ col, val, type: "lte" })),
  ilike: vi.fn((col, val) => ({ col, val, type: "ilike" })),
  like: vi.fn((col, val) => ({ col, val, type: "like" })),
  inArray: vi.fn((col, val) => ({ col, val, type: "inArray" })),
  asc: vi.fn((col) => ({ col, type: "asc" })),
  count: vi.fn(() => ({ type: "count" })),
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


describe("listPrimaryStories", () => {
  const row = { id: "st-1", title: "The Lantern Fox", genre: "Fantasy", raLevel: 5, cefrLevel: "A2", image: "cl123" };
  const mockTeacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };

  /** Builds a mock DB whose three selects return the rows, the count, and the genres. */
  function listDb(rows: unknown[] = [row], total = 1, genres: string[] = ["Fantasy", "Sports"]) {
    return createMockDb({
      selectSequence: [rows, [{ total }], genres.map((genre) => ({ genre }))],
    });
  }

  /** The `where` mock of the first select (the list query). */
  const firstWhere = (db: ReturnType<typeof createMockDb>) => db.select.mock.results[0].value.from.mock.results[0].value.where;

  /** Flattens the where condition of the first select into a list of leaf conditions. */
  function leaves(db: ReturnType<typeof createMockDb>) {
    const where = firstWhere(db).mock.calls[0][0] as { type: string; conds?: unknown[] };
    const flat = (c: any): any[] => (c.conds ? c.conds.flatMap(flat) : [c]);
    return flat(where);
  }

  const call = (db: ReturnType<typeof createMockDb>, user: any, input: Record<string, unknown> = {}) =>
    listPrimaryStories({ db: wrapDb(db), user, tenant: mockTenant, input });

  it("returns story cards with the picture key (image ?? id), the total, and the genres", async () => {
    const db = listDb([row, { ...row, id: "st-2", image: null }], 2);
    const result = await call(db, { ...mockStudent, level: 5 });
    expect(result.stories.map((s) => s.imageKey)).toEqual(["cl123", "st-2"]);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.genres).toEqual(["Fantasy", "Sports"]);
  });

  it("limits a student to published stories in the level window raLevel +/- 1", async () => {
    const db = listDb();
    await call(db, { ...mockStudent, level: 5 });
    const l = leaves(db);
    expect(l).toContainEqual({ col: "isPublic", val: true, type: "eq" });
    expect(l).toContainEqual({ col: "raLevel", val: 4, type: "gte" });
    expect(l).toContainEqual({ col: "raLevel", val: 6, type: "lte" });
  });

  it("keeps the window at level 1 or higher", async () => {
    const db = listDb();
    await call(db, { ...mockStudent, level: 1 });
    expect(leaves(db)).toContainEqual({ col: "raLevel", val: 1, type: "gte" });
  });

  it("shows staff every published story with no level window", async () => {
    const db = listDb();
    await call(db, mockTeacher);
    const l = leaves(db);
    expect(l).toContainEqual({ col: "isPublic", val: true, type: "eq" });
    expect(l.some((c) => c.type === "gte" || c.type === "lte")).toBe(false);
    await call(listDb(), mockAdmin);
  });

  it("filters by genre and by a search on title or topic", async () => {
    const db = listDb();
    await call(db, { ...mockStudent, level: 5 }, { genre: "Fantasy", search: "fox" });
    const l = leaves(db);
    expect(l).toContainEqual({ col: "genre", val: "Fantasy", type: "eq" });
    expect(l).toContainEqual({ col: "title", val: "%fox%", type: "ilike" });
    expect(l).toContainEqual({ col: "subgenre", val: "%fox%", type: "ilike" });
  });

  it("escapes the wildcard characters of a search", async () => {
    const db = listDb();
    await call(db, mockAdmin, { search: "50%_off" });
    expect(leaves(db)).toContainEqual({ col: "title", val: "%50\\%\\_off%", type: "ilike" });
  });

  it("pages by 10 and reads the page offset", async () => {
    const db = listDb();
    const result = await call(db, mockAdmin, { page: 3 });
    const builder = firstWhere(db).mock.results[0].value;
    expect(builder.limit).toHaveBeenCalledWith(10);
    expect(builder.offset).toHaveBeenCalledWith(20);
    expect(result.page).toBe(3);
  });

  it("rejects a bad page and a user without story:list", async () => {
    await expect(call(listDb(), mockAdmin, { page: 0 })).rejects.toThrow();
    const intern = { id: "i1", role: "INTERN" as const, schoolId: "school-1" };
    await expect(call(listDb(), intern)).rejects.toThrow();
  });
});

describe("getStoryForStudent", () => {
  const STORY = "11111111-1111-4111-8111-111111111111";
  const story = {
    id: STORY, title: "The Lantern Fox", summary: "A fox.", translatedSummary: { th: "จิ้งจอก" },
    genre: "Fantasy", raLevel: 5, cefrLevel: "A2", image: "cl123",
    storyBible: [{ name: "Fox", description: "Quick", background: "Forest" }, { description: "no name" }],
  };
  const chapterRows = [
    { id: "c1", chapterNumber: 1, title: "One", summary: "s1", translatedSummary: { th: "หนึ่ง" } },
    { id: "c2", chapterNumber: 2, title: "Two", summary: null, translatedSummary: "bad" },
  ];
  const teacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };

  /** Mock DB: story row, chapter rows, activity rows (in select order). */
  function storyDb(rows: unknown[] = [story], chapters: unknown[] = chapterRows, done: unknown[] = [{ targetId: "c1" }]) {
    return createMockDb({ selectSequence: [rows, chapters, done] });
  }
  const call = (db: ReturnType<typeof createMockDb>, user: any, storyId = STORY) =>
    getStoryForStudent({ db: wrapDb(db), user, tenant: mockTenant, input: { storyId } });
  const leaves = (db: ReturnType<typeof createMockDb>, n: number) => {
    const where = db.select.mock.results[n].value.from.mock.results[0].value.where.mock.calls[0][0] as { conds?: unknown[] };
    const flat = (c: any): any[] => (c.conds ? c.conds.flatMap(flat) : [c]);
    return flat(where);
  };

  it("returns the story, the ordered chapters, the finished chapters, and valid characters", async () => {
    const result = await call(storyDb(), { ...mockStudent, level: 5 });
    expect(result.story).toMatchObject({ id: STORY, title: "The Lantern Fox", imageKey: "cl123", translatedSummary: { th: "จิ้งจอก" } });
    expect(result.chapters.map((c) => c.chapterNumber)).toEqual([1, 2]);
    expect(result.chapters[1]!.translatedSummary).toBeNull();
    expect(result.finishedChapterIds).toEqual(["c1"]);
    expect(result.characters).toEqual([{ name: "Fox", description: "Quick", background: "Forest" }]);
  });

  it("limits a student to a published story in the level window", async () => {
    const db = storyDb();
    await call(db, { ...mockStudent, level: 5 });
    const l = leaves(db, 0);
    expect(l).toContainEqual({ col: "isPublic", val: true, type: "eq" });
    expect(l).toContainEqual({ col: "raLevel", val: 4, type: "gte" });
    expect(l).toContainEqual({ col: "raLevel", val: 6, type: "lte" });
  });

  it("shows staff a published story with no window", async () => {
    const db = storyDb();
    await call(db, teacher);
    const l = leaves(db, 0);
    expect(l).toContainEqual({ col: "isPublic", val: true, type: "eq" });
    expect(l.some((c) => c.type === "gte" || c.type === "lte")).toBe(false);
  });

  it("throws StoryNotFoundError when no story matches (outside the window or not published)", async () => {
    await expect(call(storyDb([]), { ...mockStudent, level: 9 })).rejects.toThrow(/Story not found/);
  });

  it("reads finished chapters from the user's STORIES_ activity rows by chapter id", async () => {
    const db = storyDb();
    await call(db, { ...mockStudent, level: 5 });
    const l = leaves(db, 2);
    expect(l).toContainEqual({ col: "ua.userId", val: "s1", type: "eq" });
    expect(l).toContainEqual({ col: "activityType", val: "STORIES_%", type: "like" });
    expect(l).toContainEqual({ col: "targetId", val: ["c1", "c2"], type: "inArray" });
  });

  it("rejects an input that is not a UUID", async () => {
    await expect(call(storyDb(), { ...mockStudent, level: 5 }, "nope")).rejects.toThrow();
  });
});
