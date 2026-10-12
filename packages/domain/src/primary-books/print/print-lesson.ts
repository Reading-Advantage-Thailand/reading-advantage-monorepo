import { and, eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { primaryBookLessons } from "@reading-advantage/db/schema";
import { assertCan } from "@reading-advantage/auth";
import { createTenantDB } from "../../db-contract.js";
import { managedClassBook, type Ctx } from "../class-books.js";
import { printLessonSchema, type PrintLesson } from "./contracts.js";

/**
 * Reads the print data of a package jsonb value.
 * @param pkg The `primary_book_lessons.package` value.
 * @returns The valid print data, or null when the package has none or it does not parse.
 */
export function printLessonOf(pkg: unknown): PrintLesson | null {
  const raw = pkg && typeof pkg === "object" ? (pkg as Record<string, unknown>).printLesson : undefined;
  if (!raw) return null;
  const parsed = printLessonSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * The print data of one lesson of a class book (S4). The class book check refuses a student, a
 * teacher of another class, and a user of another school before the lesson is read.
 * @param params The database, the user, the class book, and the lesson number.
 * @returns The lesson title and the print data, or null when the lesson has no valid print data.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 * @throws When the book has no such lesson in the catalogue.
 */
export async function getPrintLesson(params: Ctx & { classBookId: string; number: number }): Promise<{ title: string; printLesson: PrintLesson } | null> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  const book = await managedClassBook(params, params.classBookId);
  const raw = createTenantDB(params.db as DB, { schoolId: params.user.schoolId }).unscoped("the book catalogue is global; the class book was checked by managedClassBook");
  const rows = await raw
    .select({ title: primaryBookLessons.title, package: primaryBookLessons.package })
    .from(primaryBookLessons)
    .where(and(eq(primaryBookLessons.bookId, book.bookId), eq(primaryBookLessons.number, params.number)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Lesson ${params.number} of ${book.bookKey} is not in the catalogue`);
  const printLesson = printLessonOf(row.package);
  return printLesson ? { title: row.title, printLesson } : null;
}
