import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Re-imports lib/storage-config with a fresh module registry so
 * STORAGE_CONFIG is recomputed from the current process.env.
 * @returns The freshly loaded storage-config module.
 */
async function importStorageConfig() {
  vi.resetModules();
  return import("@/lib/storage-config");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("storage-config bucket resolution", () => {
  it("falls back to primary-app-storage when neither env var is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_BUCKET_NAME", undefined);
    vi.stubEnv("STORAGE_BUCKET_NAME", undefined);

    const { STORAGE_CONFIG } = await importStorageConfig();

    expect(STORAGE_CONFIG.bucketName).toBe("primary-app-storage");
  });

  it("prefers NEXT_PUBLIC_STORAGE_BUCKET_NAME over STORAGE_BUCKET_NAME", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_BUCKET_NAME", "next-bucket");
    vi.stubEnv("STORAGE_BUCKET_NAME", "server-bucket");

    const { STORAGE_CONFIG } = await importStorageConfig();

    expect(STORAGE_CONFIG.bucketName).toBe("next-bucket");
  });

  it("uses STORAGE_BUCKET_NAME when only the server var is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_BUCKET_NAME", undefined);
    vi.stubEnv("STORAGE_BUCKET_NAME", "server-bucket");

    const { STORAGE_CONFIG } = await importStorageConfig();

    expect(STORAGE_CONFIG.bucketName).toBe("server-bucket");
  });
});

describe("storage-config URL construction", () => {
  it("joins base, bucket, and cleaned path without a double slash or leading slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_BUCKET_NAME", "test-bucket");

    const { getStorageUrl } = await importStorageConfig();

    expect(getStorageUrl("/audio/article-1.mp3")).toBe(
      "https://storage.googleapis.com/test-bucket/audio/article-1.mp3",
    );
    expect(getStorageUrl("audio/article-1.mp3")).toBe(
      "https://storage.googleapis.com/test-bucket/audio/article-1.mp3",
    );
  });
});

describe("storage-config env documentation (config validation)", () => {
  it("documents a non-empty NEXT_PUBLIC_STORAGE_BUCKET_NAME entry in .env.example", () => {
    const envExample = readFileSync(
      resolve(import.meta.dirname, "../../.env.example"),
      "utf-8",
    );

    expect(envExample).toMatch(/^NEXT_PUBLIC_STORAGE_BUCKET_NAME="([^"\s]+)"$/m);
  });
});
