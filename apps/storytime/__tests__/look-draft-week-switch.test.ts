// @vitest-environment node
/**
 * The draft week review switch of the at-home loader (track storytime_look_20261107; plan task
 * 3.5, strategy P3.11; spec AC-3.9).
 *
 * The switch is `STORYTIME_REVIEW_DRAFT_WEEKS`. It is off by default, it opens a draft week only
 * for the exact value `1`, and a draft week keeps the published-week rules: a missing page picture
 * still blocks, and media that is not approved still needs `STORYTIME_SHOW_DRAFT_MEDIA`. The log
 * names a shown draft week with `storytime week <key> shows a draft week (review switch)`. No
 * tracked deploy file sets the name.
 *
 * The fixtures are fakes in a temporary content folder through `STORYTIME_CONTENT_DIR`. The test
 * mocks no function of lib/content.ts: a case that claims to prove the switch calls the switch.
 * The test writes no file under the hand-off folder and no measure path (A9). The Red state is
 * case (b) and its log line; every other case passes at the base (A4).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { highestOpenWeeks, loadVisibleWeek } from "../lib/content";
import {
  missingPagePictures,
  readinessBlocker,
  type WeekReadiness,
} from "../lib/readiness";

const app = resolve(import.meta.dirname, "..");
const repoRoot = resolve(app, "..", "..");

/** The environment value that moves the content folder. */
const CONTENT_DIR = "STORYTIME_CONTENT_DIR";

/** The environment value that opens a draft week for review. */
const DRAFT_WEEKS = "STORYTIME_REVIEW_DRAFT_WEEKS";

/** The environment value that shows media that is not approved. */
const DRAFT_MEDIA = "STORYTIME_SHOW_DRAFT_MEDIA";

/** The public-name spelling that the switch must never use. */
const PUBLIC_NAME = "NEXT_PUBLIC_STORYTIME_REVIEW";

/** The exact log line of a draft week that the review switch opens. */
const SHOWN_LOG = "storytime week st2/2 shows a draft week (review switch)";

/** A permissive record for the fields of a week that the test does not read. */
type JsonRecord = Record<string, unknown>;

/** One page of a fake week. */
interface JsonPage extends JsonRecord {
  image?: { file?: string } & JsonRecord;
}

/** One book of a fake week. */
interface JsonBook extends JsonRecord {
  pages: JsonPage[];
}

/** A week as plain JSON, for a fixture. */
interface Json extends JsonRecord {
  meta: { level: number; week: number; key: string; status: string } & JsonRecord;
  approval: JsonRecord & { audio?: { status?: string } & JsonRecord };
  books: JsonBook[];
}

/** A tracked deploy file and its text. */
interface DeployFile {
  path: string;
  text: string;
}

/** The environment values as the test file found them. */
const initialEnv: Record<string, string | undefined> = {
  [CONTENT_DIR]: process.env[CONTENT_DIR],
  [DRAFT_WEEKS]: process.env[DRAFT_WEEKS],
  [DRAFT_MEDIA]: process.env[DRAFT_MEDIA],
  [PUBLIC_NAME]: process.env[PUBLIC_NAME],
};

/** The scratch content folder of the current case. */
let scratch: string | undefined;

/** The labeled counts that the Red evidence quotes (A4). */
let filesChecked = 0;
let draftWeekCases = 0;
let mutantsRejected = 0;

beforeEach(() => {
  for (const name of Object.keys(initialEnv)) delete process.env[name];
});

afterEach(() => {
  for (const [name, value] of Object.entries(initialEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
  vi.restoreAllMocks();
});

/**
 * Reads the ready shipped w01 file as a fake week.
 * @returns A deep copy of the shipped week.
 */
function shippedClone(): Json {
  return JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as Json;
}

/**
 * Makes a draft fixture from the shipped week.
 * @param change An optional change to the clone.
 * @returns The fixture, with key `st2/2` and status `draft`.
 */
function draftWeek(change?: (week: Json) => void): Json {
  const week = shippedClone();
  week.meta.level = 2;
  week.meta.week = 2;
  week.meta.key = "st2/2";
  week.meta.status = "draft";
  change?.(week);
  return week;
}

/**
 * Makes a published fixture from the shipped week.
 * @param change An optional change to the clone.
 * @returns The fixture, with key `st2/2` and status `published`.
 */
function publishedWeek(change?: (week: Json) => void): Json {
  const week = shippedClone();
  week.meta.level = 2;
  week.meta.week = 2;
  week.meta.key = "st2/2";
  week.meta.status = "published";
  change?.(week);
  return week;
}

/**
 * Writes the week file of the current case into one scratch content folder.
 * @param week The fixture.
 */
function writeWeek(week: Json): void {
  if (!scratch) {
    scratch = mkdtempSync(join(tmpdir(), "storytime-draft-week-"));
    mkdirSync(join(scratch, "l2"), { recursive: true });
  }
  writeFileSync(join(scratch, "l2", "w02.json"), JSON.stringify(week));
  process.env[CONTENT_DIR] = scratch;
}

/**
 * Loads level 2 week 2 with the loader of the app and records its log lines.
 * @returns The visible week, or `null`, and the log lines.
 */
async function loadWithLog(): Promise<{
  visible: Awaited<ReturnType<typeof loadVisibleWeek>>;
  logs: string[];
}> {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    const visible = await loadVisibleWeek(2, 2);
    return { visible, logs: warn.mock.calls.map((call) => String(call[0])) };
  } finally {
    warn.mockRestore();
  }
}

/**
 * Runs `git ls-files` for one pathspec.
 * @param pattern The pathspec.
 * @returns The tracked paths.
 */
function gitLsFiles(pattern: string): string[] {
  const out = execFileSync("git", ["-C", repoRoot, "ls-files", "-z", "--", pattern], {
    encoding: "utf8",
  });
  return out.split("\0").filter(Boolean);
}

/**
 * Gives the storytime row of the CI app list.
 * @returns The row as JSON text.
 * @throws When the file holds no storytime row.
 */
function storytimeRow(): string {
  const apps = JSON.parse(
    readFileSync(resolve(repoRoot, "scripts/ci/apps.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  const row = apps.find((entry) => entry.id === "storytime");
  if (!row) throw new Error("scripts/ci/apps.json holds no storytime row");
  return JSON.stringify(row);
}

/**
 * Lists the tracked deploy files of the Storytime app.
 * @returns The deploy files with their text.
 */
function deployFiles(): DeployFile[] {
  const paths = new Set<string>();
  for (const pattern of [
    ":(glob)apps/storytime/**/cloudbuild*.yaml",
    ":(glob)**/Dockerfile*",
    ":(glob)**/.env*",
    ".github/workflows/*.yml",
  ]) {
    for (const path of gitLsFiles(pattern)) paths.add(path);
  }
  const files = [...paths].sort().map((path) => ({
    path,
    text: readFileSync(resolve(repoRoot, path), "utf8"),
  }));
  files.push({ path: "scripts/ci/apps.json#storytime", text: storytimeRow() });
  return files;
}

/**
 * Finds the deploy files that set a review name.
 * @param files The deploy files.
 * @returns One label per hit.
 */
function scanSwitchName(files: DeployFile[]): string[] {
  const hits: string[] = [];
  for (const { path, text } of files) {
    if (text.includes(DRAFT_WEEKS)) hits.push(`${path}: ${DRAFT_WEEKS}`);
    if (text.includes(PUBLIC_NAME)) hits.push(`${path}: ${PUBLIC_NAME}`);
  }
  return hits;
}

/**
 * Casts a fixture to the shape of the readiness rule.
 * @param week The fixture.
 * @returns The same week for the readiness rule.
 */
function readinessInput(week: Json): WeekReadiness {
  return week as unknown as WeekReadiness;
}

describe("P3.11 the draft week review switch", () => {
  it("(a) the switch unset blocks the draft week and leaves the level closed", async () => {
    draftWeekCases += 1;
    writeWeek(draftWeek());
    const { visible, logs } = await loadWithLog();
    expect(visible, "the draft week must be blocked with the switch unset").toBeNull();
    expect(logs.join("\n"), "the log must name the draft block").toContain(
      "storytime week st2/2 blocked: draft",
    );
    const open = await highestOpenWeeks();
    expect(open[2], "level 2 must hold no open week with the switch unset").toBeNull();
  });

  it("(b) STORYTIME_REVIEW_DRAFT_WEEKS=1 shows the draft week and opens the level", async () => {
    draftWeekCases += 1;
    writeWeek(draftWeek());
    process.env[DRAFT_WEEKS] = "1";
    const { visible } = await loadWithLog();
    expect(
      visible,
      `the draft week st2/2 must be visible with STORYTIME_REVIEW_DRAFT_WEEKS=1, received ${
        visible === null ? "null" : visible.meta.key
      }`,
    ).not.toBeNull();
    expect(visible?.meta.key, "the visible week must be st2/2").toBe("st2/2");
    const open = await highestOpenWeeks();
    expect(open[2], "level 2 must open week 2 with the switch on").toBe(2);
  });

  it("(b) the log names a draft week that the review switch shows", async () => {
    writeWeek(draftWeek());
    process.env[DRAFT_WEEKS] = "1";
    const { logs } = await loadWithLog();
    expect(
      logs.join("\n"),
      `the log must hold "${SHOWN_LOG}", received "${logs.join(" | ") || "(no log)"}"`,
    ).toContain(SHOWN_LOG);
  });

  it("(c) only the exact value 1 turns the switch on", async () => {
    draftWeekCases += 1;
    const values = ["true", "yes", "0", "", " 1"];
    expect(values.length, "the value list must hold 5 values").toBe(5);
    for (const value of values) {
      writeWeek(draftWeek());
      process.env[DRAFT_WEEKS] = value;
      const { visible } = await loadWithLog();
      expect(
        visible,
        `the value ${JSON.stringify(value)} must not turn the switch on`,
      ).toBeNull();
    }
  });

  it("(d) the switch does not skip the missing-picture rule", async () => {
    draftWeekCases += 1;
    writeWeek(
      draftWeek((week) => {
        delete week.books[0].pages[0].image?.file;
      }),
    );
    process.env[DRAFT_WEEKS] = "1";
    const { visible } = await loadWithLog();
    expect(
      visible,
      "a draft week with a page picture without a file must stay blocked",
    ).toBeNull();
  });

  it("(e) the switch keeps media that is not approved behind showDraftMedia", async () => {
    draftWeekCases += 1;
    writeWeek(
      draftWeek((week) => {
        week.approval.audio = { ...week.approval.audio, status: "draft" };
      }),
    );
    process.env[DRAFT_WEEKS] = "1";
    const blocked = await loadWithLog();
    expect(
      blocked.visible,
      "a draft week with media not approved must stay blocked without STORYTIME_SHOW_DRAFT_MEDIA",
    ).toBeNull();

    writeWeek(
      publishedWeek((week) => {
        week.approval.audio = { ...week.approval.audio, status: "draft" };
      }),
    );
    process.env[DRAFT_MEDIA] = "1";
    const shown = await loadWithLog();
    expect(
      shown.visible,
      "the published-rule path must show draft media with STORYTIME_SHOW_DRAFT_MEDIA=1",
    ).not.toBeNull();
  });

  it("(e2) both review values open a draft week with draft media", async () => {
    draftWeekCases += 1;
    writeWeek(
      draftWeek((week) => {
        week.approval.audio = { ...week.approval.audio, status: "draft" };
      }),
    );
    process.env[DRAFT_WEEKS] = "1";
    process.env[DRAFT_MEDIA] = "1";
    const { visible, logs } = await loadWithLog();
    expect(
      visible,
      `the draft week st2/2 with draft media must be visible with both review values, received ${
        visible === null ? "null" : visible.meta.key
      }`,
    ).not.toBeNull();
    expect(logs.join("\n"), `the log must hold "${SHOWN_LOG}"`).toContain(SHOWN_LOG);
    const open = await highestOpenWeeks();
    expect(open[2], "level 2 must open week 2 with both review values").toBe(2);
  });

  it("(f) no tracked deploy file sets the draft week review name", () => {
    const files = deployFiles();
    filesChecked = files.length;
    expect(
      filesChecked,
      "files_checked must be above 0 before the scan (A4)",
    ).toBeGreaterThan(0);
    const hits = scanSwitchName(files);
    expect(
      hits,
      `no tracked deploy file may set the review name; hits: ${hits.join(", ") || "(none)"}`,
    ).toEqual([]);
  });

  it("(g) the deploy scan catches a scratch copy with the name added", () => {
    const source = deployFiles().find((file) => file.path === "apps/storytime/cloudbuild.yaml");
    expect(
      source,
      "apps/storytime/cloudbuild.yaml must be a tracked deploy file",
    ).toBeDefined();
    const copyDirectory = mkdtempSync(join(tmpdir(), "storytime-deploy-copy-"));
    try {
      const copyPath = join(copyDirectory, "cloudbuild.yaml");
      writeFileSync(copyPath, `${source?.text ?? ""}\nSTORYTIME_REVIEW_DRAFT_WEEKS=1\n`);
      const hits = scanSwitchName([
        { path: copyPath, text: readFileSync(copyPath, "utf8") },
      ]);
      expect(hits, "the positive control must be caught by the deploy scan").not.toEqual([]);
      expect(hits[0], "the hit must name the review name").toContain(DRAFT_WEEKS);
    } finally {
      rmSync(copyDirectory, { recursive: true, force: true });
    }
  });
});

describe("P3.11 the mutants that the cases reject", () => {
  it("mutant 1: a switch that accepts true is rejected by case (c)", () => {
    const exact = (value: string | undefined): boolean => value === "1";
    const loose = (value: string | undefined): boolean => value === "1" || value === "true";
    const values = ["true", "yes", "0", "", " 1"];
    const wronglyOpened = values.filter((value) => loose(value));
    expect(
      wronglyOpened,
      "the loose mutant must wrongly accept true, and case (c) asserts null for it",
    ).toEqual(["true"]);
    expect(
      values.every((value) => !exact(value)),
      "the exact rule must block every value of case (c)",
    ).toBe(true);
    mutantsRejected += 1;
  });

  it("mutant 2: a switch that skips the missing-picture rule is rejected by case (d)", () => {
    const week = draftWeek((clone) => {
      delete clone.books[0].pages[0].image?.file;
    });
    process.env[DRAFT_WEEKS] = "1";
    const mutantShows = (candidate: Json): boolean => {
      const blocker = readinessBlocker(readinessInput(candidate));
      if (blocker === "draft") return true;
      return blocker === null;
    };
    expect(
      missingPagePictures(readinessInput(week)).length,
      "the fixture must hold a page without a picture file",
    ).toBeGreaterThan(0);
    expect(
      mutantShows(week),
      "the mutant must wrongly show the page-less draft week, and case (d) asserts null",
    ).toBe(true);
    mutantsRejected += 1;
  });

  it("mutant 3: a switch read from a NEXT_PUBLIC_ name is rejected by cases (a) and (b)", () => {
    const exact = (value: string | undefined): boolean => value === "1";
    const publicSwitch = (): boolean => process.env[PUBLIC_NAME] === "1";
    process.env[DRAFT_WEEKS] = "1";
    delete process.env[PUBLIC_NAME];
    expect(exact("1"), "the server-side value must turn the switch on").toBe(true);
    expect(
      publicSwitch(),
      "the public-name mutant stays off when only the server value is set, and case (b) requires the week",
    ).toBe(false);
    mutantsRejected += 1;
  });

  it("labels the Red counts with floors (A4)", () => {
    console.log(`files_checked=${filesChecked}`);
    console.log(`draft_week_cases=${draftWeekCases}`);
    console.log(`mutants_rejected=${mutantsRejected}`);
    expect(filesChecked, "files_checked floor 1").toBeGreaterThanOrEqual(1);
    expect(draftWeekCases, "draft_week_cases floor 5").toBeGreaterThanOrEqual(5);
    expect(mutantsRejected, "mutants_rejected floor 3").toBeGreaterThanOrEqual(3);
  });
});
