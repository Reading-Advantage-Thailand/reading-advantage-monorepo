// @vitest-environment node
/**
 * Behavioral replacement for the audio-highlight static case "shares audio
 * field names between flashcard actions and games". Invoking
 * getLessonOrderingSentences against a mocked DB must return sentences with
 * the shared camelCase audio fields (audioUrl/startTime/endTime/translation)
 * and no raw snake_case fields.
 */
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));

vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  asc: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
  gte: vi.fn(() => ({})),
  sum: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  cardState: { enumValues: [] },
  flashcardDecks: { id: "flashcardDecks.id" },
  flashcardCards: { id: "flashcardCards.id" },
  cardReviews: { id: "cardReviews.id" },
  userActivity: { id: "userActivity.id" },
  xpLogs: { id: "xpLogs.id" },
  articles: { id: "articles.id" },
  articleActivityLogs: { id: "articleActivityLogs.id" },
  sentencsAndWordsForFlashcards: {
    id: "sentencsAndWordsForFlashcards.id",
  },
  flashcardProgress: { id: "flashcardProgress.id" },
}));

vi.mock("@/lib/fsrs-service", () => ({
  fsrsService: {},
}));

import { getLessonOrderingSentences } from "../flashcard";

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with from/where/limit support.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit"]) {
    stub[method] = () => stub;
  }
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) =>
    Promise.resolve(value).then(resolve);
  return stub;
}

describe("getLessonOrderingSentences audio field shape", () => {
  it("returns mapped camelCase audio fields with no raw snake_case keys", async () => {
    mocks.currentUser.mockResolvedValue({ id: "user-1" });
    const articleSentences = Array.from({ length: 5 }, (_, index) => ({
      sentence: `Sentence ${index + 1}.`,
      startTime: index * 2,
      endTime: index * 2 + 2,
    }));
    mocks.select
      .mockReturnValueOnce(chain([{ id: "deck-1" }]))
      .mockReturnValueOnce(
        chain([{ sourceId: "article-1", front: "Sentence 3." }]),
      )
      .mockReturnValueOnce(
        chain([
          {
            id: "article-1",
            title: "Ordering Article",
            sentences: articleSentences,
            audio_url: "/audio/article-1.mp3",
            translatedPassage: {
              th: ["t1", "t2", "t3", "t4", "t5"],
              cn: [],
              tw: [],
              vi: [],
            },
            cefrLevel: "A1",
          },
        ]),
      )
      .mockReturnValueOnce(chain([]));

    const result = await getLessonOrderingSentences("article-1");

    expect("sentenceGroups" in result && result.totalGroups).toBe(1);
    if (!("sentenceGroups" in result)) {
      throw new Error("Expected sentence groups in the action result.");
    }
    const sentences = result.sentenceGroups[0].sentences;
    expect(sentences).toHaveLength(5);
    for (const sentence of sentences) {
      expect(sentence.audioUrl).toContain("/audio/article-1.mp3");
      expect(typeof sentence.startTime).toBe("number");
      expect(typeof sentence.endTime).toBe("number");
      expect(sentence.translation).toBeDefined();
      expect(sentence).not.toHaveProperty("audio_url");
      expect(sentence).not.toHaveProperty("start_time");
      expect(sentence).not.toHaveProperty("end_time");
      expect(sentence).not.toHaveProperty("translationMap");
    }
    expect(sentences[0].translation).toEqual(
      expect.objectContaining({ th: "t1" }),
    );
  });
});
