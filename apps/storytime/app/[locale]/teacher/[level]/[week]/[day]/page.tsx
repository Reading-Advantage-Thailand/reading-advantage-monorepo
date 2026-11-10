import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadWeek } from "../../../../../../lib/content";
import {
  parseTeacherDay,
  parseTeacherRoute,
  teacherRoutesEnabled,
} from "../../../../../../lib/teacher";
import { requireRole } from "../../../../../../lib/auth";
import TeacherForbidden from "../../../forbidden";

/**
 * The teacher lesson route `/<locale>/teacher/<level>/<week>/<day>` (spec FR-9, plan task 4.1).
 *
 * The route answers 404 while the teacher routes are off. The switch is a server-side value, and
 * the route reads it at request time.
 *
 * The route answers 404 for an unknown level, an unknown week, an unknown day, and a week that
 * breaks the contract. The lesson flow of task 4.3 comes later. This route holds the day title
 * and the way back to the week.
 *
 * The route needs a teacher session (AC-4.6). The order of the checks is fixed: a visitor without
 * a session goes to the sign-in page, the teacher switch answers 404 for every session, a
 * session of another role answers the 403 page, and only then does the week load.
 */

/**
 * The content changes with each deploy, so the route renders at request time.
 */
export const dynamic = "force-dynamic";

/**
 * Marks the page as out of the search index.
 * @returns The page metadata.
 */
export function generateMetadata(): Metadata {
  return { robots: "noindex, nofollow" };
}

/**
 * Renders the placeholder of one lesson day.
 * @param props.params The locale, the level, the week, and the day segments.
 * @returns The placeholder of the day, or the 404 view.
 */
export default async function TeacherDayPage({
  params,
}: {
  params: Promise<{ locale: string; level: string; week: string; day: string }>;
}) {
  const {
    locale,
    level: levelSegment,
    week: weekSegment,
    day: daySegment,
  } = await params;
  const returnPath = `/${locale}/teacher/${levelSegment}/${weekSegment}/${daySegment}`;
  const teacher = await requireRole("teacher", returnPath);
  if (!teacherRoutesEnabled()) notFound();
  if (!teacher) {
    const translate = await getTranslations({ locale });
    const t = (key: string) => translate(key);
    return (
      <TeacherForbidden
        heading={t("teacherForbiddenHeading")}
        line={t("teacherForbiddenLine")}
        link={t("teacherForbiddenLink")}
        href={`/${locale}/sign-in?next=${encodeURIComponent(returnPath)}`}
      />
    );
  }

  const route = parseTeacherRoute(levelSegment, weekSegment);
  const day = parseTeacherDay(daySegment);
  if (route === null || day === null) notFound();

  const loaded = await loadWeek(route.level, route.week);
  if (loaded.kind !== "ok") notFound();

  const script = loaded.week.scripts.find((entry) => entry.day === day);
  if (!script) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold" lang="en">
        {script.title.en}
      </h1>
      <p className="text-neutral-600">Day {day}</p>
      <Link
        href={`/${locale}/teacher/${route.level}/${route.week}`}
        className="w-fit rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
      >
        Back to the week
      </Link>
    </main>
  );
}
