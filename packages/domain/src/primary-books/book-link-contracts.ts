import { z } from "zod";
import { bookLessonRefSchema } from "./lesson-support-contracts.js";

/** The largest lesson number the catalogue lookup accepts; a larger number is "not in the book". */
export const MAX_BOOK_LINK_NUMBER = 10_000;

/** What a printed QR link `/b/<book>/<n>` points at (spec S4). */
export const bookLinkResultSchema = z.discriminatedUnion("kind", [
  /** A published lesson (article linked and approved). */
  z.object({ kind: z.literal("ok"), lesson: bookLessonRefSchema }),
  /** The lesson exists but has no article, or is not approved. */
  z.object({ kind: z.literal("unpublished"), lesson: bookLessonRefSchema }),
  /** The book exists; the number is not one of its lessons. */
  z.object({ kind: z.literal("no_lesson"), bookName: z.string(), lessonCount: z.number().int() }),
  /** The book key is not in the catalogue. */
  z.object({ kind: z.literal("unknown_book") }),
]);
export type BookLinkResult = z.infer<typeof bookLinkResultSchema>;
