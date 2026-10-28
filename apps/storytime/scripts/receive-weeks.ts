/**
 * The receiving step of a Storytime week (plan task 2.6, spec FR-4).
 *
 * It reads the Workbooks week files at a handed-off commit, validates each week with the app
 * contract, and writes the week to `apps/storytime/content/l<level>/w<nn>.json`. It writes the
 * source text unchanged, so a second run of the same commit makes no difference. It never changes
 * `meta.status`, because approval lives in the source repository (generation rule 12.1). It lists
 * every media file that each week names, with its kind and the generation rule that checks it.
 *
 * The runbook `docs/runbooks/storytime-app-week-sync.md` records the command.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { weekSchema, type StorytimeWeek, type WeekMedia } from "../lib/contracts/week";

/** The result of the receiving step for one week. */
export interface ReceivedWeek {
  /** The file that the step writes, relative to the repository root. */
  path: string;
  /** The text of the written week. */
  contents: string;
  /** The media files that the week names. */
  media: WeekMedia[];
}

/** The rule that checks each kind of media (generation rules, draft 2). */
const MEDIA_RULES = {
  bookAudio: "10.1",
  bookPicture: "9.1",
  phoneme: "5.4",
  songAudio: "5.2",
  songVideo: "4.4",
  songPicture: "9.1",
} as const;

/**
 * Gives the content file of a week.
 * @param level The Storytime level.
 * @param week The week of the level.
 * @returns The path relative to the repository root.
 */
export function weekPath(level: number, week: number): string {
  return `apps/storytime/content/l${level}/w${String(week).padStart(2, "0")}.json`;
}

/**
 * Lists the media files that a week names.
 *
 * The app never invents a file name: it lists the files that the week holds. A picture without a
 * file is a picture that production has not made yet, and the week still parses.
 * @param week The parsed week.
 * @returns One entry per file, with its kind and its rule; a repeated file counts once.
 */
export function mediaOf(week: StorytimeWeek): WeekMedia[] {
  const media = new Map<string, WeekMedia>();
  const add = (file: string | undefined, kind: string, rule: string): void => {
    if (!file || media.has(file)) return;
    media.set(file, { file, kind, rule });
  };

  for (const book of week.books) {
    add(book.audio.file, "book-audio", MEDIA_RULES.bookAudio);
    add(book.audio.slowFile, "book-audio-slow", MEDIA_RULES.bookAudio);
    add(book.cover?.file, "book-cover", MEDIA_RULES.bookPicture);
    for (const page of book.pages) add(page.image?.file, "book-page-picture", MEDIA_RULES.bookPicture);
  }

  add(week.focus.element?.audio, "phoneme", MEDIA_RULES.phoneme);
  for (const word of week.focus.family?.words ?? []) {
    add(word.image?.file, "family-word-picture", MEDIA_RULES.bookPicture);
  }

  for (const day of week.opening?.audio ?? []) {
    for (const file of day) add(file, "phoneme", MEDIA_RULES.phoneme);
  }

  if (week.song) {
    add(week.song.audio, "song-audio", MEDIA_RULES.songAudio);
    add(week.song.video, "song-video", MEDIA_RULES.songVideo);
    add(week.song.videoPhone, "song-video-phone", MEDIA_RULES.songVideo);
    add(week.song.poster, "song-poster", MEDIA_RULES.songPicture);
    add(week.song.posterPhone, "song-poster-phone", MEDIA_RULES.songPicture);
    add(week.song.karaoke, "song-karaoke", MEDIA_RULES.songVideo);
    for (const line of week.song.lines) {
      add(line.image?.file, "song-line-picture", MEDIA_RULES.songPicture);
    }
  }

  for (const strip of week.review) {
    for (const card of strip.cards) add(card.audio, "phoneme", MEDIA_RULES.phoneme);
  }

  return [...media.values()];
}

/**
 * Validates one week and gives the file that the step writes.
 * @param week The source week, parsed from JSON.
 * @param source.text The source text, when the step reads a file; it is written unchanged.
 * @returns The path, the text, and the media files.
 * @throws When the week breaks the contract; the message names each field path.
 */
export function receiveWeek(week: unknown, source: { text?: string } = {}): ReceivedWeek {
  const parsed = weekSchema.safeParse(week);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(week)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`The week breaks the contract: ${issues}`);
  }
  const data = parsed.data;
  const path = weekPath(data.meta.level, data.meta.week);
  const contents = source.text ?? `${JSON.stringify(data, null, 2)}\n`;
  const written = weekSchema.safeParse(JSON.parse(contents));
  if (!written.success || written.data.meta.status !== data.meta.status) {
    throw new Error(`The written week ${path} does not keep the status of its source`);
  }
  return { path, contents, media: mediaOf(data) };
}

/** The options of one run. */
interface RunOptions {
  commit: string;
  sourceDirectory: string;
  level: number;
  weeks: number[];
}

/**
 * Reads the week numbers of the `--weeks` value.
 * @param value `1-8`, `1,3,5`, or one number.
 * @returns The week numbers in order.
 * @throws When the value holds no week number.
 */
function parseWeeks(value: string): number[] {
  const numbers = new Set<number>();
  for (const part of value.split(",")) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const first = Number(range[1]);
      const last = Number(range[2]);
      for (let week = first; week <= last; week += 1) numbers.add(week);
      continue;
    }
    const single = part.trim();
    if (/^\d+$/.test(single)) numbers.add(Number(single));
  }
  if (numbers.size === 0) throw new Error(`The --weeks value ${value} holds no week number`);
  return [...numbers].sort((a, b) => a - b);
}

/**
 * Reads the command line of one run.
 * @param argv The arguments after the script name.
 * @returns The options.
 * @throws When `--commit` is missing or a value is wrong.
 */
function parseOptions(argv: string[]): RunOptions {
  const options: RunOptions = {
    commit: "",
    sourceDirectory: process.env.WORKBOOKS_DIR ?? resolve(homedir(), "Desktop/Workbooks"),
    level: 2,
    weeks: parseWeeks("1-8"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = argv[index + 1];
    if (name === "--commit") options.commit = value ?? "";
    else if (name === "--source") options.sourceDirectory = value ?? options.sourceDirectory;
    else if (name === "--level") options.level = Number(value);
    else if (name === "--weeks") options.weeks = parseWeeks(value ?? "1-8");
    else throw new Error(`Unknown argument ${name}`);
    index += 1;
  }
  if (!/^[0-9a-f]{7,40}$/.test(options.commit)) {
    throw new Error("The run needs --commit with the handed-off Workbooks commit");
  }
  if (!Number.isInteger(options.level) || options.level < 1 || options.level > 4) {
    throw new Error(`The --level value ${options.level} is not a Storytime level`);
  }
  return options;
}

/**
 * Gives the name of the source repository for the source record.
 * @param directory The repository directory.
 * @returns The origin URL, or the directory name.
 */
function repositoryOf(directory: string): string {
  try {
    return execFileSync("git", ["-C", directory, "remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return basename(directory);
  }
}

/**
 * Runs the receiving step for every named week.
 * @param argv The arguments after the script name.
 * @returns The exit code.
 */
function main(argv: string[]): number {
  let options: RunOptions;
  try {
    options = parseOptions(argv);
  } catch (error) {
    console.error((error as Error).message);
    return 64;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const contentDirectory = resolve(root, "apps/storytime/content");
  const files: string[] = [];
  let mediaCount = 0;
  for (const week of options.weeks) {
    const name = `w${String(week).padStart(2, "0")}.json`;
    const source = `content/storytime/l${options.level}/${name}`;
    let text: string;
    try {
      text = execFileSync("git", ["-C", options.sourceDirectory, "show", `${options.commit}:${source}`], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (error) {
      console.error(`Cannot read ${source} at ${options.commit}: ${(error as Error).message}`);
      return 1;
    }
    const parsed = (() => {
      try {
        return JSON.parse(text) as unknown;
      } catch (error) {
        console.error(`The source file ${source} holds no JSON: ${(error as Error).message}`);
        return undefined;
      }
    })();
    if (parsed === undefined) return 1;
    let received: ReceivedWeek;
    try {
      received = receiveWeek(parsed, { text });
    } catch (error) {
      console.error(`${source}: ${(error as Error).message}`);
      return 1;
    }
    const target = resolve(root, received.path);
    const inside = relative(contentDirectory, target);
    if (inside.startsWith("..") || isAbsolute(inside)) {
      console.error(`The week path ${received.path} leaves ${relative(root, contentDirectory)}`);
      return 1;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, received.contents);
    files.push(received.path);
    mediaCount += received.media.length;
    console.log(`Wrote ${received.path} (${received.media.length} media files)`);
    for (const item of received.media) console.log(`  ${item.kind}\t${item.rule}\t${item.file}`);
  }
  const sourceRecord = {
    repository: repositoryOf(options.sourceDirectory),
    commit: options.commit,
    files,
  };
  const sourcePath = resolve(contentDirectory, "source.json");
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(sourcePath, `${JSON.stringify(sourceRecord, null, 2)}\n`);
  console.log(`Wrote apps/storytime/content/source.json (${files.length} weeks, ${mediaCount} media files)`);
  return 0;
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entry && import.meta.url === entry) process.exit(main(process.argv.slice(2)));
