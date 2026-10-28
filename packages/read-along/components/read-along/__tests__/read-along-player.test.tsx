// @vitest-environment jsdom
// The moved Primary player test (plan task 2.3). The package holds no i18n and no app chrome: the
// host passes the labels and the chrome, and this test proves both default and supplied forms.
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  nextSpeed,
  READ_ALONG_SPEEDS,
  ReadAlongPlayer,
  type ReadAlongPlayerChrome,
} from "../read-along-player";

afterEach(cleanup);

/** Renders the player with spies; the sentence index and the count are the arguments. */
function setup(props: Partial<Parameters<typeof ReadAlongPlayer>[0]> = {}) {
  const spies = {
    onPlayPause: vi.fn(),
    onPlaySentence: vi.fn(),
    onSpeedChange: vi.fn(),
  };
  render(
    <ReadAlongPlayer playing={false} speed={1} sentenceIndex={2} sentenceCount={5} {...spies} {...props} />,
  );
  return spies;
}

describe("ReadAlongPlayer", () => {
  it("plays from sentence 2, 3, or 4 for Previous, Replay, and Next while sentence 3 plays", () => {
    const { onPlaySentence } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Previous sentence" }));
    fireEvent.click(screen.getByRole("button", { name: "Replay this sentence" }));
    fireEvent.click(screen.getByRole("button", { name: "Next sentence" }));
    expect(onPlaySentence.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
  });

  it("disables Previous on the first sentence and Next on the last", () => {
    setup({ sentenceIndex: 0 });
    expect(screen.getByRole("button", { name: "Previous sentence" })).toBeDisabled();
    cleanup();
    setup({ sentenceIndex: 4 });
    expect(screen.getByRole("button", { name: "Next sentence" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous sentence" })).toBeEnabled();
  });

  it("starts at the first sentence when no sentence is current", () => {
    const { onPlaySentence } = setup({ sentenceIndex: -1 });
    expect(screen.getByRole("button", { name: "Previous sentence" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Replay this sentence" }));
    fireEvent.click(screen.getByRole("button", { name: "Next sentence" }));
    expect(onPlaySentence.mock.calls.map((c) => c[0])).toEqual([0, 0]);
  });

  it("shows Play when paused and Pause when playing", () => {
    const { onPlayPause } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);
    cleanup();
    setup({ playing: true });
    expect(screen.getByRole("button", { name: "Stop audio" })).toBeInTheDocument();
  });

  it("goes to the next speed on one tap and wraps around (controlled)", () => {
    expect(READ_ALONG_SPEEDS).toEqual([0.75, 1, 1.25]);
    expect(nextSpeed(0.75)).toBe(1);
    expect(nextSpeed(1.25)).toBe(0.75);
    expect(nextSpeed(1.5)).toBe(1);
    const { onSpeedChange } = setup({ speed: 1 });
    const button = screen.getByRole("button", { name: "Speed 1 times. Change speed" });
    expect(button).toHaveTextContent("1×");
    fireEvent.click(button);
    expect(onSpeedChange).toHaveBeenCalledWith(1.25);
    expect(button).toHaveTextContent("1×");
  });

  it("uses only the speeds it gets", () => {
    expect(nextSpeed(0.75, [0.75, 1])).toBe(1);
    expect(nextSpeed(1, [0.75, 1])).toBe(0.75);
    expect(nextSpeed(1.25, [0.75, 1])).toBe(1);
    const { onSpeedChange } = setup({ speed: 1, speeds: [0.75, 1] });
    fireEvent.click(screen.getByRole("button", { name: "Speed 1 times. Change speed" }));
    expect(onSpeedChange).toHaveBeenCalledWith(0.75);
  });

  it("takes a class name that places it on a page with no bottom bar", () => {
    setup({ className: "bottom-0" });
    expect(document.querySelector("[data-player]")).toHaveClass("bottom-0");
  });

  it("gives every control a 48 px target (56 px for play)", () => {
    setup();
    for (const name of ["Previous sentence", "Replay this sentence", "Next sentence"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("size-12");
    }
    expect(screen.getByRole("button", { name: "Play audio" })).toHaveClass("size-14");
    expect(screen.getByRole("button", { name: "Speed 1 times. Change speed" })).toHaveClass("min-h-12", "min-w-14");
  });

  it("takes the labels and the chrome of the host, and no app path", () => {
    const chrome: ReadAlongPlayerChrome = {
      Panel: ({ className, children }) => <section data-panel={className}>{children}</section>,
      Sign: ({ className, children }) => <b data-sign={className}>{children}</b>,
      buttonClassName: (kind) => `host-${kind}`,
    };
    setup({
      labels: {
        previous: "ก่อนหน้า",
        replay: "ฟังอีกครั้ง",
        next: "ถัดไป",
        play: "เปิดเสียง",
        stop: "หยุดเสียง",
        speed: (speed) => `ความเร็ว ${speed}`,
      },
      chrome,
    });
    expect(screen.getByRole("button", { name: "ก่อนหน้า" })).toHaveClass("host-wood");
    expect(screen.getByRole("button", { name: "เปิดเสียง" })).toHaveClass("host-gold");
    expect(screen.getByRole("button", { name: "ความเร็ว 1" })).toBeInTheDocument();
    expect(document.querySelector("[data-panel]")).toBeInTheDocument();
    expect(document.querySelector("[data-sign]")).toHaveTextContent("1×");
  });
});
