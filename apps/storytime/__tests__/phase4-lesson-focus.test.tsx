// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import weekJson from "../content/l2/w01.json";
import { TeacherLessonFlow } from "../app/[locale]/teacher/[level]/[week]/[day]/lesson-flow";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/**
 * The end-of-lesson focus target of the lesson flow (remediation round 3, findings F472, F482,
 * and F483).
 *
 * The last screen of a day holds a focus region, because the control "Next step" leaves the DOM
 * there. The region carries `role="region"` and a visible line, the focus move keeps the scroll
 * place, and the move runs only after a "Next step" press, never on first render.
 */

/** The accessible name of the forward control of the lesson flow. */
const NEXT_STEP = "Next step";

/** The accessible name of the focus region of the last screen. */
const END_REGION = "The end of the lesson";

/** The visible line of the focus region. */
const END_LINE = "This is the last step of the day.";

/** The shipped milestone week, parsed with the app contract. */
const week: StorytimeWeek = weekSchema.parse(weekJson) as StorytimeWeek;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Renders the lesson flow of one day.
 * @param source The week.
 * @param day The lesson day.
 * @returns The render result.
 */
function renderDay(source: StorytimeWeek, day: number) {
  return render(
    <StrictMode>
      <TeacherLessonFlow week={source} day={day} locale="en" mediaUrls={{}} />
    </StrictMode>,
  );
}

/**
 * Clicks "Next step" until the last screen shows.
 * @param maxTaps The walk limit.
 * @returns The number of presses.
 */
function walkToLastScreen(maxTaps = 20): number {
  let taps = 0;
  for (;;) {
    const next = screen.queryByRole("button", { name: NEXT_STEP });
    if (!next) return taps;
    taps += 1;
    expect(taps, "the walk must end").toBeLessThan(maxTaps);
    fireEvent.click(next);
  }
}

describe("Phase 4 lesson focus: the end region of the last screen (F472, F482, F483)", () => {
  it("moves the focus to a named region only after a Next step press, and keeps the scroll place", () => {
    const view = renderDay(week, 1);
    expect(document.activeElement, "first render must move no focus").toBe(document.body);

    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    const taps = walkToLastScreen();
    const steps = week.scripts.find((entry) => entry.day === 1)!.steps.length;
    expect(taps, `next_taps=${taps}`).toBe(steps - 1);

    const region = screen.getByRole("region", { name: END_REGION });
    expect(document.activeElement, "the focus must sit on the end region").toBe(region);
    expect(region.textContent, "the region must hold a visible line").toContain(END_LINE);

    const move = focusSpy.mock.contexts.findIndex(
      (instance, index) => instance === region && focusSpy.mock.calls[index]?.[0]?.preventScroll,
    );
    expect(
      move,
      "the focus move on the end region must hold preventScroll (F482)",
    ).toBeGreaterThan(-1);
    view.unmount();
  });

  it("moves no focus on first render of a one-step day (F483)", () => {
    const copy = structuredClone(week);
    const day1 = copy.scripts.find((entry) => entry.day === 1)!;
    day1.steps = [day1.steps[0]!];
    const parsed = weekSchema.safeParse(copy);
    expect(
      parsed.success,
      `one_step_day=${parsed.success}: the contract must allow a day with one step. ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
    ).toBe(true);
    const view = renderDay(parsed.success ? (copy as StorytimeWeek) : week, 1);
    expect(
      document.querySelector(`[aria-label="${END_REGION}"]`),
      "the one-step day must start on its last screen",
    ).not.toBeNull();
    expect(
      document.activeElement,
      `activeElement_tag=${document.activeElement?.tagName}: first render must move no focus (F483)`,
    ).toBe(document.body);
    expect(screen.queryByRole("button", { name: NEXT_STEP })).toBeNull();
    view.unmount();
  });
});

describe("Phase 4 lesson focus: the visible focus of the end region (UX finding F601)", () => {
  it("holds no outline-none and the 3 px ring classes on the end region", () => {
    const view = renderDay(week, 1);
    walkToLastScreen();
    const region = document.querySelector(`[aria-label="${END_REGION}"]`);
    expect(region, "the last-screen region must exist after the walk").not.toBeNull();
    const className = region!.className;
    expect(
      className.includes("outline-none"),
      `region_classes=${className}: the region must not hide the focus (F601)`,
    ).toBe(false);
    for (const token of [
      "outline-3",
      "outline-white",
      "outline-offset-0",
      "box-shadow:0_0_0_6px_var(--st-brown)",
    ]) {
      expect(
        className.includes(token),
        `region_classes=${className}: the region must hold the ring token ${token} of the loop panel controls`,
      ).toBe(true);
    }
    view.unmount();
  });
});

describe("Phase 4 lesson focus: the teacher controls of the flow (UX finding F603)", () => {
  it("holds min-h-11 on the Thai toggle, the back link, and the Next step control", () => {
    const view = renderDay(week, 1);
    const targets: Array<[HTMLElement, string]> = [
      [screen.getByRole("button", { name: "ไทย" }), "the Thai toggle"],
      [screen.getByRole("link", { name: "Back to the week" }), "the back link"],
      [screen.getByRole("button", { name: NEXT_STEP }), "the Next step control"],
    ];
    for (const [node, label] of targets) {
      expect(
        node.className.includes("min-h-11"),
        `${label} must hold min-h-11 for the 44 px floor, classes=${node.className}`,
      ).toBe(true);
    }
    view.unmount();
  });
});

describe("Phase 4 lesson focus: the language mark of the step id chip (UX finding F605)", () => {
  it("marks the step id chip with lang=en", () => {
    const view = renderDay(week, 1);
    const chip = document.querySelector<HTMLElement>('section[data-step-id] header > span');
    const stepId = week.scripts.find((entry) => entry.day === 1)!.steps[0]!.id;
    expect(chip?.textContent, "the first span of the step header is the id chip").toBe(stepId);
    expect(
      chip?.getAttribute("lang"),
      `chip_lang=${chip?.getAttribute("lang")}: the step id chip must hold lang=en (F605)`,
    ).toBe("en");
    view.unmount();
  });
});
