/** @jest-environment node */
/**
 * Regression tests for getArticleForReader field validation.
 *
 * Seeded articles store null in the nullable `type` and `imageDescription`
 * columns. The reader must fall back to "Article" and "" instead of returning
 * a 400, while the remaining required fields must stay guarded.
 */

let mockArticleRow: Record<string, unknown> | undefined;

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  const schema = jest.requireActual("@reading-advantage/db/schema");

  const db = {
    select: jest.fn(() => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () =>
            table === schema.articles && mockArticleRow ? [mockArticleRow] : [],
        }),
      }),
    })),
    insert: jest.fn(() => ({
      values: () => ({ onConflictDoNothing: async () => [] }),
    })),
  };

  return { ...actual, db };
});

import { getArticleForReader } from "@/server/services/article-service";

function baseArticle(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "article-1",
    title: "Test Article",
    content: "Content",
    summary: "A summary",
    passage: "A passage",
    cefrLevel: "A1",
    raLevel: 1,
    subGenre: "Fiction",
    genre: "Story",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    rating: 0,
    type: null,
    imageDescription: null,
    audioUrl: null,
    sentences: {},
    translatedPassage: null,
    translatedSummary: null,
    ...overrides,
  };
}

describe("getArticleForReader nullable fields", () => {
  beforeEach(() => {
    mockArticleRow = baseArticle();
  });

  it("accepts null type and imageDescription with fallbacks", async () => {
    const result = await getArticleForReader("article-1", "user-1", 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.article.type).toBe("Article");
    expect(result.article.image_description).toBe("");
    expect(result.article.title).toBe("Test Article");
  });

  it("keeps the 400 guard for a null title without reporting type or image_description", async () => {
    mockArticleRow = baseArticle({ title: null });

    const result = await getArticleForReader("article-1", "user-1", 1);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.message).toBe("Article fields are not correct");
    expect(result.invalids?.title).toBe(true);
    expect(result.invalids).not.toHaveProperty("type");
    expect(result.invalids).not.toHaveProperty("image_description");
  });
});
