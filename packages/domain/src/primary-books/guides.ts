/**
 * Pure mapping from the Workbooks teacher manual to `primary_lesson_guides` rows (FR-8). The
 * texts are imported as they are; nothing is rewritten.
 */
import { WORKBOOK_STEPS } from "./step-map.js";

/** The per-step notes of the manual (`teachingNotesContent[step]` in `i18n/en.ts` and `th.ts`). */
export interface TeachingNotes {
  teacherActions: string[];
  teacherLanguage: string[];
  studentActions: string[];
  watchFor: string[];
}

/** One locale of the manual: the notes per step and the lesson-plan lines that carry the step titles. */
export interface ManualLocale {
  teachingNotesContent: Record<number | string, TeachingNotes>;
  /** `lessonPlanStructure.period<p>Step<n>`: `<strong>Step n: Title</strong> — ...`. */
  lessonPlanStructure: Record<string, string>;
}

/** A row of `primary_lesson_guides`. */
export interface GuideRow {
  step: number;
  locale: "en" | "th";
  title: string;
  period: number;
  teacherActions: string[];
  teacherLanguage: string[];
  studentActions: string[];
  watchFor: string[];
  scriptMd: string | null;
}

/**
 * Reads the step title out of a lesson-plan line, for example
 * `<strong>ขั้นตอนที่ 1: ก่อนอ่าน</strong> — ...` gives `ก่อนอ่าน`.
 * @param line The `period<p>Step<n>` line.
 * @returns The title, or null when the line has no bold step label.
 */
export function stepTitleFromPlanLine(line: string | undefined): string | null {
  const bold = /<strong>([^<]*)<\/strong>/.exec(line ?? "")?.[1];
  if (!bold) return null;
  const colon = bold.indexOf(":");
  return (colon >= 0 ? bold.slice(colon + 1) : bold).trim() || null;
}

/**
 * Cuts the chat preamble off a scripted step file: the text starts at its first `#` heading.
 * @param markdown The file content.
 * @returns The Markdown from the first heading, or null for an empty file.
 */
export function scriptBody(markdown: string | undefined): string | null {
  if (!markdown) return null;
  const index = markdown.search(/^#\s/m);
  const body = (index >= 0 ? markdown.slice(index) : markdown).trim();
  return body || null;
}

/**
 * Builds the guide rows of one locale: 13 steps with the manual notes, the step title, the
 * period, and the scripted segment.
 * @param locale `en` or `th`.
 * @param manual The manual texts of that locale.
 * @param scripts The scripted step files by step number (`step-N.md` or `step-N-th.md`).
 * @returns 13 rows.
 * @throws When a step has no notes in the manual.
 */
export function toGuideRows(locale: "en" | "th", manual: ManualLocale, scripts: Record<number, string | undefined> = {}): GuideRow[] {
  return WORKBOOK_STEPS.map((step) => {
    const notes = manual.teachingNotesContent[step.step];
    if (!notes) throw new Error(`The ${locale} manual has no notes for step ${step.step}`);
    const planTitle = stepTitleFromPlanLine(manual.lessonPlanStructure[`period${step.period}Step${step.step}`]);
    return {
      step: step.step,
      locale,
      title: locale === "en" ? step.title : (planTitle ?? step.title),
      period: step.period,
      teacherActions: notes.teacherActions,
      teacherLanguage: notes.teacherLanguage,
      studentActions: notes.studentActions,
      watchFor: notes.watchFor,
      scriptMd: scriptBody(scripts[step.step]),
    };
  });
}
