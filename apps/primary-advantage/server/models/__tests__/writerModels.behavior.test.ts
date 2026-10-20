// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import {
  lessonProgress,
  studentAssignments,
  users,
} from "@reading-advantage/db";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_target, property) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as
          | Record<string | symbol, unknown>
          | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const value = real[property];
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(real)
          : value;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

const passwordEventMocks = vi.hoisted(() => ({ afterPasswordWrite: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/utils/passwordEvents", () => passwordEventMocks);
vi.mock("bcryptjs", () => ({
  default: { hashSync: vi.fn().mockReturnValue("hashed-password") },
}));

import { updateUserLessonProgress } from "../assignmentModel";
import { updateStandaloneLessonProgress } from "../lessonModel";
import { createUser } from "../userModel";

let harness: TestDb;

const SCHOOL_ID = "00000000-0000-0000-0000-0000000000a1";
const CLASSROOM_ID = "00000000-0000-0000-0000-0000000000c1";
const ARTICLE_ID = "00000000-0000-0000-0000-0000000000e1";
const ASSIGNMENT_ONE_ID = "00000000-0000-0000-0000-0000000000d1";
const ASSIGNMENT_TWO_ID = "00000000-0000-0000-0000-0000000000d2";

async function seedProgressResources() {
  await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL_ID}, 'Test School')`);
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, role, school_id)
    VALUES ('teacher-1', 'teacher-1', 'teacher-1', 'Teacher', 'TEACHER', ${SCHOOL_ID}),
           ('student-1', 'student-1', 'student-1', 'Student', 'STUDENT', ${SCHOOL_ID})`);
  await harness.db.execute(sql`INSERT INTO classrooms (id, name, school_id, teacher_id)
    VALUES (${CLASSROOM_ID}, 'Class One', ${SCHOOL_ID}, 'teacher-1')`);
  await harness.db.execute(sql`INSERT INTO articles (id, title, content, passage)
    VALUES (${ARTICLE_ID}, 'Article One', 'Article text', 'Article text')`);
  await harness.db.execute(sql`INSERT INTO assignments (id, title, classroom_id, teacher_id, article_id, type)
    VALUES (${ASSIGNMENT_ONE_ID}, 'First assignment', ${CLASSROOM_ID}, 'teacher-1', ${ARTICLE_ID}, 'ARTICLE'),
           (${ASSIGNMENT_TWO_ID}, 'Second assignment', ${CLASSROOM_ID}, 'teacher-1', ${ARTICLE_ID}, 'ARTICLE')`);
  await harness.db.execute(sql`INSERT INTO student_assignments (assignment_id, student_id, status)
    VALUES (${ASSIGNMENT_ONE_ID}, 'student-1', 'NOT_STARTED'),
           (${ASSIGNMENT_TWO_ID}, 'student-1', 'NOT_STARTED')`);
}

describe("Primary writer behavior", () => {
  beforeAll(async () => {
    harness = await createTestDb();
  }, 60_000);

  afterEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.close();
  });

  it("persists the generated user identity and the submitted display name", async () => {
    await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('user')`);

    const result = await createUser({
      name: "Learner",
      email: " Learner@Example.com ",
      password: "valid-password",
    });
    const [storedUser] = await harness.db.select().from(users);

    // Only the id: the full row carried the password hash (Phase 2 review item 3).
    expect(result).toEqual({ success: "User created successfully", user: { id: storedUser.id } });
    expect(storedUser.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(storedUser.username).toBe("learner@example.com");
    expect(storedUser.displayUsername).toBe("Learner@Example.com");
    expect(storedUser.role).toBe("STUDENT");
    expect(passwordEventMocks.afterPasswordWrite).toHaveBeenCalledWith({
      userId: storedUser.id,
      actor: null,
      created: true,
    });
  });

  it("stores standalone and assigned progress under each route identity", async () => {
    await seedProgressResources();

    await updateStandaloneLessonProgress("student-1", ARTICLE_ID, 30, 20);
    await updateUserLessonProgress(
      "student-1",
      ASSIGNMENT_ONE_ID,
      ARTICLE_ID,
      40,
      30,
    );
    await updateUserLessonProgress(
      "student-1",
      ASSIGNMENT_TWO_ID,
      ARTICLE_ID,
      100,
      50,
    );

    const progressRows = await harness.db.select().from(lessonProgress);
    const assignmentRows = await harness.db.select().from(studentAssignments);
    const completedAssignment = assignmentRows.find(
      (row) => row.assignmentId === ASSIGNMENT_TWO_ID,
    );

    expect(progressRows.map((row) => row.lessonId).sort()).toEqual(
      [ARTICLE_ID, ASSIGNMENT_ONE_ID, ASSIGNMENT_TWO_ID].sort(),
    );
    expect(progressRows.find((row) => row.lessonId === ASSIGNMENT_TWO_ID)).toMatchObject({
      status: "completed",
      progress: 100,
      isCompleted: true,
    });
    expect(completedAssignment).toMatchObject({
      status: "COMPLETED",
      completed: true,
    });
    expect(completedAssignment?.completedAt).toBeInstanceOf(Date);
  });
});
