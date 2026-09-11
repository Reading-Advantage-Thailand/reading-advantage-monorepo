/**
 * Behavioral tests for the `audio_highlight_correctness_20260911` track.
 *
 * The suite is expected to FAIL before the Phase 3 edits and PASS after.
 * HTMLAudioElement is mocked because jsdom does not implement playback.
 */

import * as React from "react";
import { render, renderHook, act, screen, fireEvent, waitFor } from "@testing-library/react";
import useAudio, { Sentence } from "@/hooks/use-audio";
import useAudioSegment from "@/hooks/use-audio-segment";
import ChapterContent from "@/components/stories-chapter-content";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

/** A minimal fake HTMLAudioElement with an ordered call log. */
type FakeAudio = {
  currentTime: number;
  playbackRate: number;
  paused: boolean;
  load: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  _listeners: Map<string, Array<(event?: unknown) => void>>;
  _calls: string[];
};

function createFakeAudio(): FakeAudio {
  const listeners = new Map<string, Array<(event?: unknown) => void>>();
  const calls: string[] = [];
  const audio = {
    currentTime: 0,
    playbackRate: 1,
    paused: true,
    _listeners: listeners,
    _calls: calls,
    load: jest.fn(() => {
      calls.push("load");
    }),
    play: jest.fn(() => {
      calls.push("play");
      audio.paused = false;
      return Promise.resolve();
    }),
    pause: jest.fn(() => {
      calls.push("pause");
      audio.paused = true;
    }),
    addEventListener: jest.fn((type: string, handler: (event?: unknown) => void) => {
      calls.push(`add:${type}`);
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type)!.push(handler);
    }),
    removeEventListener: jest.fn((type: string, handler: (event?: unknown) => void) => {
      calls.push(`remove:${type}`);
      const handlers = listeners.get(type) ?? [];
      const index = handlers.indexOf(handler);
      if (index >= 0) handlers.splice(index, 1);
    }),
  };
  let srcValue = "";
  Object.defineProperty(audio, "src", {
    configurable: true,
    get: () => srcValue,
    set: (value: string) => {
      srcValue = value;
      calls.push("src:set");
    },
  });
  return audio as unknown as FakeAudio;
}

/** Fires every registered listener of `type` on the fake audio element. */
function fireAudioEvent(fake: FakeAudio, type: string) {
  act(() => {
    (fake._listeners.get(type) ?? []).slice().forEach((handler) => handler());
  });
}

const SENTENCES: Sentence[] = [
  { sentence: "One.", index: 0, startTime: 0, endTime: 2, audioUrl: "https://x/0.mp3" },
  { sentence: "Two.", index: 1, startTime: 2.5, endTime: 4.5, audioUrl: "https://x/1.mp3" },
  { sentence: "Three.", index: 2, startTime: 5, endTime: 7, audioUrl: "https://x/2.mp3" },
];

/** Renders useAudio and attaches a fake audio element to its ref. */
function renderUseAudio(options?: { hasTimepoints?: boolean }) {
  const rendered = renderHook(() => useAudio(SENTENCES, options));
  const fake = createFakeAudio();
  act(() => {
    (rendered.result.current.audioRef as React.MutableRefObject<HTMLAudioElement | null>).current =
      fake as unknown as HTMLAudioElement;
  });
  return { ...rendered, fake };
}

describe("useAudio speed switching", () => {
  it("assigns src once per track change", () => {
    const { result, fake } = renderUseAudio({ hasTimepoints: true });

    act(() => {
      result.current.setCurrentAudioIndex(1);
    });

    expect(fake._calls.filter((call) => call === "src:set")).toHaveLength(1);
    expect(fake.load).toHaveBeenCalledTimes(1);
  });

  it("sets playbackRate on speed change without re-assigning src", () => {
    const { result, fake } = renderUseAudio({ hasTimepoints: true });

    act(() => {
      result.current.setCurrentAudioIndex(1);
    });
    const srcAssignments = fake._calls.filter((call) => call === "src:set").length;
    const loads = fake.load.mock.calls.length;

    act(() => {
      result.current.handleSpeedTime("1.5");
    });

    expect(fake.playbackRate).toBe(1.5);
    expect(fake._calls.filter((call) => call === "src:set")).toHaveLength(srcAssignments);
    expect(fake.load.mock.calls.length).toBe(loads);
  });

  it("applies the current speed when metadata loads after a track change", () => {
    const { result, fake } = renderUseAudio({ hasTimepoints: true });

    act(() => {
      result.current.handleSpeedTime("2");
      result.current.setCurrentAudioIndex(1);
    });
    fireAudioEvent(fake, "loadedmetadata");

    expect(fake.currentTime).toBe(2.5);
    expect(fake.playbackRate).toBe(2);
  });
});

describe("useAudio single sentence-advance path", () => {
  it("advances only via onEnded when timepoints exist", () => {
    const { result, fake } = renderUseAudio({ hasTimepoints: true });

    act(() => {
      result.current.setCurrentAudioIndex(1);
    });

    // timeupdate past the sentence end must not advance.
    fake.currentTime = 4.6;
    act(() => {
      result.current.handleTimeUpdate();
    });
    expect(result.current.currentAudioIndex).toBe(1);

    // The ended event advances exactly once.
    act(() => {
      result.current.handleAudioEnded();
    });
    expect(result.current.currentAudioIndex).toBe(2);
  });

  it("advances only via timeupdate in fallback timing mode", () => {
    const { result, fake } = renderUseAudio({ hasTimepoints: false });

    act(() => {
      result.current.setCurrentAudioIndex(1);
    });

    // The ended event must not advance in fallback mode.
    act(() => {
      result.current.handleAudioEnded();
    });
    expect(result.current.currentAudioIndex).toBe(1);

    // timeupdate past the sentence end advances exactly once.
    fake.currentTime = 4.6;
    act(() => {
      result.current.handleTimeUpdate();
    });
    expect(result.current.currentAudioIndex).toBe(2);
  });
});

describe("useAudio playFromIndex", () => {
  it("attaches canplaythrough before load()", () => {
    const { result, fake } = renderUseAudio({ hasTimepoints: true });

    act(() => {
      result.current.playFromIndex(1);
    });

    const addIndex = fake._calls.indexOf("add:canplaythrough");
    const loadIndex = fake._calls.indexOf("load");
    expect(addIndex).toBeGreaterThanOrEqual(0);
    expect(loadIndex).toBeGreaterThan(addIndex);
  });

  it("seeks to the sentence start and plays on canplaythrough, then removes the listener", () => {
    const { result, fake } = renderUseAudio({ hasTimepoints: true });

    act(() => {
      result.current.playFromIndex(1);
    });
    fireAudioEvent(fake, "canplaythrough");

    expect(fake.currentTime).toBe(2.5);
    expect(fake.play).toHaveBeenCalled();
    expect(fake._listeners.get("canplaythrough")).toHaveLength(0);
  });
});

describe("useAudioSegment", () => {
  function renderSegment() {
    const rendered = renderHook(
      ({ url }: { url: string }) => useAudioSegment(url, 1, 3),
      { initialProps: { url: "a.mp3" } }
    );
    const fake = createFakeAudio();
    act(() => {
      (rendered.result.current.audioRef as React.MutableRefObject<HTMLAudioElement | null>).current =
        fake as unknown as HTMLAudioElement;
    });
    // Change the URL so the effect re-runs with the audio element attached.
    rendered.rerender({ url: "b.mp3" });
    return { ...rendered, fake };
  }

  it("uses timeupdate, not setInterval", () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval");
    renderSegment();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it("stops at the segment end on timeupdate", () => {
    const { result, fake } = renderSegment();

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(true);

    fake.currentTime = 3.1;
    fireAudioEvent(fake, "timeupdate");

    expect(fake.pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it("pause stops the clip instead of restarting it", () => {
    const { result, fake } = renderSegment();

    act(() => {
      result.current.toggle();
    });
    const playCount = fake.play.mock.calls.length;

    act(() => {
      result.current.toggle();
    });

    expect(fake.play.mock.calls.length).toBe(playCount);
    expect(fake.pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it("removes listeners and pauses audio on unmount", () => {
    const { unmount, fake } = renderSegment();

    unmount();

    expect(fake.removeEventListener).toHaveBeenCalledWith("timeupdate", expect.any(Function));
    expect(fake.removeEventListener).toHaveBeenCalledWith("ended", expect.any(Function));
    expect(fake.pause).toHaveBeenCalled();
  });
});

describe("stories save-to-flashcard", () => {
  const story = {
    storyId: "story-1",
    chapterNumber: "1",
    ra_Level: 1,
    cefr_level: "A1",
    type: "story",
    genre: "fiction",
    subgenre: "adventure",
    totalChapters: 1,
    storyBible: {},
    chapter: {
      title: "Chapter 1",
      passage: "One. Two. Three.",
      summary: "",
      "image-description": "",
      rating: 0,
      user_rating_count: 0,
      analysis: {
        wordCount: 3,
        averageSentenceLength: 1,
        vocabulary: { uniqueWords: 3, complexWords: 0, targetWordsUsed: [] },
        grammarStructures: [],
        readabilityScore: 0,
      },
      questions: [],
    },
    timepoints: [
      { file: "f1.mp3", index: 0, markName: "m0", sentences: "One.", timeSeconds: 0 },
      { file: "f2.mp3", index: 1, markName: "m1", sentences: "Two.", timeSeconds: 2 },
      { file: "f3.mp3", index: 2, markName: "m2", sentences: "Three.", timeSeconds: 4 },
    ],
  };

  const fetchCalls: Array<{ url: string; body?: unknown }> = [];

  beforeEach(() => {
    fetchCalls.length = 0;
    (global as any).fetch = jest.fn(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.url;
      const body = init?.body ? JSON.parse(init.body) : undefined;
      fetchCalls.push({ url, body });
      if (url.includes("stories-translate")) {
        return {
          ok: true,
          json: async () => ({
            message: "ok",
            translated_sentences: ["uno", "dos", "tres"],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
  });

  it("awaits translation then saves all four languages in one click", async () => {
    render(
      <ChapterContent
        story={story as never}
        chapterNumber="1"
        userId="user-1"
      />,
    );

    // Select the second sentence.
    fireEvent.click(screen.getByText("Two."));
    // Open the context menu and save with a single click.
    fireEvent.contextMenu(screen.getByText("Two."));
    const saveItem = await screen.findByText("Save to flashcard");
    fireEvent.click(saveItem);

    await waitFor(() => {
      const saveCall = fetchCalls.find((call) => call.url.includes("/users/sentences/"));
      expect(saveCall).toBeDefined();
    });

    const translateCalls = fetchCalls.filter((call) =>
      call.url.includes("stories-translate"),
    );
    const saveCall = fetchCalls.find((call) => call.url.includes("/users/sentences/"))!;

    // One click produced exactly one save request.
    expect(
      fetchCalls.filter((call) => call.url.includes("/users/sentences/")),
    ).toHaveLength(1);

    // The four language translations were fetched before the save.
    expect(translateCalls).toHaveLength(4);
    const requestedLanguages = translateCalls.map(
      (call) => (call.body as { targetLanguage: string }).targetLanguage,
    );
    expect(requestedLanguages).toEqual(
      expect.arrayContaining(["th", "zh-CN", "zh-TW", "vi"]),
    );
    fetchCalls.forEach((call, index) => {
      if (call.url.includes("/users/sentences/")) {
        expect(index).toBeGreaterThan(
          fetchCalls.findIndex((candidate) => candidate.url.includes("stories-translate")),
        );
      }
    });

    // The saved translation object carries all four languages.
    expect((saveCall.body as { translation: Record<string, string> }).translation).toEqual({
      th: "dos",
      "zh-CN": "dos",
      "zh-TW": "dos",
      vi: "dos",
    });
  });
});
