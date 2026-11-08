// @vitest-environment jsdom
/**
 * Adversarial cases for the look of Phase 2 (track storytime_look_20261107, spec FR-2).
 *
 * The strategy P2.6 names one adversarial round with these surfaces: the viewport extremes
 * (320x568, 568x320, 1440x900, and 200 percent text zoom), a 60-character Thai and English title
 * in the plaque, a missing place image, a failed font, reduced motion and forced colors, the K5
 * mode switches with a clip that 404s, a rapid mode-switch storm, and a stranger on the 404 route.
 * The 2.3g surfaces join them: the done badge with a long Thai Done label, the pressed sound state
 * under a rapid tap storm and an audio error, the page counter at 1 / 1 and at 99 / 99, the parent
 * speaker button with an audio load error and a double tap, and the 84 px decodable picture cap.
 *
 * jsdom loads no CSS, so every style rule is read from `app/look.css` as an artifact and the
 * browser gate measures the layout. Each artifact check carries a self-test with a one-line
 * mutant, so the check cannot pass on a broken file.
 *
 * The cases of this file:
 *   V1 the title plaque wraps a long title, in English and in Thai.
 *   V2 a failed font file leaves the text in a generic face.
 *   A1 a place image that fails to load leaves a painted ground.
 *   K1 a word clip that fails to load shows the alert and clears the pressed state.
 *   K2b a genuine play failure still shows the alert.
 *   S1 the done badge keeps a drawn mark and no visible text, with a long Thai label.
 *   S2 the decodable sound button keeps one pressed state under a tap storm.
 *   S3 the decodable sound button clears its pressed state on an audio error.
 *   S4 the page counter reads 1 / 1 and 99 / 99.
 *   S5 the parent speaker plays its own recording under a double tap and a load error.
 *   C1 the 84 px decodable picture cap holds only in the short-height block.
 *
 * Two more cases of the same round fail on the shipped tree. They live in the file
 * `look-adversarial-p2-defects.test.tsx`, which holds the Red proof for Green.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactElement } from "react";
import type { StorytimeWeek } from "../lib/contracts/week";
import { lastDeclaration, lengthPx, parseCss, selectorParts } from "./helpers/css-rules";

// The week page signs media after the session check and loads the week. The mock keeps one URL
// for every file of the week.
const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));

vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) => `https://media.example/${file}`,
}));
vi.mock("../lib/media/sign", () => ({ signWeekMedia: async () => ({}) }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale?: string }) => (key: string) => `${locale ?? "th"}:${key}`,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("unexpected notFound");
  },
}));
vi.mock("../lib/auth", () => ({
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));

const app = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(app, "app/look.css"), "utf8");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const week3 = JSON.parse(readFileSync(resolve(app, "content/l2/w03.json"), "utf8")) as StorytimeWeek;
const messages = {
  en: JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>,
  th: JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>,
};

/** The localStorage key of the per-device completion record. */
const DONE_KEY = "storytime:done";

/** The reader labels of the test. */
const readerLabels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
  playing: "Playing",
};

/** The decodable labels of the test. */
const decodableLabels = {
  soundOfWeek: "Sound of the week",
  playSound: "Play the sound",
  trickyWords: "Tricky words",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "The sound could not be played.",
  playing: "Playing",
};

/** One pending play promise, held so the test can settle it as a browser would. */
interface PendingPlay {
  element: HTMLMediaElement;
  reject: (reason: unknown) => void;
}

/** The pending play promises of the current test. */
let pending: PendingPlay[] = [];

/** The recorded play calls of the current test. */
let plays: HTMLMediaElement[] = [];

/** The clip elements that the reader created with `new Audio()`. */
let clips: HTMLAudioElement[] = [];

/** The tracked audio factory, so the test holds the clip element of the reader. */
function audioStub(): HTMLAudioElement {
  const element = document.createElement("audio");
  clips.push(element);
  return element;
}

/**
 * Builds the DOMException of an aborted play, as a browser raises it when a new load starts.
 * @returns The abort error.
 */
function abortError(): DOMException {
  return new DOMException("The play() request was interrupted by a new load request.", "AbortError");
}

/**
 * Builds the DOMException of a play that the browser refuses.
 * @returns The failure error.
 */
function notSupportedError(): DOMException {
  return new DOMException("The media resource cannot be played.", "NotSupportedError");
}

/**
 * Reads the read-along book of one week.
 * @param week The week.
 * @returns The read-along book.
 */
function readerBook(week: StorytimeWeek): StorytimeWeek["books"][number] {
  return week.books.find((entry) => entry.kind === "readalong")!;
}

/**
 * Builds a book with a count of pages that hold no picture, so a page turn never waits for a
 * picture load.
 * @param week The week.
 * @param count The number of pages.
 * @returns The book.
 */
function bookWithPages(week: StorytimeWeek, count: number): StorytimeWeek["books"][number] {
  const book = structuredClone(readerBook(week));
  const first = book.pages[0]!;
  book.pages = Array.from({ length: count }, () => {
    const page = structuredClone(first);
    page.image = undefined;
    return page;
  });
  return book;
}

/**
 * Builds a book with a clip for every word of its first page.
 * @param week The week.
 * @returns The week with the clip map.
 */
function weekWithClips(week: StorytimeWeek): StorytimeWeek {
  const book = readerBook(week);
  const clipsMap: Record<string, string> = {};
  for (const word of ["hello", "i", "am", "pat"]) clipsMap[word] = `words/${word}.mp3`;
  (book.audio as unknown as { wordClips: Record<string, string> }).wordClips = clipsMap;
  return week;
}

/**
 * Builds the signed-URL map of one week.
 * @param week The week.
 * @returns The map.
 */
function mediaUrlsOf(week: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  const sign = (file: string | undefined) => {
    if (file) urls[file] = `https://media.example/${file}`;
  };
  for (const book of week.books) {
    sign(book.audio?.file);
    sign(book.audio?.slowFile);
    for (const page of book.pages) sign(page.image?.file);
  }
  const clipsMap = (readerBook(week).audio as unknown as { wordClips?: Record<string, string> })
    .wordClips;
  for (const file of Object.values(clipsMap ?? {})) sign(file);
  return urls;
}

/**
 * Loads the client reader with a named assertion when the module is missing.
 * @returns The reader component.
 */
async function loadReader(): Promise<ComponentType<Record<string, unknown>>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeReader: ComponentType<Record<string, unknown>>;
  };
  return loaded.StorytimeReader;
}

/**
 * Loads the client decodable with a named assertion when the module is missing.
 * @returns The decodable component.
 */
async function loadDecodable(): Promise<ComponentType<Record<string, unknown>>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeDecodable: ComponentType<Record<string, unknown>>;
  };
  return loaded.StorytimeDecodable;
}

/**
 * Reads the rules of one style sheet text.
 * @param text The style sheet text.
 * @returns The rules in source order.
 */
function rulesOf(text: string) {
  return parseCss(text);
}

/**
 * Reads the custom properties of the `:root` block of one style sheet text.
 * @param text The style sheet text.
 * @returns The properties by name.
 */
function variablesOf(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of rulesOf(text)) {
    if (!selectorParts(rule.selector).includes(":root")) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property.startsWith("--")) map.set(declaration.property, declaration.value);
    }
  }
  return map;
}

/**
 * Reports the rules of one plaque selector that forbid wrapping or cap no width.
 * @param text The style sheet text.
 * @returns The violations.
 */
function plaqueViolations(text: string): string[] {
  const violations: string[] = [];
  for (const rule of rulesOf(text)) {
    for (const part of selectorParts(rule.selector)) {
      if (!part.includes("h1") || part.includes("::")) continue;
      if (!part.includes("header[data-hero]")) continue;
      const nowrap = rule.declarations.find(
        (declaration) =>
          declaration.property === "white-space" && declaration.value.trim() === "nowrap",
      );
      if (nowrap) violations.push(`${part} sets white-space: nowrap`);
    }
  }
  const base = rulesOf(text).find((rule) =>
    selectorParts(rule.selector).some((part) => part === "header[data-hero] > h1"),
  );
  const maxWidth = base?.declarations.find((declaration) => declaration.property === "max-width");
  if (!maxWidth) violations.push("the plaque rule holds no max-width");
  return violations;
}

/**
 * Reports the font stacks of one style sheet text that end in no generic face.
 * @param text The style sheet text.
 * @returns The violations.
 */
function fontStackViolations(text: string): string[] {
  const violations: string[] = [];
  const variables = variablesOf(text);
  const display = variables.get("--sq-display") ?? "";
  if (!/,\s*(ui-sans-serif|system-ui|sans-serif)\s*$/.test(display)) {
    violations.push(`--sq-display=${display} ends in no generic face`);
  }
  const sentence = lastDeclaration(
    rulesOf(text),
    (rule) => selectorParts(rule.selector).some((part) => part === "[data-sentence]"),
    "font-family",
  );
  if (!sentence || !/,\s*(ui-sans-serif|system-ui|sans-serif)\s*$/.test(sentence.value.trim())) {
    violations.push(`the reading face is ${sentence?.value ?? "missing"} and ends in no generic face`);
  }
  return violations;
}

/**
 * Reports the painted grounds of one style sheet text that hold no background colour.
 * @param text The style sheet text.
 * @returns The violations.
 */
function groundViolations(text: string): string[] {
  const violations: string[] = [];
  const rules = rulesOf(text);
  const place = lastDeclaration(
    rules,
    (rule) => selectorParts(rule.selector).some((part) => part.includes("main[data-place]::before")),
    "background-color",
  );
  if (!place) violations.push("the place ground holds no background-color");
  const hero = lastDeclaration(
    rules,
    (rule) =>
      selectorParts(rule.selector).some(
        (part) => part.includes("header[data-hero]") && !part.includes("::"),
      ),
    "background-color",
  );
  if (!hero) violations.push("the hero window holds no background-color");
  return violations;
}

/**
 * Reports the decodable picture caps of one style sheet text that leave the short-height block
 * or that reach a viewport of more than 500 px of height.
 * @param text The style sheet text.
 * @returns The violations.
 */
function pictureCapViolations(text: string): string[] {
  const violations: string[] = [];
  const rules = rulesOf(text);
  const isDecodablePicture = (selector: string) =>
    selectorParts(selector).some(
      (part) => part.includes('[data-part="decodable"]') && part.includes("img"),
    );
  const isReaderPicture = (selector: string) =>
    selectorParts(selector).some(
      (part) => part.includes("[data-page-number]") && part.includes("img"),
    );
  const shortHeight = (rule: { media: string[] }) =>
    rule.media.some((media) => media.includes("max-height: 500px"));
  const capOf = (match: (selector: string) => boolean, inside: boolean): string | null => {
    let found: string | null = null;
    for (const rule of rules) {
      if (!match(rule.selector)) continue;
      if (shortHeight(rule) !== inside) continue;
      for (const declaration of rule.declarations) {
        if (declaration.property === "max-height") found = declaration.value;
      }
    }
    return found;
  };
  const decodableCap = capOf(isDecodablePicture, true);
  if (`decodable_cap=${lengthPx(decodableCap ?? "")}` !== "decodable_cap=84") {
    violations.push(`the decodable picture cap in the short-height block is ${decodableCap ?? "missing"}`);
  }
  const readerCap = capOf(isReaderPicture, true);
  if (`reader_cap=${lengthPx(readerCap ?? "")}` !== "reader_cap=110") {
    violations.push(`the reader picture cap in the short-height block is ${readerCap ?? "missing"}`);
  }
  const outside = capOf(isDecodablePicture, false);
  if (outside !== null && lengthPx(outside) === 84) {
    violations.push(`a decodable picture cap of ${outside} sits outside the short-height block`);
  }
  return violations;
}

beforeEach(() => {
  window.localStorage.clear();
  pending = [];
  plays = [];
  clips = [];
  vi.stubGlobal("Audio", audioStub);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    plays.push(this);
    // A new load on the same element aborts the pending play of that element, as a browser does.
    for (const entry of pending) {
      if (entry.element === this) entry.reject(abortError());
    }
    let reject!: (reason: unknown) => void;
    const promise = new Promise<void>((_resolve, fail) => {
      reject = fail;
    });
    pending.push({ element: this, reject });
    // The browser fires the play event in a later task, so the click handler has finished.
    queueMicrotask(() => this.dispatchEvent(new Event("play")));
    return promise;
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("pause"));
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("adversarial look cases of Phase 2", () => {
  it("V1 the title plaque wraps a 60-character title in English and in Thai", async () => {
    expect(plaqueViolations(css), "the plaque rules must not forbid wrapping").toEqual([]);
    // Self-test: a nowrap plaque fails the check.
    const nowrap = css.replace(
      "header[data-hero] > h1 {",
      "header[data-hero] > h1 {\n  white-space: nowrap;",
    );
    expect(nowrap, "the mutant must change the file").not.toBe(css);
    expect(plaqueViolations(nowrap).length, "a nowrap plaque must fail the check").toBeGreaterThan(0);

    const framePath = "../app/[locale]/frame";
    const { Frame } = (await import(/* @vite-ignore */ framePath)) as {
      Frame: ComponentType<Record<string, unknown>>;
    };
    const titleEn = "A very long week title that runs past the plaque of the book";
    const titleTh = "สัปดาห์ที่ยาวและยาวที่สุดในโรงเรื่องของเราทั้งหมดในโลกใบนี้ๆ";
    expect(titleEn.length, "the English title must hold 60 characters").toBe(60);
    expect(titleTh.length, "the Thai title must hold 60 characters").toBe(60);
    for (const [locale, title] of [
      ["en", titleEn],
      ["th", titleTh],
    ] as const) {
      const { container } = render(
        <Frame level={2} week={1} title={title} variant="cover" locale={locale} />,
      );
      const plaque = container.querySelector<HTMLElement>("header[data-hero] > h1");
      expect(plaque, `${locale}: the frame must render the title plaque`).not.toBeNull();
      expect(plaque!.textContent, `${locale}: the plaque must hold the whole title`).toBe(title);
      expect(plaque!.textContent?.includes("…"), `${locale}: the plaque must not cut the title`).toBe(
        false,
      );
      cleanup();
    }
  });

  it("V2 a failed font file leaves the text in a generic face", () => {
    expect(fontStackViolations(css), "the font stacks must end in a generic face").toEqual([]);
    // Self-test: a stack without a generic face fails the check.
    const noFallback = css.replace("var(--font-sarabun), ui-sans-serif, system-ui, sans-serif;", "var(--font-sarabun);");
    expect(noFallback, "the mutant must change the file").not.toBe(css);
    expect(fontStackViolations(noFallback).length, "a stack without a generic face must fail").toBeGreaterThan(
      0,
    );
  });

  it("A1 a place image that fails to load leaves a painted ground", () => {
    expect(groundViolations(css), "the place and the hero must hold a background colour").toEqual([]);
    // Self-test: a ground without a colour fails the check.
    const noColour = css.replace("  background-color: #2b6a3a;\n", "");
    expect(noColour, "the mutant must change the file").not.toBe(css);
    expect(groundViolations(noColour).length, "a ground without a colour must fail the check").toBeGreaterThan(
      0,
    );
    // The place images sit behind the text, so the text never sits on a broken picture.
    const placeRule = rulesOf(css).find((rule) =>
      selectorParts(rule.selector).some((part) => part.includes("main[data-place]::before")),
    );
    expect(placeRule?.declarations.some((declaration) => declaration.property === "background-image")).toBe(
      false,
    );
  });

  it("K1 a word clip that fails to load shows the alert and clears the pressed state", async () => {
    const week = weekWithClips(structuredClone(shipped));
    const Reader = await loadReader();
    const { container, unmount } = render(
      <Reader
        book={readerBook(week)}
        locale="en"
        labels={readerLabels}
        questions={[]}
        tiles={[]}
        mediaUrls={mediaUrlsOf(week)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: readerLabels.myTurn }));
    const word = container.querySelector<HTMLElement>('[data-word="0"]');
    expect(word, "the reader must render the first word").not.toBeNull();
    fireEvent.click(word!);
    expect(clips.length, "the reader must hold one clip element").toBe(1);
    const clip = clips[0]!;
    const pressed = container.querySelector<HTMLElement>("button[aria-pressed='true']");
    expect(pressed?.textContent, "the playing clip must press the My turn button").toBe(
      readerLabels.playing,
    );
    act(() => {
      clip.dispatchEvent(new Event("error"));
    });
    expect(
      screen.getByRole("alert").textContent,
      "a clip that fails to load must show the alert",
    ).toBe(readerLabels.audioError);
    const after = [...container.querySelectorAll<HTMLElement>("button[aria-pressed='true']")];
    expect(after.length, "a failed clip must clear the pressed state").toBe(0);
    unmount();
  });

  it("K2b a genuine play failure still shows the alert", async () => {
    const week = structuredClone(shipped);
    const Reader = await loadReader();
    const { unmount } = render(
      <Reader
        book={readerBook(week)}
        locale="en"
        labels={readerLabels}
        questions={[]}
        tiles={[]}
        mediaUrls={mediaUrlsOf(week)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: readerLabels.readToMe }));
    await act(async () => {
      const entry = pending.at(-1);
      entry?.reject(notSupportedError());
      await Promise.resolve();
    });
    expect(
      screen.getByRole("alert").textContent,
      "a play that the browser refuses must show the alert",
    ).toBe(readerLabels.audioError);
    unmount();
  });

  it("S1 the done badge keeps a drawn mark and no visible text with a long Thai label", async () => {
    const label = messages.th.partDone!;
    expect(label.length, "the Thai Done label must hold more than one character").toBeGreaterThan(1);
    window.localStorage.setItem(DONE_KEY, JSON.stringify({ "2:1:book": true }));
    const donePath = "../app/[locale]/st/[level]/[week]/done-mark";
    const { DoneMark } = (await import(/* @vite-ignore */ donePath)) as {
      DoneMark: ComponentType<{ doneKey: string; label: string }>;
    };
    const { container } = render(<DoneMark doneKey="2:1:book" label={label} />);
    const badge = container.querySelector<HTMLElement>("[data-done-badge]");
    expect(badge, "the done mark must render the badge").not.toBeNull();
    expect(badge!.getAttribute("aria-label"), "the badge must name the localized Done label").toContain(
      label,
    );
    expect(badge!.querySelector("svg"), "the badge must hold the drawn check").not.toBeNull();
    const path = badge!.querySelector("svg path");
    expect(path?.getAttribute("stroke"), "the check must use the current colour").toBe("currentColor");
    // A long label must not sit in the visible box of the badge.
    const visible = [...badge!.querySelectorAll<HTMLElement>("*")].filter(
      (element) => !(element.getAttribute("class") ?? "").includes("sr-only"),
    );
    for (const element of visible) {
      expect(element.textContent?.trim(), "the badge must hold no visible label text").toBe("");
    }
    const rules = rulesOf(css);
    const size = lastDeclaration(
      rules,
      (rule) =>
        selectorParts(rule.selector).some(
          (part) => part.includes("[data-done-badge]") && !part.includes("::"),
        ),
      "width",
    );
    expect(`badge_w=${lengthPx(size?.value ?? "")}`, "the badge must be 32 CSS px wide").toBe("badge_w=32");
  });

  it("S2 the decodable sound button keeps one pressed state under a tap storm", async () => {
    const Decodable = await loadDecodable();
    const week = structuredClone(shipped);
    const { container, unmount } = render(
      <Decodable week={week} locale="en" labels={decodableLabels} mediaUrls={mediaUrlsOf(week)} />,
    );
    const button = screen.getByRole("button", { name: decodableLabels.playSound });
    await act(async () => {
      for (let tap = 0; tap < 20; tap += 1) {
        fireEvent.click(button);
      }
      await Promise.resolve();
    });
    const pressed = [...container.querySelectorAll<HTMLElement>("button[aria-pressed='true']")];
    expect(`pressed_states=${pressed.length}`, "one button must stay pressed after the storm").toBe(
      "pressed_states=1",
    );
    expect(pressed[0]!.textContent, "the pressed button must show the playing label").toBe(
      decodableLabels.playing,
    );
    expect(
      screen.queryByRole("alert"),
      "a tap storm must not show the sound error (the browser aborts the pending play)",
    ).toBeNull();
    const phoneme = container.querySelectorAll("audio")[0]!;
    act(() => {
      phoneme.dispatchEvent(new Event("ended"));
    });
    const after = [...container.querySelectorAll<HTMLElement>("button[aria-pressed='true']")];
    expect(`pressed_after_end=${after.length}`, "the pressed state must clear when the sound ends").toBe(
      "pressed_after_end=0",
    );
    unmount();
  });

  it("S3 the decodable sound button clears its pressed state on an audio error", async () => {
    const Decodable = await loadDecodable();
    const week = structuredClone(shipped);
    const { container, unmount } = render(
      <Decodable week={week} locale="en" labels={decodableLabels} mediaUrls={mediaUrlsOf(week)} />,
    );
    const button = screen.getByRole("button", { name: decodableLabels.playSound });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(
      container.querySelector("button[aria-pressed='true']"),
      "the sound button must be pressed while the sound plays",
    ).not.toBeNull();
    const phoneme = container.querySelectorAll("audio")[0]!;
    act(() => {
      phoneme.dispatchEvent(new Event("error"));
    });
    expect(
      container.querySelector("button[aria-pressed='true']"),
      "an audio error must clear the pressed state",
    ).toBeNull();
    expect(
      screen.getByRole("alert").textContent,
      "an audio error must show the alert",
    ).toBe(decodableLabels.audioError);
    unmount();
  });

  it("S4 the page counter reads 1 / 1 and 99 / 99", async () => {
    const Reader = await loadReader();
    const week = structuredClone(shipped);
    const one = render(
      <Reader
        book={bookWithPages(week, 1)}
        locale="en"
        labels={readerLabels}
        questions={[]}
        tiles={[]}
        mediaUrls={mediaUrlsOf(week)}
      />,
    );
    expect(
      one.container.querySelector("[data-page-count]")?.textContent,
      "a one-page book must read 1 / 1",
    ).toBe("1 / 1");
    one.unmount();

    const many = render(
      <Reader
        book={bookWithPages(week, 99)}
        locale="en"
        labels={readerLabels}
        questions={[]}
        tiles={[]}
        mediaUrls={mediaUrlsOf(week)}
      />,
    );
    expect(
      many.container.querySelector("[data-page-count]")?.textContent,
      "the first page of a 99-page book must read 1 / 99",
    ).toBe("1 / 99");
    for (let page = 1; page < 99; page += 1) {
      fireEvent.click(screen.getByRole("button", { name: readerLabels.nextPage }));
    }
    expect(
      many.container.querySelector("[data-page-count]")?.textContent,
      "the last page of a 99-page book must read 99 / 99",
    ).toBe("99 / 99");
    many.unmount();
  });

  it("S5 the parent speaker plays its own recording under a double tap and a load error", async () => {
    routeMocks.loadVisibleWeek.mockResolvedValue(JSON.parse(JSON.stringify(week3)) as StorytimeWeek);
    const pagePath = "../app/[locale]/st/[level]/[week]/page";
    type WeekPageProps = {
      params: Promise<{ locale: string; level: string; week: string }>;
      searchParams: Promise<Record<string, string | string[] | undefined>>;
    };
    const { default: Page } = (await import(/* @vite-ignore */ pagePath)) as {
      default: (props: WeekPageProps) => Promise<ReactElement>;
    };
    const element = await Page({
      params: Promise.resolve({ locale: "en", level: "2", week: "3" }),
      searchParams: Promise.resolve({}),
    });
    const { container, unmount } = render(element);
    const panel = container.querySelector<HTMLElement>("[data-parent-panel]");
    expect(panel, "the week page must render the parent panel").not.toBeNull();
    const audio = panel!.querySelector("audio");
    expect(audio, "the parent panel must hold its recorded clip").not.toBeNull();
    const button = panel!.querySelector("button");
    expect(button, "the parent panel must hold its speaker button").not.toBeNull();
    const before = plays.length;
    fireEvent.click(button!);
    fireEvent.click(button!);
    expect(`plays=${plays.length - before}`, "a double tap must play the panel recording twice").toBe(
      `plays=${2}`,
    );
    expect(plays.at(-1), "the speaker must play the audio element beside it").toBe(audio);
    expect(audio!.currentTime, "the speaker must restart the recording").toBe(0);
    act(() => {
      audio!.dispatchEvent(new Event("error"));
    });
    expect(panel!.isConnected, "a failed recording must not remove the parent panel").toBe(true);
    expect(
      panel!.querySelector("audio[controls]"),
      "the parent panel must hold no native audio controls",
    ).toBeNull();
    unmount();

    // Two speakers on one page: each button must play the recording beside it.
    const speakerPath = "../app/[locale]/st/[level]/[week]/speaker-button";
    const { SpeakerButton } = (await import(/* @vite-ignore */ speakerPath)) as {
      SpeakerButton: ComponentType<{ label: string }>;
    };
    const harness = render(
      <div>
        <span data-speaker>
          <audio data-first />
          <SpeakerButton label="first" />
        </span>
        <span data-speaker>
          <audio data-second />
          <SpeakerButton label="second" />
        </span>
      </div>,
    );
    const second = harness.container.querySelectorAll("button")[1]!;
    const count = plays.length;
    fireEvent.click(second);
    expect(plays.at(-1), "the second speaker must play the recording beside it").toBe(
      harness.container.querySelector("audio[data-second]"),
    );
    expect(`plays=${plays.length - count}`, "the second speaker must play once").toBe("plays=1");
    harness.unmount();
  });

  it("C1 the 84 px decodable picture cap holds only in the short-height block", () => {
    expect(pictureCapViolations(css), "the 84 px cap must sit in the short-height block").toEqual([]);
    // Self-test: a cap outside the short-height block fails the check.
    const outside = css.replace(
      "  [data-part=\"decodable\"] section > img {\n    max-height: 84px;\n  }\n",
      "",
    );
    expect(outside, "the mutant must change the file").not.toBe(css);
    expect(
      pictureCapViolations(outside).length,
      "a cap outside the short-height block must fail the check",
    ).toBeGreaterThan(0);
    // The 340 px cap of a tall screen must not reach a short viewport.
    const tall = rulesOf(css).find(
      (rule) =>
        rule.media.some((media) => media.includes("min-height: 501px")) &&
        rule.declarations.some((declaration) => declaration.property === "max-height"),
    );
    expect(tall?.media.join(" "), "the 340 px cap must sit in the tall-screen block").toContain(
      "min-height: 501px",
    );
  });
});
