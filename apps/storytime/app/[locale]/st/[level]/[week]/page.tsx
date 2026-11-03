import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { loadVisibleWeek } from "@/lib/content";
import type { StorytimeWeek } from "@/lib/contracts/week";

/**
 * The at-home entry route `/<locale>/st/<level>/<week>` (spec FR-5, AC-2.1, AC-5.2, AC-5.4).
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
 * The home view holds the three entry tiles with their pictures, the recorded label audio, the Thai
 * parent line, the three home words, the frame, the activity, and the sound of the week. Playback
 * uses only recorded files, never the phone voice (rule 10.5). A label or word with no recording
 * shows no speaker control. Tasks 3.3 to 3.5 replace the part body with the reader, the decodable,
 * and the song.
 */

/** The parts of a week that `?part=` may open. */
const PARTS = ["book", "decodable", "song"] as const;

/** One part of a week. */
type Part = (typeof PARTS)[number];

/** The visible label of each part. */
const PART_LABEL_KEYS: Record<Part, string> = {
  book: "tileReadalong",
  decodable: "tileDecodable",
  song: "tileSong",
};

/** The recorded label audio of the entry tiles, keyed by tile id (finding F17). The table stays
 * empty until the production side delivers the files; a missing recording shows no speaker. */
const TILE_LABEL_AUDIO: Partial<Record<TileId, string>> = {};

/** The recorded home-word audio, keyed by the word (finding F17). The table stays empty until the
 * production side delivers the files; a missing recording shows no speaker. */
const HOME_WORD_AUDIO: Partial<Record<string, string>> = {};

/** The environment value that holds the media base URL (test strategy P3.7). It stays on the
 * server: no request can set it, and it is never a `NEXT_PUBLIC_` value. */
const MEDIA_BASE_ENV = "STORYTIME_MEDIA_BASE";

/** The highest level of the week contract. */
const LEVEL_MAX = 4;

/** The highest week number of the week contract. */
const WEEK_MAX = 32;

/** One entry tile: the read-along, the decodable, the song, and a conditional karaoke tile. */
type TileId = "readalong" | "decodable" | "song" | "karaoke";

/** One picture of an entry tile. */
interface TilePicture {
  /** The file, relative to the Storytime content folder. */
  file: string;
  /** The alt text. It is the image caption, and it is empty when the caption is empty. */
  caption: string;
}

/** One entry tile of the home view. */
interface Tile {
  /** The tile id, which keys the recorded label audio. */
  id: TileId;
  /** The part that a tap opens. */
  part: Part;
  /** The visible label. */
  label: string;
  /** The tile picture, or `null` when the week holds no picture entry. */
  picture: TilePicture | null;
}

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
 * Builds the URL of one media file.
 * @param file The file, relative to the Storytime content folder.
 * @returns The URL under the media base.
 */
function mediaUrl(file: string): string {
  const base = (process.env[MEDIA_BASE_ENV] || "/media").replace(/\/+$/, "");
  return `${base}/${file}`;
}

/**
 * Reads the picture of a book tile from the cover, or from the first page when the cover is absent.
 * @param week The week.
 * @param kind The book kind.
 * @returns The picture, or `null` when the week holds no picture file for the book.
 */
function bookPicture(week: StorytimeWeek, kind: "readalong" | "decodable"): TilePicture | null {
  const book = week.books.find((entry) => entry.kind === kind);
  const image = book?.cover ?? book?.pages[0]?.image;
  if (!image?.file) return null;
  return { file: image.file, caption: image.caption };
}

/**
 * Reads the picture of the song tile from the poster, or from the first song line.
 * @param week The week.
 * @returns The picture, or `null` when the song holds no picture file.
 */
function songPicture(week: StorytimeWeek): TilePicture | null {
  const song = week.song;
  const file =
    song?.poster ?? song?.posterPhone ?? song?.lines.find((line) => line.image?.file)?.image?.file;
  return file ? { file, caption: "" } : null;
}

/**
 * Gives the visible label of a part.
 * @param translate The request translator.
 * @param part The part.
 * @returns The label.
 */
function partLabel(translate: (key: string) => string, part: Part): string {
  return translate(PART_LABEL_KEYS[part]);
}

/**
 * Renders one recorded-audio speaker control. The element holds a real file, so a tap plays the
 * recording; the page never asks the phone voice (rule 10.5).
 * @param props.file The recorded file, relative to the content folder.
 * @param props.label The accessible label.
 * @returns The speaker control.
 */
function Speaker({ file, label }: { file: string; label: string }) {
  return (
    <audio
      controls
      preload="none"
      src={mediaUrl(file)}
      aria-label={label}
      className="min-h-16 min-w-16"
    />
  );
}

/**
 * Renders one entry tile with its picture and its recorded label audio.
 * @param props.tile The tile.
 * @returns The tile item.
 */
function TileCard({ tile }: { tile: Tile }) {
  const audio = TILE_LABEL_AUDIO[tile.id];
  return (
    <li className="flex flex-col gap-2">
      <Link
        href={`?part=${tile.part}`}
        className="flex min-h-16 items-center gap-3 rounded-2xl border border-neutral-300 p-3"
      >
        {tile.picture ? (
          <img
            src={mediaUrl(tile.picture.file)}
            alt={tile.picture.caption}
            loading="lazy"
            decoding="async"
            className="h-20 w-20 rounded-xl object-cover"
          />
        ) : null}
        <span className="text-lg font-semibold" lang="en">
          {tile.label}
        </span>
      </Link>
      {audio ? <Speaker file={audio} label={tile.label} /> : null}
    </li>
  );
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
  const translate = await getTranslations({ locale });
  const t = (key: string) => translate(key);

  const home = week.home;
  const parentLine = home?.line ? home.line.th.trim() : "";
  const homeWords = home?.words ?? [];
  const frame = week.focus.frame?.trim() ?? "";
  const activityText = home?.activity ? home.activity[locale === "th" ? "th" : "en"].trim() : "";
  const element = week.focus.element;
  const elementAudio = element?.audio;
  const karaoke = week.song ? week.song.karaoke : undefined;

  const tiles: Tile[] = [
    { id: "readalong", part: "book", label: t("tileReadalong"), picture: bookPicture(week, "readalong") },
    { id: "decodable", part: "decodable", label: t("tileDecodable"), picture: bookPicture(week, "decodable") },
    { id: "song", part: "song", label: t("tileSong"), picture: songPicture(week) },
  ];
  if (karaoke) {
    tiles.push({ id: "karaoke", part: "song", label: t("tileKaraoke"), picture: songPicture(week) });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold" lang="en">
          {week.meta.title}
        </h1>
      </header>
      {part === null ? (
        <>
          <section aria-label={t("homeChoosePart")}>
            <h2 className="mb-3 text-lg font-semibold" lang="en">
              {t("homeChoosePart")}
            </h2>
            <ul className="flex flex-col gap-3">
              {tiles.map((tile) => (
                <TileCard key={tile.id} tile={tile} />
              ))}
            </ul>
          </section>
          <section
            aria-label={t("homeParentHeading")}
            className="flex flex-col gap-4 rounded-2xl border border-neutral-300 p-4"
          >
            <h2 className="text-lg font-semibold" lang="th">
              {t("homeParentHeading")}
            </h2>
            {parentLine ? (
              <p className="leading-7" lang="th">
                {parentLine}
              </p>
            ) : null}
            {element && elementAudio ? (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold" lang="en">
                  {t("homeSoundHeading")}
                </h3>
                <p className="text-sm" lang="en">
                  {element.graphemes.join(" ")} {element.sound}
                </p>
                <Speaker
                  file={elementAudio}
                  label={`${t("homeSoundHeading")} ${element.sound}`}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold" lang="en">
                {t("homeWordsHeading")}
              </h3>
              <ul className="flex flex-wrap gap-2" aria-label={t("homeWordsHeading")}>
                {homeWords.map((word) => {
                  const wordAudio = HOME_WORD_AUDIO[word];
                  return (
                    <li key={word} className="flex flex-col gap-1">
                      <span
                        className="rounded-full border border-neutral-300 px-4 py-2 text-lg"
                        lang="en"
                      >
                        {word}
                      </span>
                      {wordAudio ? <Speaker file={wordAudio} label={word} /> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            {frame ? (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold" lang="en">
                  {t("homeFrameHeading")}
                </h3>
                <p className="text-lg" lang="en">
                  {frame}
                </p>
              </div>
            ) : null}
            {activityText ? (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold" lang="en">
                  {t("homeActivityHeading")}
                </h3>
                <p lang={locale === "th" ? "th" : "en"}>{activityText}</p>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <section data-part={part} className="rounded-2xl border border-neutral-300 p-4">
          <h2 className="text-lg font-semibold" lang="en">
            {partLabel(t, part)}
          </h2>
        </section>
      )}
    </main>
  );
}
