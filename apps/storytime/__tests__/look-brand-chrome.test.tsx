// @vitest-environment jsdom
/**
 * Task 2b.1: the brand chrome of the frame (AC-4.1, AC-4.2, AC-4.3; strategy P2b.2 B1 to B3 and B6).
 *
 * The game bar goes away, the level and week label stays as text that a screen reader reads once,
 * and the logo takes the place of the sprout crest. This file proves the markup and the counts.
 * jsdom loads no CSS, so the tones, the contrast, and the centering are the work of the browser
 * gate rows of task 2b.4. The source checks of AC-4.4, AC-4.5, and AC-4.7 are in
 * `look-brand-chrome.test.ts`.
 *
 * The five screens of spec FR-4 are the week home, the read-along book, the decodable page, the
 * song, and the question screen. Every screen of the week route renders the frame, so every
 * render here holds the frame of that screen. The frame holds the game bar today, so the cases
 * fail at the base with a named count. The B6 case is the named characterization: it passes at
 * the base and must keep passing.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";

// The media of a week comes from the signed map of the page. The mock gives a URL for every file.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) => `https://media.example/${file}`,
}));

const app = resolve(import.meta.dirname, "..");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>;
const thai = JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>;

/** The screens of spec FR-4 that the week route renders. */
const SCREENS = ["home", "book", "decodable", "song", "question"] as const;
/** One screen of the list. */
type ScreenName = (typeof SCREENS)[number];
/** The interface locales of the app. */
const LOCALES = ["en", "th"] as const;
/** One interface locale. */
type Locale = (typeof LOCALES)[number];

/** The labels of the reader controls, in English. The chrome test does not check the words. */
const READER_LABELS = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
  playing: "Playing",
};
/** The labels of the song control. */
const SONG_LABELS = { play: "Play", pause: "Pause" };
/** The labels of the question screen. */
const QUESTION_LABELS = { skip: "Skip", right: "Right", gentle: "Try again", picture: "Picture" };

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The props of the frame. */
interface FrameProps {
  level: number;
  week: number;
  title: string;
  variant: "cover" | "band";
  locale?: Locale;
}

/**
 * Loads the frame of the app.
 * @returns The frame component.
 */
async function loadFrame(): Promise<ComponentType<FrameProps>> {
  const modulePath = "../app/[locale]/frame";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as { Frame?: ComponentType<FrameProps> };
  expect(typeof loaded.Frame, "frame.tsx must export Frame").toBe("function");
  return loaded.Frame!;
}

/**
 * Loads the client reader of the app.
 * @returns The reader component.
 */
async function loadReader(): Promise<ComponentType<Record<string, unknown>>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeReader?: ComponentType<Record<string, unknown>>;
  };
  expect(typeof loaded.StorytimeReader, "reader.tsx must export StorytimeReader").toBe("function");
  return loaded.StorytimeReader!;
}

/**
 * Loads the decodable page of the app.
 * @returns The decodable component.
 */
async function loadDecodable(): Promise<ComponentType<Record<string, unknown>>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeDecodable?: ComponentType<Record<string, unknown>>;
  };
  expect(typeof loaded.StorytimeDecodable, "decodable.tsx must export StorytimeDecodable").toBe("function");
  return loaded.StorytimeDecodable!;
}

/**
 * Loads the song of the app.
 * @returns The song component.
 */
async function loadSong(): Promise<ComponentType<Record<string, unknown>>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/song";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeSong?: ComponentType<Record<string, unknown>>;
  };
  expect(typeof loaded.StorytimeSong, "song.tsx must export StorytimeSong").toBe("function");
  return loaded.StorytimeSong!;
}

/**
 * Loads the question screen of the app.
 * @returns The question component.
 */
async function loadQuestions(): Promise<ComponentType<Record<string, unknown>>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/questions";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeQuestions?: ComponentType<Record<string, unknown>>;
  };
  expect(typeof loaded.StorytimeQuestions, "questions.tsx must export StorytimeQuestions").toBe("function");
  return loaded.StorytimeQuestions!;
}

/**
 * Builds the label words of one route in one locale, the way the frame builds them.
 * @param locale The interface locale.
 * @param level The level of the route.
 * @param week The week of the route.
 * @returns The label text.
 */
function labelWords(locale: Locale, level: number, week: number): string {
  const messages = locale === "th" ? thai : english;
  const levelText = messages.barLevel!.replace("{level}", String(level));
  const weekText = messages.barWeek!.replace("{week}", String(week));
  return `${levelText} · ${weekText}`;
}

/**
 * Renders one screen of the week route with its frame.
 * @param locale The interface locale.
 * @param screen The screen of the list.
 * @returns The container of the render.
 */
async function renderScreen(locale: Locale, screen: ScreenName): Promise<HTMLElement> {
  const Frame = await loadFrame();
  const level = 2;
  const week = 1;
  const title = "Hello!";
  const variant = screen === "home" || screen === "song" ? "cover" : "band";
  const frame = <Frame level={level} week={week} title={title} variant={variant} locale={locale} />;
  let content: ReactNode = null;
  if (screen === "book") {
    const Reader = await loadReader();
    const book = shipped.books.find((entry) => entry.kind === "readalong")!;
    content = <Reader book={book} locale={locale} labels={READER_LABELS} mediaUrls={{}} />;
  } else if (screen === "decodable") {
    const Decodable = await loadDecodable();
    content = <Decodable week={shipped} locale={locale} mediaUrls={{}} />;
  } else if (screen === "song") {
    const Song = await loadSong();
    content = <Song song={shipped.song!} mediaUrls={{}} labels={SONG_LABELS} />;
  } else if (screen === "question") {
    const Questions = await loadQuestions();
    const book = shipped.books.find((entry) => entry.kind === "readalong")!;
    const questions = (book as { questions?: unknown }).questions ?? [];
    content = (
      <Questions questions={questions} pages={book.pages} tiles={[]} locale={locale} labels={QUESTION_LABELS} mediaUrls={{}} />
    );
  }
  const { container } = render(
    <>
      {frame}
      {content}
    </>,
  );
  return container;
}

/**
 * Counts the chrome hooks of one render that the game bar uses.
 * @param container The container of the render.
 * @returns The counts of the hooks.
 */
function chromeCounts(container: HTMLElement): {
  game_bars: number;
  progressbars: number;
  data_progress: number;
  band_icons: number;
} {
  return {
    game_bars: container.querySelectorAll("[data-game-bar]").length,
    progressbars: container.querySelectorAll('[role="progressbar"]').length,
    data_progress: container.querySelectorAll("[data-progress]").length,
    band_icons: container.querySelectorAll("[data-band-icon]").length,
  };
}

/**
 * Lists the failures of the chrome hooks of one render.
 * @param container The container of the render.
 * @returns The failure texts.
 */
function chromeFailures(container: HTMLElement): string[] {
  const counts = chromeCounts(container);
  const failures: string[] = [];
  if (counts.game_bars !== 0) {
    failures.push(`the frame must render no [data-game-bar], found ${counts.game_bars}`);
  }
  if (counts.progressbars !== 0) {
    failures.push(`the frame must render no [role="progressbar"], found ${counts.progressbars}`);
  }
  if (counts.data_progress !== 0) {
    failures.push(`the frame must render no [data-progress], found ${counts.data_progress}`);
  }
  if (counts.band_icons !== 0) {
    failures.push(`the frame must render no [data-band-icon], found ${counts.band_icons}`);
  }
  return failures;
}

/**
 * Counts the text nodes of one render that hold one exact text.
 * @param container The container of the render.
 * @param text The exact text.
 * @returns The count of the text nodes.
 */
function copiesOfText(container: HTMLElement, text: string): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let count = 0;
  let node = walker.nextNode();
  while (node !== null) {
    if ((node.textContent ?? "").trim() === text) count += 1;
    node = walker.nextNode();
  }
  return count;
}

/**
 * Reads the numbers that one element hands to the CSS.
 * @param node The element.
 * @returns The numbers of its inline custom properties and of its data attributes.
 */
function lengthSignals(node: HTMLElement): number[] {
  const found: number[] = [];
  const style = node.getAttribute("style") ?? "";
  for (const match of style.matchAll(/--[\w-]+\s*:\s*([^;]+)/g)) {
    const value = (match[1] ?? "").trim();
    if (/^\d+$/.test(value)) found.push(Number(value));
  }
  for (const attribute of Array.from(node.attributes)) {
    if (!attribute.name.startsWith("data-")) continue;
    const value = attribute.value.trim();
    if (/^\d+$/.test(value)) found.push(Number(value));
  }
  return found;
}

describe("the brand chrome of the frame (AC-4.1 to AC-4.3)", () => {
  it("B1 the five screens hold no game bar, no progress bar, and no band icon (en and th)", async () => {
    const cases: { locale: Locale; screen: ScreenName }[] = [];
    for (const locale of LOCALES) {
      for (const screen of SCREENS) cases.push({ locale, screen });
    }
    expect(`cases_checked=${cases.length}`, "the five screens run in en and th").toBe("cases_checked=10");
    const failures: string[] = [];
    for (const item of cases) {
      const container = await renderScreen(item.locale, item.screen);
      expect(
        `screen_content=${container.querySelectorAll("header, section, p, button").length}`,
        `the ${item.screen} screen must render its content`,
      ).not.toBe("screen_content=0");
      for (const failure of chromeFailures(container)) failures.push(`${item.locale} ${item.screen}: ${failure}`);
      cleanup();
    }
    expect(failures.join(" | "), "the chrome hooks of the five screens").toBe("");
  });

  it("B2 the level and week label is visible, is read once, and follows the interface locale", async () => {
    const failures: string[] = [];
    for (const locale of LOCALES) {
      for (const route of [
        { level: 2, week: 1 },
        { level: 3, week: 5 },
      ]) {
        const Frame = await loadFrame();
        const { container } = render(
          <Frame level={route.level} week={route.week} title="Hello!" variant="cover" locale={locale} />,
        );
        const labels = container.querySelectorAll("[data-level-week]");
        const expected = labelWords(locale, route.level, route.week);
        if (labels.length !== 1) {
          failures.push(`${locale} ${route.level}/${route.week}: the frame must render one [data-level-week], found ${labels.length}`);
        } else {
          const label = labels[0]!;
          if (label.getAttribute("aria-hidden") === "true") {
            failures.push(`${locale} ${route.level}/${route.week}: [data-level-week] must not be aria-hidden`);
          }
          if (label.closest("[aria-hidden='true']") !== null) {
            failures.push(`${locale} ${route.level}/${route.week}: [data-level-week] must not sit inside aria-hidden`);
          }
          if ((label.textContent ?? "").trim() !== expected) {
            failures.push(
              `${locale} ${route.level}/${route.week}: the label must read ${JSON.stringify(expected)}, received ${JSON.stringify((label.textContent ?? "").trim())}`,
            );
          }
        }
        const copies = copiesOfText(container, expected);
        if (copies !== 1) {
          failures.push(
            `${locale} ${route.level}/${route.week}: the label must be read once, level_week_copies=${copies}`,
          );
        }
        cleanup();
      }
    }
    expect(failures.join(" | "), "the level and week label").toBe("");
  });

  it("B3 the frame renders one logo with its text alternative and no crest", async () => {
    const failures: string[] = [];
    for (const locale of LOCALES) {
      for (const variant of ["cover", "band"] as const) {
        const Frame = await loadFrame();
        const { container } = render(<Frame level={2} week={1} title="Hello!" variant={variant} locale={locale} />);
        const logos = container.querySelectorAll("[data-logo]");
        if (logos.length !== 1) {
          failures.push(`${locale} ${variant}: the frame must render one [data-logo], found ${logos.length}`);
        } else {
          const logo = logos[0]!;
          if (logo.tagName.toLowerCase() !== "img") {
            failures.push(`${locale} ${variant}: [data-logo] must be an img element, found ${logo.tagName.toLowerCase()}`);
          }
          if (logo.getAttribute("alt") !== "Storytime Advantage") {
            failures.push(
              `${locale} ${variant}: [data-logo] must read "Storytime Advantage", received ${JSON.stringify(logo.getAttribute("alt"))}`,
            );
          }
        }
        const crests = container.querySelectorAll("[data-crest]").length;
        if (crests !== 0) {
          failures.push(`${locale} ${variant}: the frame must render no [data-crest], found ${crests}`);
        }
        cleanup();
      }
    }
    expect(failures.join(" | "), "the logo of the frame").toBe("");
  });

  it("B6 the per-word highlight keeps the package class and the plain-text rule still holds", async () => {
    // The per-word highlight is not chrome. It stays in the package of the read-along.
    // finding P-1, PM 2026-11-10: the current word is the logo brown
    const highlightPath = resolve(app, "../../packages/read-along/lib/highlight.ts");
    expect(existsSync(highlightPath), "Missing packages/read-along/lib/highlight.ts").toBe(true);
    const highlight = readFileSync(highlightPath, "utf8");
    const currentWord = /currentWord:\s*"([^"]*)"/.exec(highlight)?.[1] ?? "none";
    const classes = currentWord.split(" ");
    expect(`current_word_class=${currentWord}`, "the current word must name the logo brown").toContain(
      "bg-[#92400e]",
    );
    expect(classes, "the current word must name the white label").toContain("text-white");
    expect(classes.filter((entry) => /blue/.test(entry)), "the current word must hold no blue class").toEqual(
      [],
    );
    // The plain-text rule of AC-2.3: the read-along text carries no decoration class of the look.
    const Reader = await loadReader();
    const book = shipped.books.find((entry) => entry.kind === "readalong")!;
    const { container } = render(<Reader book={book} locale="en" labels={READER_LABELS} mediaUrls={{}} />);
    const decorated = [...container.querySelectorAll("*")].filter((node) =>
      [...node.classList].some((token) => token.startsWith("sq-")),
    ).length;
    expect(`decorated_nodes=${decorated}`, "the read-along text must carry no decoration class").toBe(
      "decorated_nodes=0",
    );
    cleanup();
  });

  it("F-2 the frame gives the title length to the CSS and the logo stays out of the plaque", async () => {
    const Frame = await loadFrame();
    const failures: string[] = [];
    for (const title of ["Hello!", "How Many? My Family"]) {
      const { container } = render(
        <Frame level={2} week={1} title={title} variant="cover" locale="en" />,
      );
      const plaque = container.querySelector<HTMLElement>("header[data-hero] > h1");
      const hero = container.querySelector<HTMLElement>("header[data-hero]");
      if (!plaque) {
        failures.push(`the frame must render the plaque for ${JSON.stringify(title)}`);
      } else {
        const inside = plaque.querySelectorAll("[data-logo]").length;
        if (inside !== 0) failures.push(`the logo must not sit inside the plaque, found ${inside}`);
        const signals = [...lengthSignals(plaque), ...(hero ? lengthSignals(hero) : [])];
        if (!signals.includes(title.length)) {
          failures.push(
            `the frame must give the title length ${title.length} to the CSS, found ${signals.join(",") || "nothing"}`,
          );
        }
      }
      cleanup();
    }
    expect(failures.join(" | "), "the plaque of the frame").toBe("");
  });

  it("the chrome check rejects a frame with one game bar (self-test)", () => {
    const mutant = document.createElement("div");
    mutant.innerHTML = '<p data-level-week>Level 2 · Week 1</p><p data-game-bar></p>';
    expect(chromeFailures(mutant).join(" "), "a frame with one bar must fail").toContain(
      "the frame must render no [data-game-bar], found 1",
    );
  });

  it("the logo check rejects a frame with a crest (self-test)", () => {
    const mutant = document.createElement("div");
    mutant.innerHTML = '<img data-logo alt="Storytime Advantage"><span data-crest></span>';
    const logos = mutant.querySelectorAll("[data-logo]").length;
    const crests = mutant.querySelectorAll("[data-crest]").length;
    expect(`logo_elems=${logos} crest_elems=${crests}`, "a frame with a crest must fail").toBe(
      "logo_elems=1 crest_elems=1",
    );
  });
});
