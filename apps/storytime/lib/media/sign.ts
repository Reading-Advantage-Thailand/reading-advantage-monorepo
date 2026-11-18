import { createStorageClient } from "@reading-advantage/storage";
import { mediaPathsOf } from "../../scripts/receive-weeks";
import { blendPlanForWord } from "../blend";
import { weekSchema, type StorytimeWeek } from "../contracts/week";
import { PHONEME_BANK } from "../phoneme-bank";
import { MEDIA_URL_EXPIRES_S } from "../auth/session-policy";

/**
 * The signed media URLs of the Storytime app (design section 4, AC-4.7).
 *
 * Every media URL of a page is a signed URL of the storage adapter. The signature holds for six
 * hours, so a link lives no longer than one reading session. The signing runs on the server, after
 * the session check, so a stranger never gets a URL.
 *
 * The list of the media of a week comes from the receiver, so the page signs every media path of
 * the week: the pictures, the songs, the videos, the slow audio, and the phoneme clips. The map
 * also holds every phoneme-bank clip that the blend words of the week need, even when the week
 * file names no clip for a grapheme, so a blend word never plays an empty source (finding B1 of
 * task 6.2, round 5). The paths under `approval` hold prose that may end in a media extension, so
 * they get no signature. The module signs each path once, and it never falls back to a public or
 * a relative URL.
 */

/** The environment value that names the bucket of the media. */
export const MEDIA_BASE_ENV = "STORYTIME_MEDIA_BASE";

/** The environment value that names the endpoint of the storage. */
export const ENDPOINT_ENV = "STORYTIME_STORAGE_ENDPOINT";

/** The environment value that holds the access key of the signer. */
export const ACCESS_KEY_ENV = "STORYTIME_STORAGE_ACCESS_KEY";

/** The environment value that holds the secret key of the signer. */
export const SECRET_KEY_ENV = "STORYTIME_STORAGE_SECRET_KEY";

/** The endpoint of the Google Cloud Storage interop protocol. */
const STORAGE_ENDPOINT = "https://storage.googleapis.com";

/** The region of the Google Cloud Storage interop protocol. */
const STORAGE_REGION = "auto";

/** The private bucket that holds the Storytime media. No other bucket may hold them. */
const PRIVATE_BUCKET = "storytime-app-media";

/** The field path of the prose of the approval, which holds no media. */
const APPROVAL_PATH = "approval.";

/** The storage client that signs one object key. */
export interface SignedMediaClient {
  /**
   * Signs one object key.
   * @param key The object key.
   * @param expiresIn The lifetime of the signature in seconds.
   * @returns The signed URL.
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

/** The parts that the signing needs. */
export interface SignWeekMediaDeps {
  /** The storage client. The module builds one from the environment when it is absent. */
  storage?: SignedMediaClient;
  /** The media base. The module reads the environment when it is absent. */
  mediaBase?: string;
}

/**
 * Reports whether an object key stays inside the folder of the week.
 * @param key The object key.
 * @returns `true` when the key may be signed.
 */
function safeKey(key: string): boolean {
  if (key === "" || key.startsWith("/")) return false;
  if (key.includes("..")) return false;
  if (key.includes("://")) return false;
  return true;
}

/**
 * Reads the bucket of the media base.
 * @param mediaBase The media base.
 * @returns The name of the bucket.
 * @throws When the base names no bucket, or names no private Storytime bucket.
 */
function bucketOf(mediaBase: string): string {
  if (!mediaBase.startsWith("gs://")) {
    throw new Error("the media base names no bucket");
  }
  const bucket = mediaBase.slice("gs://".length).replace(/\/+$/, "");
  if (bucket === "") throw new Error("the media base names no bucket");
  if (bucket !== PRIVATE_BUCKET) {
    throw new Error("the media base names no private Storytime bucket");
  }
  return bucket;
}

/**
 * Builds the storage client of the signer.
 * @param bucket The bucket of the media.
 * @returns The storage client.
 * @throws When the environment holds no key of the signer.
 */
function clientFromEnvironment(bucket: string): SignedMediaClient {
  const accessKeyId = process.env[ACCESS_KEY_ENV];
  const secretAccessKey = process.env[SECRET_KEY_ENV];
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(`the environment holds no ${ACCESS_KEY_ENV} or ${SECRET_KEY_ENV}`);
  }
  return createStorageClient({
    endpoint: process.env[ENDPOINT_ENV] ?? STORAGE_ENDPOINT,
    region: STORAGE_REGION,
    bucket,
    accessKeyId,
    secretAccessKey,
  });
}

/**
 * Reads the media paths of one week that need a signature.
 *
 * The list comes from the receiver, so it holds every media path of the week and not only the
 * fields named `file`. The paths under `approval` hold prose, so they get no signature.
 * @param week The week whose media the page shows.
 * @returns The media paths of the week, without duplicates.
 * @throws When a media path leaves the folder of the week.
 */
function mediaFilesOf(week: unknown): Set<string> {
  const files = new Set<string>();
  for (const entry of mediaPathsOf(week)) {
    if (entry.path.startsWith(APPROVAL_PATH)) continue;
    if (!safeKey(entry.file)) {
      throw new Error("the week holds a media path that leaves the folder of the week");
    }
    files.add(entry.file);
  }
  return files;
}

/**
 * Reads the phoneme-bank clips that the blend words of one week need.
 *
 * The words come from the decodable page texts, the words and tricky words of the sounds page,
 * and the tricky words of the focus. `blendPlanForWord` cuts each word, and the first bank clip
 * of each grapheme joins the set. A week that names a clip itself already holds it, so the set
 * only adds the clips that the week file omits (finding B1 of task 6.2, round 5).
 * @param week The parsed week whose decodable the child reads.
 * @returns The bank clip files, without duplicates.
 */
function blendWordClipsOf(week: StorytimeWeek): Set<string> {
  const clips = new Set<string>();
  const decodable = week.books.find((book) => book.kind === "decodable");
  if (!decodable) return clips;
  const words = new Set<string>();
  for (const page of decodable.pages) {
    for (const word of page.text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []) words.add(word);
  }
  for (const word of decodable.soundsPage?.words ?? []) words.add(word);
  for (const word of decodable.soundsPage?.tricky ?? []) words.add(word);
  for (const word of week.focus?.trickyWords ?? []) words.add(word);
  const clipByGrapheme = new Map<string, string>();
  for (const clip of PHONEME_BANK) {
    if (!clipByGrapheme.has(clip.grapheme)) clipByGrapheme.set(clip.grapheme, clip.file);
  }
  for (const word of words) {
    const plan = blendPlanForWord(word, week);
    if (plan.mode !== "blend") continue;
    for (const grapheme of plan.graphemes) {
      const file = clipByGrapheme.get(grapheme);
      if (file) clips.add(file);
    }
  }
  return clips;
}

/**
 * Signs the media of one week.
 *
 * The map holds one signed URL per media path of the week, plus every phoneme-bank clip that
 * the blend words of the week need. The signing fails when the media base names no private
 * bucket, when the signer holds no key, and when a media path of the week names an object key
 * that leaves the folder of the week.
 * @param week The week whose media the page shows.
 * @param deps The storage client and the media base.
 * @returns The signed URL of every media path of the week and of the blend-word bank clips.
 * @throws When the signing configuration holds no private bucket, no signer, or an unsafe key.
 */
export async function signWeekMedia(
  week: unknown,
  deps: SignWeekMediaDeps,
): Promise<Record<string, string>> {
  const mediaBase = deps.mediaBase ?? process.env[MEDIA_BASE_ENV] ?? "";
  const bucket = bucketOf(mediaBase);
  const storage = deps.storage ?? clientFromEnvironment(bucket);

  const files = mediaFilesOf(week);
  const parsed = weekSchema.safeParse(week);
  if (parsed.success) {
    for (const file of blendWordClipsOf(parsed.data)) {
      if (!safeKey(file)) {
        throw new Error("the week holds a media path that leaves the folder of the week");
      }
      files.add(file);
    }
  }
  const map: Record<string, string> = {};
  for (const file of files) {
    map[file] = await storage.getSignedUrl(file, MEDIA_URL_EXPIRES_S);
  }
  return map;
}
