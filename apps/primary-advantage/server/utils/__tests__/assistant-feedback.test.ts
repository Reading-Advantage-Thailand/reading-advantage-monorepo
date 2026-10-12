// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  info: vi.fn(),
  rows: [{ passage: "A cat sat.", cefrLevel: "A1" }] as unknown[],
}));

vi.mock("@reading-advantage/db", () => ({
  articles: { id: "id", passage: "passage", cefrLevel: "cefrLevel" },
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => mocks.rows }) }),
    }),
  },
}));
vi.mock("@reading-advantage/ai", () => ({
  createAIClient: vi.fn(() => ({ generateObject: mocks.generateObject })),
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info: mocks.info, warn: vi.fn(), error: vi.fn() },
}));

import { laquestion_system, saqeution_system } from "@/data/prompts-ai";
import { resetPrimaryAiClients } from "@/lib/ai/models";
import { laqFeedbackOutputSchema, saqFeedbackOutputSchema } from "@/lib/zod";
import { getLaqFeedback, getSaqFeedback } from "../assistant";

const req = {
  data: {
    articleId: "a-1",
    question: "What sat?",
    answer: "The cat.",
    suggestedResponse: "A cat.",
    preferredLanguage: "th",
  },
};

describe("assistant feedback through the adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPrimaryAiClients();
    process.env.PROJECT_ID = "proj-test";
    process.env.VERTEX_CLIENT_EMAIL = "svc@example.test";
    process.env.VERTEX_PRIVATE_KEY = "key";
  });

  it("getSaqFeedback calls the feedback client with system, schema, and filled prompt", async () => {
    mocks.generateObject.mockResolvedValue({ feedback: "ok" });

    const result = await getSaqFeedback({ ...req, activityType: "x" as never });

    expect(result).toEqual({ feedback: "ok" });
    const input = mocks.generateObject.mock.calls[0][0];
    expect(input.system).toBe(saqeution_system);
    expect(input.schema).toBe(saqFeedbackOutputSchema);
    expect(input.prompt).toContain("A cat sat.");
    expect(input.prompt).toContain("The cat.");
    expect(input.prompt).not.toContain("{article}");
    expect(mocks.info).toHaveBeenCalledWith("ai_call", {
      task: "qa.feedback",
      provider: "vertex",
      model: "gemini-3-flash-preview",
      durationMs: expect.any(Number),
    });
  });

  it("getLaqFeedback calls the feedback client and returns the feedback object", async () => {
    mocks.generateObject.mockResolvedValue({ feedback: { scores: {} } });

    const result = await getLaqFeedback(req);

    expect(result).toEqual({ scores: {} });
    const input = mocks.generateObject.mock.calls[0][0];
    expect(input.system).toBe(laquestion_system);
    expect(input.schema).toBe(laqFeedbackOutputSchema);
    expect(input.prompt).toContain("What sat?");
    expect(mocks.info).toHaveBeenCalledWith("ai_call", expect.objectContaining({ task: "qa.feedback" }));
  });

  it("throws when the article is missing", async () => {
    mocks.rows = [];
    await expect(getLaqFeedback(req)).rejects.toThrow("Article not found");
    mocks.rows = [{ passage: "A cat sat.", cefrLevel: "A1" }];
  });
});
