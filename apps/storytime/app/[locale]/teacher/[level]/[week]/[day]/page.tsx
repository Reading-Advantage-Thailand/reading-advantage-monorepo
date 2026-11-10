import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadWeek } from "../../../../../../lib/content";
import {
  parseTeacherDay,
  parseTeacherRoute,
  teacherRoutesEnabled,
} from "../../../../../../lib/teacher";
import { requireRole } from "../../../../../../lib/auth";
import { signWeekMedia } from "../../../../../../lib/media/sign";
import TeacherForbidden from "../../../forbidden";
import { TeacherLessonFlow } from "./lesson-flow";

/**
 * The teacher lesson route `/<locale>/teacher/<level>/<week>/<day>` (spec FR-9, plan task 4.1).
 *
 * The route answers 404 while the teacher routes are off. The switch is a server-side value, and
 * the route reads it at request time.
 *
 * The route answers 404 for an unknown level, an unknown week, an unknown day, and a week that
 * breaks the contract. The route hands the loaded week to the lesson flow of task 4.3, which
 * holds the day title and the way back to the week.
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
 * Renders the lesson flow of one lesson day.
 * @param props.params The locale, the level, the week, and the day segments.
 * @returns The lesson flow of the day, or the 404 view.
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

  // Every media URL of a page is a signed URL, so the route signs the media of the week and
  // hands the map to the lesson flow (plan task 4.4).
  const mediaUrls = await signWeekMedia(loaded.week, {});
  return (
    <TeacherLessonFlow
      week={loaded.week}
      day={day}
      locale={locale}
      mediaUrls={mediaUrls}
    />
  );
}
