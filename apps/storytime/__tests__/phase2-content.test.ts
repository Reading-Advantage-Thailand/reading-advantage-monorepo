// @vitest-environment node
// AC-4.1 and AC-4.2 of the Phase 2 test strategy. The tests read the shipped week files and the
// receiving step of plan task 2.6. The tests never run the receiving step.
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const contentDirectory = resolve(app, "content");
const weekDirectory = resolve(contentDirectory, "l2");
const WEEK_FILES = [
  "w01.json",
  "w02.json",
  "w03.json",
  "w04.json",
  "w05.json",
  "w06.json",
  "w07.json",
  "w08.json",
];

/** The status of each shipped week. The source repository holds these states (spec section 2.4). */
const EXPECTED_STATUS: Record<string, string> = {
  "w01.json": "published",
  "w02.json": "draft",
  "w03.json": "draft",
  "w04.json": "draft",
  "w05.json": "draft",
  "w06.json": "draft",
  "w07.json": "draft",
  "w08.json": "draft",
};

/** One media file that a week needs. */
interface MediaItem {
  file: string;
  kind: string;
  rule: string;
}

/** The result of the receiving step for one week. */
interface ReceivedWeek {
  path: string;
  contents: string;
  media: MediaItem[];
}

/** The source record of the hand-off. */
interface SourceJson {
  repository?: string;
  commit?: string;
  files?: string[];
  [key: string]: unknown;
}

/**
 * Reads a shipped week file.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns The parsed week.
 */
function readWeek(file: string): Record<string, unknown> {
  const path = resolve(weekDirectory, file);
  expect(existsSync(path), `Missing handed-off week: ${relative(root, path)} (task 2.1)`).toBe(true);
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

/**
 * Reads the status of a week object.
 * @param week The week object.
 * @returns The status of the week.
 */
function statusOf(week: unknown): string | undefined {
  const meta = (week as { meta?: { status?: string } }).meta;
  return meta?.status;
}

/**
 * Loads the receiving step and picks its week function.
 * @returns The function that receives one week.
 */
async function loadReceiveWeek(): Promise<(week: unknown) => ReceivedWeek> {
  const path = resolve(app, "scripts/receive-weeks.ts");
  expect(
    existsSync(path),
    "Missing receiving step: apps/storytime/scripts/receive-weeks.ts (task 2.6)",
  ).toBe(true);
  let loaded: Record<string, unknown> = {};
  try {
    loaded = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
  } catch (error) {
    expect.fail(`Cannot load the receiving step: ${(error as Error).message}`);
  }
  const names = ["receiveWeek", "receiveWeekFile", "buildWeekFile"];
  for (const name of names) {
    const value = loaded[name];
    if (typeof value === "function") return value as (week: unknown) => ReceivedWeek;
  }
  expect.fail(
    `The receiving step exports no week function. It must export receiveWeek (task 2.6). Found: ${Object.keys(loaded).join(", ")}`,
  );
}

describe("AC-4.1 the hand-off records the source and the week files", () => {
  it("records the repository, the commit, and the week files", () => {
    const path = resolve(contentDirectory, "source.json");
    expect(
      existsSync(path),
      `Missing handed-off source: ${relative(root, path)} (task 2.1)`,
    ).toBe(true);
    const source = JSON.parse(readFileSync(path, "utf8")) as SourceJson;
    expect(
      typeof source.repository === "string" && source.repository.length > 0,
      "The source record names no repository (task 2.1)",
    ).toBe(true);
    expect(
      typeof source.commit === "string" && /^[0-9a-f]{40}$/.test(source.commit),
      "The source record holds no full commit (task 2.1)",
    ).toBe(true);
    expect(Array.isArray(source.files), "The source record holds no file list (task 2.1)").toBe(true);
    const files = source.files as string[];
    expect(files.length, "The file list of the source record is empty (A4)").toBeGreaterThan(0);
    for (const week of WEEK_FILES) {
      expect(
        files.some((entry) => entry.endsWith(week)),
        `The file list of the source record names no ${week} (task 2.1)`,
      ).toBe(true);
    }
  });

  it("holds no hash in the source record", () => {
    const path = resolve(contentDirectory, "source.json");
    expect(
      existsSync(path),
      `Missing handed-off source: ${relative(root, path)} (task 2.1)`,
    ).toBe(true);
    const source = JSON.parse(readFileSync(path, "utf8")) as SourceJson;
    const hashed = Object.keys(source).filter((key) => /hash|sha256|checksum|digest/i.test(key));
    expect(hashed, `The source record holds a hash field: ${hashed.join(", ")} (A15)`).toEqual([]);
  });

  it("lists the media of a shipped week by name", async () => {
    const week = readWeek("w01.json");
    const receiveWeek = await loadReceiveWeek();
    const result = receiveWeek(week);
    expect(result.media.length, "The media list of a shipped week is empty (A4)").toBeGreaterThan(0);
    for (const item of result.media) {
      expect(typeof item.file === "string" && item.file.length > 0, "A media item names no file").toBe(
        true,
      );
      expect(
        typeof item.kind === "string" && item.kind.length > 0,
        `The media item ${item.file} names no kind`,
      ).toBe(true);
      expect(
        typeof item.rule === "string" && item.rule.length > 0,
        `The media item ${item.file} names no rule`,
      ).toBe(true);
    }
  });
});

describe("AC-4.2 the receiving step keeps the status of the source", () => {
  it("writes the eight shipped weeks with the status of the source", () => {
    const weeks = WEEK_FILES.map((file) => readWeek(file));
    expect(weeks.length, "The test must read eight shipped weeks (A4)").toBe(8);
    for (const [index, file] of WEEK_FILES.entries()) {
      expect(
        statusOf(weeks[index]),
        `The shipped ${file} has the wrong status (task 2.1)`,
      ).toBe(EXPECTED_STATUS[file]);
    }
  });

  it("keeps a draft week a draft and a published week published", async () => {
    const receiveWeek = await loadReceiveWeek();
    for (const file of WEEK_FILES) {
      const week = readWeek(file);
      const result = receiveWeek(week);
      const written = JSON.parse(result.contents) as unknown;
      expect(
        statusOf(written),
        `The receiving step changed the status of ${file} (task 2.6, A2)`,
      ).toBe(EXPECTED_STATUS[file]);
      expect(result.path, `The receiving step wrote no path for ${file}`).toContain("l2");
      expect(result.path, `The receiving step wrote no path for ${file}`).toContain(file);
    }
  });
});

describe("task 2.6 the week sync runbook", () => {
  it("names the receiving step and the commit", () => {
    const path = resolve(root, "docs/runbooks/storytime-app-week-sync.md");
    expect(
      existsSync(path),
      `Missing week sync runbook: ${relative(root, path)} (task 2.6)`,
    ).toBe(true);
    const text = readFileSync(path, "utf8");
    expect(text).toContain("receive-weeks.ts");
    expect(text).toContain("--commit");
    expect(text).toContain("apps/storytime/content");
  });
});
