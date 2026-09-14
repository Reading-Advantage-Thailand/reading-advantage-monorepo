// @vitest-environment jsdom
// Characterization tests written before the flashcard merge. They pin the
// current observable behavior of both variants inside lesson-flashcard-game:
// the sentence variant and the vocabulary variant. The merge must keep these
// green.
// The identity next-intl mock is deliberate: it pins translation keys as the observable contract while variants merge.
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Rating } from "ts-fsrs";

import { ActivityType, FlashcardType, UserXpEarned } from "@/types/enum";

const {
  getLessonFlashcardsMock,
  getDeckCardsMock,
  reviewCardMock,
  updateUserActivityMock,
  authRefreshMock,
} = vi.hoisted(() => ({
  getLessonFlashcardsMock: vi.fn(),
  getDeckCardsMock: vi.fn(),
  reviewCardMock: vi.fn(),
  updateUserActivityMock: vi.fn(),
  authRefreshMock: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: { id: "user-1" }, refresh: authRefreshMock }),
  useSession: () => ({ user: { id: "user-1", level: 1 } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: getLessonFlashcardsMock,
  getDeckCards: getDeckCardsMock,
  reviewCard: reviewCardMock,
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import LessonFlashcardGame from "../lesson-flashcard-game";

const ARTICLE_ID = "article-1";

// The sentence variant seeds its translation language from the locale.
// toTranslationLanguage("en") falls back to "th", so the fixtures key
// translations by "th".
const SENTENCE_CARDS = [
  {
    id: "sentence-card-1",
    sentence: "The dog runs fast.",
    translation: { th: "The dog moves quickly." },
    state: "NEW",
  },
  {
    id: "sentence-card-2",
    sentence: "The cat sleeps here.",
    translation: { th: "The cat is asleep here." },
    state: "NEW",
  },
];

// The vocabulary variant hardcodes selectedLanguage "en".
const VOCABULARY_CARDS = [
  {
    id: "vocab-card-1",
    word: "adventure",
    definition: { en: "An exciting experience." },
    state: "NEW",
  },
  {
    id: "vocab-card-2",
    word: "curious",
    definition: { en: "Wanting to learn something." },
    state: "LEARNING",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  reviewCardMock.mockResolvedValue({ success: true });
  updateUserActivityMock.mockResolvedValue(undefined);
  authRefreshMock.mockResolvedValue(undefined);
});

/**
 * Queues the card fixture for one variant and renders the dispatcher.
 * @param cardKind Flashcard kind passed to LessonFlashcardGame.
 * @param cards Cards returned by getLessonFlashcards.
 */
function renderVariant(cardKind: FlashcardType, cards: unknown[]) {
  getLessonFlashcardsMock.mockResolvedValue({ cards });
  render(<LessonFlashcardGame articleId={ARTICLE_ID} cardKind={cardKind} />);
}

/**
 * Clicks a button by its translated (identity-mocked) label.
 * @param name The rendered accessible button name.
 */
function clickButton(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

/**
 * Reveals the answer side and rates the active card.
 * @param showAnswerName Label of the show-answer button for the variant.
 * @param ratingName Label of the rating button to press.
 */
function revealAndRate(showAnswerName: string, ratingName: string) {
  clickButton(showAnswerName);
  clickButton(ratingName);
}

describe("sentence flashcard variant (characterization)", () => {
  it("loads cards through the SENTENCE fetch and shows the start screen", async () => {
    renderVariant(FlashcardType.SENTENCE, SENTENCE_CARDS);

    await screen.findByRole("button", { name: "start.startButton" });
    expect(getLessonFlashcardsMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      FlashcardType.SENTENCE,
    );
    expect(screen.getByText("start.title")).toBeInTheDocument();
  });

  it("shows the current sentence and reveals the selected-language translation", async () => {
    renderVariant(FlashcardType.SENTENCE, SENTENCE_CARDS);
    await screen.findByRole("button", { name: "start.startButton" });
    clickButton("start.startButton");

    expect(screen.getByText("The dog runs fast.")).toBeInTheDocument();
    expect(screen.queryByText("The dog moves quickly.")).not.toBeInTheDocument();

    clickButton("buttons.showAnswer");

    expect(screen.getByText("The dog moves quickly.")).toBeInTheDocument();
    expect(screen.getByText("rating.prompt")).toBeInTheDocument();
  });

  it("rating a card advances to the next card and re-arms show-answer", async () => {
    renderVariant(FlashcardType.SENTENCE, SENTENCE_CARDS);
    await screen.findByRole("button", { name: "start.startButton" });
    clickButton("start.startButton");

    revealAndRate("buttons.showAnswer", "rating.good");

    expect(screen.getByText("The cat sleeps here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "buttons.showAnswer" }));
    expect(screen.queryByText("rating.prompt")).not.toBeInTheDocument();
  });

  it("finishing the last card saves every rating and reports the activity", async () => {
    renderVariant(FlashcardType.SENTENCE, SENTENCE_CARDS);
    await screen.findByRole("button", { name: "start.startButton" });
    clickButton("start.startButton");

    revealAndRate("buttons.showAnswer", "rating.good");
    revealAndRate("buttons.showAnswer", "rating.easy");

    await screen.findByText("complete.title");
    expect(screen.getByText("2/2")).toBeInTheDocument();

    await waitFor(() => expect(updateUserActivityMock).toHaveBeenCalled());
    expect(reviewCardMock).toHaveBeenCalledWith("sentence-card-1", Rating.Good);
    expect(reviewCardMock).toHaveBeenCalledWith("sentence-card-2", Rating.Easy);
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.SENTENCE_FLASHCARDS,
      expect.any(Number),
      {
        details: {
          cardRating: expect.objectContaining({
            "sentence-card-1": Rating.Good,
          }),
        },
        score: UserXpEarned.SENTENCE_FLASHCARDS,
      },
    );
    expect(authRefreshMock).toHaveBeenCalled();
  });
});

describe("vocabulary flashcard variant (characterization)", () => {
  it("loads cards through the VOCABULARY fetch and shows the start screen", async () => {
    renderVariant(FlashcardType.VOCABULARY, VOCABULARY_CARDS);

    await screen.findByRole("button", { name: "start.startButton" });
    expect(getLessonFlashcardsMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      FlashcardType.VOCABULARY,
    );
    expect(screen.getByText("start.title")).toBeInTheDocument();
  });

  it("shows the current word and reveals the English definition", async () => {
    renderVariant(FlashcardType.VOCABULARY, VOCABULARY_CARDS);
    await screen.findByRole("button", { name: "start.startButton" });
    clickButton("start.startButton");

    expect(screen.getByText("adventure")).toBeInTheDocument();
    expect(screen.queryByText("An exciting experience.")).not.toBeInTheDocument();

    clickButton("playing.showAnswer");

    expect(screen.getByText("An exciting experience.")).toBeInTheDocument();
    expect(screen.getByText("playing.rating.prompt")).toBeInTheDocument();
  });

  it("rating a card advances to the next word and re-arms show-answer", async () => {
    renderVariant(FlashcardType.VOCABULARY, VOCABULARY_CARDS);
    await screen.findByRole("button", { name: "start.startButton" });
    clickButton("start.startButton");

    revealAndRate("playing.showAnswer", "playing.rating.good");

    expect(screen.getByText("curious")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "playing.showAnswer" }));
    expect(screen.queryByText("playing.rating.prompt")).not.toBeInTheDocument();
  });

  it("finishing the last card saves every rating and reports the activity", async () => {
    renderVariant(FlashcardType.VOCABULARY, VOCABULARY_CARDS);
    await screen.findByRole("button", { name: "start.startButton" });
    clickButton("start.startButton");

    revealAndRate("playing.showAnswer", "playing.rating.good");
    revealAndRate("playing.showAnswer", "playing.rating.easy");

    await screen.findByText("completion.title");
    expect(screen.getByText("2/2")).toBeInTheDocument();

    await waitFor(() => expect(updateUserActivityMock).toHaveBeenCalled());
    expect(reviewCardMock).toHaveBeenCalledWith("vocab-card-1", Rating.Good);
    expect(reviewCardMock).toHaveBeenCalledWith("vocab-card-2", Rating.Easy);
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.VOCABULARY_FLASHCARDS,
      expect.any(Number),
      {
        details: {
          cardRating: expect.objectContaining({ "vocab-card-1": Rating.Good }),
        },
        score: UserXpEarned.VOCABULARY_FLASHCARDS,
      },
    );
    expect(authRefreshMock).toHaveBeenCalled();
  });
});
