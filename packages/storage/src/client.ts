import { z } from "zod";
import type { Readable } from "stream";

/**
 * Configuration for creating a StorageClient instance.
 * Validated at runtime via Zod before constructing the S3 driver.
 */
export const storageConfigSchema = z.object({
  endpoint: z.string().url(),
  region: z.string().min(1),
  bucket: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  publicBaseUrl: z.string().url().optional(),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

/**
 * Options for the `put` operation.
 */
export interface PutOptions {
  /** MIME type of the object. */
  contentType?: string;
  /** Whether the object should be publicly readable. Defaults to true. */
  public?: boolean;
}

/**
 * Provider-agnostic storage interface.
 * Application code should call these methods instead of directly using any storage SDK.
 */
export interface StorageClient {
  /**
   * Upload an object to storage.
   * @param key The object key (path).
   * @param body The object content.
   * @param opts Optional put options (content type, public ACL).
   */
  put(
    key: string,
    body: Buffer | Uint8Array | Readable,
    opts?: PutOptions
  ): Promise<void>;

  /**
   * Construct the public URL for an object. No network call.
   * @param key The object key.
   * @returns The public URL string.
   */
  getUrl(key: string): string;

  /**
   * Generate a pre-signed URL for temporary access.
   * @param key The object key.
   * @param expiresIn Seconds until the URL expires. Defaults to 3600 (1 hour).
   * @returns The pre-signed URL string.
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete an object from storage.
   * @param key The object key.
   */
  delete(key: string): Promise<void>;

  /**
   * Check whether an object exists in storage.
   * @param key The object key.
   * @returns True if the object exists, false otherwise.
   */
  exists(key: string): Promise<boolean>;
}
