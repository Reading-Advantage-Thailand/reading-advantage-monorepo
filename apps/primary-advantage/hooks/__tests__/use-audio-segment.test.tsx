// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useAudioSegment } from "@/hooks/useAudioSegment";

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

function Harness({
  url,
  start,
  end,
  onHook,
}: {
  url: string;
  start: number;
  end: number;
  onHook: (h: ReturnType<typeof useAudioSegment>) => void;
}) {
  const hook = useAudioSegment(url, start, end);
  onHook(hook);
  return React.createElement("audio", {
    ref: hook.audioRef,
    src: url,
    "data-testid": "clip",
  });
}

function renderHarness(url = "a.mp3", start = 2, end = 8) {
  let hook!: ReturnType<typeof useAudioSegment>;
  const utils = render(
    React.createElement(Harness, {
      url,
      start,
      end,
      onHook: (h) => {
        hook = h;
      },
    }),
  );
  const audio = utils.getByTestId("clip") as HTMLAudioElement;
  return { ...utils, audio, hook: () => hook };
}

describe("useAudioSegment", () => {
  it("stops at the end timestamp on timeupdate", async () => {
    const { audio, hook } = renderHarness("a.mp3", 2, 8);
    await act(async () => {
      await hook().playSegment();
    });
    expect(playSpy.mock.calls.length).toBe(1);
    await act(async () => {
      Object.defineProperty(audio, "currentTime", {
        value: 7.9,
        configurable: true,
      });
      audio.dispatchEvent(new window.Event("timeupdate"));
    });
    expect(pauseSpy.mock.calls.length).toBe(1);
  });

  it("does not stop at once when the end timestamp is zero", async () => {
    const { audio, hook } = renderHarness("a.mp3", 0, 0);
    await act(async () => {
      await hook().playSegment();
    });
    await act(async () => {
      Object.defineProperty(audio, "currentTime", {
        value: 30,
        configurable: true,
      });
      audio.dispatchEvent(new window.Event("timeupdate"));
    });
    expect(pauseSpy.mock.calls.length).toBe(0);
  });

  it("calls load() when the URL changes", () => {
    const { rerender } = renderHarness("a.mp3", 0, 0);
    const callsBefore = loadSpy.mock.calls.length;
    rerender(
      React.createElement(Harness, {
        url: "b.mp3",
        start: 0,
        end: 0,
        onHook: () => undefined,
      }),
    );
    expect(loadSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("pauses the element on unmount", () => {
    const { unmount } = renderHarness("a.mp3", 0, 0);
    unmount();
    expect(pauseSpy.mock.calls.length).toBe(1);
  });
});
