// @vitest-environment jsdom
// Characterization tests written before the matching-game merge. The source
// file lesson-matching-game.tsx holds two full game implementations plus a
// dispatcher. These tests pin the current observable behavior of every variant
// so the merge must keep them green.
//
// Covered variants:
//   LessonSentenceMatchingView    (cardKind=SENTENCE)    -> th translations,
//     translation-key counters, results.allCorrect, buttons.finishGame.
//   LessonVocabularyMatchingView  (cardKind=VOCABULARY)  -> hardcoded "en"
//     definitions, live "n/m matched" counters, results.perfect,
//     buttons.completeActivity.
//   LessonMatchingGame dispatcher -> variant selection per cardKind.
//
// Shared quirks pinned here: the right column stays disabled until a left item
// is selected; a wrong match is kept until the pair is re-matched; completing
// all pairs reports the activity with a literal 0 timer even when wrong.
// The identity next-intl mock is deliberate: it pins translation keys as the observable contract while variants merge.
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityType, FlashcardType, UserXpEarned } from "@/types/enum";

const {
  getLessonFlashcardsMock,
  updateUserActivityMock,
  authRefreshMock,
  toastMock,
} = vi.hoisted(() => ({
  getLessonFlashcardsMock: vi.fn(),
  updateUserActivityMock: vi.fn(),
  authRefreshMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
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

vi.mock("sonner", () => ({ toast: toastMock }));

// deck-view and flashcard-game ride the import graph, so their action imports
// must exist on the mock too.
vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: getLessonFlashcardsMock,
  getDeckCards: vi.fn(),
  reviewCard: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import { LessonMatchingGame } from "../lesson-matching-game";

const ARTICLE_ID = "article-1";

// The sentence view keys translations by toTranslationLanguage("en") -> "th".
// The "en" entry is a decoy that must never render.
const SENTENCE_CARDS = [
  {
    id: "pair-1",
    sentence: "Dogs bark.",
    translation: { th: "Dog sound.", en: "English decoy" },
  },
  {
    id: "pair-2",
    sentence: "Cats meow.",
    translation: { th: "Cat sound.", en: "English decoy two" },
  },
];

// The vocabulary view hardcodes selectedLanguage "en". The "th" entry is the
// decoy for that variant.
const VOCAB_CARDS = [
  {
    id: "word-1",
    word: "adventure",
    definition: { en: "An exciting experience.", th: "Thai decoy" },
  },
  {
    id: "word-2",
    word: "curious",
    definition: { en: "Wanting to learn.", th: "Thai decoy two" },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getLessonFlashcardsMock.mockResolvedValue({ success: true, cards: [] });
  updateUserActivityMock.mockResolvedValue(undefined);
  authRefreshMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Renders the dispatcher for one card kind and waits for the playing grid.
 * @param cardKind Flashcard kind handed to LessonMatchingGame.
 * @param startButtonName Translated label of the start button for the variant.
 */
async function renderAndStart(
  cardKind: FlashcardType,
  startButtonName: string,
): Promise<void> {
  render(<LessonMatchingGame articleId={ARTICLE_ID} cardKind={cardKind} />);
  const start = await screen.findByRole("button", { name: startButtonName });
  fireEvent.click(start);
}

/**
 * Matches one left item to one right item by their visible labels.
 * @param leftLabel Sentence or word button label.
 * @param rightLabel Translation or definition button label.
 */
function matchPair(leftLabel: string, rightLabel: string): void {
  fireEvent.click(screen.getByRole("button", { name: leftLabel }));
  fireEvent.click(screen.getByRole("button", { name: rightLabel }));
}

describe("sentence matching variant (characterization)", () => {
  beforeEach(() => {
    getLessonFlashcardsMock.mockResolvedValue({
      success: true,
      cards: SENTENCE_CARDS,
    });
  });

  it("loads SENTENCE cards and shows the start screen with th labels", async () => {
    render(
      <LessonMatchingGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.SENTENCE}
      />,
    );

    const start = await screen.findByRole("button", {
      name: "startScreen.startButton",
    });
    expect(getLessonFlashcardsMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      FlashcardType.SENTENCE,
    );
    expect(start).toBeEnabled();
    expect(screen.getByText("startScreen.title")).toBeInTheDocument();
  });

  it("shows the no-deck screen when the action returns no cards", async () => {
    getLessonFlashcardsMock.mockResolvedValue({ success: false });
    render(
      <LessonMatchingGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.SENTENCE}
      />,
    );

    expect(await screen.findByText("noDeck.error")).toBeInTheDocument();
    expect(screen.getByText("noDeck.message")).toBeInTheDocument();
  });

  it("renders both columns and keeps the right column disabled at first", async () => {
    await renderAndStart(FlashcardType.SENTENCE, "startScreen.startButton");

    expect(screen.getByRole("button", { name: "Dogs bark." })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cats meow." })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Dog sound." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cat sound." })).toBeDisabled();
    // The sentence view shows translation keys, not live counters.
    expect(screen.getByText("gameplay.pairsProgress")).toBeInTheDocument();
    expect(screen.getByText("gameplay.correctCount")).toBeInTheDocument();
    expect(screen.getByText("itemTypes.sentence")).toBeInTheDocument();
    expect(screen.getByText("itemTypes.translation")).toBeInTheDocument();
    expect(screen.queryByText("English decoy")).not.toBeInTheDocument();
  });

  it("selecting a left item arms the right column and re-clicking disarms it", async () => {
    await renderAndStart(FlashcardType.SENTENCE, "startScreen.startButton");

    fireEvent.click(screen.getByRole("button", { name: "Dogs bark." }));
    expect(screen.getByRole("button", { name: "Dog sound." })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Dogs bark." }));
    expect(screen.getByRole("button", { name: "Dog sound." })).toBeDisabled();
  });

  it("ignores right clicks while no left item is selected", async () => {
    await renderAndStart(FlashcardType.SENTENCE, "startScreen.startButton");

    fireEvent.click(screen.getByRole("button", { name: "Dog sound." }));

    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(updateUserActivityMock).not.toHaveBeenCalled();
  });

  it("completes all-correct with toasts, a zero-timer activity report, and finish", async () => {
    await renderAndStart(FlashcardType.SENTENCE, "startScreen.startButton");

    matchPair("Dogs bark.", "Dog sound.");
    expect(toastMock.success).toHaveBeenCalledWith("results.correctMatch");
    // Selecting a pair is cleared after each match, so the right column is
    // disabled again before the next left click.
    expect(screen.getByRole("button", { name: "Cat sound." })).toBeDisabled();

    matchPair("Cats meow.", "Cat sound.");

    expect(await screen.findByText("results.allCorrect")).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith("results.perfect");
    // The report fires from the auto-complete effect with a literal 0 timer.
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.SENTENCE_MATCHING,
      0,
      { score: UserXpEarned.SENTENCE_MATCHING },
    );
    expect(authRefreshMock).toHaveBeenCalled();
    const finish = screen.getByRole("button", { name: "buttons.finishGame" });
    expect(screen.queryByRole("button", { name: "buttons.showAnswers" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dogs bark." })).toBeDisabled();

    fireEvent.click(finish);

    await screen.findByText("complete.title");
    // Quirk: the completion screen stats are hardcoded, not derived.
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("xpEarned")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("locks an all-wrong round into the partial card and reveals the answers", async () => {
    await renderAndStart(FlashcardType.SENTENCE, "startScreen.startButton");

    matchPair("Dogs bark.", "Cat sound.");
    expect(toastMock.error).toHaveBeenCalledWith("results.incorrectMatch");
    matchPair("Cats meow.", "Dog sound.");

    expect(await screen.findByText("results.partialCorrect")).toBeInTheDocument();
    expect(toastMock.error).toHaveBeenCalledWith("results.tryAgain");
    // Quirk: the activity is reported even when every match is wrong.
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.SENTENCE_MATCHING,
      0,
      { score: UserXpEarned.SENTENCE_MATCHING },
    );
    // No finish path exists for a wrong round today.
    expect(
      screen.queryByRole("button", { name: "buttons.finishGame" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "buttons.showAnswers" }),
    );

    expect(toastMock.info).toHaveBeenCalledWith("results.showAnswers");
    expect(screen.getByText("results.correctMatches")).toBeInTheDocument();
    // The reveal list adds a second "Dog sound." text next to the column span.
    expect(screen.getAllByText("Dog sound.")).toHaveLength(2);
  });

  it("re-matching a wrong pair replaces the stored match", async () => {
    await renderAndStart(FlashcardType.SENTENCE, "startScreen.startButton");

    matchPair("Dogs bark.", "Cat sound.");
    expect(toastMock.error).toHaveBeenCalledWith("results.incorrectMatch");

    matchPair("Dogs bark.", "Dog sound.");
    expect(toastMock.success).toHaveBeenCalledWith("results.correctMatch");

    matchPair("Cats meow.", "Cat sound.");

    expect(await screen.findByText("results.allCorrect")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "buttons.finishGame" }),
    ).toBeInTheDocument();
    // Two left items means exactly two stored matches, so one report fires.
    expect(updateUserActivityMock).toHaveBeenCalledTimes(1);
  });
});

describe("vocabulary matching variant (characterization)", () => {
  beforeEach(() => {
    getLessonFlashcardsMock.mockResolvedValue({
      success: true,
      cards: VOCAB_CARDS,
    });
  });

  it("loads VOCABULARY cards and shows the start screen with en definitions", async () => {
    render(
      <LessonMatchingGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.VOCABULARY}
      />,
    );

    await screen.findByRole("button", { name: "start.startButton" });
    expect(getLessonFlashcardsMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      FlashcardType.VOCABULARY,
    );
    expect(screen.getByText("start.title")).toBeInTheDocument();
  });

  it("shows the no-cards screen when the action returns no cards", async () => {
    getLessonFlashcardsMock.mockResolvedValue({ success: false });
    render(
      <LessonMatchingGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.VOCABULARY}
      />,
    );

    expect(await screen.findByText("noCards.title")).toBeInTheDocument();
    expect(screen.getByText("noCards.description")).toBeInTheDocument();
  });

  it("renders words, en definitions, and live matched counters", async () => {
    await renderAndStart(FlashcardType.VOCABULARY, "start.startButton");

    expect(screen.getByRole("button", { name: "adventure" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "curious" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "An exciting experience." }),
    ).toBeDisabled();
    // The vocabulary view renders live counters instead of translation keys.
    expect(screen.getByText("0/2 matched")).toBeInTheDocument();
    expect(screen.getByText("0/2 correct")).toBeInTheDocument();
    expect(screen.getByText("game.columns.words")).toBeInTheDocument();
    expect(screen.getByText("game.columns.definitions")).toBeInTheDocument();
    expect(screen.queryByText("Thai decoy")).not.toBeInTheDocument();
  });

  it("counts each stored match live and completes with the perfect card", async () => {
    await renderAndStart(FlashcardType.VOCABULARY, "start.startButton");

    matchPair("adventure", "An exciting experience.");
    expect(toastMock.success).toHaveBeenCalledWith("results.correctMatch");
    expect(screen.getByText("1/2 matched")).toBeInTheDocument();
    expect(screen.getByText("1/2 correct")).toBeInTheDocument();

    matchPair("curious", "Wanting to learn.");

    expect(await screen.findByText("results.perfect")).toBeInTheDocument();
    expect(screen.getByText("2/2 matched")).toBeInTheDocument();
    expect(screen.getByText("2/2 correct")).toBeInTheDocument();
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.VOCABULARY_MATCHING,
      0,
      { score: UserXpEarned.VOCABULARY_MATCHING },
    );
    expect(authRefreshMock).toHaveBeenCalled();
    // The vocabulary finish button carries its own label.
    expect(
      screen.getByRole("button", { name: "buttons.completeActivity" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "buttons.finishGame" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "buttons.completeActivity" }),
    );

    await screen.findByText("completed.title");
    // Quirk: the completion screen stats are hardcoded, not derived.
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("completed.xpEarned")).toBeInTheDocument();
    expect(screen.getByText("completed.completed")).toBeInTheDocument();
  });

  it("locks an all-wrong round into the partial card without a finish button", async () => {
    await renderAndStart(FlashcardType.VOCABULARY, "start.startButton");

    matchPair("adventure", "Wanting to learn.");
    matchPair("curious", "An exciting experience.");

    expect(await screen.findByText("results.partialCorrect")).toBeInTheDocument();
    expect(toastMock.error).toHaveBeenCalledWith("results.tryAgain");
    expect(screen.getByText("2/2 matched")).toBeInTheDocument();
    expect(screen.getByText("0/2 correct")).toBeInTheDocument();
    expect(updateUserActivityMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "buttons.completeActivity" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "buttons.showAnswers" }),
    );
    expect(toastMock.info).toHaveBeenCalledWith("results.showAnswers");
    expect(screen.getByText("results.correctMatches")).toBeInTheDocument();
  });
});

describe("LessonMatchingGame dispatcher (characterization)", () => {
  it("selects the sentence view for cardKind SENTENCE", async () => {
    getLessonFlashcardsMock.mockResolvedValue({
      success: true,
      cards: SENTENCE_CARDS,
    });
    render(
      <LessonMatchingGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.SENTENCE}
      />,
    );

    await screen.findByRole("button", { name: "startScreen.startButton" });
    expect(getLessonFlashcardsMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      FlashcardType.SENTENCE,
    );
    expect(screen.queryByText("start.startButton")).not.toBeInTheDocument();
  });

  it("selects the vocabulary view for cardKind VOCABULARY", async () => {
    getLessonFlashcardsMock.mockResolvedValue({
      success: true,
      cards: VOCAB_CARDS,
    });
    render(
      <LessonMatchingGame
        articleId={ARTICLE_ID}
        cardKind={FlashcardType.VOCABULARY}
      />,
    );

    await screen.findByRole("button", { name: "start.startButton" });
    expect(getLessonFlashcardsMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      FlashcardType.VOCABULARY,
    );
    expect(
      screen.queryByRole("button", { name: "startScreen.startButton" }),
    ).not.toBeInTheDocument();
  });
});
