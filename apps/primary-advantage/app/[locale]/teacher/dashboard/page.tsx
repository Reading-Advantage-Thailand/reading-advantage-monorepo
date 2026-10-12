import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheckIcon, SmileIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getTeacherHome, TEACHER_HOME_INACTIVE_DAYS } from "@reading-advantage/domain/primary-home";
import { getTeacherBookSlots } from "@reading-advantage/domain/primary-books";
import { logger } from "@/lib/observability/logger";
import { calendarDayNumber } from "@reading-advantage/domain/calendar-day";
import { EmptyState, StatusChip } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Scene } from "@/components/rpg/scene";
import { Panel, RpgLink } from "@/components/rpg/chrome";
import { TeacherClassTable } from "@/components/teacher/teacher-class-table";
import { TeacherSummaryStrip } from "@/components/teacher/teacher-summary-strip";
import { ClassBookSlot } from "@/components/teacher/class-book-slot";
import { getTeacherQuestCard } from "@reading-advantage/domain/primary-quest";
import { TeacherQuestCard } from "@/components/quest/teacher-quest-card";
import { DueChip } from "@/components/teacher/due-chip";
import { TEACHER_ACTION } from "@/components/teacher/teacher-shell";

/** A text link inside a list row: 44 px tall so it is easy to tap. */
const ROW_LINK = cn(TEACHER_ACTION, "inline-flex items-center font-semibold break-words underline-offset-4 hover:underline");
/** One list row. */
const ROW = "flex flex-col gap-1 border-t py-2 first:border-t-0";

/**
 * Page title for the teacher dashboard.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherHome");
  return { title: t("title") };
}

/**
 * Teacher dashboard (guild hall scene): the summary strip of eight numbers; the class table with
 * search, sort, CSV, a link to each class, and "Start class"; the class book slot; one Class Quest
 * panel for each class; the open assignments with Bangkok due chips; and the students who need
 * help (overdue work, or no activity for 7 days). A load failure goes to the route error
 * boundary (error.tsx), which offers a retry.
 * @returns The dashboard page.
 */
export default async function TeacherDashboardPage() {
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });

  const [home, t, format] = await Promise.all([
    getTeacherHome({ db, user }),
    getTranslations("TeacherHome"),
    getFormatter(),
  ]);
  const quests = await Promise.all(home.classes.map((cls) => getTeacherQuestCard({ db, user }, cls.id).catch(() => null)));
  const bookSlots = await getTeacherBookSlots({ db, user }).catch((error: unknown) => {
    logger.error("class_books.slot_failed", { userId: user.id, error });
    return null;
  });
  const today = calendarDayNumber(new Date());
  const moreHelp = home.needsHelpCount - home.needsHelp.length;

  return (
    <Scene place="guild-hall" contained className="px-1 py-4 sm:px-3">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-3xl font-bold break-words">{t("greeting", { name: user.name ?? user.username })}</h1>
        <p className="text-lg">{t("subtitle")}</p>
      </header>

      <TeacherSummaryStrip home={home} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TeacherClassTable rows={home.classRows} className="lg:col-span-2" />

        <ClassBookSlot slots={bookSlots ?? undefined} failed={bookSlots === null} className="lg:col-span-2" />
        {home.classes.map((cls, i) => (
          <TeacherQuestCard key={cls.id} panel classroomId={cls.id} card={quests[i] ?? null} heading={`${t("quest")} · ${cls.name}`} />
        ))}

        <Panel aria-labelledby="home-assignments">
          <h2 id="home-assignments" className="text-xl font-bold">
            {t("assignments.heading")}
          </h2>
          {home.openAssignments.length ? (
            <ul>
              {home.openAssignments.map((assignment) => (
                <li key={assignment.id} className={ROW}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3">
                    <Link href={`/teacher/assignments/${assignment.id}`} className={ROW_LINK}>
                      {assignment.title}
                    </Link>
                    <DueChip dueDate={assignment.dueDate} />
                  </div>
                  <p className="text-muted-foreground flex flex-wrap gap-x-2 text-sm">
                    <span>{assignment.classroomName}</span>
                    <span>{t("assignments.progress", { completed: assignment.completed, assigned: assignment.assigned })}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="py-4" icon={<ClipboardCheckIcon />} title={t("assignments.empty")} description={t("assignments.emptyHint")} />
          )}
          <div className="mt-auto">
            <RpgLink small href="/teacher/assignments" tone="wood">
              {t("assignments.all")}
            </RpgLink>
          </div>
        </Panel>

        <Panel aria-labelledby="home-help">
          <div className="flex flex-col gap-1">
            <h2 id="home-help" className="text-xl font-bold">
              {t("help.heading")}
            </h2>
            <p className="text-muted-foreground text-sm">{t("help.hint", { days: TEACHER_HOME_INACTIVE_DAYS })}</p>
          </div>
          {home.needsHelp.length ? (
            <ul>
              {home.needsHelp.map((student) => {
                const inactive = student.lastActiveAt && today - calendarDayNumber(student.lastActiveAt) >= TEACHER_HOME_INACTIVE_DAYS;
                return (
                  <li key={student.studentId} className={ROW}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3">
                      <Link href={`/teacher/student-progress/${student.studentId}`} className={ROW_LINK}>
                        {student.name}
                      </Link>
                      <div className="flex flex-wrap gap-1">
                        {student.overdueCount > 0 ? <StatusChip tone="danger">{t("help.late", { count: student.overdueCount })}</StatusChip> : null}
                        {!student.lastActiveAt ? <StatusChip tone="warning">{t("help.neverActive")}</StatusChip> : null}
                        {inactive ? (
                          <StatusChip tone="warning">
                            {t("help.inactive", { date: format.dateTime(student.lastActiveAt!, { day: "numeric", month: "short" }) })}
                          </StatusChip>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{student.classroomName}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState className="py-4" icon={<SmileIcon />} title={t("help.empty")} description={t("help.emptyHint")} />
          )}
          {moreHelp > 0 ? (
            <div className="mt-auto">
              <RpgLink small href="/teacher/reports" tone="wood">
                {t("help.more", { count: moreHelp })}
              </RpgLink>
            </div>
          ) : null}
        </Panel>
      </div>
    </Scene>
  );
}
