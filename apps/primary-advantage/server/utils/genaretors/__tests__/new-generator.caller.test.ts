// @vitest-environment node
/**
 * FR-3 (review_findings_followup_20260626): caller-level guard for the
 * `generateArticleNew` transaction await.
 *
 * The prior track's new-generator.test.ts exercises the extracted
 * `persistGeneratedArticle` seam directly — so removing the `await` on
 * `db.transaction(...)` in `generateArticleNew` (the literal fire-and-forget bug
 * FR-3 reported) would NOT fail any test. This test drives `generateArticleNew`
 * itself: a transaction that rejects must reject the caller. With the `await`
 * present the rejection is caught by the retry loop and ultimately throws; if the
 * `await` were removed, execution falls through to the "success" return and the
 * function resolves — so this `.rejects` assertion fails exactly on the defect.
 */
import { describe, it, expect, vi } from "vitest";

const promptsJson = JSON.stringify({
  levels: [
    { level: "A1", systemPrompt: "sys", userPromptTemplate: "{genre} {topic}" },
  ],
});
const titleJson = JSON.stringify({
  storyCollection: { stories: [{ genre: "fiction", description: "a topic" }] },
});

vi.mock("fs", () => {
  const readFileSync = (p: string) =>
    String(p).includes("title-a0") ? titleJson : promptsJson;
  return { default: { readFileSync }, readFileSync };
});

const { mockTransaction } = vi.hoisted(() => ({
  mockTransaction: vi.fn().mockRejectedValue(new Error("simulated tx failure")),
}));

vi.mock("@reading-advantage/db", () => ({
  db: { transaction: mockTransaction },
  articles: Symbol("articles"),
  longAnswerQuestions: Symbol("laq"),
  shortAnswerQuestions: Symbol("saq"),
  multipleChoiceQuestions: Symbol("mcq"),
}));

vi.mock("@reading-advantage/ai", () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { passage: "A short passage.", title: "T" },
  }),
}));

// NOTE: relative mock paths resolve from THIS test file's directory
// (server/utils/genaretors/__tests__), so the source's `./x` imports are `../x`.
vi.mock("../evaluate-rating-generator", () => ({
  evaluateRating: vi.fn().mockResolvedValue({ rating: 3, cefrLevel: "A1" }),
}));

vi.mock("@/utils/google", () => ({ google: vi.fn(), googleModel: "g" }));
vi.mock("@/utils/openai", () => ({ openai: vi.fn(), newModel: "n", openaiModel4o: "4o" }));
vi.mock("@/lib/zod", () => ({ articleGeneratorSchema: {} }));
vi.mock("@/types/enum", () => ({
  ArticleBaseCefrLevel: { A1: "A1" },
  ArticleType: { FICTION: "FICTION" },
}));
vi.mock("@/lib/utils", () => ({ convertCefrLevel: (s: string) => s }));
vi.mock("../image-generator", () => ({ generateImage: vi.fn() }));
vi.mock("../audio-generator", () => ({ generateAudio: vi.fn() }));
vi.mock("../audio-word-generator", () => ({ generateAudioForWord: vi.fn() }));
vi.mock("../audio-flashcard-generator", () => ({ generateAudioForFlashcard: vi.fn() }));

import { generateArticleNew } from "../new-generator";

describe("generateArticleNew — FR-3 caller awaits db.transaction", () => {
  it("rejects when the transaction rejects (proves the caller awaits, not fire-and-forget)", async () => {
    await expect(generateArticleNew("A1" as never)).rejects.toThrow(
      /Failed to generate article/,
    );
    // The transaction must have actually been entered (guards against the
    // rating branch being skipped, which would make the assertion vacuous).
    expect(mockTransaction).toHaveBeenCalled();
  }, 15_000);
});
