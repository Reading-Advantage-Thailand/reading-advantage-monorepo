// @vitest-environment node
/** Chapter flashcard save (STU-04 S6): 3-5 new words + sentences after MC+SA+LA, no dupes, chapter source. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({ logger: { error: mocks.logError, warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, insert: mocks.insert },
  eq: (col: unknown, val: unknown) => ({ eq: [col, val] }),
  and: (...parts: unknown[]) => ({ and: parts }),
  desc: () => ({}),
  count: () => ({}),
  gte: () => ({}),
  sum: () => ({}),
  inArray: (col: unknown, vals: unknown) => ({ inArray: [col, vals] }),
  cardState: { enumValues: [] },
  flashcardDecks: { id: "decks.id", userId: "decks.userId", type: "decks.type" },
  flashcardCards: { id: "cards.id", deckId: "cards.deckId", sourceId: "cards.sourceId", front: "cards.front" },
  cardReviews: { id: "x" },
  userActivity: { id: "ua.id", userId: "ua.userId", activityType: "ua.activityType", targetId: "ua.targetId" },
  xpLogs: { id: "x" },
  articles: { id: "articles.id" },
  articleActivityLogs: { id: "x" },
  sentencsAndWordsForFlashcards: { id: "sw.id", articleId: "sw.articleId", chapterId: "sw.chapterId" },
  flashcardProgress: { id: "x" },
}));
vi.mock("@/lib/fsrs-service", () => ({ fsrsService: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: vi.fn() }));
vi.mock("@reading-advantage/domain/games", () => ({ listPrimaryArticleCards: vi.fn(), listPrimaryDeckCards: vi.fn() }));

import { flashcardCards, flashcardDecks, sentencsAndWordsForFlashcards, userActivity } from "@reading-advantage/db";
import { saveChapterToFlashcard } from "../flashcard";

const CHAPTER = "33333333-3333-4333-8333-333333333333";
const student = { id: "s1", role: "STUDENT", schoolId: "sch" };
const DONE = [
  { activityType: "STORIES_MC_QUESTION" },
  { activityType: "STORIES_SA_QUESTION" },
  { activityType: "STORIES_LA_QUESTION" },
];
const VOCAB_DECK = { id: "deck-v", userId: "s1", type: "VOCABULARY" };
const SENTENCE_DECK = { id: "deck-s", userId: "s1", type: "SENTENCE" };

function word(vocabulary: string, timeSeconds: number) {
  return { vocabulary, definition: { en: `${vocabulary} def`, th: "", cn: "", tw: "", vi: "" }, timeSeconds };
}

const SNAPSHOT = [{
  words: ["apple", "brave", "candle", "dance", "eagle", "flame", "garden", "harbor"].map((w, i) => word(w, i * 2)),
  wordsUrl: "words.mp3",
  sentence: [
    { sentence: "The brave eagle flies.", translation: { th: "ท" }, timeSeconds: 0 },
    { sentence: "The candle lights the garden.", translation: { th: "ท" }, timeSeconds: 5 },
  ],
  audioSentencesUrl: "audio.mp3",
}];

const cardInserts: Array<{ table: unknown; data: Record<string, unknown> }> = [];
let activityRows: unknown[] = DONE;
let snapshotRows: unknown[] = SNAPSHOT;
let vocabCards: Array<{ front: string; sourceId: string }> = [];
let sentenceCards: Array<{ front: string; back: string; sourceId: string }> = [];

/** Routes each select to its table: activity, chapter snapshot, decks by kind, cards by deck. */
function route(state: { table?: unknown; filter?: unknown }): unknown {
  if (state.table === userActivity) return activityRows;
  if (state.table === sentencsAndWordsForFlashcards) return snapshotRows;
  if (state.table === flashcardDecks) {
    return JSON.stringify(state.filter).includes("VOCABULARY") ? [VOCAB_DECK] : [SENTENCE_DECK];
  }
  if (state.table === flashcardCards) {
    return JSON.stringify(state.filter).includes("deck-v") ? vocabCards : sentenceCards;
  }
  return [];
}

beforeEach(() => {
  vi.clearAllMocks();
  activityRows = DONE;
  snapshotRows = SNAPSHOT;
  vocabCards = [];
  sentenceCards = [];
  cardInserts.length = 0;
  mocks.currentUser.mockResolvedValue({ ...student });
  mocks.select.mockImplementation(() => {
    const state: { table?: unknown; filter?: unknown } = {};
    const stub: Record<string, unknown> = {};
    stub.from = (t: unknown) => { state.table = t; return stub; };
    stub.where = (w: unknown) => { state.filter = w; return stub; };
    stub.limit = () => stub;
    stub.orderBy = () => stub;
    stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve(route(state)).then(resolve);
    return stub;
  });
  mocks.insert.mockImplementation((table: unknown) => ({
    values: (data: Record<string, unknown>) => {
      cardInserts.push({ table, data });
      const done = Promise.resolve([]);
      return Object.assign(done, { returning: () => Promise.resolve([{ id: "new-card" }]) });
    },
  }));
});

type SaveResult = { success: boolean; error?: string; data?: { wordsCreated: number; sentencesCreated: number; alreadyExists: boolean } };

describe("saveChapterToFlashcard", () => {
  it("saves 3 to 5 new words and every sentence with the chapter id as source", async () => {
    const res = (await saveChapterToFlashcard(CHAPTER)) as SaveResult;
    expect(res.success).toBe(true);
    expect(res.data?.wordsCreated).toBeGreaterThanOrEqual(3);
    expect(res.data?.wordsCreated).toBeLessThanOrEqual(5);
    expect(res.data?.sentencesCreated).toBe(2);
    expect(cardInserts.length).toBe((res.data?.wordsCreated ?? 0) + 2);
    expect(cardInserts.length).toBeGreaterThan(0);
    for (const row of cardInserts) {
      expect(row.table).toBe(flashcardCards);
      expect(row.data.sourceId).toBe(CHAPTER);
    }
  });

  it("logs a failed save through the logger, not the console", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.select.mockImplementation(() => {
      throw new Error("db down");
    });
    const res = (await saveChapterToFlashcard(CHAPTER)) as SaveResult;
    expect(res.success).toBe(false);
    expect(mocks.logError).toHaveBeenCalledWith("chapter_flashcard_save_failed", expect.objectContaining({ chapterId: CHAPTER }));
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("saves no second card for a word already in the deck", async () => {
    vocabCards = [{ front: "apple", sourceId: CHAPTER }, { front: "BRAVE", sourceId: CHAPTER }];
    const res = (await saveChapterToFlashcard(CHAPTER)) as SaveResult;
    expect(res.success).toBe(true);
    const fronts = cardInserts.map((row) => String(row.data.front).toLowerCase());
    expect(fronts).not.toContain("apple");
    expect(fronts).not.toContain("brave");
  });

  it("writes nothing new on a rerun when every word and sentence is saved", async () => {
    vocabCards = SNAPSHOT[0].words.map((w) => ({ front: w.vocabulary, sourceId: CHAPTER }));
    sentenceCards = SNAPSHOT[0].sentence.map((s) => ({ front: s.sentence, back: s.sentence, sourceId: CHAPTER }));
    const res = (await saveChapterToFlashcard(CHAPTER)) as SaveResult;
    expect(res).toMatchObject({ success: true, data: { wordsCreated: 0, sentencesCreated: 0, alreadyExists: true } });
    expect(cardInserts.length).toBe(0);
  });

  it("saves nothing before the MCQ, SAQ, and LAQ are all done", async () => {
    activityRows = [{ activityType: "STORIES_MC_QUESTION" }, { activityType: "STORIES_SA_QUESTION" }];
    const res = (await saveChapterToFlashcard(CHAPTER)) as SaveResult;
    expect(res.success).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("saves nothing in staff preview", async () => {
    mocks.currentUser.mockResolvedValue({ ...student, role: "TEACHER" });
    const res = await saveChapterToFlashcard(CHAPTER);
    expect(res).toEqual({ status: "preview" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
