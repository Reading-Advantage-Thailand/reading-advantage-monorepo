import { join } from "node:path";

import { vocabularyItemSchema } from "@reading-advantage/game-contracts";
import { z } from "zod";

const MAX_BATCH_ITEMS = 50;
const MANIFEST_FILE_NAME = "english-answer-speech-manifest.draft.json";

/** Fixed speech settings from the reviewed public preview. */
export const ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS = Object.freeze({
  sourceLocale: "en-US" as const,
  language: "English" as const,
  voice: "English_expressive_narrator" as const,
  model: "speech-2.8-hd" as const,
  speed: 0.9 as const,
  mediaType: "audio/mpeg" as const,
  format: "mp3" as const,
});

const batchInputSchema = z.array(vocabularyItemSchema).min(1).max(MAX_BATCH_ITEMS)
  .superRefine((items, context) => {
    items.forEach((item, index) => {
      if (!item.term.trim() || item.term !== item.term.trim() || item.term.length > 200) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Speech terms must be trimmed and contain 1 through 200 characters",
          path: [index, "term"],
        });
      }
    });
  });

const storagePrefixSchema = z.string().trim().min(1).max(500).refine(
  (value) => !value.startsWith("/")
    && !value.endsWith("/")
    && !value.split("/").some((segment) => !segment || segment === "." || segment === ".."),
  "Storage prefix must contain safe non-empty path segments",
);

const clipIdentitySchema = z.object({
  schemaVersion: z.literal(1),
  text: z.string(),
  sourceLocale: z.literal("en-US"),
  voice: z.literal("English_expressive_narrator"),
  model: z.literal("speech-2.8-hd"),
  speed: z.literal(0.9),
  language: z.literal("English"),
  format: z.literal("mp3"),
  fileName: z.string(),
}).strict();

type SpeechPreparationClipIdentity = z.infer<typeof clipIdentitySchema>;

/** File operations required by offline speech preparation. */
export interface SpeechPreparationFilePort {
  /** Creates the output directory when needed. */
  ensureDirectory(path: string): Promise<void>;
  /** Reports whether one path exists. */
  exists(path: string): Promise<boolean>;
  /** Reads one UTF-8 text file. */
  readText(path: string): Promise<string>;
  /** Removes one local file when present. */
  remove(path: string): Promise<void>;
  /** Renames one local file atomically. */
  rename(from: string, to: string): Promise<void>;
  /** Writes one UTF-8 text file. */
  writeText(path: string, value: string): Promise<void>;
}

/** One fixed MMX speech request. */
export interface SpeechPreparationProviderRequest {
  /** Exact vocabulary term to synthesize. */
  readonly text: string;
  /** Temporary local output path. */
  readonly outputPath: string;
  /** Reviewed MiniMax voice identifier. */
  readonly voice: typeof ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.voice;
  /** Reviewed MiniMax model identifier. */
  readonly model: typeof ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.model;
  /** Reviewed playback speed. */
  readonly speed: typeof ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.speed;
  /** Reviewed language setting. */
  readonly language: typeof ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.language;
  /** Required local audio format. */
  readonly format: typeof ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.format;
}

/** Provider-neutral speech generator used by offline preparation. */
export interface SpeechPreparationProvider {
  /** Generates one clip at the requested temporary path. */
  synthesize(request: SpeechPreparationProviderRequest): Promise<void>;
}

/** Decoder boundary used to confirm that a local clip contains playable audio. */
export interface SpeechPreparationAudioValidator {
  /** Reports whether a local clip contains nonempty decodable MP3 audio. */
  validate(path: string): Promise<boolean>;
}

/** One exact storage entry in the reviewed runtime manifest shape. */
export interface DraftSpeechManifestClip {
  /** Exact source term. */
  readonly text: string;
  /** Fixed reviewed source locale. */
  readonly sourceLocale: "en-US";
  /** Future storage key for a separately uploaded file. */
  readonly key: string;
  /** Fixed generated audio media type. */
  readonly mediaType: "audio/mpeg";
}

/** Draft manifest accepted by the authenticated runtime resolver. */
export interface DraftSpeechManifest {
  /** Manifest contract version. */
  readonly schemaVersion: 1;
  /** Unique exact term entries in stable input order. */
  readonly clips: readonly DraftSpeechManifestClip[];
}

/** Result from one offline preparation run. */
export interface SpeechPreparationBatchResult {
  /** Local draft manifest path. */
  readonly manifestPath: string;
  /** Draft manifest for later review and configuration. */
  readonly manifest: DraftSpeechManifest;
  /** Number of clips generated during this run. */
  readonly generatedClipCount: number;
  /** Number of validated clips reused during resume. */
  readonly reusedClipCount: number;
  /** Number of repeated exact terms collapsed onto one clip. */
  readonly duplicateTermCount: number;
}

/** Converts one term to a bounded readable filename segment. */
function clipSlug(term: string): string {
  return term.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "term";
}

/** Returns one stable indexed local filename. */
function clipFileName(index: number, term: string): string {
  return `${index.toString().padStart(3, "0")}-${clipSlug(term)}.mp3`;
}

/** Builds the exact identity required to reuse one local clip. */
function clipIdentity(text: string, fileName: string): SpeechPreparationClipIdentity {
  return {
    schemaVersion: 1,
    text,
    sourceLocale: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.sourceLocale,
    voice: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.voice,
    model: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.model,
    speed: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.speed,
    language: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.language,
    format: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.format,
    fileName,
  };
}

/** Reports whether one local sidecar has the required term and settings identity. */
async function hasMatchingIdentity(
  files: SpeechPreparationFilePort,
  path: string,
  expected: SpeechPreparationClipIdentity,
): Promise<boolean> {
  if (!await files.exists(path)) return false;
  try {
    const actual = clipIdentitySchema.parse(JSON.parse(await files.readText(path)));
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return false;
  }
}

/** Reports whether one local clip and sidecar can be reused. */
async function hasReusableClip(
  files: SpeechPreparationFilePort,
  audioValidator: SpeechPreparationAudioValidator,
  clipPath: string,
  identityPath: string,
  identity: SpeechPreparationClipIdentity,
): Promise<boolean> {
  if (!await files.exists(clipPath)) return false;
  if (!await hasMatchingIdentity(files, identityPath, identity)) return false;
  return audioValidator.validate(clipPath);
}

/**
 * Prepares a local English answer speech batch without reading student data.
 * @param args Explicit vocabulary input, local paths, and injected boundaries.
 * @returns A draft manifest and generation counts.
 * @throws When input, file validation, or speech generation fails.
 */
export async function prepareEnglishAnswerSpeechBatch({
  input,
  outputDirectory: outputDirectoryInput,
  storagePrefix: storagePrefixInput,
  files,
  provider,
  audioValidator,
}: {
  input: unknown;
  outputDirectory: string;
  storagePrefix: string;
  files: SpeechPreparationFilePort;
  provider: SpeechPreparationProvider;
  audioValidator: SpeechPreparationAudioValidator;
}): Promise<SpeechPreparationBatchResult> {
  const items = batchInputSchema.parse(input);
  const outputDirectory = z.string().trim().min(1).parse(outputDirectoryInput);
  const storagePrefix = storagePrefixSchema.parse(storagePrefixInput);
  const uniqueTerms = [...new Set(items.map(({ term }) => term))];
  const duplicateTermCount = items.length - uniqueTerms.length;
  await files.ensureDirectory(outputDirectory);

  let generatedClipCount = 0;
  let reusedClipCount = 0;
  const clips: DraftSpeechManifestClip[] = [];
  for (const [index, text] of uniqueTerms.entries()) {
    const fileName = clipFileName(index, text);
    const finalPath = join(outputDirectory, fileName);
    const partialPath = `${finalPath}.partial`;
    const identityPath = `${finalPath}.identity.json`;
    const identityPartialPath = `${identityPath}.partial`;
    const identity = clipIdentity(text, fileName);
    if (await files.exists(partialPath)) await files.remove(partialPath);
    if (await files.exists(identityPartialPath)) await files.remove(identityPartialPath);
    if (await hasReusableClip(files, audioValidator, finalPath, identityPath, identity)) {
      reusedClipCount += 1;
    } else {
      if (await files.exists(finalPath)) await files.remove(finalPath);
      if (await files.exists(identityPath)) await files.remove(identityPath);
      try {
        await provider.synthesize({
          text,
          outputPath: partialPath,
          voice: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.voice,
          model: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.model,
          speed: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.speed,
          language: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.language,
          format: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.format,
        });
        if (!await files.exists(partialPath) || !await audioValidator.validate(partialPath)) {
          throw new Error(`Speech provider produced invalid audio at index ${index}`);
        }
        await files.rename(partialPath, finalPath);
        await files.writeText(identityPartialPath, `${JSON.stringify(identity, null, 2)}\n`);
        await files.rename(identityPartialPath, identityPath);
        generatedClipCount += 1;
      } catch (error) {
        if (await files.exists(partialPath)) await files.remove(partialPath);
        if (await files.exists(identityPartialPath)) await files.remove(identityPartialPath);
        if (await files.exists(finalPath) && !await files.exists(identityPath)) {
          await files.remove(finalPath);
        }
        throw error;
      }
    }
    clips.push(Object.freeze({
      text,
      sourceLocale: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.sourceLocale,
      key: `${storagePrefix}/${fileName}`,
      mediaType: ENGLISH_ANSWER_SPEECH_PREPARATION_SETTINGS.mediaType,
    }));
  }

  const manifest = Object.freeze({
    schemaVersion: 1 as const,
    clips: Object.freeze(clips),
  });
  const manifestPath = join(outputDirectory, MANIFEST_FILE_NAME);
  const manifestPartialPath = `${manifestPath}.partial`;
  if (await files.exists(manifestPartialPath)) await files.remove(manifestPartialPath);
  await files.writeText(manifestPartialPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await files.rename(manifestPartialPath, manifestPath);
  return Object.freeze({
    manifestPath,
    manifest,
    generatedClipCount,
    reusedClipCount,
    duplicateTermCount,
  });
}
