// @vitest-environment node
/**
 * The sentence-clip media of the approved A-42 pin (plan task 2.1, strategy P2 rows M1 to M7).
 *
 * The file reads the pin week sources (the seven hand-off week files and the shipped w08), the
 * hand-off media folders, and the shipped w01 of the app. It counts the clips that the receiver's
 * media list holds, the files that the hand-off folder holds, the `MANIFEST.txt` lines of those
 * files, and the signed URLs of the shipped w01.
 *
 * The rows prove that the 72 read-along clips and the 56 decodable clips of the pin are listed,
 * present, and signed. The repository holds no media file: the folders are the source of the
 * media, and the commit holds the week files only.
 *
 * Rows M1 to M5 and M7 fail at the base, because the contract drops w02 and w07 and because the
 * shipped w01 is the package before `r6`. Row M6 holds at both pins.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { loadWeek } from "../lib/content";
import { weekSchema } from "../lib/contracts/week";
import { signWeekMedia } from "../lib/media/sign";
import { mediaOf, mediaPathsOf } from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = resolve(app, "content");

/** The hand-off root of the Workbooks packages. */
const handoffRoot = process.env.STORYTIME_HANDOFF_ROOT ?? join(homedir(), "Desktop", "handoff");

/** The weeks that a hand-off folder holds, from 1 to 7. */
const FOLDER_WEEKS = [1, 2, 3, 4, 5, 6, 7];

/** The private bucket of the Storytime media. */
const MEDIA_BASE = "gs://storytime-app-media";

/** The file extensions of the media of the app. */
const MEDIA_EXTENSION = /\.(mp3|wav|m4a|aac|ogg|opus|mp4|m4v|webm|mov|jpg|jpeg|png|webp|gif|svg|pdf)$/i;

/** A week as plain JSON. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** One pin week source. */
interface PinSource {
  /** The week of the level. */
  week: number;
  /** The hand-off folder of the week, or `null` for w08. */
  folder: string | null;
  /** The source text. */
  text: string;
  /** The source as plain JSON. */
  data: Json;
}

/** The storage client of the signing step. */
interface StorageClient {
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

const previousContentDir = process.env.STORYTIME_CONTENT_DIR;

afterEach(() => {
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
});

/**
 * Gives the hand-off folder of a week.
 * @param week The week of the level, from 1 to 7.
 * @returns The folder name under the hand-off root.
 */
function folderOf(week: number): string {
  return `w0${week}-storytime-app-package-${week === 1 ? "r6" : "r5"}`;
}

/**
 * Reads one pin week source.
 * @param week The week of the level.
 * @returns The source, or `null` when the file is absent.
 */
function readPinSource(week: number): PinSource | null {
  const folder = week === 8 ? null : folderOf(week);
  const file = folder
    ? join(handoffRoot, folder, "l2", `w0${week}.json`)
    : resolve(contentDirectory, "l2", "w08.json");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  return { week, folder, text, data: JSON.parse(text) as Json };
}

/**
 * Reads the seven folder week sources.
 * @returns The sources, the absent sources, and the parse failures.
 */
function readFolderWeeks(): { sources: PinSource[]; absent: string[]; failures: string[] } {
  const sources: PinSource[] = [];
  const absent: string[] = [];
  const failures: string[] = [];
  for (const week of FOLDER_WEEKS) {
    const source = readPinSource(week);
    if (!source) {
      absent.push(`w0${week}: ${join(handoffRoot, folderOf(week), "l2", `w0${week}.json`)}`);
      continue;
    }
    sources.push(source);
    const result = weekSchema.safeParse(source.data);
    if (!result.success) {
      failures.push(
        `w0${week}: ${result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")}`,
      );
    }
  }
  return { sources, absent, failures };
}

/**
 * Lists the array entries of the sentence clips of a source book.
 * @param book The source book.
 * @returns The entries of the array form, or an empty array for the map form.
 */
function clipEntries(book: Json | undefined): Array<{ sentence: string; file: string }> {
  const clips = book?.audio?.sentenceClips;
  return Array.isArray(clips) ? (clips as Array<{ sentence: string; file: string }>) : [];
}

/**
 * Lists the clip files of the books of one kind in a pin week source.
 * @param source The pin week source.
 * @param kind The kind of the book.
 * @returns The clip files of every book of that kind, in source order.
 */
function clipFilesOfKind(source: PinSource, kind: "readalong" | "decodable"): string[] {
  const books = (source.data.books as Json[] | undefined) ?? [];
  return books
    .filter((book) => book.kind === kind)
    .flatMap((book) => clipEntries(book).map((entry) => entry.file));
}

/**
 * Gives the files that the media list of a parsed week holds.
 * @param week The parsed week.
 * @returns The set of the media files of the week.
 */
function listedFiles(week: unknown): Set<string> {
  return new Set(
    mediaOf(week as Parameters<typeof mediaOf>[0]).map((entry) => entry.file),
  );
}

/**
 * Walks a folder and lists every file under it.
 * @param folder The absolute folder.
 * @returns The absolute paths of the files.
 */
function walkFiles(folder: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) found.push(...walkFiles(path));
    else found.push(path);
  }
  return found;
}

describe("M1 and M2 the media list of the pin weeks", () => {
  it("lists every read-along sentence clip and every decodable sentence clip", () => {
    const { sources, absent, failures } = readFolderWeeks();
    console.log(`folder_weeks=${sources.length}`);
    expect(absent, "the seven hand-off week sources are present").toEqual([]);
    expect(failures, "every pin week parses before its clips are listed").toEqual([]);

    let readalongListed = 0;
    let decodableListed = 0;
    const missing: string[] = [];
    for (const source of sources) {
      const parsed = weekSchema.safeParse(source.data);
      if (!parsed.success) {
        missing.push(`w0${source.week} does not parse`);
        continue;
      }
      const listed = listedFiles(parsed.data);
      for (const kind of ["readalong", "decodable"] as const) {
        for (const file of clipFilesOfKind(source, kind)) {
          if (!listed.has(file)) missing.push(`w0${source.week} ${kind} clip ${file}`);
        }
      }
      readalongListed += clipFilesOfKind(source, "readalong").filter((file) => listed.has(file)).length;
      decodableListed += clipFilesOfKind(source, "decodable").filter((file) => listed.has(file)).length;
    }
    console.log(
      `readalong_clips_listed=${readalongListed} decodable_clips_listed=${decodableListed}`,
    );
    expect(missing, `clips that the media list misses: ${missing.join(" | ")}`).toEqual([]);
    expect(readalongListed, "readalong_clips_listed").toBe(72);
    expect(decodableListed, "decodable_clips_listed").toBe(56);
  });
});

describe("M3 the media list covers every media path of a pin week", () => {
  it("covers the independent walk of the seven pin weeks", () => {
    const { sources, failures } = readFolderWeeks();
    expect(failures, "every pin week parses before the coverage is checked").toEqual([]);
    let compared = 0;
    let uncovered = 0;
    const details: string[] = [];
    for (const source of sources) {
      const parsed = weekSchema.safeParse(source.data);
      if (!parsed.success) {
        details.push(`w0${source.week} does not parse`);
        continue;
      }
      compared += 1;
      const listed = listedFiles(parsed.data);
      const walked = new Set(
        mediaPathsOf(source.data)
          .filter((entry) => !entry.path.startsWith("approval."))
          .map((entry) => entry.file),
      );
      for (const file of walked) {
        if (!listed.has(file)) {
          uncovered += 1;
          details.push(`w0${source.week} ${file}`);
        }
      }
    }
    console.log(`weeks_compared=${compared} mediaof_uncovered=${uncovered}`);
    expect(details, `media paths that the list misses: ${details.slice(0, 5).join(" | ")}`).toEqual(
      [],
    );
    expect(compared, "weeks_compared").toBe(7);
    expect(uncovered, "mediaof_uncovered").toBe(0);
  });
});

describe("M4 and M5 the files of the hand-off folder", () => {
  it("holds each read-along clip file and a MANIFEST.txt line with a sha256", () => {
    const { sources, failures } = readFolderWeeks();
    expect(failures, "every pin week parses before its clip files are checked").toEqual([]);
    let present = 0;
    let manifestFound = 0;
    const missingFiles: string[] = [];
    const missingLines: string[] = [];
    for (const source of sources) {
      const folder = join(handoffRoot, source.folder!);
      const manifestFile = join(folder, "MANIFEST.txt");
      const lines = existsSync(manifestFile)
        ? readFileSync(manifestFile, "utf8").split("\n")
        : [];
      const entries = new Set(
        lines
          .map((line) => line.match(/^([0-9a-f]{64})\s\s+(.+)$/))
          .filter((match): match is RegExpMatchArray => match !== null)
          .map((match) => match[2]!.trim()),
      );
      expect(entries.size, `the MANIFEST.txt of w0${source.week} holds sha256 lines`).toBeGreaterThan(
        0,
      );
      for (const file of clipFilesOfKind(source, "readalong")) {
        if (existsSync(join(folder, file))) present += 1;
        else missingFiles.push(`w0${source.week} ${file}`);
        if (entries.has(file)) manifestFound += 1;
        else missingLines.push(`w0${source.week} ${file}`);
      }
    }
    console.log(`clip_files_present=${present} manifest_lines_found=${manifestFound}`);
    expect(missingFiles, `clip files that the folder misses: ${missingFiles.join(" | ")}`).toEqual(
      [],
    );
    expect(missingLines, `clip files without a manifest line: ${missingLines.join(" | ")}`).toEqual(
      [],
    );
    expect(present, "clip_files_present").toBe(72);
    expect(manifestFound, "manifest_lines_found").toBe(72);
  });
});

describe("M6 the repository holds no media file", () => {
  it("finds no media file under the content folder and reads at least one file", () => {
    const files = walkFiles(contentDirectory);
    expect(files.length, "the walk reads at least one file (A4)").toBeGreaterThan(0);
    const media = files.filter((file) => MEDIA_EXTENSION.test(file));
    console.log(`files_scanned=${files.length} media_files_in_content=${media.length}`);
    expect(media, `media files in the content folder: ${media.join(" | ")}`).toEqual([]);
    expect(media.length, "media_files_in_content").toBe(0);
  });
});

describe("M7 the signing of the shipped w01", () => {
  it("signs the 8 read-along clips and the 94 media paths of the week", async () => {
    process.env.STORYTIME_CONTENT_DIR = contentDirectory;
    const loaded = await loadWeek(2, 1);
    expect(loaded.kind, "the shipped w01 parses").toBe("ok");
    if (loaded.kind !== "ok") return;
    const storage: StorageClient = {
      getSignedUrl: async (key, expiresIn) =>
        `https://storage.googleapis.com/storytime-app-media/${key}?X-Amz-Signature=test&X-Amz-Expires=${expiresIn ?? ""}`,
    };
    const map = await signWeekMedia(loaded.week, { storage, mediaBase: MEDIA_BASE });
    const readalong = loaded.week.books.find((book) => book.kind === "readalong");
    const readalongFiles = Object.values(readalong?.audio.sentenceClips ?? {});
    const readalongSigned = readalongFiles.filter((file) => map[file] !== undefined).length;
    console.log(
      `signed_map_size=${Object.keys(map).length} readalong_clips_signed=${readalongSigned}`,
    );
    expect(readalongFiles.length, "the shipped w01 read-along names 8 clips").toBe(8);
    expect(readalongSigned, "readalong_clips_signed").toBe(8);
    expect(Object.keys(map).length, "signed_map_size").toBe(94);
    expect(Object.keys(map).length, "signed_map_size is greater than zero").toBeGreaterThan(0);
  });
});
