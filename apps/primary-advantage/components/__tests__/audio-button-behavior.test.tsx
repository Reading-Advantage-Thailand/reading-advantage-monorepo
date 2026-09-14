// @vitest-environment jsdom
/**
 * Behavioral replacement for the audio-highlight static case "has no
 * setInterval in audio-button.tsx". Rendering the button and driving a full
 * play/stop cycle must never arm a polling interval: the shared hook stops
 * segments on the native timeupdate event. The sibling static case ("thin
 * button over useAudioSegment") is already covered by the AudioButton
 * play/pause render tests in aria-labels-i18n.test.tsx; the load()-on-change
 * and pause-on-unmount cases are covered by
 * hooks/__tests__/use-audio-segment.test.tsx.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AudioButton from "../audio-button";
import { renderWithMessages, testMessages } from "./helpers/render-with-messages";

const playAudio = testMessages.en.Components.playAudio;
const stopAudio = testMessages.en.Components.stopAudio;

let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;
let loadSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  const proto = window.HTMLMediaElement.prototype;
  playSpy = vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  pauseSpy = vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  loadSpy = vi.spyOn(proto, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AudioButton uses no polling interval", () => {
  it("plays and stops a segment without ever calling setInterval", async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const { container } = renderWithMessages(
      <AudioButton audioUrl="/audio/a.mp3" startTimestamp={0} endTimestamp={2} />,
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;
    const button = container.querySelector("button") as HTMLButtonElement;

    fireEvent.click(button);
    await vi.waitFor(() => expect(button).toHaveAttribute("aria-label", stopAudio));
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute("aria-label", stopAudio);

    Object.defineProperty(audio, "currentTime", {
      value: 5,
      configurable: true,
    });
    fireEvent.timeUpdate(audio);
    await vi.waitFor(() => expect(button).toHaveAttribute("aria-label", playAudio));
    expect(pauseSpy).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10000);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
