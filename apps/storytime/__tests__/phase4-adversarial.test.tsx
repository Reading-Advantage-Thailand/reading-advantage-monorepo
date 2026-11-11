// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekJson from "../content/l2/w01.json";
import w08Json from "../content/l2/w08.json";
import { TeacherLessonFlow } from "../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow";
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
