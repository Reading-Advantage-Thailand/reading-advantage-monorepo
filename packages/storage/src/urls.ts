import { getStorageClient } from "./factory.js";

/**
 * Get the public URL for a storage object key.
 * @param key The object key.
 * @returns The public URL string.
 */
export function getStorageUrl(key: string): string {
  return getStorageClient().getUrl(key);
}
