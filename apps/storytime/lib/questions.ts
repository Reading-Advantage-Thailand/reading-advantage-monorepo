/**
 * The question rules of the at-home read-along (plan task 3.9, spec FR-13, AC-13.6, AC-13.8).
 *
 * The rules read the read-along book of a week. They do not parse the week and they import no
 * schema, so the client question screen stays small.
 */
import { loopsApproved } from "./loops";

/** One question of a read-along book, with the page and the word of its answer. */
export interface BookQuestion {
  /** The question word: who, what, or where. */
  kind: string;
  /** The English prompt and the Thai prompt for the teacher. */
  ask: { en: string; th: string };
  /** The 1-based reader page and the picture word on that page. */
  answer: { page: number; word: string };
}

/** One page of the read-along book, as the question screen reads it. */
export interface QuestionPage {
  /** The page text. */
  text?: string;
  /** The page picture. */
  image?: {
    /** The file, relative to the media base. */
    file?: string;
    /** The alt text; an empty caption gives an empty alt. */
    caption?: string;
  };
}

/** One picture choice of the question screen. */
export interface QuestionChoice {
  /** The 1-based page of the picture. */
  page: number;
  /** The picture file, relative to the media base. */
  file?: string;
  /** The alt text of the picture. */
  caption: string;
}

/** The lowest level that shows the question screen. */
const QUESTION_LEVEL_MIN = 2;

/** The highest level that shows the question screen. */
const QUESTION_LEVEL_MAX = 4;

/**
 * Reads the questions of the read-along book of a week.
 * @param week The week, or a value of another shape.
 * @returns The questions in book order, or an empty list when the week holds none.
 */
export function readAlongQuestions(week: unknown): BookQuestion[] {
  if (!week || typeof week !== "object") return [];
  const books = (week as { books?: unknown }).books;
  if (!Array.isArray(books)) return [];
  const book = books.find(
    (entry) => entry && typeof entry === "object" && (entry as { kind?: unknown }).kind === "readalong",
  ) as { questions?: unknown } | undefined;
  return Array.isArray(book?.questions) ? (book.questions as BookQuestion[]) : [];
}

/**
 * Tells whether the at-home read-along shows the question screen.
 *
 * The screen shows only for an approved loops part, at levels 2 to 4, when the book holds a
 * question. An absent loops part counts as a draft.
 * @param week The week, or a value of another shape.
 * @param level The level of the route.
 * @returns `true` only when every rule holds.
 */
export function questionScreenShows(week: unknown, level: number): boolean {
  if (!Number.isInteger(level) || level < QUESTION_LEVEL_MIN || level > QUESTION_LEVEL_MAX) {
    return false;
  }
  return loopsApproved(week) && readAlongQuestions(week).length > 0;
}

/**
 * Builds the picture choices of the question screen.
 *
 * A choice is the picture of a distinct answer page. Each page shows one time, in book order, and
 * one picture can answer more than one question.
 * @param questions The questions of the read-along book.
 * @param pages The pages of the read-along book.
 * @returns One choice per distinct answer page, in book order.
 */
export function questionChoices(
  questions: readonly BookQuestion[],
  pages: readonly QuestionPage[],
): QuestionChoice[] {
  const seen = new Set<number>();
  const choices: QuestionChoice[] = [];
  for (const question of questions) {
    const pageNumber = question.answer.page;
    if (seen.has(pageNumber)) continue;
    const page = pages[pageNumber - 1];
    if (!page) continue;
    seen.add(pageNumber);
    choices.push({
      page: pageNumber,
      file: page.image?.file,
      caption: page.image?.caption ?? "",
    });
  }
  return choices.sort((left, right) => left.page - right.page);
}
