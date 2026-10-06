import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { practiceInputSchema } from "@reading-advantage/game-contracts";

import type { TenantDB } from "../db-contract.js";
import {
  PRACTICE_SENTENCE_LIMIT,
  PRACTICE_WORD_LIMIT,
  listGamePracticeInput,
  practiceLevelOf,
} from "../games/practice-input.js";
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
  cefrLevel: "A1-",
};
const tenant = { schoolId: "school-1" };

const wordRow = (id: string, vocabulary: string, definition: Record<string, string>) => ({
  id,
  word: { vocabulary, definition },
});
const sentenceRow = (id: string, sentence: unknown, translation: unknown) => ({ id, sentence, translation });

/** The where and order clauses of the n-th select, as SQL. */
function clausesOf(rawDb: ReturnType<typeof createMockDb>, n: number) {
  const selectBuilder = rawDb.select.mock.results[n]?.value as { from: ReturnType<typeof vi.fn> };
  const whereBuilder = selectBuilder.from.mock.results[0]?.value as { where: ReturnType<typeof vi.fn> };
  const queryBuilder = whereBuilder.where.mock.results[0]?.value as {
    limit: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
  };
  const dialect = new PgDialect();
  return {
    where: dialect.sqlToQuery(whereBuilder.where.mock.calls[0]?.[0]),
    order: queryBuilder.orderBy.mock.calls[0]?.map((expression) => dialect.sqlToQuery(expression).sql),
    limit: queryBuilder.limit.mock.calls[0]?.[0],
  };
}

describe("listGamePracticeInput", () => {
  beforeEach(() => {
    assertCan.mockClear();
  });

  it("builds the practice input from the student's own cards in FSRS order", async () => {
    const rawDb = createMockDb({
      selectSequence: [
        [
          wordRow("w1", "river", { th: "แม่น้ำ", en: "river" }),
          wordRow("w2", "lantern", { en: "a lamp", th: "โคมไฟ" }),
        ],
        [sentenceRow("s1", "  The moon   is bright. ", { th: "พระจันทร์สว่าง" })],
      ],
    });
    const unscoped = vi.fn(() => rawDb);

    const result = await listGamePracticeInput({
      db: { unscoped } as unknown as TenantDB,
      user,
      tenant,
      input: { locale: "th" },
    });

    expect(result).toEqual({
      schemaVersion: 1,
      id: "saved",
      level: "A1",
      vocabulary: [
        { id: "w1", term: "river", translation: "แม่น้ำ" },
        { id: "w2", term: "lantern", translation: "โคมไฟ" },
      ],
      sentences: [
        {
          id: "s1",
          text: "The moon is bright.",
          words: ["The", "moon", "is", "bright."],
          translation: "พระจันทร์สว่าง",
        },
      ],
    });
    expect(practiceInputSchema.safeParse(result).success).toBe(true);
    expect(assertCan).toHaveBeenCalledWith(user, "games:read:own", tenant);
    for (const [n, table] of [[0, "user_word_records"], [1, "user_sentence_records"]] as const) {
      const clauses = clausesOf(rawDb, n);
      expect(clauses.where.sql).toContain('"user_id" = $1');
      expect(clauses.where.sql).toContain('"save_to_flashcard" = $2');
      expect(clauses.where.params).toEqual([user.id, true]);
      expect(clauses.order).toEqual([`"${table}"."due" asc`, `"${table}"."created_at" desc`]);
      expect(clauses.limit).toBe(50);
    }
  });

  it("skips malformed cards, repeated terms, and translations that repeat the answer", async () => {
    const rawDb = createMockDb({
      selectSequence: [
        [
          wordRow("w1", "river", { th: "แม่น้ำ" }),
          wordRow("w2", "River", { th: "แม่น้ำ" }),
          wordRow("w3", "castle", { en: "castle" }),
          { id: "w4", word: { vocabulary: "", definition: { th: "x" } } },
          { id: "w5", word: "not a record" },
        ],
        [
          sentenceRow("s1", "Go.", { th: "ไป" }),
          sentenceRow("s2", null, { th: "x" }),
          sentenceRow("s3", "The cat sleeps.", { en: "The cat sleeps." }),
          sentenceRow("s4", "the  cat sleeps.", { th: "แมวนอน" }),
        ],
      ],
    });

    const result = await listGamePracticeInput({
      db: { unscoped: () => rawDb } as unknown as TenantDB,
      user,
      tenant,
      input: {},
    });

    expect(result.vocabulary).toEqual([{ id: "w1", term: "river", translation: "แม่น้ำ" }]);
    expect(result.sentences).toEqual([
      { id: "s3", text: "The cat sleeps.", words: ["The", "cat", "sleeps."] },
    ]);
  });

  it("keeps at most the largest round of any game", async () => {
    const words = Array.from({ length: 30 }, (_, i) => wordRow(`w${i}`, `word${i}`, { th: `ค${i}` }));
    const sentences = Array.from({ length: 30 }, (_, i) => sentenceRow(`s${i}`, `Sentence number ${i}.`, { th: `ป${i}` }));
    const rawDb = createMockDb({ selectSequence: [words, sentences] });

    const result = await listGamePracticeInput({
      db: { unscoped: () => rawDb } as unknown as TenantDB,
      user,
      tenant,
      input: { locale: "th" },
    });

    expect(result.vocabulary.map((w) => w.id)).toEqual(words.slice(0, PRACTICE_WORD_LIMIT).map((w) => w.id));
    expect(result.sentences.map((s) => s.id)).toEqual(sentences.slice(0, PRACTICE_SENTENCE_LIMIT).map((s) => s.id));
  });

  it("returns empty lists for a student without saved cards", async () => {
    const rawDb = createMockDb({ selectSequence: [[], []] });
    const result = await listGamePracticeInput({
      db: { unscoped: () => rawDb } as unknown as TenantDB,
      user,
      tenant,
      input: { locale: "th" },
    });
    expect(result).toEqual({ schemaVersion: 1, id: "saved", level: "A1", vocabulary: [], sentences: [] });
  });

  it("rejects an unknown locale before it reads any card", async () => {
    const rawDb = createMockDb();
    await expect(listGamePracticeInput({
      db: { unscoped: () => rawDb } as unknown as TenantDB,
      user,
      tenant,
      input: { locale: "fr" as never },
    })).rejects.toThrow();
    expect(rawDb.select).not.toHaveBeenCalled();
  });
});

describe("practiceLevelOf", () => {
  it.each([
    ["A1-", "A1"],
    ["A1", "A1"],
    ["A1+", "A1+"],
    ["A2-", "A2"],
    ["A2+", "A2"],
    ["CEFR A0+", "A0+"],
    ["Pre-A1", "Pre-A1"],
    ["B2", "B1"],
    ["", "A1"],
    [undefined, "A1"],
  ])("maps %s to %s", (raw, level) => {
    expect(practiceLevelOf(raw)).toBe(level);
  });
});
