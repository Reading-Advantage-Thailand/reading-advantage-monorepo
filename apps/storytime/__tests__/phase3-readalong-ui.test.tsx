// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import week from "../content/l2/w01.json";
import type { ReadAlongSentence } from "@reading-advantage/read-along/lib/align";
import { HIGHLIGHT_CLASSES } from "@reading-advantage/read-along/lib/highlight";
import { findPosition, NO_POSITION } from "@reading-advantage/read-along/lib/position";
import { ReadAlongPassage } from "@reading-advantage/read-along/components/read-along/read-along-passage";

// The media of a week now comes from the signed map of the page. The mock keeps the old URLs of
// the test, so the assertions of this file stay unchanged.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));


const app = resolve(import.meta.dirname, "..");
const routePath = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");
const route = readFileSync(routePath, "utf8");
const contentDir = resolve(app, "content/l2");
const shippedWeeks = readdirSync(contentDir)
  .filter((file) => /^w[0-9]{2}\.json$/.test(file))
  .map((file) => JSON.parse(readFileSync(resolve(contentDir, file), "utf8")) as typeof week);
const labels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Creates a ready in-memory copy of the shipped week without changing its content file. */
function readyWeek(source = week) {
  const copy = structuredClone(source);
  copy.approval.images = { ...copy.approval.images, status: "approved" };
  copy.approval.audio = { ...copy.approval.audio, status: "approved" };
  copy.approval.song = { ...copy.approval.song, status: "approved" };
  for (const book of copy.books) {
    for (const [index, page] of book.pages.entries()) {
      page.image.file ??= `review/${book.kind}-${index + 1}.jpg`;
    }
  }
  return copy;
}

/** Loads the Storytime client reader and reports a missing implementation as an assertion. */
async function loadReader() {
  try {
    const modulePath = "../app/[locale]/st/[level]/[week]/reader";
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader;
  } catch (error) {
    expect(error, "Storytime must add the client reader at the documented path").toBeUndefined();
    throw error;
  }
}

/** Renders the client reader against a cloned shipped week and returns its book audio element. */
async function renderReader(source = week, locale: "en" | "th" = "en") {
  const Reader = await loadReader();
  const ready = readyWeek(source);
  const book = ready.books.find((entry) => entry.kind === "readalong");
  expect(book, "the shipped week must include a read-along book").toBeDefined();
  const result = render(<Reader book={book} locale={locale} labels={labels} />);
  const audio = result.container.querySelector("audio");
  expect(audio, "the reader must render its page audio element").not.toBeNull();
  return { ...result, audio: audio as HTMLAudioElement, book: book! };
}

/** Returns the first shipped page with two or more timed sentences. */
function shippedTwoSentencePage() {
  const matches = shippedWeeks.flatMap((source) => {
    const book = source.books.find((entry) => entry.kind === "readalong");
    const byPage = (book?.audio?.sentences ?? []).reduce<Array<{ page: number; sentences: ReadAlongSentence[] }>>(
      (found, sentence) => {
        const page = sentence.page ?? 1;
        const group = found.find((entry) => entry.page === page);
        if (group) group.sentences.push(sentence);
        else found.push({ page, sentences: [sentence] });
        return found;
      },
      [],
    );
    return byPage
      .filter((entry) => entry.sentences.length >= 2)
      .map((entry) => ({ source, book, ...entry }));
  });
  expect(matches, "the shipped week must include a two-sentence page").not.toHaveLength(0);
  return matches[0];
}

describe("Phase 3 Storytime read-along UI", () => {
  it("renders each timed sentence of a shipped two-sentence page", async () => {
    const { source, book, page, sentences } = shippedTwoSentencePage();
    const { container, audio } = await renderReader(source);
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    expect(audio).toHaveAttribute("src", expect.stringContaining(book!.audio.file));
    expect(container.textContent).toContain(sentences[0].sentence);
    expect(container.textContent).toContain(sentences[1].sentence);
    expect(container.querySelector(`[data-page-number="${page}"]`)).toBeInTheDocument();
  });

  it("My turn stays silent until a tap, then the tap plays the word clip of the fixture", async () => {
    const played: string[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      played.push(this.src);
      return Promise.resolve();
    });
    const { source } = shippedTwoSentencePage();
    const copy = structuredClone(source) as unknown as {
      books: Array<{ kind: string; audio: Record<string, unknown> & { file?: string; sentences: Array<{ page?: number; words: Array<{ word: string; start: number; end: number }> }> } }>;
    };
    const book = copy.books.find((entry) => entry.kind === "readalong")!;
    const first = book.audio.sentences.find((sentence) => (sentence.page ?? 1) === 1)!;
    const word = first.words[0]!;
    const clip = `words/${word.word.toLowerCase()}.mp3`;
    book.audio.wordClips = { [word.word.toLowerCase()]: clip };
    const Reader = await loadReader();
    const view = render(
      <Reader
        book={book as never}
        locale="en"
        labels={labels}
        mediaUrls={{ [clip]: `https://media.example/${clip}` }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: labels.myTurn }));
    expect(played, "My turn must stay silent until a tap").toHaveLength(0);
    fireEvent.click(view.container.querySelector('[data-word="0"]')!);
    expect(played, "the tap must play the word clip once").toHaveLength(1);
    expect(played[0]!.endsWith(clip), "the tap must play the word clip of the fixture").toBe(true);
  });

  it("uses slowFile and slowSentences at playback rate one", async () => {
    const source = readyWeek();
    const book = source.books.find((entry) => entry.kind === "readalong")!;
    expect(book.audio.slowFile, "the shipped week must include a slow recording").toBeTruthy();
    expect(book.audio.slowSentences, "the shipped week must include slow sentence timings").not.toHaveLength(0);
    const { audio } = await renderReader(source);
    fireEvent.click(screen.getByRole("button", { name: labels.slow }));
    await waitFor(() => expect(audio).toHaveAttribute("src", expect.stringContaining(book.audio.slowFile)));
    expect(audio.playbackRate).toBe(1);
    audio.currentTime = book.audio.slowSentences[0].words[0].start;
    fireEvent.timeUpdate(audio);
    // R-EDIT (post-checkpoint r5): the class holds [ and #, so getElementsByClassName replaces the invalid CSS selector.
    expect(document.getElementsByClassName(HIGHLIGHT_CLASSES.currentWord.split(" ")[0]).length).toBeGreaterThan(0);
  });

  it.each([
    ["en", "Sound could not be played"],
    ["th", "เล่นเสียงไม่ได้"],
  ] as const)("shows the audio error in %s", async (locale, expected) => {
    const { audio } = await renderReader(week, locale);
    fireEvent.error(audio);
    const message = screen.getByRole("alert");
    expect(message).toHaveTextContent(expected);
    expect(message).toHaveAttribute("lang", locale);
  });

  it("renders a book word with lang=en as its nearest lang under a th document (P3.6, finding F134)", async () => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = "th";
    try {
      const { container } = await renderReader();
      const word = container.querySelector("[data-word]");
      expect(word, "the shipped page must render a book word").not.toBeNull();
      const nearest = word!.closest("[lang]");
      expect(nearest, "a book word must sit inside an element with a lang attribute").not.toBeNull();
      expect(nearest!.getAttribute("lang"), "the nearest lang of book text must be en").toBe("en");
    } finally {
      document.documentElement.lang = previous;
    }
  });

  it("turns pages by buttons and horizontal swipe, but not vertical swipe", async () => {
    const { container, book } = await renderReader();
    const image = container.querySelector("img")!;
    const firstImage = image.getAttribute("src");
    fireEvent.touchStart(container.firstElementChild!, { touches: [{ clientX: 220, clientY: 20 }] });
    fireEvent.touchEnd(container.firstElementChild!, { changedTouches: [{ clientX: 40, clientY: 22 }] });
    await waitFor(() => expect(image.getAttribute("src")).not.toBe(firstImage));
    const secondImage = image.getAttribute("src");
    fireEvent.touchStart(container.firstElementChild!, { touches: [{ clientX: 40, clientY: 20 }] });
    fireEvent.touchEnd(container.firstElementChild!, { changedTouches: [{ clientX: 42, clientY: 210 }] });
    expect(image.getAttribute("src")).toBe(secondImage);
    fireEvent.click(screen.getByRole("button", { name: labels.previousPage }));
    expect(image.getAttribute("src")).toBe(firstImage);
    fireEvent.click(screen.getByRole("button", { name: labels.previousPage }));
    expect(screen.getByRole("button", { name: labels.previousPage })).toBeDisabled();
    for (let i = 1; i < book.pages.length; i++) fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    fireEvent.click(screen.getByRole("button", { name: labels.nextPage }));
    expect(screen.getByText(labels.finished)).toBeInTheDocument();
  });

  it("stops page audio at the last sentence end and keeps each page in one block", async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const { audio, book, container } = await renderReader();
    const pageSentences = book.audio.sentences.filter((sentence) => (sentence.page ?? 1) === 1);
    expect(pageSentences, "the first page must have timed sentences").not.toHaveLength(0);
    expect(container.querySelectorAll("[data-page-content]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: labels.readToMe }));
    audio.currentTime = pageSentences.at(-1)!.endTime;
    fireEvent.timeUpdate(audio);
    await waitFor(() => expect(pause).toHaveBeenCalled());
  });

  it("marks one word in the shipped 0.04-second overlap", async () => {
    const overlapSentence = shippedWeeks.flatMap((source) => source.song?.times ?? []).find((sentence) =>
      sentence.words.some((word, index) => sentence.words[index + 1]?.start < word.end),
    );
    expect(overlapSentence, "shipped weeks must include the recorded overlap").toBeDefined();
    const wordPairs = overlapSentence!.words.slice(0, -1).map((word, index) => ({
      word,
      next: overlapSentence!.words[index + 1],
    }));
    const overlap = wordPairs.find(({ word, next }) => word.end > next.start);
    expect(overlap, "the selected shipped sentence must include its overlap").toBeDefined();
    expect(overlap!.word.end - overlap!.next.start).toBeCloseTo(0.04, 2);
    const time = (overlap!.word.end + overlap!.next.start) / 2;
    const position = findPosition([overlapSentence as ReadAlongSentence], time, NO_POSITION);
    const { container } = render(
      <ReadAlongPassage sentences={[overlapSentence as ReadAlongSentence]} passage="" position={position} active />,
    );
    const marked = HIGHLIGHT_CLASSES.currentWord.split(" ")[0];
    // R-EDIT (post-checkpoint r5): the class holds [ and #, so getElementsByClassName replaces the invalid CSS selector.
    expect(container.getElementsByClassName(marked)).toHaveLength(1);
  });

  it("keeps page.tsx on the server and renders the client reader for the book part", () => {
    expect(route).toMatch(/import\s+\{?\s*StorytimeReader\s*\}?.*from\s*["']\.\/reader/);
    expect(route).toMatch(/part\s*===\s*["']book["'][\s\S]*<StorytimeReader/);
    expect(route).toContain("generateMetadata");
    expect(route).toContain("loadVisibleWeek");
  });
});
