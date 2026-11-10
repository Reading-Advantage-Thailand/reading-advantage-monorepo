import type { StorytimeWeek } from "./contracts/week";

/**
 * The media of one lesson step (plan task 4.4, rule D1).
 *
 * The week file holds no field that marks a step with media, and the `materials` list of a step
 * holds free text. Rule D1 reads one table: a step opens a player when one `materials` entry
 * starts with a fixed key and ends with `: "<title>"`, and that title names a media object of the
 * same week.
 *
 * The table holds two keys. The key `karaoke videos` opens the song of the week, and the key
 * `book audio` opens a book of the week. Every other entry opens nothing. The rule takes the
 * first matching entry of the list, and it never reads a step id.
 *
 * The rule lives in one function, so a later field of Workbooks changes this module and its test
 * rows in one commit.
 */

/** The kind of the media part that a step opens. */
export type StepMediaKind = "song" | "readalong" | "decodable";

/** The media part that one step opens. */
export interface StepMedia {
  /** The part that the player shows. */
  kind: StepMediaKind;
  /** The title of the song or the book, as the week holds it. */
  title: string;
  /** The media files of the part, primary file first. */
  files: string[];
}

/** One step of a lesson day. */
type LessonStep = StorytimeWeek["scripts"][number]["steps"][number];

/** One book of a week. */
type WeekBook = StorytimeWeek["books"][number];

/** The song of a week. */
type WeekSong = NonNullable<StorytimeWeek["song"]>;

/** The key of the materials entry that opens the song. */
const SONG_KEY = "karaoke videos";

/** The key of the materials entry that opens a book. */
const BOOK_KEY = "book audio";

/** The pattern of the title at the end of a materials entry. */
const TITLE_PATTERN = /: "([^"]*)"\s*$/;

/**
 * Reads the title at the end of one materials entry.
 * @param entry The materials entry.
 * @returns The title, or `null` when the entry ends with no quoted title.
 */
function titleOf(entry: string): string | null {
  const match = TITLE_PATTERN.exec(entry);
  if (!match) return null;
  const title: string = match[1];
  return title;
}

/**
 * Lists the media files of the song, primary file first. The class screen is 1920x1080, so the
 * phone pair of the song stays out of the list.
 * @param song The song of the week.
 * @returns The media files of the song.
 */
function songFiles(song: WeekSong): string[] {
  const files: string[] = [];
  for (const file of [song.video, song.audio, song.poster]) {
    if (file) files.push(file);
  }
  return files;
}

/**
 * Lists the media files of one book, primary file first.
 * @param book The book of the week.
 * @returns The media files of the book.
 */
function bookFiles(book: WeekBook): string[] {
  const files: string[] = [];
  if (book.audio.file) files.push(book.audio.file);
  if (book.audio.slowFile) files.push(book.audio.slowFile);
  return files;
}

/**
 * Finds the media part that one step opens (rule D1).
 *
 * The function reads the `materials` list of the step, the fixed key at the start of an entry,
 * and the quoted title at its end. It never reads a step id, so a rename of a step keeps its
 * media.
 * @param step The step of a lesson day.
 * @param week The week of the step.
 * @returns The media part of the step, or `null` when the step opens no player.
 */
export function stepMediaOf(step: LessonStep, week: StorytimeWeek): StepMedia | null {
  for (const entry of step.materials) {
    if (entry.startsWith(SONG_KEY)) {
      const title = titleOf(entry);
      const song = week.song;
      if (title === null || !song || song.title !== title) continue;
      return { kind: "song", title, files: songFiles(song) };
    }
    if (entry.startsWith(BOOK_KEY)) {
      const title = titleOf(entry);
      if (title === null) continue;
      const book = week.books.find((entry2) => entry2.title === title);
      if (!book) continue;
      return { kind: book.kind, title, files: bookFiles(book) };
    }
  }
  return null;
}

/**
 * Reports whether the media part of a step holds a signed URL.
 *
 * Every media URL of the app is a signed URL, so a part with no signed URL opens no player.
 * @param media The media part of a step.
 * @param mediaUrls The signed URLs of the week.
 * @returns `true` when the primary file of the part holds a signed URL.
 */
export function hasSignedMedia(media: StepMedia, mediaUrls: Record<string, string>): boolean {
  const [primary] = media.files;
  if (!primary) return false;
  if (!Object.hasOwn(mediaUrls, primary)) return false;
  return mediaUrls[primary] !== "";
}
