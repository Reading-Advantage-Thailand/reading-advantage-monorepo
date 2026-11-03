import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { loadVisibleWeek } from "@/lib/content";

/**
 * The at-home entry route `/<locale>/st/<level>/<week>` (spec FR-5, AC-2.1, AC-5.4).
 *
 * The route needs no login, writes no cookie, and answers 404 for every week that a child may not
 * see: an absent week, an unparsable week, a draft week, and a published week with a page picture
 * that has no file. `lib/content.ts` and `lib/readiness.ts` hold the rules, so the receiving step
 * applies the same readiness rule. The canonical segments are `^[1-9][0-9]*$`; any other form,
 * and any locale outside the routing config, answers 404.
 *
 * `?part=book|decodable|song` names the part that opens first. A missing value, an empty value, an
 * unknown value, and a repeated value open the home view.
 *
 * Tasks 3.2 to 3.5 replace the part body with the tiles, the reader, the decodable, and the song.
 */

/** The parts of a week that `?part=` may open. */
const PARTS = ["book", "decodable", "song"] as const;

/** One part of a week. */
type Part = (typeof PARTS)[number];

/** The visible label of each part. */
const PART_LABELS: Record<Part, string> = {
  book: "Read-along",
  decodable: "Decodable",
  song: "Song",
};

/** The highest level of the week contract. */
const LEVEL_MAX = 4;

/** The highest week number of the week contract. */
const WEEK_MAX = 32;

/**
 * The content changes with each deploy, so the route renders at request time.
 */
export const dynamic = "force-dynamic";

/**
 * Marks the page as out of the search index (spec FR-5, AC-5.1).
 * @returns The page metadata.
 */
export function generateMetadata(): Metadata {
  return { robots: "noindex, nofollow" };
}

/**
 * Reads a route segment as a canonical positive number.
 * @param segment The route segment.
 * @param max The highest accepted value.
 * @returns The number, or `null` when the segment is not `^[1-9][0-9]*$` inside the bound.
 */
function parseCanonicalNumber(segment: string, max: number): number | null {
  if (!/^[1-9][0-9]*$/.test(segment)) return null;
  const value = Number(segment);
  return Number.isSafeInteger(value) && value <= max ? value : null;
}

/**
 * Parses the three route segments.
 * @param locale The locale segment.
 * @param level The level segment.
 * @param week The week segment.
 * @returns The level and the week, or `null` for a path that must answer 404.
 */
function parseRoute(
  locale: string,
  level: string,
  week: string,
): { level: number; week: number } | null {
  const localeKnown = hasLocale(routing.locales, locale);
  const levelNumber = localeKnown ? parseCanonicalNumber(level, LEVEL_MAX) : null;
  const weekNumber = localeKnown ? parseCanonicalNumber(week, WEEK_MAX) : null;
  if (levelNumber !== null && weekNumber !== null) return { level: levelNumber, week: weekNumber };
  console.warn(`storytime week ${locale}/${level}/${week} blocked: invalid`);
  return null;
}

/**
 * Reads the `part` query value.
 * @param value The raw query value.
 * @returns The part, or `null` for the home view.
 */
function openPart(value: string | string[] | undefined): Part | null {
  return typeof value === "string" && (PARTS as readonly string[]).includes(value)
    ? (value as Part)
    : null;
}

/**
 * Renders one published and ready week.
 * @param props.params The locale, the level, and the week segments.
 * @param props.searchParams The query of the request.
 * @returns The week page, or the 404 view.
 */
export default async function StorytimeWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; level: string; week: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, level: levelSegment, week: weekSegment } = await params;
  const route = parseRoute(locale, levelSegment, weekSegment);
  const loaded = route === null ? null : await loadVisibleWeek(route.level, route.week);
  const part = openPart((await searchParams).part);
  const week = loaded ?? notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold" lang="en">
          {week.meta.title}
        </h1>
      </header>
      <nav className="flex flex-wrap gap-3" aria-label="Week parts">
        {PARTS.map((value) => (
          <Link
            key={value}
            href={`?part=${value}`}
            lang="en"
            aria-current={part === value ? "page" : undefined}
            className="rounded-full border border-neutral-300 px-4 py-2"
          >
            {PART_LABELS[value]}
          </Link>
        ))}
      </nav>
      <section data-part={part ?? "home"} className="rounded-2xl border border-neutral-300 p-4">
        <h2 className="text-lg font-semibold" lang="en">
          {part === null ? "Choose a part" : PART_LABELS[part]}
        </h2>
      </section>
    </main>
  );
}
