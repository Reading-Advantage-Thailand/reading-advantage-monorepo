// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekJson from "../content/l2/w01.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/**
 * The Red tests of the media step of the teacher lesson flow (plan task 4.4, AC-9.2, rule D1).
 *
 * The week file holds no field that marks a step with media. Rule D1 (test strategy P4.4, open
 * question 6, default D1) reads one table in one function. A step opens the player only when one
 * `materials` entry starts with a fixed key and ends with `: "<title>"`, and that title equals a
 * media object of the same week.
 *
 * | Fixed key (start of the entry) | The entry ends with | The step opens |
 * |---|---|---|
 * | `karaoke videos` | `: "<title>"` and the title is `song.title` | the song part |
 * | `book audio` | `: "<title>"` and the title is a `books[].title` | the book part: read-along or decodable |
 *
 * All other entries open nothing. The rule never reads a step id. On the shipped w01 the rule
 * finds `media_steps=4` in the steps B3, B7, D6, and E2.
 *
 * Contract for Green:
 *
 * 1. `apps/storytime/lib/teacher-media.ts` exports `stepMediaOf(step, week)`. The step is one
 *    `scripts[].steps[]` entry of the week, and the week is the parsed `StorytimeWeek`. The
 *    function returns `null` or `{ kind, title, files }`:
 *    - `kind` is `"song"`, `"readalong"`, or `"decodable"`.
 *    - `title` is the song title or the book title from the week.
 *    - `files` lists the media files of the part that the player may show, primary file first.
 *    The rule uses the first matching entry in the `materials` order when a step holds two.
 *
 * 2. The day page `app/[locale]/teacher/[level]/[week]/[day]/page.tsx` signs the week with
 *    `signWeekMedia(loaded.week, {})`, as the week page does, and passes `mediaUrls` to the flow.
 *    No client code builds a URL from the week path.
 *
 * 3. `TeacherLessonFlow` takes an optional prop `mediaUrls?: Record<string, string>`. The test of
 *    task 4.3 passes no `mediaUrls`, so the prop keeps a default.
 *
 * 4. The step screen root carries `data-step-id={step.id}` and `data-step-index={index}`, where
 *    `index` is the 0-based position of the step among the steps of the day. The opening screen
 *    holds step index 0.
 *
 * 5. On a media step the flow shows one button named `Open media`. A click opens the player: a
 *    region with `aria-label="The media player"`, the media title as text, the record with the
 *    control named `Close`, and the at-home player of Phase 3 (`StorytimeSong`,
 *    `StorytimeReader`, or `StorytimeDecodable`) with the prop `playerMode="class-screen"`.
 *
 * 6. `StorytimeSong`, `StorytimeReader`, and `StorytimeDecodable` take an optional prop
 *    `playerMode?: "at-home" | "class-screen"` with the default `"at-home"`. They put
 *    `data-mode={playerMode}` on their root element. The class-screen mode uses the regular media
 *    pair and never the phone pair, because the class screen is 1920x1080.
 *
 * 7. The flow stays mounted while the player is open: the step id, the step title, the Thai
 *    toggle, and the `Next step` control keep their place in the DOM. A close keeps the step and
 *    the Thai state. The control named `Close` and the Escape key both close the player, and
 *    focus returns to the button that opened it.
 *
 * 8. The player never calls `HTMLMediaElement.prototype.play` on open. Its own control named
 *    `Play` plays.
 *
 * 9. The open player shows the file of the `mediaUrls` map only. A part with no signed URL shows
 *    the message `This media is not available.` in English and `สื่อนี้ยังไม่พร้อม` in Thai, and
 *    opens no player.
 *
 * Every count is a labeled integer that the test parses (A3): `media_steps=<n>`, `controls=<n>`,
 * `index=<n>`, `play_calls=<n>`, `players=<n>`, and `files_scanned=<n>`. A list is never empty
 * before a detail is asserted (A4). The cases that pass at HEAD are named as characterizations
 * in the failure message. The test reads the shipped week and never a fixture.
 */

/** The accessible name of the control that opens the player. */
const OPEN_MEDIA = "Open media";

/** The accessible name of the control that closes the player. */
const CLOSE = "Close";

/** The accessible name of the player region. */
const PLAYER = "The media player";

/** The accessible name of the Thai toggle of the lesson flow. */
const THAI_TOGGLE = "ไทย";

/** The accessible name of the forward control of the lesson flow. */
const NEXT_STEP = "Next step";

/** The accessible name of the play control of the at-home player. */
const PLAY = "Play";

/** The English message of a media part with no signed URL. */
const MEDIA_MISSING_EN = "This media is not available.";

/** The Thai message of a media part with no signed URL. */
const MEDIA_MISSING_TH = "สื่อนี้ยังไม่พร้อม";

/** The five days of the week contract. */
const DAYS = [1, 2, 3, 4, 5] as const;

/** The media steps of the shipped w01 under rule D1, in day order. */
const MEDIA_CASES = [
  { day: 2, id: "B3" },
  { day: 2, id: "B7" },
  { day: 4, id: "D6" },
  { day: 5, id: "E2" },
] as const;

/** The shipped milestone week, parsed with the app contract. */
const week: StorytimeWeek = weekSchema.parse(weekJson) as StorytimeWeek;

/** One step of a lesson day. */
type LessonStep = StorytimeWeek["scripts"][number]["steps"][number];

/** The media part that rule D1 finds for a step. */
interface StepMedia {
  /** The part that the player shows. */
  kind: "song" | "readalong" | "decodable";
  /** The title of the song or the book. */
  title: string;
  /** The media files of the part, primary file first. */
  files: string[];
}

/** The function of rule D1. */
type StepMediaRule = (step: LessonStep, source: StorytimeWeek) => StepMedia | null;

/** The props of the lesson flow of Green. */
interface LessonFlowProps {
  /** The week of the day. */
  week: StorytimeWeek;
  /** The lesson day, 1 to 5. */
  day: number;
  /** The locale segment of the route. */
  locale: string;
  /** The signed media URL of each file name. */
  mediaUrls?: Record<string, string>;
}

beforeEach(() => {
  setPhone(false);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});

/**
 * Counts the calls of `HTMLMediaElement.prototype.play` in the current test.
 * @returns The call count.
 */
function playCalls(): number {
  return vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Sets the result of the portrait-phone media query of the next render.
 * @param matches `true` when the query must match.
 */
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

/**
 * Loads the media rule and fails with a named assertion when the module is absent.
 * @returns The function of rule D1.
 */
async function loadRule(): Promise<StepMediaRule> {
  const modulePath = "../lib/teacher-media";
  let rule: unknown;
  try {
    rule = ((await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>).stepMediaOf;
  } catch (error) {
    expect(
      error,
      "Storytime must add rule D1 at lib/teacher-media.ts exporting stepMediaOf(step, week)",
    ).toBeUndefined();
    throw error;
  }
  expect(
    typeof rule,
    "lib/teacher-media.ts must export the function stepMediaOf",
  ).toBe("function");
  return rule as StepMediaRule;
}

/**
 * Loads the lesson flow and fails with a named assertion when the module is absent.
 * @returns The lesson flow of the teacher.
 */
async function loadFlow(): Promise<ComponentType<LessonFlowProps>> {
  const modulePath = "../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow";
  let flow: unknown;
  try {
    flow = ((await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>)
      .TeacherLessonFlow;
  } catch (error) {
    expect(
      error,
      "Storytime must add the teacher lesson flow at app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx exporting TeacherLessonFlow",
    ).toBeUndefined();
    throw error;
  }
  expect(
    typeof flow,
    "the module app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx must export TeacherLessonFlow",
  ).toBe("function");
  return flow as ComponentType<LessonFlowProps>;
}

/**
 * Loads the at-home song player.
 * @returns The song view of Phase 3.
 */
async function loadSong(): Promise<ComponentType<{ song: NonNullable<StorytimeWeek["song"]>; mediaUrls?: Record<string, string> }>> {
  const modulePath = "../app/[locale]/st/[level]/[week]/song";
  const song = ((await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>)
    .StorytimeSong;
  expect(typeof song, "the app must hold the at-home song view StorytimeSong").toBe("function");
  return song as ComponentType<{
    song: NonNullable<StorytimeWeek["song"]>;
    mediaUrls?: Record<string, string>;
  }>;
}

/**
 * Returns the lesson of one day, with a named guard for a missing day.
 * @param source The week.
 * @param day The lesson day, 1 to 5.
 * @returns The script of the day.
 */
function dayScript(source: StorytimeWeek, day: number) {
  const script = source.scripts.find((entry) => entry.day === day);
  expect(script, `the shipped week must hold the lesson of day ${day}`).toBeDefined();
  if (!script) throw new Error(`the week holds no lesson for day ${day}`);
  expect(
    script.steps.length,
    `day=${day} steps=${script.steps.length}: every day must hold at least one step`,
  ).toBeGreaterThan(0);
  return script;
}

/**
 * Returns one step of one day, with a named guard.
 * @param source The week.
 * @param day The lesson day, 1 to 5.
 * @param id The step id.
 * @returns The step.
 */
function stepOf(source: StorytimeWeek, day: number, id: string): LessonStep {
  const step = dayScript(source, day).steps.find((entry) => entry.id === id);
  expect(step, `the week must hold the step ${id} of day ${day}`).toBeDefined();
  if (!step) throw new Error(`the week holds no step ${id} of day ${day}`);
  return step;
}

/**
 * Returns the song of a week, with a named guard.
 * @param source The week.
 * @returns The song.
 */
function songOf(source: StorytimeWeek): NonNullable<StorytimeWeek["song"]> {
  expect(source.song, "the shipped week must hold the song").toBeDefined();
  if (!source.song) throw new Error("the week holds no song");
  return source.song;
}

/**
 * Lists the media files of one week.
 * @param source The week.
 * @returns The media files, without the approval prose.
 */
function mediaFilesOf(source: StorytimeWeek): string[] {
  const files: string[] = [];
  const song = source.song;
  if (song) {
    for (const file of [song.audio, song.video, song.videoPhone, song.poster, song.posterPhone]) {
      if (file) files.push(file);
    }
  }
  for (const book of source.books) {
    if (book.audio?.file) files.push(book.audio.file);
    if (book.audio?.slowFile) files.push(book.audio.slowFile);
  }
  return files;
}

/**
 * Builds the signed URL map of one week.
 * @param source The week.
 * @returns The signed URL of each media file.
 */
function signedUrlsOf(source: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const file of mediaFilesOf(source)) urls[file] = `https://media.example/${file}`;
  return urls;
}

/**
 * Lists the ids of the steps that rule D1 marks as media steps, in day order.
 * @param rule The function of rule D1.
 * @param source The week.
 * @returns The step ids.
 */
function mediaIdsOf(rule: StepMediaRule, source: StorytimeWeek): string[] {
  const ids: string[] = [];
  for (const script of source.scripts) {
    for (const step of script.steps) {
      if (rule(step, source) !== null) ids.push(step.id);
    }
  }
  return ids;
}

/**
 * Renders the lesson flow of one day.
 * @param day The lesson day, 1 to 5.
 * @param options The week and the signed URL map.
 * @returns The render result.
 */
async function renderFlow(
  day: number,
  options: { source?: StorytimeWeek; mediaUrls?: Record<string, string> } = {},
) {
  const Flow = await loadFlow();
  const source = options.source ?? week;
  return render(
    <Flow
      week={source}
      day={day}
      locale="en"
      mediaUrls={options.mediaUrls ?? signedUrlsOf(source)}
    />,
  );
}

/** Returns the step region of the flow under test. */
function stepRegion(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-step-id]");
}

/** Returns the step id that the flow shows, or `null` when the flow shows no step. */
function currentStepId(): string | null {
  return stepRegion()?.getAttribute("data-step-id") ?? null;
}

/**
 * Renders one day and moves forward until the flow shows the named step.
 * @param day The lesson day, 1 to 5.
 * @param id The step id to reach.
 * @param options The week and the signed URL map.
 * @returns The render result.
 */
async function renderAtStep(
  day: number,
  id: string,
  options: { source?: StorytimeWeek; mediaUrls?: Record<string, string> } = {},
) {
  const view = await renderFlow(day, options);
  let moves = 0;
  while (currentStepId() !== id) {
    const next = screen.queryByRole("button", { name: NEXT_STEP });
    expect(
      next,
      `the flow must expose data-step-id on the step screen and reach step ${id}: it shows ${currentStepId() ?? "no step id"} after ${moves} forward moves`,
    ).not.toBeNull();
    if (!next) throw new Error(`the flow does not reach the step ${id}`);
    moves += 1;
    expect(moves, `the flow must reach the step ${id} within ${dayScript(week, day).steps.length} screens`).toBeLessThan(20);
    fireEvent.click(next);
  }
  return view;
}

/** Returns the buttons named `Open media`. */
function openerButtons(): HTMLElement[] {
  return screen.queryAllByRole("button", { name: OPEN_MEDIA });
}

/**
 * Returns the one button named `Open media`, with a named guard.
 * @returns The control that opens the player.
 */
function openerButton(): HTMLElement {
  const buttons = openerButtons();
  expect(
    buttons.length,
    `controls=${buttons.length}: the media step must show one control named "${OPEN_MEDIA}"`,
  ).toBe(1);
  return buttons[0]!;
}

/**
 * Returns the one button named `Close`, with a named guard.
 * @returns The control that closes the player.
 */
function closeButton(): HTMLElement {
  const buttons = screen.queryAllByRole("button", { name: CLOSE });
  expect(
    buttons.length,
    `close_controls=${buttons.length}: the open player must show one control named "${CLOSE}"`,
  ).toBe(1);
  return buttons[0]!;
}

/** Returns the player regions that the document holds. */
function playerRegions(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[aria-label="${PLAYER}"]`)];
}

/**
 * Returns the one player region, with a named guard.
 * @returns The player region.
 */
function playerRegion(): HTMLElement {
  const regions = playerRegions();
  expect(
    regions.length,
    `players=${regions.length}: the flow must open one region named "${PLAYER}"`,
  ).toBe(1);
  return regions[0]!;
}

describe("Phase 4 task 4.4: rule D1 on the shipped week", () => {
  it("applies rule D1 to the shipped week: media_steps=4 in B3, B7, D6, and E2", async () => {
    const rule = await loadRule();
    const found: { id: string; day: number; media: StepMedia }[] = [];
    for (const day of DAYS) {
      for (const step of dayScript(week, day).steps) {
        const media = rule(step, week);
        if (media) found.push({ id: step.id, day, media });
      }
    }

    expect(
      found.length,
      `media_steps=${found.length}: rule D1 must find the four media steps of w01`,
    ).toBe(4);
    expect(
      found.length,
      "media_steps must not be 0, or the detail below proves nothing (A4)",
    ).toBeGreaterThan(0);
    expect(
      found.map((entry) => entry.id),
      `media_steps=${found.length}: the media steps of w01, in day order`,
    ).toEqual(["B3", "B7", "D6", "E2"]);

    const days = found.map((entry) => entry.day);
    expect(days, "the media steps must come in day order").toEqual([...days].sort());
    expect(found[0]!.media.kind, "B3 holds the book audio of the read-along book").toBe(
      "readalong",
    );
    expect(found[0]!.media.title, "B3 names the read-along book").toBe("Hello!");
    for (const entry of found.slice(1)) {
      expect(entry.media.kind, `${entry.id} holds the karaoke videos of the song`).toBe("song");
      expect(entry.media.title, `${entry.id} names the song`).toBe(week.song!.title);
    }

    for (const [day, id] of [
      [1, "A1"],
      [2, "B2"],
      [3, "C4"],
      [5, "E4"],
    ] as const) {
      expect(
        rule(stepOf(week, day, id), week),
        `the step ${id} holds no media key, so it must open nothing`,
      ).toBeNull();
    }
  });

  it("reads the materials key and the media title, never a step id", async () => {
    const rule = await loadRule();
    const shipped = mediaIdsOf(rule, week);
    expect(
      shipped.length,
      `media_steps=${shipped.length}: the baseline of the clone cases must be the four shipped steps`,
    ).toBe(4);

    const renamedSong = structuredClone(week);
    expect(renamedSong.song, "the shipped week must hold the song").toBeDefined();
    renamedSong.song!.title = "ZZZ New Song ZZZ";
    const noKaraoke = mediaIdsOf(rule, renamedSong);
    expect(
      noKaraoke,
      `media_steps=${noKaraoke.length}: a new song title must drop every karaoke step`,
    ).toEqual(["B3"]);

    const renamedKey = structuredClone(week);
    const e2 = stepOf(renamedKey, 5, "E2");
    e2.materials = e2.materials.map((entry) =>
      entry.startsWith("karaoke videos") ? entry.replace("karaoke videos", "karaoke clips") : entry,
    );
    const noE2 = mediaIdsOf(rule, renamedKey);
    expect(
      noE2,
      `media_steps=${noE2.length}: the key "karaoke clips" must drop E2 only`,
    ).toEqual(["B3", "B7", "D6"]);

    const twoBooks = structuredClone(week);
    const b3 = stepOf(twoBooks, 2, "B3");
    b3.materials = ['book audio: "Nan Can Nod"', 'book audio: "Hello!"'];
    const firstDecodable = rule(b3, twoBooks);
    expect(
      firstDecodable?.title,
      "the rule must use the first matching entry when a step holds two",
    ).toBe("Nan Can Nod");
    expect(firstDecodable?.kind, "the first match is the decodable book").toBe("decodable");

    b3.materials = ['book audio: "Hello!"', 'book audio: "Nan Can Nod"'];
    const firstReadalong = rule(b3, twoBooks);
    expect(
      firstReadalong?.title,
      "the rule must use the first matching entry when the order turns",
    ).toBe("Hello!");
    expect(firstReadalong?.kind, "the first match is the read-along book").toBe("readalong");
  });
});

describe("Phase 4 task 4.4: the media step of the lesson flow", () => {
  it("opens the player for the matched part and takes the title from the week", async () => {
    const view = await renderAtStep(2, "B3");
    fireEvent.click(openerButton());
    const player = playerRegion();
    const book = week.books.find((entry) => entry.kind === "readalong");
    expect(book, "the shipped week must hold the read-along book").toBeDefined();
    expect(
      player.textContent,
      "the open player must show the title of the book that the step names",
    ).toContain(book!.title);
    view.unmount();

    const copy = structuredClone(week);
    const renamedBook = copy.books.find((entry) => entry.kind === "readalong")!;
    renamedBook.title = "ZZZ Book ZZZ";
    stepOf(copy, 2, "B3").materials = ['book audio, on the tablet or by the QR code: "ZZZ Book ZZZ"'];
    expect(
      () => weekSchema.parse(copy),
      "the clone must pass the week contract before it renders (A4)",
    ).not.toThrow();

    await renderAtStep(2, "B3", { source: copy });
    fireEvent.click(openerButton());
    expect(
      playerRegion().textContent,
      "the player must take the media title from the week data",
    ).toContain("ZZZ Book ZZZ");
  });

  it("renders the decodable branch of the titled book, and the contract holds one decodable per week", async () => {
    // The week contract holds one decodable book per week, so a clone with a second decodable
    // must fail the contract (A4). The decodable branch can therefore never open another book
    // than the one decodable that the step names (finding F414).
    const first = week.books.find((entry) => entry.kind === "decodable");
    expect(first?.audio.file, "the shipped decodable must hold a recorded file").toBeDefined();
    const second = structuredClone(first!);
    second.title = "ZZZ Second Decodable ZZZ";
    second.audio.file = "l2/media/w01/books/zz-second-decodable.mp3";
    const twoDecodables = structuredClone(week);
    twoDecodables.books.push(second);
    expect(() => weekSchema.parse(twoDecodables)).toThrow(/one decodable book/);

    // Render test of the branch: the step names the decodable by title, and the player shows
    // the decodable region with the page text of that book, not the read-along.
    const readAlong = week.books.find((entry) => entry.kind === "readalong");
    expect(
      readAlong?.pages[0]?.text,
      "the shipped read-along must hold a page text for the negative check",
    ).toBeDefined();
    const copy = structuredClone(week);
    stepOf(copy, 1, "A1").materials = [`book audio: "${first!.title}"`];
    expect(
      () => weekSchema.parse(copy),
      "the clone must pass the week contract before it renders (A4)",
    ).not.toThrow();

    const view = await renderAtStep(1, "A1", { source: copy });
    fireEvent.click(openerButton());
    const player = playerRegion();
    expect(
      player.querySelector("[data-phoneme-bank]"),
      "the decodable branch must render the decodable player",
    ).not.toBeNull();
    expect(
      player.textContent,
      "the decodable branch must show the page text of the titled decodable",
    ).toContain(first!.pages[0]!.text);
    expect(
      player.textContent,
      "the decodable player must not show the page text of the read-along",
    ).not.toContain(readAlong!.pages[0]!.text);
    view.unmount();
  });

  it("shows no media control on a step without media", async () => {
    const positive = await renderAtStep(2, "B3");
    expect(
      openerButtons().length,
      `controls=${openerButtons().length}: the media step B3 must show the control (positive control)`,
    ).toBe(1);
    positive.unmount();

    for (const [day, id] of [
      [1, "A1"],
      [2, "B2"],
    ] as const) {
      await renderAtStep(day, id);
      expect(
        openerButtons().length,
        `controls=${openerButtons().length}: the step ${id} holds no media, so it must show no control`,
      ).toBe(0);
      cleanup();
    }
  });

  it("marks the open player as class-screen, and only there", async () => {
    const view = await renderAtStep(2, "B3");
    fireEvent.click(openerButton());
    const markers = document.querySelectorAll('[data-mode="class-screen"]');
    expect(
      playerRegion().querySelector('[data-mode="class-screen"]'),
      'the open player must carry data-mode="class-screen"',
    ).not.toBeNull();
    expect(
      markers.length,
      `class_screen_markers=${markers.length}: the open player must carry one class-screen marker`,
    ).toBe(1);
    view.unmount();

    const songView = await renderAtStep(2, "B7");
    fireEvent.click(openerButton());
    expect(
      playerRegion().querySelector('[data-mode="class-screen"]'),
      "the song player of a media step must carry the class-screen marker",
    ).not.toBeNull();
    songView.unmount();

    const StorytimeSong = await loadSong();
    render(<StorytimeSong song={songOf(week)} mediaUrls={signedUrlsOf(week)} />);
    expect(
      document.querySelector('[data-mode="class-screen"]'),
      "the at-home player must not carry the class-screen marker (named characterization: this case passes at HEAD)",
    ).toBeNull();
  });

  it("keeps the step and the flow control in the DOM while the player is open", async () => {
    for (const mediaCase of MEDIA_CASES) {
      const step = stepOf(week, mediaCase.day, mediaCase.id);
      const view = await renderAtStep(mediaCase.day, mediaCase.id);
      const hadNext = screen.queryByRole("button", { name: NEXT_STEP }) !== null;
      fireEvent.click(openerButton());
      playerRegion();

      expect(
        currentStepId(),
        `step=${mediaCase.id}: the step must stay in the DOM while the player is open`,
      ).toBe(mediaCase.id);
      expect(
        stepRegion()?.textContent,
        `step=${mediaCase.id}: the step title must stay in the DOM while the player is open`,
      ).toContain(step.title.en);
      expect(
        screen.queryByRole("button", { name: NEXT_STEP }) !== null,
        `step=${mediaCase.id}: the Next step control must keep its state while the player is open`,
      ).toBe(hadNext);
      view.unmount();
    }
  });

  it("keeps the place of the step after the player closes", async () => {
    for (const mediaCase of MEDIA_CASES) {
      const view = await renderAtStep(mediaCase.day, mediaCase.id);
      const before = currentStepId();
      const index = Number(stepRegion()?.getAttribute("data-step-index"));
      expect(
        Number.isInteger(index),
        `step=${mediaCase.id} index=${index}: the flow must expose a numeric data-step-index`,
      ).toBe(true);
      expect(
        index,
        `step=${mediaCase.id} index=${index}: a media step must not be the first step of its day`,
      ).toBeGreaterThan(0);

      fireEvent.click(openerButton());
      playerRegion();
      fireEvent.click(closeButton());

      expect(
        playerRegions().length,
        `players=${playerRegions().length}: the close control must close the player`,
      ).toBe(0);
      expect(
        currentStepId(),
        `step=${mediaCase.id} index=${index}: the flow must keep the place after the player closes`,
      ).toBe(before);
      expect(
        Number(stepRegion()?.getAttribute("data-step-index")),
        `step=${mediaCase.id} index=${index}: the close must not move the index`,
      ).toBe(index);
      view.unmount();
    }
  });

  it("keeps the Thai toggle on after the player closes", async () => {
    const step = stepOf(week, 2, "B3");
    await renderAtStep(2, "B3");
    const toggle = screen.getByRole("button", { name: THAI_TOGGLE });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed"), "the Thai toggle must turn on").toBe("true");
    expect(
      stepRegion()?.textContent,
      "the step must show its Thai title while the toggle is on",
    ).toContain(step.title.th);

    fireEvent.click(openerButton());
    fireEvent.click(closeButton());
    expect(
      toggle.getAttribute("aria-pressed"),
      "the Thai toggle must stay on after the player closes",
    ).toBe("true");
    expect(
      stepRegion()?.textContent,
      "the step must keep its Thai title after the player closes",
    ).toContain(step.title.th);
  });

  it("closes with the control and with Escape, and returns focus to the opener", async () => {
    await renderAtStep(2, "B3");
    let opener = openerButton();
    fireEvent.click(opener);
    fireEvent.click(closeButton());
    expect(
      document.activeElement,
      "the Close control must return focus to the control that opened the player",
    ).toBe(opener);

    opener = openerButton();
    fireEvent.click(opener);
    playerRegion();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      playerRegions().length,
      `players=${playerRegions().length}: the Escape key must close the player`,
    ).toBe(0);
    expect(
      document.activeElement,
      "the Escape key must return focus to the control that opened the player",
    ).toBe(opener);
  });

  it("never plays media when the player opens", async () => {
    await renderAtStep(2, "B7");
    expect(
      playCalls(),
      `play_calls=${playCalls()}: no media may play before the player opens`,
    ).toBe(0);

    fireEvent.click(openerButton());
    playerRegion();
    expect(
      playCalls(),
      `play_calls=${playCalls()}: the open player must not play (AC-8.1)`,
    ).toBe(0);

    const playButtons = screen.queryAllByRole("button", { name: PLAY });
    expect(
      playButtons.length,
      `play_controls=${playButtons.length}: the player must hold its own play control`,
    ).toBe(1);
    fireEvent.click(playButtons[0]!);
    expect(
      playCalls(),
      `play_calls=${playCalls()}: the play control must play`,
    ).toBe(1);
  });

  it("takes every media URL from the signed map", async () => {
    const song = songOf(week);
    expect(song.video, "the shipped song must hold the regular video").toBeDefined();
    expect(song.videoPhone, "the shipped song must hold the phone video").toBeDefined();
    const urls = signedUrlsOf(week);

    setPhone(true);
    const view = await renderAtStep(2, "B7", { mediaUrls: urls });
    fireEvent.click(openerButton());
    const player = playerRegion();
    const media = player.querySelector<HTMLElement>("video, audio");
    expect(media, "the open song player must hold a media element").not.toBeNull();
    const src = media?.getAttribute("src") ?? "";
    expect(
      src,
      `src=${src}: the class-screen player must use the signed URL of the regular video, not the phone video`,
    ).toBe(urls[song.video!]);
    expect(
      src,
      `src=${src}: the class-screen player must never use the phone video`,
    ).not.toBe(urls[song.videoPhone!]);

    const raw = [...player.querySelectorAll<HTMLElement>("[src]")]
      .map((element) => element.getAttribute("src") ?? "")
      .filter((value) => value.startsWith("l2/"));
    expect(raw, "no src of the player may be a raw week path").toEqual([]);
    view.unmount();

    const partial: Record<string, string> = { ...urls };
    for (const file of [song.audio, song.video, song.videoPhone, song.poster, song.posterPhone]) {
      if (file) delete partial[file];
    }
    await renderAtStep(2, "B7", { mediaUrls: partial });
    fireEvent.click(openerButton());
    expect(
      playerRegions().length,
      `players=${playerRegions().length}: a part with no signed URL must open no player`,
    ).toBe(0);
    const text = stepRegion()?.textContent ?? "";
    expect(text, "the missing media message must show in English").toContain(MEDIA_MISSING_EN);
    expect(text, "the missing media message must show in Thai").toContain(MEDIA_MISSING_TH);
  });

  it("signs the media in the day page and passes the map to the flow", async () => {
    const pagePath = resolve(
      import.meta.dirname,
      "..",
      "app/[locale]/teacher/[level]/[week]/[day]/page.tsx",
    );
    const source = readFileSync(pagePath, "utf8");
    const filesScanned = 1;
    expect(
      source.length,
      `files_scanned=${filesScanned}: the day page must exist at app/[locale]/teacher/[level]/[week]/[day]/page.tsx`,
    ).toBeGreaterThan(0);
    expect(
      source,
      "the day page must import signWeekMedia from lib/media/sign",
    ).toMatch(/import\s*\{[^}]*\bsignWeekMedia\b[^}]*\}\s*from\s*"[^"]*lib\/media\/sign"/);
    expect(
      source,
      "the day page must sign the week with signWeekMedia(loaded.week, {})",
    ).toMatch(/signWeekMedia\(\s*loaded\.week\s*,\s*\{\}\s*\)/);
    expect(
      source,
      "the day page must pass mediaUrls to the lesson flow",
    ).toMatch(/mediaUrls=\{mediaUrls\}/);
    expect(
      source,
      "the day page must not build a media URL from the request",
    ).not.toMatch(/nextUrl|request\.url/);
  });
});
