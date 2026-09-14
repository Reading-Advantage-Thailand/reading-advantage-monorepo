// @vitest-environment jsdom
// The identity next-intl mock pins translation keys as the observable
// contract for this game flow test.
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
  difficulty: "easy" as const,
  startIndex: 0,
  flashcardIndex: 0,
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
 * Starts the order game and arms its audio hint.
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

describe("OrderSentenceGame unmount audio cleanup", () => {
  it("pauses the hint audio and clears the fallback timer on unmount mid-play", async () => {
    vi.useFakeTimers();
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      const { container, unmount } = render(
        <OrderSentenceGame source="deck" sentences={[sentenceGroup]} />,
      );
      const timersBeforeStart = vi.getTimerCount();
      const audio = startOrderHint(container);
      expect(audio).not.toBeNull();

      // Playback armed: source set, media loading, no media event arrived yet
      // so neither play nor pause has fired.
      expect(loadSpy).toHaveBeenCalled();
      expect(playSpy).not.toHaveBeenCalled();
      expect(pauseSpy).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBeGreaterThan(timersBeforeStart);

      unmount();

      // The unmount cleanup ran the registered hint stop: audio paused and
      // the 10 s fallback timeout disarmed.
      expect(pauseSpy.mock.calls.length).toBeGreaterThan(0);
      expect(vi.getTimerCount()).toBe(timersBeforeStart);

      // Late media events and the passed fallback window stay inert.
      await act(async () => {
        audio.dispatchEvent(new window.Event("canplaythrough"));
        vi.advanceTimersByTime(30000);
      });
      expect(playSpy).not.toHaveBeenCalled();
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
