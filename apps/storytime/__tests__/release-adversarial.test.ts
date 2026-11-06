// @vitest-environment node
/**
 * The adversarial round of Phase 1 of the at-home release (strategy P1.6, cases 3 to 9).
 *
 * The attack surface is mistaken or hostile data from outside the repository. Every hostile week
 * is a `structuredClone` of a shipped week with one change. A clone goes through the loader in a
 * temporary content folder, or through the receiver in a temporary root and a temporary source
 * repository. No test writes in `apps/storytime/content`, in the hand-off folder, or in Workbooks.
 * Cases 1, 2, and 10 are shell checks on scratch copies; the evidence of the round records them.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadVisibleWeek, loadWeek } from "../lib/content";
import { STORYTIME_APPROVAL_PARTS, weekSchema } from "../lib/contracts/week";
import { isWeekReady, mediaPartsNotApproved, readinessBlocker } from "../lib/readiness";
import { mediaOf, mediaPathsOf, receiveMain } from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = resolve(app, "content");
const weekDirectory = resolve(contentDirectory, "l2");

/** The weeks of the release, from 1 to 8. */
const ALL_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The draft weeks that hold pictures and an approved images part, from 2 to 7. */
const PICTURE_WEEKS = [2, 3, 4, 5, 6, 7];

/** The top-level parts that production owns; the contract keeps them as unknown values. */
const PRODUCTION_PARTS = new Set(["print", "block", "benchmark", "approval", "db"]);

/** A week as plain JSON, for a hostile edit. */
interface Json {
  meta: { status: string; [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
const previousDraftSwitch = process.env.STORYTIME_SHOW_DRAFT_MEDIA;
const scratch: string[] = [];

beforeEach(() => {
  delete process.env.STORYTIME_CONTENT_DIR;
  delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
});

afterEach(() => {
  for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
  if (previousDraftSwitch === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  else process.env.STORYTIME_SHOW_DRAFT_MEDIA = previousDraftSwitch;
  vi.restoreAllMocks();
});

/**
 * Makes a scratch folder that the test removes after the case.
 * @param prefix The folder name prefix.
 * @returns The absolute folder.
 */
function tempDir(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  scratch.push(directory);
  return directory;
}

/**
 * Reads the text of a shipped week file.
 * @param week The week of the level.
 * @returns The source text.
 */
function shippedText(week: number): string {
  return readFileSync(resolve(weekDirectory, `w${String(week).padStart(2, "0")}.json`), "utf8");
}

/**
 * Reads a shipped week and clones it.
 * @param week The week of the level.
 * @returns A clone that a test can change.
 */
function shipped(week: number): Json {
  return structuredClone(JSON.parse(shippedText(week)) as Json);
}

/** The approval status of the three media parts. */
type MediaStatuses = Partial<Record<"images" | "audio" | "song", "approved" | "draft">>;

/**
 * Makes a published clone of a shipped week.
 * @param week The week of the level.
 * @param statuses The media part statuses to set; the other parts keep the shipped status.
 * @returns The published clone.
 */
function published(week: number, statuses: MediaStatuses = {}): Json {
  const clone = shipped(week);
  clone.meta.status = "published";
  clone.approval = { ...(clone.approval ?? {}) };
  for (const [part, status] of Object.entries(statuses)) {
    clone.approval[part] = { ...(clone.approval[part] ?? {}), status };
  }
  return clone;
}

/**
 * Loads one clone with the loader of the app and records its log lines.
 * @param week The week of the level.
 * @param clone The clone to load.
 * @returns The visible week and the log lines of the loader.
 */
async function loadClone(
  week: number,
  clone: unknown,
): Promise<{ visible: Awaited<ReturnType<typeof loadVisibleWeek>>; warnings: string[] }> {
  const directory = tempDir("storytime-release-adv-");
  mkdirSync(resolve(directory, "l2"), { recursive: true });
  writeFileSync(resolve(directory, "l2", `w${String(week).padStart(2, "0")}.json`), JSON.stringify(clone));
  process.env.STORYTIME_CONTENT_DIR = directory;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const visible = await loadVisibleWeek(2, week);
  const warnings = warn.mock.calls.map((call) => String(call[0]));
  warn.mockRestore();
  return { visible, warnings };
}

/**
 * Loads one shipped week with the loader of the app and records its log lines.
 * @param week The week of the level.
 * @returns The visible week and the log lines of the loader.
 */
async function loadShipped(
  week: number,
): Promise<{ visible: Awaited<ReturnType<typeof loadVisibleWeek>>; warnings: string[] }> {
  process.env.STORYTIME_CONTENT_DIR = contentDirectory;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const visible = await loadVisibleWeek(2, week);
  const warnings = warn.mock.calls.map((call) => String(call[0]));
  warn.mockRestore();
  return { visible, warnings };
}

/**
 * Gives the field paths of the issues of a failed parse.
 * @param week The week to parse.
 * @returns The issue paths, or `null` when the week parses.
 */
function failPaths(week: unknown): string[] | null {
  const result = weekSchema.safeParse(week);
  return result.success ? null : result.error.issues.map((issue) => issue.path.join("."));
}

describe("case 3 a published clone stays blocked until the approval parts say approved", () => {
  it("blocks a published clone of each picture week and names audio and song", async () => {
    let checked = 0;
    for (const week of PICTURE_WEEKS) {
      const clone = published(week);
      expect(clone.approval.images.status, `w0${week} images part must be approved`).toBe("approved");
      expect(clone.approval.audio.status, `w0${week} audio part must be draft`).toBe("draft");
      expect(clone.approval.song.status, `w0${week} song part must be draft`).toBe("draft");
      expect(isWeekReady(clone), `a published clone of w0${week} must not be ready`).toBe(false);
      expect(mediaPartsNotApproved(clone)).toEqual(["audio", "song"]);
      const { visible, warnings } = await loadClone(week, clone);
      expect(visible, `a published clone of w0${week} must not reach a child`).toBeNull();
      expect(warnings).toEqual([`storytime week st2/${week} blocked: media_not_approved (audio, song)`]);
      checked += 1;
    }
    expect(checked, "The case must check at least one week (A4)").toBeGreaterThan(0);
    expect(`weeks_checked=${checked}`).toBe("weeks_checked=6");
  });

  it("opens the same clones when the three parts are approved, so the parts are the lock", async () => {
    let opened = 0;
    for (const week of PICTURE_WEEKS) {
      const clone = published(week, { images: "approved", audio: "approved", song: "approved" });
      expect(failPaths(clone), `the published clone of w0${week} must meet the contract`).toBeNull();
      const { visible, warnings } = await loadClone(week, clone);
      expect(visible, `an approved clone of w0${week} must be visible`).not.toBeNull();
      expect(warnings).toEqual([]);
      opened += 1;
    }
    expect(`weeks_opened=${opened}`).toBe("weeks_opened=6");
  });

  it("blocks each single draft part and names only that part", async () => {
    for (const part of ["images", "audio", "song"] as const) {
      const clone = published(2, { images: "approved", audio: "approved", song: "approved" });
      clone.approval[part].status = "draft";
      const { visible, warnings } = await loadClone(2, clone);
      expect(visible, `a draft ${part} part must block the clone`).toBeNull();
      expect(warnings).toEqual([`storytime week st2/2 blocked: media_not_approved (${part})`]);
    }
  });

  it("does not count an approval of another part for a media part", async () => {
    const clone = published(2);
    for (const part of ["text", "thai", "scripts"]) {
      clone.approval[part] = { status: "approved", date: "2026-11-05", words: "fine" };
    }
    clone.approval.loops = { status: "approved", date: "2026-11-05", words: "fine" };
    clone.approval.print = { status: "approved", date: "2026-11-05", words: "fine" };
    expect(clone.approval.audio.status).toBe("draft");
    const { visible, warnings } = await loadClone(2, clone);
    expect(visible, "an approval of another part must not open the media lock").toBeNull();
    expect(warnings[0]).toContain("media_not_approved (audio, song)");
  });

  it("treats a missing approval, a wrong spelling, and a wrong shape as not approved", async () => {
    const none = published(2);
    delete none.approval;
    expect(mediaPartsNotApproved(none)).toEqual(["images", "audio", "song"]);
    expect((await loadClone(2, none)).visible, "a published clone with no approval must be blocked").toBeNull();

    for (const value of ["Approved", "APPROVED", "approved ", " approved", "approve", "true", "", null, true, 1]) {
      const clone = published(2, { images: "approved", audio: "approved", song: "approved" });
      clone.approval.audio.status = value;
      const { visible } = await loadClone(2, clone);
      expect(visible, `the audio status ${JSON.stringify(value)} must not open the week`).toBeNull();
      expect(isWeekReady(clone), `readiness must not accept the status ${JSON.stringify(value)}`).toBe(false);
    }
    for (const shape of ["approved", ["approved"], 1, true, null]) {
      const clone = published(2, { images: "approved", audio: "approved", song: "approved" });
      clone.approval.song = shape;
      expect((await loadClone(2, clone)).visible, `the song shape ${JSON.stringify(shape)}`).toBeNull();
      expect(isWeekReady(clone), `readiness must not accept the shape ${JSON.stringify(shape)}`).toBe(false);
    }
  });

  it("keeps a published clone of w08 out of the app even with all parts approved", async () => {
    const clone = published(8, { images: "approved", audio: "approved", song: "approved" });
    clone.approval = { ...clone.approval, images: { status: "approved" }, audio: { status: "approved" }, song: { status: "approved" } };
    expect(clone.books.length, "the shipped w08 holds no book").toBe(0);
    // The readiness rule alone names the missing picture. The contract stops a published week
    // with no book first, so the loader names `invalid` and the field path `books`.
    expect(readinessBlocker(clone)).toBe("missing_picture");
    expect(failPaths(clone)).toContain("books");
    const { visible, warnings } = await loadClone(8, clone);
    expect(visible).toBeNull();
    expect(warnings).toEqual(["storytime week st2/8 blocked: invalid"]);
  });

  it("keeps an approved clone out of the app when one page file is missing", async () => {
    const clone = published(3, { images: "approved", audio: "approved", song: "approved" });
    delete clone.books[1].pages[4].image.file;
    expect(failPaths(clone), "the clone must meet the contract").toBeNull();
    const { visible, warnings } = await loadClone(3, clone);
    expect(visible).toBeNull();
    expect(warnings).toEqual(["storytime week st2/3 blocked: missing_picture (1 page pictures without a file)"]);
  });
});

describe("case 4 the draft switch never opens an unpublished week", () => {
  it("keeps w02 to w08 closed with the switch on, and the reason stays draft", async () => {
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    let checked = 0;
    for (const week of [2, 3, 4, 5, 6, 7, 8]) {
      const { visible, warnings } = await loadShipped(week);
      expect(visible, `w0${week} must stay closed with the switch on`).toBeNull();
      expect(warnings).toEqual([`storytime week st2/${week} blocked: draft`]);
      checked += 1;
    }
    expect(`weeks_checked=${checked}`).toBe("weeks_checked=7");
  });

  it("opens a published clone with draft audio and song only for the value 1", async () => {
    const clone = published(2);
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    const open = await loadClone(2, clone);
    expect(open.visible, "the switch must open the draft media of a published week").not.toBeNull();
    expect(open.warnings).toEqual(["storytime week st2/2 shows draft media: audio, song"]);
    for (const value of ["0", "true", "yes", "on", "01", " 1", "1 ", "", "TRUE"]) {
      process.env.STORYTIME_SHOW_DRAFT_MEDIA = value;
      const closed = await loadClone(2, clone);
      expect(closed.visible, `the switch value ${JSON.stringify(value)} must not open the week`).toBeNull();
    }
  });

  it("does not let the switch open a published clone with a missing picture or no book", async () => {
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    const noFile = published(4);
    delete noFile.books[0].pages[0].image.file;
    expect((await loadClone(4, noFile)).visible, "a missing picture must stay closed").toBeNull();
    const noBooks = published(8);
    expect((await loadClone(8, noBooks)).visible, "a week with no book must stay closed").toBeNull();
  });

  it("does not let a draft clone with approved media parts open, with or without the switch", async () => {
    const clone = shipped(2);
    clone.approval.audio.status = "approved";
    clone.approval.song.status = "approved";
    expect(clone.meta.status).toBe("draft");
    expect((await loadClone(2, clone)).visible, "approved parts must not publish a draft week").toBeNull();
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    expect((await loadClone(2, clone)).visible, "the switch must not publish a draft week").toBeNull();
  });
});

describe("case 5 a closed enum value makes the week invalid", () => {
  it("rejects the status approved and the question kind why with the field path", async () => {
    const status = shipped(2);
    status.meta.status = "approved";
    expect(failPaths(status)).toContain("meta.status");
    const loaded = await (async () => {
      const directory = tempDir("storytime-release-adv-enum-");
      mkdirSync(resolve(directory, "l2"));
      writeFileSync(resolve(directory, "l2/w02.json"), JSON.stringify(status));
      process.env.STORYTIME_CONTENT_DIR = directory;
      return loadWeek(2, 2);
    })();
    expect(loaded.kind).toBe("invalid");
    expect(loaded.kind === "invalid" ? loaded.issues : "").toContain("meta.status");

    const kind = shipped(2);
    const bookIndex = kind.books.findIndex((book: Json) => Array.isArray(book.questions));
    expect(bookIndex, "a shipped w02 book must hold questions (A4)").toBeGreaterThanOrEqual(0);
    kind.books[bookIndex].questions[0].kind = "why";
    expect(failPaths(kind)).toContain(`books.${bookIndex}.questions.0.kind`);
  });

  it("rejects other closed values: the book kind, the song part, the band, and the position", () => {
    const edits: Array<[string, (week: Json) => void]> = [
      ["meta.band", (week) => { week.meta.band = "Tree"; }],
      ["meta.kind", (week) => { week.meta.kind = "exam"; }],
      ["books.0.kind", (week) => { week.books[0].kind = "poem"; }],
      ["song.lines.0.part", (week) => { week.song.lines[0].part = "bridge"; }],
      ["approval.audio.status", (week) => { week.approval.audio.status = "published"; }],
    ];
    for (const [path, edit] of edits) {
      const clone = shipped(5);
      edit(clone);
      expect(failPaths(clone), path).toContain(path);
    }
  });

  it("stops the receiver with exit 1, names the field, and leaves the folder as it was", () => {
    const root = seedRoot("enum-root");
    const before = snapshot(root);
    const bad = shipped(2);
    bad.meta.status = "approved";
    const source = makeSource({ 2: `${JSON.stringify(bad, null, 2)}\n` });
    const run = receive(root, source.commit, source.directory);
    expect(run.code).toBe(1);
    expect(run.errors.join("\n")).toContain("meta.status");
    expectUnchanged(before, snapshot(root));

    const kindBad = shipped(2);
    const bookIndex = kindBad.books.findIndex((book: Json) => Array.isArray(book.questions));
    kindBad.books[bookIndex].questions[0].kind = "why";
    const second = makeSource({ 2: `${JSON.stringify(kindBad, null, 2)}\n` });
    const secondRun = receive(root, second.commit, second.directory);
    expect(secondRun.code).toBe(1);
    expect(secondRun.errors.join("\n")).toContain(`books.${bookIndex}.questions.0.kind`);
    expectUnchanged(before, snapshot(root));
  });
});

describe("case 6 the print fields and the seventh approval part", () => {
  it("parses the shipped w01 with its print approval and keeps six approval parts", () => {
    const week = shipped(1);
    expect(week.approval.print, "w01 must hold the print approval (A4)").toBeDefined();
    expect(week.print.checkRows, "w01 must hold print.checkRows (A4)").toBeDefined();
    expect(failPaths(week)).toBeNull();
    expect([...STORYTIME_APPROVAL_PARTS]).toEqual(["text", "thai", "images", "audio", "song", "scripts"]);
    expect(STORYTIME_APPROVAL_PARTS as readonly string[]).not.toContain("print");
  });

  it("gives the same readiness whatever the print part and the print approval hold", async () => {
    for (const edit of [
      (week: Json) => { delete week.print; },
      (week: Json) => { delete week.approval.print; },
      (week: Json) => { week.approval.print = { status: "draft" }; },
      (week: Json) => { week.approval.print = "not an object"; },
      (week: Json) => { week.print = null; },
      (week: Json) => { week.print = { checkRows: "garbage", practice: 7 }; },
    ]) {
      const clone = shipped(1);
      edit(clone);
      expect(failPaths(clone), "the print part is unknown to the contract").toBeNull();
      expect(isWeekReady(clone), "readiness must ignore the print part").toBe(true);
      expect((await loadClone(1, clone)).visible).not.toBeNull();
    }
  });

  it("does not let an approved print part open a draft week or a week with draft audio", async () => {
    const clone = shipped(2);
    clone.approval.print = { status: "approved", date: "2026-11-05", words: "fine" };
    clone.print = { ...clone.print };
    expect((await loadClone(2, clone)).visible, "a print approval must not publish a draft week").toBeNull();
    const publishedClone = published(2);
    publishedClone.approval.print = { status: "approved", date: "2026-11-05", words: "fine" };
    expect((await loadClone(2, publishedClone)).visible, "a print approval must not open the media lock").toBeNull();
  });
});

describe("case 7 a hostile path in a media field of the new weeks", () => {
  /**
   * Sets a value at a dotted field path of a clone.
   * @param root The clone.
   * @param path The dotted path, with array indexes as numbers.
   * @param value The value to set.
   */
  function setAt(root: Json, path: string, value: string): void {
    const parts = path.split(".");
    let current: any = root; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const part of parts.slice(0, -1)) current = current[part];
    current[parts[parts.length - 1]] = value;
  }

  it("rejects `..` and a leading `/` in the audio file of w05 with the field path", () => {
    const control = shipped(5);
    control.books[0].audio.file = "l2/media/w05/books/1-tap.v2_final.mp3";
    expect(failPaths(control), "a normal name must parse, so the edit itself breaks nothing").toBeNull();
    for (const hostile of ["../x.mp3", "a/../../x.mp3", "/x.mp3", "/etc/passwd", "..", "."]) {
      const clone = shipped(5);
      clone.books[0].audio.file = hostile;
      expect(failPaths(clone), hostile).toContain("books.0.audio.file");
    }
  });

  it("rejects a hostile value in every media field that the media list reads, in all eight weeks", () => {
    let probed = 0;
    const accepted: string[] = [];
    const notRead: string[] = [];
    for (const week of ALL_WEEKS) {
      const source = shipped(week);
      const listed = new Set(
        mediaOf(weekSchema.parse(structuredClone(source)))
          .filter((item) => item.missing === undefined)
          .map((item) => item.file),
      );
      for (const { path, file } of mediaPathsOf(source)) {
        if (PRODUCTION_PARTS.has(path.split(".")[0])) continue;
        if (!listed.has(file)) {
          notRead.push(`w0${week} ${path}`);
          continue;
        }
        const extension = file.slice(file.lastIndexOf("."));
        for (const hostile of [`../escape${extension}`, `https://evil.example/x${extension}`]) {
          const clone = structuredClone(source);
          setAt(clone, path, hostile);
          const issues = failPaths(clone);
          if (!issues || !issues.includes(path)) accepted.push(`w0${week} ${path} <- ${hostile}`);
          probed += 1;
        }
      }
    }
    expect(probed, "The sweep must probe at least one media field (A4)").toBeGreaterThan(0);
    expect(`hostile_values_per_field=${probed % 2 === 0 ? 2 : 0}`).toBe("hostile_values_per_field=2");
    expect(accepted, "A media field accepts a hostile path").toEqual([]);
    expect(notRead, "A media string outside the production parts that the media list does not read").toEqual([]);
  });

  it("stops the receiver on a hostile cover path and leaves the folder as it was", () => {
    const root = seedRoot("path-root");
    const before = snapshot(root);
    for (const edit of [
      (week: Json) => { week.books[0].audio.file = "../../etc/passwd.mp3"; },
      (week: Json) => { week.books[0].cover.file = "/abs/cover.png"; },
      (week: Json) => { week.books[1].pages[0].image.file = "a/../../x.png"; },
    ]) {
      const bad = shipped(5);
      edit(bad);
      const source = makeSource({ 5: `${JSON.stringify(bad, null, 2)}\n` });
      const run = receive(root, source.commit, source.directory);
      expect(run.code).toBe(1);
      expect(run.errors.join("\n")).toContain("w05.json");
      expectUnchanged(before, snapshot(root));
    }
  });
});

describe("case 8 a subset run at a new commit", () => {
  it("refuses weeks 1 to 7 with exit 64 and changes nothing; a full run then moves the record", () => {
    const root = seedRoot("subset-root");
    const before = snapshot(root);
    expect(JSON.parse(before.get("/source.json")!).files).toHaveLength(8);
    const source = makeSource({});
    const refused = receive(root, source.commit, source.directory, "--weeks", "1-7");
    expect(refused.code).toBe(64);
    expect(refused.errors.join("\n")).toContain("w08.json");
    expectUnchanged(before, snapshot(root));

    const full = receive(root, source.commit, source.directory, "--weeks", "1-8");
    expect(full.code).toBe(0);
    const after = snapshot(root);
    expect(JSON.parse(after.get("/source.json")!).commit).toBe(source.commit);
    for (const week of ALL_WEEKS) {
      const name = `/l2/w0${week}.json`;
      expect(after.get(name), `${name} must keep the bytes of the source`).toBe(before.get(name));
      expect(JSON.parse(after.get(name)!).meta.status, `${name} must keep its status`).toBe(
        week === 1 ? "published" : "draft",
      );
    }
  });

  it("reports eight week lines, one ready week, and seven not ready weeks", () => {
    const root = seedRoot("report-root");
    const source = makeSource({});
    const run = receive(root, source.commit, source.directory);
    expect(run.code).toBe(0);
    const wrote = run.logs.filter((line) => /^Wrote apps\/storytime\/content\/l2\/w0\d\.json /.test(line));
    expect(wrote, "The run must write eight week lines (A4)").toHaveLength(8);
    expect(wrote.filter((line) => line.endsWith("; ready)"))).toHaveLength(1);
    expect(wrote.filter((line) => line.endsWith("; not ready)"))).toHaveLength(7);
    expect(wrote[0]).toMatch(/w01\.json .*; ready\)$/);
    const notReady = run.logs.find((line) => line.startsWith("Not ready for the at-home app:")) ?? "";
    expect(notReady.split(",")).toHaveLength(7);
    expect(notReady).not.toContain("w01.json");
    const last = run.logs[run.logs.length - 1];
    const totals = last.match(/record 8 weeks; this run 8 weeks, (\d+) media files, (\d+) missing pictures\)$/);
    expect(totals, `the last line is ${last}`).not.toBeNull();
    const sum = (pattern: RegExp): number =>
      wrote.reduce((count, line) => count + Number(line.match(pattern)![1]), 0);
    expect(Number(totals![1])).toBe(sum(/\((\d+) media files/));
    expect(Number(totals![2])).toBe(sum(/, (\d+) missing pictures/));
  });

  it("leaves a hostile published clone with draft media blocked from end to end", async () => {
    const root = seedRoot("hostile-publish-root");
    const hostile = published(2);
    const source = makeSource({ 2: `${JSON.stringify(hostile, null, 2)}\n` });
    const run = receive(root, source.commit, source.directory);
    expect(run.code, run.errors.join("\n")).toBe(0);
    const received = JSON.parse(readFileSync(join(root, "apps/storytime/content/l2/w02.json"), "utf8"));
    expect(received.meta.status, "the receiver must keep the status of its source").toBe("published");
    expect(run.logs.find((line) => line.includes("w02.json ("))).toMatch(/not ready\)$/);
    process.env.STORYTIME_CONTENT_DIR = join(root, "apps/storytime/content");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await loadVisibleWeek(2, 2), "the loader must still block the received week").toBeNull();
    expect(String(warn.mock.calls[0]?.[0])).toBe("storytime week st2/2 blocked: media_not_approved (audio, song)");
  });
});

describe("case 9 a leftover or a link stops the receiver before any read", () => {
  it("stops at a stage file or a recovery copy anywhere in the content folder", () => {
    const names = [
      "l2/w03.json.orig-0123456789ab",
      "l2/w03.json.tmp-0123456789ab",
      "source.json.tmp-zz",
      "l2/nested/w01.json.orig-1",
    ];
    for (const name of names) {
      const root = seedRoot("leftover-root");
      const path = join(root, "apps/storytime/content", name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, "a copy of an original");
      const before = snapshot(root);
      const source = makeSource({});
      const run = receive(root, source.commit, source.directory);
      expect(run.code, name).toBe(1);
      expect(run.errors.join("\n"), name).toContain("possible recovery file");
      expect(run.errors.join("\n"), name).toContain(name);
      expect(run.logs.filter((line) => line.startsWith("Wrote")), "no write may start").toEqual([]);
      expectUnchanged(before, snapshot(root));
      expect(existsSync(path), "the receiver must keep the leftover file").toBe(true);
    }
  });

  it("stops at a link inside the content folder and at a link as the content folder", () => {
    const root = seedRoot("link-root");
    const outside = tempDir("storytime-release-adv-outside-");
    const link = join(root, "apps/storytime/content/l2/outside");
    symlinkSync(outside, link);
    const before = snapshot(root);
    const source = makeSource({});
    const run = receive(root, source.commit, source.directory);
    expect(run.code).toBe(1);
    expect(run.errors.join("\n")).toContain("link");
    expect(readdirSync(outside), "nothing may land in the link target").toEqual([]);
    expectUnchanged(before, snapshot(root));

    const linkRoot = tempDir("storytime-release-adv-linkroot-");
    mkdirSync(join(linkRoot, "apps/storytime"), { recursive: true });
    symlinkSync(outside, join(linkRoot, "apps/storytime/content"));
    const linkRun = receive(linkRoot, source.commit, source.directory);
    expect(linkRun.code).toBe(1);
    expect(linkRun.errors.join("\n")).toContain("The content folder is a link");
    expect(readdirSync(outside), "nothing may land in the link target").toEqual([]);
  });

  it("stops without a write when a source file holds a BOM, a cut text, or no JSON", () => {
    const root = seedRoot("source-root");
    const before = snapshot(root);
    const text = shippedText(3);
    for (const [label, hostile] of [
      ["bom", `\uFEFF${text}`],
      ["cut", text.slice(0, Math.floor(text.length / 2))],
      ["html", "<html>404</html>"],
      ["empty", ""],
    ] as const) {
      const source = makeSource({ 3: hostile });
      const run = receive(root, source.commit, source.directory);
      expect(run.code, label).toBe(1);
      expectUnchanged(before, snapshot(root));
    }
  });
});

/** The result of one receiver run. */
interface Run {
  code: number;
  logs: string[];
  errors: string[];
}

/**
 * Makes a source repository that holds the eight week files at one commit.
 * @param edits Replacement source text by week number.
 * @returns The repository folder and the full commit id.
 */
function makeSource(edits: Record<number, string>): { directory: string; commit: string } {
  const directory = tempDir("storytime-release-adv-source-");
  const git = (...args: string[]): string =>
    execFileSync(
      "git",
      ["-C", directory, "-c", "user.email=adversarial@example.invalid", "-c", "user.name=Adversarial", ...args],
      { encoding: "utf8" },
    ).trim();
  execFileSync("git", ["init", "--quiet", "--initial-branch", "main", directory]);
  mkdirSync(join(directory, "content/storytime/l2"), { recursive: true });
  for (const week of ALL_WEEKS) {
    writeFileSync(
      join(directory, `content/storytime/l2/w0${week}.json`),
      edits[week] ?? shippedText(week),
    );
  }
  git("add", "-A");
  git("commit", "--quiet", "--message", "weeks");
  return { directory, commit: git("rev-parse", "HEAD") };
}

/**
 * Makes a temporary root that holds a copy of the shipped content folder.
 * @param name The folder name prefix.
 * @returns The root path.
 */
function seedRoot(name: string): string {
  const root = tempDir(`storytime-release-adv-${name}-`);
  mkdirSync(join(root, "apps/storytime"), { recursive: true });
  cpSync(contentDirectory, join(root, "apps/storytime/content"), { recursive: true });
  return root;
}

/**
 * Runs the receiver against a temporary root and records its output.
 * @param root The temporary root.
 * @param commit The full commit id of the source.
 * @param directory The source repository folder.
 * @param extra Extra command-line arguments.
 * @returns The exit code and the lines of the output.
 */
function receive(root: string, commit: string, directory: string, ...extra: string[]): Run {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const code = receiveMain(["--source", directory, "--commit", commit, ...extra], root);
  const logs = log.mock.calls.map((call) => String(call[0]));
  const errors = error.mock.calls.map((call) => String(call[0]));
  log.mockRestore();
  error.mockRestore();
  return { code, logs, errors };
}

/**
 * Lists every content file of a root with its text.
 * @param root The temporary root.
 * @returns The text of each file, by path inside the content folder.
 */
function snapshot(root: string): Map<string, string> {
  const base = join(root, "apps/storytime/content");
  const files = new Map<string, string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.set(path.slice(base.length), readFileSync(path, "utf8"));
    }
  };
  walk(base);
  return files;
}

/**
 * Asserts that a run changed no content file.
 * @param before The files before the run.
 * @param after The files after the run.
 */
function expectUnchanged(before: Map<string, string>, after: Map<string, string>): void {
  expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
  for (const [path, text] of before) expect(after.get(path), path).toBe(text);
}
