// @vitest-environment jsdom
/** FR-9: the mute switch stores the choice per student and names its action. */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";
import { soundMutedKey } from "@/lib/sounds";

import { SoundProvider } from "@/hooks/use-sound";
import { SoundToggle } from "../sound-toggle";

/** The toggle inside the shell provider for student s1. */
const toggle = <SoundProvider userId="s1"><SoundToggle /></SoundProvider>;

const en = testMessages.en.AppShell;

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("AudioContext", undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SoundToggle", () => {
  it("starts with sound on, mutes on tap, and stores the choice for the student", () => {
    render(withMessages(toggle));
    const button = screen.getByRole("button", { name: en.soundOff });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: en.soundOn })).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(soundMutedKey("s1"))).toBe("1");
  });

  it("reads the stored choice of the student", () => {
    window.localStorage.setItem(soundMutedKey("s1"), "1");
    render(withMessages(toggle));
    expect(screen.getByRole("button", { name: en.soundOn })).toBeInTheDocument();
  });

  it("uses Thai names", () => {
    render(withMessages(toggle, "th"));
    expect(screen.getByRole("button", { name: testMessages.th.AppShell.soundOff })).toBeInTheDocument();
  });
});
