// @vitest-environment node
/**
 * Adversarial round of Phase 2, the approved A-42 pin (round r1, audited HEAD `77315c83f`).
 *
 * The phase strategy asks for five small attacks: an approved loops part without words or a valid
 * date, a draft clone at the pin, a read-along clip count or order mismatch, a clip file missing
 * from the hand-off folder, and the reversed decodable array of Review A finding F1. A sixth row
 * pins Review B finding F21: a week JSON with no meta reads as a draft.
 *
 * The file changes nothing in the repository. A hostile week is a deep clone of a shipped week or
 * of a hand-off week. A folder attack runs on a temporary copy of real files. A finding is a
 * record in the run log, not a repository change.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadVisibleWeek } from "../lib/content";
import { weekSchema } from "../lib/contracts/week";
import { isWeekReady, readinessBlocker } from "../lib/readiness";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = resolve(app, "content");
const weekDirectory = resolve(contentDirectory, "l2");

/** The hand-off root of the Workbooks packages. */
const handoffRoot = process.env.STORYTIME_HANDOFF_ROOT ?? join(homedir(), "Desktop", "handoff");

/** The approved pin that the release reads. */
const PIN = "70278a9beb8ef7314d98df80e0462892a0ca5019";

/** A week as plain JSON. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The temporary folders of one case. */
const tempFolders: string[] = [];

const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
const previousDraftMedia = process.env.STORYTIME_SHOW_DRAFT_MEDIA;

beforeEach(() => {
  delete process.env.STORYTIME_CONTENT_DIR;
  delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
});

afterEach(() => {
  for (const folder of tempFolders.splice(0)) rmSync(folder, { recursive: true, force: true });
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
  if (previousDraftMedia === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  else process.env.STORYTIME_SHOW_DRAFT_MEDIA = previousDraftMedia;
  vi.restoreAllMocks();
});

/**
 * Gives a new temporary folder.
 * @param label A short label for the folder name.
 * @returns The absolute path of the folder.
 */
function tempFolder(label: string): string {
  const root = existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir();
  const folder = mkdtempSync(join(root, `storytime-a42-${label}-`));
  tempFolders.push(folder);
  return folder;
}

/**
 * Gives the hand-off folder of a pin week.
 * @param week The week of the level, from 1 to 7.
 * @returns The folder name under the hand-off root.
 */
function folderOf(week: number): string {
  return `w0${week}-storytime-app-package-${week === 1 ? "r6" : "r5"}`;
}

/**
 * Reads a shipped week file.
 * @param week The week of the level.
 * @returns The week as plain JSON.
 */
function readShippedWeek(week: number): Json {
  return JSON.parse(readFileSync(resolve(weekDirectory, `w0${week}.json`), "utf8")) as Json;
}

/**
 * Reads a hand-off week file.
 * @param week The week of the level, from 1 to 7.
 * @returns The week as plain JSON.
 */
function readFolderWeek(week: number): Json {
  const file = join(handoffRoot, folderOf(week), "l2", `w0${week}.json`);
  expect(existsSync(file), `the hand-off week file must exist: ${file}`).toBe(true);
  return JSON.parse(readFileSync(file, "utf8")) as Json;
}

/**
 * Lists the field paths of the issues of a refused week.
 * @param week The candidate week.
 * @returns The issue paths, or an empty list when the contract accepts the week.
 */
function issuePaths(week: unknown): string[] {
  const result = weekSchema.safeParse(week);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join("."));
}

/**
 * Writes a week under a temporary content folder.
 * @param week The week JSON.
 * @param weekNumber The week of the level.
 * @returns The absolute content folder.
 */
function contentWith(week: Json, weekNumber: number): string {
  const folder = tempFolder(`week${weekNumber}`);
  mkdirSync(join(folder, "l2"), { recursive: true });
  writeFileSync(join(folder, "l2", `w0${weekNumber}.json`), JSON.stringify(week));
  return folder;
}

/**
 * Loads one week with the loader of the app and records its log lines.
 * @param folder The content folder.
 * @param week The week of the level.
 * @returns The visible week and the log lines of the loader.
 */
async function loadFrom(
  folder: string,
  week: number,
): Promise<{ visible: Awaited<ReturnType<typeof loadVisibleWeek>>; warnings: string[] }> {
  process.env.STORYTIME_CONTENT_DIR = folder;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const visible = await loadVisibleWeek(2, week);
  const warnings = warn.mock.calls.map((call) => String(call[0]));
  warn.mockRestore();
  return { visible, warnings };
}

/**
 * Approves the three media parts that the readiness rule reads.
 * @param week The week, changed in place.
 */
function approveMedia(week: Json): void {
  for (const part of ["images", "audio", "song"]) {
    week.approval[part] = { ...week.approval[part], status: "approved" };
  }
}

describe("A1 an approved loops part without words or a valid date", () => {
  it("refuses a missing date, an empty date, missing words, and blank words", () => {
    const base = readFolderWeek(2);
    expect(issuePaths(base), "the unbroken pin week parses (positive control)").toEqual([]);
    const cases: Array<[string, (week: Json) => void, string]> = [
      ["a missing date", (week) => delete week.approval.loops.date, "approval.loops.date"],
      ["an empty date", (week) => (week.approval.loops.date = ""), "approval.loops.date"],
      ["missing words", (week) => delete week.approval.loops.words, "approval.loops.words"],
      ["blank words", (week) => (week.approval.loops.words = "   "), "approval.loops.words"],
    ];
    let refusals = 0;
    const problems: string[] = [];
    for (const [name, mutate, path] of cases) {
      const copy = structuredClone(base) as Json;
      copy.approval.loops = {
        status: "approved",
        date: "2026-11-15",
        words: "Approved",
      };
      mutate(copy);
      const paths = issuePaths(copy);
      if (paths.includes(path)) refusals += 1;
      else problems.push(`${name}: expected the issue path ${path}, read ${paths.join(" | ")}`);
    }
    console.log(`loops_refusals=${refusals} of ${cases.length}`);
    expect(problems, `loops rows that the contract accepts: ${problems.join(" ; ")}`).toEqual([]);
    expect(refusals, "loops_refusals").toBe(4);
  });

  it.fails("F30 refuses an approved loops part with a malformed date", () => {
    // The contract checks that a date is present, not that it is a date. Spec AC-13.2 asks for a
    // date only, so this row records a weakness and does not block the phase.
    for (const date of ["not-a-date", "2026-13-45"]) {
      const copy = structuredClone(readFolderWeek(2)) as Json;
      copy.approval.loops = { status: "approved", date, words: "Approved" };
      console.log(`loops_malformed_date_${date.replace(/\W+/g, "_")}_accepted=${issuePaths(copy).length === 0 ? 1 : 0}`);
      expect(issuePaths(copy), `the contract must refuse the date ${date}`).toContain(
        "approval.loops.date",
      );
    }
  });
});

describe("A2 a draft clone of a week at the approved pin", () => {
  it("stays draft and is not served, with and without the draft-media switch", async () => {
    const clone = structuredClone(readFolderWeek(2)) as Json;
    clone.meta.status = "draft";
    approveMedia(clone);
    clone.approval.loops = { status: "approved", date: "2026-11-15", words: "Approved" };
    const pictures = clone.books.flatMap((book: Json) => book.pages);
    const withoutFile = pictures.filter((page: Json) => !page.image?.file).length;
    console.log(
      `draft_clone_loops=${clone.approval.loops.status} draft_clone_pages_without_file=${withoutFile} blocker=${readinessBlocker(clone)}`,
    );
    expect(withoutFile, "the clone holds a picture file on every page").toBe(0);
    expect(readinessBlocker(clone), "the clone is blocked as a draft").toBe("draft");
    expect(isWeekReady(clone), "the clone is not ready").toBe(false);

    const folder = contentWith(clone, 2);
    const plain = await loadFrom(folder, 2);
    expect(plain.visible, "the app must not serve the draft clone").toBeNull();
    expect(
      plain.warnings.some((line) => line.includes("blocked: draft")),
      `the loader names the draft reason: ${plain.warnings.join(" | ")}`,
    ).toBe(true);

    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    const withSwitch = await loadFrom(folder, 2);
    delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
    expect(withSwitch.visible, "the draft-media switch must not serve the draft clone").toBeNull();
    console.log(
      `draft_clone_served=${plain.visible === null && withSwitch.visible === null ? 0 : 1}`,
    );
  });

  it("serves the same clone when the status is published (positive control)", async () => {
    const clone = structuredClone(readFolderWeek(2)) as Json;
    clone.meta.status = "published";
    approveMedia(clone);
    expect(readinessBlocker(clone), "the published clone is ready").toBeNull();
    const folder = contentWith(clone, 2);
    const loaded = await loadFrom(folder, 2);
    expect(loaded.visible, "the app serves the published clone").not.toBeNull();
  });
});

describe("A3 a read-along clip count or order mismatch", () => {
  it("refuses a missing clip, a swapped pair, and a reversed list on the w02 read-along", () => {
    const base = readFolderWeek(2);
    const book = base.books[0] as Json;
    expect(book.kind, "the w02 first book is the read-along").toBe("readalong");
    expect((book.audio.sentenceClips as Json[]).length, "the w02 read-along holds 16 clips").toBe(16);
    expect(issuePaths(base), "the unbroken w02 parses (positive control)").toEqual([]);

    const missing = structuredClone(base) as Json;
    (missing.books[0].audio.sentenceClips as Json[]).pop();
    const missingPaths = issuePaths(missing);

    const swapped = structuredClone(base) as Json;
    const swappedClips = swapped.books[0].audio.sentenceClips as Json[];
    [swappedClips[0], swappedClips[1]] = [swappedClips[1], swappedClips[0]];
    const swappedPaths = issuePaths(swapped);

    const reversed = structuredClone(base) as Json;
    (reversed.books[0].audio.sentenceClips as Json[]).reverse();
    const reversedPaths = issuePaths(reversed);

    console.log(
      `count_mismatch_refused=${missingPaths.length > 0 ? 1 : 0} swap_refused=${
        swappedPaths.length > 0 ? 1 : 0
      } reverse_refused=${reversedPaths.length > 0 ? 1 : 0}`,
    );
    expect(missingPaths, "a missing clip is refused with the sentenceClips path").toContain(
      "books.0.audio.sentenceClips",
    );
    expect(swappedPaths, "a swapped pair is refused at the clip sentence").toContain(
      "books.0.audio.sentenceClips.0.sentence",
    );
    expect(reversedPaths, "a reversed list is refused at the clip sentence").toContain(
      "books.0.audio.sentenceClips.0.sentence",
    );
  });
});

describe("A4 a clip file that the week lists but the folder lacks", () => {
  /**
   * Reads the sha256 lines of the sentence clips of a hand-off folder.
   * @param folder The absolute folder of the hand-off package.
   * @returns The real MANIFEST.txt lines of the sentence clips.
   */
  function clipManifestLines(folder: string): string[] {
    const lines = readFileSync(join(folder, "MANIFEST.txt"), "utf8").split("\n");
    return lines.filter(
      (line) => /^[0-9a-f]{64}  /.test(line) && /\/sentences\/[^/]+\.mp3$/.test(line),
    );
  }

  it("holds every clip file of the seven pin weeks in its folder and its MANIFEST", () => {
    let readalong = 0;
    let decodable = 0;
    const missing: string[] = [];
    for (let week = 1; week <= 7; week += 1) {
      const folder = join(handoffRoot, folderOf(week));
      const manifest = new Set(
        readFileSync(join(folder, "MANIFEST.txt"), "utf8")
          .split("\n")
          .filter((line) => /^[0-9a-f]{64}  /.test(line))
          .map((line) => line.slice(66).trim()),
      );
      for (const book of readFolderWeek(week).books as Json[]) {
        if (!Array.isArray(book.audio?.sentenceClips)) continue;
        for (const entry of book.audio.sentenceClips as Json[]) {
          if (book.kind === "readalong") readalong += 1;
          else decodable += 1;
          if (!existsSync(join(folder, entry.file))) missing.push(`w0${week} file ${entry.file}`);
          if (!manifest.has(entry.file)) missing.push(`w0${week} manifest ${entry.file}`);
        }
      }
    }
    console.log(
      `clip_files_readalong=${readalong} clip_files_decodable=${decodable} clip_files_missing=${missing.length}`,
    );
    expect(missing, `clip files that the folders lack: ${missing.slice(0, 5).join(" | ")}`).toEqual(
      [],
    );
    expect(readalong, "clip_files_readalong").toBe(72);
    expect(decodable, "clip_files_decodable").toBe(56);
  });

  it("fails the sha256 manifest check when one clip file is missing", () => {
    const source = join(handoffRoot, folderOf(1));
    const lines = clipManifestLines(source);
    expect(lines.length, "the w01 MANIFEST holds the sentence clips").toBe(16);
    const folder = tempFolder("manifest");
    const copies: string[] = [];
    for (const line of lines) {
      const relative = line.slice(66).trim();
      const target = join(folder, relative);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(source, relative), target);
      copies.push(target);
    }
    writeFileSync(join(folder, "MANIFEST.txt"), `${lines.join("\n")}\n`);

    const whole = spawnSync("sha256sum", ["-c", "MANIFEST.txt"], { cwd: folder, encoding: "utf8" });
    expect(whole.error, "the sha256sum command must run").toBeUndefined();
    const wholeText = `${whole.stdout}${whole.stderr}`;
    expect(whole.status, `the whole folder passes: ${wholeText}`).toBe(0);

    const decodableClip = copies.find((path) => /\/b1-s03\.mp3$/.test(path));
    expect(decodableClip, "the w01 decodable clip b1-s03 is in the list (A4)").toBeDefined();
    rmSync(decodableClip!, { force: true });
    const broken = spawnSync("sha256sum", ["-c", "MANIFEST.txt"], { cwd: folder, encoding: "utf8" });
    const brokenText = `${broken.stdout}${broken.stderr}`;
    console.log(
      `manifest_check_whole=${whole.status} manifest_check_missing_clip=${broken.status}`,
    );
    expect(broken.status, `the missing clip fails the check: ${brokenText}`).not.toBe(0);
    expect(brokenText, "the failure names the missing file").toContain("b1-s03.mp3");
  });
});

describe("A5 Review A F1: a decodable clip array in reversed order", () => {
  it("either refuses the reversed array or keeps every page clip on the page text", () => {
    const base = readFolderWeek(2);
    const ordered = (base.books[1] as Json).audio.sentenceClips as Json[];
    expect(ordered.length, "the w02 decodable holds 8 clips").toBe(8);
    const reversed = structuredClone(base) as Json;
    (reversed.books[1].audio.sentenceClips as Json[]).reverse();

    const result = weekSchema.safeParse(reversed);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      console.log(`decodable_reversed_accepted=0 issue=${paths.slice(0, 2).join(" | ")}`);
      expect(paths.join(" "), "a refusal names the sentence clips").toContain("sentenceClips");
      return;
    }

    const textOfFile = new Map(
      (reversed.books[1].audio.sentenceClips as Json[]).map((entry) => [entry.file, entry.sentence.trim()]),
    );
    const clips = result.data.books[1]!.audio.sentenceClips as Record<string, string>;
    const pages = result.data.books[1]!.pages;
    const wrong: string[] = [];
    let mapped = 0;
    for (const [pageNumber, file] of Object.entries(clips)) {
      const page = pages[Number(pageNumber) - 1]!;
      const spoken = textOfFile.get(file);
      if (spoken === undefined) wrong.push(`page ${pageNumber}: the file ${file} names no sentence`);
      else if (spoken !== page.text.trim()) {
        wrong.push(`page ${pageNumber}: hears "${spoken}" and reads "${page.text.trim()}"`);
      } else mapped += 1;
    }
    const orderedPage3 = ordered[2]!.file;
    console.log(
      `decodable_reversed_accepted=1 pages_on_own_text=${mapped} wrong_sentence=${wrong.length} page3_ordered=${orderedPage3} page3_reversed=${clips["3"]}`,
    );
    expect(wrong, `pages with a wrong sentence: ${wrong.join(" | ")}`).toEqual([]);
    expect(mapped, "the reversed map binds every page clip to the page text").toBe(8);
    expect(clips["3"], "the reversed array changes the page 3 file").not.toBe(orderedPage3);
  });
});

describe("A6 Review B F21: a week JSON with no meta", () => {
  it("reads as a draft and is refused by the loader", async () => {
    console.log(
      `no_meta_blocker=${readinessBlocker({})} no_status_blocker=${readinessBlocker({
        meta: { status: "published" },
      })}`,
    );
    expect(readinessBlocker({}), "an empty object reads as a draft").toBe("draft");
    expect(
      readinessBlocker({ books: [], approval: { images: { status: "approved" } } }),
      "a week with no meta reads as a draft",
    ).toBe("draft");
    expect(isWeekReady({}), "a week with no meta is not ready").toBe(false);
    expect(
      readinessBlocker({ meta: { status: 7 }, books: [], approval: {} }),
      "a non-string status reads as a draft",
    ).toBe("draft");

    const clone = structuredClone(readFolderWeek(2)) as Json;
    delete clone.meta;
    expect(issuePaths(clone), "the contract refuses the JSON without meta").toContain("meta");
    const folder = contentWith(clone, 2);
    const loaded = await loadFrom(folder, 2);
    expect(loaded.visible, "the loader does not serve a week without meta").toBeNull();
    expect(
      loaded.warnings.some((line) => line.includes("blocked: invalid")),
      `the loader names the invalid week: ${loaded.warnings.join(" | ")}`,
    ).toBe(true);
    console.log(`no_meta_json_served=${loaded.visible === null ? 0 : 1}`);
  });
});

describe("A7 the pin under audit", () => {
  it("names the approved pin in the source record", () => {
    const record = JSON.parse(readFileSync(resolve(contentDirectory, "source.json"), "utf8")) as {
      commit?: string;
    };
    expect(record.commit, "the source record names the pin under audit").toBe(PIN);
  });
});
