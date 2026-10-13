import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "@reading-advantage/auth";
import { practiceInputSchema } from "@reading-advantage/game-contracts";

import type { TenantDB } from "../../db-contract.js";
import {
  LESSON_PRACTICE_INPUT_PREFIX,
  getLessonPracticeInput,
  getLessonPreviewPracticeInput,
  lessonPracticeInputRequestSchema,
} from "../practice-input.js";
import { createMockDb } from "../../__tests__/mock-db.js";

const mocks = vi.hoisted(() => ({ managedClassBook: vi.fn(), failure: undefined as Error | undefined }));

// A plain wrapper: a vi.fn that throws or rejects fails the test in this Vitest version.
vi.mock("../../primary-books/class-books.js", () => ({
  managedClassBook: async (...args: unknown[]) => {
    if (mocks.failure) throw mocks.failure;
    return mocks.managedClassBook(...args);
  },
}));

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const OTHER_ARTICLE = "22222222-2222-4222-8222-222222222222";
const CLASS_BOOK = "33333333-3333-4333-8333-333333333333";

const student = {
  id: "student-1",
  username: "s1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A2",
};
const teacher = { ...student, id: "teacher-1", role: "TEACHER" as const };
const tenant = { schoolId: "school-1" };

const word = (vocabulary: string, th: string) => ({ vocabulary, definition: { th, en: vocabulary } });
const line = (sentence: string, th: string) => ({ sentence, translation: { th } });

const snapshot = {
  words: Array.from({ length: 12 }, (_, i) => word(`word${i}`, `คำ${i}`)),
  sentence: Array.from({ length: 10 }, (_, i) => line(`Sentence number ${i} is here.`, `ประโยค${i}`)),
};

/** A TenantDB whose raw database returns the given select results in order. */
function dbOf(...results: unknown[][]) {
  const rawDb = createMockDb({ selectSequence: results });
  return { rawDb, db: { unscoped: () => rawDb } as unknown as TenantDB };
}

describe("lessonPracticeInputRequestSchema", () => {
  it("defaults the locale and needs both class book fields together", () => {
    expect(lessonPracticeInputRequestSchema.parse({ articleId: ARTICLE }).locale).toBe("th");
    expect(lessonPracticeInputRequestSchema.safeParse({ articleId: ARTICLE, classBookId: CLASS_BOOK }).success).toBe(false);
    expect(lessonPracticeInputRequestSchema.safeParse({ articleId: "x" }).success).toBe(false);
  });
});

describe("getLessonPracticeInput", () => {
  beforeEach(() => {
    mocks.managedClassBook.mockReset();
    mocks.failure = undefined;
  });

  it("builds the input from the article snapshot with the lesson id and the limits", async () => {
    const { db } = dbOf([snapshot]);
    const result = await getLessonPracticeInput({ db, user: student, tenant, input: { articleId: ARTICLE, locale: "th" } });
    expect(result.id).toBe(`${LESSON_PRACTICE_INPUT_PREFIX}${ARTICLE}`);
    expect(result.id).toBe(`lesson:${ARTICLE}`);
    expect(result.level).toBe("A2");
    expect(result.vocabulary).toHaveLength(10);
    expect(result.sentences).toHaveLength(8);
    expect(result.vocabulary[0]).toMatchObject({ term: "word0", translation: "คำ0" });
    expect(result.sentences[0]).toMatchObject({ text: "Sentence number 0 is here.", words: ["Sentence", "number", "0", "is", "here."], translation: "ประโยค0" });
    expect(practiceInputSchema.safeParse(result).success).toBe(true);
  });

  it("uses the translation of the locale", async () => {
    const rows = { words: [{ vocabulary: "cat", definition: { th: "แมว", cn: "猫" } }], sentence: [] };
    const { db } = dbOf([rows]);
    const result = await getLessonPracticeInput({ db, user: student, tenant, input: { articleId: ARTICLE, locale: "cn" } });
    expect(result.vocabulary[0]?.translation).toBe("猫");
  });

  it("gives an empty input when the article has no snapshot", async () => {
    const { db } = dbOf([]);
    const result = await getLessonPracticeInput({ db, user: student, tenant, input: { articleId: ARTICLE } });
    expect(result.vocabulary).toEqual([]);
    expect(result.sentences).toEqual([]);
  });

  it("refuses a student of another school", async () => {
    const { db } = dbOf([snapshot]);
    await expect(
      getLessonPracticeInput({ db, user: student, tenant: { schoolId: "school-2" }, input: { articleId: ARTICLE } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a user with no school", async () => {
    const { db } = dbOf([snapshot]);
    const user = { ...student, schoolId: null };
    await expect(
      getLessonPracticeInput({ db, user, tenant: { schoolId: null }, input: { articleId: ARTICLE } }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("gives a teacher who manages the class book the same input", async () => {
    mocks.managedClassBook.mockResolvedValue({ id: CLASS_BOOK, bookId: "book-1" });
    const { db } = dbOf([{ articleId: ARTICLE }], [snapshot]);
    const result = await getLessonPracticeInput({
      db,
      user: teacher,
      tenant,
      input: { articleId: ARTICLE, classBookId: CLASS_BOOK, lessonNumber: 3 },
    });
    expect(result.id).toBe(`lesson:${ARTICLE}`);
    expect(result.vocabulary).toHaveLength(10);
    expect(mocks.managedClassBook).toHaveBeenCalledOnce();
  });

  it("refuses a teacher without the class book", async () => {
    const { db } = dbOf([snapshot]);
    await expect(
      getLessonPracticeInput({ db, user: teacher, tenant, input: { articleId: ARTICLE } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.managedClassBook).not.toHaveBeenCalled();
  });

  it("refuses a teacher who does not manage the class book", async () => {
    mocks.failure = new AuthError("You do not teach this class", "FORBIDDEN");
    const { db } = dbOf([{ articleId: ARTICLE }], [snapshot]);
    await expect(
      getLessonPracticeInput({ db, user: teacher, tenant, input: { articleId: ARTICLE, classBookId: CLASS_BOOK, lessonNumber: 3 } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a teacher when the lesson holds another article", async () => {
    mocks.managedClassBook.mockResolvedValue({ id: CLASS_BOOK, bookId: "book-1" });
    const { db } = dbOf([{ articleId: OTHER_ARTICLE }], [snapshot]);
    await expect(
      getLessonPracticeInput({ db, user: teacher, tenant, input: { articleId: ARTICLE, classBookId: CLASS_BOOK, lessonNumber: 3 } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("getLessonPreviewPracticeInput (M-14)", () => {
  beforeEach(() => mocks.managedClassBook.mockReset());

  it("gives staff the lesson words from the article snapshot with no class book proof", async () => {
    const { db, rawDb } = dbOf([snapshot]);
    const result = await getLessonPreviewPracticeInput({ db, user: teacher, tenant, input: { articleId: ARTICLE, locale: "th" } });
    expect(result.id).toBe(`lesson:${ARTICLE}`);
    expect(result.vocabulary[0]).toMatchObject({ term: "word0", translation: "คำ0" });
    expect(rawDb.select).toHaveBeenCalledTimes(1);
    expect(mocks.managedClassBook).not.toHaveBeenCalled();
  });

  it("refuses a student, a user of another school, and a user with no school", async () => {
    const { db } = dbOf([snapshot]);
    await expect(getLessonPreviewPracticeInput({ db, user: student, tenant, input: { articleId: ARTICLE } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getLessonPreviewPracticeInput({ db, user: teacher, tenant: { schoolId: "school-2" }, input: { articleId: ARTICLE } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getLessonPreviewPracticeInput({ db, user: { ...teacher, schoolId: null }, tenant: { schoolId: null }, input: { articleId: ARTICLE } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
