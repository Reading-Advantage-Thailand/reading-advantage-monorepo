/**
 * The receiving step of a Storytime week (plan task 2.6, spec FR-4).
 *
 * It reads the Workbooks week files at a handed-off commit, resolves the commit to the full id,
 * validates each week with the app contract, and writes the week to
 * `apps/storytime/content/l<level>/w<nn>.json`. It validates every requested week before it writes
 * the first file, and a week must name the level and week that the run requested. It writes the
 * source text unchanged, so a second run of the same commit makes no difference. It never changes
 * `meta.status`, because approval lives in the source repository (generation rule 12.1). It lists
 * every media file that each week names, with its kind and the generation rule that checks it.
 *
 * The runbook `docs/runbooks/storytime-app-week-sync.md` records the command.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
 * file is a picture that production has not made yet, and the week still parses. A page picture,
 * a cover, a family-word picture, or a song-line picture with an image entry and no file is listed
 * as a missing item (Review A F2 and F9); its `file` holds the field path of the image inside the
 * week and its `missing` text names the place. Files and missing items live in separate maps, so a
 * file named like a field path cannot hide a missing item.
 * @param week The parsed week.
 * @returns One entry per file, then one entry per missing picture; a repeated file counts once.
 */
export function mediaOf(week: StorytimeWeek): WeekMedia[] {
  const files = new Map<string, WeekMedia>();
  const missing = new Map<string, WeekMedia>();
  const add = (file: string | undefined, kind: string, rule: string): void => {
    if (!file || files.has(file)) return;
    files.set(file, { file, kind, rule });
  };
  const picture = (
    image: { file?: string } | undefined,
    field: string,
    place: string,
    kind: string,
    rule: string,
  ): void => {
    if (!image) return;
    if (image.file) add(image.file, kind, rule);
    else missing.set(field, { file: field, kind, rule, missing: place });
  };

  week.books.forEach((book, bookIndex) => {
    add(book.audio.file, "book-audio", MEDIA_RULES.bookAudio);
    add(book.audio.slowFile, "book-audio-slow", MEDIA_RULES.bookAudio);
    picture(
      book.cover,
      `books.${bookIndex}.cover`,
      `the cover of the ${book.kind} book`,
      "book-cover",
      MEDIA_RULES.bookPicture,
    );
    book.pages.forEach((page, pageIndex) => {
      picture(
        page.image,
        `books.${bookIndex}.pages.${pageIndex}.image`,
        `page ${pageIndex + 1} of the ${book.kind} book`,
        "book-page-picture",
        MEDIA_RULES.bookPicture,
      );
    });
  });

  add(week.focus.element?.audio, "phoneme", MEDIA_RULES.phoneme);
  (week.focus.family?.words ?? []).forEach((word, wordIndex) => {
    picture(
      word.image,
      `focus.family.words.${wordIndex}.image`,
      `the picture of the family word ${word.word}`,
      "family-word-picture",
      MEDIA_RULES.bookPicture,
    );
  });

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
    week.song.lines.forEach((line, lineIndex) => {
      picture(
        line.image,
        `song.lines.${lineIndex}.image`,
        `the picture of song line ${lineIndex + 1}`,
        "song-line-picture",
        MEDIA_RULES.songPicture,
      );
    });
  }

  for (const strip of week.review) {
    for (const card of strip.cards) add(card.audio, "phoneme", MEDIA_RULES.phoneme);
  }

  return [...files.values(), ...missing.values()];
}

/**
 * Validates one week and gives the file that the step writes.
 * @param week The source week, parsed from JSON.
 * @param source.text The source text, when the step reads a file; it is written unchanged.
 * @param source.expected The level and week that the run requested; the week must name them.
 * @returns The path, the text, and the media files.
 * @throws When the week breaks the contract, or names another level or week than the request.
 */
export function receiveWeek(
  week: unknown,
  source: { text?: string; expected?: { level: number; week: number } } = {},
): ReceivedWeek {
  const parsed = weekSchema.safeParse(week);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(week)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`The week breaks the contract: ${issues}`);
  }
  const data = parsed.data;
  const path = weekPath(data.meta.level, data.meta.week);
  const { expected } = source;
  if (expected && (data.meta.level !== expected.level || data.meta.week !== expected.week)) {
    throw new Error(
      `The week names level ${data.meta.level} week ${data.meta.week}, and the run requested week ${expected.week} of level ${expected.level}`,
    );
  }
  const contents = source.text ?? `${JSON.stringify(data, null, 2)}\n`;
  const written = weekSchema.safeParse(JSON.parse(contents));
  if (!written.success || written.data.meta.status !== data.meta.status) {
    throw new Error(`The written week ${path} does not keep the status of its source`);
  }
  return { path, contents, media: mediaOf(data) };
}

/** One source file of a run: the week that the run requested and the text that Workbooks holds. */
export interface WeekSourceFile {
  level: number;
  week: number;
  /** The path in the source repository, for the messages. */
  source: string;
  text: string;
}

/**
 * Validates every source file of a run before any file is written.
 * @param files The source files, one per requested week.
 * @returns The received weeks in the order of the files.
 * @throws When a file holds no JSON, breaks the contract, names another week than requested, or
 * shares its target path with another file; the message names the source file.
 */
export function receiveWeeks(files: WeekSourceFile[]): ReceivedWeek[] {
  const received: ReceivedWeek[] = [];
  const targets = new Set<string>();
  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(file.text);
    } catch (error) {
      throw new Error(`The source file ${file.source} holds no JSON: ${(error as Error).message}`);
    }
    let week: ReceivedWeek;
    try {
      week = receiveWeek(parsed, {
        text: file.text,
        expected: { level: file.level, week: file.week },
      });
    } catch (error) {
      throw new Error(`${file.source}: ${(error as Error).message}`);
    }
    if (targets.has(week.path)) {
      throw new Error(`${file.source}: two weeks share the same target path ${week.path}`);
    }
    targets.add(week.path);
    received.push(week);
  }
  return received;
}

/**
 * Resolves a commit reference to the full commit id of the source repository.
 *
 * The step records the full 40-hex id, so a run with a short commit and a run with the full id
 * write the same `source.json` (Review A F5).
 * @param directory The source repository directory.
 * @param reference The `--commit` value (`ccf3d95c` or the full id).
 * @returns The full commit id.
 * @throws When the reference names no commit in the source repository.
 */
export function resolveCommit(directory: string, reference: string): string {
  return execFileSync(
    "git",
    ["-C", directory, "rev-parse", "--verify", `${reference}^{commit}`],
    { encoding: "utf8" },
  ).trim();
}

/** The options of one run. */
interface RunOptions {
  commit: string;
  sourceDirectory: string;
  level: number;
  weeks: number[];
}

/** The highest week number of a level (the contract bound). */
const WEEK_MAX = 32;

/**
 * Reads the week numbers of the `--weeks` value.
 * @param value `1-8`, `1,3,5`, or one number; each number is 1 to 32.
 * @returns The week numbers in order.
 * @throws When a token is not a week number or a rising range of week numbers.
 */
function parseWeeks(value: string): number[] {
  const numbers = new Set<number>();
  for (const part of value.split(",")) {
    const token = part.trim();
    const range = token.match(/^(\d+)-(\d+)$/);
    const first = Number(range ? range[1] : token);
    const last = Number(range ? range[2] : token);
    if (!(range || /^\d+$/.test(token)) || first < 1 || last > WEEK_MAX || first > last) {
      throw new Error(`The --weeks value ${value} holds "${token}", which is no week from 1 to ${WEEK_MAX}`);
    }
    for (let week = first; week <= last; week += 1) numbers.add(week);
  }
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
 * Resolves the commit of one run to the full id before the step reads any file.
 * @param options The parsed options.
 * @returns The options with the full commit id.
 * @throws When the commit names no commit in the source repository.
 */
function withResolvedCommit(options: RunOptions): RunOptions {
  try {
    return { ...options, commit: resolveCommit(options.sourceDirectory, options.commit) };
  } catch (error) {
    throw new Error(
      `Cannot resolve the commit ${options.commit} in ${options.sourceDirectory}: ${(error as Error).message}`,
    );
  }
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
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return basename(directory);
  }
}

/** The repository root that holds `apps/storytime`, found from this file. */
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Decides the file list of `source.json` for a run.
 *
 * One commit must describe the whole set. A run at the commit of the record may add weeks to the
 * list. A run at a new commit must cover every file of the record, because a week left out would
 * stay on the old commit while the record names the new one (adversarial F26, Review C F15).
 * @param recordPath The path of `source.json`.
 * @param commit The full commit of this run.
 * @param files The files this run writes, relative to the repository root.
 * @returns The file list of the new record.
 * @throws When the run is a subset at a new commit, or `source.json` holds no JSON.
 */
function mergedFiles(recordPath: string, commit: string, files: string[]): string[] {
  if (!existsSync(recordPath)) return [...files].sort();
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as { commit?: string; files?: string[] };
  const recorded = record.files ?? [];
  if (record.commit === commit) return [...new Set([...recorded, ...files])].sort();
  const left = recorded.filter((file) => !files.includes(file));
  if (left.length > 0) {
    throw new Error(
      `A run at the commit ${commit} must cover every recorded week; it leaves ${left.join(", ")} on the commit ${record.commit}. Run all weeks`,
    );
  }
  return [...files].sort();
}

/**
 * Runs the receiving step for every named week.
 *
 * The step reads, validates, and checks every week first. It writes the first file only when all
 * weeks pass, so a failed run leaves the content folder as it was.
 * @param argv The arguments after the script name.
 * @param root The repository root; tests pass a temporary root.
 * @returns The exit code: 0 for success, 1 for a source or contract failure, 64 for a bad request.
 */
export function receiveMain(argv: string[], root: string = defaultRoot): number {
  let options: RunOptions;
  try {
    options = withResolvedCommit(parseOptions(argv));
  } catch (error) {
    console.error((error as Error).message);
    return 64;
  }
  const contentDirectory = resolve(root, "apps/storytime/content");
  const sourcePath = resolve(contentDirectory, "source.json");

  const sources: WeekSourceFile[] = [];
  for (const week of options.weeks) {
    const name = `w${String(week).padStart(2, "0")}.json`;
    const source = `content/storytime/l${options.level}/${name}`;
    try {
      const text = execFileSync("git", ["-C", options.sourceDirectory, "show", `${options.commit}:${source}`], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      sources.push({ level: options.level, week, source, text });
    } catch (error) {
      console.error(`Cannot read ${source} at ${options.commit}: ${(error as Error).message}`);
      return 1;
    }
  }

  let received: ReceivedWeek[];
  try {
    received = receiveWeeks(sources);
    for (const week of received) {
      const inside = relative(contentDirectory, resolve(root, week.path));
      if (inside.startsWith("..") || isAbsolute(inside)) {
        throw new Error(`The week path ${week.path} leaves ${relative(root, contentDirectory)}`);
      }
    }
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
  let files: string[];
  try {
    files = mergedFiles(sourcePath, options.commit, received.map((week) => week.path));
  } catch (error) {
    console.error((error as Error).message);
    return 64;
  }

  let mediaCount = 0;
  let missingCount = 0;
  for (const week of received) {
    const target = resolve(root, week.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, week.contents);
    const missing = week.media.filter((item) => item.missing !== undefined).length;
    mediaCount += week.media.length - missing;
    missingCount += missing;
    console.log(`Wrote ${week.path} (${week.media.length - missing} media files, ${missing} missing pictures)`);
    for (const item of week.media) {
      console.log(`  ${item.kind}\t${item.rule}\t${item.file}${item.missing ? `\tmissing: ${item.missing}` : ""}`);
    }
  }
  const sourceRecord = {
    repository: repositoryOf(options.sourceDirectory),
    commit: options.commit,
    files,
  };
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(sourcePath, `${JSON.stringify(sourceRecord, null, 2)}\n`);
  console.log(
    `Wrote apps/storytime/content/source.json (${files.length} weeks, ${mediaCount} media files, ${missingCount} missing pictures)`,
  );
  return 0;
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entry && import.meta.url === entry) process.exit(receiveMain(process.argv.slice(2)));
