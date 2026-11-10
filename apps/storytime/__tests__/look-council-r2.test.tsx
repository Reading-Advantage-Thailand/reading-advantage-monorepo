// @vitest-environment jsdom
/**
 * Task 2.3f: the UI council round 2 fix batch (PM, 2026-11-08; round 2 score 79.9 of 100).
 *
 * Four PM items, each with the rule where it lives in code:
 *   R1 Week done mark: the message files hold the localized Done label (the Thai value is a draft
 *      with `partDoneStatus: "draft"`, the way the content approval records a draft), and a client
 *      mark reads a per-device completion record. No server record exists: the app writes no
 *      progress row. The reader, the decodable, and the song write the record when they finish.
 *      The browser gate measures `done_marks_found` before and after one part.
 *   R2 Song lyric line: no line is active before playback, and the line whose start time the
 *      playback reaches is the active line. The browser gate adds `active_line_before_play=0`.
 *   R3 Song action chip: each gesture label is a chip with a hook; `look.css` gives it 16 CSS px or
 *      more, an opaque background, a brown label, and 4.5:1 or more. jsdom loads no CSS, so the
 *      file is read as an artifact; the browser gate measures the computed values.
 *   R4 Word gap regression: the decodable sentence declares a word gap of 0.25em or more, and the
 *      text keeps no space before punctuation. The browser gate measures the gap between two word
 *      boxes (`word_gap_em_min>=0.25`).
 *
 * The 2.3e file `look-council-r1.test.tsx` forbade `gap-x-1` on the decodable paragraph. That
 * token is one way to reach the 0.25em gap, so task 2.3f narrows the 2.3e assertion: a small gap
 * passes, and only a wide gap fails. The intent (no wide gap, no space before punctuation) stays.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import { lastDeclaration, lengthPx, parseCss, selectorParts } from "./helpers/css-rules";

// The media of a week comes from the signed map of the page. The mock keeps a URL for every file.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) => `https://media.example/${file}`,
}));

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const messages = {
  en: JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>,
  th: JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>,
};

/** The localStorage key of the per-device completion record. */
const DONE_KEY = "storytime:done";

/** Reads the per-device completion record. */
function doneRecord(): Record<string, boolean> {
  return JSON.parse(window.localStorage.getItem(DONE_KEY) ?? "{}") as Record<string, boolean>;
}

/** The reader labels of one locale, as the server page builds them. */
function readerLabels(locale: "en" | "th") {
  const text = messages[locale];
  return {
    readToMe: text.playerReadToMe,
    myTurn: text.playerMyTurn,
    slow: text.playerSlow,
    previousPage: text.playerPreviousPage,
    nextPage: text.playerNextPage,
    audioError: text.playerAudioError,
    finished: text.playerFinished,
    playing: text.playerPlaying,
  };
}

/** Renders the real song of the shipped week. */
async function renderSong(locale: "en" | "th" = "en", extra: Record<string, unknown> = {}) {
  const modulePath = "../app/[locale]/st/[level]/[week]/song";
  const { StorytimeSong } = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeSong: ComponentType<Record<string, unknown>>;
  };
  return render(
    <StorytimeSong
      song={shipped.song!}
      mediaUrls={{}}
      labels={{ play: messages[locale].songPlay, pause: messages[locale].songPause }}
      {...extra}
    />,
  );
}

/** One resolved CSS colour. */
interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Reads a CSS colour as channels. */
function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1]!;
    const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
  if (!rgb) return null;
  const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;
  return { r: parts[0]!, g: parts[1]!, b: parts[2]!, a: parts[3] ?? 1 };
}

/** Reads the `:root` custom properties of a style sheet. */
function cssVariables(css: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of parseCss(css)) {
    if (!selectorParts(rule.selector).includes(":root")) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property.startsWith("--")) map.set(declaration.property, declaration.value);
    }
  }
  return map;
}

/** Replaces the `var()` references of a value with the custom properties it finds. */
function resolveValue(value: string, variables: Map<string, string>): string {
  let text = value.trim();
  for (let pass = 0; pass < 5; pass += 1) {
    const match = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/.exec(text);
    if (!match) break;
    text = text.replace(match[0], variables.get(match[1]!) ?? match[2] ?? "");
  }
  return text;
}

/** The relative luminance of a colour (WCAG 2.x). */
function luminance(color: Rgba): number {
  const channel = (value: number) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** The WCAG contrast ratio of two colours. */
function contrastRatio(one: Rgba, two: Rgba): number {
  const high = Math.max(luminance(one), luminance(two));
  const low = Math.min(luminance(one), luminance(two));
  return (high + 0.05) / (low + 0.05);
}

/** True when the colour reads as brown: red dominates, then green, then blue, and the colour is dark. */
function isBrown(color: Rgba): boolean {
  return color.r > color.g && color.g > color.b && color.r >= 100 && color.g <= 120 && color.b <= 80;
}

/** Lists the failures of the action-chip rule of `look.css`. */
function actionChipFailures(css: string): string[] {
  const rules = parseCss(css);
  const variables = cssVariables(css);
  const isChip = (selector: string) => selectorParts(selector).some((part) => part.includes("[data-action-chip]"));
  const size = lastDeclaration(rules, (rule) => isChip(rule.selector), "font-size");
  const background = lastDeclaration(rules, (rule) => isChip(rule.selector), "background-color")
    ?? lastDeclaration(rules, (rule) => isChip(rule.selector), "background");
  const label = lastDeclaration(rules, (rule) => isChip(rule.selector), "color");
  const failures: string[] = [];
  if (!size) failures.push("Missing a [data-action-chip] rule with font-size");
  if (!background) failures.push("Missing a [data-action-chip] rule with background-color");
  if (!label) failures.push("Missing a [data-action-chip] rule with color");
  const pixels = size ? lengthPx(size.value) : null;
  if (size && (pixels === null || pixels < 16)) failures.push(`the [data-action-chip] font size must be 16 px or more, received ${size.value}`);
  const bg = background ? parseColor(resolveValue(background.value, variables)) : null;
  const fg = label ? parseColor(resolveValue(label.value, variables)) : null;
  if (background && !bg) failures.push(`the [data-action-chip] background is not a colour: ${background.value}`);
  if (label && !fg) failures.push(`the [data-action-chip] label is not a colour: ${label.value}`);
  if (bg && bg.a !== 1) failures.push(`the [data-action-chip] background must be opaque, alpha=${bg.a}`);
  if (fg && !isBrown(fg)) failures.push(`the [data-action-chip] label must be brown, received ${label!.value}`);
  if (bg && fg) {
    const ratio = contrastRatio(bg, fg);
    if (ratio < 4.5) failures.push(`the [data-action-chip] contrast must be 4.5 or more, contrast=${ratio.toFixed(2)}`);
  }
  return failures;
}

/** The largest word gap that `look.css` declares for the decodable sentence, in em. */
function decodableGapEm(css: string): number | null {
  const rules = parseCss(css);
  const targets = rules.filter((rule) =>
    selectorParts(rule.selector).some(
      (part) => part.includes("[data-page-number]") && part.includes("p"),
    ),
  );
  let best: number | null = null;
  for (const rule of targets) {
    for (const declaration of rule.declarations) {
      if (!["column-gap", "gap", "word-spacing"].includes(declaration.property)) continue;
      const em = /^([0-9.]+)em$/.exec(declaration.value.trim());
      const pixels = lengthPx(declaration.value);
      const value = em ? Number(em[1]) : pixels === null ? null : pixels / 16;
      if (value !== null && (best === null || value > best)) best = value;
    }
  }
  return best;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the council round 2 fix batch (task 2.3f)", () => {
  it("R1 the Done label is localized and the Thai value carries the draft status", () => {
    expect(`en.partDone=${messages.en.partDone}`, "messages/en.json partDone must read Done").toBe(
      "en.partDone=Done",
    );
    expect(
      /[\u0E00-\u0E7F]/.test(messages.th.partDone ?? ""),
      `messages/th.json partDone must hold a Thai draft, received ${JSON.stringify(messages.th.partDone)}`,
    ).toBe(true);
    expect(
      `th.partDoneStatus=${messages.th.partDoneStatus}`,
      "messages/th.json partDoneStatus must read draft, the approval status the content files use",
    ).toBe("th.partDoneStatus=draft");
  });

  it("R1 the done mark reads the per-device record and shows a check icon with the label", async () => {
    const modulePath = "../app/[locale]/st/[level]/[week]/done-mark";
    const moduleFile = resolve(app, "app/[locale]/st/[level]/[week]/done-mark.tsx");
    expect(
      existsSync(moduleFile),
      "Missing apps/storytime/app/[locale]/st/[level]/[week]/done-mark.tsx",
    ).toBe(true);
    if (!existsSync(moduleFile)) return;
    const { DoneMark } = (await import(/* @vite-ignore */ modulePath)) as {
      DoneMark: ComponentType<{ doneKey: string; label: string }>;
    };
    window.localStorage.setItem(DONE_KEY, JSON.stringify({ "2:1:book": true }));
    const done = render(<DoneMark doneKey="2:1:book" label="Done" />);
    const mark = await waitFor(() => {
      const found = done.container.querySelector<HTMLElement>("[data-done-mark]");
      expect(found, "a finished part must show the [data-done-mark] mark").not.toBeNull();
      return found!;
    }, { timeout: 2000 });
    expect(mark.textContent?.trim(), "the mark must show the Done label").toContain("Done");
    expect(
      mark.querySelector("[data-done-icon], svg"),
      "the Done label must carry a check icon",
    ).not.toBeNull();
    cleanup();
    const open = render(<DoneMark doneKey="2:1:song" label="Done" />);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
    expect(
      open.container.querySelector("[data-done-mark]"),
      "a part that is not done must show no mark",
    ).toBeNull();
  });

  it("R1 the reader, the decodable, and the song write the record at their own end", async () => {
    const failures: string[] = [];
    const readerPath = "../app/[locale]/st/[level]/[week]/reader";
    const decodablePath = "../app/[locale]/st/[level]/[week]/decodable";
    const songPath = "../app/[locale]/st/[level]/[week]/song";
    const { StorytimeReader } = (await import(/* @vite-ignore */ readerPath)) as {
      StorytimeReader: ComponentType<Record<string, unknown>>;
    };
    const { StorytimeDecodable } = (await import(/* @vite-ignore */ decodablePath)) as {
      StorytimeDecodable: ComponentType<Record<string, unknown>>;
    };
    const { StorytimeSong } = (await import(/* @vite-ignore */ songPath)) as {
      StorytimeSong: ComponentType<Record<string, unknown>>;
    };
    const book = shipped.books.find((entry) => entry.kind === "readalong")!;
    const decodable = shipped.books.find((entry) => entry.kind === "decodable")!;
    const tiles = [{ id: "readalong", href: "?part=book", label: "Read-along" }];

    // The song ends.
    const song = render(<StorytimeSong song={shipped.song!} mediaUrls={{}} labels={{ play: "Play", pause: "Pause" }} doneKey="2:1:song" />);
    const media = song.container.querySelector("video, audio");
    if (!media) failures.push("the song holds no media element");
    else fireEvent.ended(media);
    if (doneRecord()["2:1:song"] !== true) failures.push("song ended: no 2:1:song record");
    cleanup();

    // The decodable reaches its last page.
    const dec = render(<StorytimeDecodable week={shipped} locale="en" mediaUrls={{}} doneKey="2:1:decodable" />);
    const nextDec = dec.container.querySelector<HTMLButtonElement>(`button[aria-label="${messages.en.decNextPage}"]`);
    if (!nextDec) failures.push("the decodable holds no next-page button");
    else {
      for (let step = 0; step <= decodable.pages.length; step += 1) {
        if (nextDec.disabled) break;
        fireEvent.click(nextDec);
      }
    }
    if (doneRecord()["2:1:decodable"] !== true) failures.push("decodable last page: no 2:1:decodable record");
    cleanup();

    // The book reaches its last page and the end view.
    const reader = render(
      <StorytimeReader
        book={book}
        locale="en"
        labels={readerLabels("en")}
        questions={[]}
        tiles={tiles}
        questionLabels={{ skip: "Skip", right: "Yes", gentle: "Try again", picture: "Picture {n}" }}
        mediaUrls={{}}
        doneKey="2:1:book"
      />,
    );
    const nextBook = reader.container.querySelector<HTMLButtonElement>(`button[aria-label="${messages.en.playerNextPage}"]`);
    if (!nextBook) failures.push("the reader holds no next-page button");
    else {
      for (let step = 0; step <= book.pages.length; step += 1) {
        if (nextBook.disabled) break;
        fireEvent.click(nextBook);
      }
    }
    if (doneRecord()["2:1:book"] !== true) failures.push("book last page: no 2:1:book record");
    expect(failures, "the per-device completion writes").toEqual([]);
  });

  it("R2 no lyric line is active before playback and the line follows the playback time", async () => {
    const { container } = await renderSong();
    const active = () => {
      const line = container.querySelector('li[aria-current="true"]');
      return line ? Number(line.getAttribute("data-line-index")) : -1;
    };
    expect(`active_line_before_play=${active()}`, "no lyric line may be active before playback").toBe(
      "active_line_before_play=-1",
    );
    const media = container.querySelector<HTMLMediaElement>(".song-stage video, .song-stage audio");
    expect(media, "the song must render its media element").not.toBeNull();
    const song = shipped.song!;
    const lead = song.video || song.videoPhone ? (song.videoLeadInSeconds ?? 0) : 0;
    media!.currentTime = song.times[0]!.startTime + lead - 0.01;
    fireEvent.timeUpdate(media!);
    expect(`active_line_before_first=${active()}`, "no line may be active before the first start time").toBe(
      "active_line_before_first=-1",
    );
    media!.currentTime = song.times[0]!.startTime + lead + 0.01;
    fireEvent.timeUpdate(media!);
    expect(`active_line_first=${active()}`, "line 1 must be active when its start time is reached").toBe(
      "active_line_first=0",
    );
    media!.currentTime = song.times[1]!.startTime + lead + 0.01;
    fireEvent.timeUpdate(media!);
    expect(`active_line_second=${active()}`, "line 2 must be active when its start time is reached").toBe(
      "active_line_second=1",
    );
  });

  it("R3 each song gesture label is an action chip with the hook", async () => {
    const failures: string[] = [];
    let lines = 0;
    for (const locale of ["en", "th"] as const) {
      const { container } = await renderSong(locale);
      const list = [...container.querySelectorAll("[data-line-index]")];
      lines += list.length;
      for (const line of list) {
        const chip = line.querySelector("[data-action-chip]");
        if (!chip) {
          failures.push(`${locale}: the line "${(line.textContent ?? "").trim()}" holds no [data-action-chip]`);
          break;
        }
        const gesture = (shipped.song!.lines[Number(line.getAttribute("data-line-index"))]!.gesture ?? "").trim();
        if (!(chip.textContent ?? "").includes(gesture)) {
          failures.push(`${locale}: the chip must hold the gesture text ${JSON.stringify(gesture)}`);
        }
      }
      cleanup();
    }
    expect(`song_lines=${lines}`, "the song must render every line in en and th").toBe(
      `song_lines=${shipped.song!.lines.length * 2}`,
    );
    expect(failures, "the action chip hooks").toEqual([]);
  });

  it("R3 look.css gives the action chip 16 px, an opaque fill, brown, and 4.5:1", () => {
    // spec FR-4 (c), Daniel 2026-11-10: brown text on amber.
    const css = readFileSync(lookCssPath, "utf8");
    expect(actionChipFailures(css), "the [data-action-chip] rules of look.css").toEqual([]);
  });

  it("R3 the action chip checks reject the broken copies (falsification)", () => {
    // spec FR-4 (c), Daniel 2026-11-10: brown text on amber.
    const good = `:root { --cream: #fff8e1; --brown: #92400e; }
[data-action-chip] { font-size: 16px; background-color: var(--cream); color: var(--brown); }`;
    expect(actionChipFailures(good), "the good copy passes").toEqual([]);
    expect(actionChipFailures(good.replace("16px", "14px")).join(" "), "a small label fails").toContain("16 px");
    expect(
      actionChipFailures(good.replace("background-color: var(--cream)", "background-color: rgba(255, 248, 225, 0.6)")).join(" "),
      "a see-through chip fails",
    ).toContain("opaque");
    expect(
      actionChipFailures(good.replace("color: var(--brown)", "color: var(--cream)")).join(" "),
      "a dim label fails",
    ).toContain("contrast");
    expect(actionChipFailures(".x { font-size: 16px; }").join(" "), "a missing rule fails").toContain("Missing a [data-action-chip]");
  });

  it("R4 the decodable sentence declares a word gap of 0.25em or more and keeps no space before punctuation", async () => {
    const css = readFileSync(lookCssPath, "utf8");
    const gap = decodableGapEm(css);
    expect(gap, "Missing a word gap rule of 0.25em or more on the decodable sentence in look.css").not.toBeNull();
    expect(gap! >= 0.25, `the decodable word gap must be 0.25em or more, received ${gap}em`).toBe(true);
    for (const locale of ["en", "th"] as const) {
      const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
      const { StorytimeDecodable } = (await import(/* @vite-ignore */ modulePath)) as {
        StorytimeDecodable: ComponentType<Record<string, unknown>>;
      };
      const { container } = render(<StorytimeDecodable week={shipped} locale={locale} mediaUrls={{}} />);
      const paragraph = container.querySelector<HTMLElement>("[data-page-number] p");
      expect(paragraph, "the decodable must render its sentence").not.toBeNull();
      const text = (paragraph!.textContent ?? "").replace(/\s+$/, "");
      expect(text.match(/[ \t]+[.,!?]/g) ?? [], `${locale}: no space before punctuation`).toEqual([]);
      cleanup();
    }
  });
});
