import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TenantDB } from "../db-contract.js";
import { listPrimaryAnswerAudioContent, listPrimaryPracticeInput } from "../games/primary-saved-items.js";
import { createMockDb } from "./mock-db.js";

const assertCan = vi.hoisted(() => vi.fn());

vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  assertCan,
}));

const user = { id: "student-1", username: "student1", name: "Student", role: "STUDENT" as const, schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1" };
const tenant = { schoolId: "school-1" };
const ARTICLE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const card = (id: string, front: string, sourceId: string | null = ARTICLE) => ({ id, front, sourceId });
const snapshot = {
  articleId: ARTICLE,
  wordsUrl: "audios/words/cmarticle.mp3",
  words: [
    { vocabulary: "river", definition: { th: "แม่น้ำ", en: "a large stream" }, timeSeconds: 0.5 },
    { vocabulary: "lantern", definition: { th: "โคมไฟ", en: "a lamp" }, timeSeconds: 1.4 },
    { vocabulary: "kite", definition: { en: "a toy that flies" }, timeSeconds: 2.2 },
  ],
  sentence: [{ sentence: "The river is wide.", translation: { th: "แม่น้ำกว้าง" }, timeSeconds: 0 }],
};

function dbOf(wordCards: unknown[], sentenceCards: unknown[], snapshots: unknown[] = [snapshot]) {
  const rawDb = createMockDb({ selectSequence: [wordCards, sentenceCards, snapshots] });
  return { rawDb, db: { unscoped: vi.fn(() => rawDb) } as unknown as TenantDB };
}

describe("listPrimaryPracticeInput", () => {
  beforeEach(() => assertCan.mockClear());

  it("builds the practice input from the student's saved cards, with the meanings from each card's article", async () => {
    const { db } = dbOf(
      [card("c1", "river"), card("c2", "Lantern "), card("c3", "dragon"), card("c4", "river", OTHER), card("c5", "kite", null)],
      [card("c6", "The river is wide."), card("c7", "The moon is bright.", OTHER)],
    );

    const result = await listPrimaryPracticeInput({ db, user, tenant, input: { locale: "th" } });

    expect(assertCan).toHaveBeenCalledWith(user, "games:read:own", tenant);
    expect(result.vocabulary).toEqual([
      { id: "c1", term: "river", translation: "แม่น้ำ" },
      { id: "c2", term: "lantern", translation: "โคมไฟ" },
    ]);
    expect(result.sentences).toEqual([
      { id: "c6", text: "The river is wide.", words: ["The", "river", "is", "wide."], translation: "แม่น้ำกว้าง" },
      { id: "c7", text: "The moon is bright.", words: ["The", "moon", "is", "bright."] },
    ]);
  });

  it("reads no article rows when no card names an article", async () => {
    const { db, rawDb } = dbOf([card("c1", "river", null)], []);

    const result = await listPrimaryPracticeInput({ db, user, tenant, input: { locale: "th" } });

    expect(result.vocabulary).toEqual([]);
    expect(rawDb.select).toHaveBeenCalledTimes(2);
  });
});

describe("listPrimaryAnswerAudioContent", () => {
  beforeEach(() => assertCan.mockClear());

  it("gives each saved word with a Thai meaning its segment of the article's word audio", async () => {
    const { db } = dbOf([card("c1", "river"), card("c2", "lantern"), card("c3", "kite"), card("c4", "River")], []);

    const result = await listPrimaryAnswerAudioContent({ db, user, tenant, audioUrlOf: (key) => `https://storage.example/${key}` });

    expect(result?.content).toEqual([{ term: "river", translation: "แม่น้ำ" }, { term: "lantern", translation: "โคมไฟ" }]);
    expect(result?.selectedTargetLocales).toEqual(["th", "th"]);
    expect(result?.preparedAnswerAudio.clips).toEqual([
      { itemPosition: 0, url: "https://storage.example/audios/words/cmarticle.mp3", mediaType: "audio/mpeg", sourceLocale: "en-US", startSeconds: 0.5, endSeconds: 1.4 },
      { itemPosition: 1, url: "https://storage.example/audios/words/cmarticle.mp3", mediaType: "audio/mpeg", sourceLocale: "en-US", startSeconds: 1.4, endSeconds: 2.2 },
    ]);
  });

  it("plays the last word of an article for ten seconds", async () => {
    const last = { ...snapshot, words: [{ vocabulary: "river", definition: { th: "แม่น้ำ" }, timeSeconds: 3 }] };
    const { db } = dbOf([card("c1", "river")], [], [last]);

    const result = await listPrimaryAnswerAudioContent({ db, user, tenant, audioUrlOf: (key) => `https://storage.example/${key}` });

    expect(result?.preparedAnswerAudio.clips[0]).toMatchObject({ startSeconds: 3, endSeconds: 13 });
  });

  it("returns nothing when no saved word has a Thai meaning and word audio", async () => {
    const noAudio = { ...snapshot, wordsUrl: null };
    const { db } = dbOf([card("c1", "river"), card("c3", "kite")], [], [noAudio]);

    expect(await listPrimaryAnswerAudioContent({ db, user, tenant, audioUrlOf: (key) => key })).toBeUndefined();
  });
});
