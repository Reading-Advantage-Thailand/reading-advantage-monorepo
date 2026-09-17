/**
 * Flashcard word payload projection tests (track reading_qa_vocab_flashcards_20260918)
 *
 * Regression guard for the vocabulary flashcard defect: legacy rows seeded with
 * a `{ word, translation }` payload rendered "No word" / "No translation"
 * because the game reads `word.vocabulary` and `word.definition`
 * (components/flashcards/flashcard-game.tsx:539,586). `getDeckCards` must
 * normalize the legacy payload and must leave sentence cards untouched.
 *
 * Evidence refs: /tmp/opencode/qa-reports/student-flows.md test C1b.
 *
 * @jest-environment node
 */

var rowsToReturn: any[];

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  const selectMock = jest.fn();
  const fromMock = jest.fn();
  const whereMock = jest.fn();
  const orderByMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.orderBy = orderByMock.mockImplementation(() => mockDb);
  // Make the chain awaitable so `db.select()...orderBy()` resolves to the
  // rows configured by the current test.
  mockDb.then = (resolve: any) => resolve(rowsToReturn);

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { getCurrentUser } from "@/lib/session";
import { getDeckCards } from "@/actions/flashcard";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

const PAST_DUE = new Date("2026-09-01T00:00:00.000Z");

// Shape written by scripts/seed/demo-seed.ts:428-463 — the defect source.
const legacyWordRow = {
  id: "11111111-1111-1111-1111-111111111111",
  userId: "user-1",
  articleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  storyId: null,
  chapterNumber: null,
  word: { word: "success", translation: "ความสำเร็จ" },
  saveToFlashcard: true,
  difficulty: 0,
  due: PAST_DUE,
  elapsedDays: 0,
  lapses: 0,
  reps: 0,
  scheduledDays: 0,
  stability: 0,
  state: 0,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

// Canonical shape the game reads (components/vocabulary/types.ts:15-29).
const canonicalWordRow = {
  ...legacyWordRow,
  id: "22222222-2222-2222-2222-222222222222",
  word: { vocabulary: "bridge", definition: { en: "bridge", th: "สะพาน" } },
};

const sentenceRow = {
  id: "33333333-3333-3333-3333-333333333333",
  userId: "user-1",
  articleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  storyId: null,
  chapterNumber: null,
  sentence: "She walked across the old bridge.",
  translation: { th: "เธอเดินข้ามสะพานเก่า" },
  sn: 1,
  timepoint: 0,
  endTimepoint: 1.5,
  audioUrl: null,
  saveToFlashcard: true,
  difficulty: 0,
  due: PAST_DUE,
  elapsedDays: 0,
  lapses: 0,
  reps: 0,
  scheduledDays: 0,
  stability: 0,
  state: 0,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

describe("getDeckCards vocabulary word payload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rowsToReturn = [];
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1" } as any);
  });

  it("carries word text and translation on legacy `{ word, translation }` rows", async () => {
    rowsToReturn = [legacyWordRow, { ...legacyWordRow, id: "44444444-4444-4444-4444-444444444444" }];

    const result = await getDeckCards("vocabulary");

    expect(result.success).toBe(true);
    expect(result.cards).toHaveLength(2);
    for (const card of result.cards) {
      expect(typeof card.word?.vocabulary).toBe("string");
      expect(card.word.vocabulary.length).toBeGreaterThan(0);
      expect(card.word.vocabulary).toBe("success");
      const definition = card.word.definition;
      expect(definition).toBeDefined();
      const values = Object.values(definition ?? {});
      expect(values.length).toBeGreaterThan(0);
      expect(values[0]).toBe("ความสำเร็จ");
    }
  });

  it("passes canonical `{ vocabulary, definition }` payloads through unchanged", async () => {
    rowsToReturn = [canonicalWordRow];

    const result = await getDeckCards("vocabulary");

    expect(result.success).toBe(true);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].word.vocabulary).toBe("bridge");
    expect(result.cards[0].word.definition).toEqual({ en: "bridge", th: "สะพาน" });
  });

  it("leaves sentence cards untouched", async () => {
    rowsToReturn = [sentenceRow];

    const result = await getDeckCards("sentences");

    expect(result.success).toBe(true);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].sentence).toBe("She walked across the old bridge.");
    expect(result.cards[0].translation).toEqual({ th: "เธอเดินข้ามสะพานเก่า" });
    expect(result.cards[0].word).toBeUndefined();
  });
});
