#!/usr/bin/env tsx
/**
 * The stage 1 word-edge check of one Storytime word cut (rule 10.2).
 *
 * A word cut must start and end in silence. The check measures the 10 ms window at the start of
 * the cut and the 10 ms window at the end of the cut with ffmpeg, then takes the louder of the two
 * peaks. It prints `edge_dbfs=<n>`, and it exits 1 when an edge carries sound above -40 dBFS. The
 * end of a word comes from the energy drop, never from the start of the next word, so a cut whose
 * edge carries sound is a bad cut. The parse function takes the ffmpeg text, so its control needs
 * no media folder.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** The level at or below which an edge counts as quiet, in dBFS. */
export const QUIET_EDGE_DBFS = -40;

/** The length of the window that measures one edge, in seconds. */
export const EDGE_WINDOW_SECONDS = 0.01;

/** One edge reading of a window. */
export interface EdgeReading {
  /** The peak level of the window in dBFS. */
  peakDbfs: number;
}

/**
 * Reads the last peak level of the ffmpeg astats summary.
 * @param text The ffmpeg output.
 * @returns The peak level of the window in dBFS, or negative infinity for a silent window.
 * @throws When the text holds no peak level.
 */
export function parseEdgeEnergy(text: string): EdgeReading {
  const found = [...text.matchAll(/Peak level dB:\s*(-?inf|-?[0-9.]+)/g)];
  const raw = found.at(-1)?.[1];
  if (raw === undefined) throw new Error("the astats summary holds no peak level");
  return { peakDbfs: raw === "-inf" ? Number.NEGATIVE_INFINITY : Number(raw) };
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
 * Gives one argument as a number of seconds.
 * @param argv The arguments of the script.
 * @param name The name of the argument, for example `--start`.
 * @returns The number of seconds.
 * @throws When the arguments hold no number for the name.
 */
function secondsOf(argv: string[], name: string): number {
  const value = Number(valueOf(argv, name));
  if (!Number.isFinite(value)) throw new Error(`the arguments hold no number for ${name}`);
  return value;
}

/**
 * Formats one level for a printed label.
 * @param value The level in dBFS.
 * @returns The level with two decimals, or `-inf` for a silent window.
 */
function labeledNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "-inf";
}

/**
 * Measures the peak level of one window of a file.
 * @param file The path of the file.
 * @param start The start of the window in seconds.
 * @param duration The length of the window in seconds.
 * @returns The peak level of the window in dBFS.
 * @throws When ffmpeg cannot read the file.
 */
function windowPeak(file: string, start: number, duration: number): number {
  const run = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-ss",
      String(start),
      "-t",
      String(duration),
      "-i",
      file,
      "-af",
      "astats=metadata=0:reset=0",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  return parseEdgeEnergy(`${run.stdout ?? ""}\n${run.stderr ?? ""}`).peakDbfs;
}

/**
 * Runs the word-edge check on one cut.
 * @param argv The arguments, which hold `--file <path>`, `--start <seconds>`, and `--end <seconds>`.
 * @returns 0 when both edges are quiet, and 1 when an edge carries sound.
 * @throws When the arguments name no file, or ffmpeg cannot measure it.
 */
export function main(argv: string[]): number {
  const file = valueOf(argv, "--file");
  const start = secondsOf(argv, "--start");
  const end = secondsOf(argv, "--end");
  const startPeak = windowPeak(file, start, EDGE_WINDOW_SECONDS);
  const endPeak = windowPeak(file, Math.max(start, end - EDGE_WINDOW_SECONDS), EDGE_WINDOW_SECONDS);
  const edgeDbfs = Math.max(startPeak, endPeak);
  const pass = edgeDbfs <= QUIET_EDGE_DBFS;
  console.log(
    `edge_dbfs=${labeledNumber(edgeDbfs)} ` +
      `start_edge_dbfs=${labeledNumber(startPeak)} ` +
      `end_edge_dbfs=${labeledNumber(endPeak)}`,
  );
  console.log(`${pass ? "pass" : "fail"} rule=10.2`);
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
