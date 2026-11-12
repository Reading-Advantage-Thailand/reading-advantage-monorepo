// @vitest-environment node
// Phase 5 adversarial cases (measure-adversarial-testing, run r2). The attack line of P5.12: a
// broken copy, a renamed type, a missing file, a duplicated file, a very long file name, and a
// model answer with no time attack the gates.
//
// Every case names the defect it would catch. Each attack runs twice: once against the production
// module, which must pass, and once against a mutant of the production module in a scratch copy,
// which the same check must kill. A check that passes on its mutant is vacuous. The mutants live
// in a scratch folder inside `apps/storytime` (removed when this file ends), so a bare import
// such as `zod` still resolves. No tracked production file is edited.
//
// The case groups:
//   1. A broken copy of each measured kind: a loud copy (rule 5.2), a hissy copy (rule 5.3), a
//      cut that starts inside a word (rule 10.2), and a picture that carries the name of a sound
//      file (AC-10.1).
//   2. A renamed media type: the picture named `.mp3` fails the kind check that reads content.
//   3. A missing file: the file-kind program exits non-zero on a path with no file.
//   4. A duplicated file: the media list holds no duplicated file row, and a week clone with a
//      removed page file lists one more missing picture.
//   5. A very long file name: the week contract refuses a media path over 200 characters, a
//      parent segment, an absolute path, and a backslash.
//   6. A model answer with no time: the runner throws on a fail verdict with no time (rule 6.7c).
//   7. An answer POST with a bad item id, a bad verdict, an oversized body, and an HTML comment.
//   8. The page-level sign-in note moved inside an item block, and repeated.
//   9. planLaunch with the ports 3005 and 3099, and a password file equal to the log file.
//  10. The runner order: no ledger line, no model call.
//
// The test reads `apps/storytime`, the hand-off package, and the run folder only. It reads no
// track path, so it stays valid after the track moves to `measure/archive/` (A9). The test calls
// no model: the runner cases use a mock client only. The broken copies are made in the scratch
// folder from real files, one change each, and the folder is removed when this file ends.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { request as httpRequest } from "node:http";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";

import { imageSchema } from "../lib/contracts/week";
import { mediaOf } from "../scripts/receive-weeks";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(app, "../..");

/** The hand-off package that holds the milestone media (test strategy P5.9). */
const MEDIA_ROOT = resolve(homedir(), "Desktop/handoff/w01-storytime-app-package-r4");

/** The media list document of the milestone week (test strategy P5.5). */
const LIST_PATH = resolve(repoRoot, "measure/runs/storytime_app_rebuild_20261025/media-list-w01.md");

/** The week file of the hand-off package. */
const WEEK_PATH = resolve(MEDIA_ROOT, "l2/w01.json");

/** The folder that holds the broken copies and the mutants. This file removes it when it ends. */
const scratch = mkdtempSync(resolve(app, ".phase5-adversarial-"));

/** The folder that holds the mutant copies of the production modules. */
const mutantRoot = resolve(scratch, "mutants");

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/**
 * Gives the path of one file of the hand-off package.
 * @param relative The path inside the package.
 * @returns The absolute path.
 */
function media(relative: string): string {
  return resolve(MEDIA_ROOT, relative);
}

/**
 * Runs ffmpeg and gives its output text.
 * @param args The ffmpeg arguments.
 * @returns The standard output and the standard error of the run.
 */
function ffmpegText(args: string[]): string {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" });
  return `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
}

/**
 * Reads one number of the ffmpeg loudnorm JSON summary.
 * @param text The ffmpeg output.
 * @param key The key of the summary, for example `input_i`.
 * @returns The number.
 */
function loudnormNumber(text: string, key: string): number {
  const found = text.match(new RegExp(`"${key}"\\s*:\\s*"(-?[0-9.]+)"`));
  expect(found, `the ffmpeg loudnorm output holds no ${key}`).not.toBeNull();
  return Number(found?.[1]);
}

/**
 * Measures the integrated loudness of a file.
 * @param file The file to measure.
 * @returns The integrated loudness in LUFS.
 */
function measureLufs(file: string): number {
  return loudnormNumber(
    ffmpegText(["-i", file, "-af", "loudnorm=I=-16:TP=-1:print_format=json", "-f", "null", "-"]),
    "input_i",
  );
}

/**
 * Reads the last value of one astats label.
 * @param text The ffmpeg astats summary.
 * @param label The astats label, for example `Noise floor dB`.
 * @returns The value of the last section that holds the label.
 */
function astatsNumber(text: string, label: string): number {
  const found = [...text.matchAll(new RegExp(`${label}:\\s*(-?[0-9.]+)`, "g"))];
  expect(found.length, `the ffmpeg astats output holds no ${label}`).toBeGreaterThan(0);
  return Number(found[found.length - 1]?.[1]);
}

/**
 * Measures the noise floor of a file.
 * @param file The file to measure.
 * @returns The noise floor in dBFS.
 */
function measureNoiseFloor(file: string): number {
  return astatsNumber(
    ffmpegText(["-i", file, "-af", "astats=metadata=0:reset=0", "-f", "null", "-"]),
    "Noise floor dB",
  );
}

/**
 * Makes a copy of a real file that sits at a chosen loudness.
 *
 * The copy goes into the scratch folder. The function measures the copy and corrects the gain,
 * because the mp3 encoder moves the loudness a little.
 * @param source The real file to copy.
 * @param name The name of the copy inside the scratch folder.
 * @param targetLufs The loudness the copy must reach in LUFS.
 * @returns The path of the copy and its measured loudness.
 */
function copyAtLoudness(source: string, name: string, targetLufs: number): { path: string; lufs: number } {
  const path = resolve(scratch, name);
  let gain = 0;
  let lufs = 0;
  for (let round = 0; round < 3; round += 1) {
    const filters = gain === 0 ? "anull" : `volume=${gain.toFixed(3)}dB`;
    ffmpegText(["-y", "-i", source, "-af", filters, "-ar", "32000", "-ac", "1", "-b:a", "128k", path]);
    lufs = measureLufs(path);
    gain = targetLufs - lufs;
    if (Math.abs(targetLufs - lufs) <= 0.2) break;
  }
  return { path, lufs };
}

/**
 * Makes a copy of a real file with one change, so the copy breaks one rule.
 * @param source The real file to copy.
 * @param name The name of the copy inside the scratch folder.
 * @param filters The ffmpeg audio filter that makes the change.
 * @returns The path of the copy.
 */
function brokenCopy(source: string, name: string, filters: string): string {
  const path = resolve(scratch, name);
  ffmpegText(["-y", "-i", source, "-af", filters, "-ar", "32000", "-ac", "1", "-b:a", "128k", path]);
  return path;
}

/**
 * Reads one export of a check script.
 * @param name The name of the script file without the extension.
 * @returns The exports of the script.
 */
async function loadScript(name: string): Promise<Record<string, unknown>> {
  const path = resolve(app, "scripts", "checks", `${name}.ts`);
  expect(existsSync(path), `Missing ${path}`).toBe(true);
  return (await import(/* @vite-ignore */ new URL(`file://${path}`).href)) as Record<string, unknown>;
}

/**
 * Reads one module by its absolute path.
 * @param path The absolute path of the module.
 * @returns The exports of the module.
 */
async function loadModulePath(path: string): Promise<Record<string, unknown>> {
  return (await import(/* @vite-ignore */ new URL(`file://${path}`).href)) as Record<string, unknown>;
}

/**
 * Reads the review server module.
 * @returns The exports of the review server module.
 */
async function loadReviewServer(): Promise<Record<string, unknown>> {
  const path = resolve(app, "scripts", "review", "review-server.ts");
  expect(existsSync(path), `Missing ${path}`).toBe(true);
  return loadModulePath(path);
}

/**
 * Reads the launch script of the review copy.
 * @returns The exports of the launch script.
 */
async function loadLaunch(): Promise<Record<string, unknown>> {
  const path = resolve(app, "scripts", "review", "launch-review-copy.ts");
  expect(existsSync(path), `Missing ${path}`).toBe(true);
  return loadModulePath(path);
}

/**
 * Reads one function of a module.
 * @param module The exports of the module.
 * @param name The name of the export.
 * @returns The function.
 */
function functionOf(module: Record<string, unknown>, name: string): (...args: unknown[]) => unknown {
  const value = module[name];
  expect(typeof value, `the module has no function ${name}`).toBe("function");
  return value as (...args: unknown[]) => unknown;
}

/**
 * Writes one mutant of a production module into the scratch folder.
 *
 * Each replacement names one anchor that must sit exactly once in the source, so a mutant that
 * lost its anchor fails loudly instead of silently staying the production code.
 * @param sourcePath The path of the production module.
 * @param name The name of the mutant inside the scratch folder.
 * @param replacements The anchors and their replacements, in order.
 * @returns The absolute path of the mutant.
 */
function writeMutant(
  sourcePath: string,
  name: string,
  replacements: Array<{ from: string; to: string }>,
): string {
  const source = readFileSync(sourcePath, "utf8");
  let mutated = source;
  for (const { from, to } of replacements) {
    const hits = mutated.split(from).length - 1;
    expect(hits, `the mutant ${name} finds ${hits} anchors, not one: ${from}`).toBe(1);
    mutated = mutated.replace(from, to);
  }
  mkdirSync(dirname(resolve(mutantRoot, name)), { recursive: true });
  const path = resolve(mutantRoot, `${name}.ts`);
  writeFileSync(path, mutated, "utf8");
  return path;
}

/**
 * Runs the main function of a check script and gives its exit code and its output.
 * @param script The exports of the check script.
 * @param argv The arguments of the script.
 * @returns The exit code and the printed text.
 */
function runMain(script: Record<string, unknown>, argv: string[]): { code: number; output: string } {
  const main = functionOf(script, "main") as (args: string[]) => unknown;
  const lines: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map((value) => String(value)).join(" "));
  });
  const write = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      lines.push(String(chunk));
      return true;
    });
  let code = 0;
  try {
    code = Number(main(argv));
  } finally {
    log.mockRestore();
    write.mockRestore();
  }
  return { code, output: lines.join("\n") };
}

/**
 * Reads one labeled word of the output of a check script.
 * @param output The printed text.
 * @param label The label, for example `file_kind`.
 * @returns The word.
 */
function labeledWord(output: string, label: string): string {
  const found = output.match(new RegExp(`(?:^|\\s)${label}=([a-z]+)(?:\\s|$)`, "m"));
  expect(found, `the check script prints no ${label}`).not.toBeNull();
  return found?.[1] ?? "";
}

/**
 * Reads the size of a file in bytes with ffprobe.
 * @param file The file to read.
 * @returns The size of the file.
 */
function sizeOf(file: string): number {
  const run = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=size", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  const size = Number((run.stdout ?? "").trim());
  expect(Number.isFinite(size), `ffprobe read no size for ${file}`).toBe(true);
  return size;
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
 * Tells whether one row is the delimiter row of a Markdown table.
 * @param cells The cells of the row.
 * @returns True when the row holds only dashes, colons, and spaces.
 */
function isDelimiterRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^[-: ]*$/.test(cell));
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
 * Checks the media list document for duplicated file rows and for the row count.
 * @param text The text of the media list document.
 * @returns One violation per defect; an empty list means the document passes.
 */
function listViolations(text: string): string[] {
  const violations: string[] = [];
  const lines = text.split("\n").filter((line) => line.trim().startsWith("|"));
  if (lines.length < 2) return ["the media list holds no table rows"];
  const header = cellsOf(lines[0] ?? "");
  const fileIndex = header.findIndex((cell) => columnName(cell) === "file");
  const labelIndex = header.findIndex((cell) => columnName(cell) === "label");
  if (fileIndex < 0 || labelIndex < 0) return ["the media list has no file or label column"];
  const rows = lines
    .slice(1)
    .map(cellsOf)
    .filter((cells) => !isDelimiterRow(cells));
  const files = rows
    .filter((cells) => (cells[labelIndex] ?? "") === "" && (cells[fileIndex] ?? "") !== "")
    .map((cells) => cells[fileIndex] ?? "");
  if (files.length === 0) violations.push("the media list holds no media row (A4)");
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const file of files) {
    if (seen.has(file)) duplicates.add(file);
    seen.add(file);
  }
  if (duplicates.size > 0) {
    violations.push(`the media list holds duplicated file rows: ${[...duplicates].join(", ")}`);
  }
  const counts = new Map<string, number>();
  for (const line of text.split("\n")) {
    const found = line.match(/^\s*([a-z_]+)=([0-9]+)\s*$/);
    if (found) counts.set(found[1] ?? "", Number(found[2]));
  }
  const mediaFiles = counts.get("media_files");
  if (mediaFiles === undefined) violations.push("the media list prints no media_files count");
  else if (files.length !== mediaFiles) {
    violations.push(`the media list holds ${files.length} media rows but media_files=${mediaFiles}`);
  }
  return violations;
}

/** One element of the review page, found by an attribute. */
interface PageElement {
  /** The start index of the element in the page. */
  start: number;
  /** The end index of the element in the page. */
  end: number;
  /** The text of the element, with the inner tags removed. */
  text: string;
  /** The value of the attribute of the element. */
  value: string;
}

/**
 * Gives the range of the element that starts at an index.
 * @param page The HTML of the page.
 * @param index The index of the opening tag of the element.
 * @returns The start index and the end index of the element, or null when the element has no end.
 */
function elementRangeAt(page: string, index: number): { start: number; end: number } | null {
  const tag = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(page.slice(index))?.[1];
  if (!tag) return null;
  const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  token.lastIndex = index;
  let depth = 0;
  let hit = token.exec(page);
  while (hit !== null) {
    if (hit[1] === "/") {
      depth -= 1;
      if (depth === 0) return { start: index, end: hit.index + hit[0].length };
    } else {
      depth += 1;
    }
    hit = token.exec(page);
  }
  return null;
}

/**
 * Gives the text of an element of the page, with the inner tags removed.
 * @param page The HTML of the page.
 * @param range The start index and the end index of the element.
 * @returns The text of the element.
 */
function innerTextOf(page: string, range: { start: number; end: number }): string {
  const openEnd = page.indexOf(">", range.start);
  const closeStart = page.lastIndexOf("</", range.end);
  const inner = page.slice(openEnd + 1, closeStart > openEnd ? closeStart : range.end);
  return inner.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Gives every element of the page that holds an attribute.
 * @param page The HTML of the page.
 * @param name The name of the attribute.
 * @returns The range, the text, and the value of each element.
 */
function pageElements(page: string, name: string): PageElement[] {
  const open = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9-]*)[^>]*\\s${name}(?=[\\s=/>])(?:=["']([^"']*)["'])?[^>]*>`,
    "g",
  );
  const found: PageElement[] = [];
  let hit = open.exec(page);
  while (hit !== null) {
    const range = elementRangeAt(page, hit.index);
    if (range) {
      found.push({
        start: range.start,
        end: range.end,
        text: innerTextOf(page, range),
        value: hit[2] ?? "",
      });
    }
    hit = open.exec(page);
  }
  return found;
}

/**
 * Checks the page-level sign-in note of the review page (test strategy P5.12).
 * @param page The HTML of the review page.
 * @returns One violation per defect; an empty list means the page passes.
 */
function signinViolations(page: string): string[] {
  if (page.trim().length === 0) return ["the review page holds no text"];
  const violations: string[] = [];
  const notes = pageElements(page, "data-review-signin-all");
  if (notes.length !== 1) {
    violations.push(
      `the review page holds ${notes.length} page-level sign-in notes with the attribute data-review-signin-all`,
    );
  }
  const note = notes[0];
  if (note !== undefined) {
    if (!note.text.toLowerCase().includes("/th/sign-in")) {
      violations.push("the page-level sign-in note names no path /th/sign-in");
    }
    const claims = /one sign[-\s]?in[^.]{0,140}all five|all five[^.]{0,140}one sign[-\s]?in/i;
    if (!claims.test(note.text)) {
      violations.push("the page-level sign-in note does not say that one sign-in opens all five items");
    }
    for (const item of pageElements(page, "data-review-item")) {
      if (note.start < item.end && note.end > item.start) {
        violations.push(`the page-level sign-in note sits inside the item block ${item.value}`);
      }
    }
  }
  return violations;
}

/**
 * Gives a free port on 127.0.0.1. The port is never 3005 and never 3099.
 * @returns The port.
 */
async function freePort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((settle, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => settle());
  });
  const address = server.address();
  const port = address !== null && typeof address === "object" ? address.port : 0;
  await new Promise<void>((settle) => server.close(() => settle()));
  expect(port, "the probe found no free port").toBeGreaterThan(0);
  expect([3005, 3099], `the free port ${port} is a forbidden port`).not.toContain(port);
  return port;
}

/** One answer response, or null when the request failed at the socket level. */
interface AnswerResponse {
  /** The HTTP status code. */
  status: number;
  /** The response body text. */
  text: string;
}

/**
 * Posts one answer body to a review server.
 * @param base The base URL of the server, for example `http://127.0.0.1:45123`.
 * @param body The request body text.
 * @returns The status and the body of the response, or null when the request failed.
 */
function postAnswer(base: string, body: string): Promise<AnswerResponse | null> {
  return new Promise((settle) => {
    const url = new URL(`${base}/review/answer`);
    const request = httpRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          connection: "close",
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          settle({
            status: response.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("error", () => settle(null));
    request.end(body);
  });
}

/**
 * Reads the answer lines of an answers file.
 * @param answersPath The path of the answers file.
 * @returns The non-empty lines of the file.
 */
function answerLines(answersPath: string): string[] {
  if (!existsSync(answersPath)) return [];
  return readFileSync(answersPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The options of the review server that the answer cases use. */
interface ReviewServerHandle {
  /** The port the server listens on. */
  port: number;
  /** Stops the server. */
  close(): Promise<void>;
}

/**
 * Starts one review server on a free port for one case, and stops it after the case.
 * @param answersPath The path of the answers file.
 * @param module The exports of the review server module, production or mutant.
 * @param run The body of the case.
 */
async function withReviewServer(
  answersPath: string,
  module: Record<string, unknown>,
  run: (base: string) => Promise<void>,
): Promise<void> {
  const start = functionOf(module, "startReviewServer") as (options: unknown) => Promise<ReviewServerHandle>;
  const port = await freePort();
  const server = await start({
    port,
    appUrl: "http://127.0.0.1:9",
    answersPath,
    commit: "adversarial-test",
  });
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await server.close();
  }
}

/** One verdict of a mock model client. */
interface MockVerdict {
  /** Whether the file passes the rubric. */
  pass: boolean;
  /** The reason of the verdict. */
  reason: string;
  /** The time in the file in seconds, or null when the verdict holds no time. */
  atSeconds: number | null;
}

/** One mock model client. It never calls a model and never spends money. */
interface MockClient {
  /** The model id. */
  readonly id: string;
  /** Whether the client is a mock. */
  readonly isMock: boolean;
  /** The count of the calls the client took. */
  called: number;
  /** Checks the files of one call. */
  check(request: unknown): Promise<MockVerdict[]>;
}

/**
 * Makes one mock model client with fixed verdicts.
 * @param verdicts The verdicts the client returns.
 * @returns The mock client.
 */
function mockClient(verdicts: MockVerdict[]): MockClient {
  const client: MockClient = {
    id: "mock-adversarial",
    isMock: true,
    called: 0,
    check: () => {
      client.called += 1;
      return Promise.resolve(verdicts);
    },
  };
  return client;
}

/** The ledger entry of the runner cases. Its fields are the nine fields of P5.1. */
const LEDGER_ENTRY = {
  date: "2026-11-13",
  task: "5.4-adversarial",
  purpose: "the adversarial cases of phase 5",
  model: "mock-adversarial",
  unitPrice: "0 USD",
  priceReadDate: "2026-11-13",
  itemCount: 1,
  estimatedTotal: "0 USD",
  approvalOwner: "measure-adversarial-testing",
};

/** The options of one launch of the review copy. */
interface LaunchOptions {
  /** The port of the review server. */
  port: number;
  /** The folder that holds the received weeks. */
  contentDir: string;
  /** The path of the answers file. */
  answersPath: string;
  /** The path of the file that holds the password of the teacher account. */
  passwordFile: string;
  /** The path of the log file of the servers. */
  logFile: string;
  /** The Git commit of the tree. */
  commit: string;
}

/** The launch options that pass the plan. Each port case changes only the port. */
const LAUNCH_OPTIONS: LaunchOptions = {
  port: 45123,
  contentDir: "/tmp/storytime-review/content",
  answersPath: "/tmp/storytime-review/review-answers-p5.json",
  passwordFile: "/tmp/storytime-review/teacher-password.txt",
  logFile: "/tmp/storytime-review/servers.log",
  commit: "0123456789abcdef0123456789abcdef01234567",
};

describe("Phase 5 adversarial preconditions (A4)", () => {
  it("names the hand-off package, the week file, and the media list document", () => {
    expect(existsSync(MEDIA_ROOT), `Missing the hand-off package ${MEDIA_ROOT}`).toBe(true);
    expect(existsSync(WEEK_PATH), `Missing ${WEEK_PATH}`).toBe(true);
    expect(existsSync(LIST_PATH), `Missing ${LIST_PATH}`).toBe(true);
  });
});

describe("Phase 5 adversarial stage 1: broken copies and the renamed media type", () => {
  it("fails a loud copy of the real book audio (rule 5.2)", () => {
    const copy = copyAtLoudness(media("l2/media/w01/books/1-hello.mp3"), "adv-at-13.mp3", -13);
    expect(Math.abs(copy.lufs + 13), "the copy does not sit at -13 LUFS").toBeLessThanOrEqual(0.6);
    expect(
      Math.abs(copy.lufs + 16),
      "the copy does not sit off the loudness target",
    ).toBeGreaterThan(1);
    return loadScript("loudness").then((script) => {
      const run = runMain(script, ["--file", copy.path]);
      expect(run.code, "the loudness check passes a copy at -13 LUFS").not.toBe(0);
    });
  });

  it("kills a loudness check whose bounds are widened (mutant)", () => {
    const copy = copyAtLoudness(media("l2/media/w01/books/1-hello.mp3"), "adv-mut-loud.mp3", -13);
    const mutantPath = writeMutant(resolve(app, "scripts", "checks", "loudness.ts"), "loudness-wide", [
      { from: "export const TARGET_TOLERANCE_LU = 1;", to: "export const TARGET_TOLERANCE_LU = 100;" },
      {
        from: "export const TRUE_PEAK_CEILING_DBTP = -1;",
        to: "export const TRUE_PEAK_CEILING_DBTP = 100;",
      },
    ]);
    return loadModulePath(mutantPath).then((mutant) => {
      const run = runMain(mutant, ["--file", copy.path]);
      expect(
        run.code,
        "the check does not kill its mutant: the widened bounds still fail the loud copy",
      ).toBe(0);
    });
  });

  it("fails a hissy copy of the real word clip (rule 5.3)", () => {
    const copy = brokenCopy(
      media("l2/media/w01/words/wa-pip.mp3"),
      "adv-noisy.mp3",
      "anoisesrc=color=pink:amplitude=0.08:duration=1.2,amix=inputs=2:duration=first:dropout_transition=0",
    );
    expect(measureNoiseFloor(copy), "the noisy copy has a quiet noise floor").toBeGreaterThan(-60);
    return loadScript("noise").then((script) => {
      const run = runMain(script, ["--file", copy]);
      expect(run.code, "the noise check passes a copy with added noise").not.toBe(0);
    });
  });

  it("kills a noise check whose ceiling is raised (mutant)", () => {
    const copy = brokenCopy(
      media("l2/media/w01/words/wa-pip.mp3"),
      "adv-mut-noisy.mp3",
      "anoisesrc=color=pink:amplitude=0.08:duration=1.2,amix=inputs=2:duration=first:dropout_transition=0",
    );
    const mutantPath = writeMutant(resolve(app, "scripts", "checks", "noise.ts"), "noise-high-ceiling", [
      { from: "export const NOISE_FLOOR_CEILING_DBFS = -60;", to: "export const NOISE_FLOOR_CEILING_DBFS = 0;" },
    ]);
    return loadModulePath(mutantPath).then((mutant) => {
      const run = runMain(mutant, ["--file", copy]);
      expect(
        run.code,
        "the check does not kill its mutant: the raised ceiling still fails the hissy copy",
      ).toBe(0);
    });
  });

  it("fails a cut that starts inside a word (rule 10.2)", () => {
    const copy = resolve(scratch, "adv-cut-inside.mp3");
    const made = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-v", "error", "-y", "-ss", "0.2", "-t", "0.3", "-i", media("l2/media/w01/words/wa-net.mp3"), copy],
      { encoding: "utf8" },
    );
    expect(made.status, "the broken copy was not made").toBe(0);
    return loadScript("word-edges").then((script) => {
      const run = runMain(script, ["--file", copy, "--start", "0", "--end", "0.3"]);
      expect(run.code, "the word-edge check passes a cut that starts inside a word").not.toBe(0);
    });
  });

  it("kills a word-edge check whose quiet level is raised (mutant)", () => {
    const copy = resolve(scratch, "adv-mut-cut.mp3");
    const made = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-v", "error", "-y", "-ss", "0.2", "-t", "0.3", "-i", media("l2/media/w01/words/wa-net.mp3"), copy],
      { encoding: "utf8" },
    );
    expect(made.status, "the broken copy was not made").toBe(0);
    const mutantPath = writeMutant(resolve(app, "scripts", "checks", "word-edges.ts"), "edges-loud-quiet", [
      { from: "export const QUIET_EDGE_DBFS = -40;", to: "export const QUIET_EDGE_DBFS = 40;" },
    ]);
    return loadModulePath(mutantPath).then((mutant) => {
      const run = runMain(mutant, ["--file", copy, "--start", "0", "--end", "0.3"]);
      expect(
        run.code,
        "the check does not kill its mutant: the raised quiet level still fails the broken cut",
      ).toBe(0);
    });
  });

  it("fails a picture that carries the name of a sound file (the renamed media type)", () => {
    const copy = resolve(scratch, "adv-picture-named-mp3.mp3");
    copyFileSync(media("l2/media/w01/books/1-hello/p01.jpg"), copy);
    const size = sizeOf(copy);
    return loadScript("file-kind").then((script) => {
      const run = runMain(script, ["--file", copy, "--kind", "audio", "--size", String(size)]);
      expect(labeledWord(run.output, "file_kind"), "the check reads the name, not the content").toBe(
        "picture",
      );
      expect(run.code, "the file check passes a picture named .mp3 as audio").not.toBe(0);
    });
  });

  it("kills a file-kind check that trusts the name (mutant)", () => {
    const copy = resolve(scratch, "adv-mut-picture.mp3");
    copyFileSync(media("l2/media/w01/books/1-hello/p01.jpg"), copy);
    const size = sizeOf(copy);
    const mutantPath = writeMutant(resolve(app, "scripts", "checks", "file-kind.ts"), "kind-trusts-name", [
      {
        from: '  if (names.some((name) => VIDEO_FORMATS.has(name))) return "video";',
        to: '  if (true) return "audio";',
      },
    ]);
    return loadModulePath(mutantPath).then((mutant) => {
      const run = runMain(mutant, ["--file", copy, "--kind", "audio", "--size", String(size)]);
      expect(
        run.code,
        "the check does not kill its mutant: the name-trusting kind check still fails the renamed picture",
      ).toBe(0);
    });
  });

  it("exits non-zero on a missing file, in process and as a program", () => {
    const missing = resolve(scratch, "no-such-file.mp3");
    expect(existsSync(missing), "the missing-file case holds a file").toBe(false);
    return loadScript("file-kind").then((script) => {
      const main = functionOf(script, "main") as (args: string[]) => unknown;
      expect(
        () => main(["--file", missing, "--kind", "audio", "--size", "0"]),
        "the file check passes a path with no file",
      ).toThrow();
      const program = spawnSync(
        resolve(repoRoot, "node_modules/.bin/tsx"),
        ["scripts/checks/file-kind.ts", "--file", missing, "--kind", "audio", "--size", "0"],
        { cwd: app, encoding: "utf8" },
      );
      expect(program.status, "the program exits zero on a missing file").not.toBe(0);
    });
  });

  it("kills a file-kind check that stubs the reading (mutant)", () => {
    const missing = resolve(scratch, "no-such-file-mutant.mp3");
    const mutantPath = writeMutant(resolve(app, "scripts", "checks", "file-kind.ts"), "kind-stub-reading", [
      {
        from: "  const reading = measureFile(file);",
        to: '  const reading = { formatName: "mp3", codecName: "mp3", sizeBytes: 0 };',
      },
    ]);
    const program = spawnSync(
      resolve(repoRoot, "node_modules/.bin/tsx"),
      [mutantPath, "--file", missing, "--kind", "audio", "--size", "0"],
      { cwd: app, encoding: "utf8" },
    );
    expect(
      program.status,
      "the check does not kill its mutant: the stub reading still fails the missing file",
    ).toBe(0);
  });
});

/** The runner script of task 5.4. */
const RUNNER_PATH = resolve(app, "scripts", "checks", "runner.ts");

/** The review server module of tasks 5.6 and 5.7. */
const REVIEW_SERVER_PATH = resolve(app, "scripts", "review", "review-server.ts");

/** The launch script of the review copy. */
const LAUNCH_PATH = resolve(app, "scripts", "review", "launch-review-copy.ts");

/** The week contract that holds the media path rule. */
const WEEK_CONTRACT_PATH = resolve(app, "lib", "contracts", "week.ts");

/** The loops module of the app, as an import URL for the mutants in the scratch folder. */
const LOOPS_URL = pathToFileURL(resolve(app, "lib", "loops.ts")).href;

describe("Phase 5 adversarial media list and week contract", () => {
  it("holds no duplicated file row in the media list", () => {
    const violations = listViolations(readFileSync(LIST_PATH, "utf8"));
    expect(violations, `the media list fails its check: ${violations.join("; ")}`).toEqual([]);
  });

  it("kills a media list that duplicates a file row (mutant document)", () => {
    const text = readFileSync(LIST_PATH, "utf8");
    const lines = text.split("\n");
    const tableLines = lines.filter((line) => line.trim().startsWith("|"));
    const header = cellsOf(tableLines[0] ?? "");
    const fileIndex = header.findIndex((cell) => columnName(cell) === "file");
    const labelIndex = header.findIndex((cell) => columnName(cell) === "label");
    expect(fileIndex, "the media list has no file column").toBeGreaterThanOrEqual(0);
    expect(labelIndex, "the media list has no label column").toBeGreaterThanOrEqual(0);
    const firstMediaRow = tableLines.slice(1).find((line) => {
      const cells = cellsOf(line);
      return (
        !isDelimiterRow(cells) &&
        (cells[labelIndex] ?? "") === "" &&
        (cells[fileIndex] ?? "") !== ""
      );
    });
    expect(firstMediaRow, "the media list holds no media row to duplicate").toBeDefined();
    const mutated = lines
      .flatMap((line) => (line === firstMediaRow ? [line, line] : [line]))
      .join("\n");
    const violations = listViolations(mutated);
    expect(
      violations.length,
      "the check does not kill its mutant: the duplicated row passes the list check",
    ).toBeGreaterThan(0);
  });

  it("lists one more missing picture when a page file leaves a week clone", () => {
    const weekText = readFileSync(WEEK_PATH, "utf8");
    const week = JSON.parse(weekText) as Parameters<typeof mediaOf>[0];
    const before = mediaOf(week).filter((entry) => entry.missing !== undefined);
    const clone = JSON.parse(weekText) as Parameters<typeof mediaOf>[0];
    const image = clone.books[0]?.pages[0]?.image as { file?: string } | undefined;
    expect(image?.file, "the week clone holds no page file to remove").toBeTruthy();
    if (image !== undefined) delete image.file;
    const after = mediaOf(clone).filter((entry) => entry.missing !== undefined);
    expect(after.length, "the clone lists no new missing picture").toBe(before.length + 1);
    const added = after.find((entry) => !before.some((entryBefore) => entryBefore.file === entry.file));
    expect(added?.missing, "the new missing entry names no place").toContain("page 1 of the");
  });

  it("kills a receiver that drops missing pictures (mutant)", async () => {
    const weekUrl = pathToFileURL(WEEK_CONTRACT_PATH).href;
    const readinessUrl = pathToFileURL(resolve(app, "lib", "readiness.ts")).href;
    const mutantPath = writeMutant(resolve(app, "scripts", "receive-weeks.ts"), "receiver-drops-missing", [
      { from: 'from "../lib/contracts/week"', to: `from "${weekUrl}"` },
      { from: 'from "../lib/readiness"', to: `from "${readinessUrl}"` },
      {
        from: "    if (image.file) add(image.file, kind, rule);\n    else missing.set(field, { file: field, kind, rule, missing: place });",
        to: "    if (image.file) add(image.file, kind, rule);",
      },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const mediaOfMutant = functionOf(mutant, "mediaOf") as (week: unknown) => Array<{ missing?: string }>;
    const weekText = readFileSync(WEEK_PATH, "utf8");
    const week = JSON.parse(weekText) as Parameters<typeof mediaOf>[0];
    const before = mediaOf(week).filter((entry) => entry.missing !== undefined);
    const clone = JSON.parse(weekText) as Parameters<typeof mediaOf>[0];
    const image = clone.books[0]?.pages[0]?.image as { file?: string } | undefined;
    if (image !== undefined) delete image.file;
    const after = mediaOfMutant(clone).filter((entry) => entry.missing !== undefined);
    expect(
      after.length,
      "the check does not kill its mutant: the receiver without the missing collection still lists the new missing picture",
    ).toBe(before.length);
  });

  it("refuses a media file name over 200 characters, and accepts 200", () => {
    const at200 = `${"a".repeat(196)}.mp3`;
    expect(at200.length, "the 200-character name holds another length").toBe(200);
    expect(
      imageSchema.safeParse({ file: at200 }).success,
      "the contract refuses a 200-character media name",
    ).toBe(true);
    const over = `${"a".repeat(197)}.mp3`;
    expect(over.length, "the 201-character name holds another length").toBe(201);
    expect(
      imageSchema.safeParse({ file: over }).success,
      "the contract accepts a media name over 200 characters",
    ).toBe(false);
  });

  it("kills a week contract whose path limit is raised (mutant)", async () => {
    const mutantPath = writeMutant(WEEK_CONTRACT_PATH, "contract-long-path", [
      { from: "const MEDIA_PATH_MAX = 200;", to: "const MEDIA_PATH_MAX = 100000;" },
      {
        from: 'import { loopsApproved, STORYTIME_LOOPS_PART } from "../loops";',
        to: `import { loopsApproved, STORYTIME_LOOPS_PART } from "${LOOPS_URL}";`,
      },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const schema = mutant["imageSchema"] as typeof imageSchema;
    expect(schema, "the mutant week contract exports no imageSchema").toBeDefined();
    const over = `${"a".repeat(197)}.mp3`;
    expect(
      schema.safeParse({ file: over }).success,
      "the check does not kill its mutant: the raised limit still refuses the long name",
    ).toBe(true);
  });

  it("refuses a parent segment, an absolute path, and a backslash in a media name", () => {
    expect(
      imageSchema.safeParse({ file: "l2/media/../secret.mp3" }).success,
      "the contract accepts a parent segment",
    ).toBe(false);
    expect(
      imageSchema.safeParse({ file: "/etc/passwd" }).success,
      "the contract accepts an absolute path",
    ).toBe(false);
    expect(
      imageSchema.safeParse({ file: "l2\\media\\x.mp3" }).success,
      "the contract accepts a backslash",
    ).toBe(false);
    expect(
      imageSchema.safeParse({ file: "l2/media/w01/words/wa-net.mp3" }).success,
      "the contract refuses a real media path",
    ).toBe(true);
  });

  it("kills a week contract whose parent-segment rule is off (mutant)", async () => {
    const mutantPath = writeMutant(WEEK_CONTRACT_PATH, "contract-dotdot-off", [
      {
        from: '.refine((path) => !path.split("/").includes(".."), {',
        to: ".refine(() => true, {",
      },
      {
        from: 'import { loopsApproved, STORYTIME_LOOPS_PART } from "../loops";',
        to: `import { loopsApproved, STORYTIME_LOOPS_PART } from "${LOOPS_URL}";`,
      },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const schema = mutant["imageSchema"] as typeof imageSchema;
    expect(schema, "the mutant week contract exports no imageSchema").toBeDefined();
    expect(
      schema.safeParse({ file: "l2/media/../secret.mp3" }).success,
      "the check does not kill its mutant: the rule-free contract still refuses the parent segment",
    ).toBe(true);
  });
});

describe("Phase 5 adversarial runner: the ledger order and the verdict time", () => {
  it("throws when a fail verdict holds no time in the file (rule 6.7c)", async () => {
    const module = await loadScript("runner");
    const runPreCheck = functionOf(module, "runPreCheck") as (options: unknown) => Promise<unknown>;
    const client = mockClient([{ pass: false, reason: "the cut holds the next word", atSeconds: null }]);
    await expect(
      runPreCheck({
        ledgerPath: resolve(scratch, "runner-no-time.log"),
        entry: LEDGER_ENTRY,
        client,
        files: ["wa-net.mp3"],
        kind: "word cut",
        rubricText: "the rubric of the word cut",
      }),
      "the runner accepts a fail verdict with no time in the file",
    ).rejects.toThrow(/no time/);
    const pictureClient = mockClient([{ pass: false, reason: "a gesture thumbnail", atSeconds: null }]);
    const result = (await runPreCheck({
      ledgerPath: resolve(scratch, "runner-picture.log"),
      entry: LEDGER_ENTRY,
      client: pictureClient,
      files: ["p01.jpg"],
      kind: "picture",
      rubricText: "the rubric of the picture",
    })) as { failures: string[] };
    expect(result.failures[0], "the picture fail holds no at=none").toContain("at=none");
  });

  it("kills a runner that accepts a fail verdict with no time (mutant)", async () => {
    const mutantPath = writeMutant(RUNNER_PATH, "runner-no-time-guard-off", [
      { from: "  if (at === null || at === undefined || !Number.isFinite(at)) {", to: "  if (false) {" },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const runPreCheck = functionOf(mutant, "runPreCheck") as (options: unknown) => Promise<unknown>;
    let threw = false;
    try {
      await runPreCheck({
        ledgerPath: resolve(scratch, "runner-mutant-no-time.log"),
        entry: LEDGER_ENTRY,
        client: mockClient([{ pass: false, reason: "the cut holds the next word", atSeconds: null }]),
        files: ["wa-net.mp3"],
        kind: "word cut",
        rubricText: "the rubric of the word cut",
      });
    } catch {
      threw = true;
    }
    expect(
      threw,
      "the check does not kill its mutant: the guard-free runner still throws on the verdict with no time",
    ).toBe(false);
  });

  it("writes no model call when the ledger line cannot be written", async () => {
    const module = await loadScript("runner");
    const runPreCheck = functionOf(module, "runPreCheck") as (options: unknown) => Promise<unknown>;
    const blocker = resolve(scratch, "blocker.txt");
    writeFileSync(blocker, "x", "utf8");
    const ledgerPath = resolve(blocker, "ledger.md");
    const client = mockClient([]);
    await expect(
      runPreCheck({
        ledgerPath,
        entry: LEDGER_ENTRY,
        client,
        files: ["wa-net.mp3"],
        kind: "word cut",
        rubricText: "the rubric of the word cut",
      }),
      "the runner makes no model call with no ledger line",
    ).rejects.toThrow(/ledger/);
    expect(client.called, "the runner called the model with no ledger line").toBe(0);
  });

  it("kills a runner that calls the model before the ledger line (mutant)", async () => {
    const mutantPath = writeMutant(RUNNER_PATH, "runner-call-first", [
      {
        from: "  const ledgerLine = ledgerLineOf(entry, entry.itemCount);\n  writeLedgerLine(ledgerPath, ledgerLine);\n\n  const verdicts = await client.check({ files, kind, rubricText });",
        to: "  const verdicts = await client.check({ files, kind, rubricText });\n  const ledgerLine = ledgerLineOf(entry, entry.itemCount);\n  writeLedgerLine(ledgerPath, ledgerLine);",
      },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const runPreCheck = functionOf(mutant, "runPreCheck") as (options: unknown) => Promise<unknown>;
    const blocker = resolve(scratch, "blocker-mutant.txt");
    writeFileSync(blocker, "x", "utf8");
    const client = mockClient([]);
    let threw = false;
    try {
      await runPreCheck({
        ledgerPath: resolve(blocker, "ledger.md"),
        entry: LEDGER_ENTRY,
        client,
        files: ["wa-net.mp3"],
        kind: "word cut",
        rubricText: "the rubric of the word cut",
      });
    } catch {
      threw = true;
    }
    expect(threw, "the mutant runner still refuses the unwritable ledger").toBe(true);
    expect(
      client.called,
      "the check does not kill its mutant: the reordered runner still makes no model call",
    ).toBeGreaterThan(0);
  });
});

describe("Phase 5 adversarial answer path: bad item id, bad verdict, oversized body, HTML comment", () => {
  it("refuses an answer with a bad item id", async () => {
    const module = await loadReviewServer();
    const answersPath = resolve(scratch, "answers-bad-item.json");
    await withReviewServer(answersPath, module, async (base) => {
      const response = await postAnswer(
        base,
        JSON.stringify({ itemId: "no-such-item", verdict: "pass", comment: "x" }),
      );
      expect(response, "the server gave no response to a bad answer").not.toBeNull();
      expect(response?.status, "the answer path takes an answer with a bad item id").toBe(400);
      expect(response?.text, "the refusal names no item").toContain("no known item");
      expect(answerLines(answersPath), "the bad answer was written").toEqual([]);
    });
  });

  it("refuses an answer with a bad verdict", async () => {
    const module = await loadReviewServer();
    const answersPath = resolve(scratch, "answers-bad-verdict.json");
    await withReviewServer(answersPath, module, async (base) => {
      const response = await postAnswer(
        base,
        JSON.stringify({ itemId: "song", verdict: "maybe", comment: "x" }),
      );
      expect(response, "the server gave no response to a bad answer").not.toBeNull();
      expect(response?.status, "the answer path takes an answer with a bad verdict").toBe(400);
      expect(response?.text, "the refusal names no verdict").toContain("pass or fail");
      expect(answerLines(answersPath), "the bad answer was written").toEqual([]);
    });
  });

  it("refuses an oversized answer body", async () => {
    const module = await loadReviewServer();
    const answersPath = resolve(scratch, "answers-oversized.json");
    await withReviewServer(answersPath, module, async (base) => {
      const body = JSON.stringify({ itemId: "song", verdict: "pass", comment: "x".repeat(70000) });
      const response = await postAnswer(base, body);
      if (response !== null) {
        expect(response.status, "the answer path takes an oversized body").toBe(400);
      }
      expect(answerLines(answersPath), "the oversized answer was written").toEqual([]);
    });
  });

  it("kills an answer path whose body limit is raised (mutant)", async () => {
    const mutantPath = writeMutant(REVIEW_SERVER_PATH, "answer-big-limit", [
      { from: "readBody(request, 64 * 1024)", to: "readBody(request, 64 * 1024 * 1024)" },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const answersPath = resolve(scratch, "answers-mutant-big.json");
    await withReviewServer(answersPath, mutant, async (base) => {
      const body = JSON.stringify({ itemId: "song", verdict: "pass", comment: "x".repeat(70000) });
      await postAnswer(base, body);
      expect(
        answerLines(answersPath).length,
        "the check does not kill its mutant: the raised limit still refuses the oversized body",
      ).toBe(1);
    });
  });

  it("stores an answer with an HTML comment verbatim as one JSON line", async () => {
    const module = await loadReviewServer();
    const answersPath = resolve(scratch, "answers-html-comment.json");
    const comment = "<!-- <script>alert(1)</script> -->";
    await withReviewServer(answersPath, module, async (base) => {
      const response = await postAnswer(
        base,
        JSON.stringify({ itemId: "song", verdict: "fail", comment }),
      );
      expect(response?.status, "the answer path refuses an answer with an HTML comment").toBe(204);
    });
    const lines = answerLines(answersPath);
    expect(lines.length, "the answers file holds other than one answer").toBe(1);
    expect(lines[0], "the stored line holds a raw newline").not.toMatch(/[\r\n]/);
    const stored = JSON.parse(lines[0] ?? "") as {
      itemId?: string;
      verdict?: string;
      comment?: string;
      answeredAt?: string;
      commit?: string;
    };
    expect(stored.itemId, "the stored answer names another item").toBe("song");
    expect(stored.verdict, "the stored answer holds another verdict").toBe("fail");
    expect(stored.comment, "the stored answer holds another comment").toBe(comment);
    expect(stored.answeredAt, "the stored answer holds no time").toBeTruthy();
    expect(stored.commit, "the stored answer holds no commit").toBe("adversarial-test");
  });

  it("kills an answer write path that does not write JSON (mutant)", async () => {
    const mutantPath = writeMutant(REVIEW_SERVER_PATH, "answer-plain-line", [
      {
        from: `  const line = JSON.stringify({
    itemId: answer.itemId,
    verdict: answer.verdict,
    comment: answer.comment,
    answeredAt: answer.answeredAt ?? new Date().toISOString(),
    ...(answer.commit === undefined ? {} : { commit: answer.commit }),
  });`,
        to: "  const line = `${answer.itemId} ${answer.verdict} ${answer.comment}`;",
      },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const append = functionOf(mutant, "appendReviewAnswer") as (path: string, answer: unknown) => void;
    const answersPath = resolve(scratch, "answers-mutant-plain.json");
    append(answersPath, {
      itemId: "song",
      verdict: "fail",
      comment: "<!-- <script>alert(1)</script> -->",
    });
    const lines = answerLines(answersPath);
    expect(lines.length, "the mutant write path holds no line").toBe(1);
    let parses = false;
    try {
      JSON.parse(lines[0] ?? "");
      parses = true;
    } catch {
      parses = false;
    }
    expect(
      parses,
      "the check does not kill its mutant: the plain-text line parses as JSON",
    ).toBe(false);
  });
});

describe("Phase 5 adversarial sign-in note: inside an item block, and repeated", () => {
  it("passes the sign-in note check on the production page", async () => {
    const module = await loadReviewServer();
    const render = functionOf(module, "renderReviewPage") as () => string;
    const page = render();
    expect(page.length, "the review page holds no text (A4)").toBeGreaterThan(0);
    const violations = signinViolations(page);
    expect(
      violations,
      `the production page fails the sign-in note check: ${violations.join("; ")}`,
    ).toEqual([]);
  });

  it("kills a page with the sign-in note inside an item block (mutant)", async () => {
    const mutantPath = writeMutant(REVIEW_SERVER_PATH, "note-inside-item", [
      { from: "data-review-signin-all>Sign in once", to: "data-review-signin-note>Sign in once" },
      {
        from: "data-review-signin>Sign in at",
        to: "data-review-signin data-review-signin-all>Sign in at",
      },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const render = functionOf(mutant, "renderReviewPage") as () => string;
    const violations = signinViolations(render());
    expect(
      violations.length,
      "the check does not kill its mutant: the note inside the item block passes",
    ).toBeGreaterThan(0);
  });

  it("kills a page with the sign-in note repeated (mutant)", async () => {
    const noteLine =
      '    <p class="signin" data-review-signin-all>Sign in once at /th/sign-in with the teacher account that the orchestrator gives: one sign-in opens all five items.</p>';
    const mutantPath = writeMutant(REVIEW_SERVER_PATH, "note-repeated", [
      { from: noteLine, to: `${noteLine}\n${noteLine}` },
    ]);
    const mutant = await loadModulePath(mutantPath);
    const render = functionOf(mutant, "renderReviewPage") as () => string;
    const violations = signinViolations(render());
    expect(
      violations.length,
      "the check does not kill its mutant: the repeated note passes",
    ).toBeGreaterThan(0);
  });
});

describe("Phase 5 adversarial launch plan: the forbidden ports and the password file", () => {
  it("refuses the ports 3005 and 3099, and the ports outside 1024 to 65535", async () => {
    const module = await loadLaunch();
    const plan = functionOf(module, "planLaunch") as (options: LaunchOptions) => unknown;
    for (const port of [3005, 3099]) {
      expect(() => plan({ ...LAUNCH_OPTIONS, port }), `the plan takes the port ${port}`).toThrow(
        /port/i,
      );
    }
    const server = await loadReviewServer();
    const checkedPort = functionOf(server, "checkedPort") as (port: number) => number;
    expect(() => checkedPort(1023), "the port 1023 passes").toThrow();
    expect(() => checkedPort(65536), "the port 65536 passes").toThrow();
    expect(checkedPort(1024), "the port 1024 fails").toBe(1024);
    expect(checkedPort(65535), "the port 65535 fails").toBe(65535);
  });

  it("kills a launch plan that accepts the port 3005 (mutant)", async () => {
    writeMutant(REVIEW_SERVER_PATH, "launch-any-port/review-server", [
      { from: "  if ((FORBIDDEN_PORTS as readonly number[]).includes(port)) {", to: "  if (false) {" },
    ]);
    const launchCopy = writeMutant(LAUNCH_PATH, "launch-any-port/launch-review-copy", []);
    const mutant = await loadModulePath(launchCopy);
    const plan = functionOf(mutant, "planLaunch") as (options: LaunchOptions) => unknown;
    let threw = false;
    try {
      plan({ ...LAUNCH_OPTIONS, port: 3005 });
    } catch {
      threw = true;
    }
    expect(
      threw,
      "the check does not kill its mutant: the port-free plan still refuses the port 3005",
    ).toBe(false);
  });

  it("refuses a password file that is the log file, also through a parent segment", async () => {
    const module = await loadLaunch();
    const plan = functionOf(module, "planLaunch") as (options: LaunchOptions) => unknown;
    expect(
      () => plan({ ...LAUNCH_OPTIONS, passwordFile: LAUNCH_OPTIONS.logFile }),
      "the plan puts the password file in the log file",
    ).toThrow();
    expect(
      () =>
        plan({
          ...LAUNCH_OPTIONS,
          passwordFile: "/tmp/storytime-review/child/../servers.log",
        }),
      "the plan puts the password file in the log file through a parent segment",
    ).toThrow();
  });

  it("kills a launch plan that puts the password file in the log file (mutant)", async () => {
    writeMutant(REVIEW_SERVER_PATH, "launch-password-in-log/review-server", []);
    const launchCopy = writeMutant(LAUNCH_PATH, "launch-password-in-log/launch-review-copy", [
      {
        from: "  if (resolve(options.passwordFile) === resolve(options.logFile)) {",
        to: "  if (false) {",
      },
    ]);
    const mutant = await loadModulePath(launchCopy);
    const plan = functionOf(mutant, "planLaunch") as (options: LaunchOptions) => unknown;
    let threw = false;
    try {
      plan({ ...LAUNCH_OPTIONS, passwordFile: LAUNCH_OPTIONS.logFile });
    } catch {
      threw = true;
    }
    expect(
      threw,
      "the check does not kill its mutant: the plan without the password rule still refuses the log file",
    ).toBe(false);
  });
});
