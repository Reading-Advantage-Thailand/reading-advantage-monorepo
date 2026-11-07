import { createStorageClient } from "@reading-advantage/storage";
import { MEDIA_URL_EXPIRES_S } from "../auth/session-policy";

/**
 * The signed media URLs of the Storytime app (design section 4, AC-4.7).
 *
 * Every media URL of a page is a signed URL of the storage adapter. The signature holds for six
 * hours, so a link lives no longer than one reading session. The signing runs on the server, after
 * the session check, so a stranger never gets a URL.
 *
 * The module signs the `file` fields of one week only. A key that leaves the folder of the week,
 * and a bucket that serves the content in public, make the signing fail. The module never falls
 * back to a public or a relative URL.
 */

/** The environment value that names the bucket of the media. */
export const MEDIA_BASE_ENV = "STORYTIME_MEDIA_BASE";

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
 * Collects the `file` fields of one week.
 * @param value The week, or any part of it.
 * @param files The files found so far.
 * @returns The file fields of the value.
 */
function collectFiles(value: unknown, files: Set<string>): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) collectFiles(entry, files);
    return files;
  }
  if (!value || typeof value !== "object") return files;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === "file" && typeof entry === "string") files.add(entry);
    else collectFiles(entry, files);
  }
  return files;
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
 * @throws When the base names no bucket, or names the public bucket.
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
    endpoint: STORAGE_ENDPOINT,
    region: STORAGE_REGION,
    bucket,
    accessKeyId,
    secretAccessKey,
  });
}

/**
 * Signs the media of one week.
 *
 * The map holds one signed URL per `file` field of the week. The signing fails when the media
 * base names no private bucket, when the signer holds no key, and when a file of the week names
 * an object key that leaves the folder of the week.
 * @param week The week whose media the page shows.
 * @param deps The storage client and the media base.
 * @returns The signed URL of every file of the week.
 * @throws When the signing configuration holds no private bucket, no signer, or an unsafe key.
 */
export async function signWeekMedia(
  week: unknown,
  deps: SignWeekMediaDeps,
): Promise<Record<string, string>> {
  const mediaBase = deps.mediaBase ?? process.env[MEDIA_BASE_ENV] ?? "";
  const bucket = bucketOf(mediaBase);
  const storage = deps.storage ?? clientFromEnvironment(bucket);

  const files = collectFiles(week, new Set<string>());
  const map: Record<string, string> = {};
  for (const file of files) {
    if (!safeKey(file)) {
      throw new Error("the week holds a file that leaves the folder of the week");
    }
    map[file] = await storage.getSignedUrl(file, MEDIA_URL_EXPIRES_S);
  }
  return map;
}
