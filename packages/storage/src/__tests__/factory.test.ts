import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getStorageClient,
  resetStorageClient,
  ProviderNotConfiguredError,
} from "../factory";
import { S3StorageDriver } from "../drivers/s3";

describe("getStorageClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetStorageClient();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws ProviderNotConfiguredError when env vars are missing", () => {
    delete process.env.STORAGE_ENDPOINT;
    delete process.env.STORAGE_BUCKET;
    delete process.env.STORAGE_ACCESS_KEY;
    delete process.env.STORAGE_SECRET_KEY;
    expect(() => getStorageClient()).toThrow(ProviderNotConfiguredError);
  });

  it("returns S3StorageDriver when env vars are set", () => {
    process.env.STORAGE_ENDPOINT = "http://localhost:9000";
    process.env.STORAGE_REGION = "us-east-1";
    process.env.STORAGE_BUCKET = "test-bucket";
    process.env.STORAGE_ACCESS_KEY = "key";
    process.env.STORAGE_SECRET_KEY = "secret";
    const client = getStorageClient();
    expect(client).toBeInstanceOf(S3StorageDriver);
  });

  it("returns the same instance on subsequent calls (memoization)", () => {
    process.env.STORAGE_ENDPOINT = "http://localhost:9000";
    process.env.STORAGE_REGION = "us-east-1";
    process.env.STORAGE_BUCKET = "test-bucket";
    process.env.STORAGE_ACCESS_KEY = "key";
    process.env.STORAGE_SECRET_KEY = "secret";
    const a = getStorageClient();
    const b = getStorageClient();
    expect(a).toBe(b);
  });
});
