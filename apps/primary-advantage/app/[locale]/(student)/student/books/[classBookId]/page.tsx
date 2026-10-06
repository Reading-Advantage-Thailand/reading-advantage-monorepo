import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getStudentBook, type StudentBook } from "@reading-advantage/domain/primary-books";
import { RpgLink, Sign } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import { Scene } from "@/components/rpg/scene";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

type Params = Promise<{ classBookId: string }>;

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

  // The book open on the library desk: lessons as pages, a locked lesson sealed (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="library">
      <RpgLink href="/student/home" tone="iron" small className="w-fit">
        {t("back")}
      </RpgLink>
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{book.bookName}</h1>
        <p>{t("progress", { current: book.currentLesson, total: book.lessonCount })}</p>
      </header>
      <ol aria-label={t("lessons")} className="flex flex-col gap-3">
        {book.lessons.map((lesson) => (
          <li key={lesson.number} aria-current={lesson.current ? "step" : undefined} className={cn("cq-panel flex flex-wrap items-center justify-between gap-3", lesson.current && "cq-pin")}>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="cq-muted text-sm">{t("lesson", { number: lesson.number })}</span>
              <span className="font-article text-lg font-bold">{lesson.title}</span>
              {lesson.current ? <Sign small className="w-fit text-sm">{t("current")}</Sign> : lesson.taught ? <span className="cq-item-lock w-fit">{t("taught")}</span> : null}
            </div>
            {canRead(lesson) ? (
              <RpgLink href={`/student/lesson/${lesson.articleId}?type=article`} tone="gold">
                {t("read")}
              </RpgLink>
            ) : (
              <span className="cq-item-lock">{t("notYet")}</span>
            )}
          </li>
        ))}
      </ol>
    </Scene>
  );
}
