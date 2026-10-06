import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getClassBookProgress, type ClassBookProgress, type ProgressCell } from "@reading-advantage/domain/primary-books";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CELL_TONE } from "@/components/teacher/class-book-progress-tone";
import { TEACHER_ACTION, TEACHER_BACK_LINK, TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";

type Params = Promise<{ classroomId: string; classBookId: string }>;

/** The grid filters (FR-6). */
const FILTERS = ["all", "late", "stuck", "not_started"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * Page title: the class progress.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook.progress");
  return { title: t("title") };
}

/**
 * True when the cell matches the filter.
 * @param cell The cell.
 * @param filter The active filter.
 * @returns Whether the cell matches.
 */
function matches(cell: ProgressCell, filter: Filter): boolean {
  if (filter === "late") return cell.late;
  if (filter === "stuck") return cell.stuck;
  if (filter === "not_started") return cell.status === "not_started";
  return true;
}

/**
 * Reads the grid; null when the class book is unknown or not the teacher's.
 * @param user The signed-in teacher.
 * @param classBookId The class book.
 * @returns The grid, or null.
 */
async function loadProgress(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, classBookId: string): Promise<ClassBookProgress | null> {
  try {
    return await getClassBookProgress({ db, user, classBookId });
  } catch {
    return null;
  }
}

/**
 * The class grid of a class book (FR-6): students by lessons with a status color, the late,
 * stuck, and not-started filters, a click-through to one student, and the CSV export.
 * @param props.params The class and the class book.
 * @param props.searchParams The filter.
 * @returns The page.
 */
export default async function ClassBookProgressPage({ params, searchParams }: { params: Params; searchParams: Promise<{ filter?: string }> }) {
  const { classroomId, classBookId } = await params;
  const { filter: rawFilter } = await searchParams;
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });
  const progress = await loadProgress(user, classBookId);
  if (!progress) notFound();
  const t = await getTranslations("TeacherUi.classBook.progress");
  const filter: Filter = (FILTERS as readonly string[]).includes(rawFilter ?? "") ? (rawFilter as Filter) : "all";
  const base = `/teacher/class-roster/${classroomId}/books/${classBookId}`;
  const cellOf = (studentId: string, lessonNumber: number) => progress.cells.find((cell) => cell.studentId === studentId && cell.lessonNumber === lessonNumber);
  const students = progress.students.filter((student) => filter === "all" || progress.lessons.some((lesson) => matches(cellOf(student.id, lesson.number)!, filter)));

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        title={t("title")}
        description={progress.classBook.bookName}
        back={
          <Link href={base} className={TEACHER_BACK_LINK}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("backToPlan")}
          </Link>
        }
        actions={
          <a href={`/api/class-books/${classBookId}/progress`} download className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION)}>
            <DownloadIcon aria-hidden="true" />
            {t("csv")}
          </a>
        }
      />

      <nav aria-label={t("filters")} className="flex flex-wrap gap-2">
        {FILTERS.map((name) => (
          <Link
            key={name}
            href={name === "all" ? `${base}/progress` : `${base}/progress?filter=${name}`}
            aria-current={name === filter ? "page" : undefined}
            className={cn(buttonVariants({ variant: name === filter ? "default" : "outline" }), TEACHER_ACTION)}
          >
            {t(`filter.${name}`)}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="progress-grid" className={cn(TEACHER_CARD, "overflow-x-auto")}>
        <h2 id="progress-grid" className="text-lg font-semibold">
          {t("grid")}
        </h2>
        {progress.students.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noStudents")}</p>
        ) : students.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t("gridCaption")}</caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-2 text-left">
                  {t("student")}
                </th>
                {progress.lessons.map((lesson) => (
                  <th key={lesson.number} scope="col" className="px-1 py-1 text-center whitespace-nowrap">
                    {t("lessonShort", { number: lesson.number })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const name = student.name ?? student.username;
                return (
                  <tr key={student.id}>
                    <th scope="row" className="py-1 pr-2 text-left font-medium whitespace-nowrap">
                      {name}
                    </th>
                    {progress.lessons.map((lesson) => {
                      const cell = cellOf(student.id, lesson.number)!;
                      return (
                        <td key={lesson.number} className="p-1 text-center">
                          <Link
                            href={`${base}/progress/${student.id}`}
                            aria-label={t("cell", { student: name, lesson: lesson.number, status: t(`status.${cell.status}`), done: cell.doneSteps })}
                            className={cn("inline-flex min-h-9 min-w-10 items-center justify-center rounded-md px-1 text-xs font-semibold", CELL_TONE[cell.status], cell.late && "ring-2 ring-red-400")}
                          >
                            {cell.doneSteps}/14
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="text-muted-foreground text-xs">{t("legend")}</p>
      </section>
    </div>
  );
}
