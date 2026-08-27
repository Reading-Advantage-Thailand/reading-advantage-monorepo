import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";
import type { StorageClient, PutOptions } from "../client.js";
import type { StorageConfig } from "../client.js";
import { StorageOperationError } from "../factory.js";

/**
 * Identifies provider errors that confirm an object is absent.
 * @param error The provider error.
 * @returns True for HTTP 404 or a status-free S3 NotFound exception.
 */
function isConfirmedNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const status = (error as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode;
  if (status !== undefined) return status === 404;
  return error instanceof S3ServiceException && error.name === "NotFound";
}

/**
 * S3-compatible storage driver.
 * Works with AWS S3, GCS (S3 interoperability), Cloudflare R2, and MinIO.
 */
export class S3StorageDriver implements StorageClient {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  /**
   * Create an S3StorageDriver.
   * @param config Validated storage configuration.
   */
  constructor(config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO and GCS S3 interop
    });
    this.bucket = config.bucket;
    this.publicBaseUrl =
      config.publicBaseUrl ?? `${config.endpoint}/${config.bucket}`;
  }

  /**
   * Upload an object to S3.
   * @param key The object key.
   * @param body The object content.
   * @param opts Optional put options.
   * @returns A promise that resolves after the object is stored.
   * @throws {StorageOperationError} When the S3 client rejects the request.
   */
  async put(
    key: string,
    body: Buffer | Uint8Array | Readable,
    opts?: PutOptions
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: opts?.contentType,
      ...(opts?.public === true ? { ACL: "public-read" as const } : {}),
    });
    try {
      await this.client.send(command);
    } catch (err) {
      throw new StorageOperationError(
        `Storage put failed for object key`,
        "STORAGE_PUT_FAILED",
        err
      );
    }
  }

  /**
   * Read an object from S3.
   * @param key The object key.
   * @returns The object content as bytes.
   * @throws {StorageOperationError} When the S3 client rejects the request.
   */
  async get(key: string): Promise<Uint8Array> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    try {
      const response = await this.client.send(command);
      if (response.Body === undefined) {
        throw new Error("Storage response did not include an object body");
      }
      return await response.Body.transformToByteArray();
    } catch (err) {
      throw new StorageOperationError(
        `Storage get failed for object key`,
        "STORAGE_GET_FAILED",
        err,
      );
    }
  }

  /**
   * Construct the public URL for an object.
   * @param key The object key.
   * @returns The public URL.
   */
  getUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  /**
   * Generate a pre-signed URL for temporary access.
   * @param key The object key.
   * @param expiresIn Seconds until expiry. Defaults to 3600.
   * @returns The pre-signed URL.
   * @throws {StorageOperationError} When the presigner rejects the request.
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    try {
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (err) {
      throw new StorageOperationError(
        `Storage getSignedUrl failed for object key`,
        "STORAGE_SIGN_FAILED",
        err
      );
    }
  }

  /**
   * Delete an object from S3.
   * @param key The object key.
   * @throws {StorageOperationError} When the S3 client rejects the request.
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    try {
      await this.client.send(command);
    } catch (err) {
      throw new StorageOperationError(
        `Storage delete failed for object key`,
        "STORAGE_DELETE_FAILED",
        err
      );
    }
  }

  /**
   * Check whether an object exists in S3.
   * @param key The object key.
   * @returns True if the object exists, false otherwise.
   * @throws {StorageOperationError} When the provider failure does not confirm absence.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (isConfirmedNotFound(err)) return false;
      throw new StorageOperationError(
        "Storage exists check failed for object key",
        "STORAGE_EXISTS_FAILED",
        err,
      );
    }
  }
}
