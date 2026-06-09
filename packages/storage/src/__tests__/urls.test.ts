import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStorageUrl } from "../urls";
import { resetStorageClient } from "../factory";

describe("getStorageUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetStorageClient();
    process.env.STORAGE_ENDPOINT = "http://localhost:9000";
    process.env.STORAGE_REGION = "us-east-1";
    process.env.STORAGE_BUCKET = "test-bucket";
    process.env.STORAGE_ACCESS_KEY = "key";
    process.env.STORAGE_SECRET_KEY = "secret";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the public URL for a key", () => {
    expect(getStorageUrl("path/file.jpg")).toBe(
      "http://localhost:9000/test-bucket/path/file.jpg"
    );
  });
});
