import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StorytimeSongPlayer } from "@/components/products/storytime-song-player";
import { SONG_COPY, SONG_POSTER_MEDIA, SONG_POSTERS } from "@/__tests__/fixtures/storytime-page-expected";

const DESKTOP_VIDEO_ID = "Id4_X0nQnV4";
const PHONE_VIDEO_ID = "nwJW8yENJnY";
const PHONE_MEDIA = "(max-width: 767px)";

const mediaQueries: string[] = [];

/**
 * Replaces window.matchMedia with a stub that returns one fixed answer.
 * @param matches The answer for every media query.
 */
function stubMatchMedia(matches: boolean): void {
  mediaQueries.length = 0;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => {
      mediaQueries.push(query);
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    },
  });
}

/**
 * Renders the song player with the English strings.
 * @returns The render result.
 */
function renderPlayer() {
  return render(
    <StorytimeSongPlayer playLabel={SONG_COPY.en.playLabel} playerTitle={SONG_COPY.en.playerTitle} />,
  );
}

/**
 * Reads the box that holds the poster and the player.
 * @param container The rendered container.
 * @returns The player box element.
 */
function playerBox(container: HTMLElement): HTMLElement {
  const box = container.querySelector("[data-testid='song-player-box']");
  if (!box) throw new Error("the song player box is missing");
  return box as HTMLElement;
}

afterEach(cleanup);

describe("Storytime song player", () => {
  it("holds no player and no YouTube URL before the tap", () => {
    stubMatchMedia(false);
    const { container } = renderPlayer();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).not.toContain("youtube");
    expect(container.innerHTML).not.toContain(DESKTOP_VIDEO_ID);
    expect(container.innerHTML).not.toContain(PHONE_VIDEO_ID);
  });

  it("gives the play control the label and a native button", () => {
    stubMatchMedia(false);
    renderPlayer();
    const button = screen.getByRole("button", { name: SONG_COPY.en.playLabel });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toContain("focus-visible:outline");
  });

  it("leaves the poster image without alt text", () => {
    stubMatchMedia(false);
    renderPlayer();
    const poster = document.querySelector("picture img");
    expect(poster?.getAttribute("alt")).toBe("");
  });

  it("loads one local poster with the 767 px media rule", () => {
    stubMatchMedia(false);
    renderPlayer();
    const source = document.querySelector("picture source");
    expect(source?.getAttribute("media")).toBe(SONG_POSTER_MEDIA);
    expect(source?.getAttribute("srcset")).toBe(SONG_POSTERS.phone);
    expect(document.querySelector("picture img")?.getAttribute("src")).toBe(SONG_POSTERS.desktop);
  });

  it("loads the phone video in a 9:16 box on a narrow screen", async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    await user.click(screen.getByRole("button", { name: SONG_COPY.en.playLabel }));

    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("src")).toContain(PHONE_VIDEO_ID);
    const box = playerBox(container);
    expect(box.className).toContain("aspect-[9/16]");
    expect(box.className).not.toContain("aspect-video");
    expect(mediaQueries.filter((query) => query === PHONE_MEDIA)).toHaveLength(1);
  });

  it("loads the desktop video in a 16:9 box on a wide screen", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    await user.click(screen.getByRole("button", { name: SONG_COPY.en.playLabel }));

    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("src")).toContain(DESKTOP_VIDEO_ID);
    const box = playerBox(container);
    expect(box.className).toContain("aspect-video");
    expect(box.className).not.toContain("aspect-[9/16]");
    expect(mediaQueries.filter((query) => query === PHONE_MEDIA)).toHaveLength(1);
  });

  it("uses the privacy-enhanced host and asks for autoplay", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    await user.click(screen.getByRole("button", { name: SONG_COPY.en.playLabel }));

    const frame = container.querySelector("iframe");
    const src = frame?.getAttribute("src") ?? "";
    expect(src.startsWith(`https://www.youtube-nocookie.com/embed/${DESKTOP_VIDEO_ID}?`)).toBe(true);
    expect(src).toContain("autoplay=1");
    expect(src).toContain("rel=0");
    expect(src).toContain("playsinline=1");
    expect(frame?.getAttribute("allow")).toBe("autoplay; encrypted-media; picture-in-picture; fullscreen");
    expect(frame?.hasAttribute("allowfullscreen")).toBe(true);
  });

  it("gives the player the accessible title", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    await user.click(screen.getByRole("button", { name: SONG_COPY.en.playLabel }));

    expect(container.querySelector("iframe")?.getAttribute("title")).toBe(SONG_COPY.en.playerTitle);
  });

  it("keeps one player after two taps", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    await user.click(screen.getByRole("button", { name: SONG_COPY.en.playLabel }));
    const second = screen.queryByRole("button", { name: SONG_COPY.en.playLabel });
    if (second) await user.click(second);

    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(container.querySelectorAll("video")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: SONG_COPY.en.playLabel })).toBeNull();
  });

  it("starts the video on the tap with no second tap", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    await user.click(screen.getByRole("button", { name: SONG_COPY.en.playLabel }));

    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("autoplay=1");
  });

  it("starts the video with the Enter key", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    const button = screen.getByRole("button", { name: SONG_COPY.en.playLabel });
    button.focus();
    expect(document.activeElement).toBe(button);
    await user.keyboard("{Enter}");

    expect(container.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("moves the focus to the player after it loads", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const { container } = renderPlayer();
    await user.click(screen.getByRole("button", { name: SONG_COPY.en.playLabel }));

    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    frame?.dispatchEvent(new Event("load"));
    expect(document.activeElement).toBe(frame);
  });
});
