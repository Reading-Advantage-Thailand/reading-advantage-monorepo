import { describe, it, expect, beforeEach } from "vitest";
import {
  mockClient,
} from "aws-sdk-client-mock";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { S3StorageDriver } from "../drivers/s3";
import type { StorageConfig } from "../client";
import { StorageOperationError } from "../factory";

const s3Mock = mockClient(S3Client);

const testConfig: StorageConfig = {
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  bucket: "test-bucket",
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
};

beforeEach(() => {
  s3Mock.reset();
});

describe("S3StorageDriver", () => {
  describe("put", () => {
    it("sends PutObjectCommand with correct args", async () => {
      s3Mock.on(PutObjectCommand).resolves({});
      const driver = new S3StorageDriver(testConfig);
      await driver.put("test-key", Buffer.from("hello"), {
        contentType: "text/plain",
        public: true,
      });

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        Bucket: "test-bucket",
        Key: "test-key",
        ContentType: "text/plain",
        ACL: "public-read",
      });
    });

    it("omits the ACL when public is false", async () => {
      s3Mock.on(PutObjectCommand).resolves({});
      const driver = new S3StorageDriver(testConfig);
      await driver.put("k", Buffer.from("x"), { public: false });

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls[0].args[0].input).not.toHaveProperty("ACL");
    });

    it("omits the ACL by default", async () => {
      s3Mock.on(PutObjectCommand).resolves({});
      const driver = new S3StorageDriver(testConfig);
      await driver.put("k", Buffer.from("x"));

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls[0].args[0].input).not.toHaveProperty("ACL");
    });
  });

  describe("getUrl", () => {
    it("constructs public URL from config", () => {
      const driver = new S3StorageDriver(testConfig);
      expect(driver.getUrl("path/to/file.jpg")).toBe(
        "http://localhost:9000/test-bucket/path/to/file.jpg"
      );
    });

    it("uses publicBaseUrl when provided", () => {
      const driver = new S3StorageDriver({
        ...testConfig,
        publicBaseUrl: "https://cdn.example.com",
      });
      expect(driver.getUrl("file.txt")).toBe(
        "https://cdn.example.com/file.txt"
      );
    });
  });

  describe("getSignedUrl", () => {
    it("returns a presigned URL", async () => {
      s3Mock.on(PutObjectCommand).resolves({});
      const driver = new S3StorageDriver(testConfig);
      const url = await driver.getSignedUrl("test-key", 600);
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe("delete", () => {
    it("sends DeleteObjectCommand", async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});
      const driver = new S3StorageDriver(testConfig);
      await driver.delete("to-delete");

      const calls = s3Mock.commandCalls(DeleteObjectCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        Bucket: "test-bucket",
        Key: "to-delete",
      });
    });
  });

  describe("get", () => {
    it("returns object bytes from GetObjectCommand", async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToByteArray: async () => new Uint8Array([1, 2, 3]),
        } as never,
      });
      const driver = new S3StorageDriver(testConfig);

      await expect(driver.get("receipt-key")).resolves.toEqual(
        new Uint8Array([1, 2, 3]),
      );
      const calls = s3Mock.commandCalls(GetObjectCommand);
      expect(calls[0].args[0].input).toMatchObject({
        Bucket: "test-bucket",
        Key: "receipt-key",
      });
    });
  });

  describe("exists", () => {
    it("returns true when object exists", async () => {
      s3Mock.on(HeadObjectCommand).resolves({});
      const driver = new S3StorageDriver(testConfig);
      expect(await driver.exists("present-key")).toBe(true);
    });

    it("returns false for a provider NotFound error", async () => {
      const notFound = Object.assign(new Error("Object not found"), { name: "NotFound" });
      s3Mock.on(HeadObjectCommand).rejects(notFound);
      const driver = new S3StorageDriver(testConfig);

      expect(await driver.exists("missing-key")).toBe(false);
    });

    it("returns false for an HTTP 404 response", async () => {
      const notFound = Object.assign(new Error("Missing object"), {
        $metadata: { httpStatusCode: 404 },
      });
      s3Mock.on(HeadObjectCommand).rejects(notFound);
      const driver = new S3StorageDriver(testConfig);

      expect(await driver.exists("missing-key")).toBe(false);
    });

    it.each([
      ["HTTP 403", Object.assign(new Error("Access denied"), { $metadata: { httpStatusCode: 403 } })],
      ["HTTP 500", Object.assign(new Error("Provider failed"), { $metadata: { httpStatusCode: 500 } })],
      ["network", new Error("socket hang up")],
    ])("normalizes %s failures and retains the provider cause", async (_label, cause) => {
      s3Mock.on(HeadObjectCommand).rejects(cause);
      const driver = new S3StorageDriver(testConfig);

      const error = await driver.exists("uncertain-key").then(
        () => null,
        (failure: unknown) => failure,
      );

      expect(error).toBeInstanceOf(StorageOperationError);
      expect(error).toMatchObject({ code: "STORAGE_EXISTS_FAILED" });
      expect((error as StorageOperationError).cause).toBe(cause);
    });
  });
});
