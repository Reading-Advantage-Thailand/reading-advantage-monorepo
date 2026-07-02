/**
 * Wave 2 Phase 2 Red-phase storage contract.
 *
 * Track:  `wave2_confidence_restoration_20260628`
 * Phase:  2 — Provider Adapter Enforcement
 *
 * Guards two properties of the storage adapter boundary:
 *   1. `StorageClient` exposes the required provider-agnostic semantics:
 *      put, getUrl, getSignedUrl, delete, and exists.
 *   2. Rejected / failed operations must throw adapter-normalized errors,
 *      not leak provider-specific error types (e.g. AWS S3 exceptions).
 *
 * RED expectation at HEAD:
 *   S3StorageDriver lets raw AWS SDK errors propagate unchanged, so the
 *   error-normalization assertions fail with provider-specific error names.
 *
 * Labeled counts:
 *   - `StorageClient method count: N` (A4 — fails if N < expected)
 *   - `Provider-specific error leakage count: N` (fails if N > 0)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { S3StorageDriver } from "../drivers/s3";
import type { StorageClient, StorageConfig } from "../client";

const s3Mock = mockClient(S3Client);

const mockedGetSignedUrl = vi.fn();
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockedGetSignedUrl(...args),
}));

const testConfig: StorageConfig = {
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  bucket: "test-bucket",
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
};

beforeEach(() => {
  s3Mock.reset();
  mockedGetSignedUrl.mockReset();
});

function isProviderSpecificError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name ?? "";
  const message = error.message ?? "";
  return (
    /S3|AWS|Smithy|ServiceException|NotFound|AccessDenied|NoSuchBucket|InvalidBucket/.test(name) ||
    /S3|AWS|Smithy|ServiceException|NotFound|AccessDenied|NoSuchBucket|InvalidBucket/.test(message)
  );
}

describe("Wave 2 Phase 2 — storage adapter contract", () => {
  it("StorageClient exposes required provider-agnostic semantics", () => {
    const driver: StorageClient = new S3StorageDriver(testConfig);
    const methods = ["put", "getUrl", "getSignedUrl", "delete", "exists"] as const;

    const missing = methods.filter((m) => typeof (driver as Record<string, unknown>)[m] !== "function");

    expect(
      missing,
      `StorageClient method count: ${methods.length - missing.length} (expected ${methods.length})`,
    ).toEqual([]);
  });

  it("put rejects with an adapter-normalized error, not a raw S3 error", async () => {
    const rawError = Object.assign(new Error("AccessDenied"), { name: "S3ServiceException" });
    s3Mock.on(PutObjectCommand).rejects(rawError);

    const driver = new S3StorageDriver(testConfig);

    await expect(driver.put("key", Buffer.from("value"))).rejects.toSatisfy(
      (error: unknown) => {
        const leaked = isProviderSpecificError(error) ? 1 : 0;
        expect(leaked, `Provider-specific error leakage count: ${leaked}`).toBe(0);
        return true;
      },
    );
  });

  it("delete rejects with an adapter-normalized error, not a raw S3 error", async () => {
    const rawError = Object.assign(new Error("NoSuchBucket"), { name: "S3ServiceException" });
    s3Mock.on(DeleteObjectCommand).rejects(rawError);

    const driver = new S3StorageDriver(testConfig);

    await expect(driver.delete("key")).rejects.toSatisfy((error: unknown) => {
      const leaked = isProviderSpecificError(error) ? 1 : 0;
      expect(leaked, `Provider-specific error leakage count: ${leaked}`).toBe(0);
      return true;
    });
  });

  it("getSignedUrl rejects with an adapter-normalized error, not a raw S3 error", async () => {
    const rawError = Object.assign(new Error("InvalidBucketName"), { name: "S3ServiceException" });
    mockedGetSignedUrl.mockRejectedValue(rawError);

    const driver = new S3StorageDriver(testConfig);

    await expect(driver.getSignedUrl("key")).rejects.toSatisfy((error: unknown) => {
      const leaked = isProviderSpecificError(error) ? 1 : 0;
      expect(leaked, `Provider-specific error leakage count: ${leaked}`).toBe(0);
      return true;
    });
  });
});
