// @vitest-environment jsdom
/**
 * Task 1.3: the song keeps a safe first frame (AC-1.4; plan 1.3, strategy P1.2 S1 to S7).
 *
 * The `.song-stage` holds the poster as an inline background before the video plays a frame, so a
 * white video area never shows. The video keeps its `poster`, `playsInline`, and gets
 * `preload="metadata"`. The shipped song has no inline stage background today, so S1, S2, S4, S6
 * (positive half), and S7 fail at the base with an assertion; S3 fails on `preload` "none".
 * S5 is the named characterization: the button label turns to Pause after `play`, and the
 * `poster` attribute already holds.
 */
import "@testing-library/jest-dom/vitest";
// The media of a week now comes from the signed map of the page (login task 2b.6). The mock keeps
// a URL for every file, so the assertions of this file stay unchanged.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import type { StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;

const labels = { play: "Play", pause: "Pause" };

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Loads the client song view with a named assertion when the module is missing. */
async function loadSong() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/song";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeSong as ComponentType<{
      song: NonNullable<StorytimeWeek["song"]>;
      mediaBase?: string;
      labels?: typeof labels;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client song view").toBeUndefined();
    throw error;
  }
}

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

/** Renders the song and returns its container and video element. */
async function renderSong(options: { phone?: boolean; song?: NonNullable<StorytimeWeek["song"]> } = {}) {
  const Song = await loadSong();
  setPhone(options.phone ?? false);
  const song = structuredClone(options.song ?? shipped.song!);
  const result = render(<Song song={song} mediaBase="/media" labels={labels} />);
  const video = result.container.querySelector<HTMLVideoElement>("video");
  expect(video, "the song view must render its video element").not.toBeNull();
  const stage = result.container.querySelector<HTMLElement>(".song-stage");
  expect(stage, "the song view must render its .song-stage element").not.toBeNull();
  return { ...result, song, video: video!, stage: stage! };
}

/** Reads the URL of one inline background-image value. */
function backgroundUrl(background: string): string {
  return background.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
}

/** Reports whether one inline background-image holds the given file. */
function backgroundHolds(background: string, file: string): boolean {
  return background.includes("url(") && backgroundUrl(background).endsWith(file);
}

/** The file name of one media path. */
function fileName(file: string): string {
  return file.split("/").at(-1) ?? file;
}

/** Sends one named event to the video. */
function send(video: HTMLVideoElement, type: string): void {
  fireEvent(video, new Event(type));
}

describe("Task 1.3 song safe first frame (AC-1.4)", () => {
  it("S1 holds the poster as an inline stage background before any event", async () => {
    const { song, stage } = await renderSong();
    expect(song.poster, "the shipped song must hold a poster").toBeTruthy();
    expect(song.posterPhone, "the shipped song must hold a phone poster").toBeTruthy();
    const background = stage.style.backgroundImage;
    expect(
      background,
      `the .song-stage must hold an inline background-image that ends with the poster file before the playing event, received "${background}"`,
    ).toContain("url(");
    expect(
      backgroundHolds(background, fileName(song.poster!)),
      "the stage background must end with the shipped poster file",
    ).toBe(true);
  });

  it("S2 uses the phone poster for the stage background and the poster attribute", async () => {
    const { song, stage, video } = await renderSong({ phone: true });
    const background = stage.style.backgroundImage;
    expect(background, "the phone stage must hold an inline background-image").toContain("url(");
    expect(
      backgroundHolds(background, fileName(song.posterPhone!)),
      "the phone stage background must end with the phone poster file",
    ).toBe(true);
    expect(video.getAttribute("poster") ?? "", "the video poster must be the phone poster").toContain(
      fileName(song.posterPhone!),
    );
  });

  it("S3 keeps poster, playsinline, no autoplay, and preload metadata", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const { song, video } = await renderSong();
    expect(video.getAttribute("poster") ?? "", "the video must keep its poster attribute").toContain(
      fileName(song.poster!),
    );
    expect(video.hasAttribute("playsinline"), "the video must keep playsinline").toBe(true);
    const preload = video.getAttribute("preload");
    expect(preload, `video preload must be "metadata", received "${preload}"`).toBe("metadata");
    expect(video.hasAttribute("autoplay"), "the video must not autoplay").toBe(false);
    expect(play, "the song must not play before a tap").not.toHaveBeenCalled();
  });

  it("S4 keeps the stage background through play, loadstart, waiting, and timeupdate at 0", async () => {
    const { song, stage, video } = await renderSong();
    fireEvent.click(screen.getByRole("button", { name: labels.play }));
    send(video, "play");
    expect(
      backgroundHolds(stage.style.backgroundImage, fileName(song.poster!)),
      "the poster must stay under the video after the play event",
    ).toBe(true);
    send(video, "loadstart");
    send(video, "waiting");
    video.currentTime = 0;
    fireEvent.timeUpdate(video);
    expect(
      backgroundHolds(stage.style.backgroundImage, fileName(song.poster!)),
      "the poster must stay under the video until a frame plays",
    ).toBe(true);

    send(video, "playing");
    // Q13: the test does not assert whether the background stays after `playing`.
    expect(video.getAttribute("src") ?? "", "the video must keep its source").toContain(
      fileName(song.video!),
    );
    expect(video.getAttribute("poster") ?? "", "the video must keep its poster").toContain(
      fileName(song.poster!),
    );
  });

  it("S5 turns the button to Pause after play and keeps the video source", async () => {
    // Named characterization: the label turns on `play`; poster and playsinline already hold.
    const { song, video } = await renderSong();
    const button = screen.getByRole("button", { name: labels.play });
    fireEvent.click(button);
    send(video, "play");
    expect(button.textContent, "the button must read Pause while the song plays").toBe(labels.pause);
    expect(video.getAttribute("src") ?? "", "the video must keep the shipped video file").toContain(
      fileName(song.video!),
    );
    send(video, "playing");
    expect(button.textContent, "the button must stay Pause after the playing event").toBe(labels.pause);
  });

  it("S6 shows a poster for the shipped song and no url(undefined) without one", async () => {
    const regular = await renderSong();
    expect(
      backgroundHolds(regular.stage.style.backgroundImage, fileName(regular.song.poster!)),
      "the shipped song must show the poster background",
    ).toBe(true);
    regular.unmount();

    const hostile = structuredClone(shipped.song!);
    delete (hostile as { poster?: string }).poster;
    delete (hostile as { posterPhone?: string }).posterPhone;
    const view = await renderSong({ song: hostile });
    const background = view.stage.style.backgroundImage;
    expect(background, "no poster must not give url(undefined)").not.toContain("url(undefined)");
    expect(background, "no poster must not give a media/undefined URL").not.toContain("/media/undefined");
    expect(background, "no poster must not give an empty url()").not.toMatch(/url\(\s*\)/);
  });

  it("S7 returns the label to Play after a rejected play and keeps the poster", async () => {
    const { song, stage } = await renderSong();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("The play request was rejected.", "NotAllowedError"),
    );
    const button = screen.getByRole("button", { name: labels.play });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(button.textContent, "a rejected play must return the Play label").toBe(labels.play);
    expect(
      backgroundHolds(stage.style.backgroundImage, fileName(song.poster!)),
      "a rejected play must keep the poster background",
    ).toBe(true);
  });
});
