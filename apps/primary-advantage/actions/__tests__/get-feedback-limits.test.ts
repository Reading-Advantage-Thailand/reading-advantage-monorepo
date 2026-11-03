// @vitest-environment node
/** Finding 4 of authz-primary-report.md: getFeedback caps its input and limits each user. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  laq: vi.fn(),
  saq: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/primary-evidence-queue", () => ({ enqueuePrimaryEvidenceJob: vi.fn() }));
vi.mock("@reading-advantage/db", () => ({ db: {}, eq: vi.fn(), and: vi.fn(), userActivity: {}, articleActivityLogs: {}, multipleChoiceQuestions: {} }));
vi.mock("@/server/xp/award-question-xp", () => ({ awardQuestionXp: vi.fn() }));
vi.mock("@/server/utils/assistant", () => ({ getLaqFeedback: mocks.laq, getSaqFeedback: mocks.saq }));

import { getFeedback } from "../question";
import { laqFeedbackInputSchema, saqFeedbackInputSchema } from "@/lib/zod";
import { ActivityType } from "@/types/enum";

const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const request = (answer: string, activityType = ActivityType.LA_QUESTION) => ({
  data: { articleId: ARTICLE, question: "Why?", answer, preferredLanguage: "English" },
  activityType,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.laq.mockResolvedValue({ scores: {} });
  mocks.saq.mockResolvedValue({ feedback: "Good", score: 4 });
});

describe("feedback schemas in lib/zod.ts", () => {
  const laq = { preferredLanguage: "English", targetCEFRLevel: "A1", readingPassage: "P", writingPrompt: "Why?", studentResponse: "Because." };
  const saq = { preferredLanguage: "English", targetCEFRLevel: "A1", article: "P", question: "Why?", suggestedResponse: "S", studentResponse: "Because." };

  it("accepts a normal request", () => {
    expect(laqFeedbackInputSchema.safeParse(laq).success).toBe(true);
    expect(saqFeedbackInputSchema.safeParse(saq).success).toBe(true);
  });

  it.each([
    ["LAQ studentResponse", laqFeedbackInputSchema, { ...laq, studentResponse: "x".repeat(2001) }],
    ["LAQ writingPrompt", laqFeedbackInputSchema, { ...laq, writingPrompt: "x".repeat(1001) }],
    ["LAQ preferredLanguage", laqFeedbackInputSchema, { ...laq, preferredLanguage: "x".repeat(33) }],
    ["SAQ studentResponse", saqFeedbackInputSchema, { ...saq, studentResponse: "x".repeat(2001) }],
    ["SAQ question", saqFeedbackInputSchema, { ...saq, question: "x".repeat(1001) }],
    ["SAQ suggestedResponse", saqFeedbackInputSchema, { ...saq, suggestedResponse: "x".repeat(2001) }],
  ])("refuses an oversized %s", (_name, schema, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
});

describe("getFeedback", () => {
  it("refuses an oversized answer before the AI call", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-big", role: "STUDENT" });
    expect(await getFeedback(request("x".repeat(2001)))).toEqual({ error: "invalid" });
    expect(mocks.laq).not.toHaveBeenCalled();
  });

  it("rate limits one user and leaves another user free", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-loop", role: "STUDENT" });
    const results: unknown[] = [];
    for (let i = 0; i < 21; i++) results.push(await getFeedback(request("Because.", ActivityType.SA_QUESTION)));
    expect(results[19]).toEqual({ feedback: "Good", score: 4 });
    expect(results[20]).toEqual({ error: "rate_limited" });
    expect(mocks.saq).toHaveBeenCalledTimes(20);

    mocks.currentUser.mockResolvedValue({ id: "s-other", role: "STUDENT" });
    expect(await getFeedback(request("Because.", ActivityType.SA_QUESTION))).toEqual({ feedback: "Good", score: 4 });
  });
});
