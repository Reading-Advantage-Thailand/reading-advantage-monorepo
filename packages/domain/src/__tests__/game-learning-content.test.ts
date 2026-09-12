import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

import type { TenantDB } from "../db-contract.js";
import {
  gameLearningContentInputSchema,
  gameLearningContentResultSchema,
  listGameLearningContent,
} from "../games/learning-content.js";
import { createMockDb } from "./mock-db.js";

const assertCan = vi.hoisted(() => vi.fn());

vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  assertCan,
}));

const user = {
  id: "student-1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};
const tenant = { schoolId: "school-1" };
const answerAudioSession = {
  modality: "read-to-select-audio",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  scored: true,
} as const;

describe("listGameLearningContent", () => {
  beforeEach(() => {
    assertCan.mockClear();
  });

  it("returns authenticated vocabulary with the requested translation fallback", async () => {
    const rawDb = createMockDb({
      selectResults: [
        {
          word: {
            vocabulary: "river",
            definition: { en: "river", th: "แม่น้ำ" },
          },
        },
        {
          word: {
            vocabulary: "mountain",
            definition: { en: "mountain" },
          },
        },
        { word: { vocabulary: "", definition: { th: "invalid" } } },
      ],
    });
    const unscoped = vi.fn(() => rawDb);

    const result = await listGameLearningContent({
      db: { unscoped } as unknown as TenantDB,
      user,
      tenant,
      input: { mode: "vocabulary", locale: "th", limit: 20 },
    });

    expect(result).toEqual({
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th", "en"],
      content: [
        { term: "river", translation: "แม่น้ำ" },
        { term: "mountain", translation: "mountain" },
      ],
    });
    expect(assertCan).toHaveBeenCalledWith(user, "games:read:own", tenant);
    expect(unscoped).toHaveBeenCalledWith(expect.stringContaining("userWordRecords"));
    const selectBuilder = rawDb.select.mock.results[0]?.value as {
      from: ReturnType<typeof vi.fn>;
    };
    const whereBuilder = selectBuilder.from.mock.results[0]?.value as {
      where: ReturnType<typeof vi.fn>;
    };
    const condition = whereBuilder.where.mock.calls[0]?.[0];
    const query = new PgDialect().sqlToQuery(condition);
    expect(query.sql).toContain('"user_id" = $1');
    expect(query.sql).toContain('"save_to_flashcard" = $2');
    expect(query.params).toEqual(expect.arrayContaining([user.id, true]));
    const queryBuilder = whereBuilder.where.mock.results[0]?.value as {
      limit: ReturnType<typeof vi.fn>;
      orderBy: ReturnType<typeof vi.fn>;
    };
    expect(queryBuilder.limit).toHaveBeenCalledWith(20);
    expect(queryBuilder.orderBy).toHaveBeenCalledTimes(1);
    expect(
      queryBuilder.orderBy.mock.calls[0]?.map((expression) =>
        new PgDialect().sqlToQuery(expression).sql),
    ).toEqual([
      '"user_word_records"."due" asc',
      '"user_word_records"."created_at" desc',
    ]);
  });

  it("returns authenticated sentence content and ignores malformed translations", async () => {
    const rawDb = createMockDb({
      selectResults: [
        {
          sentence: "The moon is bright.",
          translation: { th: "พระจันทร์สว่าง", en: "The moon is bright." },
        },
        { sentence: null, translation: { th: "invalid" } },
        { sentence: "Invalid", translation: ["not", "a", "record"] },
      ],
    });

    const result = await listGameLearningContent({
      db: { unscoped: () => rawDb } as unknown as TenantDB,
      user,
      tenant,
      input: { mode: "sentence", locale: "th" },
    });

    expect(result).toEqual({
      mode: "sentence",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th"],
      content: [
        { term: "The moon is bright.", translation: "พระจันทร์สว่าง" },
      ],
    });
    const selectBuilder = rawDb.select.mock.results[0]?.value as {
      from: ReturnType<typeof vi.fn>;
    };
    const whereBuilder = selectBuilder.from.mock.results[0]?.value as {
      where: ReturnType<typeof vi.fn>;
    };
    const condition = whereBuilder.where.mock.calls[0]?.[0];
    const query = new PgDialect().sqlToQuery(condition);
    expect(query.sql).toContain('"user_id" = $1');
    expect(query.sql).toContain('"save_to_flashcard" = $2');
    expect(query.params).toEqual(expect.arrayContaining([user.id, true]));
    const queryBuilder = whereBuilder.where.mock.results[0]?.value as {
      limit: ReturnType<typeof vi.fn>;
      orderBy: ReturnType<typeof vi.fn>;
    };
    expect(queryBuilder.limit).toHaveBeenCalledWith(50);
    expect(
      queryBuilder.orderBy.mock.calls[0]?.map((expression) =>
        new PgDialect().sqlToQuery(expression).sql),
    ).toEqual([
      '"user_sentence_records"."due" asc',
      '"user_sentence_records"."created_at" desc',
    ]);
  });

  it("returns exact Thai targets for an English answer-audio session", async () => {
    const rawDb = createMockDb({
      selectResults: [{
        word: {
          vocabulary: "river",
          definition: { en: "river", th: "แม่น้ำ" },
        },
      }],
    });

    await expect(listGameLearningContent({
      db: { unscoped: () => rawDb } as unknown as TenantDB,
      user,
      tenant,
      input: {
        mode: "vocabulary",
        locale: "th",
        answerAudioSession,
      },
    })).resolves.toEqual({
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
      answerAudioSession,
    });
  });

  it("rejects target fallback for an answer-audio session", async () => {
    const rawDb = createMockDb({
      selectResults: [{
        word: {
          vocabulary: "river",
          definition: { en: "river" },
        },
      }],
    });

    await expect(listGameLearningContent({
      db: { unscoped: () => rawDb } as unknown as TenantDB,
      user,
      tenant,
      input: {
        mode: "vocabulary",
        locale: "th",
        answerAudioSession,
      },
    })).rejects.toThrow(/exact Thai target content/i);
  });

  it("rejects answer audio outside Thai vocabulary and with legacy listening", () => {
    expect(gameLearningContentInputSchema.safeParse({
      mode: "sentence",
      locale: "th",
      answerAudioSession,
    }).success).toBe(false);
    expect(gameLearningContentInputSchema.safeParse({
      mode: "vocabulary",
      locale: "en",
      answerAudioSession,
    }).success).toBe(false);
    expect(gameLearningContentInputSchema.safeParse({
      mode: "vocabulary",
      locale: "th",
      answerAudioSession,
      listeningSession: {
        modality: "listen-to-select",
        sourceLocale: "en-US",
        targetLocale: "th",
        scored: true,
        targetLocaleFallback: "reject",
      },
    }).success).toBe(false);
  });

  it("stops before database access when the student lacks content permission", async () => {
    const unscoped = vi.fn();
    assertCan.mockImplementationOnce(() => {
      throw new Error("permission denied");
    });

    await expect(
      listGameLearningContent({
        db: { unscoped } as unknown as TenantDB,
        user,
        tenant,
        input: { mode: "vocabulary", locale: "th" },
      }),
    ).rejects.toThrow("permission denied");

    expect(unscoped).not.toHaveBeenCalled();
  });

  it("rejects a scored listening session with a target-locale fallback", async () => {
    const rawDb = createMockDb({
      selectResults: [
        {
          word: {
            vocabulary: "mountain",
            definition: { en: "mountain" },
          },
        },
      ],
    });

    await expect(
      listGameLearningContent({
        db: { unscoped: () => rawDb } as unknown as TenantDB,
        user,
        tenant,
        input: {
          mode: "vocabulary",
          locale: "th",
          listeningSession: {
            modality: "listen-to-select",
            sourceLocale: "en-US",
            targetLocale: "th",
            scored: true,
            targetLocaleFallback: "reject",
          },
        },
      }),
    ).rejects.toThrow(/target locale/i);
  });

  it("returns explicit fallback locales for unscored listening", async () => {
    const rawDb = createMockDb({
      selectResults: [
        {
          word: {
            vocabulary: "mountain",
            definition: { en: "mountain" },
          },
        },
      ],
    });

    await expect(
      listGameLearningContent({
        db: { unscoped: () => rawDb } as unknown as TenantDB,
        user,
        tenant,
        input: {
          mode: "vocabulary",
          locale: "th",
          listeningSession: {
            modality: "listen-to-select",
            sourceLocale: "en-US",
            targetLocale: "th",
            scored: false,
            targetLocaleFallback: "allow-explicit",
          },
        },
      }),
    ).resolves.toMatchObject({
      requestedTargetLocale: "th",
      selectedTargetLocales: ["en"],
    });
  });

  it("enforces explicit fallback rejection during unscored listening", async () => {
    const rawDb = createMockDb({
      selectResults: [
        {
          word: {
            vocabulary: "mountain",
            definition: { en: "mountain" },
          },
        },
      ],
    });

    await expect(
      listGameLearningContent({
        db: { unscoped: () => rawDb } as unknown as TenantDB,
        user,
        tenant,
        input: {
          mode: "vocabulary",
          locale: "th",
          listeningSession: {
            modality: "listen-to-select",
            sourceLocale: "en-US",
            targetLocale: "th",
            scored: false,
            targetLocaleFallback: "reject",
          },
        },
      }),
    ).rejects.toThrow(/target locale/i);
  });

  it("rejects unknown fields and invalid limits before database access", () => {
    expect(
      gameLearningContentInputSchema.safeParse({
        mode: "vocabulary",
        locale: "th",
        limit: 0,
      }).success,
    ).toBe(false);
    expect(
      gameLearningContentInputSchema.safeParse({
        mode: "sentence",
        locale: "xx",
        extra: true,
      }).success,
    ).toBe(false);
  });

  it("rejects locale arrays that do not align with strict content items", () => {
    expect(
      gameLearningContentResultSchema.safeParse({
        mode: "vocabulary",
        source: "student-flashcards",
        requestedTargetLocale: "th",
        selectedTargetLocales: [],
        content: [{ term: "river", translation: "แม่น้ำ" }],
      }).success,
    ).toBe(false);
  });
});
