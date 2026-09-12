/**
 * FR-1/FR-2 characterization tests for the unified quiz cards.
 *
 * The shared MC question card renders for both article quizzes and story
 * chapter quizzes. Both variants persist in-progress answers to
 * sessionStorage under their own storage key:
 *
 *   - article:  quiz_progress_<articleId>
 *   - story:    quiz_progress_<storyId>_<chapterNumber>
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MCQuestionCard from "@/components/questions/mc-question-card";

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
  useCurrentLocale: () => "en",
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/store/question-store", () => ({
  useQuestionStore: {
    subscribe: jest.fn(() => jest.fn()),
    setState: jest.fn(),
  },
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

var checkArticleCompletion: jest.Mock;

jest.mock("@/lib/use-article-completion", () => {
  checkArticleCompletion = jest.fn().mockResolvedValue({});
  return {
    useArticleCompletion: () => ({
      checkAndNotifyCompletion: checkArticleCompletion,
    }),
  };
});

jest.mock("@/lib/use-story-completion", () => ({
  useStoryCompletion: () => ({
    checkAndNotifyCompletion: jest.fn().mockResolvedValue({}),
  }),
}));

function makeMcqPayload(overrides: Record<string, unknown> = {}) {
  return {
    results: [
      {
        id: "q1",
        question: "What is the capital of France?",
        options: ["Paris", "London", "Berlin", "Madrid"],
        textual_evidence: "Paris is the capital of France.",
        question_number: 1,
        chapter_number: "2",
      },
      {
        id: "q2",
        question: "What color is the sky?",
        options: ["Blue", "Green", "Red", "Black"],
        textual_evidence: "The sky is blue.",
        question_number: 2,
        chapter_number: "2",
      },
    ],
    progress: [2, 2, 2, 2, 2],
    total: 5,
    state: 1, // QuestionState.INCOMPLETE
    ...overrides,
  };
}

function mockFetchRoutes(mode: "article" | "story") {
  (globalThis.fetch as jest.Mock) = jest.fn((url: string, init?: RequestInit) => {
    if (typeof url === "string" && url.includes("/activitylog")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }

    const isSubmit =
      init?.method === "POST" &&
      typeof url === "string" &&
      /\/(mcq)\/[^/?]+$/.test(url);

    if (isSubmit) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ correctAnswer: "Paris" }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(makeMcqPayload()),
    });
  });
}

async function startQuizAndAnswerFirstOption() {
  const user = userEvent.setup();
  const startButton = await screen.findByRole("button", { name: "startButton" });
  await user.click(startButton);

  const option = await screen.findByRole("button", { name: /1\. Paris/ });
  await user.click(option);
}

describe("MCQuestionCard — article variant", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockFetchRoutes("article");
  });

  it("fetches from the articles endpoint and persists progress under quiz_progress_<articleId>", async () => {
    render(
      <MCQuestionCard
        userId="user-1"
        articleId="article-1"
        articleTitle="The River"
        articleLevel={3}
        page="article"
      />,
    );

    await waitFor(() =>
      expect(
        (globalThis.fetch as jest.Mock).mock.calls.some((call) =>
          String(call[0]).includes("/api/v1/articles/article-1/questions/mcq?"),
        ),
      ).toBe(true),
    );

    await startQuizAndAnswerFirstOption();

    await waitFor(() =>
      expect(sessionStorage.getItem("quiz_progress_article-1")).toBe(
        JSON.stringify([0, 2, 2, 2, 2]),
      ),
    );
    expect(sessionStorage.getItem("quiz_started_article-1")).toBe("true");
  });
});

describe("MCQuestionCard — story variant", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockFetchRoutes("story");
  });

  it("fetches from the stories endpoint and persists progress under quiz_progress_<storyId>_<chapterNumber>", async () => {
    render(
      <MCQuestionCard
        userId="user-1"
        articleId="story-1"
        articleTitle="Chapter Two"
        articleLevel={3}
        variant="story"
        chapterNumber="2"
      />,
    );

    await waitFor(() =>
      expect(
        (globalThis.fetch as jest.Mock).mock.calls.some((call) =>
          String(call[0]).includes("/api/v1/stories/story-1/2/question/mcq?"),
        ),
      ).toBe(true),
    );

    await startQuizAndAnswerFirstOption();

    await waitFor(() =>
      expect(sessionStorage.getItem("quiz_progress_story-1_2")).toBe(
        JSON.stringify([0, 2, 2, 2, 2]),
      ),
    );
    expect(sessionStorage.getItem("quiz_started_story-1_2")).toBe("true");
  });

  it("does not call the article completion checker for a story chapter", async () => {
    checkArticleCompletion.mockClear();
    render(
      <MCQuestionCard
        userId="user-1"
        articleId="story-1"
        articleTitle="Chapter Two"
        articleLevel={3}
        page="article"
        variant="story"
        chapterNumber="2"
      />,
    );

    await startQuizAndAnswerFirstOption();
    await waitFor(() =>
      expect(sessionStorage.getItem("quiz_progress_story-1_2")).toBeTruthy(),
    );
    expect(checkArticleCompletion).not.toHaveBeenCalled();
  });
});
