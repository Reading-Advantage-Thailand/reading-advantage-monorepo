import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { BookMarkedIcon, BookOpenIcon, CalendarIcon, FlameIcon, Gamepad2Icon, StarIcon, TrophyIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getStudentHome } from "@reading-advantage/domain/primary-home";
import { getStudentClassBooks, type StudentClassBook } from "@reading-advantage/domain/primary-books";
import { getDueDateStatus } from "@reading-advantage/domain/assignments/due-date";
import { EmptyState, StatusChip, cardHoverClassName } from "@reading-advantage/ui";
import { AnimatedCounter } from "@reading-advantage/ui/client";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Leaderboard from "@/components/leaderboard";
import { ReedyMeterSlot } from "@/components/student/reedy-meter-slot";
import { getSchoolLeaderboardController } from "@/server/controllers/schoolController";

/** Card frame shared by the home sections. */
const CARD = "bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border p-5 shadow-sm";
/** Large action link (48 px tap target). */
const ACTION = "min-h-12 w-full rounded-xl px-5 text-base sm:w-auto";

/**
 * Page title for the student home.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StudentHome");
  return { title: t("title") };
}

/**
 * Reads the school leaderboard. A failure hides the leaderboard and keeps the rest of the home.
 * @param user The signed-in student.
 * @returns The leaderboard data, or null.
 */
async function loadLeaderboard(user: { id: string; schoolId: string | null }) {
  if (!user.schoolId) return null;
  try {
    const result = await getSchoolLeaderboardController(user.schoolId, user.id);
    return result?.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Reads the class books of the student. A failure hides the cards and keeps the rest of the home.
 * @param user The signed-in student.
 * @returns The class books, or none.
 */
async function loadClassBooks(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): Promise<StudentClassBook[]> {
  try {
    return await getStudentClassBooks({ db, user });
  } catch {
    return [];
  }
}

/**
 * Student home (FR-4), the landing page after sign-in: streak, XP, and level; today's lesson
 * (the next open assignment, hidden when there is none); the class books with the current
 * lesson; the article to continue; a games
 * shortcut; the Reedy meter slot; and the school leaderboard.
 * @returns The home page.
 */
export default async function StudentHomePage() {
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });

  const [home, classBooks, leaderboard, t, tBoard, format] = await Promise.all([
    getStudentHome({ db, user }),
    loadClassBooks(user),
    loadLeaderboard(user),
    getTranslations("StudentHome"),
    getTranslations("Leaderboard"),
    getFormatter(),
  ]);
  const lesson = home.todayLesson;
  const reading = home.continueReading;
  // Calendar days in Bangkok: the lesson is late only after its due day.
  const overdue = getDueDateStatus(lesson?.dueDate).kind === "overdue";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("greeting", { name: user.name ?? user.username })}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      <section aria-label={t("progress")} className="grid grid-cols-3 gap-3">
        <StatTile icon={<FlameIcon />} label={t("streak")} tone="bg-(--accent-amber-light) text-amber-700 dark:text-amber-300">
          {t("streakValue", { count: home.streakDays })}
        </StatTile>
        <StatTile icon={<StarIcon />} label={t("xp")} tone="bg-brand-100 text-brand-700 dark:text-brand-300">
          <AnimatedCounter value={home.xp} />
        </StatTile>
        <StatTile icon={<TrophyIcon />} label={t("level")} tone="bg-(--accent-blue-light) text-blue-700 dark:text-blue-300">
          {home.level}
        </StatTile>
      </section>

      <ReedyMeterSlot />

      <div className="grid gap-4 md:grid-cols-2">
        {lesson ? (
          <section aria-labelledby="home-lesson" className={cn(CARD, "bg-primary text-primary-foreground border-transparent md:col-span-2")}>
            <h2 id="home-lesson" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide opacity-90">
              <CalendarIcon className="size-4" aria-hidden="true" />
              {t("todayLesson")}
            </h2>
            <p className="text-xl font-bold">{lesson.title}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                {lesson.dueDate
                  ? t("dueDate", { date: format.dateTime(lesson.dueDate, { day: "numeric", month: "short" }) })
                  : t("noDueDate")}
              </span>
              {overdue ? <StatusChip tone="danger">{t("overdue")}</StatusChip> : null}
            </div>
            <Link
              href={`/student/lesson/${lesson.assignmentId}`}
              className={cn(buttonVariants({ variant: "secondary" }), ACTION, "mt-1 self-start")}
            >
              {lesson.started ? t("continueLesson") : t("startLesson")}
            </Link>
          </section>
        ) : null}

        {classBooks.map((book) => (
          <ClassBookCard key={book.classBookId} book={book} t={t} />
        ))}

        <section aria-labelledby="home-reading" className={CARD}>
          <h2 id="home-reading" className="flex items-center gap-2 text-lg font-semibold">
            <BookOpenIcon className="text-primary size-5" aria-hidden="true" />
            {t("continueReading")}
          </h2>
          {reading ? (
            <>
              <p className="font-article text-xl font-bold">{reading.title}</p>
              {reading.cefrLevel ? <StatusChip tone="success">{reading.cefrLevel}</StatusChip> : null}
              <Link
                href={`/student/read/${reading.articleId}`}
                className={cn(buttonVariants({ variant: "default" }), ACTION, "mt-auto self-start", cardHoverClassName)}
              >
                {t("keepReading")}
              </Link>
            </>
          ) : (
            <EmptyState
              className="py-4"
              icon={<BookOpenIcon />}
              title={t("noReading")}
              description={t("noReadingHint")}
              action={
                <Link href="/student/read" className={cn(buttonVariants({ variant: "default" }), ACTION)}>
                  {t("findStory")}
                </Link>
              }
            />
          )}
        </section>

        <section aria-labelledby="home-games" className={CARD}>
          <h2 id="home-games" className="flex items-center gap-2 text-lg font-semibold">
            <Gamepad2Icon className="text-primary size-5" aria-hidden="true" />
            {t("games")}
          </h2>
          <p className="text-muted-foreground">{t("gamesHint")}</p>
          <Link
            href="/student/games"
            className={cn(buttonVariants({ variant: "outline" }), ACTION, "mt-auto self-start", cardHoverClassName)}
          >
            {t("playGames")}
          </Link>
        </section>
      </div>

      {leaderboard ? (
        <section aria-label={tBoard("title")} className={cn(CARD, "overflow-x-auto")}>
          <Leaderboard data={leaderboard.results ?? []} schoolName={leaderboard.schoolName ?? ""} userId={user.id} />
        </section>
      ) : null}
    </div>
  );
}

/**
 * The class book card (FR-4): the book, the current lesson, and the read link when the teacher
 * has opened the reading step (or the class reads independently).
 * @param props.book The class book of the student.
 * @param props.t The StudentHome translator.
 * @returns The card.
 */
function ClassBookCard({ book, t }: { book: StudentClassBook; t: Awaited<ReturnType<typeof getTranslations<"StudentHome">>> }) {
  const headingId = `home-book-${book.classBookId}`;
  const lesson = book.lesson;
  const canRead = lesson?.articleId && lesson.unlockedAppSteps.includes(3);
  return (
    <section aria-labelledby={headingId} className={CARD}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <BookMarkedIcon className="text-primary size-5" aria-hidden="true" />
        {t("classBook")}
      </h2>
      <p className="font-semibold">{book.bookName}</p>
      {lesson ? (
        <>
          <p className="font-article text-xl font-bold">{t("classBookLesson", { number: lesson.number, title: lesson.title })}</p>
          {canRead ? (
            <Link href={`/student/lesson/${lesson.articleId}?type=article`} className={cn(buttonVariants({ variant: "default" }), ACTION, "self-start", cardHoverClassName)}>
              {t("readLesson")}
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">{t("classBookLocked")}</p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{t("classBookNoLesson")}</p>
      )}
      <Link href={`/student/books/${book.classBookId}`} className={cn(buttonVariants({ variant: "outline" }), ACTION, "mt-auto self-start")}>
        {t("seeBook")}
      </Link>
    </section>
  );
}

/**
 * One progress number with its icon and label.
 * @param props The icon, the label, the color classes for the icon circle, and the value.
 * @returns The tile.
 */
function StatTile({
  icon,
  label,
  tone,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col items-center gap-1 rounded-2xl border p-3 text-center shadow-sm">
      <span aria-hidden="true" className={cn("flex size-9 items-center justify-center rounded-full [&>svg]:size-5", tone)}>
        {icon}
      </span>
      <span className="text-lg leading-tight font-bold">{children}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
