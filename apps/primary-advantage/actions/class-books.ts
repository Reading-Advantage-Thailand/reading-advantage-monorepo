"use server";

import { db } from "@reading-advantage/db";
import { assignClassBook, markLessonTaught, markStepDone, setCurrentLesson } from "@reading-advantage/domain/primary-books";
import { currentUser } from "@/lib/session";

/** The result of a class book action; null before the first call of a form. */
export type ClassBookActionState = { success: true } | { success: false; error: string } | null;

type Actor = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/**
 * Runs one class book change as the signed-in user and maps errors to an action state.
 * @param work The domain call.
 * @returns The action state.
 */
async function run(work: (user: Actor) => Promise<unknown>): Promise<ClassBookActionState> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  try {
    await work(user);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

/**
 * Assigns a book to a class from the assign form (FR-1).
 * @param _previous The previous form state (unused).
 * @param formData classroomId, bookId, mode, and startDate.
 * @returns The action state.
 */
export async function assignClassBookAction(_previous: ClassBookActionState, formData: FormData): Promise<ClassBookActionState> {
  const startDate = String(formData.get("startDate") ?? "");
  return run((user) =>
    assignClassBook({
      db,
      user,
      input: {
        classroomId: String(formData.get("classroomId") ?? ""),
        bookId: String(formData.get("bookId") ?? ""),
        mode: formData.get("mode") === "independent" ? "independent" : "teacher_led",
        startDate: startDate ? new Date(startDate) : null,
      },
    }),
  );
}

/**
 * Moves the lesson pointer of a class book (FR-3).
 * @param classBookId The class book.
 * @param lessonNumber The lesson to make current.
 * @returns The action state.
 */
export async function setCurrentLessonAction(classBookId: string, lessonNumber: number): Promise<ClassBookActionState> {
  return run((user) => setCurrentLesson({ db, user, input: { classBookId, lessonNumber } }));
}

/**
 * Marks a lesson taught with all 13 workbook steps done (FR-3).
 * @param classBookId The class book.
 * @param lessonNumber The lesson.
 * @returns The action state.
 */
export async function markLessonTaughtAction(classBookId: string, lessonNumber: number): Promise<ClassBookActionState> {
  return run((user) => markLessonTaught({ db, user, input: { classBookId, lessonNumber } }));
}

/**
 * Marks one workbook step of a lesson done or undone for the class (the workbook-first lock).
 * @param classBookId The class book.
 * @param lessonNumber The lesson.
 * @param step The workbook step (1-13).
 * @param done True for done, false to undo.
 * @returns The action state.
 */
export async function markStepDoneAction(classBookId: string, lessonNumber: number, step: number, done: boolean): Promise<ClassBookActionState> {
  return run((user) => markStepDone({ db, user, input: { classBookId, lessonNumber, step, done } }));
}
