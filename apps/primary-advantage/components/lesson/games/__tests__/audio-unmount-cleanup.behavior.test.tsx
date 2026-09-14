// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getLessonClozeTestSentencesMock, updateUserActivityMock, authRefreshMock, toastMock } =
  vi.hoisted(() => ({
    getLessonClozeTestSentencesMock: vi.fn(),
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
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/actions/flashcard", () => ({
  getLessonClozeTestSentences: getLessonClozeTestSentencesMock,
}));

vi.mock("@/actions/user", () => ({
  updateUserActivity: updateUserActivityMock,
}));

import { SentenceClozeGame } from "../lesson-sentence-cloze-test";

const ARTICLE_ID = "article-1";

const clozeFixture = {
  id: "cloze-1",
  articleId: ARTICLE_ID,
  articleTitle: "Cloze Audio Article",
  sentence: "The dog is very fast.",
  blanks: [],
  audioUrl: "/audio/cloze.mp3",
  difficulty: "medium" as const,
};

let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;
let loadSpy: ReturnType<typeof vi.spyOn>;
let hintAudios: HTMLAudioElement[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lacks these pointer/DOM APIs that Radix Select may call.
  Element.prototype.scrollIntoView = () => undefined;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;

  const proto = window.HTMLMediaElement.prototype;
  playSpy = vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  pauseSpy = vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  loadSpy = vi.spyOn(proto, "load").mockImplementation(() => undefined);

  // The cloze game builds its hint player with `new Audio()` (never rendered
  // into the DOM), so hand it a constructible stub that hands back a detached
  // real element we can drive.
  hintAudios = [];
  vi.stubGlobal(
    "Audio",
    class StubbedAudio {
      constructor() {
        const el = document.createElement("audio");
        hintAudios.push(el);
        return el;
      }
    },
  );

  getLessonClozeTestSentencesMock.mockResolvedValue({
    clozeTests: [clozeFixture],
    totalTests: 1,
  });
  updateUserActivityMock.mockResolvedValue(undefined);
  authRefreshMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("SentenceClozeGame hint audio unmount cleanup", () => {
  it("pauses the hint audio on unmount and the 10s fallback timer can never fire afterwards", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      // Load the lesson data under real timers (findByRole waits on it).
      const { container, unmount } = render(
        <SentenceClozeGame source="lesson" articleId={ARTICLE_ID} />,
      );
      const startButton = await screen.findByRole("button", {
        name: "buttons.startGame",
      });

      vi.useFakeTimers();
      const timersBaseline = vi.getTimerCount();

      // Start the game (arms the 1s game clock) and open the audio hint.
      fireEvent.click(startButton);
      fireEvent.click(screen.getByRole("button", { name: "hints.audio" }));
      const timersBeforePlay = vi.getTimerCount();

      // Start playback; only the loading event that begins playback is
      // fired, so no completion media event and the 10s fallback stays armed.
      fireEvent.click(screen.getByRole("button", { name: "hints.play" }));
      const audio = hintAudios[0];
      expect(audio).toBeDefined();
      expect(loadSpy).toHaveBeenCalled();
      expect(playSpy).not.toHaveBeenCalled();
      await act(async () => {
        audio.dispatchEvent(new window.Event("loadeddata"));
      });
      expect(playSpy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(timersBeforePlay + 1);

      // Capture console.error around the unmount: no React act or
      // state-update-on-unmounted warning may appear.
      const consoleErrors: unknown[][] = [];
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation((...args: unknown[]) => {
          consoleErrors.push(args);
        });

      unmount();

      // The unmount cleanup invoked the registered stop hook: the hint
      // player paused and the fallback timeout was disarmed.
      expect(pauseSpy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(timersBaseline);

      // Long past the 10s fallback window nothing fires anymore.
      await act(async () => {
        vi.advanceTimersByTime(11000);
      });
      errorSpy.mockRestore();

      expect(pauseSpy).toHaveBeenCalledTimes(1);
      expect(playSpy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(timersBaseline);
      // No post-unmount toast or failure surfaced.
      expect(toastMock.error).not.toHaveBeenCalled();
      expect(toastMock.success).not.toHaveBeenCalled();
      expect(toastMock.info).not.toHaveBeenCalled();
      // No React act / state-update warnings, no unexpected errors.
      expect(consoleErrors).toEqual([]);
      // The playback promise settled without an unhandled rejection.
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
