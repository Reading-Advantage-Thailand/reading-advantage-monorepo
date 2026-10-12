import { describe, expect, it, vi } from "vitest";

import type { TenantDB } from "../db-contract.js";
import { getArticleCardState, saveArticleCardsAfterQuiz } from "../games/primary-article-cards.js";

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const student = { id: "student-1", username: "s1", name: "S", role: "STUDENT" as const, schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" };
const teacher = { ...student, id: "teacher-1", role: "TEACHER" as const };
const tenant = { schoolId: "school-1" };

const doneLog = {
  id: "log-1",
  isMultipleChoiceQuestionCompleted: true,
  isShortAnswerQuestionCompleted: true,
  isLongAnswerQuestionCompleted: true,
  isSentenceAndWordsSaved: false,
};
const snapshot = {
  words: ["river", "lantern", "kite", "stone", "bridge", "garden", "Hill"].map((vocabulary) => ({ vocabulary })),
  sentence: [{ sentence: "The river is wide." }, { sentence: "The kite is red." }],
};

/** Collects every bound parameter value of a drizzle SQL object. */
function params(node: unknown, out: unknown[] = []): unknown[] {
  if (node && typeof node === "object") {
    const n = node as { queryChunks?: unknown[]; value?: unknown; constructor?: { name?: string } };
    if (Array.isArray(n.queryChunks)) n.queryChunks.forEach((c) => params(c, out));
    else if (n.constructor?.name === "Param") out.push(n.value);
  }
  return out;
}

/** A fake transaction: each select() returns the next queued rows; writes are recorded. */
function fakeDb(selects: unknown[][]) {
  const queue = [...selects];
  const wheres: unknown[] = [];
  const inserts: { values: unknown }[] = [];
  const updates: unknown[] = [];
  const locks: string[] = [];
  const chain = (rows: unknown[]) => {
    const c: Record<string, unknown> = {};
    for (const m of ["from", "innerJoin", "limit", "orderBy"]) c[m] = () => c;
    c.for = (strength: string) => {
      locks.push(strength);
      return c;
    };
    c.where = (w: unknown) => {
      wheres.push(w);
      return c;
    };
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(rows).then(res, rej);
    return c;
  };
  const tx = {
    select: () => chain(queue.shift() ?? []),
    insert: () => ({
      values: (values: unknown) => {
        inserts.push({ values });
        return Object.assign(Promise.resolve([]), { returning: () => Promise.resolve([{ id: `deck-${inserts.length}` }]) });
      },
    }),
    update: () => ({
      set: (v: unknown) => ({
        where: (w: unknown) => {
          updates.push({ v, w });
          return Promise.resolve([]);
        },
      }),
    }),
    transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
  };
  const db = { unscoped: () => tx } as unknown as TenantDB;
  return { db, wheres, inserts, updates, locks };
}

const run = (f: ReturnType<typeof fakeDb>, user = student, random = () => 0) =>
  saveArticleCardsAfterQuiz({ db: f.db, user, tenant, input: { articleId: ARTICLE }, random });

describe("saveArticleCardsAfterQuiz", () => {
  it("locks the article log row for update before it reads the saved flag", async () => {
    const f = fakeDb([[{ ...doneLog, isSentenceAndWordsSaved: true }]]);
    await run(f);
    expect(f.locks).toEqual(["update"]);
  });

  it("saves nothing before all three quizzes are done", async () => {
    const f = fakeDb([[{ ...doneLog, isLongAnswerQuestionCompleted: false }]]);
    expect(await run(f)).toEqual({ wordsCreated: 0, sentencesCreated: 0, alreadySaved: false });
    expect(f.inserts).toHaveLength(0);
    expect(f.updates).toHaveLength(0);
  });

  it("saves 3 to 5 words with a fixed random function, all sentences, and marks the log", async () => {
    // log, snapshot, decks (none), cards (skipped when no deck)
    const f = fakeDb([[doneLog], [snapshot], []]);
    const result = await run(f, student, () => 0);
    expect(result).toEqual({ wordsCreated: 3, sentencesCreated: 2, alreadySaved: false });
    const cardInserts = f.inserts.filter((i) => Array.isArray(i.values) && (i.values as { front?: string }[])[0]?.front);
    const words = cardInserts[0]!.values as { front: string; sourceId: string; deckId: string }[];
    expect(words).toHaveLength(3);
    expect(words.every((w) => w.sourceId === ARTICLE)).toBe(true);
    expect((cardInserts[1]!.values as { front: string }[]).map((s) => s.front)).toEqual(["The river is wide.", "The kite is red."]);
    expect(f.updates).toHaveLength(1);
    expect((f.updates[0] as { v: unknown }).v).toEqual({ isSentenceAndWordsSaved: true });
  });

  it("takes 5 words when the random function gives a high value", async () => {
    const f = fakeDb([[doneLog], [snapshot], []]);
    const result = await run(f, student, () => 0.99);
    expect(result.wordsCreated).toBe(5);
  });

  it("leaves out words that the vocabulary deck holds, in any case and from any article", async () => {
    const decks = [{ id: "deck-v", type: "VOCABULARY" }, { id: "deck-s", type: "SENTENCE" }];
    const cards = ["RIVER", "lantern", "kite", "stone", "bridge"].map((front) => ({ deckId: "deck-v", front, sourceId: OTHER }));
    const f = fakeDb([[doneLog], [snapshot], decks, cards]);
    const result = await run(f, student, () => 0.99);
    expect(result.wordsCreated).toBe(2); // only "garden" and "Hill" are left
    const first = f.inserts[0]!.values as { front: string }[];
    expect(first.map((w) => w.front).sort()).toEqual(["Hill", "garden"]);
  });

  it("creates nothing when both kinds exist for the article, and still marks the log", async () => {
    const decks = [{ id: "deck-v", type: "VOCABULARY" }, { id: "deck-s", type: "SENTENCE" }];
    const cards = [
      { deckId: "deck-v", front: "river", sourceId: ARTICLE },
      { deckId: "deck-s", front: "The river is wide.", sourceId: ARTICLE },
    ];
    const f = fakeDb([[doneLog], [snapshot], decks, cards]);
    expect(await run(f)).toEqual({ wordsCreated: 0, sentencesCreated: 0, alreadySaved: true });
    expect(f.inserts).toHaveLength(0);
    expect(f.updates).toHaveLength(1);
  });

  it("returns alreadySaved when the log is marked", async () => {
    const f = fakeDb([[{ ...doneLog, isSentenceAndWordsSaved: true }]]);
    expect(await run(f)).toEqual({ wordsCreated: 0, sentencesCreated: 0, alreadySaved: true });
    expect(f.inserts).toHaveLength(0);
  });

  it("refuses a TEACHER", async () => {
    const f = fakeDb([[doneLog]]);
    await expect(run(f, teacher as never)).rejects.toThrow(/students/);
    expect(f.inserts).toHaveLength(0);
  });

  it("filters the log and deck queries by user_id", async () => {
    const decks = [{ id: "deck-v", type: "VOCABULARY" }];
    const f = fakeDb([[doneLog], [snapshot], decks, []]);
    await run(f);
    expect(params(f.wheres[0])).toContain("student-1"); // log
    expect(params(f.wheres[2])).toContain("student-1"); // decks
    expect(params((f.updates[0] as { w: unknown }).w)).toContain("student-1");
  });
});

describe("getArticleCardState", () => {
  it("is saved when the own log is marked", async () => {
    const f = fakeDb([[{ saved: true }]]);
    expect(await getArticleCardState({ db: f.db, user: student, tenant, input: { articleId: ARTICLE } })).toEqual({ saved: true });
    expect(params(f.wheres[0])).toContain("student-1");
  });

  it("is saved when a deck of the student holds a card of the article", async () => {
    const f = fakeDb([[{ saved: false }], [{ id: "card-1" }]]);
    expect(await getArticleCardState({ db: f.db, user: student, tenant, input: { articleId: ARTICLE } })).toEqual({ saved: true });
    expect(params(f.wheres[1])).toContain("student-1");
  });

  it("is not saved with no mark and no card", async () => {
    const f = fakeDb([[], []]);
    expect(await getArticleCardState({ db: f.db, user: student, tenant, input: { articleId: ARTICLE } })).toEqual({ saved: false });
  });
});
