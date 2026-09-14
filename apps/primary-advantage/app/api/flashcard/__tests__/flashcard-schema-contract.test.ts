// @vitest-environment node
/**
 * Flashcard schema contract: the action layer must only persist columns
 * that exist in the shared Drizzle schema.
 *
 * The first case pins the live shared-schema columns. The second case is
 * behavioral: it calls `saveFlashcard` against a mocked db handle and
 * asserts every persisted row validates against the live schema (no
 * unmapped FSRS/content fields).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashcardCards } from "@reading-advantage/db";
import { getTableColumns } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  insertedCards: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/session", () => ({
  currentUser: (...args: unknown[]) => mocks.currentUser(...args),
}));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@reading-advantage/db")>();
  const rows: Record<string, unknown>[] & { limit?: () => unknown } = [];
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({
          // Awaitable rows that also satisfy the `.limit(1)` deck lookup.
          where: () => {
            const result = [] as unknown as {
              limit: (n: number) => unknown[];
            } & unknown[];
            (result as { limit: (n: number) => unknown[] }).limit = () => [];
            return result;
          },
        }),
      }),
      insert: (table: unknown) => ({
        values: (values: unknown) => {
          if (table === actual.flashcardCards) {
            mocks.insertedCards.push(
              ...((Array.isArray(values) ? values : [values]) as Record<
                string,
                unknown
              >[]),
            );
          }
          return {
            returning: async () =>
              table === actual.flashcardDecks
                ? [{ id: "deck-1", type: "VOCABULARY" }]
                : [],
          };
        },
      }),
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveFlashcard } from "../../../../actions/flashcard";

const EXPECTED_SHARED_COLUMNS = [
  "id",
  "deckId",
  "front",
  "back",
  "sourceId",
  "order",
  "createdAt",
];

/** Fields the legacy implementation smuggled in via `as any` casts. */
const UNMAPPED_FIELDS = [
  "due",
  "stability",
  "difficulty",
  "elapsedDays",
  "scheduledDays",
  "learningSteps",
  "reps",
  "lapses",
  "state",
  "lastReview",
  "articleId",
  "audioUrl",
  "startTime",
  "endTime",
  "word",
  "definition",
  "sentence",
  "translation",
];

describe("flashcard schema contract", () => {
  const sharedColumns = Object.keys(getTableColumns(flashcardCards));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertedCards.length = 0;
    mocks.currentUser.mockResolvedValue({ id: "user-1" });
  });

  it("shared flashcardCards schema exposes only the expected columns", () => {
    expect(sharedColumns.sort()).toEqual(EXPECTED_SHARED_COLUMNS.sort());
  });

  it("persists only columns present in the shared schema", async () => {
    const result = await saveFlashcard(
      "article-1",
      [{ vocabulary: "cat" }, { vocabulary: "dog" }] as never,
      undefined,
    );

    expect(result.status).toBe(200);
    expect(mocks.insertedCards).toHaveLength(2);
    for (const row of mocks.insertedCards) {
      for (const key of Object.keys(row)) {
        expect(
          sharedColumns,
          `persisted column "${key}" is absent from shared flashcardCards schema`,
        ).toContain(key);
      }
      expect(row).toMatchObject({
        deckId: "deck-1",
        sourceId: "article-1",
      });
      for (const field of UNMAPPED_FIELDS) {
        expect(row, `unmapped field "${field}" must not be persisted`).not.toHaveProperty(
          field,
        );
      }
    }
  });
});
