// @vitest-environment node
/** Flashcard card actions: deck cards, sentence cards, card delete, and the FSRS review write. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  listPrimaryDeckCards: vi.fn(),
  createTenantDB: vi.fn(() => "tenant-db"),
  revalidatePath: vi.fn(),
  selectRows: [] as unknown[][],
  selectError: null as Error | null,
  deletes: 0,
  txInserts: [] as { table: unknown; row: Record<string, unknown> }[],
  txUpdates: [] as Record<string, unknown>[],
}));

const tables = vi.hoisted(() => ({
  flashcardDecks: { id: "decks.id", userId: "decks.userId", type: "decks.type" },
  flashcardCards: { id: "cards.id", deckId: "cards.deckId" },
  cardReviews: { id: "reviews.id", __t: "cardReviews" },
  flashcardProgress: { id: "progress.id", userId: "progress.userId", cardId: "progress.cardId", __t: "flashcardProgress" },
}));

/**
 * Chainable select stub that resolves to the next queued rows.
 * @returns The chain.
 */
function chain() {
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "innerJoin", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    (mocks.selectError ? Promise.reject(mocks.selectError) : Promise.resolve(mocks.selectRows.shift() ?? [])).then(resolve, reject);
  return stub;
}

const tx = {
  insert: (table: unknown) => ({ values: async (row: Record<string, unknown>) => mocks.txInserts.push({ table, row }) }),
  update: () => ({ set: (row: Record<string, unknown>) => ({ where: async () => mocks.txUpdates.push(row) }) }),
};

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@reading-advantage/db", () => ({
  db: {
    select: () => chain(),
    delete: () => ({ where: async () => (mocks.deletes += 1) }),
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  count: vi.fn(),
  gte: vi.fn(),
  sum: vi.fn(),
  inArray: vi.fn(),
  cardState: { enumValues: ["NEW", "LEARNING", "REVIEW", "RELEARNING"] },
  ...tables,
  userActivity: {},
  xpLogs: {},
  articles: {},
  articleActivityLogs: {},
  sentencsAndWordsForFlashcards: {},
}));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: mocks.createTenantDB }));
vi.mock("@reading-advantage/domain/games", () => ({
  listPrimaryArticleCards: vi.fn(),
  listPrimaryArticlePreviewCards: vi.fn(),
  listPrimaryDeckCards: mocks.listPrimaryDeckCards,
}));

import { Rating } from "ts-fsrs";
import { deleteFlashcardCard, getAllSentenceCards, getDeckCards, reviewCard } from "../flashcard";

const STUDENT = { id: "stu-1", role: "STUDENT", schoolId: "school-1" };
const DAY = 24 * 60 * 60 * 1000;
const cardRow = { card: { id: "card-1", deckId: "deck-1", createdAt: new Date("2026-01-01") }, deck: { id: "deck-1", type: "VOCABULARY" } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.selectRows = [];
  mocks.selectError = null;
  mocks.deletes = 0;
  mocks.txInserts = [];
  mocks.txUpdates = [];
  mocks.currentUser.mockResolvedValue(STUDENT);
});

describe("getDeckCards", () => {
  it("answers Unauthorized without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await getDeckCards("deck-1")).toEqual({ success: false, error: "Unauthorized", deck: null, cards: [] });
  });

  it("answers Deck not found when the domain finds no deck", async () => {
    mocks.listPrimaryDeckCards.mockResolvedValue(null);
    expect(await getDeckCards("deck-1")).toEqual({ success: false, error: "Deck not found", deck: null, cards: [] });
  });

  it("reads the deck through the tenant database of the session user", async () => {
    mocks.listPrimaryDeckCards.mockResolvedValue({ deck: { id: "deck-1" }, cards: [{ id: "c1" }] });
    expect(await getDeckCards("deck-1")).toEqual({ success: true, deck: { id: "deck-1" }, cards: [{ id: "c1" }] });
    expect(mocks.listPrimaryDeckCards).toHaveBeenCalledWith({ db: "tenant-db", user: STUDENT, tenant: { schoolId: "school-1" }, input: { deckId: "deck-1" } });
  });
});

describe("getAllSentenceCards", () => {
  it("answers Unauthorized without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await getAllSentenceCards()).toEqual({ success: false, error: "Unauthorized", cards: [] });
  });

  it("returns no cards without a sentence deck", async () => {
    mocks.selectRows = [[]];
    expect(await getAllSentenceCards()).toEqual({ success: true, cards: [] });
  });

  it("returns the cards of the sentence deck", async () => {
    mocks.selectRows = [[{ id: "deck-1" }], [{ id: "c1" }, { id: "c2" }]];
    expect(await getAllSentenceCards()).toEqual({ success: true, cards: [{ id: "c1" }, { id: "c2" }] });
  });

  it("answers an error when the database fails", async () => {
    mocks.selectError = new Error("db");
    expect(await getAllSentenceCards()).toEqual({ success: false, error: "Failed to fetch sentence cards", cards: [] });
  });
});

describe("deleteFlashcardCard", () => {
  it("answers Unauthorized without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await deleteFlashcardCard("card-1")).toEqual({ success: false, error: "Unauthorized" });
  });

  it("refuses staff in Preview mode", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "school-1" });
    expect(await deleteFlashcardCard("card-1")).toEqual({ status: "preview" });
    expect(mocks.deletes).toBe(0);
  });

  it("requires a card id", async () => {
    expect(await deleteFlashcardCard("")).toEqual({ success: false, error: "Card ID is required" });
  });

  it("refuses a card of another user's deck", async () => {
    mocks.selectRows = [[]];
    expect(await deleteFlashcardCard("card-9")).toEqual({ success: false, error: "Card not found or unauthorized" });
    expect(mocks.deletes).toBe(0);
  });

  it("deletes an owned card and revalidates the sentences page", async () => {
    mocks.selectRows = [[{ id: "card-1" }]];
    expect(await deleteFlashcardCard("card-1")).toEqual({ success: true, message: "Card deleted successfully" });
    expect(mocks.deletes).toBe(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/student/sentences");
  });

  it("answers an error when the database fails", async () => {
    mocks.selectError = new Error("db");
    expect(await deleteFlashcardCard("card-1")).toEqual({ success: false, error: "Failed to delete card" });
  });
});

describe("reviewCard", () => {
  it("answers Unauthorized without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await reviewCard("card-1", Rating.Good)).toEqual({ success: false, error: "Unauthorized" });
  });

  it("refuses staff in Preview mode", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a1", role: "ADMIN", schoolId: "school-1" });
    expect(await reviewCard("card-1", Rating.Good)).toEqual({ status: "preview" });
    expect(mocks.txInserts).toHaveLength(0);
  });

  it("refuses a Manual rating", async () => {
    expect(await reviewCard("card-1", Rating.Manual)).toEqual({ success: false, error: "Invalid rating" });
  });

  it("answers Card not found for a card of another user's deck", async () => {
    mocks.selectRows = [[]];
    expect(await reviewCard("card-9", Rating.Good)).toEqual({ success: false, error: "Card not found" });
    expect(mocks.txInserts).toHaveLength(0);
  });

  it("creates the progress row and the review log on a first correct review", async () => {
    mocks.selectRows = [[cardRow], []];
    const res = await reviewCard("card-1", Rating.Good, 12);
    expect(res).toMatchObject({ success: true, cardId: "card-1" });
    const [progress, review] = mocks.txInserts;
    expect(progress.table).toBe(tables.flashcardProgress);
    expect(progress.row).toMatchObject({ userId: "stu-1", cardId: "card-1", correctCount: 1, incorrectCount: 0 });
    expect(review.table).toBe(tables.cardReviews);
    expect(review.row).toMatchObject({ cardId: "card-1", rating: Rating.Good, timeSpent: 12 });
    expect((res as { nextReviewAt: Date }).nextReviewAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("adds one wrong answer to the progress row on Again and logs 30 seconds by default", async () => {
    mocks.selectRows = [[cardRow], [{ id: "p1", correctCount: 2, incorrectCount: 1, nextReviewAt: new Date(), lastReviewedAt: new Date(Date.now() - DAY) }]];
    await reviewCard("card-1", Rating.Again);
    expect(mocks.txUpdates[0]).toMatchObject({ correctCount: 2, incorrectCount: 2 });
    expect(mocks.txInserts[0].row).toMatchObject({ rating: Rating.Again, timeSpent: 30 });
  });

  it("counts Easy as correct and treats null counts as zero", async () => {
    mocks.selectRows = [[cardRow], [{ id: "p1", correctCount: null, incorrectCount: null, nextReviewAt: null, lastReviewedAt: null }]];
    await reviewCard("card-1", Rating.Easy);
    expect(mocks.txUpdates[0]).toMatchObject({ correctCount: 1, incorrectCount: 0 });
  });

  // Defect: reviewCard seeds FSRS with state NEW and empty stability on every review
  // (actions/flashcard.ts:811-823), so a card reviewed Good again never earns a longer interval.
  it.fails("gives a longer interval after a second correct review than after the first", async () => {
    mocks.selectRows = [[cardRow], []];
    const first = (await reviewCard("card-1", Rating.Good)) as { nextReviewAt: Date; lastReviewedAt: Date };
    const firstInterval = first.nextReviewAt.getTime() - first.lastReviewedAt.getTime();

    const lastReviewedAt = new Date(Date.now() - firstInterval);
    mocks.selectRows = [[cardRow], [{ id: "p1", correctCount: 1, incorrectCount: 0, nextReviewAt: new Date(), lastReviewedAt }]];
    const second = (await reviewCard("card-1", Rating.Good)) as { nextReviewAt: Date; lastReviewedAt: Date };
    const secondInterval = second.nextReviewAt.getTime() - second.lastReviewedAt.getTime();

    expect(secondInterval).toBeGreaterThan(firstInterval * 1.5);
  });
});
