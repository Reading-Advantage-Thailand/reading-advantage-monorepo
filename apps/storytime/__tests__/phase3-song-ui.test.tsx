// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
// The media of a week now comes from the signed map of the page (login task 2b.6). The mock keeps
// a URL for every file, so the assertions of this file stay unchanged.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import shippedWeek from "../content/l2/w01.json";

const appDir = resolve(import.meta.dirname, "..");
const routeSource = readFileSync(resolve(appDir, "app/[locale]/st/[level]/[week]/page.tsx"), "utf8");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Creates an independent deep copy of shipped week 1 for each behavior case. */
function cloneWeek(source: StorytimeWeek = shippedWeek as unknown as StorytimeWeek): StorytimeWeek {
  return structuredClone(source);
}

/** Loads the client song view and reports a missing module as an assertion failure. */
async function loadSong() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/song";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeSong;
  } catch (error) {
    expect(error, "Storytime must provide the client song view").toBeUndefined();
    throw error;
  }
}

/** Renders the song from a deep clone of the shipped week and returns its media element. */
async function renderSong(source: StorytimeWeek = shippedWeek as unknown as StorytimeWeek) {
  const Song = await loadSong();
  const week = cloneWeek(source);
  const result = render(<Song song={week.song!} />);
  const media = result.container.querySelector("video, audio");
  expect(media, "the song view must render its media element").not.toBeNull();
  return { ...result, media: media as HTMLMediaElement, song: week.song! };
}

describe("Phase 3 Storytime song UI", () => {
  it("shows the shipped poster first and plays no sound before a tap", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const week = cloneWeek();
    const { media } = await renderSong(week);
    expect(media).toHaveAttribute("poster", expect.stringContaining(week.song!.poster!));
    // PM decision 2026-11-07 (plan task 1.3): the song video warms its metadata, so iOS shows a frame.
    expect(media).toHaveAttribute("preload", "metadata");
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(media).toHaveAttribute("src", expect.stringContaining(week.song!.video!));
  });

  it("lights each shipped w01 lyric from its own song.times interval", async () => {
    const week = cloneWeek();
    expect(week.song!.times, "shipped w01 must provide song timing rows").toHaveLength(15);
    expect(week.song!.lines, "shipped w01 must provide song lines").toHaveLength(15);
    // The r3 take of 2026-11-09 (plan task 3.2) declares the 3 s lead-in of the w01 video, so the
    // media clock carries it. The lyric clock is the media clock less that lead-in (R-EDIT3).
    const leadIn = week.song!.videoLeadInSeconds ?? 0;
    const { media, container } = await renderSong(week);
    const firstTime = week.song!.times[0];
    const secondTime = week.song!.times[1];
    expect(firstTime.endTime - firstTime.startTime).not.toBeCloseTo(
      secondTime.endTime - secondTime.startTime,
    );
    media.currentTime = firstTime.startTime + (firstTime.endTime - firstTime.startTime) / 2 + leadIn;
    fireEvent.timeUpdate(media);
    const firstLine = container.querySelector('[data-line-index="0"]');
    expect(firstLine).toHaveAttribute("aria-current", "true");
    media.currentTime = secondTime.startTime + (secondTime.endTime - secondTime.startTime) / 2 + leadIn;
    fireEvent.timeUpdate(media);
    expect(container.querySelector('[data-line-index="0"]')).not.toHaveAttribute("aria-current", "true");
    expect(container.querySelector('[data-line-index="1"]')).toHaveAttribute("aria-current", "true");
  });

  it("uses the shipped phone and regular video and poster names for their display modes", async () => {
    const week = cloneWeek();
    const matchMedia = vi.fn((query: string) => ({ matches: query.includes("max-width"), media: query }));
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });
    const { media: phoneMedia, unmount } = await renderSong(week);
    expect(phoneMedia).toHaveAttribute("src", expect.stringContaining(week.song!.videoPhone!));
    expect(phoneMedia).toHaveAttribute("poster", expect.stringContaining(week.song!.posterPhone!));
    unmount();
    matchMedia.mockImplementation((query) => ({ matches: !query.includes("max-width"), media: query }));
    const { media: otherMedia } = await renderSong(week);
    expect(otherMedia).toHaveAttribute("src", expect.stringContaining(week.song!.video!));
    expect(otherMedia).toHaveAttribute("poster", expect.stringContaining(week.song!.poster!));
  });

  it("plays the shipped song audio when both video fields are absent", async () => {
    const week = cloneWeek();
    delete week.song!.video;
    delete week.song!.videoPhone;
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { media } = await renderSong(week);
    expect(media.tagName).toBe("AUDIO");
    expect(media).toHaveAttribute("src", expect.stringContaining(week.song!.audio!));
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("shows lyric and gesture text on every shipped line without lyric pictures", async () => {
    const week = cloneWeek();
    const { container } = await renderSong(week);
    expect(week.song!.lines, "shipped w01 must provide all lyric lines").toHaveLength(15);
    const lyricList = container.querySelector("ol");
    expect(lyricList, "the song view must render its lyric list").not.toBeNull();
    const lineElements = lyricList!.querySelectorAll("[data-line-index]");
    expect(lineElements, "the lyric list must render every shipped line").toHaveLength(15);
    week.song!.lines.forEach((line, index) => {
      const lineElement = container.querySelector(`[data-line-index="${index}"]`);
      expect(lineElement, `lyric line ${index} must render`).toBeInTheDocument();
      expect(within(lineElement as HTMLElement).getByText(line.text)).toBeInTheDocument();
      expect(within(lineElement as HTMLElement).getByText(line.gesture)).toBeInTheDocument();
    });
    expect(lyricList!.querySelector("img"), "the lyric list must contain no pictures").toBeNull();
    expect(
      Array.from(lineElements, (line) => line.querySelectorAll("img").length),
      "every one of the 15 lyric lines must contain no picture",
    ).toEqual(Array(15).fill(0));
  });

  it("shows gesture text without a picture on each imageOf lyric line", async () => {
    const week = cloneWeek();
    const repeated = week.song!.lines.find((line) => line.imageOf !== undefined)!;
    expect(repeated, "shipped w01 must include a repeated image reference").toBeDefined();
    expect(week.song!.lines[repeated.imageOf!]?.image?.file, "the referenced shipped line must name a picture").toBeTruthy();
    const { container } = await renderSong(week);
    const repeatedIndex = week.song!.lines.indexOf(repeated);
    const lineElement = container.querySelector(`[data-line-index="${repeatedIndex}"]`);
    expect(lineElement).toBeInTheDocument();
    expect(within(lineElement as HTMLElement).getByText(repeated.text)).toBeInTheDocument();
    expect(within(lineElement as HTMLElement).getByText(repeated.gesture)).toBeInTheDocument();
    expect(lineElement!.querySelector("img")).toBeNull();
  });

  it("does not add a karaoke tile when the shipped week has no karaoke field", () => {
    const week = cloneWeek();
    expect(week.song!.karaoke).toBeUndefined();
    expect(routeSource).toMatch(/if\s*\(karaoke\)\s*\{[\s\S]*?tiles\.push\(\{\s*id:\s*["']karaoke["']/);
  });
});
