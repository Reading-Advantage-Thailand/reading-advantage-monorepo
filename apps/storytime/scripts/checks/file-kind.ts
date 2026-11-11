#!/usr/bin/env tsx
/**
 * The stage 1 size and kind check of one Storytime media file (AC-10.1).
 *
 * The check reads the content of a file with ffprobe, never the name, so a picture that carries
 * the name of a sound file fails. It finds the kind of the file from the format that ffprobe
 * reports: an image format gives `picture`, an audio format gives `audio`, and a media container
 * gives `video`. It prints `size_bytes=<n>` and `file_kind=<kind>`, and it exits 1 when the size
 * or the kind differs from the expected value. The parse function takes the ffprobe text, so its
 * control needs no media folder.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** The kinds of media that the media list holds. */
export const FILE_KINDS = ["audio", "picture", "video"] as const;

/** The kind of one media file. */
export type FileKind = (typeof FILE_KINDS)[number];

/** The image formats that ffprobe reports for a picture. */
const PICTURE_FORMATS = new Set([
  "image2",
  "image2pipe",
  "jpeg_pipe",
  "png_pipe",
  "webp_pipe",
  "bmp_pipe",
  "tiff_pipe",
  "gif",
  "apng",
  "jpeg",
  "png",
  "webp",
]);

/** The audio formats that ffprobe reports for a sound file. */
const AUDIO_FORMATS = new Set(["mp3", "aac", "wav", "flac", "ogg", "opus", "mp2", "ac3"]);

/** The media containers that ffprobe reports for a video file. */
const VIDEO_FORMATS = new Set(["mp4", "mov", "matroska", "webm", "avi", "mpegts", "3gp", "mj2"]);

/** One file reading of the ffprobe output. */
export interface FileReading {
  /** The format name that ffprobe reports, for example `mp3` or `image2`. */
  formatName: string;
  /** The name of the first codec, for example `mp3` or `mjpeg`. */
  codecName: string;
  /** The size of the file in bytes. */
  sizeBytes: number;
}

/**
 * Parses the ffprobe JSON output of one file.
 * @param text The ffprobe output.
 * @returns The format name, the codec name, and the size in bytes.
 * @throws When the text holds no format name or no size.
 */
export function parseFileKind(text: string): FileReading {
  const parsed = JSON.parse(text) as {
    streams?: Array<{ codec_name?: string }>;
    format?: { format_name?: string; size?: string };
  };
  const formatName = parsed.format?.format_name;
  const size = parsed.format?.size;
  if (formatName === undefined || formatName === "") {
    throw new Error("the ffprobe output holds no format name");
  }
  if (size === undefined) throw new Error("the ffprobe output holds no size");
  return {
    formatName,
    codecName: parsed.streams?.[0]?.codec_name ?? "",
    sizeBytes: Number(size),
  };
}

/**
 * Finds the kind of one file from its format name.
 * @param formatName The format name that ffprobe reports.
 * @returns The kind of the file.
 */
export function kindOf(formatName: string): FileKind {
  const names = formatName.toLowerCase().split(",");
  if (names.some((name) => VIDEO_FORMATS.has(name))) return "video";
  if (names.some((name) => PICTURE_FORMATS.has(name))) return "picture";
  if (names.some((name) => AUDIO_FORMATS.has(name))) return "audio";
  return "video";
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
 * Reads the ffprobe output of one file.
 * @param file The path of the file.
 * @returns The file reading.
 * @throws When ffprobe cannot read the file.
 */
function measureFile(file: string): FileReading {
  const run = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=format_name,size:stream=codec_name",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  return parseFileKind(run.stdout ?? "");
}

/**
 * Runs the size and kind check on one file.
 * @param argv The arguments, which hold `--file <path>`, `--kind <kind>`, and `--size <bytes>`.
 * @returns 0 when the size and the kind match, and 1 when either differs.
 * @throws When an argument is missing, or ffprobe cannot read the file.
 */
export function main(argv: string[]): number {
  const file = valueOf(argv, "--file");
  const expectedKind = valueOf(argv, "--kind");
  const expectedSize = Number(valueOf(argv, "--size"));
  if (!(FILE_KINDS as readonly string[]).includes(expectedKind)) {
    throw new Error(`the arguments name no known kind: ${expectedKind}`);
  }
  if (!Number.isFinite(expectedSize)) throw new Error("the arguments hold no number for --size");
  const reading = measureFile(file);
  const kind = kindOf(reading.formatName);
  const pass = kind === expectedKind && reading.sizeBytes === expectedSize;
  console.log(`size_bytes=${reading.sizeBytes} file_kind=${kind} format=${reading.formatName}`);
  console.log(`${pass ? "pass" : "fail"} ac=10.1 expected_kind=${expectedKind}`);
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
