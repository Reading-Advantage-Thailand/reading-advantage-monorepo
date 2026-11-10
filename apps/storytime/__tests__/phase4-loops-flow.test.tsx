// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekJson from "../content/l2/w01.json";
import w08Json from "../content/l2/w08.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/**
 * The Red tests of the teacher loops in the lesson flow (plan task 4.6, spec AC-13.7 and
 * AC-13.8, test strategy P4.6).
 *
 * The shipped milestone week `apps/storytime/content/l2/w01.json` holds `approval.loops`
 * `draft`, so the shipped week shows no loop. The loop fields in the file are:
 *
 * | Field | Where | Labeled count |
 * |---|---|---|
 * | `soundLoop` | steps A1, A2, A3 | `soundloop_steps=3` |
 * | `blendDrill` | step A4 | `blenddrill_steps=1` |
 * | `sightWords` | steps A6 and D2 | `sightwords_steps=2` |
 * | `loopMinutes` | A1, A2, A3, A4, A6, C5, D2 | `loopminutes_steps=7` |
 * | `loopMinutes` not equal to `minutes` | A1 (4 to 5), A2 (4 to 5), A4 (5 to 4), A6 (4 to 3) | `loopminutes_differs=4` |
 * | `recall` | days 2 to 5, five cards each | `recall_days=4` |
 *
 * The measured `blendDrill` of A4 holds four words (net, nut, pen, sun) and `repeats` 3, so the
 * test names `drill_words=4`. The P4.6 table says five words; the shipped file is the truth, and
 * the plan evidence records the stale row.
 *
 * Contract for Green:
 *
 * 1. `apps/storytime/lib/teacher-loops.ts` exports:
 *    - `loopsShow(week): boolean`. It is true only when `loopsApproved(week)` is true and
 *      `meta.level` is 2, 3, or 4. It reuses `loopsApproved` of `lib/loops.ts`.
 *    - `stepTimeMinutes(step, loops): number`. It is `loopMinutes ?? minutes` when `loops` is
 *      true, and `minutes` otherwise. A `loopMinutes` of 0 gives 0, so it never uses `||`.
 *
 * 2. `TeacherLessonFlow` shows the loops only when `loopsShow(week)` is true:
 *    - The opening screen of a day with a recall holds a region with `data-recall-day={day}`. The
 *      region shows `recall.ask` and each `recall.items[].text`, and it holds one element with
 *      `data-recall-card` for each card.
 *    - A step that holds `soundLoop` holds a panel with `data-loop="sound-loop"` that shows
 *      `correct`, `practise`, and `retest` in the active language.
 *    - A step that holds `blendDrill` holds a panel with `data-loop="blend-drill"` that shows
 *      `model`, `lead`, `test`, `correction`, each word, each sound label, and the attribute
 *      `data-drill-repeats={repeats}`.
 *    - A step that holds `sightWords` holds a panel with `data-loop="sight-words"` that shows the
 *      words, `slide`, `check`, and the attribute `data-sight-seconds={seconds}`.
 *    - A panel sits inside the step section of the step that holds the field, so the app places a
 *      loop by the field and never by a step id. A review week shows only the recall and
 *      `loopMinutes`.
 *    - The step section shows the step time of `stepTimeMinutes` as `<n> min`.
 *
 * 3. A clip of a drill word or of a recall card shows a control with `data-clip-path={file}` and
 *    `data-clip-url={mediaUrls[file]}` only when the `mediaUrls` map holds the file. A clip with
 *    no map entry keeps its text and shows no control. The flow builds no URL of its own and
 *    calls no `HTMLMediaElement.play` on render.
 *
 * Every count is a labeled integer that the test parses (A3): `soundloop_steps`,
 * `blenddrill_steps`, `sightwords_steps`, `loopminutes_steps`, `loopminutes_differs`,
 * `recall_days`, `drill_words`, `drill_repeats`, `screens`, `loop_panels`, `recall_cards`,
 * `clip_controls`, and `play_calls`. A list is never empty before a detail is asserted (A4).
 * Each "shows nothing" case follows a positive control on an approved clone. The two cases that
 * pass at HEAD are named as characterizations. The test reads the shipped week and never a
 * fixture.
 */

/** The accessible name of the forward control of the lesson flow. */
const NEXT_STEP = "Next step";

/** The accessible name of the Thai toggle of the lesson flow. */
const THAI_TOGGLE = "ไทย";

/** The five days of the week contract. */
const DAYS = [1, 2, 3, 4, 5] as const;

/** The three loop panels of the task. */
const LOOP_KINDS = ["sound-loop", "blend-drill", "sight-words"] as const;

/** The kind of a loop panel. */
type LoopKind = (typeof LOOP_KINDS)[number];

/** The shipped milestone week, parsed with the app contract. */
const week: StorytimeWeek = weekSchema.parse(weekJson) as StorytimeWeek;

/** The shipped review week, parsed with the app contract. */
const reviewWeek: StorytimeWeek = weekSchema.parse(w08Json) as StorytimeWeek;

/** One step of a lesson day. */
type LessonStep = StorytimeWeek["scripts"][number]["steps"][number];

/** One lesson day. */
type LessonScript = StorytimeWeek["scripts"][number];

/** The recall of one lesson day. */
type Recall = NonNullable<LessonScript["recall"]>;

/** The props of the lesson flow of Green. */
interface LessonFlowProps {
  /** The week of the lesson day. */
  week: StorytimeWeek;
  /** The lesson day, 1 to 5. */
  day: number;
  /** The locale segment of the route. */
  locale: string;
  /** The signed media URL of each file name. */
  mediaUrls?: Record<string, string>;
}

/** The rule module that Green must add. */
interface LoopsRule {
  /** Reports whether the loops show for a week. */
  loopsShow: (source: unknown) => boolean;
  /** Returns the step minutes of the week state. */
  stepTimeMinutes: (step: LessonStep, loops: boolean) => number;
}

/** One rendered screen of a lesson day. */
interface ScreenState {
  /** The lesson day. */
  day: number;
  /** The 0-based place of the screen. */
  index: number;
  /** The step of the screen. */
  step: LessonStep;
  /** The step id on screen. */
  stepId: string;
  /** The step section. */
  node: HTMLElement;
  /** The text of the step section. */
  text: string;
  /** The text of the whole flow. */
  containerText: string;
  /** The number of loop panels of the screen. */
  loopCount: number;
  /** The day of the recall region, or `null` when the screen holds none. */
  recallDay: string | null;
  /** The number of recall cards of the screen. */
  recallCards: number;
}

/**
 * Fails with a named assertion when the week fails the app contract (A4).
 * @param candidate The value that must parse as a week.
 * @param label The name of the case.
 */
function expectWeek(candidate: unknown, label: string): asserts candidate is StorytimeWeek {
  const parsed = weekSchema.safeParse(candidate);
  const detail = parsed.success
    ? ""
    : parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
  expect(
    parsed.success,
    `${label}: the week must pass weekSchema before it renders (A4). ${detail}`,
  ).toBe(true);
  if (!parsed.success) throw new Error(`${label}: the week fails weekSchema. ${detail}`);
}

/** Returns the script of one day, with a named guard for a missing day. */
function scriptOf(source: StorytimeWeek, day: number): LessonScript {
  const script = source.scripts.find((entry) => entry.day === day);
  expect(script, `the week must hold the lesson of day ${day}`).toBeDefined();
  if (!script) throw new Error(`the week holds no lesson for day ${day}`);
  expect(
    script.steps.length,
    `day=${day} steps=${script.steps.length}: every day must hold at least one step`,
  ).toBeGreaterThan(0);
  return script;
}

/** Returns the step of one day, with a named guard for a missing step. */
function stepOf(source: StorytimeWeek, day: number, stepId: string): LessonStep {
  const step = scriptOf(source, day).steps.find((entry) => entry.id === stepId);
  expect(step, `day=${day}: the week must hold the step ${stepId}`).toBeDefined();
  if (!step) throw new Error(`day=${day} holds no step ${stepId}`);
  return step;
}

/** Returns the recall of one day, with a named guard for a missing recall. */
function recallOf(source: StorytimeWeek, day: number): Recall {
  const recall = scriptOf(source, day).recall;
  expect(recall, `day=${day}: the week must hold a recall for the recall case`).toBeDefined();
  if (!recall) throw new Error(`day=${day} holds no recall`);
  return recall;
}

/** Returns the sound loop of one step, with a named guard. */
function soundLoopOf(source: StorytimeWeek, day: number, stepId: string) {
  const loop = stepOf(source, day, stepId).soundLoop;
  expect(loop, `day=${day} step=${stepId}: the week must hold a soundLoop`).toBeDefined();
  if (!loop) throw new Error(`day=${day} step=${stepId} holds no soundLoop`);
  return loop;
}

/** Returns the blend drill of one step, with a named guard. */
function blendDrillOf(source: StorytimeWeek, day: number, stepId: string) {
  const drill = stepOf(source, day, stepId).blendDrill;
  expect(drill, `day=${day} step=${stepId}: the week must hold a blendDrill`).toBeDefined();
  if (!drill) throw new Error(`day=${day} step=${stepId} holds no blendDrill`);
  return drill;
}

/** Returns the sight words of one step, with a named guard. */
function sightWordsOf(source: StorytimeWeek, day: number, stepId: string) {
  const card = stepOf(source, day, stepId).sightWords;
  expect(card, `day=${day} step=${stepId}: the week must hold a sightWords card`).toBeDefined();
  if (!card) throw new Error(`day=${day} step=${stepId} holds no sightWords card`);
  return card;
}

/** Deep-clones a week and approves the loops part, then checks the contract (A4). */
function approvedClone(source: StorytimeWeek = week): StorytimeWeek {
  const copy = structuredClone(source);
  copy.approval = {
    ...(copy.approval ?? {}),
    loops: { status: "approved", date: "2026-11-10", words: "test clone" },
  };
  expectWeek(copy, "the approved clone");
  return copy;
}

/** Deep-clones an approved week and sets its level, then checks the contract (A4). */
function levelClone(level: 1 | 2 | 3 | 4): StorytimeWeek {
  const copy = approvedClone();
  copy.meta.level = level;
  copy.meta.key = `st${level}/1`;
  expectWeek(copy, `the approved level ${level} clone`);
  return copy;
}

/** Deep-clones a week and removes every loop field of both the steps and the days. */
function withoutLoopFields(source: StorytimeWeek): StorytimeWeek {
  const copy = structuredClone(source);
  for (const script of copy.scripts) {
    delete script.recall;
    for (const step of script.steps) {
      delete step.soundLoop;
      delete step.blendDrill;
      delete step.sightWords;
      delete step.loopMinutes;
    }
  }
  return copy;
}

/** Builds the signed URL map of every bank clip of a week. */
function mediaUrlsFor(source: StorytimeWeek): Record<string, string> {
  const urls: Record<string, string> = {};
  let next = 0;
  const assign = (file: string) => {
    if (urls[file] !== undefined) return;
    next += 1;
    urls[file] = `https://signed.example/m/${next}`;
  };
  for (const script of source.scripts) {
    for (const step of script.steps) {
      for (const word of step.blendDrill?.words ?? []) {
        for (const file of word.audio ?? []) {
          assign(file);
        }
      }
    }
    for (const card of script.recall?.items ?? []) {
      if (card.audio) assign(card.audio);
    }
  }
  return urls;
}

/** Lists the bank clips of one step, in the order of the week. */
function clipsOf(step: LessonStep): string[] {
  return (step.blendDrill?.words ?? []).flatMap((word) => word.audio ?? []);
}

/** Loads the lesson flow and fails with a named assertion when the export is absent. */
async function loadLessonFlow(): Promise<ComponentType<LessonFlowProps>> {
  const modulePath = "../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow";
  let module: Record<string, unknown>;
  try {
    module = (await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>;
  } catch (error) {
    expect(
      error,
      "Storytime must load app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx exporting TeacherLessonFlow",
    ).toBeUndefined();
    throw error;
  }
  const flow = module.TeacherLessonFlow;
  expect(
    typeof flow,
    "the day module must export TeacherLessonFlow for the teacher loops",
  ).toBe("function");
  return flow as ComponentType<LessonFlowProps>;
}

/** Loads the loops rule and fails with a named assertion when the module is absent. */
async function loadLoopsRule(): Promise<LoopsRule> {
  const modulePath = "../lib/teacher-loops";
  let module: Record<string, unknown>;
  try {
    module = (await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>;
  } catch (error) {
    expect(
      error,
      "Storytime must add lib/teacher-loops.ts exporting loopsShow and stepTimeMinutes",
    ).toBeUndefined();
    throw error;
  }
  expect(
    typeof module.loopsShow,
    "lib/teacher-loops.ts must export loopsShow(week): boolean",
  ).toBe("function");
  expect(
    typeof module.stepTimeMinutes,
    "lib/teacher-loops.ts must export stepTimeMinutes(step, loops): number",
  ).toBe("function");
  return {
    loopsShow: module.loopsShow as LoopsRule["loopsShow"],
    stepTimeMinutes: module.stepTimeMinutes as LoopsRule["stepTimeMinutes"],
  };
}

/**
 * Renders one day and walks every screen.
 * @param day The lesson day.
 * @param source The week.
 * @param options The Thai toggle and the signed URL map.
 * @returns The state of each screen, in order.
 */
async function walkDay(
  day: number,
  source: StorytimeWeek,
  options: { thai?: boolean; mediaUrls?: Record<string, string> } = {},
): Promise<ScreenState[]> {
  const script = scriptOf(source, day);
  const TeacherLessonFlow = await loadLessonFlow();
  const { container, unmount } = render(
    <TeacherLessonFlow
      week={source}
      day={day}
      locale="en"
      mediaUrls={options.mediaUrls ?? mediaUrlsFor(source)}
    />,
  );
  if (options.thai) fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));

  const screens: ScreenState[] = [];
  for (let index = 0; index < script.steps.length; index += 1) {
    const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-step-id]"));
    expect(
      nodes.length,
      `day=${day} index=${index} steps=${script.steps.length}: the flow must show one step section for each screen`,
    ).toBe(1);
    const node = nodes[0]!;
    const recallDay = container.querySelector("[data-recall-day]");
    screens.push({
      day,
      index,
      step: script.steps[index]!,
      stepId: node.dataset.stepId ?? "",
      node,
      text: node.textContent ?? "",
      containerText: container.textContent ?? "",
      loopCount: node.querySelectorAll("[data-loop]").length,
      recallDay: recallDay?.getAttribute("data-recall-day") ?? null,
      recallCards: container.querySelectorAll("[data-recall-card]").length,
    });
    if (index < script.steps.length - 1) {
      fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    }
  }
  unmount();
  expect(
    screens.length,
    `day=${day} screens=${screens.length}: the flow must show at least one screen`,
  ).toBeGreaterThan(0);
  return screens;
}

/** Returns the screen of one step, with a named guard. */
function screenAt(screens: ScreenState[], stepId: string): ScreenState {
  const found = screens.find((entry) => entry.stepId === stepId);
  expect(found, `the day must show a screen for the step ${stepId}`).toBeDefined();
  if (!found) throw new Error(`no screen for the step ${stepId}`);
  return found;
}

/** Counts the loop panels of a screen list. */
function loopPanels(screens: ScreenState[]): number {
  return screens.reduce((sum, entry) => sum + entry.loopCount, 0);
}

/** Returns one loop panel of a step section, with a named guard. */
function panelOf(node: HTMLElement, kind: LoopKind, place: string): HTMLElement {
  const panel = node.querySelector<HTMLElement>(`[data-loop="${kind}"]`);
  expect(panel, `${place}: the flow must render the ${kind} panel of the step`).not.toBeNull();
  if (!panel) throw new Error(`${place}: no ${kind} panel`);
  return panel;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Phase 4 teacher loops in the lesson flow (AC-13.7, AC-13.8)", () => {
  it("measures the loop fields of the shipped w01 (characterization: passes at HEAD; a Workbooks edit moves a count)", () => {
    const steps = week.scripts.flatMap((script) => script.steps);
    const counts = {
      soundloop_steps: steps.filter((step) => step.soundLoop !== undefined).length,
      blenddrill_steps: steps.filter((step) => step.blendDrill !== undefined).length,
      sightwords_steps: steps.filter((step) => step.sightWords !== undefined).length,
      loopminutes_steps: steps.filter((step) => step.loopMinutes !== undefined).length,
      loopminutes_differs: steps.filter(
        (step) => step.loopMinutes !== undefined && step.loopMinutes !== step.minutes,
      ).length,
      recall_days: week.scripts.filter((script) => script.recall !== undefined).length,
    };
    const report = Object.entries(counts)
      .map(([name, value]) => `${name}=${value}`)
      .join(" ");
    expect(
      report,
      "the measured counts of w01 must stay the counts that the loop cases rely on",
    ).toBe(
      "soundloop_steps=3 blenddrill_steps=1 sightwords_steps=2 loopminutes_steps=7 loopminutes_differs=4 recall_days=4",
    );

    for (const script of week.scripts) {
      if (!script.recall) continue;
      expect(
        script.recall.items.length,
        `day=${script.day} recall_cards=${script.recall.items.length}: every recall of the shipped week holds five cards`,
      ).toBe(5);
    }
    expect(
      counts.soundloop_steps + counts.blenddrill_steps + counts.sightwords_steps,
      `loop_steps=${counts.soundloop_steps + counts.blenddrill_steps + counts.sightwords_steps}: the shipped week must hold loop steps for the approved cases`,
    ).toBeGreaterThan(0);
  });

  it("shows no loop and the step minutes on the shipped draft week (characterization: passes at HEAD)", async () => {
    const total = week.scripts.reduce((sum, script) => sum + script.steps.length, 0);
    expect(total, `total_steps=${total}: the shipped week must hold steps`).toBeGreaterThan(0);

    const screens: ScreenState[] = [];
    for (const day of DAYS) screens.push(...(await walkDay(day, week)));
    expect(
      screens.length,
      `screens=${screens.length}: the draft walk must cover every step of the five days`,
    ).toBe(total);

    for (const entry of screens) {
      const place = `day=${entry.day} screen=${entry.index + 1}/${scriptOf(week, entry.day).steps.length} (${entry.step.id})`;
      expect(entry.stepId, `${place}: the screen must show the step id`).toBe(entry.step.id);
      expect(
        entry.loopCount,
        `${place}: the draft week must show no loop panel, and it shows ${entry.loopCount}`,
      ).toBe(0);
      expect(
        entry.recallDay,
        `${place}: the draft week must show no recall, and it shows day ${entry.recallDay}`,
      ).toBeNull();
      expect(
        entry.text,
        `${place}: the draft step must show the step time ${entry.step.minutes} min`,
      ).toContain(`${entry.step.minutes} min`);
    }
  });

  it("shows no loop when approval.loops is absent, with the approved clone as the control", async () => {
    const approved = approvedClone();
    const control = await walkDay(1, approved);
    expect(
      `control_loop_panels=${loopPanels(control)}`,
      "the approved clone must show the loop panels before the absent part hides them",
    ).toBe("control_loop_panels=5");

    const absent = approvedClone();
    const approval = absent.approval;
    expect(approval, "the approved clone must hold an approval object").toBeDefined();
    delete approval!.loops;
    expectWeek(absent, "the clone with no approval.loops");

    const screens = await walkDay(1, absent);
    for (const entry of screens) {
      expect(
        entry.loopCount,
        `day=1 step=${entry.step.id}: a missing approval.loops must show no loop panel`,
      ).toBe(0);
      expect(
        entry.text,
        `day=1 step=${entry.step.id}: a missing approval.loops must show the step time ${entry.step.minutes} min`,
      ).toContain(`${entry.step.minutes} min`);
    }
  });

  it("shows no loop when an approved week holds no loop field", async () => {
    const approved = approvedClone();
    const control = await walkDay(1, approved);
    expect(
      `control_loop_panels=${loopPanels(control)}`,
      "the approved clone must show the loop panels before the empty clone hides them",
    ).toBe("control_loop_panels=5");
    const controlRecall = await walkDay(2, approved);
    expect(
      controlRecall[0]!.recallDay,
      "the approved clone must show the recall of day 2 before the empty clone hides it",
    ).toBe("2");

    const empty = withoutLoopFields(approved);
    expectWeek(empty, "the approved clone with no loop field");

    const dayOne = await walkDay(1, empty);
    for (const entry of dayOne) {
      expect(
        entry.loopCount,
        `day=1 step=${entry.step.id}: an approved week with no loop field must show no loop panel`,
      ).toBe(0);
      expect(
        entry.text,
        `day=1 step=${entry.step.id}: an approved week with no loopMinutes must show ${entry.step.minutes} min`,
      ).toContain(`${entry.step.minutes} min`);
    }
    const dayTwo = await walkDay(2, empty);
    for (const entry of dayTwo) {
      expect(
        entry.recallDay,
        `day=2 screen=${entry.index + 1}: an approved week with no recall must show no recall`,
      ).toBeNull();
    }
  });

  it("shows no loop on an approved level 1 week, with the level 2 clone as the control", async () => {
    const rule = await loadLoopsRule();
    const level2 = levelClone(2);
    expect(rule.loopsShow(level2), "loopsShow must be true for an approved level 2 week").toBe(
      true,
    );
    const control = await walkDay(1, level2);
    expect(
      `control_loop_panels=${loopPanels(control)}`,
      "the approved level 2 clone must show the loop panels before the level rule hides them",
    ).toBe("control_loop_panels=5");

    const level1 = levelClone(1);
    expect(
      rule.loopsShow(level1),
      "loopsShow must be false for an approved level 1 week (AC-13.8)",
    ).toBe(false);

    const dayOne = await walkDay(1, level1);
    for (const entry of dayOne) {
      expect(
        entry.loopCount,
        `level=1 step=${entry.step.id}: an approved level 1 week must show no loop panel`,
      ).toBe(0);
      expect(
        entry.text,
        `level=1 step=${entry.step.id}: an approved level 1 week must show ${entry.step.minutes} min`,
      ).toContain(`${entry.step.minutes} min`);
    }
    const dayTwo = await walkDay(2, level1);
    for (const entry of dayTwo) {
      expect(
        entry.recallDay,
        `level=1 day=2 screen=${entry.index + 1}: an approved level 1 week must show no recall`,
      ).toBeNull();
    }
  });

  it("shows the loops on the approved clones at levels 2, 3, and 4", async () => {
    const rule = await loadLoopsRule();
    for (const level of [2, 3, 4] as const) {
      const clone = levelClone(level);
      expect(rule.loopsShow(clone), `loopsShow must be true at level ${level}`).toBe(true);

      const dayOne = await walkDay(1, clone);
      expect(
        `level=${level} loop_panels=${loopPanels(dayOne)}`,
        `the approved level ${level} clone must show the five panels of day 1`,
      ).toBe(`level=${level} loop_panels=5`);

      const dayTwo = await walkDay(2, clone);
      expect(
        `level=${level} recall_day=${dayTwo[0]!.recallDay}`,
        `the approved level ${level} clone must show the recall of day 2`,
      ).toBe(`level=${level} recall_day=2`);
    }
  });

  it("shows the recall in the opening screen of days 2 to 5 only", async () => {
    const approved = approvedClone();
    const recallDays = approved.scripts.filter((script) => script.recall !== undefined).length;
    expect(`recall_days=${recallDays}`, "the approved clone must hold four recall days").toBe(
      "recall_days=4",
    );

    const dayTwo = await walkDay(2, approved);
    const opening = dayTwo[0]!;
    expect(
      `day=2 recall_day=${opening.recallDay}`,
      "the opening screen of day 2 must show the recall region",
    ).toBe("day=2 recall_day=2");
    const recall = recallOf(approved, 2);
    expect(
      opening.containerText,
      "the recall region must show the ask text of the day",
    ).toContain(recall.ask.en);
    expect(
      `day=2 recall_cards=${opening.recallCards}`,
      "the recall region must show one card for each of the five cards",
    ).toBe("day=2 recall_cards=5");
    expect(
      dayTwo[1]!.recallDay,
      "the recall must not show on the second screen of the day",
    ).toBeNull();

    const dayOne = await walkDay(1, approved);
    expect(
      dayOne[0]!.recallDay,
      "day 1 of the shipped week holds no recall, so its opening must show none",
    ).toBeNull();

    for (const day of [3, 4, 5] as const) {
      const screens = await walkDay(day, approved);
      expect(
        screens[0]!.recallDay,
        `day=${day}: the opening screen must show the recall of the day`,
      ).toBe(String(day));
    }
  });

  it("shows a day 1 recall that the approved week holds", async () => {
    const copy = approvedClone();
    const dayTwoRecall = structuredClone(recallOf(copy, 2));
    scriptOf(copy, 1).recall = dayTwoRecall;
    expectWeek(copy, "the clone with a day 1 recall");

    const screens = await walkDay(1, copy);
    const opening = screens[0]!;
    expect(
      `day=1 recall_day=${opening.recallDay}`,
      "the app must show the recall that an approved day 1 script holds",
    ).toBe("day=1 recall_day=1");
    expect(
      opening.containerText,
      "the day 1 recall must show the ask text from the week data",
    ).toContain(dayTwoRecall.ask.en);
    expect(
      `day=1 recall_cards=${opening.recallCards}`,
      "the day 1 recall must show one card for each of the five cards",
    ).toBe("day=1 recall_cards=5");
  });

  it("shows the sound loop on the steps that hold it and nowhere else", async () => {
    const approved = approvedClone();
    const count = approved.scripts
      .flatMap((script) => script.steps)
      .filter((step) => step.soundLoop !== undefined).length;
    expect(`soundloop_steps=${count}`, "the approved clone must hold three sound loops").toBe(
      "soundloop_steps=3",
    );

    const screens = await walkDay(1, approved);
    expect(
      `day=1 soundloop_screens=${screens.filter((entry) => entry.step.soundLoop).length}`,
      "day 1 must hold the sound loop on A1, A2, and A3",
    ).toBe("day=1 soundloop_screens=3");

    for (const entry of screens) {
      const panel = entry.node.querySelector<HTMLElement>('[data-loop="sound-loop"]');
      const loop = entry.step.soundLoop;
      if (!loop) {
        expect(
          panel,
          `step=${entry.step.id}: a step with no soundLoop must show no sound loop panel`,
        ).toBeNull();
        continue;
      }
      expect(
        panel,
        `step=${entry.step.id}: a step with a soundLoop must show the sound loop panel`,
      ).not.toBeNull();
      for (const line of [loop.correct.en, loop.practise.en, loop.retest.en]) {
        expect(
          entry.text,
          `step=${entry.step.id}: the sound loop must show the line ${line}`,
        ).toContain(line);
      }
    }
  });

  it("shows the blend drill of A4 with the model, lead, test, correction, repeats, and words", async () => {
    const approved = approvedClone();
    const count = approved.scripts
      .flatMap((script) => script.steps)
      .filter((step) => step.blendDrill !== undefined).length;
    expect(`blenddrill_steps=${count}`, "the approved clone must hold one blend drill").toBe(
      "blenddrill_steps=1",
    );

    const step = stepOf(approved, 1, "A4");
    const drill = blendDrillOf(approved, 1, "A4");
    expect(
      `drill_words=${drill.words.length}`,
      "the shipped A4 blend drill must hold four words",
    ).toBe("drill_words=4");
    expect(
      `drill_repeats=${drill.repeats}`,
      "the shipped A4 blend drill must hold the repeats value",
    ).toBe("drill_repeats=3");

    const screens = await walkDay(1, approved);
    const target = screenAt(screens, "A4");
    const panel = panelOf(target.node, "blend-drill", "day=1 step=A4");
    expect(
      panel.getAttribute("data-drill-repeats"),
      `day=1 step=A4: the blend drill must carry the repeats value ${drill.repeats}`,
    ).toBe(String(drill.repeats));
    for (const line of [drill.model.en, drill.lead.en, drill.test.en, drill.correction.en]) {
      expect(target.text, `day=1 step=A4: the blend drill must show the line ${line}`).toContain(
        line,
      );
    }
    for (const word of drill.words) {
      expect(
        target.text,
        `day=1 step=A4: the blend drill must show the word ${word.word}`,
      ).toContain(word.word);
      for (const sound of word.sounds) {
        expect(
          target.text,
          `day=1 step=A4: the blend drill must show the sound label ${sound}`,
        ).toContain(sound);
      }
    }
    expect(
      target.step.blendDrill,
      "the A4 step of the walk must hold the blend drill",
    ).toBeDefined();
    expect(step.id, "the blend drill case must read the step A4").toBe("A4");
    expect(
      screens.filter((entry) => entry.node.querySelector('[data-loop="blend-drill"]')).length,
      "day 1 must show the blend drill panel on one screen only",
    ).toBe(1);
  });

  it("shows the sight words card on A6 and on D2", async () => {
    const approved = approvedClone();
    const count = approved.scripts
      .flatMap((script) => script.steps)
      .filter((step) => step.sightWords !== undefined).length;
    expect(`sightwords_steps=${count}`, "the approved clone must hold two sight word cards").toBe(
      "sightwords_steps=2",
    );

    const dayOne = await walkDay(1, approved);
    const a6 = screenAt(dayOne, "A6");
    const card = sightWordsOf(approved, 1, "A6");
    const a6Panel = panelOf(a6.node, "sight-words", "day=1 step=A6");
    expect(
      a6Panel.getAttribute("data-sight-seconds"),
      `day=1 step=A6: the sight words card must carry the seconds value ${card.seconds}`,
    ).toBe(String(card.seconds));
    expect(a6.text, "day=1 step=A6: the sight words card must show the slide line").toContain(
      card.slide.en,
    );
    expect(a6.text, "day=1 step=A6: the sight words card must show the check line").toContain(
      card.check.en,
    );
    for (const word of card.words) {
      expect(a6.text, `day=1 step=A6: the sight words card must show the word ${word}`).toContain(
        word,
      );
    }

    const dayFour = await walkDay(4, approved);
    const d2 = screenAt(dayFour, "D2");
    const d2Card = sightWordsOf(approved, 4, "D2");
    const d2Panel = panelOf(d2.node, "sight-words", "day=4 step=D2");
    expect(
      d2Panel.getAttribute("data-sight-seconds"),
      `day=4 step=D2: the sight words card must carry the seconds value ${d2Card.seconds}`,
    ).toBe(String(d2Card.seconds));
    expect(d2.text, "day=4 step=D2: the sight words card must show the check line").toContain(
      d2Card.check.en,
    );
    expect(
      dayOne.filter((entry) => entry.node.querySelector('[data-loop="sight-words"]')).length,
      "day 1 must show the sight words card on one screen only",
    ).toBe(1);
  });

  it("places a loop by the field and never by a step id", async () => {
    const copy = approvedClone();
    const a4 = stepOf(copy, 1, "A4");
    const a5 = stepOf(copy, 1, "A5");
    const drill = a4.blendDrill;
    expect(drill, "the shipped A4 must hold the blend drill that the case moves").toBeDefined();
    delete a4.blendDrill;
    a5.blendDrill = structuredClone(drill!);
    const b2 = stepOf(copy, 2, "B2");
    b2.soundLoop = structuredClone(soundLoopOf(copy, 1, "A1"));
    expectWeek(copy, "the clone with the moved and added loops");

    const dayOne = await walkDay(1, copy);
    expect(
      screenAt(dayOne, "A4").node.querySelector('[data-loop="blend-drill"]'),
      "a step with no blendDrill must show no blend drill panel",
    ).toBeNull();
    const a5Screen = screenAt(dayOne, "A5");
    expect(
      a5Screen.node.querySelector('[data-loop="blend-drill"]'),
      "the blend drill must show on A5 after the field moves there",
    ).not.toBeNull();
    expect(
      a5Screen.text,
      "the blend drill on A5 must show a word from the week data",
    ).toContain(drill!.words[0]!.word);

    const dayTwo = await walkDay(2, copy);
    expect(
      screenAt(dayTwo, "B2").node.querySelector('[data-loop="sound-loop"]'),
      "a soundLoop added to B2 must show on B2",
    ).not.toBeNull();
  });

  it("shows the step time loopMinutes ?? minutes, and the minutes when the loops are off", async () => {
    const rule = await loadLoopsRule();
    const approved = approvedClone();
    const differs = approved.scripts
      .flatMap((script) => script.steps)
      .filter((step) => step.loopMinutes !== undefined && step.loopMinutes !== step.minutes).length;
    expect(
      `loopminutes_differs=${differs}`,
      "the approved clone must hold four steps whose loopMinutes differs from minutes",
    ).toBe("loopminutes_differs=4");

    const a1 = stepOf(approved, 1, "A1");
    const a4 = stepOf(approved, 1, "A4");
    const a5 = stepOf(approved, 1, "A5");
    expect(
      rule.stepTimeMinutes(a1, true),
      "stepTimeMinutes must return loopMinutes 5 on A1 when the loops show",
    ).toBe(5);
    expect(
      rule.stepTimeMinutes(a1, false),
      "stepTimeMinutes must return minutes 4 on A1 when the loops are off",
    ).toBe(4);
    expect(
      rule.stepTimeMinutes(a4, true),
      "stepTimeMinutes must return loopMinutes 4 on A4 when the loops show",
    ).toBe(4);
    expect(
      rule.stepTimeMinutes(a5, true),
      "stepTimeMinutes must return minutes 2 on A5 when the step holds no loopMinutes",
    ).toBe(2);

    const approvedDay = await walkDay(1, approved);
    const a1Screen = screenAt(approvedDay, "A1");
    expect(
      a1Screen.text,
      "the approved A1 must show the step time 5 min and not 4 min",
    ).toContain("5 min");
    expect(
      a1Screen.text,
      "the approved A1 must not show the step time 4 min",
    ).not.toContain("4 min");
    const a4Screen = screenAt(approvedDay, "A4");
    expect(
      a4Screen.text,
      "the approved A4 must show the step time 4 min and not 5 min",
    ).toContain("4 min");
    expect(
      a4Screen.text,
      "the approved A4 must not show the step time 5 min",
    ).not.toContain("5 min");
    expect(
      screenAt(approvedDay, "A5").text,
      "the approved A5 must show its minutes 2 min",
    ).toContain("2 min");

    const draftDay = await walkDay(1, week);
    expect(
      screenAt(draftDay, "A1").text,
      "the draft A1 must show its minutes 4 min",
    ).toContain("4 min");
    expect(
      screenAt(draftDay, "A1").text,
      "the draft A1 must not show the loopMinutes 5 min",
    ).not.toContain("5 min");
  });

  it("shows 0 min for a loopMinutes of 0", async () => {
    const copy = approvedClone();
    stepOf(copy, 1, "A5").loopMinutes = 0;
    expectWeek(copy, "the clone with loopMinutes 0 on A5");

    const rule = await loadLoopsRule();
    expect(
      rule.stepTimeMinutes(stepOf(copy, 1, "A5"), true),
      "stepTimeMinutes must return 0 on a loopMinutes of 0, so the code never uses ||",
    ).toBe(0);

    const screens = await walkDay(1, copy);
    const a5 = screenAt(screens, "A5");
    expect(a5.text, "a loopMinutes of 0 on A5 must show 0 min").toContain("0 min");
    expect(
      a5.text,
      "a loopMinutes of 0 on A5 must not fall back to the minutes 2 min",
    ).not.toContain("2 min");
  });

  it("shows only the recall and loopMinutes on an approved review week", async () => {
    const copy = approvedClone(reviewWeek);
    stepOf(copy, 1, "A1").loopMinutes = 9;
    stepOf(copy, 1, "A2").soundLoop = structuredClone(soundLoopOf(week, 1, "A1"));
    stepOf(copy, 1, "A2").blendDrill = structuredClone(blendDrillOf(week, 1, "A4"));
    stepOf(copy, 1, "A2").sightWords = structuredClone(sightWordsOf(week, 1, "A6"));
    expectWeek(copy, "the approved w08 clone with one loopMinutes and three extra loops");
    expect(
      "w08_loopminutes_added=1",
      "the review case adds one loopMinutes to the review week",
    ).toBe("w08_loopminutes_added=1");

    let panelTotal = 0;
    let recallTotal = 0;
    for (const day of DAYS) {
      const screens = await walkDay(day, copy);
      panelTotal += loopPanels(screens);
      expect(
        screens[0]!.recallDay,
        `day=${day}: the approved review week must show the recall of the day`,
      ).toBe(String(day));
      recallTotal += 1;
      if (day === 1) {
        const a1 = screenAt(screens, "A1");
        expect(a1.text, "the review A1 must show the added loopMinutes 9 min").toContain("9 min");
        expect(
          a1.text,
          "the review A1 must not show the step minutes 10 min",
        ).not.toContain("10 min");
      }
    }
    expect(
      `recall_days=${recallTotal}`,
      "an approved review week must show a recall on each of the five days",
    ).toBe("recall_days=5");
    expect(
      `review_loop_panels=${panelTotal}`,
      "an approved review week must show no sound loop, blend drill, or sight words panel",
    ).toBe("review_loop_panels=0");
  });

  it("shows the th text of the loop fields and keeps the en text when th is empty", async () => {
    const approved = approvedClone();
    const sound = soundLoopOf(approved, 1, "A1");
    const drill = blendDrillOf(approved, 1, "A4");
    const card = sightWordsOf(approved, 1, "A6");
    const recall = recallOf(approved, 2);
    expect(
      sound.correct.th.trim().length,
      "the shipped soundLoop must hold a th text for the Thai case",
    ).toBeGreaterThan(0);
    expect(
      drill.model.th.trim().length,
      "the shipped blendDrill must hold a th text for the Thai case",
    ).toBeGreaterThan(0);
    expect(
      card.check.th.trim().length,
      "the shipped sightWords must hold a th text for the Thai case",
    ).toBeGreaterThan(0);
    expect(
      recall.ask.th.trim().length,
      "the shipped recall must hold a th text for the Thai case",
    ).toBeGreaterThan(0);

    const dayOne = await walkDay(1, approved, { thai: true });
    const a1 = screenAt(dayOne, "A1");
    for (const line of [sound.correct.th, sound.practise.th, sound.retest.th]) {
      expect(a1.text, `day=1 step=A1: the Thai toggle must show the th line ${line}`).toContain(
        line,
      );
    }
    const a4 = screenAt(dayOne, "A4");
    for (const line of [drill.model.th, drill.lead.th, drill.test.th, drill.correction.th]) {
      expect(a4.text, `day=1 step=A4: the Thai toggle must show the th line ${line}`).toContain(
        line,
      );
    }
    const a6 = screenAt(dayOne, "A6");
    for (const line of [card.slide.th, card.check.th]) {
      expect(a6.text, `day=1 step=A6: the Thai toggle must show the th line ${line}`).toContain(
        line,
      );
    }

    const dayTwo = await walkDay(2, approved, { thai: true });
    expect(
      dayTwo[0]!.containerText,
      "day=2: the Thai toggle must show the th ask text of the recall",
    ).toContain(recall.ask.th);

    const emptyThai = approvedClone();
    const emptyLoop = soundLoopOf(emptyThai, 1, "A1");
    emptyLoop.correct.th = "";
    expectWeek(emptyThai, "the clone with an empty th sound loop line");
    const emptyDay = await walkDay(1, emptyThai, { thai: true });
    expect(
      screenAt(emptyDay, "A1").text,
      "a loop field with an empty th must keep its en text",
    ).toContain(emptyLoop.correct.en);
  });

  it("plays the bank clips from the signed map only and never autoplays", async () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());
    const approved = approvedClone();
    const urls = mediaUrlsFor(approved);
    const drill = blendDrillOf(approved, 1, "A4");
    const expectedClips = clipsOf(stepOf(approved, 1, "A4"));
    expect(
      `drill_clips=${expectedClips.length}`,
      "the A4 drill must hold the bank clips of the four words",
    ).toBe("drill_clips=12");

    const dayOne = await walkDay(1, approved, { mediaUrls: urls });
    const a4 = screenAt(dayOne, "A4");
    const panel = panelOf(a4.node, "blend-drill", "day=1 step=A4");
    const controls = Array.from(panel.querySelectorAll<HTMLElement>("[data-clip-path]"));
    expect(
      `clip_controls=${controls.length}`,
      "the drill must show one clip control for each signed clip",
    ).toBe(`clip_controls=${expectedClips.length}`);
    for (const control of controls) {
      const path = control.dataset.clipPath ?? "";
      expect(
        urls[path],
        `day=1 step=A4: the clip ${path} must come from the signed map`,
      ).toBeDefined();
      expect(
        control.dataset.clipUrl,
        `day=1 step=A4: the clip ${path} must use the signed URL of the map`,
      ).toBe(urls[path]);
      expect(
        control.dataset.clipUrl ?? "",
        `day=1 step=A4: the clip ${path} must not carry the raw bank path`,
      ).not.toContain("phonemes/daniel/");
    }
    for (const element of Array.from(panel.querySelectorAll<HTMLElement>("[src]"))) {
      expect(
        element.getAttribute("src") ?? "",
        "no src of the drill may carry a raw bank path",
      ).not.toContain("phonemes/daniel/");
    }
    expect(
      `play_calls=${playSpy.mock.calls.length}`,
      "the flow must not autoplay a bank clip on render (AC-8.1)",
    ).toBe("play_calls=0");

    const missing = approvedClone();
    const missingUrls = mediaUrlsFor(missing);
    const missingClip = clipsOf(stepOf(missing, 1, "A4"))[0]!;
    expect(drill.words[0]!.audio?.[0], "the first clip of the drill must exist").toBe(missingClip);
    delete missingUrls[missingClip];
    const missingDay = await walkDay(1, missing, { mediaUrls: missingUrls });
    const missingPanel = panelOf(
      screenAt(missingDay, "A4").node,
      "blend-drill",
      "day=1 step=A4 missing clip",
    );
    const missingControls = Array.from(
      missingPanel.querySelectorAll<HTMLElement>("[data-clip-path]"),
    );
    expect(
      `clip_controls=${missingControls.length}`,
      "a clip with no signed URL must show no clip control",
    ).toBe(`clip_controls=${expectedClips.length - 1}`);
    expect(
      missingControls.some((control) => control.dataset.clipPath === missingClip),
      `the clip ${missingClip} must have no control without a signed URL`,
    ).toBe(false);
    expect(
      missingPanel.textContent ?? "",
      "a clip with no signed URL must keep its word text",
    ).toContain(drill.words[0]!.word);
    expect(
      `play_calls=${playSpy.mock.calls.length}`,
      "a clip with no signed URL must not autoplay",
    ).toBe("play_calls=0");
  });
});
