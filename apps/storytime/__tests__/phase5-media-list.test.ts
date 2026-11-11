// @vitest-environment node
// Phase 5 red test for plan task 5.1: the media list of the milestone week.
//
// The list is a document in the run folder of this track. This file is the contract.
//
// Contract of the document `measure/runs/storytime_app_rebuild_20261025/media-list-w01.md`:
//   - The document holds one Markdown table. Its header names these columns: `label`, `file`,
//     `kind`, `rule`, `stage1_check`, `stage2_rubric`, `size_bytes`, and `type`.
//   - A media row leaves the `label` cell empty and fills the other seven cells.
//   - A label row leaves the `file`, `size_bytes`, and `type` cells empty, and names the item
//     in the `label` cell.
//   - The document holds these labeled counts, each on its own line:
//     `media_files=70`, `label_items_missing=6`, and `bitrate_deviations=<n>`.
//
// The rows come from the receiver output at the hand-off commit. The hand-off package holds the
// same media rows and the media files themselves, so the test reads the package as the source of
// truth for every row.
//
// Every case proves that the list is complete and truthful. The count of the media files, the
// kind and the rule of each file, the size and the type of each file, the six label items that
// have no file, and the bitrate deviation of the received phoneme bank.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { mediaOf } from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(app, "../..");

/** The hand-off package that holds the milestone media (test strategy P5.9). */
const MEDIA_ROOT = resolve(homedir(), "Desktop/handoff/w01-storytime-app-package-r4");

/** The media list document of the milestone week (test strategy P5.5). */
const LIST_PATH = resolve(repoRoot, "measure/runs/storytime_app_rebuild_20261025/media-list-w01.md");

/** The week file of the hand-off package. */
const WEEK_PATH = resolve(MEDIA_ROOT, "l2/w01.json");

/** The tile labels of the week page that hold no recording. */
const TILE_LABELS = ["readalong", "decodable", "song"];

/** The stage 1 checks that the measurement scripts of task 5.3 give. */
const STAGE1_CHECKS = ["loudness", "noise", "word-edges", "file-kind"];

/** The stage 2 rubric kinds of task 5.4. */
const STAGE2_RUBRICS = ["word cut", "phoneme", "song", "video", "picture", "book audio"];

/** The media type of each file extension in the package. */
const TYPE_BY_EXTENSION: Record<string, string> = {
  mp3: "audio",
  jpg: "picture",
  jpeg: "picture",
  png: "picture",
  webp: "picture",
  mp4: "video",
  mov: "video",
  webm: "video",
};

/**
 * Reads the media rows of the receiver output.
 * @returns The rows of the media list, each with its file, kind, and rule.
 */
function receiverRows(): Array<{ file: string; kind: string; rule: string }> {
  const week = JSON.parse(readFileSync(WEEK_PATH, "utf8"));
  return mediaOf(week)
    .filter((item) => item.missing === undefined)
    .map((item) => ({ file: item.file, kind: item.kind, rule: item.rule }));
}

/**
 * Gives the extension of a media file, without the dot.
 * @param file The path of the file.
 * @returns The extension.
 */
function extensionOf(file: string): string {
  return file.slice(file.lastIndexOf(".") + 1).toLowerCase();
}

/**
 * Reads the size of a media file of the package in bytes.
 * @param file The path of the file inside the package.
 * @returns The size of the file.
 */
function sizeOf(file: string): number {
  return statSync(resolve(MEDIA_ROOT, file)).size;
}

/**
 * Reads the bitrate of a media file of the package in bits per second.
 * @param file The path of the file inside the package.
 * @returns The bitrate of the file.
 */
function bitrateOf(file: string): number {
  const run = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "a:0", "-show_entries", "format=bit_rate", "-of", "csv=p=0", resolve(MEDIA_ROOT, file)],
    { encoding: "utf8" },
  );
  return Number((run.stdout ?? "").trim());
}

/**
 * Splits one Markdown table row into its cells.
 * @param line The line of the table.
 * @returns The cells of the row, without the outer pipes.
 */
function cellsOf(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Gives the lower case name of a column header, without spaces and underscores.
 * @param header The header cell.
 * @returns The name of the column.
 */
function columnName(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Reads the table of the media list.
 * @returns The header cells, the data rows, and the labeled counts of the document.
 */
function readList(): {
  header: string[];
  rows: string[][];
  counts: Map<string, number>;
} {
  expect(existsSync(LIST_PATH), `Missing ${LIST_PATH}`).toBe(true);
  const text = readFileSync(LIST_PATH, "utf8");
  const counts = new Map<string, number>();
  for (const line of text.split("\n")) {
    const found = line.match(/^\s*([a-z_]+)=([0-9]+)\s*$/);
    if (found) counts.set(found[1], Number(found[2]));
  }
  const lines = text.split("\n").filter((line) => line.trim().startsWith("|"));
  const header = lines.length > 0 ? cellsOf(lines[0]) : [];
  const rows = lines.slice(1).map(cellsOf);
  return { header, rows, counts };
}

/**
 * Finds the index of a column of the table.
 * @param header The header cells of the table.
 * @param names The accepted names of the column.
 * @returns The index of the column.
 */
function columnOf(header: string[], names: string[]): number {
  const index = header.findIndex((cell) => names.includes(columnName(cell)));
  expect(index, `the media list has no column named ${names.join(" or ")}`).toBeGreaterThanOrEqual(0);
  return index;
}

describe("Phase 5 media list of the milestone week (task 5.1)", () => {
  it("names the hand-off package that holds the milestone media", () => {
    expect(existsSync(MEDIA_ROOT), `Missing the hand-off package ${MEDIA_ROOT}`).toBe(true);
    expect(existsSync(WEEK_PATH), `Missing ${WEEK_PATH}`).toBe(true);
  });

  it("holds the media list document", () => {
    expect(existsSync(LIST_PATH), `Missing ${LIST_PATH}`).toBe(true);
  });

  it("counts every media file of the receiver output once", () => {
    const rows = receiverRows();
    expect(rows.length, "the receiver output holds no media file (A4)").toBeGreaterThan(0);
    const list = readList();
    const fileColumn = columnOf(list.header, ["file"]);
    const listed = list.rows.map((row) => row[fileColumn]).filter((file) => file !== "");
    expect(listed.length, "the media list holds no media row (A4)").toBeGreaterThan(0);
    expect(new Set(listed).size, "the media list holds a repeated media row").toBe(listed.length);
    for (const row of rows) {
      expect(listed, `the media list misses the file ${row.file}`).toContain(row.file);
    }
    expect(list.counts.get("media_files"), "the media list states no media_files count").toBe(rows.length);
  });

  it("counts the audio, the picture, and the video files of the list", () => {
    const list = readList();
    const typeColumn = columnOf(list.header, ["type"]);
    const counts = new Map<string, number>();
    for (const row of list.rows) {
      const type = row[typeColumn].toLowerCase();
      if (type === "") continue;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    expect(counts.get("audio"), "the media list holds no audio row (A4)").toBe(36);
    expect(counts.get("picture"), "the media list holds no picture row (A4)").toBe(32);
    expect(counts.get("video"), "the media list holds no video row (A4)").toBe(2);
  });

  it("gives every media row its kind, its rule, its size, and its type", () => {
    const list = readList();
    const fileColumn = columnOf(list.header, ["file"]);
    const kindColumn = columnOf(list.header, ["kind"]);
    const ruleColumn = columnOf(list.header, ["rule"]);
    const sizeColumn = columnOf(list.header, ["sizebytes", "size"]);
    const typeColumn = columnOf(list.header, ["type"]);
    const stage1Column = columnOf(list.header, ["stage1check", "stage1"]);
    const stage2Column = columnOf(list.header, ["stage2rubric", "stage2"]);
    const rows = receiverRows();
    expect(rows.length, "the receiver output holds no media file (A4)").toBeGreaterThan(0);
    for (const row of list.rows) {
      const file = row[fileColumn];
      if (file === "") continue;
      const expected = rows.find((entry) => entry.file === file);
      expect(expected, `the media list names an unknown file ${file}`).toBeDefined();
      expect(row[kindColumn], `the row of ${file} names no kind`).toBe(expected?.kind);
      expect(row[ruleColumn], `the row of ${file} names no rule`).toBe(expected?.rule);
      expect(row[ruleColumn], `the row of ${file} names no rule`).not.toBe("");
      expect(Number(row[sizeColumn]), `the row of ${file} names no size`).toBe(sizeOf(file));
      const type = row[typeColumn].toLowerCase();
      expect(
        type === TYPE_BY_EXTENSION[extensionOf(file)] || type === extensionOf(file),
        `the row of ${file} names the type ${type}`,
      ).toBe(true);
      const stage1 = row[stage1Column].toLowerCase();
      expect(
        STAGE1_CHECKS.some((check) => stage1.includes(check)),
        `the row of ${file} names no stage 1 check`,
      ).toBe(true);
      const stage2 = row[stage2Column].toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      expect(
        STAGE2_RUBRICS.some((rubric) => stage2.includes(rubric)),
        `the row of ${file} names no stage 2 rubric`,
      ).toBe(true);
    }
  });

  it("names the six label items that hold no file", () => {
    const list = readList();
    const labelColumn = columnOf(list.header, ["label"]);
    const fileColumn = columnOf(list.header, ["file"]);
    const labelRows = list.rows.filter((row) => row[fileColumn] === "");
    expect(labelRows.length, "the media list holds no label row (A4)").toBe(6);
    const labels = labelRows.map((row) => row[labelColumn].toLowerCase());
    for (const label of TILE_LABELS) {
      expect(labels, `the media list misses the tile label ${label}`).toContain(label);
    }
    const week = JSON.parse(readFileSync(WEEK_PATH, "utf8")) as { home?: { words?: string[] } };
    const homeWords = week.home?.words ?? [];
    expect(homeWords.length, "the received week holds no home word (A4)").toBe(3);
    for (const word of homeWords) {
      expect(labels, `the media list misses the home word ${word}`).toContain(word);
    }
    expect(list.counts.get("label_items_missing"), "the media list states no label_items_missing count").toBe(6);
  });

  it("shows the bitrate deviation of the received phoneme bank", () => {
    const list = readList();
    const fileColumn = columnOf(list.header, ["file"]);
    const rows = receiverRows();
    const bank = rows.filter((row) => row.kind === "phoneme");
    expect(bank.length, "the receiver output holds no phoneme file (A4)").toBe(9);
    for (const row of bank) {
      const listed = list.rows.find((entry) => entry[fileColumn] === row.file);
      expect(listed, `the media list misses the phoneme file ${row.file}`).toBeDefined();
      const text = (listed ?? []).join(" ");
      const kbps = Math.round(bitrateOf(row.file) / 1000);
      expect(kbps, `the phoneme file ${row.file} does not sit at 128 kbps`).toBe(128);
      expect(
        new RegExp(`(^|\\D)${kbps}(\\D|$)`).test(text),
        `the row of ${row.file} hides its bitrate of ${kbps} kbps`,
      ).toBe(true);
      expect(
        new RegExp(`(^|\\D)192(\\D|$)`).test(text),
        `the row of ${row.file} claims 192 kbps`,
      ).toBe(false);
    }
    expect(list.counts.get("bitrate_deviations"), "the media list states no bitrate_deviations count").toBe(
      list.counts.get("bitrate_deviations") ?? 0,
    );
  });

  it("holds every media file that sits under 192 kbps", () => {
    const list = readList();
    const fileColumn = columnOf(list.header, ["file"]);
    const listed = new Set(list.rows.map((row) => row[fileColumn]).filter((file) => file !== ""));
    const rows = receiverRows();
    const under = rows.filter((row) => {
      const type = TYPE_BY_EXTENSION[extensionOf(row.file)];
      return type === "audio" && bitrateOf(row.file) < 192000;
    });
    expect(under.length, "the receiver output holds no audio file under 192 kbps (A4)").toBeGreaterThan(0);
    for (const row of under) {
      expect(listed, `the media list hides the file ${row.file} under 192 kbps`).toContain(row.file);
    }
  });
});
