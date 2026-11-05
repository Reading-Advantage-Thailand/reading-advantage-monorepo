import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadWeek } from "@/lib/content";
import { parseTeacherRoute, teacherRoutesEnabled } from "@/lib/teacher";
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
 * @returns The teacher week view, or the 404 view.
 */
export default async function TeacherWeekPage({
  params,
}: {
  params: Promise<{ locale: string; level: string; week: string }>;
}) {
  if (!teacherRoutesEnabled()) notFound();

  const { locale, level: levelSegment, week: weekSegment } = await params;
  const route = parseTeacherRoute(levelSegment, weekSegment);
  const loaded = route === null ? null : await loadWeek(route.level, route.week);
  if (loaded === null || loaded.kind !== "ok") notFound();

  return <TeacherWeekView week={loaded.week} locale={locale} />;
}
