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
import SAQuestionCard from "@/components/questions/sa-question-card";
import LAQuestionCard from "@/components/questions/laq-question-card";
import { QuestionState } from "@/components/models/questions-model";

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

const mockArticleCompletion = {
  checkArticleCompletion: jest.fn().mockResolvedValue({}),
};

jest.mock("@/lib/use-article-completion", () => ({
  useArticleCompletion: () => ({
    checkAndNotifyCompletion: mockArticleCompletion.checkArticleCompletion,
  }),
}));

const checkArticleCompletion = mockArticleCompletion.checkArticleCompletion;

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

/** Serves the given payload for every GET the card makes. */
function mockCompletedFetch(payload: unknown) {
  (globalThis.fetch as jest.Mock) = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(payload),
    }),
  );
}

function makeSaPayload(state: QuestionState) {
  return {
    result: { id: "q1", question: "Summarize the chapter." },
    suggested_answer: "A summary.",
    answer: "The student answer.",
    state,
  };
}

function makeLaqPayload(state: QuestionState) {
  return {
    result: { id: "q1", question: "Write about the chapter." },
    state,
  };
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

  it("calls the article completion checker once the article quiz reaches COMPLETED", async () => {
    checkArticleCompletion.mockClear();
    mockCompletedFetch(makeMcqPayload({ state: QuestionState.COMPLETED }));

    render(
      <MCQuestionCard
        userId="user-1"
        articleId="article-1"
        articleTitle="The River"
        articleLevel={3}
        page="article"
      />,
    );

    // The retake button only renders on the COMPLETED card.
    expect(
      await screen.findByRole("button", { name: "retakeButton" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(checkArticleCompletion).toHaveBeenCalledWith("user-1", "article-1"),
    );
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

  it("does not call the article completion checker for a story chapter that reaches COMPLETED", async () => {
    checkArticleCompletion.mockClear();
    mockCompletedFetch(makeMcqPayload({ state: QuestionState.COMPLETED }));

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

    // The card must reach QuestionState.COMPLETED before the assertion.
    expect(
      await screen.findByRole("button", { name: "retakeButton" }),
    ).toBeInTheDocument();
    expect(checkArticleCompletion).not.toHaveBeenCalled();
  });
});

describe("SAQuestionCard — completed story versus article", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("does not call the article completion checker for a completed story SA card", async () => {
    checkArticleCompletion.mockClear();
    mockCompletedFetch(makeSaPayload(QuestionState.COMPLETED));

    render(
      <SAQuestionCard
        userId="user-1"
        articleId="story-1"
        articleTitle="Chapter Two"
        articleLevel={3}
        page="article"
        variant="story"
        chapterNumber="2"
      />,
    );

    // The success copy only renders on the COMPLETED card.
    expect(await screen.findByText("descriptionSuccess")).toBeInTheDocument();
    expect(checkArticleCompletion).not.toHaveBeenCalled();
  });

  it("calls the article completion checker for a completed article SA card", async () => {
    checkArticleCompletion.mockClear();
    mockCompletedFetch(makeSaPayload(QuestionState.COMPLETED));

    render(
      <SAQuestionCard
        userId="user-1"
        articleId="article-1"
        articleTitle="The River"
        articleLevel={3}
        page="article"
      />,
    );

    expect(await screen.findByText("descriptionSuccess")).toBeInTheDocument();
    await waitFor(() =>
      expect(checkArticleCompletion).toHaveBeenCalledWith("user-1", "article-1"),
    );
  });
});

describe("LAQuestionCard — completed story versus article", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("does not call the article completion checker for a completed story LAQ card", async () => {
    checkArticleCompletion.mockClear();
    mockCompletedFetch(makeLaqPayload(QuestionState.COMPLETED));

    render(
      <LAQuestionCard
        userId="user-1"
        userLevel={3}
        articleId="story-1"
        articleTitle="Chapter Two"
        articleLevel={3}
        variant="story"
        chapterNumber="2"
      />,
    );

    expect(await screen.findByText("descriptionSuccess")).toBeInTheDocument();
    expect(checkArticleCompletion).not.toHaveBeenCalled();
  });

  it("calls the article completion checker for a completed article LAQ card", async () => {
    checkArticleCompletion.mockClear();
    mockCompletedFetch(makeLaqPayload(QuestionState.COMPLETED));

    render(
      <LAQuestionCard
        userId="user-1"
        userLevel={3}
        articleId="article-1"
        articleTitle="The River"
        articleLevel={3}
      />,
    );

    expect(await screen.findByText("descriptionSuccess")).toBeInTheDocument();
    await waitFor(() =>
      expect(checkArticleCompletion).toHaveBeenCalledWith("user-1", "article-1"),
    );
  });
});
