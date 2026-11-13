/**
 * The receiving step of a Storytime week (plan task 2.6, spec FR-4).
 *
 * It reads the Workbooks week files at a handed-off commit, resolves the commit to the full id,
 * validates each week with the app contract, and writes the week to
 * `apps/storytime/content/l<level>/w<nn>.json`. It validates every requested week before it writes
 * the first file, and a week must name the level and week that the run requested. A write that
 * fails restores every file, so the content folder stays as it was. It writes the
 * source text unchanged, so a second run of the same commit makes no difference. It never changes
 * `meta.status`, because approval lives in the source repository (generation rule 12.1). It lists
 * every media file that each week names, with its kind and the generation rule that checks it.
 *
 * The runbook `docs/runbooks/storytime-app-week-sync.md` records the command.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { weekSchema, type StorytimeWeek, type WeekMedia } from "../lib/contracts/week";
import { isWeekReady } from "../lib/readiness";

/** The result of the receiving step for one week. */
export interface ReceivedWeek {
  /** The file that the step writes, relative to the repository root. */
  path: string;
  /** The text of the written week. */
  contents: string;
  /** The media files that the week names. */
  media: WeekMedia[];
  /** Whether the week may reach a child (spec FR-5, AC-5.4, AC-5.5); a shared rule with the route. */
  ready: boolean;
}

/** The rule that checks each kind of media (generation rules, draft 2). */
export const MEDIA_RULES = {
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
    for (const clip of Object.values(book.audio.wordClips ?? {})) add(clip, "word-clip", MEDIA_RULES.bookAudio);
    for (const clip of Object.values(book.audio.sentenceClips ?? {})) {
      add(clip, "sentence-clip", MEDIA_RULES.bookAudio);
    }
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

  for (const script of week.scripts) {
    for (const step of script.steps) {
      for (const word of step.blendDrill?.words ?? []) {
        for (const clip of word.audio ?? []) add(clip, "phoneme", MEDIA_RULES.phoneme);
      }
    }
    for (const card of script.recall?.items ?? []) {
      add(card.audio, "phoneme", MEDIA_RULES.phoneme);
    }
  }

  return [...files.values(), ...missing.values()];
}

/** One media path that a week names, with the field path that holds it. */
export interface WeekMediaPath {
  /** The field path inside the week, for example `books.0.pages.1.image.file`. */
  path: string;
  /** The file that the path holds. */
  file: string;
}

/** The file extensions that a media path ends with. */
const MEDIA_EXTENSION = /\.(mp3|wav|m4a|aac|ogg|opus|mp4|m4v|webm|mov|jpg|jpeg|png|webp|gif|svg|pdf)$/i;

/**
 * Lists every media path that a week names, with the field path that holds it (finding F13).
 *
 * The walk reads every string of the week, so a media path in a field that the media list does
 * not read still shows up. The list of the media paths of a week is the proof that the media
 * list covers them.
 * @param week The week, or a value of another shape.
 * @returns One entry per media path, in the order of the walk.
 */
export function mediaPathsOf(week: unknown): WeekMediaPath[] {
  const found: WeekMediaPath[] = [];
  const walk = (value: unknown, path: string[]): void => {
    if (typeof value === "string") {
      if (MEDIA_EXTENSION.test(value)) found.push({ path: path.join("."), file: value });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, [...path, String(index)]));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) walk(entry, [...path, key]);
    }
  };
  walk(week, []);
  return found;
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
  return { path, contents, media: mediaOf(data), ready: isWeekReady(data) };
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
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
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

/** One file that a run writes. */
export interface StagedFile {
  /** The absolute target path. */
  path: string;
  text: string;
}

/** The file operations of `writeStaged`; a test replaces one to make it fail. */
export interface StagedOps {
  rename: (from: string, to: string) => void;
  /** Writes a file; the flag `wx` fails when the file exists. */
  write: (path: string, data: string | Buffer, flag: "w" | "wx") => void;
  /** Removes one file; a missing file is not an error. */
  remove: (path: string) => void;
  /** Removes one folder only when it is empty. */
  removeFolder: (path: string) => void;
}

const defaultOps: StagedOps = {
  rename: renameSync,
  write: (path, data, flag) => writeFileSync(path, data, { flag }),
  remove: (path) => rmSync(path, { force: true }),
  removeFolder: (path) => rmdirSync(path),
};

/** The rollback of a failed write did not finish; the message names what is still wrong. */
export class RollbackIncompleteError extends Error {
  /** What the rollback could not do, one entry for each file or folder. */
  readonly problems: string[];

  /**
   * @param first The first error of the write.
   * @param problems What the rollback could not do.
   */
  constructor(first: Error, problems: string[]) {
    super(`${first.message}; the content folder is not fully restored: ${problems.join("; ")}`, {
      cause: first,
    });
    this.name = "RollbackIncompleteError";
    this.problems = problems;
  }
}

/**
 * Gives a random suffix for a stage or recovery name.
 * @returns Twelve hexadecimal digits.
 */
function suffix(): string {
  return randomBytes(6).toString("hex");
}

/**
 * Writes all files or none of them (adversarial F29, Review A F32, Review B F40 and F41).
 *
 * It reads the original bytes of each target, writes every new text to an exclusive file with a
 * random name in the same folder, and then renames the stage files onto the targets. On any
 * error it tries every restore step and every cleanup step on its own: it puts the original bytes
 * back, deletes the new files and the stage files, and removes the folders it created. It removes
 * a created folder only when the folder is empty, so a file that the run does not own survives
 * (Review A F56); a folder that stays is named. It keeps the first error. If an original cannot be
 * put back, it saves a copy next to the target and names both. The copy is written to a stage
 * name and renamed after the full write, so a fault in the middle of the copy leaves no partial
 * copy; the error names the copy that it removed or that it kept (finding F98).
 * @param files The files to write; the last file is written last.
 * @param overrides File operations to replace; a test uses this to make a step fail.
 * @throws The first error when the rollback finished, or a `RollbackIncompleteError`.
 */
export function writeStaged(files: StagedFile[], overrides: Partial<StagedOps> = {}): void {
  const ops = { ...defaultOps, ...overrides };
  const originals = new Map<string, Buffer | null>();
  const stages: string[] = [];
  const created = new Set<string>();
  const replaced: string[] = [];
  try {
    for (const { path } of files) originals.set(path, existsSync(path) ? readFileSync(path) : null);
    for (const { path, text } of files) {
      const top = mkdirSync(dirname(path), { recursive: true });
      // `top` is the first folder that this call created; every folder from there down is new.
      for (let folder = dirname(path); top; folder = dirname(folder)) {
        created.add(folder);
        if (folder === top || dirname(folder) === folder) break;
      }
      const stage = `${path}.tmp-${suffix()}`;
      try {
        ops.write(stage, text, "wx");
      } catch (error) {
        // A file that already stands at the stage name is not ours: keep it.
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") stages.push(stage);
        throw error;
      }
      stages.push(stage);
    }
    files.forEach(({ path }, index) => {
      ops.rename(stages[index]!, path);
      replaced.push(path);
    });
  } catch (first) {
    const problems: string[] = [];
    for (const path of replaced) {
      const original = originals.get(path) ?? null;
      try {
        if (original) ops.write(path, original, "w");
        else ops.remove(path);
      } catch (error) {
        let note = "its new text stays";
        if (original) {
          const copy = `${path}.orig-${suffix()}`;
          const stage = `${path}.tmp-${suffix()}`;
          let written = false;
          try {
            ops.write(stage, original, "wx");
            written = true;
            ops.rename(stage, copy);
            note = `its original is kept in ${copy}`;
          } catch (copyError) {
            if (written) {
              note = `its original could not be kept under its own name (${(copyError as Error).message}); the full copy stays in ${stage}`;
            } else if (!existsSync(stage)) {
              // The copy write failed before it made a file, so no partial copy stands.
              note = `its original could not be kept (${(copyError as Error).message}); no partial copy stays`;
            } else {
              // A fault in the middle of the copy leaves a partial file. Remove it and name it.
              try {
                ops.remove(stage);
                note = `its original could not be kept (${(copyError as Error).message}); the partial copy ${stage} was removed`;
              } catch {
                note = `its original could not be kept (${(copyError as Error).message}); the partial copy ${stage} stays`;
              }
            }
          }
        }
        problems.push(`${path} is not restored (${(error as Error).message}); ${note}`);
      }
    }
    for (const stage of stages) {
      try {
        ops.remove(stage);
      } catch (error) {
        problems.push(`${stage} is not removed (${(error as Error).message})`);
      }
    }
    for (const folder of [...created].sort((a, b) => b.length - a.length)) {
      try {
        ops.removeFolder(folder);
      } catch (error) {
        problems.push(`${folder} is not removed (${(error as Error).message})`);
      }
    }
    if (problems.length > 0) throw new RollbackIncompleteError(first as Error, problems);
    throw first;
  }
}

/** The name of a stage file or a recovery copy that a failed run can leave. */
const LEFTOVER_NAME = /\.(tmp|orig)-\w+$/;

/**
 * Lists the stage files and recovery copies that a failed run left in a folder (Review A F57).
 * @param directory The content folder.
 * @returns The exact paths, in folder order.
 */
export function findLeftovers(directory: string): string[] {
  const found: string[] = [];
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...findLeftovers(path));
    else if (LEFTOVER_NAME.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * Tells whether a path is a link (finding F78).
 *
 * A link to a folder is not a folder entry, so the scan of a folder tree misses it. The content
 * folder itself can be a link, and then every week would land outside the content folder.
 * @param path The absolute path.
 * @returns Whether the path is a symbolic link.
 */
export function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Lists the links of a folder tree, without following a link (finding F78).
 *
 * The leftover scanner reads the entries of a folder, and a link to a folder is not a folder
 * entry. A link can send a week outside the content folder, so the receiver stops at one.
 * @param directory The content folder.
 * @returns The exact paths of the links, in folder order.
 */
export function findLinks(directory: string): string[] {
  const found: string[] = [];
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      found.push(path);
      continue;
    }
    if (entry.isDirectory()) found.push(...findLinks(path));
  }
  return found;
}

/**
 * Gives the first link of a target path, from a root folder down (finding F84).
 *
 * The stage file of a write sits in the folder of the target, so a link at any folder of the
 * way sends the write outside the content folder.
 * @param root The content folder.
 * @param target The absolute path of the target file.
 * @returns The path of the link, or `null` when the path holds no link.
 */
export function linkInPath(root: string, target: string): string | null {
  let current = root;
  for (const part of relative(root, target).split(sep)) {
    if (part.length === 0) continue;
    current = resolve(current, part);
    let stat: Stats;
    try {
      stat = lstatSync(current);
    } catch {
      return null;
    }
    if (stat.isSymbolicLink()) return current;
  }
  return null;
}

/** The help text of `--help`. */
const USAGE = [
  "Usage: node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit <sha> [options]",
  "  --commit <sha>   The handed-off Workbooks commit, 7 to 40 lower-case hexadecimal digits (required).",
  "                   The receiver records the full commit in source.json.",
  "  --level <n>      The Storytime level, 1 to 4 (default 2).",
  "  --weeks <list>   Week numbers 1 to 32, for example 1-8 or 1,3,5-7 (default 1-8).",
  "  --source <dir>   The Workbooks repository (default $WORKBOOKS_DIR or ~/Desktop/Workbooks).",
  "  --help           Print this text and exit 0.",
  "Exit codes: 0 success; 64 wrong request, nothing changed; 1 other failure.",
  "  After a code 1 the content folder is restored, unless the message says it is not fully restored.",
  "  A leftover .tmp- or .orig- file in the content folder stops a run with code 1; see the runbook.",
  "  A link in the content folder stops a run with code 1; it can send a week outside the folder.",
].join("\n");

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
  if (argv.includes("--help")) {
    console.log(USAGE);
    return 0;
  }
  let options: RunOptions;
  try {
    options = withResolvedCommit(parseOptions(argv));
  } catch (error) {
    console.error((error as Error).message);
    return 64;
  }
  const contentDirectory = resolve(root, "apps/storytime/content");
  const sourcePath = resolve(contentDirectory, "source.json");
  if (isLink(contentDirectory)) {
    console.error(
      [
        `The content folder is a link: ${contentDirectory}`,
        "Nothing was read or written. A link can send a week outside the content folder.",
        "Remove the link, then run the receiver again.",
      ].join("\n"),
    );
    return 1;
  }
  const leftovers = findLeftovers(contentDirectory);
  if (leftovers.length > 0) {
    console.error(
      [
        `The content folder holds ${leftovers.length} possible recovery file(s):`,
        ...leftovers.map((path) => `  ${path}`),
        "Nothing was read or written. A match may be an unrelated file that a user made; a .orig- file can hold the only copy of an original.",
        'Follow "Recover from a failed run" in docs/runbooks/storytime-app-week-sync.md, then run again.',
      ].join("\n"),
    );
    return 1;
  }
  const links = findLinks(contentDirectory);
  if (links.length > 0) {
    console.error(
      [
        `The content folder holds ${links.length} link(s):`,
        ...links.map((path) => `  ${path}`),
        "Nothing was read or written. A link can send a week outside the content folder.",
        "Remove the link, then run the receiver again.",
      ].join("\n"),
    );
    return 1;
  }

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
      // Unreachable while findLinks above rejects every link under the content folder first; it
      // stays as the guard for the race where a link appears between that scan and the write of
      // the week path (finding F129). No test covers this line.
      const link = linkInPath(contentDirectory, resolve(root, week.path));
      if (link) {
        throw new Error(
          `The path of ${week.path} holds the link ${link}. A link can send a week outside the content folder.`,
        );
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

  const sourceRecord = {
    repository: repositoryOf(options.sourceDirectory),
    commit: options.commit,
    files,
  };
  try {
    writeStaged([
      ...received.map((week) => ({ path: resolve(root, week.path), text: week.contents })),
      { path: sourcePath, text: `${JSON.stringify(sourceRecord, null, 2)}\n` },
    ]);
  } catch (error) {
    console.error(
      error instanceof RollbackIncompleteError
        ? `The write failed: ${error.message}`
        : `The write failed and the content folder is restored: ${(error as Error).message}`,
    );
    return 1;
  }

  let mediaCount = 0;
  let missingCount = 0;
  const blocked: string[] = [];
  for (const week of received) {
    const missing = week.media.filter((item) => item.missing !== undefined).length;
    mediaCount += week.media.length - missing;
    missingCount += missing;
    if (!week.ready) blocked.push(week.path);
    console.log(
      `Wrote ${week.path} (${week.media.length - missing} media files, ${missing} missing pictures; ${week.ready ? "ready" : "not ready"})`,
    );
    for (const item of week.media) {
      console.log(`  ${item.kind}\t${item.rule}\t${item.file}${item.missing ? `\tmissing: ${item.missing}` : ""}`);
    }
  }
  // The at-home route answers 404 for each blocked week, so the operator sees it here first.
  if (blocked.length > 0) console.log(`Not ready for the at-home app: ${blocked.join(", ")}`);
  console.log(
    `Wrote apps/storytime/content/source.json (record ${files.length} weeks; this run ${received.length} weeks, ${mediaCount} media files, ${missingCount} missing pictures)`,
  );
  return 0;
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entry && import.meta.url === entry) process.exit(receiveMain(process.argv.slice(2)));
