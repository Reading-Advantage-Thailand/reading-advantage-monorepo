import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getStudentBook, type StudentBook } from "@reading-advantage/domain/primary-books";
import { StatusChip, cardHoverClassName } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type Params = Promise<{ classBookId: string }>;

/** Card frame of one lesson row. */
const CARD = "bg-card text-card-foreground flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm";

/**
 * Page title: the student's book.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StudentHome");
  return { title: t("classBook") };
}

/**
 * Reads the student's book; null when the class book is not in one of the student's classes.
 * @param user The signed-in student.
 * @param classBookId The class book.
 * @returns The book with its lessons, or null.
 */
async function loadBook(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, classBookId: string): Promise<StudentBook | null> {
  try {
    return await getStudentBook({ db, user, classBookId });
  } catch {
    return null;
  }
}

/**
 * The book view of a student (FR-4): every lesson of the class book with the current marker. A
 * student reads a lesson the class has taught, an earlier lesson, the current lesson once the
 * teacher opened the reading step, or any published lesson in independent mode.
 * @param props.params The class book.
 * @returns The page.
 */
export default async function StudentBookPage({ params }: { params: Params }) {
  const { classBookId } = await params;
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });
  const book = await loadBook(user, classBookId);
  if (!book) notFound();
  const t = await getTranslations("StudentHome.book");
  const readingOpen = book.lesson?.unlockedAppSteps.includes(3) ?? false;
  const canRead = (lesson: StudentBook["lessons"][number]) =>
    lesson.articleId !== null && (book.mode === "independent" || lesson.taught || lesson.number < book.currentLesson || (lesson.current && readingOpen));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/student/home" className="text-muted-foreground hover:text-foreground inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium [&>svg]:size-4">
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{book.bookName}</h1>
        <p className="text-muted-foreground">{t("progress", { current: book.currentLesson, total: book.lessonCount })}</p>
      </header>
      <ol aria-label={t("lessons")} className="flex flex-col gap-3">
        {book.lessons.map((lesson) => (
          <li key={lesson.number} aria-current={lesson.current ? "step" : undefined} className={cn(CARD, lesson.current && "border-primary")}>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-muted-foreground text-sm">{t("lesson", { number: lesson.number })}</span>
              <span className="font-article text-lg font-bold">{lesson.title}</span>
              {lesson.current ? <StatusChip tone="info">{t("current")}</StatusChip> : lesson.taught ? <StatusChip tone="success">{t("taught")}</StatusChip> : null}
            </div>
            {canRead(lesson) ? (
              <Link href={`/student/read/${lesson.articleId}`} className={cn(buttonVariants({ variant: "default" }), "min-h-12 rounded-xl px-5 text-base", cardHoverClassName)}>
                {t("read")}
              </Link>
            ) : (
              <span className="text-muted-foreground text-sm">{t("notYet")}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
