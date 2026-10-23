// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import type { StorytimeBook as Book, StorytimeWeek } from "@/lib/storytime/week";

const speech = vi.hoisted(() => ({ speak: vi.fn(), playSequence: vi.fn(), playStretch: vi.fn() }));
vi.mock("@/lib/storytime/speak", async (importOriginal) => ({ ...(await importOriginal<object>()), ...speech }));
vi.mock("@/components/switchers/locale-switcher", () => ({ LocaleSwitcher: () => <span data-locale-switcher /> }));

import { StorytimeBook } from "../storytime-book";
import { StorytimeWeekView } from "../storytime-week";

const BASE = "https://bucket.test/storytime/";
const book = (over: Partial<Book> = {}): Book => ({
  title: "Hello!",
  pages: [
    { text: "Hello, I am Pat.", picture: null },
    { text: "I am your teacher.", picture: `${BASE}l2/p2.png` },
  ],
  audio: null,
  sentences: [],
  sounds: null,
  blend: false,
  ...over,
});
const decodable = book({
  title: "Nan Can Nod",
  pages: [{ text: "A net.", picture: null }, { text: "A nut.", picture: null }],
  sounds: { element: "n", words: ["net", "nut"], tricky: ["a"] },
});
const week: StorytimeWeek = {
  level: 2,
  week: 1,
  title: "Hello!",
  readalong: book(),
  decodable,
  element: { graphemes: ["n"], sound: "/n/", audio: `${BASE}phonemes/daniel/04-n.mp3` },
  frame: "Hello, I am ___.",
  song: {
    title: "Hello, I Am Pip",
    lines: [{ text: "Hello, hello, I am Pip", part: "verse", gesture: "point to self", picture: null }],
    audio: `${BASE}l2/song.mp3`,
    video: `${BASE}l2/song.mp4`,
    videoPhone: null,
    poster: `${BASE}l2/poster.jpg`,
    posterPhone: null,
    karaoke: null,
    times: [{ sentence: "Hello, hello, I am Pip", startTime: 11.4, endTime: 15, words: [] }],
  },
  home: { words: ["net", "nut", "nose"], line: { en: "Sing with your child.", th: "ร้องเพลงกับบุตรหลาน" }, activity: { en: "Find a nut.", th: "หาถั่ว" } },
  mediaBase: BASE,
};

const play = vi.fn(() => Promise.resolve());
beforeEach(() => {
  vi.clearAllMocks();
  speech.playSequence.mockReturnValue(() => undefined);
  window.HTMLMediaElement.prototype.play = play;
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.scrollTo = vi.fn() as never;
  window.history.replaceState(null, "", "/th/st/2/1");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StorytimeWeekView (qr-page-spec sections 3 and 7)", () => {
  it("shows three tiles of at least 64 px and the home card, and plays no sound", () => {
    renderWithMessages(<StorytimeWeekView week={week} part={null} />);
    for (const label of ["Story book", "My reading book", "Song"]) {
      expect(screen.getByRole("button", { name: `Say "${label}"` })).toHaveClass("size-16");
    }
    expect(screen.getByText("Sing with your child.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hello, I am ___." })).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it("reads a tile label on the speaker and on a long press, and opens the part on a tap", () => {
    vi.useFakeTimers();
    renderWithMessages(<StorytimeWeekView week={week} part={null} />);
    fireEvent.click(screen.getByRole("button", { name: 'Say "Song"' }));
    expect(speech.speak).toHaveBeenLastCalledWith("Song", "en-US");
    const tile = screen.getByText("Song", { selector: "span" }).closest("button")!;
    fireEvent.pointerDown(tile);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(tile);
    fireEvent.click(tile);
    expect(speech.speak).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("heading", { name: "Hello, I Am Pip" })).toBeNull();
    fireEvent.click(tile);
    expect(screen.getByRole("heading", { name: "Hello, I Am Pip" })).toBeInTheDocument();
    expect(window.location.search).toBe("?part=song");
  });

  it("opens the part of ?part= at once, and Back returns to the tiles", () => {
    renderWithMessages(<StorytimeWeekView week={week} part="song" />);
    expect(screen.getByRole("heading", { name: "Hello, I Am Pip" })).toBeInTheDocument();
    expect(screen.getByText("point to self")).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: 'Say "Song"' })).toBeInTheDocument();
  });

  it("shows the Thai parent line and activity in Thai", () => {
    renderWithMessages(<StorytimeWeekView week={week} part={null} />, { locale: "th" });
    expect(screen.getByText("ร้องเพลงกับบุตรหลาน")).toBeInTheDocument();
    expect(screen.getByText("หาถั่ว")).toBeInTheDocument();
  });
});

describe("StorytimeBook (qr-page-spec sections 4 and 5)", () => {
  it("starts the decodable book with the sounds page and turns pages with the arrows", () => {
    renderWithMessages(<StorytimeBook book={decodable} element={week.element} mediaBase={BASE} />);
    expect(screen.getByRole("heading", { name: "The sound of the week" })).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "net" })).toBeInTheDocument();
  });

  it("plays the sound of the week from its recording", () => {
    renderWithMessages(<StorytimeBook book={decodable} element={week.element} mediaBase={BASE} />);
    fireEvent.click(screen.getByRole("button", { name: "Play the sound /n/" }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("plays a tapped word with the phone voice when the book has no voice yet", () => {
    renderWithMessages(<StorytimeBook book={book()} element={null} mediaBase={BASE} />);
    expect(screen.getByText(/The voice for this part comes soon/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pat" }));
    expect(speech.speak).toHaveBeenCalledWith("Pat", "en-US");
  });

  it("blends a decodable word sound by sound, then says it whole; a tricky word plays whole", () => {
    renderWithMessages(<StorytimeBook book={{ ...decodable, blend: true }} element={week.element} mediaBase={BASE} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "net" }));
    expect(speech.playSequence.mock.calls[0][0]).toEqual([
      `${BASE}phonemes/daniel/04-n.mp3`,
      `${BASE}phonemes/daniel/27-e-short.mp3`,
      `${BASE}phonemes/daniel/02-t.mp3`,
    ]);
    const onStep = speech.playSequence.mock.calls[0][1] as (step: number) => void;
    act(() => onStep(1));
    expect(screen.getByText("e")).toHaveClass("bg-blue-500");
    act(() => onStep(3));
    expect(speech.speak).toHaveBeenCalledWith("net", "en-US");
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(speech.playSequence).toHaveBeenCalledTimes(1);
    expect(speech.speak).toHaveBeenLastCalledWith("A", "en-US");
  });

  it("offers read it to me and my turn when the book has its voice, with the two speeds", () => {
    const voiced = book({
      audio: `${BASE}l2/book.mp3`,
      sentences: [
        { sentence: "Hello, I am Pat.", startTime: 0, endTime: 2, page: 1, words: ["Hello,", "I", "am", "Pat."].map((word, i) => ({ word, start: i * 0.5, end: i * 0.5 + 0.4 })) },
        { sentence: "I am your teacher.", startTime: 3, endTime: 5, page: 2, words: [] },
      ],
    });
    renderWithMessages(<StorytimeBook book={voiced} element={null} mediaBase={BASE} />);
    expect(screen.getByRole("button", { name: "Read it to me" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Pat" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "My turn" }));
    fireEvent.click(screen.getByRole("button", { name: "Pat" }));
    expect(speech.playStretch).toHaveBeenCalledWith(expect.any(HTMLAudioElement), 1.5, 1.9);
    expect(speech.speak).not.toHaveBeenCalled();
  });
});
