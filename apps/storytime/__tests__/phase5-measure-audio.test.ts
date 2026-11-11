// @vitest-environment node
// Phase 5 red test for plan task 5.3, part 1: the stage 1 audio measurement scripts.
//
// The scripts live in `apps/storytime/scripts/checks/`. This file is the contract.
//
// Contract of `loudness.ts`:
//   - It exports `parseLoudness(text)`. The text is the ffmpeg loudnorm summary. The function
//     returns the integrated loudness in LUFS and the true peak in dBTP.
//   - It exports `main(argv)`. The argv holds `--file <path>`. The function prints
//     `loudness_lufs=<n>` and `true_peak_dbtp=<n>`, and returns 0 when the file passes
//     rule 5.2, or a non-zero code when the file fails.
//   - Rule 5.2 holds when the integrated loudness is within 1 LU of -16 LUFS and the true peak
//     is at or below -1 dBTP.
//
// Contract of `noise.ts`:
//   - It exports `parseNoise(text)`. The text is the ffmpeg astats summary. The function returns
//     the noise floor in dBFS and the peak level in dBFS.
//   - It exports `main(argv)`. The argv holds `--file <path>`. The function prints
//     `noise_floor_dbfs=<n>` and `clipped=<0|1>`, and returns 0 when the file passes rule 5.3,
//     or a non-zero code when the file fails.
//   - Rule 5.3 holds when the noise floor is below -60 dBFS and no sample reaches full scale.
//   - The script does not judge the bitrate. The media list holds the bitrate deviation, and
//     the orchestrator decided that the bitrate check applies to new production files only.
//
// Every case proves that the script fails its broken copy. A check that cannot fail is a defect,
// so the good file, the broken copy, and the parser control sit in one file. The broken copies
// are made in a temporary folder from a real file, one change each, and the folder is removed
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

/** The rule 5.2 loudness target in LUFS. */
const TARGET_LUFS = -16;

/** The rule 5.2 tolerance in LU. */
const TARGET_TOLERANCE_LU = 1;

/** The rule 5.2 true peak ceiling in dBTP. */
const TRUE_PEAK_CEILING_DBTP = -1;

/** The rule 5.3 noise floor ceiling in dBFS. */
const NOISE_FLOOR_CEILING_DBFS = -60;

/** The folder that holds the broken copies. The file removes it when it ends. */
const scratch = mkdtempSync(resolve(tmpdir(), "storytime-phase5-audio-"));

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
 * Measures the integrated loudness and the true peak of a file.
 * @param file The file to measure.
 * @returns The integrated loudness in LUFS and the true peak in dBTP.
 */
function measureLoudness(file: string): { lufs: number; truePeak: number } {
  const text = ffmpegText([
    "-i",
    file,
    "-af",
    "loudnorm=I=-16:TP=-1:print_format=json",
    "-f",
    "null",
    "-",
  ]);
  return {
    lufs: loudnormNumber(text, "input_i"),
    truePeak: loudnormNumber(text, "input_tp"),
  };
}

/**
 * Reads one number of the ffmpeg astats output.
 * @param text The ffmpeg output.
 * @param label The astats label, for example `Noise floor dB`.
 * @returns The number.
 */
function astatsNumber(text: string, label: string): number {
  const found = [...text.matchAll(new RegExp(`${label}:\\s*(-?[0-9.]+)`, "g"))];
  expect(found.length, `the ffmpeg astats output holds no ${label}`).toBeGreaterThan(0);
  return Number(found[found.length - 1]?.[1]);
}

/**
 * Measures the noise floor and the peak level of a file.
 * @param file The file to measure.
 * @returns The noise floor in dBFS and the peak level in dBFS.
 */
function measureNoise(file: string): { noiseFloor: number; peak: number } {
  const text = ffmpegText(["-i", file, "-af", "astats=metadata=0:reset=0", "-f", "null", "-"]);
  return {
    noiseFloor: astatsNumber(text, "Noise floor dB"),
    peak: astatsNumber(text, "Peak level dB"),
  };
}

/**
 * Makes a copy of a real file that sits at a chosen loudness.
 *
 * The copy goes into the temporary folder. The function measures the copy and corrects the
 * gain, because the mp3 encoder moves the loudness a little.
 * @param source The real file to copy.
 * @param name The name of the copy inside the temporary folder.
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
    lufs = measureLoudness(path).lufs;
    gain = targetLufs - lufs;
    if (Math.abs(targetLufs - lufs) <= 0.2) break;
  }
  return { path, lufs };
}

/**
 * Makes a copy of a real file with one change, so the copy breaks one rule.
 * @param source The real file to copy.
 * @param name The name of the copy inside the temporary folder.
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
 * @param file The file to check.
 * @returns The exit code and the printed text.
 */
function runMain(script: Record<string, unknown>, file: string): { code: number; output: string } {
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
    code = Number(main(["--file", file]));
  } finally {
    log.mockRestore();
    write.mockRestore();
  }
  return { code, output: lines.join("\n") };
}

/**
 * Reads one labeled number of the output of a check script.
 * @param output The printed text.
 * @param label The label, for example `loudness_lufs`.
 * @returns The number.
 */
function labeled(output: string, label: string): number {
  const found = output.match(new RegExp(`(?:^|\\s)${label}=(-?[0-9.]+)(?:\\s|$)`, "m"));
  expect(found, `the check script prints no ${label}`).not.toBeNull();
  return Number(found?.[1]);
}

/**
 * Reads one labeled count of the output of a check script.
 * @param output The printed text.
 * @param label The label, for example `clipped`.
 * @returns The count.
 */
function labeledCount(output: string, label: string): number {
  const found = output.match(new RegExp(`(?:^|\\s)${label}=([0-9]+)(?:\\s|$)`, "m"));
  expect(found, `the check script prints no ${label}`).not.toBeNull();
  return Number(found?.[1]);
}

describe("Phase 5 stage 1 audio measurement (rules 5.2 and 5.3)", () => {
  it("names the hand-off package that holds the milestone media", () => {
    expect(existsSync(MEDIA_ROOT), `Missing the hand-off package ${MEDIA_ROOT}`).toBe(true);
  });

  it("parses the ffmpeg loudnorm text with no media folder", async () => {
    const script = await loadScript("loudness");
    const parse = functionOf(script, "parseLoudness") as (
      text: string,
    ) => { integratedLufs: number; truePeakDbtp: number };
    const text = [
      "{",
      '\t"input_i" : "-16.000",',
      '\t"input_tp" : "-1.500",',
      '\t"input_lra" : "1.900",',
      "\t}",
    ].join("\n");
    const parsed = parse(text);
    expect(parsed.integratedLufs, "the parser reads no integrated loudness").toBeCloseTo(-16, 3);
    expect(parsed.truePeakDbtp, "the parser reads no true peak").toBeCloseTo(-1.5, 3);
  });

  it("parses the ffmpeg astats text with no media folder", async () => {
    const script = await loadScript("noise");
    const parse = functionOf(script, "parseNoise") as (
      text: string,
    ) => { noiseFloorDbfs: number; peakDbfs: number };
    const text = [
      "[Parsed_astats_0 @ 0x1] Overall",
      "[Parsed_astats_0 @ 0x1] Peak level dB: -3.416281",
      "[Parsed_astats_0 @ 0x1] RMS level dB: -20.973880",
      "[Parsed_astats_0 @ 0x1] Noise floor dB: -70.142074",
    ].join("\n");
    const parsed = parse(text);
    expect(parsed.noiseFloorDbfs, "the parser reads no noise floor").toBeCloseTo(-70.142074, 5);
    expect(parsed.peakDbfs, "the parser reads no peak level").toBeCloseTo(-3.416281, 5);
  });

  it("measures the real book audio and reports its loudness and true peak", async () => {
    const script = await loadScript("loudness");
    const file = media("l2/media/w01/books/1-hello.mp3");
    expect(existsSync(file), `Missing ${file}`).toBe(true);
    const measured = measureLoudness(file);
    const run = runMain(script, file);
    expect(
      Math.abs(labeled(run.output, "loudness_lufs") - measured.lufs),
      "the script reports another loudness than ffmpeg measures",
    ).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(labeled(run.output, "true_peak_dbtp") - measured.truePeak),
      "the script reports another true peak than ffmpeg measures",
    ).toBeLessThanOrEqual(0.5);
  });

  it("passes the real book audio, which sits at the loudness target", async () => {
    const script = await loadScript("loudness");
    const file = media("l2/media/w01/books/1-hello.mp3");
    const measured = measureLoudness(file);
    expect(
      Math.abs(measured.lufs - TARGET_LUFS),
      "the real book audio does not sit at the loudness target",
    ).toBeLessThanOrEqual(TARGET_TOLERANCE_LU);
    expect(measured.truePeak, "the real book audio has no true peak under the ceiling").toBeLessThanOrEqual(
      TRUE_PEAK_CEILING_DBTP,
    );
    const run = runMain(script, file);
    expect(labeled(run.output, "loudness_lufs"), "the script prints no loudness").toBeCloseTo(
      measured.lufs,
      1,
    );
    expect(run.code, "the script fails a file that sits at the loudness target").toBe(0);
  });

  it("fails a copy that sits at -13 LUFS", async () => {
    const script = await loadScript("loudness");
    const copy = copyAtLoudness(media("l2/media/w01/books/1-hello.mp3"), "at-13.mp3", -13);
    expect(Math.abs(copy.lufs + 13), "the copy does not sit at -13 LUFS").toBeLessThanOrEqual(0.6);
    const run = runMain(script, copy.path);
    expect(
      Math.abs(labeled(run.output, "loudness_lufs") - copy.lufs),
      "the script reports another loudness than the copy holds",
    ).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(labeled(run.output, "loudness_lufs") - TARGET_LUFS),
      "the reported loudness does not show the copy is off the target",
    ).toBeGreaterThan(TARGET_TOLERANCE_LU);
    expect(run.code, "the script passes a file that is off the loudness target").not.toBe(0);
  });

  it("exits non-zero on the broken copy when the script runs as a program", async () => {
    const script = await loadScript("loudness");
    const copy = copyAtLoudness(media("l2/media/w01/books/1-hello.mp3"), "program-loud.mp3", -13);
    expect(copy.path, "the broken copy was not made").not.toBe("");
    const run = spawnSync(
      resolve(repoRoot, "node_modules/.bin/tsx"),
      ["scripts/checks/loudness.ts", "--file", copy.path],
      { cwd: app, encoding: "utf8" },
    );
    expect(run.status, "the script exits zero on a broken copy").not.toBe(0);
  });

  it("passes the real word clip, whose noise floor sits below -60 dBFS", async () => {
    const script = await loadScript("noise");
    const file = media("l2/media/w01/words/wa-pip.mp3");
    expect(existsSync(file), `Missing ${file}`).toBe(true);
    const measured = measureNoise(file);
    expect(measured.noiseFloor, "the real word clip has no quiet noise floor").toBeLessThan(
      NOISE_FLOOR_CEILING_DBFS,
    );
    const run = runMain(script, file);
    expect(
      Math.abs(labeled(run.output, "noise_floor_dbfs") - measured.noiseFloor),
      "the script reports another noise floor than ffmpeg measures",
    ).toBeLessThanOrEqual(2);
    expect(labeledCount(run.output, "clipped"), "the script reports a clip in a clean file").toBe(0);
    expect(run.code, "the script fails a file with a quiet noise floor").toBe(0);
  });

  it("fails the hissy phoneme file 04-n.mp3 on its noise floor", async () => {
    const script = await loadScript("noise");
    const file = media("phonemes/daniel/04-n.mp3");
    expect(existsSync(file), `Missing ${file}`).toBe(true);
    const measured = measureNoise(file);
    expect(measured.noiseFloor, "the hissy phoneme file has a quiet noise floor").toBeGreaterThan(
      NOISE_FLOOR_CEILING_DBFS,
    );
    const run = runMain(script, file);
    expect(
      labeled(run.output, "noise_floor_dbfs"),
      "the reported noise floor does not show the file is hissy",
    ).toBeGreaterThan(NOISE_FLOOR_CEILING_DBFS);
    expect(run.code, "the script passes the hissy phoneme file").not.toBe(0);
  });

  it("fails a copy that carries added noise", async () => {
    const script = await loadScript("noise");
    const copy = brokenCopy(
      media("l2/media/w01/words/wa-pip.mp3"),
      "noisy.mp3",
      "anoisesrc=color=pink:amplitude=0.08:duration=1.2,amix=inputs=2:duration=first:dropout_transition=0",
    );
    const measured = measureNoise(copy);
    expect(measured.noiseFloor, "the noisy copy has a quiet noise floor").toBeGreaterThan(
      NOISE_FLOOR_CEILING_DBFS,
    );
    const run = runMain(script, copy);
    expect(
      labeled(run.output, "noise_floor_dbfs"),
      "the reported noise floor does not show the copy is noisy",
    ).toBeGreaterThan(NOISE_FLOOR_CEILING_DBFS);
    expect(run.code, "the script passes a copy with added noise").not.toBe(0);
  });

  it("fails a copy that clips", async () => {
    const script = await loadScript("noise");
    const copy = brokenCopy(media("l2/media/w01/words/wa-pip.mp3"), "clipped.mp3", "volume=12dB");
    const measured = measureNoise(copy);
    expect(measured.peak, "the clipped copy does not reach full scale").toBeGreaterThan(0);
    const run = runMain(script, copy);
    expect(labeledCount(run.output, "clipped"), "the reported clip count does not show the copy clips").toBe(
      1,
    );
    expect(run.code, "the script passes a clipped copy").not.toBe(0);
  });
});
