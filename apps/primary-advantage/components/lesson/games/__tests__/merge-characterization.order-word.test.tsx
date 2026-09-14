// @vitest-environment jsdom
// Characterization tests written before the order-word merge. The source file
// lesson-sentence-order-word.tsx holds two full game implementations plus a
// dispatcher. These tests pin the current observable behavior of every variant
// so the merge must keep them green.
//
// Covered variants:
//   LessonSentenceOrderWordView (source="lesson") -> loads via getLessonOrderingWords
//   DeckOrderWordGameView       (source="deck")   -> prefetched sentences or deck fetch
//   OrderWordGame dispatcher    -> variant selection and prop pass-through
//
// Timer notes: both bodies arm a 5000 ms fallback inside playHintAudio and a
// recursive 1000 ms game-clock chain. These tests pin the fallback resolving
// playback after the timeout and the tick-driven clock. They deliberately do
// NOT pin unmount semantics; the merge will add unmount cleanup and a separate
// author will pin that new behavior.
// The identity next-intl mock is deliberate: it pins translation keys as the observable contract while variants merge.
import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityType, UserXpEarned } from "@/types/enum";

const {
  getLessonOrderingWordsMock,
  updateUserActivityMock,
  authRefreshMock,
  routerBackMock,
  fetchMock,
  toastMock,
} = vi.hoisted(() => ({
  getLessonOrderingWordsMock: vi.fn(),
  updateUserActivityMock: vi.fn(),
  authRefreshMock: vi.fn(),
  routerBackMock: vi.fn(),
  fetchMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: routerBackMock, refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: { id: "user-1" }, refresh: authRefreshMock }),
  useSession: () => ({ user: { id: "user-1", level: 1 } }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: vi.fn(),
  getLessonOrderingSentences: vi.fn(),
  getLessonClozeTestSentences: vi.fn(),
  getLessonOrderingWords: getLessonOrderingWordsMock,
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import { OrderWordGame } from "../lesson-sentence-order-word";

const ARTICLE_ID = "article-1";
const DECK_ID = "deck-7";
const DECK_WORDS_URL = `/api/flashcard/decks/${DECK_ID}/words-for-ordering`;

/**
 * Builds a fetch Response stub for the deck endpoint.
 * @param payload JSON body the stubbed response resolves to.
 * @returns Object shaped like the Response the component consumes.
 */
function jsonResponse(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

/**
 * Builds one order-word sentence group with playable audio fields.
 * @param id Group id used by the re-shuffle effect key.
 * @param articleTitle Title carried in the payload.
 * @param correctOrder Words in their target order.
 * @param idPrefix Prefix for the per-word ids.
 * @returns A group shaped like the getLessonOrderingWords payload.
 */
function wordGroup(
  id: string,
  articleTitle: string,
  correctOrder: string[],
  idPrefix: string,
) {
  return {
    id,
    articleId: ARTICLE_ID,
    articleTitle,
    sentence: correctOrder.join(" "),
    correctOrder,
    words: correctOrder.map((text, index) => ({
      id: `${idPrefix}-w${index}`,
      text,
      translation: { th: `th-${text}` },
      audioUrl: `/audio/${idPrefix}-w${index}.mp3`,
      startTime: index + 1,
      endTime: index + 2,
    })),
    difficulty: "easy" as const,
    sentenceTranslations: { th: `${articleTitle} translated.` },
  };
}

const GROUP_A = wordGroup("wg-a", "Animals", ["The", "cat", "sat"], "a");
const GROUP_B = wordGroup("wg-b", "More Animals", ["Dogs", "bark"], "b");
const DECK_GROUP = wordGroup("wg-deck", "Deck Animals", ["The", "cat", "sat"], "d");

let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;
let loadSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  getLessonOrderingWordsMock.mockResolvedValue({
    sentences: [GROUP_A],
    totalSentences: 1,
  });
  updateUserActivityMock.mockResolvedValue(undefined);
  authRefreshMock.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue(jsonResponse({ sentences: [DECK_GROUP] }));
  vi.stubGlobal("fetch", fetchMock);

  const proto = window.HTMLMediaElement.prototype;
  playSpy = vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  pauseSpy = vi
    .spyOn(proto, "pause")
    .mockImplementation(() => undefined);
  loadSpy = vi.spyOn(proto, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Clicks an available word in the bank by its text.
 * @param text Word label to click.
 */
function clickBankWord(text: string): void {
  fireEvent.click(screen.getByRole("button", { name: text }));
}

/**
 * Starts the deck variant with prefetched sentences under fake timers.
 * @param sentences Groups handed to the dispatcher as props.
 */
function startDeckWith(sentences: unknown[]): void {
  render(
    <OrderWordGame
      source="deck"
      deckId={DECK_ID}
      sentences={sentences as never}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));
}

/**
 * Arms the audio hint controls and starts one hint playback.
 */
function startHintPlayback(): void {
  fireEvent.click(screen.getByRole("button", { name: "hints.audio" }));
  fireEvent.click(screen.getByRole("button", { name: "hints.playOrder" }));
}

/**
 * Finds the POST the deck view sends when the game finishes.
 * @returns The url and init object of that POST call.
 */
function postedFinish(): [string, RequestInit] {
  const post = fetchMock.mock.calls.find((call: unknown[]) => {
    const init = call[1] as RequestInit | undefined;
    return init?.method === "POST";
  });
  if (!post) {
    throw new Error(`Expected a POST call to ${DECK_WORDS_URL}.`);
  }
  return [post[0] as string, post[1] as RequestInit];
}

describe("lesson order-word variant (characterization)", () => {
  it("loads through the lesson action, never the deck endpoint, and skips the Header", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);

    await screen.findByRole("button", { name: "startScreen.startButton" });
    expect(getLessonOrderingWordsMock).toHaveBeenCalledWith(ARTICLE_ID);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("startScreen.title")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    // The lesson start screen renders no Header; the deck one does.
    expect(screen.queryByRole("heading", { name: "title" })).toBeNull();
  });

  it("renders the bank words, the th sentence translation, and a zero clock", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });

    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));

    expect(toastMock.success).toHaveBeenCalledWith("toast.gameStarted");
    for (const text of ["The", "cat", "sat"]) {
      expect(screen.getByRole("button", { name: text })).toBeInTheDocument();
    }
    expect(screen.getByText("gameplay.startByClicking")).toBeInTheDocument();
    // selectedLanguage comes from toTranslationLanguage("en") -> "th".
    expect(screen.getByText('"Animals translated."')).toBeInTheDocument();
    expect(screen.getByText("gameplay.translationLabel")).toBeInTheDocument();
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getByText("gameplay.score")).toBeInTheDocument();
  });

  it("moves a clicked word into the sentence and a pill click back to the bank", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));

    // The bank hint carries the start-by-clicking-word suffix before any move.
    expect(screen.getByText(/gameplay.startByClickingWord/)).toBeInTheDocument();

    clickBankWord("cat");

    expect(screen.getByText('"cat"')).toBeInTheDocument();
    expect(screen.queryByText("gameplay.startByClicking")).not.toBeInTheDocument();
    // Quirk: the hint suffix disappears once the user has moved a word.
    expect(
      screen.queryByText(/gameplay.startByClickingWord/),
    ).not.toBeInTheDocument();

    // The remaining button named "cat" is the pill; clicking returns it.
    fireEvent.click(screen.getByRole("button", { name: "cat" }));

    expect(screen.queryByText('"cat"')).not.toBeInTheDocument();
    expect(screen.getByText("gameplay.startByClicking")).toBeInTheDocument();
  });

  it("auto-completes silently when every word is clicked in the correct order", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));

    for (const text of ["The", "cat", "sat"]) {
      clickBankWord(text);
    }

    expect(await screen.findByText("results.perfect")).toBeInTheDocument();
    expect(screen.getByText(/^"The cat sat"/)).toHaveTextContent(
      '"The cat sat" ✓',
    );
    expect(
      screen.getByRole("button", { name: "buttons.finishGame" }),
    ).toBeInTheDocument();
    // Quirk: auto-completion shows no toast; the success toast stays commented
    // out in the source. Only the start toast fired.
    expect(toastMock.success).toHaveBeenCalledTimes(1);
    expect(toastMock.success).not.toHaveBeenCalledWith("results.perfect");
  });

  it("check-answer locks a wrong order, and show-answer reveals the target", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));

    for (const text of ["sat", "cat", "The"]) {
      clickBankWord(text);
    }

    // All words used but wrong order: the empty-bank hint appears, no result.
    expect(screen.getByText(/gameplay.allWordsUsed/)).toBeInTheDocument();
    expect(screen.queryByText("results.perfect")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "buttons.checkAnswer" }));

    expect(toastMock.error).toHaveBeenCalledWith("results.notQuiteRight");
    expect(screen.getByText("results.notQuiteRight")).toBeInTheDocument();
    // Quirk: checking locks the round (isCompleted) even for a wrong answer.
    expect(
      screen.getByRole("button", { name: "buttons.finishGame" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "buttons.showAnswer" }));

    expect(toastMock.info).toHaveBeenCalledWith("results.correctOrderRevealed");
    expect(screen.getByText("results.correctOrder")).toBeInTheDocument();
    expect(screen.getByText("The cat sat")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "buttons.tryAgain" }),
    ).toBeInTheDocument();
  });

  it("ticks the game clock once per second while playing", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));
    expect(screen.getByText("0:00")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("0:01")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("0:03")).toBeInTheDocument();
    expect(screen.queryByText("0:01")).not.toBeInTheDocument();
  });

  it("resolves the hint audio through the 5 s fallback when no media events arrive", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));
    startHintPlayback();

    const playing = screen.getByRole("button", { name: "hints.playing" });
    expect(playing).toBeDisabled();
    expect(playSpy).not.toHaveBeenCalled();
    expect(pauseSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByRole("button", { name: "hints.playing" })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    // The fallback cleanup paused the element and the promise resolved.
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(playSpy).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "hints.playOrder" }),
    ).toBeEnabled();
  });

  it("advances to the second group and re-arms the bank", async () => {
    getLessonOrderingWordsMock.mockResolvedValue({
      sentences: [GROUP_A, GROUP_B],
      totalSentences: 2,
    });
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));

    for (const text of ["The", "cat", "sat"]) {
      clickBankWord(text);
    }

    const next = await screen.findByRole("button", {
      name: "buttons.nextSentence",
    });
    fireEvent.click(next);

    expect(screen.getByRole("button", { name: "Dogs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "bark" })).toBeInTheDocument();
    expect(screen.queryByText("results.perfect")).not.toBeInTheDocument();
    expect(screen.getByText('"More Animals translated."')).toBeInTheDocument();
    expect(updateUserActivityMock).not.toHaveBeenCalled();

    for (const text of ["Dogs", "bark"]) {
      clickBankWord(text);
    }
    fireEvent.click(
      await screen.findByRole("button", { name: "buttons.finishGame" }),
    );

    await screen.findByText("complete.title");
    expect(updateUserActivityMock).toHaveBeenCalledTimes(1);
  });

  it("finishing reports the lesson activity, shows lesson keys, and playAgain restarts", async () => {
    render(<OrderWordGame source="lesson" articleId={ARTICLE_ID} />);
    await screen.findByRole("button", { name: "startScreen.startButton" });
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));
    for (const text of ["The", "cat", "sat"]) {
      clickBankWord(text);
    }

    fireEvent.click(
      await screen.findByRole("button", { name: "buttons.finishGame" }),
    );

    await screen.findByText("complete.title");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("0:00")).toBeInTheDocument();
    // Stale-closure quirk: handleNext captures timer at creation, so only the
    // argument shape is pinned. The merge may fix the value.
    expect(updateUserActivityMock).toHaveBeenCalledWith(
      ARTICLE_ID,
      ActivityType.SENTENCE_WORD_ORDERING,
      expect.any(Number),
      { score: UserXpEarned.SENTENCE_WORD_ORDERING },
    );
    expect(authRefreshMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    // The lesson completion screen uses the bare backToMenu/playAgain keys.
    expect(
      screen.getByRole("button", { name: "backToMenu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "playAgain" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "backToMenu" }));
    expect(routerBackMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "playAgain" }));
    expect(
      screen.getByRole("button", { name: "startScreen.startButton" }),
    ).toBeInTheDocument();
  });
});

describe("deck order-word variant (characterization)", () => {
  it("renders prefetched sentences with no fetch and shows the Header", () => {
    vi.useFakeTimers();
    startDeckWith([DECK_GROUP]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getLessonOrderingWordsMock).not.toHaveBeenCalled();
    // The Header difference distinguishes the deck start screen.
    expect(screen.getByRole("heading", { name: "gameplay.title" })).toBeInTheDocument();
    for (const text of ["The", "cat", "sat"]) {
      expect(screen.getByRole("button", { name: text })).toBeInTheDocument();
    }
  });

  it("starts with the Header and sentence count without any data call", () => {
    vi.useFakeTimers();
    render(
      <OrderWordGame source="deck" deckId={DECK_ID} sentences={[DECK_GROUP] as never} />,
    );

    expect(
      screen.getByRole("button", { name: "startScreen.startButton" }),
    ).toBeEnabled();
    expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches deck groups from the deck endpoint when nothing is prefetched", async () => {
    render(<OrderWordGame source="deck" deckId={DECK_ID} />);

    await screen.findByRole("button", { name: "startScreen.startButton" });
    expect(fetchMock).toHaveBeenCalledWith(DECK_WORDS_URL);
    expect(getLessonOrderingWordsMock).not.toHaveBeenCalled();
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));
    for (const text of ["The", "cat", "sat"]) {
      expect(screen.getByRole("button", { name: text })).toBeInTheDocument();
    }
  });

  it("auto-completes and posts the finish to the deck endpoint without updateUserActivity", async () => {
    render(
      <OrderWordGame source="deck" deckId={DECK_ID} sentences={[DECK_GROUP] as never} />,
    );
    await screen.findByRole("button", { name: "startScreen.startButton" });
    fireEvent.click(screen.getByRole("button", { name: "startScreen.startButton" }));
    for (const text of ["The", "cat", "sat"]) {
      clickBankWord(text);
    }

    expect(await screen.findByText("results.perfect")).toBeInTheDocument();
    // Same silent auto-complete quirk as the lesson variant.
    expect(toastMock.success).not.toHaveBeenCalledWith("results.perfect");

    fireEvent.click(screen.getByRole("button", { name: "buttons.finishGame" }));

    await screen.findByText("complete.title");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    const [postUrl, postInit] = postedFinish();
    expect(postUrl).toBe(DECK_WORDS_URL);
    // Stale-closure quirk: pin the endpoint and body shape only.
    expect(JSON.parse(String(postInit.body))).toEqual({
      score: expect.any(Number),
      timer: expect.any(Number),
    });
    expect(updateUserActivityMock).not.toHaveBeenCalled();
    expect(authRefreshMock).toHaveBeenCalled();
    // The deck completion screen uses the namespaced complete.* keys.
    expect(
      screen.getByRole("button", { name: "complete.backToMenu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "complete.playAgain" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "backToMenu" }),
    ).not.toBeInTheDocument();
  });

  it("ticks the game clock once per second while playing", () => {
    vi.useFakeTimers();
    startDeckWith([DECK_GROUP]);

    expect(screen.getByText("0:00")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("0:01")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("0:02")).toBeInTheDocument();
    expect(screen.queryByText("0:01")).not.toBeInTheDocument();
  });

  it("resolves the hint audio through the 5 s fallback when no media events arrive", async () => {
    vi.useFakeTimers();
    startDeckWith([DECK_GROUP]);
    startHintPlayback();

    const playing = screen.getByRole("button", { name: "hints.playing" });
    expect(playing).toBeDisabled();
    expect(loadSpy).toHaveBeenCalled();
    expect(playSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(4999);
    });
    expect(pauseSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "hints.playOrder" }),
    ).toBeEnabled();
  });
});

describe("OrderWordGame dispatcher (characterization)", () => {
  it("selects the lesson view for source=lesson and ignores deck props", async () => {
    getLessonOrderingWordsMock.mockResolvedValue({
      sentences: [GROUP_A, GROUP_B],
      totalSentences: 2,
    });
    render(
      <OrderWordGame
        source="lesson"
        articleId={ARTICLE_ID}
        deckId={DECK_ID}
        sentences={[DECK_GROUP] as never}
      />,
    );

    await screen.findByRole("button", { name: "startScreen.startButton" });
    // articleId passes through; the sentences prop is ignored by this variant.
    expect(getLessonOrderingWordsMock).toHaveBeenCalledWith(ARTICLE_ID);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("selects the deck view for source=deck and ignores the articleId", async () => {
    render(
      <OrderWordGame source="deck" articleId={ARTICLE_ID} deckId={DECK_ID} />,
    );

    await screen.findByRole("button", { name: "startScreen.startButton" });
    // deckId passes through into the fetch URL; the lesson action stays cold.
    expect(fetchMock).toHaveBeenCalledWith(DECK_WORDS_URL);
    expect(getLessonOrderingWordsMock).not.toHaveBeenCalled();
  });
});
