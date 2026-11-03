import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { SCI, sciUser, seedScience } from "./helpers/science-fixture.js";

const holder = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, get db() { return holder.db; } };
});

const { getLessonBySlug } = await import("../curriculum/get-lesson-by-slug.js");
const { getStudentLessonProgress } = await import("../students/get-student-lesson-progress.js");

const tenant = { schoolId: SCI.school };

/**
 * Both lookups compare the uuid id column with a slug string in one OR.
 * Postgres casts the slug to uuid, fails with 22P02, and the read throws.
 */
describe("science lesson lookup by slug", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
    holder.db = harness.db;
    await seedScience(harness);
  }, 120_000);
  afterAll(async () => harness.close());

  it.fails("getLessonBySlug finds a lesson by its slug", async () => {
    const result = await getLessonBySlug({ user: sciUser("ADMIN", "sci-admin"), tenant, input: { lessonSlug: "sci-lesson-1" } });
    expect(result).toMatchObject({ lesson: { id: SCI.lesson1, title: "Lesson One" } });
  });

  it.fails("getLessonBySlug returns null for an unknown slug", async () => {
    await expect(getLessonBySlug({ user: sciUser("ADMIN", "sci-admin"), tenant, input: { lessonSlug: "no-such-lesson" } })).resolves.toBeNull();
  });

  it.fails("getStudentLessonProgress finds a lesson by its slug", async () => {
    const result = await getStudentLessonProgress({ user: sciUser("STUDENT", "sci-ann"), tenant, input: { studentId: "me", lessonId: "sci-lesson-1" } });
    expect(result).toMatchObject({ studentId: "sci-ann", lessonId: "sci-lesson-1", status: "COMPLETED" });
  });

  it.fails("getStudentLessonProgress reports an unknown slug as a missing lesson", async () => {
    await expect(getStudentLessonProgress({ user: sciUser("STUDENT", "sci-ann"), tenant, input: { studentId: "me", lessonId: "no-such-lesson" } })).rejects.toThrow("Lesson not found");
  });
});
