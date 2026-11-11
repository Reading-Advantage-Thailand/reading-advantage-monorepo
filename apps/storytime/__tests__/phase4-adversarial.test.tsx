// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekJson from "../content/l2/w01.json";
import w08Json from "../content/l2/w08.json";
import { TeacherLessonFlow } from "../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow";
import { LanguageRuns, splitThaiRuns } from "../lib/teacher-lang";
import { TeacherWeekView } from "../app/[locale]/teacher/[level]/[week]/week-view";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";
import { stepMediaOf } from "../lib/teacher-media";

/**
 * The adversarial round of Phase 4 (test strategy P4.4, P4.6, P4.6a "Review applicability").
 *
 * The cases attack the teacher lesson flow with hostile weeks and hostile taps. Each case uses a
 * clone of the shipped weeks `w01` and `w08`. A clone passes `weekSchema` before it renders (A4).
 * Every count is a labeled integer (A3). Each "shows nothing" case follows a positive control.
 *
 * The cases that name a review finding (F431, F433, F434, F435, F441, F442, F443) and the cases
 * of the new findings F451 to F454 stay red until Green fixes the code. A red case here is a
 * defect report, not a skipped test.
 */

/** The accessible name of the forward control of the lesson flow. */
const NEXT_STEP = "Next step";

/** The accessible name of the Thai toggle of the lesson flow. */
const THAI_TOGGLE = "ไทย";

/** The accessible name of the control that opens the player. */
const OPEN_MEDIA = "Open media";

/** The accessible name of the control that closes the player. */
const CLOSE = "Close";

/** The accessible name of the player region. */
const PLAYER = "The media player";

/** The five days of the week contract. */
const DAYS = [1, 2, 3, 4, 5] as const;

/** The shipped milestone week, parsed with the app contract. */
const week: StorytimeWeek = weekSchema.parse(weekJson) as StorytimeWeek;

/** The shipped review week, parsed with the app contract. */
const reviewWeek: StorytimeWeek = weekSchema.parse(w08Json) as StorytimeWeek;

/** One lesson day. */
type LessonScript = StorytimeWeek["scripts"][number];

/** One step of a lesson day. */
type LessonStep = LessonScript["steps"][number];

/** The audio elements that currently play, kept by the media spies. */
const playing = new Set<HTMLMediaElement>();

/** The messages that `console.error` received in the current test. */
let consoleErrors: string[] = [];

beforeEach(() => {
  playing.clear();
  consoleErrors = [];
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    playing.add(this);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    playing.delete(this);
  });
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map((value) => String(value)).join(" "));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Counts the calls of one media method in the current test.
 * @param method The method name.
 * @returns The call count.
 */
function calls(method: "play" | "pause"): number {
  return vi.mocked(HTMLMediaElement.prototype[method]).mock.calls.length;
}

/**
 * Fails with a named assertion when a week breaks the app contract (A4).
 * @param candidate The value that must parse as a week.
 * @param label The name of the case.
 */
function expectWeek(candidate: unknown, label: string): asserts candidate is StorytimeWeek {
  const parsed = weekSchema.safeParse(candidate);
  const detail = parsed.success
    ? ""
    : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  expect(parsed.success, `${label}: the week must pass weekSchema before it renders. ${detail}`).toBe(
    true,
  );
}

/**
 * Returns the script of one day, with a named guard.
 * @param source The week.
 * @param day The lesson day.
 * @returns The script.
 */
function scriptOf(source: StorytimeWeek, day: number): LessonScript {
  const script = source.scripts.find((entry) => entry.day === day);
  expect(script, `the week must hold the lesson of day ${day}`).toBeDefined();
  if (!script) throw new Error(`no lesson for day ${day}`);
  return script;
}

/**
 * Returns one step of one day, with a named guard.
 * @param source The week.
 * @param day The lesson day.
 * @param id The step id.
 * @returns The step.
 */
function stepOf(source: StorytimeWeek, day: number, id: string): LessonStep {
  const step = scriptOf(source, day).steps.find((entry) => entry.id === id);
  expect(step, `day=${day} must hold the step ${id}`).toBeDefined();
  if (!step) throw new Error(`day=${day} holds no step ${id}`);
  return step;
}

/**
 * Deep-clones a week and approves the loops part, then checks the contract.
 * @param source The week to clone.
 * @returns The approved clone.
 */
function approvedClone(source: StorytimeWeek = week): StorytimeWeek {
  const copy = structuredClone(source);
  copy.approval = {
    ...(copy.approval ?? {}),
    loops: { status: "approved", date: "2026-11-11", words: "adversarial clone" },
  };
  expectWeek(copy, "the approved clone");
  return copy;
}

/**
 * Builds the signed URL map of every media path in a week.
 * @param source The week.
 * @returns A signed URL for each string that names a media file.
 */
function signedMap(source: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  let next = 0;
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      if (/\.(mp3|mp4|m4a|png|jpe?g|webp|gif|vtt)$/i.test(value) && urls[value] === undefined) {
        next += 1;
        urls[value] = `https://signed.example/m/${next}`;
      }
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(source);
  return urls;
}

/**
 * Renders the lesson flow of one day.
 * @param source The week.
 * @param day The lesson day.
 * @param mediaUrls The signed URL map; the default signs every media path of the week.
 * @returns The render result.
 */
function renderDay(source: StorytimeWeek, day: number, mediaUrls?: Record<string, string>) {
  return render(
    <TeacherLessonFlow
      week={source}
      day={day}
      locale="en"
      mediaUrls={mediaUrls ?? signedMap(source)}
    />,
  );
}

/** Returns the step id on screen, or `null` when no step shows. */
function currentStepId(): string | null {
  return document.querySelector<HTMLElement>("[data-step-id]")?.getAttribute("data-step-id") ?? null;
}

/**
 * Clicks "Next step" until the flow shows the named step.
 * @param id The step id to reach.
 */
function goToStep(id: string): void {
  let moves = 0;
  while (currentStepId() !== id) {
    const next = screen.queryByRole("button", { name: NEXT_STEP });
    expect(next, `the flow must reach ${id}; it shows ${currentStepId()} after ${moves} moves`).not.toBeNull();
    if (!next) throw new Error(`the flow does not reach ${id}`);
    moves += 1;
    expect(moves, `the flow must reach ${id} in a few moves`).toBeLessThan(30);
    fireEvent.click(next);
  }
}

/** The facts of one rendered screen. */
interface ScreenFacts {
  /** The step id on screen. */
  stepId: string | null;
  /** The loop panels on screen. */
  panels: number;
  /** The recall regions on screen. */
  recall: number;
  /** The share moments on screen. */
  shares: number;
  /** The text of the step time, such as `5 min`. */
  time: string;
  /** The text of the whole flow. */
  text: string;
}

/**
 * Reads the facts of the screen that the flow shows now.
 * @returns The facts.
 */
function screenFacts(): ScreenFacts {
  const time = [...document.querySelectorAll("[data-step-id] header span")]
    .map((node) => node.textContent ?? "")
    .find((text) => /\bmin$/.test(text));
  return {
    stepId: currentStepId(),
    panels: document.querySelectorAll("[data-loop]").length,
    recall: document.querySelectorAll("[data-recall-day]").length,
    shares: document.querySelectorAll("[data-share-moment]").length,
    time: (time ?? "").trim(),
    text: document.body.textContent ?? "",
  };
}

/**
 * Walks every screen of one day with "Next step" and records the facts of each screen.
 * @param source The week.
 * @param day The lesson day.
 * @returns The facts of each screen, in order.
 */
function walkDay(source: StorytimeWeek, day: number): ScreenFacts[] {
  const view = renderDay(source, day);
  const out: ScreenFacts[] = [screenFacts()];
  let guard = 0;
  for (;;) {
    const next = screen.queryByRole("button", { name: NEXT_STEP });
    if (!next) break;
    guard += 1;
    expect(guard, "a day must end within 30 screens").toBeLessThan(30);
    fireEvent.click(next);
    out.push(screenFacts());
  }
  view.unmount();
  return out;
}

/**
 * Walks all five days.
 * @param source The week.
 * @returns The facts of each screen, with the day.
 */
function walkWeek(source: StorytimeWeek): Array<ScreenFacts & { day: number }> {
  return DAYS.flatMap((day) => walkDay(source, day).map((facts) => ({ ...facts, day })));
}

/**
 * Builds the clone that the media cases share: a draft week with two decodable books.
 * @returns The week, the title of the first decodable, and the title of the second.
 */
function twoDecodableDraft(): { source: StorytimeWeek; first: string; second: string } {
  const source = structuredClone(week);
  source.meta.status = "draft";
  const first = source.books.find((book) => book.kind === "decodable");
  expect(first, "the shipped week must hold a decodable book").toBeDefined();
  const copy = structuredClone(first!);
  copy.title = "Zed Second Reader";
  copy.pages = copy.pages.map((page, index) => ({ ...page, text: `Zip zap ${index + 1}.` }));
  copy.audio.file = "l2/media/w01/books/zed-second-reader.mp3";
  copy.audio.slowFile = "l2/media/w01/books/zed-second-reader-slow.mp3";
  copy.audio.sentences = [];
  copy.audio.slowSentences = [];
  source.books.push(copy);
  stepOf(source, 1, "A1").materials = [`book audio: "${copy.title}"`];
  stepOf(source, 1, "A2").materials = [`book audio: "${first!.title}"`];
  expectWeek(source, "the draft clone with two decodable books");
  return { source, first: first!.title, second: copy.title };
}

describe("Phase 4 adversarial: the loops of task 4.6", () => {
  it("shows no loop in a draft week or in a week with no loops part, and shows loops in the approved clone", () => {
    const soundSteps = scriptOf(week, 1).steps.filter((step) => step.soundLoop).length;
    expect(soundSteps, `soundloop_steps=${soundSteps}: the shipped week must hold the loop fields`).toBe(3);

    const approved = walkWeek(approvedClone());
    const approvedPanels = approved.reduce((sum, facts) => sum + facts.panels, 0);
    const approvedRecall = approved.filter((facts) => facts.recall > 0).length;
    expect(approvedPanels, `loop_panels=${approvedPanels}: the positive control must find panels`).toBeGreaterThan(0);
    expect(approvedRecall, `recall_screens=${approvedRecall}: the positive control must find the recall`).toBe(4);

    const noPart = structuredClone(week);
    delete noPart.approval?.loops;
    expectWeek(noPart, "the clone with no loops part");
    for (const [label, source] of [
      ["draft", week],
      ["absent", noPart],
    ] as const) {
      const facts = walkWeek(source);
      expect(facts.length, `screens=${facts.length}: the ${label} walk must read screens`).toBeGreaterThan(20);
      const panels = facts.reduce((sum, entry) => sum + entry.panels + entry.recall, 0);
      expect(panels, `loop_panels=${panels}: the ${label} week must show no loop and no recall`).toBe(0);
      const stepA1 = facts.find((entry) => entry.stepId === "A1" && entry.day === 1);
      expect(stepA1?.time, `the ${label} week must show the printed minutes of A1`).toBe(
        `${stepOf(week, 1, "A1").minutes} min`,
      );
    }
  });

  it("shows no loop and no recall in an approved level 1 week, with the printed minutes", () => {
    const level2 = walkWeek(approvedClone());
    expect(
      level2.reduce((sum, facts) => sum + facts.panels, 0),
      "the level 2 positive control must find panels",
    ).toBeGreaterThan(0);

    const level1 = approvedClone();
    level1.meta.level = 1;
    level1.meta.key = "st1/1";
    expectWeek(level1, "the approved level 1 clone");
    const facts = walkWeek(level1);
    expect(facts.length, `screens=${facts.length}`).toBeGreaterThan(20);
    expect(
      facts.reduce((sum, entry) => sum + entry.panels + entry.recall, 0),
      "an approved level 1 week must show no loop panel and no recall",
    ).toBe(0);
    const a1 = facts.find((entry) => entry.stepId === "A1" && entry.day === 1);
    expect(a1?.time, "level 1 must show `minutes`, not `loopMinutes`").toBe(
      `${stepOf(week, 1, "A1").minutes} min`,
    );
  });

  it("shows only the recall and the loop minutes in an approved w08 copy that holds extra loop fields", () => {
    const copy = approvedClone(reviewWeek);
    const donor = stepOf(week, 1, "A4");
    const target = scriptOf(copy, 1).steps[0]!;
    expect(target.soundLoop, "the shipped w08 must hold no soundLoop").toBeUndefined();
    target.soundLoop = structuredClone(stepOf(week, 1, "A1").soundLoop!);
    target.blendDrill = structuredClone(donor.blendDrill!);
    target.sightWords = structuredClone(stepOf(week, 1, "A6").sightWords!);
    target.loopMinutes = target.minutes + 1;
    expectWeek(copy, "the approved w08 copy with extra loop fields");

    const facts = walkWeek(copy);
    const recallScreens = facts.filter((entry) => entry.recall > 0).length;
    expect(recallScreens, `recall_screens=${recallScreens}: the review week must show its recall`).toBeGreaterThan(0);
    const panels = facts.reduce((sum, entry) => sum + entry.panels, 0);
    expect(panels, `loop_panels=${panels}: a review week must show no loop panel`).toBe(0);
    const first = facts.find((entry) => entry.day === 1 && entry.stepId === target.id);
    expect(first?.time, "w08_loopminutes_added=1: the added loop minutes must show").toBe(
      `${target.minutes + 1} min`,
    );
  });

  it("shows loopMinutes 0 as 0 min on an approved week and keeps minutes on a draft week", () => {
    const a5 = stepOf(week, 1, "A5");
    expect(a5.loopMinutes, "A5 of the shipped week must hold no loopMinutes").toBeUndefined();
    expect(a5.minutes, "A5 must hold minutes above 0").toBeGreaterThan(0);
    const draft = structuredClone(week);
    stepOf(draft, 1, "A5").loopMinutes = 0;
    expectWeek(draft, "the draft clone with loopMinutes 0");
    const approved = approvedClone(draft);

    const approvedFacts = walkDay(approved, 1).find((entry) => entry.stepId === "A5");
    expect(approvedFacts?.time, "an approved week must show loopMinutes 0 as `0 min`").toBe("0 min");
    const draftFacts = walkDay(draft, 1).find((entry) => entry.stepId === "A5");
    expect(draftFacts?.time, "a draft week must show the printed minutes").toBe(`${a5.minutes} min`);
  });

  it("places a loop panel by its field on the last step of day 5 and on a media step", () => {
    const copy = approvedClone();
    stepOf(copy, 5, "E5").soundLoop = structuredClone(stepOf(week, 1, "A1").soundLoop!);
    stepOf(copy, 2, "B3").sightWords = structuredClone(stepOf(week, 1, "A6").sightWords!);
    expectWeek(copy, "the clone with loop fields on unusual steps");

    const view = renderDay(copy, 5);
    goToStep("E5");
    const e5 = document.querySelector("[data-step-id='E5']")!;
    expect(e5.querySelectorAll("[data-loop='sound-loop']").length, "sound_loop_panels_e5").toBe(1);
    expect(screen.queryByLabelText("The Friday check"), "the Friday check stays on the last step").not.toBeNull();
    view.unmount();

    renderDay(copy, 2);
    goToStep("B3");
    const b3 = document.querySelector("[data-step-id='B3']")!;
    expect(b3.querySelectorAll("[data-loop='sight-words']").length, "sight_panels_b3").toBe(1);
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    expect(screen.queryByLabelText(PLAYER), "the player must open next to the loop panel").not.toBeNull();
    expect(b3.querySelectorAll("[data-loop='sight-words']").length, "the panel must stay while the player is open").toBe(1);
  });

  it("rejects an approved week whose recall holds four cards, so the flow never reads one", () => {
    const copy = approvedClone();
    scriptOf(copy, 2).recall!.items.pop();
    const parsed = weekSchema.safeParse(copy);
    expect(parsed.success, "an approved week with four recall cards must fail the contract").toBe(false);
    const draft = structuredClone(week);
    scriptOf(draft, 2).recall!.items.pop();
    expect(weekSchema.safeParse(draft).success, "the same change on a draft week must pass (control)").toBe(true);
  });
});

describe("Phase 4 adversarial: the share moment of task 4.6a", () => {
  it("shows no moment while the loops are draft or absent, and shows five in the approved clone", () => {
    const approved = walkWeek(approvedClone());
    const total = approved.reduce((sum, facts) => sum + facts.shares, 0);
    expect(total, `share_shown_total=${total}: the positive control must show A3, B5, C4, D4, and D5`).toBe(5);
    const day5 = approved.filter((facts) => facts.day === 5).reduce((sum, facts) => sum + facts.shares, 0);
    expect(day5, `share_shown_day5=${day5}: day 5 names D6, which is not a step of day 5`).toBe(0);

    const noPart = structuredClone(week);
    delete noPart.approval?.loops;
    for (const [label, source] of [["draft", week], ["absent", noPart]] as const) {
      const facts = walkWeek(source);
      const shown = facts.reduce((sum, entry) => sum + entry.shares, 0);
      expect(facts.length, `screens=${facts.length}`).toBeGreaterThan(20);
      expect(shown, `share_shown_${label}=${shown}`).toBe(0);
      expect(
        facts.some((entry) => /take a photo or a short video/i.test(entry.text)),
        `the ${label} week must show no consent line`,
      ).toBe(false);
    }
  });

  it("shows nothing for a shot that names an unknown step, and keeps the other days", () => {
    for (const step of ["ZZ9", "a3", "A3 ", " A3", "A-3", "A3​"]) {
      const copy = approvedClone();
      scriptOf(copy, 1).share!.shots = [{ step, media: "photo" }];
      expectWeek(copy, `the clone with the shot step ${JSON.stringify(step)}`);
      const facts = walkWeek(copy);
      const day1 = facts.filter((entry) => entry.day === 1).reduce((sum, entry) => sum + entry.shares, 0);
      const rest = facts.filter((entry) => entry.day !== 1).reduce((sum, entry) => sum + entry.shares, 0);
      expect(day1, `share_shown_day1=${day1} for the step ${JSON.stringify(step)}`).toBe(0);
      expect(rest, `share_shown_other_days=${rest}: days 2 to 4 keep B5, C4, D4, and D5`).toBe(4);
    }
  });

  it("rejects a shot with a file key, and the flow shows no link, no picture, and no file text for it", () => {
    const marker = "hostile-upload-marker";
    const strict = approvedClone();
    (scriptOf(strict, 1).share!.shots[0] as Record<string, unknown>).file = `${marker}.mp4`;
    const parsed = weekSchema.safeParse(strict);
    expect(parsed.success, "a shot with a file key must fail the strict schema").toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path.join("."));
      expect(paths.some((path) => path.startsWith("scripts.0.share.shots.0")), `paths=${paths.join(",")}`).toBe(true);
    }

    // Defense in depth: the raw object goes into the flow with no schema, as a bad caller would.
    const view = renderDay(strict, 1);
    goToStep("A3");
    expect(document.querySelector("[data-share-moment='A3']"), "the raw shot still names A3").not.toBeNull();
    const everything = document.body.innerHTML;
    expect(everything.includes(marker), "no attribute or text may carry the file key").toBe(false);
    expect(document.querySelectorAll("a[href^='http'], img, video, source, form, input[type='file']").length).toBe(0);
    view.unmount();

    // A passthrough key of the caption passes the contract; the flow must still not render it.
    const caption = approvedClone();
    (scriptOf(caption, 1).share!.caption as Record<string, unknown>).url = `https://evil.example/${marker}`;
    expectWeek(caption, "the clone with a passthrough caption key");
    renderDay(caption, 1);
    goToStep("A3");
    expect(document.body.innerHTML.includes(marker), "a passthrough caption key must not reach the DOM").toBe(false);
  });

  it("keeps a day 5 style mismatch on its own day, with no bleed into another day", () => {
    const copy = approvedClone();
    scriptOf(copy, 4).share!.shots = [
      { step: "D4", media: "photo" },
      { step: "D6", media: "video" },
    ];
    expectWeek(copy, "the clone that names D6 on day 4 and on day 5");
    const facts = walkWeek(copy);
    const shownAt = (day: number, id: string) =>
      facts.filter((entry) => entry.day === day && entry.stepId === id).reduce((sum, entry) => sum + entry.shares, 0);
    expect(shownAt(4, "D4"), "share_shown_d4=1").toBe(1);
    expect(shownAt(4, "D5"), "share_shown_d5=0: the shot moved to D6").toBe(0);
    expect(shownAt(4, "D6"), "share_shown_d6=1: day 4 owns D6").toBe(1);
    const day5 = facts.filter((entry) => entry.day === 5).reduce((sum, entry) => sum + entry.shares, 0);
    expect(day5, `share_shown_day5=${day5}`).toBe(0);

    const renamed = approvedClone();
    scriptOf(renamed, 5).steps[0]!.id = "A3";
    expectWeek(renamed, "the clone whose day 5 step takes the id of a day 1 share step");
    const day5Facts = walkDay(renamed, 5);
    expect(day5Facts[0]!.stepId, "day 5 must open on the renamed step").toBe("A3");
    expect(day5Facts.reduce((sum, entry) => sum + entry.shares, 0), "share_shown_renamed=0").toBe(0);
  });

  it("shows the English caption for a blank Thai caption, and no network call while the flow is walked", () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (...args: unknown[]) => {
      calls.push(`fetch ${String(args[0])}`);
      return Promise.reject(new Error("no network in the adversarial test"));
    });
    const send = vi.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(() => {
      calls.push("xhr");
    });
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: () => {
        calls.push("beacon");
        return true;
      },
    });
    try {
      const copy = approvedClone();
      scriptOf(copy, 1).share!.caption.th = "   ";
      expectWeek(copy, "the clone with a blank Thai caption");
      renderDay(copy, 1);
      fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
      goToStep("A3");
      const moment = document.querySelector("[data-share-moment='A3']")!;
      expect(moment.textContent, "a blank Thai caption must fall back to English").toContain(
        scriptOf(copy, 1).share!.caption.en,
      );
      for (const button of screen.queryAllByRole("button")) fireEvent.click(button);
      expect(calls.length, `network_calls=${calls.length}: the flow sends nothing`).toBe(0);
      void fetch("https://control.example/").catch(() => undefined);
      expect(calls.length, `network_calls=${calls.length}: the positive control must reach the spy`).toBe(1);
    } finally {
      send.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("F434: shows two shots of one step and one media without a repeated React key", () => {
    const copy = approvedClone();
    scriptOf(copy, 1).share!.shots = [
      { step: "A3", media: "video" },
      { step: "A3", media: "video" },
    ];
    expectWeek(copy, "the clone with two shots of the same step and media");
    renderDay(copy, 1);
    goToStep("A3");
    const moments = document.querySelectorAll("[data-share-moment='A3']").length;
    expect(moments, `share_shown_a3=${moments}: both shots show`).toBe(2);
    const keyWarnings = consoleErrors.filter((line) => /same key/i.test(line));
    expect(
      keyWarnings.length,
      `key_warnings=${keyWarnings.length}: the share moment key must hold the shot index (F434). ${keyWarnings[0] ?? ""}`,
    ).toBe(0);
  });

  it("F434: shows the consent line once for a step that holds two shots", () => {
    const copy = approvedClone();
    scriptOf(copy, 1).share!.shots = [
      { step: "A3", media: "video" },
      { step: "A3", media: "photo" },
    ];
    expectWeek(copy, "the clone with two shots of one step");
    renderDay(copy, 1);
    goToStep("A3");
    const consent = (document.body.textContent ?? "").split("The app sends nothing.").length - 1;
    expect(consent, `consent_lines_a3=${consent}: the consent line shows once for a step (F434)`).toBe(1);
  });
});

describe("Phase 4 adversarial: the media of task 4.4 and the nits F431", () => {
  it("F431: opens the second decodable of a draft week when the step names its title", () => {
    const { source, first, second } = twoDecodableDraft();
    const decodables = source.books.filter((book) => book.kind === "decodable");
    expect(decodables.length, `decodables=${decodables.length}: a draft week may hold two`).toBe(2);
    expect(decodables[0]!.title, "the shipped decodable stays first").toBe(first);

    const rule = stepMediaOf(stepOf(source, 1, "A1"), source);
    expect(rule?.kind, "the rule must find a decodable for the second title").toBe("decodable");
    expect(rule?.title).toBe(second);

    renderDay(source, 1);
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    const region = screen.getByLabelText(PLAYER);
    expect(region.querySelector("[data-phoneme-bank]"), "the decodable player must render").not.toBeNull();
    expect(region.textContent, "the player must show the page text of the titled second book").toContain("Zip zap 1.");
    expect(region.textContent, "the player must not show the first decodable").not.toContain(
      decodables[0]!.pages[0]!.text,
    );
    cleanup();

    renderDay(source, 1);
    goToStep("A2");
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    const firstRegion = screen.getByLabelText(PLAYER);
    expect(firstRegion.textContent, "the positive control: A2 names the first decodable").toContain(
      decodables[0]!.pages[0]!.text,
    );
    expect(firstRegion.textContent).not.toContain("Zip zap 1.");
  });

  it("uses the first book of a shared title, and the positive control opens the read-along", () => {
    const copy = structuredClone(week);
    const decodable = copy.books.find((book) => book.kind === "decodable")!;
    const readalong = copy.books.find((book) => book.kind === "readalong")!;
    decodable.title = readalong.title;
    expectWeek(copy, "the clone with two books of one title");
    const step = stepOf(copy, 2, "B3");
    const media = stepMediaOf(step, copy);
    expect(media?.kind, "the first book of the title is the read-along").toBe("readalong");
    renderDay(copy, 2);
    goToStep("B3");
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    const region = screen.getByLabelText(PLAYER);
    expect(region.querySelector("[data-phoneme-bank]"), "the decodable must stay unreachable by the shared title").toBeNull();
    expect(region.textContent).toContain(readalong.pages[0]!.text);
  });

  it("shows the missing-media message and no player for a media step with an empty signed URL", () => {
    const source = structuredClone(week);
    const urls = signedMap(source);
    const book = source.books.find((entry) => entry.kind === "readalong")!;
    urls[book.audio.file!] = "";
    renderDay(source, 2, urls);
    goToStep("B3");
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    expect(screen.queryByLabelText(PLAYER), "an empty signed URL must open no player").toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("This media is not available.");
    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    expect(screen.queryByRole("alert"), "the message must leave with the step").toBeNull();
  });
});

describe("Phase 4 adversarial: the open nits of the reviews", () => {
  it("F433a: marks an English fallback text with lang en when the Thai text is empty", () => {
    const copy = approvedClone();
    const a1 = stepOf(copy, 1, "A1");
    expect(a1.th, "the shipped step must hold a Thai note").toBeDefined();
    a1.th!.teacherActions = [];
    a1.easier.th = "";
    expectWeek(copy, "the clone with empty Thai texts");
    renderDay(copy, 1);
    fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
    expect(screen.getByRole("button", { name: THAI_TOGGLE })).toHaveAttribute("aria-pressed", "true");

    const english = new Set<string>([...a1.en.teacherActions, a1.easier.en]);
    expect(english.size, `fallback_lines=${english.size}: the clone must hold fallback lines`).toBeGreaterThan(1);
    const offenders: string[] = [];
    let seen = 0;
    for (const node of document.querySelectorAll<HTMLElement>("[data-step-id='A1'] [lang]")) {
      const text = (node.textContent ?? "").trim();
      if (!english.has(text)) continue;
      seen += 1;
      if (node.getAttribute("lang") !== "en") offenders.push(`${node.getAttribute("lang")}: ${text.slice(0, 40)}`);
    }
    expect(seen, `fallback_nodes=${seen}: the fallback text must show on screen`).toBe(english.size);
    expect(
      offenders.length,
      `mislabeled_th=${offenders.length}: an English fallback line carries lang th (F433a). ${offenders.join(" | ")}`,
    ).toBe(0);
  });

  it("F433b and F441: puts the visible text of a clip control inside its accessible name", () => {
    const copy = approvedClone();
    renderDay(copy, 1);
    goToStep("A4");
    const controls = [...document.querySelectorAll<HTMLElement>("[data-clip-path]")];
    expect(controls.length, `clip_controls=${controls.length}: the drill must show clip controls`).toBeGreaterThan(0);
    const offenders = controls.filter((control) => {
      const visible = (control.textContent ?? "").trim().toLowerCase();
      const name = (control.getAttribute("aria-label") ?? visible).toLowerCase();
      return !name.includes(visible);
    });
    expect(
      offenders.length,
      `label_in_name_failures=${offenders.length} of ${controls.length}: the name "${offenders[0]?.getAttribute("aria-label")}" lacks the visible "${offenders[0]?.textContent}" (F433b, F441)`,
    ).toBe(0);
  });

  it("F442: marks the language of the text of a recall card", () => {
    const copy = approvedClone();
    document.documentElement.lang = "th";
    try {
      const view = renderDay(copy, 2);
      fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
      const cards = [...document.querySelectorAll<HTMLElement>("[data-recall-card]")];
      expect(cards.length, `recall_cards=${cards.length}: the recall must show five cards`).toBe(5);
      const unmarked = cards.filter((card) => {
        let node: HTMLElement | null = card;
        const root = view.container;
        while (node && root.contains(node)) {
          const lang = node.getAttribute("lang");
          if (lang) return lang !== "en";
          node = node.parentElement;
        }
        return true;
      });
      expect(
        unmarked.length,
        `unmarked_recall_cards=${unmarked.length}: the card text must carry lang en under a Thai page (F442)`,
      ).toBe(0);
    } finally {
      document.documentElement.lang = "";
    }
  });

  it("F435 and F443: stops a playing clip when the flow unmounts", () => {
    const copy = approvedClone();
    const view = renderDay(copy, 1);
    goToStep("A4");
    const control = document.querySelector<HTMLElement>("[data-clip-path]");
    expect(control, "the drill must show a clip control").not.toBeNull();
    fireEvent.click(control!);
    expect(playing.size, `playing=${playing.size}: the positive control must start one clip`).toBe(1);
    view.unmount();
    expect(
      playing.size,
      `playing_after_unmount=${playing.size}: the flow must pause its clip on unmount (F435, F443)`,
    ).toBe(0);
  });
});

describe("Phase 4 adversarial: rapid taps and step changes", () => {
  it("keeps one clip playing after five rapid taps on one control, and none after Next step", () => {
    const copy = approvedClone();
    renderDay(copy, 1);
    goToStep("A4");
    const control = document.querySelector<HTMLElement>("[data-clip-path]")!;
    act(() => {
      for (let tap = 0; tap < 5; tap += 1) control.click();
    });
    expect(calls("play"), `play_calls=${calls("play")}: each tap plays`).toBe(5);
    expect(calls("pause"), `pause_calls=${calls("pause")}: each new tap pauses the last clip`).toBe(4);
    expect(playing.size, `playing=${playing.size}: one clip at a time`).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    expect(playing.size, `playing=${playing.size}: Next step stops the clip`).toBe(0);
  });

  it("keeps the last tapped clip as the only one that plays when two controls alternate", () => {
    const copy = approvedClone();
    renderDay(copy, 1);
    goToStep("A4");
    const controls = [...document.querySelectorAll<HTMLElement>("[data-clip-path]")];
    expect(controls.length, `clip_controls=${controls.length}`).toBeGreaterThan(3);
    act(() => {
      for (let tap = 0; tap < 6; tap += 1) controls[tap % 2]!.click();
    });
    expect(playing.size, `playing=${playing.size}`).toBe(1);
    const [only] = [...playing] as HTMLAudioElement[];
    expect(only!.src, "the last tap is on the second control").toBe(controls[1]!.getAttribute("data-clip-url"));
  });

  it("survives a clip whose play call rejects and keeps the flow usable", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (this: HTMLMediaElement) {
      return Promise.reject(new DOMException("blocked", "NotAllowedError"));
    });
    const copy = approvedClone();
    renderDay(copy, 1);
    goToStep("A4");
    const control = document.querySelector<HTMLElement>("[data-clip-path]")!;
    await act(async () => {
      control.click();
      control.click();
      await Promise.resolve();
    });
    expect(calls("play"), `play_calls=${calls("play")}`).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    expect(currentStepId(), "the flow must still move after a rejected play").toBe("A5");
  });

  it("leaves one open player after five rapid taps on Open media, and one valid state after open and close taps", () => {
    renderDay(week, 2);
    goToStep("B3");
    const opener = screen.getByRole("button", { name: OPEN_MEDIA });
    act(() => {
      for (let tap = 0; tap < 5; tap += 1) opener.click();
    });
    expect(screen.queryAllByLabelText(PLAYER).length, "players=1 after five taps").toBe(1);

    for (let tap = 0; tap < 5; tap += 1) {
      fireEvent.click(screen.getByRole("button", { name: CLOSE }));
      expect(screen.queryAllByLabelText(PLAYER).length, `players=0 after close ${tap}`).toBe(0);
      expect(document.activeElement, "focus returns to the opener").toBe(opener);
      fireEvent.click(opener);
      expect(screen.queryAllByLabelText(PLAYER).length, `players=1 after open ${tap}`).toBe(1);
    }
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryAllByLabelText(PLAYER).length, "two Escape keys leave the player closed").toBe(0);
    expect(currentStepId(), "the step keeps its place").toBe("B3");
  });

  it("closes the player and the clip on a step change, and ignores Escape afterward", () => {
    const copy = approvedClone();
    scriptOf(copy, 2).steps.find((step) => step.id === "B3")!.blendDrill = structuredClone(
      stepOf(week, 1, "A4").blendDrill!,
    );
    expectWeek(copy, "the clone with a drill on a media step");
    renderDay(copy, 2);
    goToStep("B3");
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    fireEvent.click(document.querySelector<HTMLElement>("[data-clip-path]")!);
    expect(playing.size, "the positive control: one clip plays").toBe(1);
    expect(screen.queryAllByLabelText(PLAYER).length, "players=1").toBe(1);

    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    expect(currentStepId(), "the flow moves to B4").toBe("B4");
    expect(screen.queryAllByLabelText(PLAYER).length, "players=0 after the step change").toBe(0);
    expect(playing.size, "the clip stops on the step change").toBe(0);
    expect(() => fireEvent.keyDown(document, { key: "Escape" })).not.toThrow();
    expect(currentStepId(), "Escape on a closed player changes no step").toBe("B4");
  });

  it("stops on the last step after rapid taps on Next step, with a step on screen", () => {
    renderDay(week, 4);
    let taps = 0;
    for (;;) {
      const next = screen.queryByRole("button", { name: NEXT_STEP });
      if (!next) break;
      taps += 1;
      expect(taps, "the walk must end").toBeLessThan(40);
      fireEvent.click(next);
    }
    const last = scriptOf(week, 4).steps.at(-1)!.id;
    expect(taps, `next_taps=${taps}`).toBe(scriptOf(week, 4).steps.length - 1);
    expect(currentStepId(), "the last screen holds the last step").toBe(last);
    expect(screen.queryByRole("button", { name: NEXT_STEP }), "no forward control on the last screen").toBeNull();
  });

  it("F451: gives every clip control of a drill word with a repeated sound its own React key", () => {
    const copy = approvedClone();
    const drill = stepOf(copy, 1, "A4").blendDrill!;
    const n = "phonemes/daniel/04-n.mp3";
    drill.words[0]!.word = "nan";
    drill.words[0]!.sounds = ["/n/", "/a/", "/n/"];
    drill.words[0]!.audio = [n, "phonemes/daniel/26-a-short.mp3", n];
    expectWeek(copy, "the clone with a drill word that repeats a sound");

    const view = renderDay(copy, 1);
    goToStep("A4");
    const items = [...document.querySelectorAll("[data-loop='blend-drill'] li")];
    const first = items[0]!;
    expect(first.querySelectorAll("[data-clip-path]").length, "clip_controls_nan=3").toBe(3);
    fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
    expect(first.querySelectorAll("[data-clip-path]").length, "clip_controls_nan=3 after a re-render").toBe(3);
    const keyWarnings = consoleErrors.filter((line) => /same key/i.test(line));
    expect(
      keyWarnings.length,
      `key_warnings=${keyWarnings.length}: the clip key is the file name, so a word with a repeated sound repeats a key (F451). ${keyWarnings[0] ?? ""}`,
    ).toBe(0);
    view.unmount();
  });
});

/** The Thai script range. */
const THAI = /[\u0E00-\u0E7F]/;

/**
 * Blanks every Thai text of the lesson scripts of a week, in place.
 * @param value The part of the week to walk.
 */
function blankThai(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(blankThai);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.en === "string" && typeof record.th === "string") record.th = "";
  Object.values(record).forEach(blankThai);
}

describe("Phase 4 adversarial round 2: the delta of f76d58624", () => {
  it("marks every text with the language that shows, with Thai on, for full and for blank Thai texts", () => {
    const marks = (): { th: number; en: number; wrongTh: string[]; wrongEn: string[] } => {
      const out = { th: 0, en: 0, wrongTh: [] as string[], wrongEn: [] as string[] };
      for (const node of document.querySelectorAll<HTMLElement>("[lang]")) {
        const lang = node.getAttribute("lang");
        const text = (node.textContent ?? "").trim();
        if (text === "") continue;
        if (lang === "th") {
          out.th += 1;
          if (!THAI.test(text)) out.wrongTh.push(text.slice(0, 40));
        } else if (lang === "en") {
          out.en += 1;
          if (THAI.test(text)) out.wrongEn.push(text.slice(0, 40));
        }
      }
      return out;
    };
    const walkThai = (source: StorytimeWeek) => {
      const total = { th: 0, en: 0, wrongTh: [] as string[], wrongEn: [] as string[] };
      for (const day of DAYS) {
        const view = renderDay(source, day);
        fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
        for (;;) {
          const facts = marks();
          total.th += facts.th;
          total.en += facts.en;
          total.wrongTh.push(...facts.wrongTh);
          total.wrongEn.push(...facts.wrongEn);
          const next = screen.queryByRole("button", { name: NEXT_STEP });
          if (!next) break;
          fireEvent.click(next);
        }
        view.unmount();
      }
      return total;
    };

    const full = walkThai(approvedClone());
    expect(full.th, `lang_th_nodes=${full.th}: the positive control must find Thai text`).toBeGreaterThan(40);
    expect(full.wrongTh, `mislabeled_th_full=${full.wrongTh.length}`).toEqual([]);
    expect(full.wrongEn, `mislabeled_en_full=${full.wrongEn.length}`).toEqual([]);

    const blank = approvedClone();
    for (const script of blank.scripts) blankThai(script);
    const partial = scriptOf(blank, 1).steps[0]!;
    partial.th = { ...partial.en, teacherActions: [], teacherLanguage: partial.en.teacherLanguage.map(() => "ก"), studentActions: [], watchFor: [] };
    delete scriptOf(blank, 2).steps[0]!.th;
    expectWeek(blank, "the clone with blank Thai texts and partial Thai notes");
    const result = walkThai(blank);
    expect(result.en, `lang_en_nodes=${result.en}: the fallback texts must show`).toBeGreaterThan(40);
    expect(
      result.wrongTh,
      `mislabeled_th_blank=${result.wrongTh.length}: a text with no Thai letter carries lang th. ${result.wrongTh.slice(0, 3).join(" | ")}`,
    ).toEqual([]);
    expect(result.wrongEn, `mislabeled_en_blank=${result.wrongEn.length}`).toEqual([]);
  });

  it("keeps every React key unique on a hostile clone: repeated sounds, repeated words, repeated cards, repeated shots", () => {
    const copy = approvedClone();
    const drill = stepOf(copy, 1, "A4").blendDrill!;
    const n = "phonemes/daniel/04-n.mp3";
    drill.words[0] = { ...drill.words[0]!, word: "nan", sounds: ["/n/", "/a/", "/n/"], audio: [n, "phonemes/daniel/26-a-short.mp3", n] };
    drill.words[1] = structuredClone(drill.words[0]!);
    const recall = scriptOf(copy, 2).recall!;
    recall.items[1] = structuredClone(recall.items[0]!);
    scriptOf(copy, 1).share!.shots = [
      { step: "A3", media: "video" },
      { step: "A3", media: "video" },
    ];
    expectWeek(copy, "the hostile clone");
    const facts = walkWeek(copy);
    expect(facts.length, `screens=${facts.length}`).toBeGreaterThan(20);
    const clipsA4 = facts.find((entry) => entry.stepId === "A4" && entry.day === 1);
    expect(clipsA4?.panels, "the drill panel must show on A4 (positive control)").toBeGreaterThan(0);
    expect(facts.reduce((sum, entry) => sum + entry.shares, 0), "share_shown_total").toBe(6);
    const warnings = consoleErrors.filter((line) => /same key|unique "key"|unique key/i.test(line));
    expect(warnings.length, `key_warnings=${warnings.length}: ${warnings[0] ?? ""}`).toBe(0);
  });

  it("starts the name of every clip control with its visible text and keeps recall names apart", () => {
    const copy = approvedClone();
    renderDay(copy, 1);
    goToStep("A4");
    const drill = [...document.querySelectorAll<HTMLElement>("[data-clip-path]")];
    expect(drill.length, `drill_clips=${drill.length}`).toBe(12);
    cleanup();
    renderDay(copy, 2);
    const recall = [...document.querySelectorAll<HTMLElement>("[data-clip-path]")];
    expect(recall.length, `recall_clips=${recall.length}: day 2 holds one recorded card`).toBeGreaterThan(0);
    for (const control of [...drill, ...recall]) {
      const name = control.getAttribute("aria-label") ?? "";
      const visible = (control.textContent ?? "").trim();
      expect(name.startsWith(`${visible}:`), `name "${name}" must start with "${visible}:"`).toBe(true);
    }
    const names = recall.map((control) => control.getAttribute("aria-label"));
    expect(new Set(names).size, `recall_names=${names.length}`).toBe(names.length);
  });

  it("pauses the clip on unmount under StrictMode, and survives a play that rejects after the unmount", async () => {
    const copy = approvedClone();
    const view = render(
      <StrictMode>
        <TeacherLessonFlow week={copy} day={1} locale="en" mediaUrls={signedMap(copy)} />
      </StrictMode>,
    );
    goToStep("A4");
    fireEvent.click(document.querySelector<HTMLElement>("[data-clip-path]")!);
    expect(playing.size, "the positive control: one clip plays under StrictMode").toBe(1);
    view.unmount();
    expect(playing.size, "the clip must stop on unmount").toBe(0);

    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (this: HTMLMediaElement) {
      return Promise.reject(new DOMException("interrupted", "AbortError"));
    });
    const second = renderDay(copy, 1);
    goToStep("A4");
    fireEvent.click(document.querySelector<HTMLElement>("[data-clip-path]")!);
    second.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(() => cleanup()).not.toThrow();
    const none = renderDay(copy, 1);
    expect(() => none.unmount(), "an unmount with no clip must not throw").not.toThrow();
  });

  it("shows the consent line once per step, in the last moment, in the active language", () => {
    const copy = approvedClone();
    scriptOf(copy, 1).share!.shots = [
      { step: "A3", media: "video" },
      { step: "A3", media: "photo" },
    ];
    expectWeek(copy, "the clone with two shots on A3");
    renderDay(copy, 1);
    goToStep("A3");
    const moments = [...document.querySelectorAll<HTMLElement>("[data-share-moment='A3']")];
    expect(moments.length, `share_shown_a3=${moments.length}`).toBe(2);
    const hasConsent = (node: HTMLElement) => /The app sends nothing\./.test(node.textContent ?? "");
    expect(moments.map(hasConsent), "only the last moment holds the consent line").toEqual([false, true]);
    expect(moments[0]!.querySelector("[data-share-label]")!.textContent).not.toBe(
      moments[1]!.querySelector("[data-share-label]")!.textContent,
    );
    fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
    const thaiMoments = [...document.querySelectorAll<HTMLElement>("[data-share-moment='A3']")];
    const thaiConsent = thaiMoments.filter((node) => /ทางแอปไม่ส่งอะไรออกไป/.test(node.textContent ?? ""));
    expect(thaiConsent.length, "consent_lines_thai=1").toBe(1);
    expect(thaiConsent[0], "the Thai consent line sits in the last moment").toBe(thaiMoments[1]);
    expect(thaiConsent[0]!.querySelector("p:last-child")!.getAttribute("lang")).toBe("th");

    cleanup();
    renderDay(approvedClone(), 4);
    for (const id of ["D4", "D5"]) {
      goToStep(id);
      const only = document.querySelectorAll(`[data-share-moment='${id}']`);
      expect(only.length, `share_shown_${id}=1`).toBe(1);
      expect(hasConsent(only[0] as HTMLElement), `a single shot on ${id} keeps its consent line`).toBe(true);
    }
  });

  it("moves the focus to the end region on the last screen, and nowhere else", () => {
    renderDay(week, 4);
    expect(document.activeElement, "no focus steal on a first screen of a long day").toBe(document.body);
    const toggle = screen.getByRole("button", { name: THAI_TOGGLE });
    toggle.focus();
    fireEvent.click(toggle);
    expect(document.activeElement, "a toggle click keeps the focus on the toggle").toBe(toggle);
    goToStep("D6");
    const end = document.querySelector<HTMLElement>("[aria-label='The end of the lesson']");
    expect(end, "the last screen must hold the end region").not.toBeNull();
    expect(document.activeElement, "the focus moves to the end region on the last screen").toBe(end);
    expect(end!.getAttribute("tabindex"), "the region is a script focus target only").toBe("-1");
    toggle.focus();
    fireEvent.click(toggle);
    expect(document.activeElement, "a toggle click on the last screen must not pull the focus back").toBe(toggle);
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    fireEvent.click(screen.getByRole("button", { name: CLOSE }));
    expect(document.activeElement, "Close returns the focus to the opener, not the end region").toBe(
      screen.getByRole("button", { name: OPEN_MEDIA }),
    );
  });

  it("F462: exposes the name of the end region through a role", () => {
    renderDay(week, 4);
    goToStep("D6");
    const named =
      screen.queryByRole("region", { name: "The end of the lesson" }) ??
      screen.queryByRole("group", { name: "The end of the lesson" });
    expect(
      named,
      "the end region carries aria-label on a div with no role; ARIA 1.2 prohibits aria-label on a generic element, so a screen reader may not announce it (F462)",
    ).not.toBeNull();
  });

  it("F463: moves no focus on load for a day that holds one step", () => {
    const copy = structuredClone(week);
    const script = scriptOf(copy, 1);
    script.steps = [script.steps[0]!];
    expectWeek(copy, "the clone with a one-step day");
    renderDay(copy, 1);
    expect(screen.queryByRole("button", { name: NEXT_STEP }), "a one-step day has no forward control").toBeNull();
    expect(
      document.activeElement,
      "the focus must stay on the body at load; the end-region effect runs on mount when the first screen is the last (F463)",
    ).toBe(document.body);
  });
});

describe("Phase 4 adversarial round 3: the end region and the movedRef guard (9e2d04418)", () => {
  /** The accessible name of the end region. */
  const END = "The end of the lesson";

  it("shows one named end region on the last screen of each day only, with the Friday check on day 5", () => {
    for (const day of DAYS) {
      const view = renderDay(week, day);
      let screens = 0;
      for (;;) {
        screens += 1;
        const regions = document.querySelectorAll(`[aria-label="${END}"]`).length;
        const next = screen.queryByRole("button", { name: NEXT_STEP });
        expect(regions, `day=${day} screen=${screens} end_regions`).toBe(next ? 0 : 1);
        if (!next) break;
        fireEvent.click(next);
      }
      expect(screens, `day=${day} screens=${screens}`).toBe(scriptOf(week, day).steps.length);
      const region = screen.getByRole("region", { name: END });
      expect(region.textContent, `day=${day}: the region holds its visible line`).toContain(
        "This is the last step of the day.",
      );
      expect(
        !!region.querySelector("[aria-label='The Friday check']"),
        `day=${day}: the Friday check sits in the region on day 5 only`,
      ).toBe(day === 5);
      view.unmount();
    }
  });

  it("moves the focus once, with preventScroll, after a real focused Next step press, in and out of StrictMode", () => {
    for (const strict of [false, true]) {
      const flow = <TeacherLessonFlow week={week} day={1} locale="en" mediaUrls={{}} />;
      const view = render(strict ? <StrictMode>{flow}</StrictMode> : flow);
      const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
      for (;;) {
        const next = screen.queryByRole("button", { name: NEXT_STEP });
        if (!next) break;
        next.focus();
        expect(document.activeElement, "the Next step control holds the focus before the press").toBe(next);
        fireEvent.click(next);
      }
      const region = screen.getByRole("region", { name: END });
      expect(document.activeElement, `strict=${strict}: the focus lands on the end region`).toBe(region);
      const onRegion = focusSpy.mock.contexts
        .map((instance, index) => ({ instance, options: focusSpy.mock.calls[index]?.[0] }))
        .filter((entry) => entry.instance === region);
      expect(onRegion.length, `strict=${strict} region_focus_calls=${onRegion.length}`).toBe(1);
      expect(onRegion[0]!.options?.preventScroll, "the move keeps the scroll place").toBe(true);
      focusSpy.mockRestore();
      view.unmount();
    }
  });

  it("keeps the guard per instance: a keyed remount to a one-step day moves no focus", () => {
    const one = structuredClone(week);
    const script = scriptOf(one, 1);
    script.steps = [script.steps[0]!];
    expectWeek(one, "the one-step clone");
    const view = render(<TeacherLessonFlow key="a" week={week} day={1} locale="en" mediaUrls={{}} />);
    for (;;) {
      const next = screen.queryByRole("button", { name: NEXT_STEP });
      if (!next) break;
      fireEvent.click(next);
    }
    expect(document.activeElement, "the positive control: the first instance moved the focus").toBe(
      screen.getByRole("region", { name: END }),
    );
    view.rerender(<TeacherLessonFlow key="b" week={one} day={1} locale="en" mediaUrls={{}} />);
    expect(screen.queryByRole("button", { name: NEXT_STEP }), "the new instance holds one step").toBeNull();
    expect(
      document.activeElement,
      "a remount must not inherit the moved flag of the old instance",
    ).not.toBe(screen.getByRole("region", { name: END }));
    expect(document.activeElement).toBe(document.body);
  });

  it("ignores a second press on a stale Next step node, and moves the focus once", () => {
    renderDay(week, 3);
    const last = scriptOf(week, 3).steps.length - 1;
    for (let tap = 0; tap < last - 1; tap += 1) {
      fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    }
    const stale = screen.getByRole("button", { name: NEXT_STEP });
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    fireEvent.click(stale);
    fireEvent.click(stale);
    expect(currentStepId(), "the second press on the detached node changes nothing").toBe(
      scriptOf(week, 3).steps.at(-1)!.id,
    );
    const region = screen.getByRole("region", { name: END });
    const calls = focusSpy.mock.contexts.filter((instance) => instance === region).length;
    expect(calls, `region_focus_calls=${calls}`).toBe(1);
    expect(document.activeElement).toBe(region);
  });

  it("closes an open player and still moves the focus when Next step reaches the last screen", () => {
    const copy = structuredClone(week);
    const e4 = stepOf(copy, 5, "E4");
    e4.materials = [...e4.materials, 'karaoke videos: "Hello, I Am Pip"'];
    expectWeek(copy, "the clone with media on the step before the last");
    renderDay(copy, 5);
    goToStep("E4");
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    expect(screen.queryAllByLabelText(PLAYER).length, "players=1 (positive control)").toBe(1);
    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    expect(currentStepId()).toBe("E5");
    expect(screen.queryAllByLabelText(PLAYER).length, "players=0 on the last screen").toBe(0);
    expect(document.activeElement).toBe(screen.getByRole("region", { name: END }));
  });

  it("keeps the focus on the region when the Thai toggle changes the language of the last screen", () => {
    renderDay(week, 2);
    for (;;) {
      const next = screen.queryByRole("button", { name: NEXT_STEP });
      if (!next) break;
      fireEvent.click(next);
    }
    const region = screen.getByRole("region", { name: END });
    expect(document.activeElement).toBe(region);
    fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
    expect(screen.getByRole("region", { name: END }), "the same region node stays").toBe(region);
    expect(region.querySelector("p")!.getAttribute("lang"), "the fixed English line keeps lang en").toBe("en");
  });
});

describe("Phase 4 adversarial round 5: lang marks, tap floor, and focus ring (rem5 and rem6)", () => {
  /** The facts of one lang scan. */
  interface LangScan {
    /** The text nodes with a Latin letter and no Thai letter. */
    latin: number;
    /** The text nodes with a Thai letter. */
    thai: number;
    /** The text nodes under the wrong language mark. */
    bad: string[];
  }

  /**
   * Scans the text nodes of a root: Latin text needs lang en on its nearest marked ancestor, and
   * Thai text needs lang th. The page language is Thai, so an unmarked English text inherits th.
   * @param root The element to scan.
   * @returns The facts of the scan.
   */
  function scanLang(root: HTMLElement): LangScan {
    const out: LangScan = { latin: 0, thai: 0, bad: [] };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? "").trim();
      const parent = node.parentElement;
      if (text === "" || !parent || parent.closest("[data-mode]")) continue;
      // A text is Thai when at least 20 percent of its letters are Thai. An English note line
      // that quotes a Thai letter as a sound guide stays English here (see F671).
      const thaiLetters = (text.match(/[\u0E00-\u0E7F]/g) ?? []).length;
      const latinLetters = (text.match(/[A-Za-z]/g) ?? []).length;
      const hasThai = thaiLetters > 0 && thaiLetters / (thaiLetters + latinLetters) >= 0.2;
      const hasLatin = latinLetters > 0 && !hasThai;
      const lang = parent.closest("[lang]")?.getAttribute("lang") ?? null;
      if (hasThai) {
        out.thai += 1;
        if (lang !== "th") out.bad.push(`th text under ${lang}: ${text.slice(0, 30)}`);
      } else if (hasLatin) {
        out.latin += 1;
        if (lang !== "en") out.bad.push(`en text under ${lang}: ${text.slice(0, 30)}`);
      }
    }
    return out;
  }

  /** The class tokens of an element. */
  const tokens = (element: Element): string[] => (element.getAttribute("class") ?? "").split(/\s+/);

  /**
   * Reports whether an element can hold a min-height: a button is inline-block, and a link needs
   * a block-like class of its own or a flex or grid parent.
   * @param element The element.
   * @returns `true` when the min-height class takes effect.
   */
  function blockified(element: Element): boolean {
    if (element.tagName === "BUTTON") return true;
    const own = tokens(element);
    if (own.some((token) => ["block", "inline-block", "flex", "inline-flex", "grid"].includes(token))) return true;
    const parent = element.parentElement ? tokens(element.parentElement) : [];
    return parent.some((token) => ["flex", "inline-flex", "grid"].includes(token));
  }

  it("marks every English text lang en and every Thai text lang th on the week view under a Thai page", () => {
    document.documentElement.lang = "th";
    try {
      const view = render(<TeacherWeekView week={week} locale="en" mediaUrls={signedMap(week)} />);
      const scan = scanLang(view.container);
      expect(scan.latin, `latin_nodes=${scan.latin}: the view holds English text`).toBeGreaterThan(20);
      expect(scan.bad, `lang_violations=${scan.bad.length}: ${scan.bad.slice(0, 4).join(" | ")}`).toEqual([]);
      const family = [...view.container.querySelectorAll<HTMLElement>("[aria-label='The family words'] [aria-label], [aria-label='The family words'] img")];
      expect(family.length, `family_captions=${family.length}`).toBeGreaterThan(0);
      for (const node of family) expect(node.getAttribute("lang"), "a family caption carries lang en").toBe("en");

      const planted = view.container.querySelector<HTMLElement>("h2")!;
      planted.removeAttribute("lang");
      expect(scanLang(view.container).bad.length, "the scan catches a heading with no lang mark").toBeGreaterThan(0);
    } finally {
      document.documentElement.lang = "";
    }
  });

  it("marks every English and Thai text of the lesson flow, on all days and screens, with the toggle off and on", () => {
    document.documentElement.lang = "th";
    try {
      const source = approvedClone();
      let scanned = 0;
      let thaiNodes = 0;
      for (const day of DAYS) {
        for (const thaiOn of [false, true]) {
          const view = renderDay(source, day);
          if (thaiOn) fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
          for (;;) {
            const scan = scanLang(view.container);
            scanned += scan.latin;
            thaiNodes += scan.thai;
            expect(scan.bad, `day=${day} thai=${thaiOn} step=${currentStepId()}: ${scan.bad.slice(0, 3).join(" | ")}`).toEqual([]);
            const next = screen.queryByRole("button", { name: NEXT_STEP });
            if (!next) break;
            fireEvent.click(next);
          }
          view.unmount();
        }
      }
      expect(scanned, `latin_nodes=${scanned}`).toBeGreaterThan(500);
      expect(thaiNodes, `thai_nodes=${thaiNodes}: the toggle-on walks hold Thai text`).toBeGreaterThan(100);

      const view = renderDay(source, 1);
      const chip = view.container.querySelector<HTMLElement>("[data-step-id] header span")!;
      expect(chip.textContent, "the first span of the step header is the step id chip").toBe("A1");
      expect(chip.getAttribute("lang"), "the step id chip carries lang en").toBe("en");
      chip.removeAttribute("lang");
      expect(scanLang(view.container).bad.length, "the scan catches an unmarked step id chip").toBeGreaterThan(0);
    } finally {
      document.documentElement.lang = "";
    }
  });

  it("F671: wraps a Thai run inside an English note line in an element with lang th", () => {
    const source = approvedClone();
    let mixedLines = 0;
    const offenders: string[] = [];
    for (const day of DAYS) {
      const view = renderDay(source, day);
      for (;;) {
        for (const node of view.container.querySelectorAll<HTMLElement>("[data-step-id] li[lang='en'], [data-step-id] p[lang='en']")) {
          for (const child of node.childNodes) {
            if (child.nodeType !== Node.TEXT_NODE) continue;
            const text = child.textContent ?? "";
            if (/[\u0E00-\u0E7F]/.test(text)) {
              mixedLines += 1;
              offenders.push(text.slice(0, 50));
            }
          }
        }
        const next = screen.queryByRole("button", { name: NEXT_STEP });
        if (!next) break;
        fireEvent.click(next);
      }
      view.unmount();
    }
    expect(
      mixedLines,
      `thai_in_english_lines=${mixedLines}: a Thai letter sits in a text node under lang en with no lang th wrapper (WCAG 3.1.2). ${offenders[0] ?? ""}`,
    ).toBe(0);
  });

  it("gives every control of the teacher pages a 44 px floor that takes effect", () => {
    const named = (view: ReturnType<typeof render>) => {
      const found: Array<[string, Element]> = [];
      for (const name of [THAI_TOGGLE, NEXT_STEP, OPEN_MEDIA]) {
        const control = view.queryByRole("button", { name });
        if (control) found.push([name, control]);
      }
      const back = view.queryByRole("link", { name: "Back to the week" });
      if (back) found.push(["Back to the week", back]);
      return found;
    };
    const flow = renderDay(week, 2);
    goToStep("B3");
    const first = named(flow);
    expect(first.map(([name]) => name).sort(), "the media step shows the four controls").toEqual(
      [THAI_TOGGLE, NEXT_STEP, OPEN_MEDIA, "Back to the week"].sort(),
    );
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    const close = screen.getByRole("button", { name: CLOSE });
    for (const [name, control] of [...first, [CLOSE, close] as [string, Element]]) {
      expect(tokens(control), `${name} holds min-h-11`).toContain("min-h-11");
      expect(blockified(control), `${name}: the min height takes effect (not an inline link)`).toBe(true);
    }
    cleanup();

    const weekView = render(<TeacherWeekView week={week} locale="en" mediaUrls={signedMap(week)} />);
    const links = weekView.getAllByRole("link", { name: "Open the lesson" });
    expect(links.length, `open_lesson_links=${links.length}`).toBe(5);
    for (const link of links) {
      expect(tokens(link), "Open the lesson holds min-h-11").toContain("min-h-11");
      expect(blockified(link), "Open the lesson is a flex item, so min-h-11 takes effect").toBe(true);
    }
    cleanup();

    const inline = document.createElement("div");
    inline.innerHTML = '<a class="min-h-11" href="/x">x</a>';
    expect(blockified(inline.firstElementChild!), "the check catches an inline link with min-h-11").toBe(false);
  });

  it("holds the floor on every button and link outside the players, so no control is missed", () => {
    const missing: string[] = [];
    let seen = 0;
    const check = (root: HTMLElement) => {
      for (const control of root.querySelectorAll("button, a[href]")) {
        if (control.closest("[data-mode]")) continue;
        seen += 1;
        const list = tokens(control);
        const floor = list.includes("min-h-11") || list.includes("min-h-[44px]");
        if (!floor) missing.push(`${control.tagName} ${control.textContent?.trim().slice(0, 20)}`);
      }
    };
    const source = approvedClone();
    for (const day of [1, 2, 4]) {
      const view = renderDay(source, day);
      for (;;) {
        check(view.container);
        const next = screen.queryByRole("button", { name: NEXT_STEP });
        if (!next) break;
        fireEvent.click(next);
      }
      view.unmount();
    }
    const weekView = render(<TeacherWeekView week={week} locale="en" mediaUrls={signedMap(week)} />);
    check(weekView.container);
    expect(seen, `controls_scanned=${seen}`).toBeGreaterThan(40);
    expect(missing, `controls_without_floor=${missing.length}: ${missing.slice(0, 4).join(" | ")}`).toEqual([]);
  });

  it("styles the end region focus with a visible two-tone ring that names a defined variable, and keeps preventScroll", () => {
    renderDay(week, 3);
    for (;;) {
      const next = screen.queryByRole("button", { name: NEXT_STEP });
      if (!next) break;
      fireEvent.click(next);
    }
    const region = screen.getByRole("region", { name: "The end of the lesson" });
    const list = tokens(region);
    for (const token of [
      "focus:outline-3",
      "focus:outline-white",
      "focus:outline-offset-0",
      "focus:[box-shadow:0_0_0_6px_var(--st-brown)]",
    ]) {
      expect(list, `the end region holds ${token}`).toContain(token);
    }
    expect(list.some((token) => token.includes("outline-none")), "the ring is not removed").toBe(false);
    expect(
      list.some((token) => token.startsWith("focus-visible:")),
      "the ring uses focus:, so a script focus after a mouse click shows it too",
    ).toBe(false);
    const css = readFileSync(resolve(import.meta.dirname, "../app/look.css"), "utf8");
    expect(css, "look.css defines --st-brown").toMatch(/--st-brown:\s*#[0-9a-fA-F]{6}/);
    const layout = readFileSync(resolve(import.meta.dirname, "../app/[locale]/layout.tsx"), "utf8");
    expect(layout, "the layout imports look.css").toMatch(/import\s+"\.\.\/look\.css"/);
    expect(document.activeElement, "the focus sits on the region").toBe(region);
  });
});

describe("Phase 4 adversarial round 6: splitThaiRuns, LanguageRuns, and the scroll condition (rem7 to rem9)", () => {
  /**
   * Checks the run invariants of one split: no character lost, no empty run, runs alternate, and
   * the flag of each run matches every code point in it.
   * @param text The text that was split.
   * @returns The runs.
   */
  function checkRuns(text: string) {
    const runs = splitThaiRuns(text);
    expect(runs.map((run) => run.text).join(""), `no character lost for ${JSON.stringify(text.slice(0, 20))}`).toBe(text);
    runs.forEach((run, index) => {
      expect(run.text.length, "no empty run").toBeGreaterThan(0);
      if (index > 0) expect(run.thai, "runs alternate").toBe(!runs[index - 1]!.thai);
      for (const char of run.text) {
        const code = char.codePointAt(0)!;
        expect(run.thai, `code point U+${code.toString(16)} sits in the right run`).toBe(code >= 0x0e00 && code <= 0x0e7f);
      }
    });
    return runs;
  }

  it("splits at the block edges, around surrogate pairs and combining marks, and keeps every character", () => {
    expect(splitThaiRuns(""), "an empty text gives no run").toEqual([]);
    expect(checkRuns("\u0E00").map((run) => run.thai), "U+0E00 is the first Thai code point").toEqual([true]);
    expect(checkRuns("\u0E7F").map((run) => run.thai), "U+0E7F is the last Thai code point").toEqual([true]);
    expect(checkRuns("\u0DFF").map((run) => run.thai), "U+0DFF is outside the block").toEqual([false]);
    expect(checkRuns("\u0E80").map((run) => run.thai), "U+0E80 (Lao) is outside the block").toEqual([false]);
    expect(checkRuns("a\u0E00b\u0E7Fc").map((run) => run.thai), "the edges split the text").toEqual([false, true, false, true, false]);
    expect(checkRuns("\u0E50\u0E51\u0E59").map((run) => run.thai), "Thai digits are Thai").toEqual([true]);
    expect(checkRuns("0123456789").map((run) => run.thai), "ASCII digits are not Thai").toEqual([false]);
    expect(checkRuns("\u0E3F100").map((run) => run.text), "the baht sign is in the block").toEqual(["\u0E3F", "100"]);
    expect(checkRuns("\u0E01\u0E02\u0E03").length, "a string of only Thai is one run").toBe(1);
    const emoji = checkRuns("\u0E01\u{1F600}\u0E01");
    expect(emoji.map((run) => run.text), "a surrogate pair stays whole").toEqual(["\u0E01", "\u{1F600}", "\u0E01"]);
    expect(checkRuns("\u{1F600}\u{1F600}").length, "two pairs form one run").toBe(1);
    expect(checkRuns("\u{1F469}\u200D\u{1F469}").length, "a joiner sequence stays one run").toBe(1);
    expect(checkRuns("e\u0301").length, "a Latin combining mark stays with its letter").toBe(1);
    expect(checkRuns("\u0E01\u0E31\u0E48").length, "a Thai letter with its Thai marks is one run").toBe(1);
    expect(checkRuns("\uD800").length, "a lone surrogate is kept").toBe(1);
    expect(checkRuns("a\uDC00\u0E01").map((run) => run.thai), "a lone low surrogate is kept before Thai").toEqual([false, true]);
    expect(checkRuns("\u0000\u0E01\u0000").length, "a NUL does not break the split").toBe(3);
  });

  it("keeps the invariants on 300 seeded random strings and on very long strings", () => {
    const alphabet = ["a", "Z", " ", "1", ".", "\u0E00", "\u0E01", "\u0E31", "\u0E50", "\u0E7F", "\u0DFF", "\u0E80", "\u{1F600}", "\u0301", "\u200D", "\uD800", "\uDC00", "\u0000"];
    let seed = 20261111;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    let thaiRuns = 0;
    for (let index = 0; index < 300; index += 1) {
      const length = Math.floor(next() * 60);
      let text = "";
      for (let at = 0; at < length; at += 1) text += alphabet[Math.floor(next() * alphabet.length)]!;
      thaiRuns += checkRuns(text).filter((run) => run.thai).length;
    }
    expect(thaiRuns, `thai_runs=${thaiRuns}: the fuzz reaches Thai runs`).toBeGreaterThan(300);

    const started = Date.now();
    const million = "\u0E01".repeat(1_000_000);
    const long = splitThaiRuns(million);
    expect(long.length, "a million Thai letters are one run").toBe(1);
    expect(long[0]!.text.length).toBe(1_000_000);
    const alternating = "a\u0E01".repeat(100_000);
    const many = splitThaiRuns(alternating);
    expect(many.length, "alternating text gives one run per character").toBe(200_000);
    expect(many.map((run) => run.text).join("")).toBe(alternating);
    expect(Date.now() - started, "the long splits run in under 5 seconds").toBeLessThan(5000);
  });

  /** The suffix with Thai letters and a Thai digit. */
  const SUFFIX = " \u0E01\u0E02\u0E03\u0E51";
  /** The keys of the week data whose English strings the flow and the view show. */
  const KEYS = new Set([
    "en", "text", "word", "sound", "letter", "caption", "frame", "title", "graphemes", "sounds", "pictures",
    "words", "trickyWords", "teacherActions", "teacherLanguage", "studentActions", "watchFor",
  ]);

  /**
   * Appends the Thai suffix to every English display string of a week part, in place.
   * @param value The part to walk.
   * @param key The key of the part.
   * @returns The changed part.
   */
  function plantThai(value: unknown, key?: string): unknown {
    if (typeof value === "string") return key && KEYS.has(key) ? `${value}${SUFFIX}` : value;
    if (Array.isArray(value)) return value.map((entry) => plantThai(entry, key));
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const name of Object.keys(record)) {
        if (name === "th" || name === "materials" || name === "audio" || name === "image") continue;
        record[name] = plantThai(record[name], name);
      }
    }
    return value;
  }

  /**
   * Lists the text nodes that hold a Thai letter and sit under a mark other than lang th.
   * @param root The element to scan.
   * @returns The unwrapped text nodes, and the spans with lang th that wrap non-Thai text.
   */
  function unwrapped(root: HTMLElement): { bad: string[]; spans: number; badSpans: string[] } {
    const out = { bad: [] as string[], spans: 0, badSpans: [] as string[] };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      const text = node.textContent ?? "";
      if (!parent || parent.closest("[data-mode]")) continue;
      if (/[\u0E00-\u0E7F]/.test(text) && parent.closest("[lang]")?.getAttribute("lang") !== "th") {
        out.bad.push(text.trim().slice(0, 40));
      }
    }
    for (const span of root.querySelectorAll<HTMLElement>("span[lang='th']")) {
      if (span.closest("[data-mode]")) continue;
      out.spans += 1;
      if (!/^[\u0E00-\u0E7F]+$/.test(span.textContent ?? "") && span.parentElement?.closest("[lang]")?.getAttribute("lang") !== "th") {
        out.badSpans.push(span.textContent ?? "");
      }
    }
    return out;
  }

  it("wraps every Thai run of every English text of the flow and the week view, with no character lost", () => {
    const planted = approvedClone();
    plantThai(planted.scripts);
    plantThai(planted.review);
    plantThai(planted.check);
    plantThai(planted.opening);
    const parsed = weekSchema.safeParse(planted);
    expect(parsed.success, `the planted week passes the contract. ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message).slice(0, 3).join("; ")}`).toBe(true);

    const blank = structuredClone(planted);
    for (const script of blank.scripts) blankThai(script);
    let wrapped = 0;
    let screens = 0;
    for (const [label, source] of [["full Thai", planted], ["blank Thai", blank]] as const) {
      for (const day of DAYS) {
        for (const thaiOn of [false, true]) {
          const view = renderDay(source, day);
          if (thaiOn) fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
          for (;;) {
            const facts = unwrapped(view.container);
            screens += 1;
            wrapped += facts.spans;
            expect(facts.bad, `${label} day=${day} thai=${thaiOn} step=${currentStepId()}: Thai text outside a lang th mark`).toEqual([]);
            expect(facts.badSpans, "a lang th span holds only Thai letters").toEqual([]);
            const next = screen.queryByRole("button", { name: NEXT_STEP });
            if (!next) break;
            fireEvent.click(next);
          }
          view.unmount();
        }
      }
    }
    expect(screens, `screens=${screens}`).toBeGreaterThan(100);
    expect(wrapped, `wrapped_thai_spans=${wrapped}: the positive control must find wrapped runs`).toBeGreaterThan(200);

    const first = renderDay(planted, 1);
    const title = scriptOf(planted, 1).title.en;
    const stepTitle = scriptOf(planted, 1).steps[0]!.title.en;
    const note = scriptOf(planted, 1).steps[0]!.en.teacherActions[0]!;
    for (const text of [title, stepTitle, note]) {
      expect(document.body.textContent, `no character lost: ${text.slice(0, 30)}`).toContain(text);
    }
    const spanText = [...first.container.querySelectorAll("span[lang='th']")].map((span) => span.textContent);
    expect(spanText, "the suffix digit stays inside a Thai span").toContain("\u0E01\u0E02\u0E03\u0E51");
    first.unmount();

    const drillStep = renderDay(planted, 1);
    goToStep("A4");
    const drill = stepOf(planted, 1, "A4").blendDrill!;
    expect(document.body.textContent, "the drill word keeps every character").toContain(drill.words[0]!.word);
    expect(document.body.textContent, "the sound labels keep every character").toContain(drill.words[0]!.sounds.join(" "));
    drillStep.unmount();

    const planWeek = structuredClone(week);
    plantThai(planWeek.focus);
    for (const book of planWeek.books) book.title = `${book.title}${SUFFIX}`;
    planWeek.meta.title = `${planWeek.meta.title}${SUFFIX}`;
    for (const script of planWeek.scripts) script.title.en = `${script.title.en}${SUFFIX}`;
    expectWeek(planWeek, "the planted week for the week view");
    document.documentElement.lang = "th";
    try {
      const view = render(<TeacherWeekView week={planWeek} locale="en" mediaUrls={signedMap(planWeek)} />);
      const facts = unwrapped(view.container);
      expect(facts.spans, `week_view_wrapped_spans=${facts.spans}`).toBeGreaterThan(10);
      expect(facts.bad, "the week view holds no Thai text outside a lang th mark").toEqual([]);
      expect(view.container.textContent, "the week title keeps every character").toContain(planWeek.meta.title);
      expect(view.container.textContent, "the read-along title keeps every character").toContain(planWeek.books[0]!.title);
    } finally {
      document.documentElement.lang = "";
    }

    const probe = document.createElement("div");
    probe.innerHTML = '<p lang="en">Say \u0E01\u0E02</p><p lang="en">Say <span lang="th">\u0E01</span></p>';
    expect(unwrapped(probe).bad.length, "the scan catches an unwrapped Thai run under lang en").toBe(1);
  });

  it("wraps the Thai run of a media title in the open player header and in the media description", () => {
    const copy = structuredClone(week);
    const title = `${copy.song!.title}${SUFFIX}`;
    for (const script of copy.scripts) {
      for (const step of script.steps) {
        step.materials = step.materials.map((entry) =>
          entry.includes(`"${copy.song!.title}"`) ? entry.replace(`"${copy.song!.title}"`, `"${title}"`) : entry,
        );
      }
    }
    copy.song!.title = title;
    expectWeek(copy, "the clone with a Thai run in the song title");
    const view = renderDay(copy, 2);
    goToStep("B7");
    fireEvent.click(screen.getByRole("button", { name: OPEN_MEDIA }));
    const facts = unwrapped(view.container);
    expect(facts.bad, "the media title holds no Thai outside lang th").toEqual([]);
    expect(facts.spans, `media_title_spans=${facts.spans}: the header and the description each wrap one run`).toBeGreaterThanOrEqual(2);
    expect(view.container.querySelector("[aria-label='The media player'] h3")!.textContent, "the header keeps every character").toBe(title);
  });

  it("scrolls the end region into view only when its top is at or below the viewport bottom", () => {
    const cases: Array<{ label: string; innerHeight: number; top: number; height: number; scrolls: boolean }> = [
      { label: "top equals the viewport height", innerHeight: 768, top: 768, height: 200, scrolls: true },
      { label: "top one pixel inside", innerHeight: 768, top: 767, height: 200, scrolls: false },
      { label: "top one pixel outside", innerHeight: 768, top: 769, height: 200, scrolls: true },
      { label: "far below", innerHeight: 768, top: 5000, height: 200, scrolls: true },
      { label: "inside the viewport", innerHeight: 768, top: 100, height: 200, scrolls: false },
      { label: "above the viewport", innerHeight: 768, top: -300, height: 200, scrolls: false },
      { label: "zero height at the bottom edge", innerHeight: 768, top: 768, height: 0, scrolls: true },
      { label: "zero height inside", innerHeight: 768, top: 0, height: 0, scrolls: false },
      { label: "top is NaN", innerHeight: 768, top: Number.NaN, height: 10, scrolls: false },
      { label: "a zero-height window", innerHeight: 0, top: 0, height: 10, scrolls: true },
      { label: "a small window", innerHeight: 100, top: 100, height: 10, scrolls: true },
    ];
    const originalHeight = window.innerHeight;
    let scrolled = 0;
    for (const entry of cases) {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: entry.innerHeight });
      const scrollSpy = vi.fn();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollSpy });
      const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
        const region = this.getAttribute("aria-label") === "The end of the lesson";
        const top = region ? entry.top : 0;
        const height = region ? entry.height : 0;
        return { top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
      });
      const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
      const view = renderDay(week, 3);
      for (;;) {
        const next = screen.queryByRole("button", { name: NEXT_STEP });
        if (!next) break;
        fireEvent.click(next);
      }
      const region = screen.getByRole("region", { name: "The end of the lesson" });
      expect(document.activeElement, `${entry.label}: the focus sits on the region`).toBe(region);
      expect(scrollSpy.mock.calls.length, `${entry.label}: scroll_calls`).toBe(entry.scrolls ? 1 : 0);
      if (entry.scrolls) {
        scrolled += 1;
        expect(scrollSpy.mock.calls[0]![0], `${entry.label}: block nearest`).toEqual({ block: "nearest" });
        expect(scrollSpy.mock.contexts[0], `${entry.label}: the region scrolls`).toBe(region);
      }
      const onRegion = focusSpy.mock.contexts.map((instance, index) => ({ instance, options: focusSpy.mock.calls[index]?.[0] })).filter((call) => call.instance === region);
      expect(onRegion.length, `${entry.label}: one focus call on the region`).toBe(1);
      expect(onRegion[0]!.options?.preventScroll, `${entry.label}: preventScroll`).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
      expect(scrollSpy.mock.calls.length, `${entry.label}: a Thai toggle on the last screen scrolls no more`).toBe(entry.scrolls ? 1 : 0);
      view.unmount();
      rect.mockRestore();
      focusSpy.mockRestore();
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView;
    }
    Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    expect(scrolled, `scrolling_cases=${scrolled}: the positive controls scroll`).toBe(6);
  });

  it("scrolls once under StrictMode, and never on first render of a one-step day", () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollSpy });
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.getAttribute("aria-label") === "The end of the lesson" ? 5000 : 0;
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    try {
      const view = render(
        <StrictMode>
          <TeacherLessonFlow week={week} day={3} locale="en" mediaUrls={{}} />
        </StrictMode>,
      );
      for (;;) {
        const next = screen.queryByRole("button", { name: NEXT_STEP });
        if (!next) break;
        fireEvent.click(next);
      }
      expect(scrollSpy.mock.calls.length, "scroll_calls=1 under StrictMode").toBe(1);
      view.unmount();

      scrollSpy.mockClear();
      const one = structuredClone(week);
      const script = scriptOf(one, 1);
      script.steps = [script.steps[0]!];
      expectWeek(one, "the one-step clone");
      renderDay(one, 1);
      expect(screen.queryByRole("region", { name: "The end of the lesson" }), "the one-step day starts on its last screen").not.toBeNull();
      expect(scrollSpy.mock.calls.length, "a first render scrolls nothing even when the region is below the fold").toBe(0);
    } finally {
      rect.mockRestore();
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView;
    }
  });
});
