import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { routing } from "../../../../../i18n/routing";
import { loadVisibleWeek } from "../../../../../lib/content";
import type { StorytimeWeek } from "@/lib/contracts/week";
import { questionScreenShows, readAlongQuestions } from "../../../../../lib/questions";
// Relative paths for the runtime imports: the shared root vitest config holds no `@`
// alias, so an `@/lib/...` import cannot resolve there (finding F139). The tests mock
// the same files by relative specifier, so the factories match in both runs. Only the
// type-only import keeps the `@` form; types never resolve at runtime.
import { parseStorytimeRoute } from "../../../../../lib/route-parse";
import { stepMediaOf } from "../../../../../lib/teacher-media";
import { requireUser } from "../../../../../lib/auth";
import { teacherRoutesEnabled } from "../../../../../lib/teacher";
import { signWeekMedia } from "../../../../../lib/media/sign";
import { placeFor } from "../../../../../lib/look/places";
import { Frame } from "../../../frame";
import { StorytimeReader, StorytimeDecodable } from "./reader";
import type { QuestionTile } from "./questions";
import { StorytimeSong } from "./song";
import { DoneMark } from "./done-mark";
import { SpeakerButton } from "./speaker-button";

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
 * `?day=1..5` names the day that a teacher button opened (plan task 6.2, round 10). Only a single
 * value that matches `^[1-5]$` is a day; any other value, and any repeated value, is the same as
 * no day. A valid day shows a day line from the message key `stDayLine`, and it opens the part of
 * the first step of that day with a media part under rule D1 (`readalong` opens `book`,
 * `decodable` opens `decodable`, `song` opens `song`). A valid `?part=` wins over the day; an
 * unknown `?part=` counts as a missing one. The day line shows on the home view and on the part
 * screens, so the teacher keeps the day context.
 *
 * The home view holds the three entry tiles with their pictures, the recorded label audio, the Thai
 * parent line, the three home words, the frame, the activity, and the sound of the week. Playback
 * uses only recorded files, never the phone voice (rule 10.5). A label or word with no recording
 * shows no speaker control. Tasks 3.3, 3.4, and 3.5 give the reader, the decodable, and the song
 * their own client views.
 */

/** The parts of a week that `?part=` may open. */
const PARTS = ["book", "decodable", "song"] as const;

/** One part of a week. */
type Part = (typeof PARTS)[number];

/** The recorded label audio of the entry tiles, keyed by tile id (finding F17). The table stays
 * empty until the production side delivers the files; a missing recording shows no speaker. */
const TILE_LABEL_AUDIO: Partial<Record<TileId, string>> = {};

/** The recorded home-word audio, keyed by the word (finding F17). The table stays empty until the
 * production side delivers the files; a missing recording shows no speaker. */
const HOME_WORD_AUDIO: Partial<Record<string, string>> = {};

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
 * Reads the signed URL of one media file.
 *
 * Every media file of the week holds a signed URL, so the page never builds a public URL.
 * @param mediaUrls The signed URLs of the week.
 * @param file The file, relative to the Storytime content folder.
 * @returns The signed URL, or an empty string when the file holds no signed URL.
 */
function mediaUrl(mediaUrls: Record<string, string>, file: string): string {
  return mediaUrls[file] ?? "";
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

/** The one-digit form of a day, `1` to `5`. */
const DAY_PATTERN = /^[1-5]$/;

/**
 * Reads the `day` query value (plan task 6.2, round 10). Only a single value that matches
 * `^[1-5]$` is a day; a missing, empty, padded, out-of-range, or repeated value is the same as
 * no day, so the page keeps the output of the no-day request.
 * @param value The raw query value.
 * @returns The day number, or `null` for no day.
 */
function openDay(value: string | string[] | undefined): number | null {
  return typeof value === "string" && DAY_PATTERN.test(value) ? Number(value) : null;
}

/**
 * Reads the part that a day opens: the kind of the first step of that day with a media part
 * under rule D1 (`readalong` opens `book`, `decodable` opens `decodable`, `song` opens `song`).
 * A day with no script, or with no step that opens a player, opens the home view.
 * @param day The day number, or `null` for no day.
 * @param week The week.
 * @returns The part of the day, or `null` for the home view.
 */
function dayPartOf(day: number | null, week: StorytimeWeek): Part | null {
  if (day === null) return null;
  const script = week.scripts.find((entry) => entry.day === day);
  if (!script) return null;
  for (const step of script.steps) {
    const media = stepMediaOf(step, week);
    if (!media) continue;
    if (media.kind === "readalong") return "book";
    if (media.kind === "decodable") return "decodable";
    return "song";
  }
  return null;
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
 * Renders one recorded-audio speaker control. The element holds a real file, so a tap plays the
 * recording; the page never asks the phone voice (rule 10.5). The audio element has no native
 * controls, so no "0:00 / 0:00" text shows before the clip loads (council round 3, item 6).
 * @param props.file The recorded file, relative to the content folder.
 * @param props.label The accessible label.
 * @returns The speaker control.
 */
function Speaker({
  file,
  label,
  mediaUrls,
}: {
  file: string;
  label: string;
  mediaUrls: Record<string, string>;
}) {
  return (
    <span data-speaker className="inline-flex">
      <audio preload="none" src={mediaUrl(mediaUrls, file)} />
      <SpeakerButton label={label} className="min-h-16 min-w-16" />
    </span>
  );
}

/**
 * Renders one entry tile with its picture and its recorded label audio.
 * @param props.tile The tile.
 * @param props.doneKey The `<level>:<week>:<part>` key of the per-device completion record.
 * @param props.doneLabel The localized Done label.
 * @returns The tile item.
 */
function TileCard({
  tile,
  mediaUrls,
  doneKey,
  doneLabel,
}: {
  tile: Tile;
  mediaUrls: Record<string, string>;
  doneKey: string;
  doneLabel: string;
}) {
  const audio = TILE_LABEL_AUDIO[tile.id];
  return (
    <li className="flex flex-col gap-2 [@media(max-height:500px)]:flex-1">
      <Link
        href={`?part=${tile.part}`}
        className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#92400e] p-3"
      >
        {tile.picture ? (
          <img
            src={mediaUrl(mediaUrls, tile.picture.file)}
            alt={tile.picture.caption}
            loading="lazy"
            decoding="async"
            className="h-20 w-20 rounded-xl object-cover"
          />
        ) : null}
        {/* The label comes from the message files, so its lang follows the locale (finding F135). */}
        <span className="text-lg font-semibold">
          {tile.label}
        </span>
      </Link>
      <DoneMark doneKey={doneKey} label={doneLabel} />
      {audio ? <Speaker file={audio} label={tile.label} mediaUrls={mediaUrls} /> : null}
    </li>
  );
}

/**
 * Renders the link back to the week tiles from a part screen whose part the week lacks.
 * It keeps the screen from a dead end (finding F242).
 * @param props.href The week home path.
 * @param props.label The link text.
 * @returns The link to the week tiles.
 */
function WeekHomeLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-16 items-center rounded-2xl border border-[#92400e] p-3"
    >
      {label}
    </Link>
  );
}

/**
 * Builds the query of a request, for the path the visitor comes back to.
 * @param searchParams The query values of the request.
 * @returns The query string with a leading `?`, or an empty string.
 */
function queryOf(searchParams: Record<string, string | string[] | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(searchParams)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry === "string") {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(entry)}`);
      }
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
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
  const search = await searchParams;
  const user = await requireUser(`/${locale}/st/${levelSegment}/${weekSegment}${queryOf(search)}`);
  const route = parseStorytimeRoute(routing.locales, locale, levelSegment, weekSegment);
  const loaded = route === null ? null : await loadVisibleWeek(route.level, route.week);
  const week = loaded ?? notFound();
  // The effective part: a valid `?part=` wins over the day mapping; an unknown `?part=` counts
  // as a missing one, so the day mapping applies (plan task 6.2, round 10).
  const day = openDay(search.day);
  const part = openPart(search.part) ?? dayPartOf(day, week);
  const translate = await getTranslations({ locale });
  const t = (key: string, values?: Record<string, string | number>) => translate(key, values);
  const readerLabels = {
    readToMe: t("playerReadToMe"),
    myTurn: t("playerMyTurn"),
    slow: t("playerSlow"),
    previousPage: t("playerPreviousPage"),
    nextPage: t("playerNextPage"),
    audioError: t("playerAudioError"),
    finished: t("playerFinished"),
    playing: t("playerPlaying"),
  };
  let mediaUrls: Record<string, string> = {};
  try {
    mediaUrls = await signWeekMedia(week, {});
  } catch (error) {
    console.warn(`storytime media signing failed: ${(error as Error).message}`);
    throw error;
  }
  const readAlongBook = week.books.find((entry) => entry.kind === "readalong");
  const decodableBook = week.books.find((entry) => entry.kind === "decodable");

  const home = week.home;
  const parentLine = home?.line
    ? (locale === "th" ? home.line.th : (home.line.en ?? "")).trim()
    : "";
  const homeWords = home?.words ?? [];
  const frame = week.focus.frame?.trim() ?? "";
  const activityText = home?.activity ? home.activity[locale === "th" ? "th" : "en"].trim() : "";
  const element = week.focus.element;
  const elementAudio = element?.audio;
  const karaoke = week.song ? week.song.karaoke : undefined;

  const tiles: Tile[] = [];
  if (readAlongBook) {
    tiles.push({ id: "readalong", part: "book", label: t("tileReadalong"), picture: bookPicture(week, "readalong") });
  }
  if (decodableBook) {
    tiles.push({ id: "decodable", part: "decodable", label: t("tileDecodable"), picture: bookPicture(week, "decodable") });
  }
  if (week.song) {
    tiles.push({ id: "song", part: "song", label: t("tileSong"), picture: songPicture(week) });
  }
  if (karaoke) {
    tiles.push({ id: "karaoke", part: "song", label: t("tileKaraoke"), picture: songPicture(week) });
  }

  const weekHref = `/${locale}/st/${levelSegment}/${weekSegment}`;
  // The teacher link of the home view (plan task 6.2, rounds 7 and 10): a teacher with the
  // switch on sees one link to the teacher page of the same week. A family or class account, a
  // part screen, and the switch off see none. The link shows on the home view only, so the
  // rule reads the effective part: day 1 of w01 keeps the link, and a day that opens a part
  // does not.
  const teacherHref =
    user.role === "teacher" && teacherRoutesEnabled() && part === null
      ? `/${locale}/teacher/${route!.level}/${route!.week}`
      : null;
  /** The per-device completion key of one part: `<level>:<week>:<part>`. */
  const doneKeyOf = (partName: string) => `${route!.level}:${route!.week}:${partName}`;
  // The look places of the part: `main` carries them as data attributes, so the CSS of
  // `app/look.css` selects by attribute and no `:has()` carries the place (Q36).
  const places = placeFor(part);

  const questionTiles: QuestionTile[] = tiles.slice(0, 3).map((tile) => ({
    id: tile.id,
    href: `?part=${tile.part}`,
    label: tile.label,
    pictureFile: tile.picture?.file,
    pictureAlt: tile.picture?.caption ?? "",
  }));
  const showQuestions = questionScreenShows(week, route === null ? 0 : route.level);
  const questionLabels = {
    skip: t("questionSkip"),
    right: t("questionRight"),
    gentle: t("questionGentle"),
    picture: t("questionPicture"),
  };

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6"
      data-place={places.place}
      data-hero={places.hero}
    >
      {/* The hero frame of the look: `cover` on the home view and the song, `band` on the book
          and the decodable page (AC-2.6 to AC-2.8). The week renders only when the route
          parsed, so `route` is non-null here. */}
      <Frame
        level={route!.level}
        week={route!.week}
        title={week.meta.title}
        variant={part === null || part === "song" ? "cover" : "band"}
        locale={locale === "th" ? "th" : "en"}
      />
      {/* The day line of a valid `?day=` (plan task 6.2, round 10): the home view and the part
          screens of the day both show it, so the teacher knows which day is open. */}
      {day !== null ? (
        <p className="text-lg font-semibold">
          {t("stDayLine", { day })}
        </p>
      ) : null}
      {part === null ? (
        <>
          <section aria-label={t("homeChoosePart")}>
            <h2 className="mb-3 text-lg font-semibold">
              {t("homeChoosePart")}
            </h2>
            {/* `data-week-tiles` names the tile list for the landscape browser-gate rows. In
            landscape the list uses the same row as the end of the book (F282, F310), so every
            tile stays inside the viewport; portrait and laptop keep the column. */}
            <ul data-week-tiles className="flex flex-col gap-3 [@media(max-height:500px)]:flex-row">
              {tiles.map((tile) => (
                <TileCard
                  key={tile.id}
                  tile={tile}
                  mediaUrls={mediaUrls}
                  doneKey={doneKeyOf(tile.part)}
                  doneLabel={t("partDone")}
                />
              ))}
            </ul>
          </section>
          {teacherHref ? (
            <Link
              href={teacherHref}
              className="inline-flex min-h-11 w-fit items-center rounded-2xl border border-[#92400e] bg-[#fcd34d] px-4 py-2 font-semibold"
            >
              {t("stTeacherViewLink")}
            </Link>
          ) : null}
          <section
            aria-label={t("homeParentHeading")}
            data-parent-panel
            className="flex flex-col gap-4 rounded-2xl border border-[#92400e] p-4"
          >
            <h2 className="text-lg font-semibold">
              {t("homeParentHeading")}
            </h2>
            {parentLine ? (
              <p className="leading-7" lang={locale === "th" ? "th" : "en"}>
                {parentLine}
              </p>
            ) : null}
            {element && elementAudio ? (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">
                  {t("homeSoundHeading")}
                </h3>
                <p className="text-sm" lang="en">
                  {element.graphemes.join(" ")} {element.sound}
                </p>
                <Speaker
                  file={elementAudio}
                  label={`${t("homeSoundHeading")} ${element.sound}`}
                  mediaUrls={mediaUrls}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">
                {t("homeWordsHeading")}
              </h3>
              <ul className="flex flex-wrap gap-2" aria-label={t("homeWordsHeading")}>
                {homeWords.map((word) => {
                  const wordAudio = HOME_WORD_AUDIO[word];
                  return (
                    <li key={word} className="flex flex-col gap-1">
                      <span
                        className="rounded-full border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-lg text-[#92400e]"
                        lang="en"
                      >
                        {word}
                      </span>
                      {wordAudio ? <Speaker file={wordAudio} label={word} mediaUrls={mediaUrls} /> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            {frame ? (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">
                  {t("homeFrameHeading")}
                </h3>
                <p className="text-lg" lang="en">
                  {frame}
                </p>
              </div>
            ) : null}
            {activityText ? (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">
                  {t("homeActivityHeading")}
                </h3>
                <p lang={locale === "th" ? "th" : "en"}>{activityText}</p>
              </div>
            ) : null}
          </section>
        </>
      ) : part === "book" ? (
        <section data-part={part}>
          {readAlongBook ? (
            <StorytimeReader
              book={readAlongBook}
              locale={locale}
              labels={readerLabels}
              questions={showQuestions ? readAlongQuestions(week) : []}
              tiles={questionTiles}
              questionLabels={questionLabels}
              mediaUrls={mediaUrls}
              doneKey={doneKeyOf("book")}
              weekHref={weekHref}
            />
          ) : (
            <WeekHomeLink href={weekHref} label={t("homeChoosePart")} />
          )}
        </section>
      ) : part === "decodable" ? (
        <section data-part={part}>
          {decodableBook ? (
            <StorytimeDecodable
              week={week}
              locale={locale}
              mediaUrls={mediaUrls}
              doneKey={doneKeyOf("decodable")}
              labels={{
                soundOfWeek: t("decSoundOfWeek"),
                playSound: t("decPlaySound"),
                trickyWords: t("decTrickyWords"),
                previousPage: t("decPreviousPage"),
                nextPage: t("decNextPage"),
                audioError: t("decAudioError"),
                playing: t("playerPlaying"),
                playSentence: t("decPlaySentence"),
              }}
            />
          ) : (
            <WeekHomeLink href={weekHref} label={t("homeChoosePart")} />
          )}
        </section>
      ) : (
        <section data-part={part}>
          {week.song ? (
            <StorytimeSong
              song={week.song}
              mediaUrls={mediaUrls}
              labels={{ play: t("songPlay"), pause: t("songPause") }}
              doneKey={doneKeyOf("song")}
            />
          ) : (
            <WeekHomeLink href={weekHref} label={t("homeChoosePart")} />
          )}
        </section>
      )}
      <form method="post" action="/api/auth/sign-out" className="w-fit">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="min-h-16 rounded-2xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
        >
          {t("signOut")}
        </button>
      </form>
    </main>
  );
}
