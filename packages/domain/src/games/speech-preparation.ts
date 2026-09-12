import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  listeningSessionConfigSchema,
  preparedListeningVocabularyResponseSchema,
  preparedReadToSelectAudioVocabularyResponseSchema,
  preparedSpeechSchema,
  readToSelectAudioSessionConfigSchema,
  vocabularyItemSchema,
  type ListeningSessionConfig,
  type PreparedListeningVocabularyResponse,
  type PreparedReadToSelectAudioVocabularyResponse,
  type PreparedSpeech,
  type PreparedSpeechClip,
  type ReadToSelectAudioSessionConfig,
} from "@reading-advantage/game-contracts";
import { z } from "zod";

const MAX_PREPARATION_ITEMS = 50;
const MAX_CONFIGURED_SPEECH_CLIPS = 5_000;
const MIN_PREPARATION_TIMEOUT_MS = 100;
const MAX_PREPARATION_TIMEOUT_MS = 30_000;

/** Stable speech preparation failure codes. */
export type GameSpeechPreparationErrorCode =
  | "invalid-configuration"
  | "missing-audio"
  | "locale-mismatch"
  | "preparation-timeout"
  | "lookup-failed"
  | "stale-preparation";

/** Structured failure from prepared game speech lookup. */
export class GameSpeechPreparationError extends Error {
  /**
   * Creates one structured preparation failure.
   * @param code Stable failure code.
   * @param message Safe failure description.
   * @param itemPosition Affected item position when known.
   * @param cause Original lookup failure when available.
   */
  constructor(
    public readonly code: GameSpeechPreparationErrorCode,
    message: string,
    public readonly itemPosition?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GameSpeechPreparationError";
  }
}

/** Request for one already-prepared speech clip. */
export interface SpeechClipLookupRequest {
  /** Zero-based position in the strict content array. */
  readonly itemPosition: number;
  /** Exact student term text. */
  readonly text: string;
  /** Required source locale. */
  readonly sourceLocale: string;
  /** Authenticated user identifier. */
  readonly userId: string;
  /** Authenticated school identifier. */
  readonly schoolId: string;
  /** Cancellation signal for stale work. */
  readonly signal: AbortSignal;
}

/** One resolved speech clip before index assignment. */
export interface ResolvedSpeechClip {
  /** Browser-safe clip URL. */
  readonly url: string;
  /** Declared audio media type. */
  readonly mediaType: `audio/${string}`;
  /** Locale used by the prepared recording. */
  readonly sourceLocale: string;
}

/** Provider-neutral lookup for already-prepared speech. */
export interface SpeechClipLookupPort {
  /**
   * Finds one prepared clip without generating audio.
   * @param request Exact term, locale, tenant identity, and cancellation.
   * @returns A prepared clip, or undefined when none exists.
   */
  find(request: SpeechClipLookupRequest): Promise<ResolvedSpeechClip | undefined>;
}

/** Indexed clip returned beside strict educational content. */
export type PreparedGameSpeechClip = PreparedSpeechClip;

/** Complete speech preparation result for one session. */
export type PreparedGameSpeech = PreparedSpeech;

/** Strict indexed prepared speech payload. */
export const preparedGameSpeechSchema = preparedSpeechSchema;

/** Strict content response for an explicitly requested answer-audio session. */
export const preparedGameAnswerAudioLearningContentResultSchema =
  preparedReadToSelectAudioVocabularyResponseSchema;

/** Strict content response for either supported prepared audio session. */
export const preparedGameLearningContentResultSchema = z.union([
  preparedListeningVocabularyResponseSchema,
  preparedGameAnswerAudioLearningContentResultSchema,
]);

/** Content response for one explicit prepared answer-audio request. */
export type PreparedGameAnswerAudioLearningContentResult =
  PreparedReadToSelectAudioVocabularyResponse;

/** Content response for one supported prepared audio request. */
export type PreparedGameLearningContentResult =
  | PreparedListeningVocabularyResponse
  | PreparedGameAnswerAudioLearningContentResult;

/** Minimal existing storage operations used by speech lookup. */
export interface SpeechObjectStoragePort {
  /** Checks whether an object exists. */
  exists(key: string): Promise<boolean>;
  /** Returns a bounded signed object URL. */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

/** Configured storage object for one exact term and locale. */
export interface ConfiguredSpeechObject {
  /** Existing object key. */
  readonly key: string;
  /** Locale recorded during preparation. */
  readonly sourceLocale: string;
  /** Stored audio media type. */
  readonly mediaType: `audio/${string}`;
}

/** Exact resolver for configured prepared speech objects. */
export type ConfiguredSpeechObjectResolver = (
  request: Omit<SpeechClipLookupRequest, "signal">,
) => ConfiguredSpeechObject | undefined;

/** Options for the prepared speech storage adapter. */
export interface StoredSpeechClipLookupOptions {
  /** Existing provider-neutral storage client subset. */
  readonly storage: SpeechObjectStoragePort;
  /** Resolves an approved object without deriving an unverified key. */
  readonly resolveObject: (
    request: Omit<SpeechClipLookupRequest, "signal">,
  ) => ConfiguredSpeechObject | undefined;
  /** Signed URL lifetime from 60 through 3600 seconds. */
  readonly expiresInSeconds?: number;
}

const resolvedSpeechClipSchema = z.object({
  url: z.string().url().refine((value) => isHttpUrl(value), "Prepared speech URL must use HTTP or HTTPS"),
  mediaType: z.string().regex(/^audio\/[a-z0-9.+-]+$/i),
  sourceLocale: z.string().trim().min(2).max(35),
}).strict();

const configuredSpeechObjectSchema = z.object({
  key: z.string().trim().min(1).max(1024),
  mediaType: z.string().regex(/^audio\/[a-z0-9.+-]+$/i),
  sourceLocale: z.string().trim().min(2).max(35),
}).strict();

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const configuredSpeechManifestSchema = z.object({
  schemaVersion: z.literal(1),
  clips: z.array(z.object({
    text: z.string().trim().min(1).max(1_000),
    sourceLocale: z.string().trim().min(2).max(35),
    key: z.string().trim().min(1).max(1_024),
    mediaType: z.string().regex(/^audio\/[a-z0-9.+-]+$/i),
  }).strict()).min(1).max(MAX_CONFIGURED_SPEECH_CLIPS),
}).strict().superRefine((manifest, context) => {
  const seen = new Set<string>();
  manifest.clips.forEach((clip, index) => {
    const identity = `${clip.sourceLocale}\u0000${clip.text}`;
    if (seen.has(identity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prepared speech term and locale pairs must be unique",
        path: ["clips", index],
      });
    }
    seen.add(identity);
  });
});

/**
 * Creates an exact term and locale resolver from a reviewed speech manifest.
 * @param serializedManifest JSON with approved storage keys and audio metadata.
 * @returns A resolver that never derives an unreviewed storage key.
 * @throws When the manifest is malformed or contains duplicate identities.
 */
export function createConfiguredSpeechObjectResolver(
  serializedManifest: string,
): ConfiguredSpeechObjectResolver {
  let input: unknown;
  try {
    input = JSON.parse(serializedManifest);
  } catch (cause) {
    throw new GameSpeechPreparationError(
      "invalid-configuration",
      "Prepared speech manifest is invalid",
      undefined,
      cause,
    );
  }
  const parsed = configuredSpeechManifestSchema.safeParse(input);
  if (!parsed.success) {
    throw new GameSpeechPreparationError(
      "invalid-configuration",
      "Prepared speech manifest is invalid",
      undefined,
      parsed.error,
    );
  }
  const byIdentity = new Map(
    parsed.data.clips.map(({ text, sourceLocale, key, mediaType }) => [
      `${sourceLocale}\u0000${text}`,
      configuredSpeechObjectSchema.parse({ key, sourceLocale, mediaType }) as ConfiguredSpeechObject,
    ]),
  );
  return (request) => byIdentity.get(`${request.sourceLocale}\u0000${request.text}`);
}

/**
 * Creates a lookup adapter for configured speech objects in existing storage.
 * @param options Storage operations, approved key resolver, and URL lifetime.
 * @returns A provider-neutral prepared clip lookup.
 * @throws When the signed URL lifetime is invalid.
 */
export function createStoredSpeechClipLookup(
  options: StoredSpeechClipLookupOptions,
): SpeechClipLookupPort {
  const expiresInSeconds = options.expiresInSeconds ?? 900;
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 3_600) {
    throw new GameSpeechPreparationError(
      "invalid-configuration",
      "Speech URL lifetime must be from 60 through 3600 seconds",
    );
  }
  return Object.freeze({
    async find(request: SpeechClipLookupRequest): Promise<ResolvedSpeechClip | undefined> {
      if (request.signal.aborted) {
        throw new GameSpeechPreparationError("stale-preparation", "Speech preparation was cancelled");
      }
      const object = options.resolveObject({
        itemPosition: request.itemPosition,
        text: request.text,
        sourceLocale: request.sourceLocale,
        userId: request.userId,
        schoolId: request.schoolId,
      });
      if (!object) return undefined;
      const configuredObject = configuredSpeechObjectSchema.parse(object);
      if (configuredObject.sourceLocale !== request.sourceLocale) return undefined;
      if (!await options.storage.exists(configuredObject.key)) return undefined;
      if (request.signal.aborted) {
        throw new GameSpeechPreparationError("stale-preparation", "Speech preparation was cancelled");
      }
      const url = await options.storage.getSignedUrl(configuredObject.key, expiresInSeconds);
      if (request.signal.aborted) {
        throw new GameSpeechPreparationError("stale-preparation", "Speech preparation was cancelled");
      }
      return resolvedSpeechClipSchema.parse({
        url,
        mediaType: configuredObject.mediaType,
        sourceLocale: configuredObject.sourceLocale,
      }) as ResolvedSpeechClip;
    },
  });
}

async function findPreparedClip(
  lookup: SpeechClipLookupPort,
  request: Omit<SpeechClipLookupRequest, "signal">,
  itemPosition: number,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ResolvedSpeechClip | undefined> {
  if (signal?.aborted) {
    throw new GameSpeechPreparationError(
      "stale-preparation",
      "Speech preparation was cancelled",
      itemPosition,
    );
  }
  const abort = new AbortController();
  let rejectCancellation: ((error: GameSpeechPreparationError) => void) | undefined;
  const handleAbort = (): void => {
    abort.abort();
    rejectCancellation?.(new GameSpeechPreparationError(
      "stale-preparation",
      "Speech preparation was cancelled",
      itemPosition,
    ));
  };
  signal?.addEventListener("abort", handleAbort, { once: true });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    return await Promise.race([
      lookup.find({ ...request, signal: abort.signal }),
      new Promise<never>((_resolve, reject) => {
        rejectCancellation = reject;
      }),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          abort.abort();
          reject(new GameSpeechPreparationError(
            "preparation-timeout",
            "Prepared speech lookup timed out",
            itemPosition,
          ));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (timedOut) {
      throw new GameSpeechPreparationError(
        "preparation-timeout",
        "Prepared speech lookup timed out",
        itemPosition,
        error,
      );
    }
    if (signal?.aborted) {
      throw new GameSpeechPreparationError(
        "stale-preparation",
        "Speech preparation was cancelled",
        itemPosition,
        error,
      );
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
    signal?.removeEventListener("abort", handleAbort);
  }
}

/**
 * Resolves complete indexed speech for authorized student content.
 * @param args Authenticated session, strict content, lookup port, and timeout.
 * @returns Complete index-aligned prepared speech references.
 * @throws When authorization, configuration, availability, locale, or cancellation fails.
 */
export async function prepareGameSpeech({
  user,
  tenant,
  session: sessionInput,
  content: contentInput,
  lookup,
  preparationTimeoutMs,
  signal,
}: {
  user: UserContext;
  tenant: Tenant;
  session: ListeningSessionConfig;
  content: readonly z.input<typeof vocabularyItemSchema>[];
  lookup: SpeechClipLookupPort;
  preparationTimeoutMs: number;
  signal?: AbortSignal;
}): Promise<PreparedGameSpeech> {
  assertCan(user, "games:read:own", tenant);
  if (!tenant.schoolId) {
    throw new GameSpeechPreparationError(
      "invalid-configuration",
      "Prepared speech requires an authenticated school",
    );
  }
  const session = listeningSessionConfigSchema.parse(sessionInput);
  const content = z.array(vocabularyItemSchema).min(1).max(MAX_PREPARATION_ITEMS).parse(contentInput);
  if (
    !Number.isInteger(preparationTimeoutMs)
    || preparationTimeoutMs < MIN_PREPARATION_TIMEOUT_MS
    || preparationTimeoutMs > MAX_PREPARATION_TIMEOUT_MS
  ) {
    throw new GameSpeechPreparationError(
      "invalid-configuration",
      "Speech preparation timeout must be from 100 through 30000 milliseconds",
    );
  }
  const preparationDeadline = Date.now() + preparationTimeoutMs;

  const clips: PreparedGameSpeechClip[] = [];
  for (const [itemPosition, item] of content.entries()) {
    const remainingPreparationMs = preparationDeadline - Date.now();
    if (remainingPreparationMs <= 0) {
      throw new GameSpeechPreparationError(
        "preparation-timeout",
        "Prepared speech lookup timed out",
        itemPosition,
      );
    }
    let clip: ResolvedSpeechClip | undefined;
    try {
      clip = await findPreparedClip(lookup, {
        itemPosition,
        text: item.term,
        sourceLocale: session.sourceLocale,
        userId: user.id,
        schoolId: tenant.schoolId,
      }, itemPosition, remainingPreparationMs, signal);
    } catch (error) {
      if (error instanceof GameSpeechPreparationError) throw error;
      throw new GameSpeechPreparationError(
        "lookup-failed",
        "Prepared speech lookup failed",
        itemPosition,
        error,
      );
    }
    if (!clip) {
      throw new GameSpeechPreparationError(
        "missing-audio",
        "Prepared speech is unavailable for a content item",
        itemPosition,
      );
    }
    const parsedClip = resolvedSpeechClipSchema.parse(clip) as ResolvedSpeechClip;
    if (parsedClip.sourceLocale !== session.sourceLocale) {
      throw new GameSpeechPreparationError(
        "locale-mismatch",
        "Prepared speech locale does not match the listening session",
        itemPosition,
      );
    }
    clips.push(Object.freeze({ itemPosition, ...parsedClip }));
  }
  return preparedSpeechSchema.parse({ clips });
}

/**
 * Resolves indexed English answer audio for authorized Thai vocabulary content.
 * @param args Authenticated answer-audio session, strict content, lookup port, and timeout.
 * @returns Complete index-aligned English answer audio references.
 * @throws When authorization, configuration, availability, locale, or cancellation fails.
 */
export async function prepareGameAnswerAudio({
  user,
  tenant,
  session: sessionInput,
  content,
  lookup,
  preparationTimeoutMs,
  signal,
}: {
  user: UserContext;
  tenant: Tenant;
  session: ReadToSelectAudioSessionConfig;
  content: readonly z.input<typeof vocabularyItemSchema>[];
  lookup: SpeechClipLookupPort;
  preparationTimeoutMs: number;
  signal?: AbortSignal;
}): Promise<PreparedGameSpeech> {
  const session = readToSelectAudioSessionConfigSchema.parse(sessionInput);
  return prepareGameSpeech({
    user,
    tenant,
    session: {
      modality: "listen-to-select",
      sourceLocale: session.answerLocale,
      targetLocale: "th",
      scored: session.scored,
      targetLocaleFallback: "reject",
    },
    content,
    lookup,
    preparationTimeoutMs,
    signal,
  });
}
