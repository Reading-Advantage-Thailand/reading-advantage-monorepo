import { storageConfigSchema, type StorageConfig } from "./client.js";
import { S3StorageDriver } from "./drivers/s3.js";
import type { StorageClient } from "./client.js";

/** Error thrown when storage is accessed but not configured. */
export class ProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "Storage is not configured. Set STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_BUCKET, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY environment variables."
    );
    this.name = "ProviderNotConfiguredError";
  }
}

/**
 * Adapter-normalized error thrown when a storage operation fails.
 *
 * Provider SDK errors (AWS S3 ServiceException, Smithy, etc.) are
 * caught by the driver and re-thrown as `StorageOperationError` so
 * application code never observes provider-specific exception names.
 * The original provider error is attached as `cause` for diagnostics.
 */
export class StorageOperationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "StorageOperationError";
  }
}

let cachedClient: StorageClient | null = null;

/**
 * Create a StorageClient from explicit configuration.
 * @param config The storage configuration.
 * @returns A new StorageClient instance.
 */
export function createStorageClient(config: StorageConfig): StorageClient {
  return new S3StorageDriver(config);
}

/**
 * Get or create the lazily-initialized StorageClient singleton.
 * Reads and validates environment variables on first call only.
 * Subsequent calls return the memoized instance.
 * @returns The StorageClient singleton.
 * @throws {ProviderNotConfiguredError} If env vars are missing in production.
 */
export function getStorageClient(): StorageClient {
  if (cachedClient) return cachedClient;

  const raw = {
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION ?? "auto",
    bucket: process.env.STORAGE_BUCKET,
    accessKeyId: process.env.STORAGE_ACCESS_KEY,
    secretAccessKey: process.env.STORAGE_SECRET_KEY,
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL || undefined,
  };

  const result = storageConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ProviderNotConfiguredError();
  }

  cachedClient = new S3StorageDriver(result.data);
  return cachedClient;
}

/**
 * Reset the memoized singleton. Intended for testing only.
 */
export function resetStorageClient(): void {
  cachedClient = null;
}
