import { access, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import {
  prepareEnglishAnswerSpeechBatch,
  type SpeechPreparationFilePort,
} from "../src/games/speech-preparation-batch.js";
import {
  createFfmpegSpeechAudioValidator,
  createMmxSpeechProvider,
} from "./mmx-speech-provider.js";

const MAX_INPUT_BYTES = 256 * 1024;

interface PreparationArguments {
  inputPath: string;
  outputDirectory: string;
  storagePrefix: string;
}

/** Parses the three required offline command arguments. */
function parseArguments(argv: readonly string[]): PreparationArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key || !value || !["--input", "--output-dir", "--storage-prefix"].includes(key)) {
      throw new Error(
        "Usage: prepare:english-answer-speech --input <file> --output-dir <dir> --storage-prefix <prefix>",
      );
    }
    if (values.has(key)) throw new Error(`Duplicate argument: ${key}`);
    values.set(key, value);
  }
  const inputPath = values.get("--input");
  const outputDirectory = values.get("--output-dir");
  const storagePrefix = values.get("--storage-prefix");
  if (!inputPath || !outputDirectory || !storagePrefix || values.size !== 3) {
    throw new Error(
      "Usage: prepare:english-answer-speech --input <file> --output-dir <dir> --storage-prefix <prefix>",
    );
  }
  return {
    inputPath: resolve(inputPath),
    outputDirectory: resolve(outputDirectory),
    storagePrefix,
  };
}

const nodeFiles: SpeechPreparationFilePort = {
  ensureDirectory: async (path) => mkdir(path, { recursive: true }).then(() => undefined),
  exists: async (path) => access(path).then(() => true, () => false),
  readText: async (path) => readFile(path, "utf8"),
  remove: async (path) => rm(path, { force: true }),
  rename,
  writeText: async (path, value) => writeFile(path, value, "utf8"),
};

/**
 * Runs one explicit offline English answer speech preparation batch.
 * @param argv Command arguments after the script path.
 * @returns A promise that resolves after the draft manifest is written.
 */
export async function runEnglishAnswerSpeechPreparation(argv: readonly string[]): Promise<void> {
  const args = parseArguments(argv);
  const inputStats = await stat(args.inputPath);
  if (!inputStats.isFile() || inputStats.size > MAX_INPUT_BYTES) {
    throw new Error("Vocabulary input must be a file no larger than 256 KiB");
  }
  let input: unknown;
  try {
    input = JSON.parse(await readFile(args.inputPath, "utf8"));
  } catch (cause) {
    throw new Error("Vocabulary input is not valid JSON", { cause });
  }
  const result = await prepareEnglishAnswerSpeechBatch({
    input,
    outputDirectory: args.outputDirectory,
    storagePrefix: args.storagePrefix,
    files: nodeFiles,
    provider: createMmxSpeechProvider(),
    audioValidator: createFfmpegSpeechAudioValidator(),
  });
  process.stdout.write(`${JSON.stringify({
    status: "draft-pronunciation-review-required",
    manifestPath: result.manifestPath,
    generatedClipCount: result.generatedClipCount,
    reusedClipCount: result.reusedClipCount,
    duplicateTermCount: result.duplicateTermCount,
  })}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  runEnglishAnswerSpeechPreparation(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Speech preparation failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
