// @vitest-environment jsdom
/**
 * Task 1.11: the song highlight subtracts the video lead-in (AC-1.13; plan 1.11, strategy O1 to O6).
 *
 * Both `w01` videos start the song 3.000 s after `song.mp3`, and the shipped `song.times` fit
 * `song.mp3`, so the app lights the lines about one line ahead. The fixture sets
 * `song.videoLeadInSeconds = 3`; the app must subtract it from a video's `currentTime`, and use 0
 * for the audio-only fallback.
 *
 * At the base O1, O2, O4, O6, the schema default, and the schema bad cases fail; O3 and O5 are the
 * named characterization cases.
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

/** One shipped line timing. */
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
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/song";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeSong as ComponentType<{
      song: NonNullable<StorytimeWeek["song"]>;
      mediaUrls?: Record<string, string>;
      labels?: typeof labels;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client song view").toBeUndefined();
    throw error;
  }
}

/** Renders one parsed song and returns its container and media element. */
async function renderSong(options: {
  lead?: number;
  phone?: boolean;
  withoutVideo?: boolean;
}) {
  const Song = await loadSong();
  setPhone(options.phone ?? false);
  const week = leadWeek(options.lead);
  const song = weekSchema.parse(week).song!;
  if (options.withoutVideo) {
    delete (song as { video?: string }).video;
    delete (song as { videoPhone?: string }).videoPhone;
  }
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

describe("Task 1.11 song line offset (AC-1.13)", () => {
  it("O1 lights the sung line at three points of every line on the regular video", async () => {
    const lead = 3;
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
      `every sampled point must light its own line; first failure: ${firstFailure}`,
    ).toBe("points_failed=0");
    unmount();
  });

  it("O2 lights the sung line at the same 45 points on the phone video", async () => {
    const lead = 3;
    const { container, media, unmount } = await renderSong({ lead, phone: true });
    expect(media.tagName, "the phone view must be a video").toBe("VIDEO");
    expect(media.getAttribute("src") ?? "", "the phone view must use the phone video").toContain(
      shipped.song!.videoPhone!,
    );
    let failures = 0;
    for (const [index, line] of shippedTimes().entries()) {
      const points = [line.startTime + 0.01, (line.startTime + line.endTime) / 2, line.endTime - 0.01];
      for (const point of points) {
        atTime(media, lead + point);
        if (activeLine(container) !== index) failures += 1;
      }
    }
    expect(`phone_points_checked=45`).toBe("phone_points_checked=45");
    expect(`phone_points_failed=${failures}`, "the phone video must subtract the same lead-in").toBe(
      "phone_points_failed=0",
    );
    unmount();
  });

  it("O3 the audio fallback uses no lead-in", async () => {
    // Named characterization: no video means raw song times.
    const { container, media, unmount } = await renderSong({ lead: 3, withoutVideo: true });
    expect(media.tagName, "the fallback must be an audio element").toBe("AUDIO");
    let failures = 0;
    for (const [index, line] of shippedTimes().entries()) {
      const points = [line.startTime + 0.01, (line.startTime + line.endTime) / 2, line.endTime - 0.01];
      for (const point of points) {
        atTime(media, point);
        if (activeLine(container) !== index) failures += 1;
      }
    }
    expect(`audio_points_failed=${failures}`, "the audio fallback must use raw times").toBe(
      "audio_points_failed=0",
    );
    // A rule that always subtracts would put the first line's middle before the song starts.
    const first = shippedTimes()[0]!;
    atTime(media, (first.startTime + first.endTime) / 2 - 3);
    expect(activeLine(container), "a lead-in subtracted on audio must be rejected").toBeNull();
    unmount();
  });

  it("O4 lights no line before the first sung line", async () => {
    const lead = 3;
    const first = shippedTimes()[0]!;
    const { container, media, unmount } = await renderSong({ lead });
    atTime(media, lead + first.startTime - 0.01);
    expect(
      activeLine(container),
      `no line may be active at video time ${lead} + ${(first.startTime - 0.01).toFixed(2)}`,
    ).toBeNull();
    atTime(media, 1.0);
    expect(activeLine(container), "no line may be active at video time 1.0").toBeNull();
    unmount();
  });

  it("O5 an absent field keeps the old raw-time behavior", async () => {
    // Named characterization: a week with no field keeps the default 0.
    const times = shippedTimes();
    const { container, media, unmount } = await renderSong({ lead: undefined });
    let failures = 0;
    for (const [index, line] of times.entries()) {
      const points = [line.startTime + 0.01, (line.startTime + line.endTime) / 2, line.endTime - 0.01];
      for (const point of points) {
        atTime(media, point);
        if (activeLine(container) !== index) failures += 1;
      }
    }
    expect(`default_points_failed=${failures}`, "an absent field must keep raw times").toBe(
      "default_points_failed=0",
    );
    unmount();
  });

  it("O6 lights no line in the eight gaps between lines", async () => {
    const lead = 3;
    const times = shippedTimes();
    const gaps = times
      .slice(0, -1)
      .map((line, index) => ({ start: line.endTime, end: times[index + 1]!.startTime }))
      .filter((gap) => gap.end > gap.start);
    expect(`gaps_checked=${gaps.length}`).toBe("gaps_checked=8");
    expect(gaps.length, "gaps_checked must stay above 0").toBeGreaterThan(0);
    const { container, media, unmount } = await renderSong({ lead });
    let failures = 0;
    for (const [index, gap] of gaps.entries()) {
      const middle = (gap.start + gap.end) / 2;
      atTime(media, lead + middle);
      const active = activeLine(container);
      if (active !== null) {
        failures += 1;
        if (index === 0) {
          expect(
            active,
            `gap ${index} must light no line at video time ${lead} + ${middle.toFixed(2)}`,
          ).toBeNull();
        }
      }
    }
    expect(`gap_failures=${failures}`, "no gap may light a line").toBe("gap_failures=0");
    unmount();
  });
});

describe("Task 1.11 schema block (AC-1.13)", () => {
  it("accepts the lead-in range and defaults an absent field to 0", () => {
    const good = [0, 3, 30, 2.5];
    expect(`schema_good_cases=${good.length}`).toBe("schema_good_cases=4");
    for (const value of good) {
      const parsed = weekSchema.safeParse(leadWeek(value));
      expect(parsed.success, `videoLeadInSeconds ${value} must parse`).toBe(true);
    }
    const absent = weekSchema.safeParse(leadWeek(undefined));
    expect(absent.success, "the week with no lead-in must parse").toBe(true);
    if (absent.success) {
      expect(
        (absent.data.song as unknown as { videoLeadInSeconds?: unknown }).videoLeadInSeconds,
        "an absent videoLeadInSeconds must default to 0",
      ).toBe(0);
    }
  });

  it("rejects eight bad lead-in values", () => {
    const bad: Array<{ label: string; value: unknown }> = [
      { label: "-1", value: -1 },
      { label: "31", value: 31 },
      { label: '"3"', value: "3" },
      { label: "NaN", value: Number.NaN },
      { label: "Infinity", value: Number.POSITIVE_INFINITY },
      { label: "null", value: null },
      { label: "array", value: [] },
      { label: "true", value: true },
    ];
    expect(`schema_bad_cases=${bad.length}`).toBe("schema_bad_cases=8");
    for (const entry of bad) {
      const parsed = weekSchema.safeParse(leadWeek(entry.value as number));
      expect(parsed.success, `videoLeadInSeconds ${entry.label} must be rejected`).toBe(false);
    }
  });
});
