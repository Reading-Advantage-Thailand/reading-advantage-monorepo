// @vitest-environment jsdom
/** FR-9: the sound set plays Web Audio tones, is silent while muted, and never throws. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSoundMuted, playSound, setSoundMuted, SOUND_CHANGE_EVENT, soundMutedKey } from "../sounds";

const started: number[] = [];

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => {});
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn((at: number) => started.push(at)),
      stop: vi.fn(),
    };
  }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  }
}

beforeEach(() => {
  started.length = 0;
  window.localStorage.clear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
});
afterEach(() => vi.unstubAllGlobals());

describe("sounds", () => {
  it("plays one oscillator per tone of the sound", () => {
    playSound("correct", "s1");
    expect(started).toHaveLength(3);
    // The tones start one after the other.
    expect(started).toEqual([...started].sort((a, b) => a - b));
  });

  it("is silent for a student who muted sound, and the setting is per student", () => {
    setSoundMuted("s1", true);
    expect(isSoundMuted("s1")).toBe(true);
    expect(isSoundMuted("s2")).toBe(false);
    expect(window.localStorage.getItem(soundMutedKey("s1"))).toBe("1");
    playSound("select", "s1");
    expect(started).toHaveLength(0);
    playSound("select", "s2");
    expect(started).toHaveLength(1);
  });

  it("tells listeners when the setting changes", () => {
    const heard = vi.fn();
    window.addEventListener(SOUND_CHANGE_EVENT, heard);
    setSoundMuted("s1", true);
    setSoundMuted("s1", false);
    expect(heard).toHaveBeenCalledTimes(2);
    expect(isSoundMuted("s1")).toBe(false);
  });

  it("does nothing in a browser without the Web Audio API", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(() => playSound("celebration", "s1")).not.toThrow();
    expect(started).toHaveLength(0);
  });
});
