// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, update: mocks.update },
  eq: vi.fn((col: unknown, val: unknown) => ({ eq: [col, val] })),
  and: vi.fn((...parts: unknown[]) => ({ and: parts })),
  desc: vi.fn(() => ({})),
  asc: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
  gte: vi.fn(() => ({})),
  sum: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  cardState: { enumValues: [] },
  flashcardDecks: { id: "decks.id", userId: "decks.userId", updatedAt: "decks.updatedAt" },
  flashcardCards: { id: "cards.id", deckId: "cards.deckId" },
  cardReviews: { id: "x" },
  userActivity: { id: "x" },
  xpLogs: { id: "x" },
  articles: { id: "articles.id" },
  articleActivityLogs: { id: "logs.id", userId: "logs.userId" },
  sentencsAndWordsForFlashcards: { id: "x", articleId: "sw.articleId" },
  flashcardProgress: { id: "x" },
}));
vi.mock("@/lib/fsrs-service", () => ({ fsrsService: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: vi.fn() }));
vi.mock("@reading-advantage/domain/games", () => ({ listPrimaryArticleCards: vi.fn(), listPrimaryDeckCards: vi.fn() }));

import { getUserFlashcardDecks, saveArticleToFlashcard } from "../flashcard";

/** Chainable select stub that resolves to rows. */
function chain<T>(value: T) {
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve);
  return stub;
}

describe("flashcard action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.where.mockResolvedValue([]);
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });
  });

  it("getUserFlashcardDecks reads the decks of the session user only", async () => {
    mocks.currentUser.mockResolvedValue({ id: "me", role: "STUDENT" });
    const whereArgs: unknown[] = [];
    mocks.select.mockImplementation(() => {
      const s = chain([]) as Record<string, unknown>;
      s.where = (w: unknown) => {
        whereArgs.push(w);
        return s;
      };
      return s;
    });
    await (getUserFlashcardDecks as unknown as (id: string) => Promise<unknown>)("victim");
    expect(JSON.stringify(whereArgs)).toContain("me");
    expect(JSON.stringify(whereArgs)).not.toContain("victim");
  });

  it("getUserFlashcardDecks returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const res = await (getUserFlashcardDecks as unknown as (id: string) => Promise<{ status: number }>)("victim");
    expect(res.status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("saveArticleToFlashcard filters the activity log update by the user id", async () => {
    mocks.currentUser.mockResolvedValue({ id: "me", role: "STUDENT" });
    mocks.select
      .mockReturnValueOnce(chain([{ id: "a1" }]))
      .mockReturnValueOnce(chain([]));
    await saveArticleToFlashcard("a1", "log-1");
    const where = mocks.where.mock.calls[0]?.[0] as { and?: Array<{ eq: unknown[] }> };
    expect(JSON.stringify(where)).toContain("logs.userId");
    expect(JSON.stringify(where)).toContain("me");
  });
});
