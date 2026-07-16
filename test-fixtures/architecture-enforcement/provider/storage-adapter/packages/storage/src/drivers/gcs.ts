import { Storage } from "@google-cloud/storage";

/**
 * Constructs a cloud storage client inside the exact driver root.
 * @returns Fixture storage client.
 */
export function createStorageAdapterClient() {
  return new Storage();
}
