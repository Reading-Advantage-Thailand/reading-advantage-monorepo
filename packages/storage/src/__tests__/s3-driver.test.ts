import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockClient,
} from "aws-sdk-client-mock";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { S3StorageDriver } from "../drivers/s3";
import type { StorageConfig } from "../client";

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

  describe("exists", () => {
    it("returns true when object exists", async () => {
      s3Mock.on(HeadObjectCommand).resolves({});
      const driver = new S3StorageDriver(testConfig);
      expect(await driver.exists("present-key")).toBe(true);
    });

    it("returns false when object does not exist", async () => {
      s3Mock.on(HeadObjectCommand).rejects(
        new Error("NotFound")
      );
      const driver = new S3StorageDriver(testConfig);
      expect(await driver.exists("missing-key")).toBe(false);
    });
  });
});
