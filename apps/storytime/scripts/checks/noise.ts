#!/usr/bin/env tsx
/**
 * The stage 1 noise-floor and clipping check of one Storytime media file (rule 5.3).
 *
 * The check measures the noise floor and the peak level of a file with ffmpeg, then compares them
 * with rule 5.3: the noise floor sits below -60 dBFS, and no sample reaches full scale. It prints
 * `noise_floor_dbfs=<n>` and `clipped=<0|1>`, and it exits 1 when the file fails. The parse
 * function takes the ffmpeg text, so its control needs no media folder.
 *
 * The script does not judge the bitrate. The media list holds the bitrate deviation, and the
 * orchestrator decided that the bitrate check applies to new production files only.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** The noise floor ceiling of rule 5.3, in dBFS. */
export const NOISE_FLOOR_CEILING_DBFS = -60;

/** The peak level at which a sample counts as clipped, in dBFS. */
export const CLIP_LEVEL_DBFS = 0;

/** One noise reading of a file. */
export interface NoiseReading {
  /** The noise floor in dBFS. */
  noiseFloorDbfs: number;
  /** The peak level in dBFS. */
  peakDbfs: number;
}

/**
 * Reads the last value of one astats label.
 * @param text The ffmpeg astats summary.
 * @param label The astats label, for example `Noise floor dB`.
 * @returns The value of the last section that holds the label.
 * @throws When the text holds no value for the label.
 */
function lastLevel(text: string, label: string): number {
  const found = [...text.matchAll(new RegExp(`${label}:\\s*(-?inf|-?[0-9.]+)`, "g"))];
  const raw = found.at(-1)?.[1];
  if (raw === undefined) throw new Error(`the astats summary holds no ${label}`);
  return raw === "-inf" ? Number.NEGATIVE_INFINITY : Number(raw);
}

/**
 * Parses the ffmpeg astats summary.
 * @param text The ffmpeg output that holds the astats summary.
 * @returns The noise floor in dBFS and the peak level in dBFS.
 * @throws When the text holds no astats summary.
 */
export function parseNoise(text: string): NoiseReading {
  return {
    noiseFloorDbfs: lastLevel(text, "Noise floor dB"),
    peakDbfs: lastLevel(text, "Peak level dB"),
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
 * @param value The level in dBFS.
 * @returns The level with two decimals, or `-inf` for a silent file.
 */
function labeledNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "-inf";
}

/**
 * Measures the noise floor and the peak level of one file.
 * @param file The path of the file.
 * @returns The noise reading.
 * @throws When ffmpeg cannot read the file.
 */
function measureNoise(file: string): NoiseReading {
  const run = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", file, "-af", "astats=metadata=0:reset=0", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  return parseNoise(`${run.stdout ?? ""}\n${run.stderr ?? ""}`);
}

/**
 * Runs the noise check on one file.
 * @param argv The arguments, which hold `--file <path>`.
 * @returns 0 when the file passes rule 5.3, and 1 when it fails.
 * @throws When the arguments name no file, or ffmpeg cannot measure it.
 */
export function main(argv: string[]): number {
  const reading = measureNoise(valueOf(argv, "--file"));
  const clipped = reading.peakDbfs > CLIP_LEVEL_DBFS ? 1 : 0;
  const pass = reading.noiseFloorDbfs < NOISE_FLOOR_CEILING_DBFS && clipped === 0;
  console.log(
    `noise_floor_dbfs=${labeledNumber(reading.noiseFloorDbfs)} ` +
      `peak_dbfs=${labeledNumber(reading.peakDbfs)} clipped=${clipped}`,
  );
  console.log(`${pass ? "pass" : "fail"} rule=5.3`);
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
