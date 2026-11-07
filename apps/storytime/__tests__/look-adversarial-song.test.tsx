// @vitest-environment jsdom
/**
 * Adversarial song lead-in cases for the Storytime P1.6 round.
 *
 * S1 pushes the lead-in to the schema maximum (30 s) and checks all 45 sample
 * points. S2 uses a lead-in larger than the sung line and a first line at 0 s:
 * no line may light below the lead-in, which kills a `Math.max(0, t - lead)`
 * clamp. S3 forces a negative `currentTime`: no line, no crash, and a lit line
 * must clear.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;

const labels = { play: "Play", pause: "Pause" };

interface LineTime {
  startTime: number;
  endTime: number;
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Sets the phone media query result of the next render. */
function setPhone(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

/** Creates a clone of the shipped week with the given video lead-in. */
function leadWeek(lead: number | undefined): StorytimeWeek {
  const copy = structuredClone(shipped);
  const song = copy.song as unknown as { videoLeadInSeconds?: number };
  if (lead === undefined) delete song.videoLeadInSeconds;
  else song.videoLeadInSeconds = lead;
  return copy;
}

/** Returns the shipped line timings. */
function shippedTimes(): LineTime[] {
  return (shipped.song!.times as unknown as LineTime[]) ?? [];
}

/** The media URL map of one song. */
function mediaUrls(song: NonNullable<StorytimeWeek["song"]>): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const file of [song.audio, song.video, song.videoPhone, song.poster, song.posterPhone]) {
    if (file) urls[file] = `https://media.example/${file}`;
  }
  return urls;
}

/** Loads the client song view with a named assertion when the module is missing. */
async function loadSong() {
  const modulePath = "../app/[locale]/st/[level]/[week]/song";
  return (await import(/* @vite-ignore */ modulePath)).StorytimeSong as ComponentType<{
    song: NonNullable<StorytimeWeek["song"]>;
    mediaUrls?: Record<string, string>;
    labels?: typeof labels;
  }>;
}

/** Renders one parsed song and returns its container and media element. */
async function renderSong(options: { lead?: number; phone?: boolean }) {
  const Song = await loadSong();
  setPhone(options.phone ?? false);
  const week = leadWeek(options.lead);
  const song = weekSchema.parse(week).song!;
  const view = render(<Song song={song} mediaUrls={mediaUrls(song)} labels={labels} />);
  const media = view.container.querySelector<HTMLMediaElement>("video, audio");
  expect(media, "the song view must render its media element").not.toBeNull();
  return { ...view, song, media: media! };
}

/** Returns the active line index, or null. */
function activeLine(container: HTMLElement): number | null {
  const active = container.querySelector('li[aria-current="true"]');
  return active ? Number(active.getAttribute("data-line-index")) : null;
}

/** Sets the media clock and sends the timeupdate. */
function atTime(media: HTMLMediaElement, time: number): void {
  media.currentTime = time;
  fireEvent.timeUpdate(media);
}

describe("adversarial song lead-in (S1-S3)", () => {
  it("S1 the maximum lead-in of 30 s lights the right line at all 45 points", async () => {
    const lead = 30;
    const times = shippedTimes();
    expect(`lines_checked=${times.length}`).toBe("lines_checked=15");
    expect(`points_checked=${times.length * 3}`).toBe("points_checked=45");
    const { container, media, unmount } = await renderSong({ lead });
    expect(media.tagName, "the regular view must be a video").toBe("VIDEO");
    let failures = 0;
    let firstFailure = "";
    for (const [index, line] of times.entries()) {
      const points = [line.startTime + 0.01, (line.startTime + line.endTime) / 2, line.endTime - 0.01];
      for (const point of points) {
        atTime(media, lead + point);
        const active = activeLine(container);
        if (active !== index) {
          failures += 1;
          if (!firstFailure) {
            firstFailure = `line ${index} must be active at video time ${lead} + ${point.toFixed(2)}, active line was ${active}`;
          }
        }
      }
    }
    expect(
      `points_failed=${failures}`,
      `every sampled point must light its own line at lead 30; first failure: ${firstFailure}`,
    ).toBe("points_failed=0");
    unmount();
  });

  it("S2 a lead-in beyond the first line lights nothing below the lead-in", async () => {
    // A first line at song time 0 makes the clamp mutant observable:
    // `Math.max(0, t - lead)` lights line 0 through the whole lead-in.
    const lead = 30;
    const { container, media, song, unmount } = await renderSong({ lead });
    (song as unknown as { times: unknown[] }).times = [
      { sentence: "Hello", startTime: 0, endTime: 2, words: [] },
      { sentence: "World", startTime: 2, endTime: 4, words: [] },
    ];
    (song as unknown as { lines: unknown[] }).lines = [
      { text: "Hello", gesture: "wave" },
      { text: "World", gesture: "point" },
    ];
    // Re-render is not needed: the component read `times` at render, so build a
    // fresh view with the hostile song instead.
    unmount();
    const Song = await loadSong();
    const hostile = structuredClone(song) as NonNullable<StorytimeWeek["song"]>;
    const view = render(<Song song={hostile} mediaUrls={mediaUrls(hostile)} labels={labels} />);
    const hostileMedia = view.container.querySelector<HTMLMediaElement>("video, audio")!;
    let belowFailures = 0;
    for (const probe of [0.5, 5, 15, 29.9]) {
      atTime(hostileMedia, probe);
      if (activeLine(view.container) !== null) belowFailures += 1;
    }
    expect(
      `below_lead_failures=${belowFailures}`,
      "no line may light while the video still runs its lead-in (kills the Math.max clamp)",
    ).toBe("below_lead_failures=0");
    atTime(hostileMedia, lead + 0.5);
    expect(activeLine(view.container), "line 0 must light 0.5 s into the song").toBe(0);
    atTime(hostileMedia, lead + 2.5);
    expect(activeLine(view.container), "line 1 must light 2.5 s into the song").toBe(1);
    atTime(hostileMedia, lead + 4.5);
    expect(activeLine(view.container), "no line may light past the last line").toBeNull();
    view.unmount();
  });

  it("S3 a negative currentTime lights no line, clears a lit line, and never throws", async () => {
    const { container, media, unmount } = await renderSong({ lead: 3 });
    const first = shippedTimes()[0]!;
    atTime(media, 3 + (first.startTime + first.endTime) / 2);
    expect(activeLine(container), "line 0 must be lit before the negative probe").toBe(0);

    // jsdom may clamp a direct write, so the instance property forces the value.
    Object.defineProperty(media, "currentTime", { configurable: true, get: () => -1 });
    expect(() => fireEvent.timeUpdate(media), "a negative time must not throw").not.toThrow();
    expect(activeLine(container), "a negative song time must clear the lit line").toBeNull();
    unmount();

    // The audio fallback (no lead-in) must behave the same way.
    const Song = await loadSong();
    setPhone(false);
    const week = leadWeek(3);
    const song = weekSchema.parse(week).song!;
    delete (song as { video?: string }).video;
    delete (song as { videoPhone?: string }).videoPhone;
    const view = render(<Song song={song} mediaUrls={mediaUrls(song)} labels={labels} />);
    const audio = view.container.querySelector<HTMLMediaElement>("audio")!;
    expect(audio.tagName, "the fallback must be an audio element").toBe("AUDIO");
    Object.defineProperty(audio, "currentTime", { configurable: true, get: () => -0.5 });
    expect(() => fireEvent.timeUpdate(audio), "a negative audio time must not throw").not.toThrow();
    expect(activeLine(view.container), "no line may light at a negative audio time").toBeNull();
    view.unmount();
  });
});
