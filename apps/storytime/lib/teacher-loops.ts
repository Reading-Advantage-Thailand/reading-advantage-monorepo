/**
 * The teacher loops rule of a lesson day (plan task 4.6, spec FR-13, AC-13.7, AC-13.8).
 *
 * The app shows the teacher loops only when the loops part of the week is approved and the
 * level of the week is 2, 3, or 4. The rule reuses `loopsApproved` of `lib/loops.ts`, the one
 * approval rule of the app.
 *
 * The rule reads the week and never changes it. The step time of a step follows the rule, so
 * the screen of a step and the plan of the teacher book hold the same minutes.
 */

import type { StorytimeWeek } from "./contracts/week";
import { loopsApproved } from "./loops";

/** One step of a lesson day. */
type LessonStep = StorytimeWeek["scripts"][number]["steps"][number];

/** The levels that show the teacher loops (spec FR-13). */
const LOOP_LEVELS = [2, 3, 4];

/**
 * Reports whether the teacher loops show for a week.
 *
 * The rule holds for an approved week of level 2, 3, or 4. A draft week and a week of level 1
 * show no loop, so the screen of a lesson day holds the minutes of the teacher book.
 * @param week The week of the lesson day.
 * @returns `true` when the loops of the week show.
 */
export function loopsShow(week: StorytimeWeek): boolean {
  if (!loopsApproved(week)) return false;
  return LOOP_LEVELS.includes(week.meta.level);
}

/**
 * Reports whether the loop panels show for a week.
 *
 * A review week holds only the recall and the step time, so the app ignores the other loop
 * fields of a review week (spec FR-13).
 * @param week The week of the lesson day.
 * @returns `true` when the loop panels of the week show.
 */
export function loopPanelsShow(week: StorytimeWeek): boolean {
  return loopsShow(week) && week.meta.kind !== "review";
}

/**
 * Returns the step time of a step.
 *
 * The loop minutes of a step replace its minutes when the loops show. A step without loop
 * minutes keeps its own minutes.
 * @param step The step of the lesson day.
 * @param loops `true` when the loops of the week show.
 * @returns The minutes of the step on the screen.
 */
export function stepTimeMinutes(step: LessonStep, loops: boolean): number {
  if (!loops) return step.minutes;
  return step.loopMinutes ?? step.minutes;
}
