// @vitest-environment node
// Phase 5 red test for plan task 5.3, part 2: the word-edge measurement script.
//
// The script lives in `apps/storytime/scripts/checks/word-edges.ts`. This file is the contract.
//
// Contract of `word-edges.ts`:
//   - It exports `parseEdgeEnergy(text)`. The text is the ffmpeg astats summary of one edge
//     window. The function returns the peak level of that window in dBFS. A window with no
//     sound gives a level of negative infinity.
//   - It exports `main(argv)`. The argv holds `--file <path>`, `--start <seconds>`, and
//     `--end <seconds>`. The script measures the 10 ms window at the start of the cut and the
//     10 ms window at the end of the cut.
//   - The script prints `edge_dbfs=<n>`, which is the louder of the two edge levels.
//   - The script returns 0 when both edges are quiet, that is, at or below -40 dBFS. It
//     returns a non-zero code when an edge carries sound.
//   - Run as a program, the script exits with the code that `main` returns.
//
// Rule 10.2 holds when a word cut starts and ends in silence. The end of a word comes from the
// energy drop, never from the start of the next word, so a cut whose edge carries sound is a
// bad cut.
//
// Every case proves that the script fails its broken copy. A check that cannot fail is a
// defect, so the good cut, the broken copy, and the parser control sit in one file. The broken
// copy is made in a temporary folder from a real file with one change, and the folder is removed
// when the file ends.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(app, "../..");

/** The hand-off package that holds the milestone media (test strategy P5.9). */
const MEDIA_ROOT = resolve(homedir(), "Desktop/handoff/w01-storytime-app-package-r4");

/** The level at or below which an edge counts as quiet, in dBFS. */
const QUIET_EDGE_DBFS = -40;

/** The length of the window that measures one edge, in seconds. */
const EDGE_WINDOW_SECONDS = 0.01;

/** The folder that holds the broken copy. The file removes it when it ends. */
const scratch = mkdtempSync(resolve(tmpdir(), "storytime-phase5-edges-"));

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
 * Runs ffmpeg on one window of a file and gives the astats summary.
 * @param file The file to read.
 * @param start The start of the window in seconds.
 * @param duration The length of the window in seconds.
 * @returns The ffmpeg output.
 */
function windowText(file: string, start: number, duration: number): string {
  const run = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-ss", String(start), "-t", String(duration), "-i", file, "-af", "astats=metadata=0:reset=0", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  return `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
}

/**
 * Reads the peak level of one window from the astats summary.
 * @param text The ffmpeg output.
 * @returns The peak level in dBFS. A window with no sound gives negative infinity.
 */
function peakOf(text: string): number {
  const found = [...text.matchAll(/Peak level dB:\s*(-?inf|-?[0-9.]+)/g)];
  expect(found.length, "the ffmpeg astats output holds no peak level").toBeGreaterThan(0);
  const raw = found[found.length - 1]?.[1] ?? "";
  return raw === "-inf" ? Number.NEGATIVE_INFINITY : Number(raw);
}

/**
 * Measures the peak level of the start edge and of the end edge of one cut.
 * @param file The file that holds the cut.
 * @param start The start of the cut in seconds.
 * @param end The end of the cut in seconds.
 * @returns The start edge level and the end edge level in dBFS.
 */
function measureEdges(file: string, start: number, end: number): { start: number; end: number } {
  return {
    start: peakOf(windowText(file, start, EDGE_WINDOW_SECONDS)),
    end: peakOf(windowText(file, Math.max(start, end - EDGE_WINDOW_SECONDS), EDGE_WINDOW_SECONDS)),
  };
}

/**
 * Reads one export of a check script.
 *
 * The script reads the export by name, so a missing export fails with a clear message and not
 * with a load error.
 * @param name The name of the script file without the extension.
 * @returns The exports of the script.
 */
async function loadScript(name: string): Promise<Record<string, unknown>> {
  const path = resolve(app, "scripts", "checks", `${name}.ts`);
  expect(existsSync(path), `Missing ${path}`).toBe(true);
  const module = (await import(/* @vite-ignore */ new URL(`file://${path}`).href)) as Record<
    string,
    unknown
  >;
  return module;
}

/**
 * Reads one function of a check script.
 * @param script The exports of the script.
 * @param name The name of the export.
 * @returns The function.
 */
function functionOf(script: Record<string, unknown>, name: string): (...args: unknown[]) => unknown {
  const value = script[name];
  expect(typeof value, `the check script has no function ${name}`).toBe("function");
  return value as (...args: unknown[]) => unknown;
}

/**
 * Runs the main function of a check script and gives its exit code and its output.
 * @param script The exports of the script.
 * @param file The file that holds the cut.
 * @param start The start of the cut in seconds.
 * @param end The end of the cut in seconds.
 * @returns The exit code and the printed text.
 */
function runMain(
  script: Record<string, unknown>,
  file: string,
  start: number,
  end: number,
): { code: number; output: string } {
  const main = functionOf(script, "main");
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
    code = Number(main(["--file", file, "--start", String(start), "--end", String(end)]));
  } finally {
    log.mockRestore();
    write.mockRestore();
  }
  return { code, output: lines.join("\n") };
}

/**
 * Reads one labeled number of the output of a check script.
 * @param output The printed text.
 * @param label The label, for example `edge_dbfs`.
 * @returns The number.
 */
function labeled(output: string, label: string): number {
  const found = output.match(new RegExp(`(?:^|\\s)${label}=(-?inf|-?[0-9.]+)(?:\\s|$)`, "m"));
  expect(found, `the check script prints no ${label}`).not.toBeNull();
  const raw = found?.[1] ?? "";
  return raw === "-inf" ? Number.NEGATIVE_INFINITY : Number(raw);
}

describe("Phase 5 stage 1 word edge measurement (rule 10.2)", () => {
  it("names the hand-off package that holds the milestone media", () => {
    expect(existsSync(MEDIA_ROOT), `Missing the hand-off package ${MEDIA_ROOT}`).toBe(true);
  });

  it("parses the ffmpeg astats text with no media folder", async () => {
    const script = await loadScript("word-edges");
    const parse = functionOf(script, "parseEdgeEnergy") as (text: string) => { peakDbfs: number };
    const text = [
      "[Parsed_astats_0 @ 0x1] Overall",
      "[Parsed_astats_0 @ 0x1] Peak level dB: -41.500000",
      "[Parsed_astats_0 @ 0x1] RMS level dB: -50.000000",
    ].join("\n");
    expect(parse(text).peakDbfs, "the parser reads no peak level").toBeCloseTo(-41.5, 5);
  });

  it("passes a real word cut whose two edges are quiet", async () => {
    const script = await loadScript("word-edges");
    const file = media("l2/media/w01/words/wa-net.mp3");
    expect(existsSync(file), `Missing ${file}`).toBe(true);
    const edges = measureEdges(file, 0, 0.841344);
    expect(edges.start, "the real word cut has sound at its start edge").toBeLessThanOrEqual(
      QUIET_EDGE_DBFS,
    );
    expect(edges.end, "the real word cut has sound at its end edge").toBeLessThanOrEqual(QUIET_EDGE_DBFS);
    const run = runMain(script, file, 0, 0.841344);
    expect(labeled(run.output, "edge_dbfs"), "the script prints no edge level").toBeLessThanOrEqual(
      QUIET_EDGE_DBFS,
    );
    expect(run.code, "the script fails a cut whose two edges are quiet").toBe(0);
  });

  it("fails a broken copy whose cut starts inside a word", async () => {
    const script = await loadScript("word-edges");
    const source = media("l2/media/w01/words/wa-net.mp3");
    const copy = resolve(scratch, "cut-inside-a-word.mp3");
    const run = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-v", "error", "-y", "-ss", "0.2", "-t", "0.3", "-i", source, copy],
      { encoding: "utf8" },
    );
    expect(run.status, "the broken copy was not made").toBe(0);
    const edges = measureEdges(copy, 0, 0.3);
    expect(edges.start, "the broken copy has no sound at its start edge").toBeGreaterThan(
      QUIET_EDGE_DBFS,
    );
    const check = runMain(script, copy, 0, 0.3);
    expect(labeled(check.output, "edge_dbfs"), "the reported edge does not show the sound").toBeGreaterThan(
      QUIET_EDGE_DBFS,
    );
    expect(check.code, "the script passes a cut that starts inside a word").not.toBe(0);
  });

  it("exits non-zero on the broken copy when the script runs as a program", async () => {
    const script = await loadScript("word-edges");
    const source = media("l2/media/w01/words/wa-net.mp3");
    const copy = resolve(scratch, "program-cut.mp3");
    const run = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-v", "error", "-y", "-ss", "0.2", "-t", "0.3", "-i", source, copy],
      { encoding: "utf8" },
    );
    expect(run.status, "the broken copy was not made").toBe(0);
    const program = spawnSync(
      resolve(repoRoot, "node_modules/.bin/tsx"),
      ["scripts/checks/word-edges.ts", "--file", copy, "--start", "0", "--end", "0.3"],
      { cwd: app, encoding: "utf8" },
    );
    expect(program.status, "the script exits zero on a broken cut").not.toBe(0);
  });
});
