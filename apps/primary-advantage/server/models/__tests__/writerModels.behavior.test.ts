// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import {
  articles,
  lessonProgress,
  multipleChoiceQuestions,
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

vi.mock("../../utils/generators/image-generator", () => ({
  generateImage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../utils/generators/audio-word-generator", () => ({
  generateWordLists: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("bcryptjs", () => ({
  default: { hashSync: vi.fn().mockReturnValue("hashed-password") },
}));

import { saveArticleContent } from "../articleModel";
import { updateUserLessonProgress } from "../assignmentModel";
import { updateStandaloneLessonProgress } from "../lessonModel";
import { createUser } from "../userModel";

let harness: TestDb;

const SCHOOL_ID = "00000000-0000-0000-0000-0000000000a1";
const CLASSROOM_ID = "00000000-0000-0000-0000-0000000000c1";
const ARTICLE_ID = "00000000-0000-0000-0000-0000000000e1";
const ASSIGNMENT_ONE_ID = "00000000-0000-0000-0000-0000000000d1";
const ASSIGNMENT_TWO_ID = "00000000-0000-0000-0000-0000000000d2";

const generatedContent = {
  article: {
    title: "A Small Garden",
    passage: "Mina plants seeds in a small garden.",
    summary: "Mina grows plants.",
    translatedSummary: { th: "", cn: "", tw: "", vi: "" },
    imageDesc: "A child plants seeds.",
    rating: 4,
    cefrLevel: "A1",
    type: "fiction" as const,
    genre: "Adventure",
    subGenre: "Nature",
  },
  mcq: {
    questions: [
      {
        question: "What does Mina plant?",
        options: ["Seeds", "Stones", "Books"],
        answer: "Seeds",
      },
    ],
  },
  saq: { questions: [{ question: "Where is Mina?", answer: "In a garden." }] },
  laq: { question: "Why might Mina enjoy gardening?" },
};

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

  it("creates an article with content and a numeric answer index", async () => {
    await saveArticleContent(generatedContent);

    const [article] = await harness.db.select().from(articles);
    const [question] = await harness.db.select().from(multipleChoiceQuestions);

    expect(article.content).toBe(generatedContent.article.passage);
    expect(question.correctAnswer).toBe(0);
  });

  it("rejects an unmatched answer before any article write", async () => {
    const invalid = structuredClone(generatedContent);
    invalid.mcq.questions[0].answer = "Water";

    await expect(saveArticleContent(invalid)).rejects.toThrow(
      "The correct answer is not in the options",
    );
    expect(await harness.db.select().from(articles)).toHaveLength(0);
  });

  it("persists the generated user identity and the submitted display name", async () => {
    await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('user')`);

    const result = await createUser({
      name: "Learner",
      email: " Learner@Example.com ",
      password: "valid-password",
    });
    const [storedUser] = await harness.db.select().from(users);

    expect(result).toHaveProperty("success");
    expect(storedUser.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(storedUser.username).toBe("learner@example.com");
    expect(storedUser.displayUsername).toBe("Learner@Example.com");
    expect(storedUser.role).toBe("STUDENT");
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
