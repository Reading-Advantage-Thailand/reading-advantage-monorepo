import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StorytimeWeekView } from "@/components/storytime/storytime-week";
import { loadStorytimeWeek, storytimePart } from "@/lib/storytime/week";

type Params = Promise<{ locale: string; level: string; week: string }>;

/**
 * The tab title of a Storytime week; search engines do not list the page (it is a printed QR link),
 * and the page links no app manifest.
 * @param props.params The locale, the level, and the week.
 * @returns The page metadata.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { level, week } = await params;
  const data = await loadStorytimeWeek(level, week);
  // No manifest: the QR page is not the installable app (plan Q7).
  return { ...(data && { title: data.title }), robots: { index: false, follow: false }, manifest: null };
}

/**
 * The public Storytime QR page `/st/<level>/<week>` (track storytime_advantage_program_20261021,
 * qr-page-spec.md): no sign-in, no cookie, and no evidence. A week that is not published gives 404.
 * @param props.params The locale, the level, and the week.
 * @param props.searchParams `part` opens the book, the decodable book, or the song at once.
 * @returns The week page.
 */
export default async function StorytimeWeekPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ part?: string | string[] }>;
}) {
  const { level, week } = await params;
  const data = await loadStorytimeWeek(level, week);
  if (!data) notFound();
  const { part } = await searchParams;
  return <StorytimeWeekView week={data} part={storytimePart(part)} />;
}
