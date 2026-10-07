import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TenantDB } from "../db-contract.js";
import {
  listPrimaryAnswerAudioContent,
  listPrimaryArticleCards,
  listPrimaryDeckCards,
  listPrimaryPracticeInput,
} from "../games/primary-saved-items.js";
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

const articleText = {
  id: ARTICLE,
  audioUrl: "audios/cmarticle.mp3",
  sentences: [
    { sentence: "Pip is a puppy.", startTime: 0, endTime: 1.5 },
    { sentence: "The moon is bright.", startTime: 1.5, endTime: 3.2 },
  ],
  translatedPassage: { th: ["ปิปเป็นลูกสุนัข", "พระจันทร์สว่าง"], cn: ["皮普是一只小狗。", "月亮很亮。"] },
};

function dbOf(wordCards: unknown[], sentenceCards: unknown[], snapshots: unknown[] = [snapshot], texts: unknown[] = [articleText]) {
  const rawDb = createMockDb({ selectSequence: [wordCards, sentenceCards, snapshots, texts] });
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

  it("translates a sentence the reader saved from the article text with the same line of the translated passage", async () => {
    const { db } = dbOf([], [card("c8", "The moon is bright.")]);

    const result = await listPrimaryPracticeInput({ db, user, tenant, input: { locale: "th" } });

    expect(result.sentences).toEqual([
      { id: "c8", text: "The moon is bright.", words: ["The", "moon", "is", "bright."], translation: "พระจันทร์สว่าง" },
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

describe("listPrimaryDeckCards", () => {
  beforeEach(() => assertCan.mockClear());
  const DECK = "33333333-3333-4333-8333-333333333333";
  const created = new Date("2026-10-01T00:00:00Z");
  const row = (id: string, front: string, sourceId: string | null = ARTICLE) => ({ id, deckId: DECK, front, sourceId, createdAt: created });

  it("gives each saved word its meaning and word audio, and a word the article lost an empty meaning", async () => {
    const rawDb = createMockDb({ selectSequence: [
      [{ id: DECK, name: "Vocabulary Deck", type: "VOCABULARY", description: null }],
      [row("c1", "river"), row("c2", "dragon")],
      [snapshot],
      [articleText],
    ] });
    const db = { unscoped: vi.fn(() => rawDb) } as unknown as TenantDB;

    const result = await listPrimaryDeckCards({ db, user, tenant, input: { deckId: DECK } });

    expect(assertCan).toHaveBeenCalledWith(user, "progress:read:own", tenant);
    expect(result?.deck).toEqual({ id: DECK, name: "Vocabulary Deck", type: "VOCABULARY", description: null });
    expect(result?.cards).toEqual([
      { id: "c1", deckId: DECK, type: "VOCABULARY", articleId: ARTICLE, createdAt: created, word: "river", definition: { th: "แม่น้ำ", en: "a large stream" }, audioUrl: "audios/words/cmarticle.mp3", startTime: 0.5, endTime: 1.4 },
      { id: "c2", deckId: DECK, type: "VOCABULARY", articleId: ARTICLE, createdAt: created, word: "dragon", definition: {} },
    ]);
  });

  it("returns null for a deck the student does not own", async () => {
    const rawDb = createMockDb({ selectSequence: [[]] });
    const db = { unscoped: vi.fn(() => rawDb) } as unknown as TenantDB;

    expect(await listPrimaryDeckCards({ db, user, tenant, input: { deckId: DECK } })).toBeNull();
    expect(rawDb.select).toHaveBeenCalledTimes(1);
  });
});

describe("listPrimaryArticleCards", () => {
  beforeEach(() => assertCan.mockClear());
  const DECK = "33333333-3333-4333-8333-333333333333";
  const created = new Date("2026-10-01T00:00:00Z");

  it("gives a saved sentence its translations and its segment of the article audio", async () => {
    const rawDb = createMockDb({ selectSequence: [
      [{ id: "c3", deckId: DECK, front: "Pip is a puppy.", sourceId: ARTICLE, createdAt: created }],
      [snapshot],
      [articleText],
    ] });
    const db = { unscoped: vi.fn(() => rawDb) } as unknown as TenantDB;

    const result = await listPrimaryArticleCards({ db, user, tenant, input: { articleId: ARTICLE, type: "SENTENCE" } });

    expect(result).toEqual([{
      id: "c3", deckId: DECK, type: "SENTENCE", articleId: ARTICLE, createdAt: created, sentence: "Pip is a puppy.",
      translation: { th: "ปิปเป็นลูกสุนัข", cn: "皮普是一只小狗。" }, audioUrl: "audios/cmarticle.mp3", startTime: 0, endTime: 1.5,
    }]);
  });
});
