import { z } from "zod";
import { SentenceTimepointSchema } from "@/lib/read-along/align";
import { getStorageUrl } from "@/lib/storage-config";

/**
 * The Storytime week that the public QR page reads (track storytime_advantage_program_20261021,
 * qr-page-spec.md sections 8 and 10). Workbooks owns the full `storytime-week` v1 contract
 * (`dashboard/lib/storytime/schema.ts`); this is the subset the page needs. Unknown fields are
 * dropped, so the teacher scripts never reach the page.
 */

/** A media path relative to Workbooks' `content/storytime/`, for example `l2/media/w01/song.mp4`. */
const mediaPath = z.string().regex(/^(?!.*\.\.)[\w./-]+$/);
/** A picture: only the final file is used; a picture with no file yet is shown as no picture. */
const image = z.object({ file: mediaPath.optional() });
const biText = z.object({ en: z.string().min(1), th: z.string().default("") });
/** The Primary timing shape as is; Workbooks adds the page number of the sentence. */
const timepoint = SentenceTimepointSchema.extend({ page: z.number().int().min(1).optional() });

const bookSchema = z.object({
  kind: z.enum(["readalong", "decodable"]),
  /** Level 2 week 1 only: picture words before the first vowel, so no word blends. */
  soundBook: z.boolean().default(false),
  title: z.string().min(1),
  cover: image.optional(),
  pages: z.array(z.object({ text: z.string().min(1), image: image.optional() })).min(1),
  soundsPage: z
    .object({ element: z.string().min(1), words: z.array(z.string().min(1)).default([]), tricky: z.array(z.string().min(1)).default([]) })
    .optional(),
  audio: z.object({ file: mediaPath.optional(), sentences: z.array(timepoint).default([]) }).default({ sentences: [] }),
});

const songSchema = z.object({
  title: z.string().min(1),
  lines: z
    .array(z.object({ text: z.string().min(1), part: z.enum(["verse", "chorus"]), gesture: z.string().min(1), image: image.optional(), imageOf: z.number().int().min(0).optional() }))
    .min(1),
  audio: mediaPath.optional(),
  video: mediaPath.optional(),
  videoPhone: mediaPath.optional(),
  poster: mediaPath.optional(),
  posterPhone: mediaPath.optional(),
  karaoke: mediaPath.optional(),
  times: z.array(timepoint).default([]),
});

/** The week package fields of the page. */
export const storytimeWeekSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    program: z.literal("storytime"),
    level: z.number().int().min(1).max(4),
    week: z.number().int().min(1).max(32),
    title: z.string().min(1),
    status: z.enum(["draft", "published"]).default("draft"),
  }),
  focus: z.object({
    element: z.object({ graphemes: z.array(z.string().min(1)).min(1), sound: z.string().min(1), audio: mediaPath.optional() }).optional(),
    frame: z.string().min(1),
  }),
  books: z.array(bookSchema).default([]),
  song: songSchema.optional(),
  home: z.object({ words: z.array(z.string().min(1)).default([]), line: biText, activity: biText }).optional(),
});
/** A parsed week package. */
export type StorytimeWeekPackage = z.infer<typeof storytimeWeekSchema>;

/** The parts that `?part=` can open (qr-page-spec section 2). */
export const STORYTIME_PARTS = ["book", "decodable", "song"] as const;
/** One part of the page. */
export type StorytimePart = (typeof STORYTIME_PARTS)[number];

/** A book with public media URLs, ready for the client page. */
export interface StorytimeBook {
  title: string;
  pages: { text: string; picture: string | null }[];
  audio: string | null;
  sentences: z.infer<typeof timepoint>[];
  sounds: { element: string; words: string[]; tricky: string[] } | null;
  /** True when a word tap plays the word sound by sound (a decodable book that is not a sound book). */
  blend: boolean;
}

/** The week as the client page gets it: public URLs only, no teacher content. */
export interface StorytimeWeek {
  level: number;
  week: number;
  title: string;
  readalong: StorytimeBook;
  decodable: StorytimeBook;
  element: { graphemes: string[]; sound: string; audio: string | null } | null;
  frame: string;
  song: {
    title: string;
    lines: { text: string; part: "verse" | "chorus"; gesture: string; picture: string | null }[];
    audio: string | null;
    video: string | null;
    videoPhone: string | null;
    poster: string | null;
    posterPhone: string | null;
    karaoke: string | null;
    times: z.infer<typeof timepoint>[];
  } | null;
  home: { words: string[]; line: { en: string; th: string }; activity: { en: string; th: string } } | null;
  /** The bucket URL of Workbooks `content/storytime/`, for the blend sounds (`lib/storytime/blend.ts`). */
  mediaBase: string;
}

/** The bucket URL of a Workbooks media path: the bucket keeps `content/storytime/` under `storytime/`. */
const url = (path: string | undefined) => (path ? getStorageUrl(`storytime/${path}`) : null);

/** Turns a parsed book into the client shape. */
function toBook(book: z.infer<typeof bookSchema>): StorytimeBook {
  return {
    title: book.title,
    pages: book.pages.map((page) => ({ text: page.text, picture: url(page.image?.file) })),
    audio: url(book.audio.file),
    sentences: book.audio.sentences,
    sounds: book.soundsPage ?? null,
    blend: book.kind === "decodable" && !book.soundBook,
  };
}

/**
 * Turns a raw week package into the client week, or null when the page must give 404: a bad
 * package, a week that is not published, another level or week than the URL, or not exactly one
 * book of each kind (qr-page-spec section 8).
 * @param raw The week JSON.
 * @param level The level of the URL.
 * @param week The week of the URL.
 * @returns The client week, or null.
 */
export function publishedWeek(raw: unknown, level: number, week: number): StorytimeWeek | null {
  const parsed = storytimeWeekSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { meta, books, song, home, focus } = parsed.data;
  if (meta.status !== "published" || meta.level !== level || meta.week !== week) return null;
  const readalong = books.filter((book) => book.kind === "readalong");
  const decodable = books.filter((book) => book.kind === "decodable");
  if (readalong.length !== 1 || decodable.length !== 1) return null;
  return {
    level,
    week,
    title: meta.title,
    readalong: toBook(readalong[0]),
    decodable: toBook(decodable[0]),
    element: focus.element ? { graphemes: focus.element.graphemes, sound: focus.element.sound, audio: url(focus.element.audio) } : null,
    frame: focus.frame,
    song: song
      ? {
          title: song.title,
          // A repeated line shows the picture of an earlier line (`imageOf`).
          lines: song.lines.map((line) => ({
            text: line.text,
            part: line.part,
            gesture: line.gesture,
            picture: url((line.imageOf !== undefined ? song.lines[line.imageOf]?.image : line.image)?.file),
          })),
          audio: url(song.audio),
          video: url(song.video),
          videoPhone: url(song.videoPhone),
          poster: url(song.poster),
          posterPhone: url(song.posterPhone),
          karaoke: url(song.karaoke),
          times: song.times,
        }
      : null,
    home: home ?? null,
    mediaBase: getStorageUrl("storytime/"),
  };
}

/**
 * Reads the `?part=` value.
 * @param value The search parameter.
 * @returns The part, or null for none or an unknown value.
 */
export function storytimePart(value: string | string[] | undefined): StorytimePart | null {
  return STORYTIME_PARTS.find((part) => part === value) ?? null;
}

/**
 * Loads a published week for the URL `/st/<level>/<week>`.
 * @param level The level segment of the URL.
 * @param week The week segment of the URL.
 * @param weeks The copied week files by `level/week` (the default is the app's index).
 * @returns The client week, or null for a bad URL, a missing week, or a week that is not published.
 */
export async function loadStorytimeWeek(
  level: string,
  week: string,
  weeks?: Readonly<Record<string, () => Promise<unknown>>>,
): Promise<StorytimeWeek | null> {
  if (!/^[1-4]$/.test(level) || !/^[1-9]\d?$/.test(week)) return null;
  const index = weeks ?? (await import("@/content/storytime/weeks")).STORYTIME_WEEKS;
  const load = index[`${level}/${Number(week)}`];
  return load ? publishedWeek(await load(), Number(level), Number(week)) : null;
}
