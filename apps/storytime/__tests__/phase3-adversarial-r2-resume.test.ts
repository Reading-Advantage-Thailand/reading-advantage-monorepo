// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 2: the pause/play/pause rhythm of the stop loop (findings F148,
 * F153).
 *
 * A terminal pause ends the loop and keeps a one-shot resume listener. This case drives a
 * rapid pause/play/pause sequence, then starts a new loop on the same element while the old
 * resume is still pending. The element must hold at most one timer at every step, the stale
 * resume must not bring the old loop back, and only the newest end may run the stop.
 */
import { describe, expect, it, vi } from "vitest";
import { stopAtMediaEnd } from "../lib/audio-seek";

describe("Phase 3 adversarial stop-loop rhythm", () => {
  it("a rapid pause/play/pause and a new loop during a pending resume keep one timer", () => {
    vi.useFakeTimers();
    try {
      const audio = document.createElement("audio");
      const firstStop = vi.fn();
      const secondStop = vi.fn();

      stopAtMediaEnd(audio, 0.5, firstStop);
      expect(vi.getTimerCount(), "the first loop arms one timer").toBe(1);

      audio.currentTime = 0.1;
      audio.dispatchEvent(new Event("pause"));
      expect(vi.getTimerCount(), "a terminal pause ends the loop").toBe(0);
      expect(firstStop, "the terminal pause runs the stop once").toHaveBeenCalledTimes(1);

      // A resume below the cut end re-arms the same loop (finding F148).
      audio.dispatchEvent(new Event("play"));
      expect(vi.getTimerCount(), "a resume below the cut end re-arms one timer").toBe(1);

      audio.dispatchEvent(new Event("pause"));
      expect(vi.getTimerCount(), "the second pause ends the loop again").toBe(0);
      expect(firstStop, "the second pause runs the stop a second time").toHaveBeenCalledTimes(2);

      // The new loop starts while the old one still holds a pending resume listener.
      stopAtMediaEnd(audio, 2, secondStop);
      expect(vi.getTimerCount(), "the new loop holds one timer").toBe(1);

      // The stale resume must not bring the old loop back beside the new one (finding F153).
      audio.dispatchEvent(new Event("play"));
      expect(
        vi.getTimerCount(),
        "a stale resume must not arm a second timer beside the new loop",
      ).toBe(1);

      // The clock passes the old cut end: the old loop must stay dead.
      audio.currentTime = 0.6;
      vi.advanceTimersByTime(10_000);
      expect(firstStop, "the replaced loop must not stop at its old end").toHaveBeenCalledTimes(2);
      expect(secondStop, "the new loop must not stop before its own end").not.toHaveBeenCalled();
      expect(vi.getTimerCount(), "the new loop re-arms below its end").toBe(1);

      // The clock reaches the newest end: only the newest stop runs.
      audio.currentTime = 2;
      vi.advanceTimersByTime(10_000);
      expect(secondStop, "the newest end must run the newest stop").toHaveBeenCalledTimes(1);
      expect(firstStop, "the old stop must not run at the newest end").toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount(), "the finished loop leaves no timer").toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
