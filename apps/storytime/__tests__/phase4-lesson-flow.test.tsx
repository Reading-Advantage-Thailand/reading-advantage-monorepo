// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import weekJson from "../content/l2/w01.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/**
 * The Red tests of the teacher lesson flow (plan task 4.3, AC-9.2).
 *
 * The route `/<locale>/teacher/<level>/<week>/<day>` shows the teacher one lesson day of the
 * shipped milestone week `apps/storytime/content/l2/w01.json`. Every value comes from that file.
 *
 * Contract for Green:
 * - The client view lives at `app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx` and
 *   exports `TeacherLessonFlow` with the props `{ week, day, locale }`.
 * - Screen 1 holds the opening routine `opening.pa` (the five prompts), the review strip of the
 *   day (`review[]`, the entry whose `day` matches), and the first step. Each later screen holds
 *   exactly one step.
 * - The step screen shows the step id (`A1` to `E5`), the title, the time as `<minutes> min`,
 *   the four headings ("What the teacher does", "What the teacher says", "What the students do",
 *   "What to watch"), and the three variant lines ("Easier", "Harder", "Group").
 * - One control named "Next step" moves to the next screen. The last screen holds no such
 *   control.
 * - On day 5 the flow shows the Friday check (`check`) within the screens of the day.
 * - A control named "ไทย" switches every `{ en, th }` field to its `th` text.
 * - The view uses no next-intl hook. The test renders it without a provider, the same as the
 *   teacher week view of task 4.2.
 *
 * The test reads the shipped week and never a fixture. Each day must hold at least one step
 * before any property is asserted (A4), and the step count is a labeled integer
 * `day=<n> steps=<n>` (A3). The anti-hard-code cases mutate a deep clone per case.
 */

/** The accessible name of the forward control. */
const NEXT_STEP = "Next step";

/** The accessible name of the Thai toggle. */
const THAI_TOGGLE = "ไทย";

/** The four headings of a step (spec FR-9). */
const STEP_HEADINGS = [
  "What the teacher does",
  "What the teacher says",
  "What the students do",
  "What to watch",
] as const;

/** The three variant lines of a step (spec FR-9). */
const VARIANT_LABELS = ["Easier", "Harder", "Group"] as const;

/** The five days of the week contract. */
const DAYS = [1, 2, 3, 4, 5] as const;

/** The shipped milestone week, parsed with the app contract. */
const week = weekSchema.parse(weekJson) as StorytimeWeek;

/** The props of the lesson flow of Green. */
interface LessonFlowProps {
  /** The week of the day. */
  week: StorytimeWeek;
  /** The lesson day, 1 to 5. */
  day: number;
  /** The locale segment of the route. */
  locale: string;
}

/** Loads the lesson flow module and reports a missing module as an assertion. */
async function importLessonFlowModule(): Promise<Record<string, unknown>> {
  const modulePath = "../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow";
  return (await import(/* @vite-ignore */ modulePath)) as Record<string, unknown>;
}

/** Loads the lesson flow and fails with a named assertion when it is absent. */
async function loadLessonFlow(): Promise<ComponentType<LessonFlowProps>> {
  let flow: unknown;
  try {
    flow = (await importLessonFlowModule()).TeacherLessonFlow;
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

/** Returns the lesson of one day of a week, with a named guard for a missing day. */
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

/** Renders the lesson flow of one day. */
async function renderFlow(day: number, source: StorytimeWeek = week) {
  const TeacherLessonFlow = await loadLessonFlow();
  return render(<TeacherLessonFlow week={source} day={day} locale="en" />);
}

/**
 * Renders one day, optionally turns the Thai toggle on, and walks every screen.
 * @returns The text of each screen, in order, from the opening screen to the last step.
 */
async function collectScreens(
  day: number,
  options: { source?: StorytimeWeek; thai?: boolean } = {},
): Promise<string[]> {
  const source = options.source ?? week;
  const script = dayScript(source, day);
  const { container, unmount } = await renderFlow(day, source);
  if (options.thai) fireEvent.click(screen.getByRole("button", { name: THAI_TOGGLE }));
  const screens = [container.textContent ?? ""];
  for (let index = 1; index < script.steps.length; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    screens.push(container.textContent ?? "");
  }
  unmount();
  expect(
    screens.length,
    `day=${day} screens=${screens.length} steps=${script.steps.length}: the flow must show one screen for each step`,
  ).toBe(script.steps.length);
  return screens;
}

afterEach(() => {
  cleanup();
});

describe("Phase 4 teacher lesson flow (AC-9.2)", () => {
  it("shows the opening routine before the first step of every day", async () => {
    const opening = week.opening;
    expect(opening, "the shipped week must hold the opening routine").toBeDefined();
    expect(
      opening!.pa.length,
      `the shipped week must hold the five opening prompts, not ${opening!.pa.length}`,
    ).toBe(5);

    for (const day of DAYS) {
      const script = dayScript(week, day);
      const screens = await collectScreens(day);
      const firstScreen = screens[0] ?? "";
      for (const prompt of opening!.pa) {
        expect(
          firstScreen,
          `day=${day}: the opening screen must show the opening prompt ${prompt.en}`,
        ).toContain(prompt.en);
      }
      const openingAt = firstScreen.indexOf(opening!.pa[0]!.en);
      const stepAt = firstScreen.indexOf(script.steps[0]!.title.en);
      expect(
        stepAt,
        `day=${day}: the flow must show the title ${script.steps[0]!.title.en} of the first step`,
      ).toBeGreaterThan(-1);
      expect(
        openingAt < stepAt,
        `day=${day}: the opening routine must come before the first step`,
      ).toBe(true);
    }
  });

  it("shows one step on each screen with the title, the minutes, the four headings, and the three variant lines", async () => {
    for (const day of DAYS) {
      const script = dayScript(week, day);
      const steps = script.steps;
      const ids = steps.map((step) => step.id);
      expect(
        new Set(ids).size,
        `day=${day}: the step ids must be unique for the one-screen check`,
      ).toBe(ids.length);

      const { container, unmount } = await renderFlow(day);
      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index]!;
        const screenText = container.textContent ?? "";
        const place = `day=${day} step=${index + 1}/${steps.length} (${step.id})`;

        expect(screenText, `${place}: the screen must show the step id`).toContain(step.id);
        for (const otherId of ids.filter((entry) => entry !== step.id)) {
          expect(
            screenText,
            `${place}: the screen must hold one step only, so it must not show ${otherId}`,
          ).not.toContain(otherId);
        }
        expect(screenText, `${place}: the screen must show the step title`).toContain(
          step.title.en,
        );
        expect(screenText, `${place}: the screen must show the step time`).toContain(
          `${step.minutes} min`,
        );
        for (const heading of STEP_HEADINGS) {
          expect(screenText, `${place}: the screen must show the heading "${heading}"`).toContain(
            heading,
          );
        }
        for (const label of VARIANT_LABELS) {
          expect(screenText, `${place}: the screen must show the line "${label}"`).toContain(label);
        }

        expect(step.en.teacherActions.length, `${place}: the teacher actions must not be empty`)
          .toBeGreaterThan(0);
        expect(step.en.teacherLanguage.length, `${place}: the teacher language must not be empty`)
          .toBeGreaterThan(0);
        expect(step.en.studentActions.length, `${place}: the student actions must not be empty`)
          .toBeGreaterThan(0);
        expect(step.en.watchFor.length, `${place}: the watch-for lines must not be empty`)
          .toBeGreaterThan(0);
        for (const line of [
          step.en.teacherActions[0]!,
          step.en.teacherLanguage[0]!,
          step.en.studentActions[0]!,
          step.en.watchFor[0]!,
        ]) {
          expect(screenText, `${place}: the screen must show the line ${line}`).toContain(line);
        }
        for (const variant of [step.easier, step.harder, step.group]) {
          expect(screenText, `${place}: the screen must show the line ${variant.en}`).toContain(
            variant.en,
          );
        }

        if (index < steps.length - 1) {
          fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
        } else {
          expect(
            screen.queryByRole("button", { name: NEXT_STEP }),
            `day=${day}: the last step must hold no forward control`,
          ).toBeNull();
        }
      }
      unmount();
    }
  });

  it("shows the review strip of the day from the week", async () => {
    for (const day of DAYS) {
      const strip = week.review.find((entry) => entry.day === day);
      expect(strip, `the shipped week must hold the review strip of day ${day}`).toBeDefined();
      const screens = await collectScreens(day);
      const dayText = screens.join("\n");
      for (const card of strip!.cards) {
        expect(
          dayText,
          `day=${day}: the review strip must show the card ${card.text}`,
        ).toContain(card.text);
      }
    }

    const copy = structuredClone(week);
    const strip = copy.review.find((entry) => entry.day === 2)!;
    expect(
      strip.cards.length,
      `day=2 cards=${strip.cards.length}: day 2 must hold a review card for the marker case`,
    ).toBeGreaterThan(0);
    strip.cards[0]!.text = "zzreviewcardzz";

    const dayTwo = (await collectScreens(2, { source: copy })).join("\n");
    expect(
      dayTwo,
      "the review strip must take the card text from the week data",
    ).toContain("zzreviewcardzz");

    const dayThree = (await collectScreens(3, { source: copy })).join("\n");
    expect(
      dayThree,
      "the review strip of day 3 must not show the card of day 2",
    ).not.toContain("zzreviewcardzz");
  });

  it("shows the Friday check on day 5 only, from the week", async () => {
    expect(
      week.check.items.length,
      `check items=${week.check.items.length}: the shipped week must hold Friday check items`,
    ).toBeGreaterThan(0);

    const copy = structuredClone(week);
    const item = copy.check.items[0]!;
    expect(
      item.kind,
      "the shipped Friday check must hold a circle-picture item for the marker case",
    ).toBe("circle-picture");
    if (item.kind !== "circle-picture") throw new Error("the marker case needs a circle-picture item");
    item.pictures[0] = "zzfridaycheckzz";

    for (const day of [1, 2, 3, 4] as const) {
      const dayText = (await collectScreens(day, { source: copy })).join("\n");
      expect(
        dayText,
        `day=${day}: the Friday check must not show on day ${day}`,
      ).not.toContain("zzfridaycheckzz");
    }

    const dayFive = (await collectScreens(5, { source: copy })).join("\n");
    expect(
      dayFive,
      "day 5 must show the Friday check item from the week data",
    ).toContain("zzfridaycheckzz");
  });

  it("shows the th text of each { en, th } field when the Thai toggle is on", async () => {
    const opening = week.opening;
    expect(opening, "the shipped week must hold the opening routine").toBeDefined();

    for (const day of DAYS) {
      const script = dayScript(week, day);
      const screens = await collectScreens(day, { thai: true });
      const firstScreen = screens[0] ?? "";
      for (const prompt of opening!.pa) {
        expect(
          firstScreen,
          `day=${day}: the Thai toggle must show the opening prompt ${prompt.th}`,
        ).toContain(prompt.th);
      }

      for (let index = 0; index < script.steps.length; index += 1) {
        const step = script.steps[index]!;
        const screenText = screens[index] ?? "";
        const place = `day=${day} step=${index + 1}/${script.steps.length} (${step.id})`;
        expect(step.th, `${place}: the shipped step must hold the th part`).toBeDefined();
        for (const variant of [step.title, step.easier, step.harder, step.group]) {
          expect(screenText, `${place}: the Thai toggle must show the th text`).toContain(
            variant.th,
          );
        }
        const th = step.th!;
        expect(th.teacherActions.length, `${place}: the th teacher actions must not be empty`)
          .toBeGreaterThan(0);
        expect(th.teacherLanguage.length, `${place}: the th teacher language must not be empty`)
          .toBeGreaterThan(0);
        expect(th.studentActions.length, `${place}: the th student actions must not be empty`)
          .toBeGreaterThan(0);
        expect(th.watchFor.length, `${place}: the th watch-for lines must not be empty`)
          .toBeGreaterThan(0);
        for (const line of [
          th.teacherActions[0]!,
          th.teacherLanguage[0]!,
          th.studentActions[0]!,
          th.watchFor[0]!,
        ]) {
          expect(screenText, `${place}: the Thai toggle must show the th line ${line}`).toContain(
            line,
          );
        }
      }
    }
  });

  it("takes the step fields from the loaded week, never a hard-coded string", async () => {
    const copy = structuredClone(week);
    const script = dayScript(copy, 3);
    const step = script.steps[1]!;
    expect(copy.opening, "the shipped week must hold the opening routine").toBeDefined();
    copy.opening!.pa[0]!.en = "ZZZ opening prompt ZZZ";
    step.title.en = "ZZZ Lesson Step ZZZ";
    step.minutes = 9;
    step.easier.en = "ZZZ easier line ZZZ";
    step.harder.en = "ZZZ harder line ZZZ";
    step.group.en = "ZZZ group line ZZZ";
    step.en.teacherActions[0] = "ZZZ teacher action ZZZ";
    step.en.teacherLanguage[0] = "ZZZ teacher language ZZZ";
    step.en.studentActions[0] = "ZZZ student action ZZZ";
    step.en.watchFor[0] = "ZZZ watch line ZZZ";

    const { container, unmount } = await renderFlow(3, copy);
    const firstScreen = container.textContent ?? "";
    expect(
      firstScreen,
      "the flow must take the opening prompt from the week data",
    ).toContain("ZZZ opening prompt ZZZ");
    fireEvent.click(screen.getByRole("button", { name: NEXT_STEP }));
    const secondScreen = container.textContent ?? "";
    for (const marker of [
      "ZZZ Lesson Step ZZZ",
      "ZZZ easier line ZZZ",
      "ZZZ harder line ZZZ",
      "ZZZ group line ZZZ",
      "ZZZ teacher action ZZZ",
      "ZZZ teacher language ZZZ",
      "ZZZ student action ZZZ",
      "ZZZ watch line ZZZ",
      "9 min",
    ]) {
      expect(
        secondScreen,
        `the flow must take the step field ${marker} from the week data`,
      ).toContain(marker);
    }
    unmount();
  });
});
