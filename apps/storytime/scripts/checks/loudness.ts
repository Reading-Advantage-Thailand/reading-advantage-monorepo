#!/usr/bin/env tsx
/**
 * The stage 1 loudness and true-peak check of one Storytime media file (rule 5.2).
 *
 * The check measures the integrated loudness and the true peak of a file with ffmpeg, then
 * compares them with rule 5.2: the integrated loudness sits within 1 LU of -16 LUFS, and the true
 * peak sits at or below -1 dBTP. It prints `loudness_lufs=<n>` and `true_peak_dbtp=<n>`, and it
 * exits 1 when the file fails. The parse function takes the ffmpeg text, so its control needs no
 * media folder. The script reads local files only; it sends nothing to a service.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** The integrated loudness target of rule 5.2, in LUFS. */
export const TARGET_LUFS = -16;

/** The tolerance around the target of rule 5.2, in LU. */
export const TARGET_TOLERANCE_LU = 1;

/** The true peak ceiling of rule 5.2, in dBTP. */
export const TRUE_PEAK_CEILING_DBTP = -1;

/** One loudness reading of a file. */
export interface LoudnessReading {
  /** The integrated loudness in LUFS. */
  integratedLufs: number;
  /** The true peak in dBTP. */
  truePeakDbtp: number;
}

/**
 * Reads one quoted number of the ffmpeg loudnorm JSON summary.
 * @param text The ffmpeg output.
 * @param key The key of the summary, for example `input_i`.
 * @returns The number of the key.
 * @throws When the text holds no value for the key.
 */
function quotedNumber(text: string, key: string): number {
  const found = text.match(new RegExp(`"${key}"\\s*:\\s*"(-?inf|-?[0-9.]+)"`));
  const raw = found?.[1];
  if (raw === undefined) throw new Error(`the loudnorm summary holds no ${key}`);
  return raw === "-inf" ? Number.NEGATIVE_INFINITY : Number(raw);
}

/**
 * Parses the ffmpeg loudnorm JSON summary.
 * @param text The ffmpeg output that holds the JSON summary.
 * @returns The integrated loudness in LUFS and the true peak in dBTP.
 * @throws When the text holds no loudnorm summary.
 */
export function parseLoudness(text: string): LoudnessReading {
  return {
    integratedLufs: quotedNumber(text, "input_i"),
    truePeakDbtp: quotedNumber(text, "input_tp"),
  };
}

/**
 * Gives the value of one named argument.
 * @param argv The arguments of the script.
 * @param name The name of the argument, for example `--file`.
 * @returns The value that follows the name.
 * @throws When the arguments hold no value for the name.
 */
function valueOf(argv: string[], name: string): string {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (value === undefined || value === "") throw new Error(`the arguments hold no ${name} value`);
  return value;
}

/**
 * Formats one level for a printed label.
 * @param value The level in LUFS or dBTP.
 * @returns The level with two decimals, or `-inf` for a silent file.
 */
function labeledNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "-inf";
}

/**
 * Measures the integrated loudness and the true peak of one file.
 * @param file The path of the file.
 * @returns The loudness reading.
 * @throws When ffmpeg cannot read the file.
 */
function measureLoudness(file: string): LoudnessReading {
  const run = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-af",
      "loudnorm=I=-16:TP=-1:print_format=json",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const text = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  return parseLoudness(text);
}

/**
 * Runs the loudness check on one file.
 * @param argv The arguments, which hold `--file <path>`.
 * @returns 0 when the file passes rule 5.2, and 1 when it fails.
 * @throws When the arguments name no file, or ffmpeg cannot measure it.
 */
export function main(argv: string[]): number {
  const reading = measureLoudness(valueOf(argv, "--file"));
  const pass =
    Math.abs(reading.integratedLufs - TARGET_LUFS) <= TARGET_TOLERANCE_LU &&
    reading.truePeakDbtp <= TRUE_PEAK_CEILING_DBTP;
  console.log(
    `loudness_lufs=${labeledNumber(reading.integratedLufs)} ` +
      `true_peak_dbtp=${labeledNumber(reading.truePeakDbtp)}`,
  );
  console.log(`${pass ? "pass" : "fail"} rule=5.2`);
  return pass ? 0 : 1;
}

const invoked = process.argv[1];
if (invoked !== undefined && pathToFileURL(resolve(invoked)).href === import.meta.url) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
