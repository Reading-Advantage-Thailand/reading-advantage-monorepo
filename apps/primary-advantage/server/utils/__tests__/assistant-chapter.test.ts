// @vitest-environment node
/** Chapter feedback source (STU-04 S5): SAQ and LAQ feedback read the chapter passage. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  info: vi.fn(),
  chapterRows: [{ passage: "A fox finds a lantern.", cefrLevel: "A2" }] as unknown[],
  articleRows: [] as unknown[],
}));

vi.mock("@reading-advantage/db", () => ({
  articles: { id: "id", passage: "passage", cefrLevel: "cefrLevel" },
  chapters: { id: "cid", passage: "cpassage", cefrLevel: "ccefrLevel" },
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () =>
            (table as { id?: string }).id === "cid" ? mocks.chapterRows : mocks.articleRows,
        }),
      }),
    }),
  },
}));
vi.mock("@reading-advantage/ai", () => ({
  createAIClient: vi.fn(() => ({ generateObject: mocks.generateObject })),
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info: mocks.info, warn: vi.fn(), error: vi.fn() },
}));

import { resetPrimaryAiClients } from "@/lib/ai/models";
import { getLaqFeedback, getSaqFeedback, readFeedbackSource } from "../assistant";

const CHAPTER = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  resetPrimaryAiClients();
  process.env.PROJECT_ID = "proj-test";
  process.env.VERTEX_CLIENT_EMAIL = "svc@example.test";
  process.env.VERTEX_PRIVATE_KEY = "key";
  mocks.chapterRows = [{ passage: "A fox finds a lantern.", cefrLevel: "A2" }];
});

describe("chapter feedback source", () => {
  it("readFeedbackSource returns the chapter passage and level", async () => {
    await expect(readFeedbackSource({ chapterId: CHAPTER })).resolves.toEqual({
      passage: "A fox finds a lantern.",
      cefrLevel: "A2",
    });
  });

  it("getSaqFeedback fills the prompt with the chapter passage", async () => {
    mocks.generateObject.mockResolvedValue({ feedback: "ok", score: 4 });
    const result = await getSaqFeedback({
      data: { chapterId: CHAPTER, question: "What shines?", answer: "The lantern.", suggestedResponse: "A lamp.", preferredLanguage: "th" },
      activityType: "x" as never,
    });
    expect(result).toEqual({ feedback: "ok", score: 4 });
    const input = mocks.generateObject.mock.calls[0][0];
    expect(input.prompt).toContain("A fox finds a lantern.");
    expect(input.prompt).toContain("The lantern.");
  });

  it("getLaqFeedback fills the prompt with the chapter passage", async () => {
    mocks.generateObject.mockResolvedValue({ feedback: { scores: {} } });
    await getLaqFeedback({
      data: { chapterId: CHAPTER, question: "Tell the tale.", answer: "A fox.", preferredLanguage: "th" },
    });
    const input = mocks.generateObject.mock.calls[0][0];
    expect(input.prompt).toContain("A fox finds a lantern.");
    expect(input.prompt).toContain("Tell the tale.");
  });

  it("throws for a missing chapter", async () => {
    mocks.chapterRows = [];
    await expect(readFeedbackSource({ chapterId: CHAPTER })).rejects.toThrow("Chapter not found");
  });
});
