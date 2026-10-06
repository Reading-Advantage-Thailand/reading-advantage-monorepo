import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheckIcon, LifeBuoyIcon, PlayIcon, SchoolIcon, SmileIcon, UsersIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getTeacherHome, TEACHER_HOME_INACTIVE_DAYS } from "@reading-advantage/domain/primary-home";
import { calendarDayNumber } from "@reading-advantage/domain/calendar-day";
import { EmptyState, StatusChip } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ClassBookSlot } from "@/components/teacher/class-book-slot";
import { getTeacherQuestCard } from "@reading-advantage/domain/primary-quest";
import { TeacherQuestCard } from "@/components/quest/teacher-quest-card";
import { DueChip } from "@/components/teacher/due-chip";
import { TEACHER_ACTION, TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";

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
 * Teacher dashboard (Lane C Phase 3, audit T1): the summary numbers; my classes with student
 * counts, a link to each class, and "Start class" (it opens the class page at the class sign-in
 * panel); the class book slot (Lane D+E); the open assignments with Bangkok due chips; and the
 * students who need help (overdue work, or no activity for 7 days). A load failure goes to the
 * route error boundary (error.tsx), which offers a retry.
 * @returns The dashboard page.
 */
export default async function TeacherDashboardPage() {
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });

  const [home, t, tUi, format] = await Promise.all([
    getTeacherHome({ db, user }),
    getTranslations("TeacherHome"),
    getTranslations("TeacherUi"),
    getFormatter(),
  ]);
  const quests = await Promise.all(home.classes.map((cls) => getTeacherQuestCard({ db, user }, cls.id).catch(() => null)));
  const today = calendarDayNumber(new Date());
  const moreHelp = home.needsHelpCount - home.needsHelp.length;

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader title={t("greeting", { name: user.name ?? user.username })} description={t("subtitle")} />

      <section aria-label={t("summary")} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<SchoolIcon />} label={t("stats.classes")} value={home.classes.length} />
        <StatTile icon={<UsersIcon />} label={t("stats.students")} value={home.studentCount} />
        <StatTile icon={<ClipboardCheckIcon />} label={t("stats.openAssignments")} value={home.openAssignmentCount} />
        <StatTile icon={<LifeBuoyIcon />} label={t("stats.needsHelp")} value={home.needsHelpCount} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="home-classes" className={cn(TEACHER_CARD, "lg:col-span-2")}>
          <h2 id="home-classes" className="text-lg font-semibold">
            {t("classes.heading")}
          </h2>
          {home.classes.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {home.classes.map((cls) => (
                <li key={cls.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/teacher/class-roster/${cls.id}`} className={ROW_LINK}>
                      {cls.name}
                    </Link>
                    <p className="text-muted-foreground flex flex-wrap gap-x-2 text-sm">
                      <span>{t("classes.students", { count: cls.studentCount })}</span>
                      {cls.grade !== null ? <span>{t("classes.grade", { grade: cls.grade })}</span> : null}
                    </p>
                  </div>
                  <Link
                    href={`/teacher/class-roster/${cls.id}#class-login`}
                    aria-label={tUi("startClassFor", { name: cls.name })}
                    className={cn(buttonVariants({ variant: "default" }), TEACHER_ACTION, "px-4")}
                  >
                    <PlayIcon aria-hidden="true" />
                    {tUi("startClass")}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="py-4"
              icon={<SchoolIcon />}
              title={t("classes.empty")}
              description={t("classes.emptyHint")}
              action={
                <Link href="/teacher/my-classes" className={cn(buttonVariants({ variant: "default" }), TEACHER_ACTION, "px-5")}>
                  {t("classes.goToClasses")}
                </Link>
              }
            />
          )}
        </section>

        <ClassBookSlot className="lg:col-span-2" />
        {home.classes.map((cls, i) => (
          <TeacherQuestCard key={cls.id} classroomId={cls.id} card={quests[i] ?? null} heading={`${t("quest")} · ${cls.name}`} />
        ))}

        <section aria-labelledby="home-assignments" className={TEACHER_CARD}>
          <h2 id="home-assignments" className="text-lg font-semibold">
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
          <Link href="/teacher/assignments" className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "mt-auto self-start px-5")}>
            {t("assignments.all")}
          </Link>
        </section>

        <section aria-labelledby="home-help" className={TEACHER_CARD}>
          <div className="flex flex-col gap-1">
            <h2 id="home-help" className="text-lg font-semibold">
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
            <Link href="/teacher/reports" className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "mt-auto self-start px-5")}>
              {t("help.more", { count: moreHelp })}
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}

/**
 * One summary number with its icon and label.
 * @param props The icon, the label, and the value.
 * @returns The tile.
 */
function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-card flex flex-col items-center gap-1 rounded-2xl border p-3 text-center shadow-sm">
      <span aria-hidden="true" className="bg-brand-100 text-brand-700 dark:text-brand-300 flex size-9 items-center justify-center rounded-full [&>svg]:size-5">
        {icon}
      </span>
      <span className="text-xl leading-tight font-bold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
