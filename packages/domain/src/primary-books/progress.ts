import { and, asc, eq } from "drizzle-orm";
import {
  classroomStudents,
  primaryBookLessons,
  primaryClassBookLessons,
  primaryClassBooks,
  primaryStudentLessonSteps,
  users,
} from "@reading-advantage/db/schema";
import { assertCan, AuthError } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { managedClassBook, toClassBook, type Ctx } from "./class-books.js";
import {
  recordLessonProgressInput,
  STUCK_DAYS,
  type ClassBookProgress,
  type ProgressCell,
  type RecordLessonProgressInput,
  type StepStatus,
  type StudentLessonSteps,
} from "./progress-contracts.js";
import { APP_STEP_COUNT } from "./step-map.js";

const UNSCOPED_REASON = "student lesson steps hang off primary_class_books (REFERENTIAL); the class book is checked first";

interface StepRow {
  lessonNumber: number;
  appStep: number;
  status: string;
  startedAt: Date | null;
  doneAt: Date | null;
  seconds: number;
  updatedAt: Date;
}

/**
 * Records that a student reached an app step of an article (FR-5). Every class book of the
 * student's classes whose lesson has this article gets the steps: earlier steps done, the
 * reached step in progress. A step once done stays done when the student goes back.
 * @param params The database, the student, the article, the reached step, and the timer.
 * @returns The number of class book lessons updated (0 when the article is not a class lesson).
 */
export async function recordLessonProgress(params: Ctx & { input: RecordLessonProgressInput }): Promise<number> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  const input = recordLessonProgressInput.parse(params.input);
  const now = params.now ?? new Date();
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const targets = await raw
    .select({ classBookId: primaryClassBooks.id, lessonNumber: primaryBookLessons.number })
    .from(classroomStudents)
    .innerJoin(primaryClassBooks, eq(primaryClassBooks.classroomId, classroomStudents.classroomId))
    .innerJoin(primaryBookLessons, and(eq(primaryBookLessons.bookId, primaryClassBooks.bookId), eq(primaryBookLessons.articleId, input.articleId)))
    .where(eq(classroomStudents.studentId, params.user.id));
  for (const target of targets) {
    const existing = (await raw
      .select({ appStep: primaryStudentLessonSteps.appStep, status: primaryStudentLessonSteps.status, startedAt: primaryStudentLessonSteps.startedAt, doneAt: primaryStudentLessonSteps.doneAt })
      .from(primaryStudentLessonSteps)
      .where(
        and(
          eq(primaryStudentLessonSteps.classBookId, target.classBookId),
          eq(primaryStudentLessonSteps.studentId, params.user.id),
          eq(primaryStudentLessonSteps.lessonNumber, target.lessonNumber),
        ),
      )) as Pick<StepRow, "appStep" | "status" | "startedAt" | "doneAt">[];
    const byStep = new Map(existing.map((row) => [row.appStep, row]));
    for (let appStep = 1; appStep <= input.reachedStep; appStep++) {
      const row = byStep.get(appStep);
      if (row?.status === "done") continue;
      const done = appStep < input.reachedStep;
      const values = {
        classBookId: target.classBookId,
        studentId: params.user.id,
        lessonNumber: target.lessonNumber,
        appStep,
        status: done ? "done" : "in_progress",
        startedAt: row?.startedAt ?? now,
        doneAt: done ? now : null,
        seconds: input.seconds,
        updatedAt: now,
      };
      await raw
        .insert(primaryStudentLessonSteps)
        .values(values)
        .onConflictDoUpdate({
          target: [primaryStudentLessonSteps.classBookId, primaryStudentLessonSteps.studentId, primaryStudentLessonSteps.lessonNumber, primaryStudentLessonSteps.appStep],
          set: { status: values.status, startedAt: values.startedAt, doneAt: values.doneAt, seconds: values.seconds, updatedAt: now },
        });
    }
  }
  return targets.length;
}

/**
 * Folds the step rows of one student and one lesson into a grid cell.
 * @param studentId The student.
 * @param lesson The lesson with its taught time.
 * @param rows The step rows of this student and lesson.
 * @param now The current time, for the stuck flag.
 * @returns The cell.
 */
function toCell(studentId: string, lesson: { number: number; taughtAt: Date | null }, rows: StepRow[], now: Date): ProgressCell {
  const doneSteps = rows.filter((row) => row.status === "done").length;
  const inProgress = rows.filter((row) => row.status === "in_progress").map((row) => row.appStep);
  const finished = doneSteps >= APP_STEP_COUNT || rows.some((row) => row.appStep === APP_STEP_COUNT && row.status === "done");
  const status: StepStatus = finished ? "done" : rows.length ? "in_progress" : "not_started";
  const starts = rows.map((row) => row.startedAt).filter((date): date is Date => date !== null);
  const firstStartedAt = starts.length ? new Date(Math.min(...starts.map((date) => date.getTime()))) : null;
  const lastAt = rows.length ? new Date(Math.max(...rows.map((row) => row.updatedAt.getTime()))) : null;
  const later = (row: StepRow, best: StepRow) => row.updatedAt > best.updatedAt || (row.updatedAt.getTime() === best.updatedAt.getTime() && row.appStep > best.appStep);
  const latest = rows.reduce<StepRow | null>((best, row) => (best === null || later(row, best) ? row : best), null);
  return {
    studentId,
    lessonNumber: lesson.number,
    status,
    doneSteps,
    currentStep: inProgress.length ? Math.min(...inProgress) : null,
    seconds: latest?.seconds ?? 0,
    firstStartedAt,
    lastAt,
    late: lesson.taughtAt !== null && status !== "done",
    stuck: status === "in_progress" && lastAt !== null && now.getTime() - lastAt.getTime() > STUCK_DAYS * 86_400_000,
    openedBeforeTaught: firstStartedAt !== null && (lesson.taughtAt === null || firstStartedAt < lesson.taughtAt),
  };
}

/**
 * Reads the roster, the lessons, the taught times, and the step rows of a class book.
 * @param params The database, the teacher, and the class book.
 * @returns The parts of the grid.
 */
async function loadProgressParts(params: Ctx & { classBookId: string }) {
  const book = await managedClassBook(params, params.classBookId);
  const raw = createTenantDB(params.db, { schoolId: params.user.schoolId }).unscoped(UNSCOPED_REASON);
  const [students, lessons, states, steps] = await Promise.all([
    raw
      .select({ id: users.id, name: users.name, username: users.username })
      .from(classroomStudents)
      .innerJoin(users, eq(users.id, classroomStudents.studentId))
      .where(eq(classroomStudents.classroomId, book.classroomId))
      .orderBy(asc(users.name), asc(users.username)),
    raw
      .select({ number: primaryBookLessons.number, title: primaryBookLessons.title })
      .from(primaryBookLessons)
      .where(eq(primaryBookLessons.bookId, book.bookId))
      .orderBy(asc(primaryBookLessons.number)),
    raw
      .select({ lessonNumber: primaryClassBookLessons.lessonNumber, taughtAt: primaryClassBookLessons.taughtAt })
      .from(primaryClassBookLessons)
      .where(eq(primaryClassBookLessons.classBookId, params.classBookId)),
    raw
      .select({
        studentId: primaryStudentLessonSteps.studentId,
        lessonNumber: primaryStudentLessonSteps.lessonNumber,
        appStep: primaryStudentLessonSteps.appStep,
        status: primaryStudentLessonSteps.status,
        startedAt: primaryStudentLessonSteps.startedAt,
        doneAt: primaryStudentLessonSteps.doneAt,
        seconds: primaryStudentLessonSteps.seconds,
        updatedAt: primaryStudentLessonSteps.updatedAt,
      })
      .from(primaryStudentLessonSteps)
      .where(eq(primaryStudentLessonSteps.classBookId, params.classBookId)),
  ]);
  const taughtBy = new Map(states.map((state) => [state.lessonNumber, state.taughtAt]));
  const taught = states.filter((state) => state.taughtAt).length;
  return {
    classBook: toClassBook(book, taught),
    students,
    lessons: lessons.map((lesson) => ({ number: lesson.number, title: lesson.title, taughtAt: taughtBy.get(lesson.number) ?? null })),
    steps: steps as (StepRow & { studentId: string })[],
  };
}

/**
 * The class grid of a class book (FR-6): every student by every lesson with a status, the
 * late, stuck, and not-started flags for the filters, and the fidelity signal (FR-7).
 * @param params The database, the teacher, the class book, and the current time.
 * @returns The grid.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class.
 */
export async function getClassBookProgress(params: Ctx & { classBookId: string }): Promise<ClassBookProgress> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  const now = params.now ?? new Date();
  const { classBook, students, lessons, steps } = await loadProgressParts(params);
  const cells = students.flatMap((student) =>
    lessons.map((lesson) =>
      toCell(
        student.id,
        lesson,
        steps.filter((row) => row.studentId === student.id && row.lessonNumber === lesson.number),
        now,
      ),
    ),
  );
  return { classBook, students, lessons, cells };
}

/**
 * The drill-down of one student (FR-6 click-through): every lesson with its 14 app steps.
 * @param params The database, the teacher, the class book, and the student.
 * @returns The student's steps.
 * @throws {AuthError} FORBIDDEN when the user may not manage the class or the student is not in it.
 */
export async function getStudentLessonSteps(params: Ctx & { classBookId: string; studentId: string }): Promise<StudentLessonSteps> {
  assertCan(params.user, "class:read", { schoolId: params.user.schoolId });
  const { classBook, students, lessons, steps } = await loadProgressParts(params);
  const student = students.find((row) => row.id === params.studentId);
  if (!student) throw new AuthError("The student is not in this class", "FORBIDDEN");
  return {
    classBook,
    student,
    lessons: lessons.map((lesson) => ({
      ...lesson,
      steps: Array.from({ length: APP_STEP_COUNT }, (_, index) => {
        const appStep = index + 1;
        const row = steps.find((step) => step.studentId === student.id && step.lessonNumber === lesson.number && step.appStep === appStep);
        return {
          appStep,
          status: (row?.status as StepStatus | undefined) ?? "not_started",
          startedAt: row?.startedAt ?? null,
          doneAt: row?.doneAt ?? null,
          seconds: row?.seconds ?? 0,
        };
      }),
    })),
  };
}

/**
 * Formats the class grid as CSV (FR-6 export): one row per student and lesson.
 * @param progress The grid.
 * @returns The CSV text with a header row.
 */
export function toProgressCsv(progress: ClassBookProgress): string {
  const quote = (value: string | number | boolean | null) => {
    const text = value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ["student", "username", "lesson", "title", "status", "done_steps", "seconds", "first_started_at", "last_at", "late", "stuck", "opened_before_taught"];
  const studentBy = new Map(progress.students.map((student) => [student.id, student]));
  const lessonBy = new Map(progress.lessons.map((lesson) => [lesson.number, lesson]));
  const rows = progress.cells.map((cell) => {
    const student = studentBy.get(cell.studentId);
    const lesson = lessonBy.get(cell.lessonNumber);
    return [
      student?.name ?? "",
      student?.username ?? "",
      cell.lessonNumber,
      lesson?.title ?? "",
      cell.status,
      cell.doneSteps,
      cell.seconds,
      cell.firstStartedAt?.toISOString() ?? null,
      cell.lastAt?.toISOString() ?? null,
      cell.late,
      cell.stuck,
      cell.openedBeforeTaught,
    ]
      .map(quote)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n") + "\n";
}
