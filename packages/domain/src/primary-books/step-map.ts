/**
 * The 13 printed workbook steps, their periods, and the map to the 14 app lesson steps
 * (track primary_teacher_books_lesson_support_20261003, discovery §3). Pure data: safe for client
 * components.
 */

/** A printed workbook step. */
export interface WorkbookStep {
  /** 1 to 13. */
  step: number;
  /** English title from the Workbooks manual (`STEP_TITLES`). */
  title: string;
  /** Class period 1 to 4. */
  period: number;
  /** The app lesson steps (1 to 14) that belong to this printed step; empty when the app has none. */
  appSteps: number[];
}

/** The 13 printed steps in order. */
export const WORKBOOK_STEPS: readonly WorkbookStep[] = [
  { step: 1, title: "Before You Read", period: 1, appSteps: [1] },
  { step: 2, title: "Key Vocabulary", period: 1, appSteps: [2] },
  { step: 3, title: "Read the Article", period: 1, appSteps: [3] },
  { step: 4, title: "Collect Vocabulary", period: 1, appSteps: [4] },
  { step: 5, title: "Deep Reading Notes", period: 2, appSteps: [5] },
  { step: 6, title: "Collect Sentences", period: 2, appSteps: [6] },
  { step: 7, title: "Comprehension Check", period: 2, appSteps: [7] },
  { step: 8, title: "Guided Response", period: 3, appSteps: [8] },
  { step: 9, title: "Vocabulary Practice", period: 3, appSteps: [9, 10] },
  { step: 10, title: "Sentence Practice", period: 3, appSteps: [11, 12] },
  { step: 11, title: "Guided Writing", period: 4, appSteps: [] },
  { step: 12, title: "Language Questions", period: 4, appSteps: [13] },
  { step: 13, title: "Lesson Reflection", period: 4, appSteps: [14] },
];

/** The four periods with their English titles (Workbooks `PERIOD_MAP`). */
export const PERIODS: readonly { period: number; title: string; steps: number[] }[] = [
  { period: 1, title: "Launch & Vocabulary", steps: [1, 2, 3, 4] },
  { period: 2, title: "Deep Reading & Comprehension", steps: [5, 6, 7] },
  { period: 3, title: "Response & Practice", steps: [8, 9, 10] },
  { period: 4, title: "Writing & Reflection", steps: [11, 12, 13] },
];

/** The number of app lesson steps. */
export const APP_STEP_COUNT = 14;

/**
 * Finds the printed workbook step that an app lesson step belongs to.
 * @param appStep The app step, 1 to 14.
 * @returns The workbook step, or undefined for an unknown app step.
 */
export function workbookStepOf(appStep: number): WorkbookStep | undefined {
  return WORKBOOK_STEPS.find((entry) => entry.appSteps.includes(appStep));
}

/**
 * Says whether the workbook-first lock lets a student open an app step: the printed step that
 * holds it is marked done by the teacher. App steps with no printed step are never locked.
 * @param appStep The app step, 1 to 14.
 * @param stepsDone The printed steps the teacher marked done.
 * @returns True when the student may open the app step.
 */
export function isAppStepUnlocked(appStep: number, stepsDone: readonly number[]): boolean {
  const printed = workbookStepOf(appStep);
  return printed === undefined || stepsDone.includes(printed.step);
}
