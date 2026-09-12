import { execFile } from "node:child_process";

import type {
  SpeechPreparationAudioValidator,
  SpeechPreparationProvider,
  SpeechPreparationProviderRequest,
} from "../src/games/speech-preparation-batch.js";

const DECODED_AUDIO_LIMIT_BYTES = 256 * 1024;

/** Bounded process settings for one MMX call. */
export interface SpeechProcessOptions {
  /** Disables command shell parsing. */
  readonly shell: false;
  /** Maximum process duration. */
  readonly timeoutMs: number;
}

/** Safe argv process boundary used by the MMX adapter. */
export type SpeechProcessRunner = (
  executable: string,
  args: readonly string[],
  options: SpeechProcessOptions,
) => Promise<void>;

/**
 * Runs one executable with argv and without shell parsing.
 * @param executable Exact executable name or path.
 * @param args Separate process arguments.
 * @param options Shell and timeout controls.
 * @returns A promise that resolves after a successful process exit.
 */
export function runSpeechProcess(
  executable: string,
  args: readonly string[],
  options: SpeechProcessOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      [...args],
      {
        shell: options.shell,
        timeout: options.timeoutMs,
        maxBuffer: 64 * 1024,
        windowsHide: true,
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

/** Safe binary process boundary used by the local decoder adapter. */
export type SpeechDecodeProcessRunner = (
  executable: string,
  args: readonly string[],
  options: SpeechProcessOptions,
) => Promise<Uint8Array>;

/**
 * Runs one decoder with argv and captures one bounded decoded audio frame.
 * @param executable Exact executable name or path.
 * @param args Separate process arguments.
 * @param options Shell and timeout controls.
 * @returns Decoded audio bytes from standard output.
 */
export function runSpeechDecodeProcess(
  executable: string,
  args: readonly string[],
  options: SpeechProcessOptions,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      [...args],
      {
        encoding: "buffer",
        shell: options.shell,
        timeout: options.timeoutMs,
        maxBuffer: DECODED_AUDIO_LIMIT_BYTES,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(new Uint8Array(stdout));
      },
    );
  });
}

/** Options for the fixed reviewed MMX speech adapter. */
export interface MmxSpeechProviderOptions {
  /** Injected process runner for tests. */
  readonly run?: SpeechProcessRunner;
  /** MMX executable name or absolute path. */
  readonly executable?: string;
}

/** Builds the fixed MMX argv list for one reviewed request. */
function mmxArguments(request: SpeechPreparationProviderRequest): string[] {
  return [
    "--quiet",
    "--output", "json",
    "speech", "synthesize",
    "--text", request.text,
    "--out", request.outputPath,
    "--voice", request.voice,
    "--model", request.model,
    "--speed", request.speed.toString(),
    "--language", request.language,
    "--format", request.format,
  ];
}

/**
 * Creates the MiniMax CLI adapter for offline speech preparation.
 * @param options Optional executable and injected process runner.
 * @returns A provider that invokes MMX through separate argv values.
 */
export function createMmxSpeechProvider(
  options: MmxSpeechProviderOptions = {},
): SpeechPreparationProvider {
  const run = options.run ?? runSpeechProcess;
  const executable = options.executable ?? "mmx";
  return Object.freeze({
    async synthesize(request: SpeechPreparationProviderRequest): Promise<void> {
      try {
        await run(executable, mmxArguments(request), { shell: false, timeoutMs: 90_000 });
      } catch (cause) {
        throw new Error("MMX speech generation failed", { cause });
      }
    },
  });
}

/** Options for the bounded FFmpeg audio validator. */
export interface FfmpegSpeechAudioValidatorOptions {
  /** Injected decoder process runner for tests. */
  readonly run?: SpeechDecodeProcessRunner;
  /** FFmpeg executable name or absolute path. */
  readonly executable?: string;
}

/**
 * Creates a validator that decodes one audio frame with FFmpeg.
 * @param options Optional executable and injected process runner.
 * @returns A validator that accepts only files with decoded audio bytes.
 * @throws When FFmpeg is not installed.
 */
export function createFfmpegSpeechAudioValidator(
  options: FfmpegSpeechAudioValidatorOptions = {},
): SpeechPreparationAudioValidator {
  const run = options.run ?? runSpeechDecodeProcess;
  const executable = options.executable ?? "ffmpeg";
  return Object.freeze({
    async validate(path: string): Promise<boolean> {
      try {
        const decoded = await run(executable, [
          "-v", "error",
          "-xerror",
          "-i", path,
          "-map", "0:a:0",
          "-frames:a", "1",
          "-f", "s16le",
          "-acodec", "pcm_s16le",
          "-",
        ], { shell: false, timeoutMs: 10_000 });
        return decoded.byteLength > 0;
      } catch (cause) {
        if (
          typeof cause === "object"
          && cause !== null
          && "code" in cause
          && cause.code === "ENOENT"
        ) {
          throw new Error("FFmpeg is required to validate prepared speech audio", { cause });
        }
        return false;
      }
    },
  });
}
