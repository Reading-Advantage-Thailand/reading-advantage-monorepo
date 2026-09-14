// @vitest-environment jsdom
// The identity next-intl mock is deliberate: it pins translation keys as the observable contract while variants merge.
import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toastMock } = vi.hoisted(() => ({
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
  useAuth: () => ({ user: { id: "user-1" }, refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/actions/flashcard", () => ({
  getLessonFlashcards: vi.fn(),
  getLessonOrderingSentences: vi.fn(),
  getLessonClozeTestSentences: vi.fn(),
  getLessonOrderingWords: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: vi.fn(),
}));

import { OrderSentenceGame } from "../lesson-sentence-order";
import { OrderWordGame } from "../lesson-sentence-order-word";

type Difficulty = "easy" | "medium" | "hard";

// Segment runs from 2 s to 14 s; the hint must stop at 14 via timeupdate.
const sentenceGroup = {
  id: "group-1",
  articleId: "article-1",
  articleTitle: "Test Article",
  flashcardSentence: "Dogs bark.",
  correctOrder: ["Dogs bark.", "Cats meow."],
  sentences: [
    {
      id: "s1",
      text: "Dogs bark.",
      audioUrl: "/audio/full.mp3",
      startTime: 2,
      endTime: 8,
    },
    {
      id: "s2",
      text: "Cats meow.",
      audioUrl: "/audio/full.mp3",
      startTime: 10,
      endTime: 14,
    },
  ],
  difficulty: "easy" as Difficulty,
  startIndex: 0,
  flashcardIndex: 0,
};

const wordGroup = {
  id: "word-group-1",
  articleId: "article-1",
  articleTitle: "Animals",
  sentence: "The cat sat on the mat.",
  correctOrder: ["The", "cat", "sat"],
  words: [
    { id: "w1", text: "The" },
    { id: "w2", text: "cat" },
    { id: "w3", text: "sat" },
  ],
  difficulty: "easy" as Difficulty,
};

let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;
let loadSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.restoreAllMocks();
  const proto = window.HTMLMediaElement.prototype;
  playSpy = vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  pauseSpy = vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  loadSpy = vi.spyOn(proto, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Moves the stubbed playback position of an audio element.
 * @param audio The hidden hint audio element.
 * @param seconds The playback position in seconds.
 */
function setPlaybackTime(audio: HTMLAudioElement, seconds: number): void {
  Object.defineProperty(audio, "currentTime", {
    value: seconds,
    configurable: true,
  });
}

/**
 * Starts the deck order game and arms its audio hint.
 * @param container The rendered container.
 * @returns The hidden hint audio element.
 */
function startOrderHint(container: HTMLElement): HTMLAudioElement {
  fireEvent.click(screen.getByRole("button", { name: "startGame" }));
  const audio = container.querySelector("audio");
  expect(audio).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "hints.audio" }));
  fireEvent.click(screen.getByRole("button", { name: "hints.playOrder" }));
  return audio as HTMLAudioElement;
}

describe("lesson game audio timeupdate behavior", () => {
  it("stops the hint at the segment end on timeupdate and never double-fires via the fallback", async () => {
    vi.useFakeTimers();
    const { container } = render(
      <OrderSentenceGame source="deck" sentences={[sentenceGroup]} />,
    );
    const audio = startOrderHint(container);

    expect(loadSpy).toHaveBeenCalled();
    expect(playSpy).not.toHaveBeenCalled();

    // canplaythrough starts playback and attaches the native timeupdate listener
    await act(async () => {
      audio.dispatchEvent(new window.Event("canplaythrough"));
    });
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Below the segment end the timeupdate must not stop playback
    await act(async () => {
      setPlaybackTime(audio, 13.99);
      audio.dispatchEvent(new window.Event("timeupdate"));
    });
    expect(pauseSpy).not.toHaveBeenCalled();

    const timersBeforeStop = vi.getTimerCount();

    // At the segment end the timeupdate stop fires
    await act(async () => {
      setPlaybackTime(audio, 14);
      audio.dispatchEvent(new window.Event("timeupdate"));
    });
    expect(pauseSpy.mock.calls.length).toBeGreaterThan(0);
    const pausesAtStop = pauseSpy.mock.calls.length;

    // The 10 s fallback timer was cleared together with the stop
    expect(vi.getTimerCount()).toBe(timersBeforeStop - 1);

    // Advancing past the fallback window causes no second stop
    await act(async () => {
      vi.advanceTimersByTime(11000);
    });
    expect(pauseSpy.mock.calls.length).toBe(pausesAtStop);

    // The timeupdate listener is gone: late events cannot re-stop the hint
    await act(async () => {
      setPlaybackTime(audio, 20);
      audio.dispatchEvent(new window.Event("timeupdate"));
    });
    expect(pauseSpy.mock.calls.length).toBe(pausesAtStop);
  });

  it("stops the audio through the 10 s fallback when no media events arrive and stays silent after unmount", async () => {
    vi.useFakeTimers();
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    process.on("uncaughtException", onUnhandled);
    try {
      const { container, unmount } = render(
        <OrderSentenceGame source="deck" sentences={[sentenceGroup]} />,
      );
      const timersBeforeStart = vi.getTimerCount();
      startOrderHint(container);

      const timersArmed = vi.getTimerCount();
      expect(playSpy).not.toHaveBeenCalled();

      // Just before the boundary the fallback must not have fired
      await act(async () => {
        vi.advanceTimersByTime(9999);
      });
      expect(pauseSpy).not.toHaveBeenCalled();

      // At 10 s the fallback stops the audio and clears its own timer
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(pauseSpy).toHaveBeenCalledTimes(1);
      expect(playSpy).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(timersArmed - 1);

      unmount();
      const pausesAfterUnmount = pauseSpy.mock.calls.length;
      const playsAfterUnmount = playSpy.mock.calls.length;

      // No pending hint timer survives: advancing time is inert after unmount
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });
      expect(pauseSpy.mock.calls.length).toBe(pausesAfterUnmount);
      expect(playSpy.mock.calls.length).toBe(playsAfterUnmount);
      // The game clock timer is cleared too: no game timer survives unmount
      expect(vi.getTimerCount()).toBe(timersBeforeStart);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
      process.off("uncaughtException", onUnhandled);
    }
  });

  it("ticks the game clock once per second while playing and freezes after unmount", async () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <OrderWordGame source="deck" sentences={[wordGroup]} />,
    );
    const timersBeforeStart = vi.getTimerCount();
    fireEvent.click(
      screen.getByRole("button", { name: "startScreen.startButton" }),
    );

    expect(screen.getByText("0:00")).toBeInTheDocument();
    // Exactly one pending timeout: the recursive one-second chain
    expect(vi.getTimerCount()).toBe(timersBeforeStart + 1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("0:01")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const clock = screen.getByText("0:02");
    expect(clock).toBeInTheDocument();
    expect(screen.queryByText("0:01")).not.toBeInTheDocument();

    // Capture the rendered value before unmount
    const frozenValue = clock.textContent;
    expect(frozenValue).toBe("0:02");

    unmount();

    // The recursive chain was cleared on unmount and cannot re-arm
    expect(vi.getTimerCount()).toBe(timersBeforeStart);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(vi.getTimerCount()).toBe(timersBeforeStart);

    // The captured clock value never advanced further
    expect(clock.textContent).toBe("0:02");
  });
});
