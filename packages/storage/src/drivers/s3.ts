import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";
import type { StorageClient, PutOptions } from "../client.js";
import type { StorageConfig } from "../client.js";

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
      ACL: opts?.public !== false ? "public-read" : "private",
    });
    await this.client.send(command);
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
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete an object from S3.
   * @param key The object key.
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  /**
   * Check whether an object exists in S3.
   * @param key The object key.
   * @returns True if the object exists.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
