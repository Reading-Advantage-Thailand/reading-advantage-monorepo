/** @jest-environment node */
jest.mock("@/lib/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/server/utils/send-discord-webhook", () => ({ sendDiscordWebhook: jest.fn() }));

import { transformMCQuestion } from "@/server/controllers/generator-controller";

describe("generated multiple-choice writer", () => {
  it("stores the correct answer index for the shuffled options", () => {
    const row = transformMCQuestion(
      {
        question: "Which animal flies?",
        correct_answer: "Bird",
        distractor_1: "Dog",
        distractor_2: "Cat",
        distractor_3: "Fish",
      },
      "article-1",
    );

    expect(row.options[row.correctAnswer]).toBe("Bird");
    expect(row.answer).toBe("Bird");
  });

  it("rejects a missing generated answer", () => {
    expect(() =>
      transformMCQuestion(
        {
          question: "Which animal flies?",
          distractor_1: "Dog",
          distractor_2: "Cat",
          distractor_3: "Fish",
        },
        "article-1",
      ),
    ).toThrow("answer is missing");
  });

  it("rejects an answer duplicated among the distractors", () => {
    expect(() =>
      transformMCQuestion(
        {
          question: "Which animal flies?",
          correct_answer: "Bird",
          distractor_1: "Bird",
          distractor_2: "Cat",
          distractor_3: "Fish",
        },
        "article-1",
      ),
    ).toThrow("answer is ambiguous");
  });
});
