import { notFound } from "next/navigation";

/**
 * The printed at-home route `/<locale>/st/<level>/<week>` (spec FR-2, plan task 1.1). Phase 1
 * ships the route without week content: every week answers 404 until the Phase 3 route loads
 * and checks the published week. The path stays alive on the service with no half-built page.
 * @param props.params The locale, the level, and the week segments.
 * @param props.searchParams The query of the request; Phase 3 reads `part` from it.
 * @returns Nothing; the route always answers 404 in Phase 1.
 */
export default async function StorytimeWeekPage({
  params,
}: {
  params: Promise<{ locale: string; level: string; week: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<void> {
  await params;
  notFound();
}
