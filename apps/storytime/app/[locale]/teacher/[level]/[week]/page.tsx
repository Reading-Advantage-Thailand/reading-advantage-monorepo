import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadWeek } from "../../../../../lib/content";
import {
  guardTeacherPage,
  parseTeacherRoute,
} from "../../../../../lib/teacher";
import { requireRole } from "../../../../../lib/auth";
import { signWeekMedia } from "../../../../../lib/media/sign";
import TeacherForbidden from "../../forbidden";
import { TeacherWeekView } from "./week-view";

/**
 * The teacher week route `/<locale>/teacher/<level>/<week>` (spec FR-9, plan task 4.1, AC-9.3).
 *
 * The route answers 404 while the teacher routes are off. The switch is a server-side value, and
 * the route reads it at request time, so the build makes no teacher page and no request can open
 * the route.
 *
 * The route answers 404 for an unknown level, an unknown week, and a week that breaks the
 * contract. The teacher reads the week of the class, so the route loads the file with the same
 * loader as the at-home route and never opens a week that the contract rejects.
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
 * Renders the week of the teacher.
 * @param props.params The locale, the level, and the week segments.
 * @returns The teacher week view, the 403 page, or the 404 view.
 */
export default async function TeacherWeekPage({
  params,
}: {
  params: Promise<{ locale: string; level: string; week: string }>;
}) {
  const { locale, level: levelSegment, week: weekSegment } = await params;
  const returnPath = `/${locale}/teacher/${levelSegment}/${weekSegment}`;
  const gate = await guardTeacherPage((path) => requireRole("teacher", path), returnPath);
  if (gate.kind === "off") notFound();
  if (gate.kind === "forbidden") {
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
  const loaded = route === null ? null : await loadWeek(route.level, route.week);
  if (loaded === null || loaded.kind !== "ok") notFound();

  const mediaUrls = await signWeekMedia(loaded.week, {});
  return <TeacherWeekView week={loaded.week} locale={locale} mediaUrls={mediaUrls} />;
}
