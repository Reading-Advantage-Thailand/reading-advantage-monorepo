# @reading-advantage/storage

S3-compatible storage adapter for the Reading Advantage monorepo.

## Supported Providers

| Provider | Endpoint | Notes |
|----------|----------|-------|
| AWS S3 | `https://s3.amazonaws.com` | Default |
| GCS (S3 interop) | `https://storage.googleapis.com` | Enable "Cloud Storage Interoperability" in GCS console, create HMAC keys |
| Cloudflare R2 | `https://<accountId>.r2.cloudflarestorage.com` | Set `publicBaseUrl` to R2 public bucket URL |
| MinIO | `http://localhost:9000` | Local dev |

## Usage

```ts
import { getStorageClient, getStorageUrl } from "@reading-advantage/storage";

// Get the lazily-initialized singleton
const storage = getStorageClient();

// Upload
await storage.put("avatars/user-123.jpg", imageBuffer, { contentType: "image/jpeg" });

// Get public URL
const url = storage.getUrl("avatars/user-123.jpg");

// Generate pre-signed URL
const signedUrl = await storage.getSignedUrl("private/report.pdf", 3600);

// Check existence
const exists = await storage.exists("avatars/user-123.jpg");

// Delete
await storage.delete("avatars/user-123.jpg");

// URL helper (uses singleton)
const imgUrl = getStorageUrl("path/to/file.jpg");
```

## Configuration

Set these environment variables:

| Env Var | Required | Description |
|---------|----------|-------------|
| `STORAGE_ENDPOINT` | Yes | S3-compatible endpoint URL |
| `STORAGE_REGION` | Yes | Region (use `"auto"` for R2/MinIO) |
| `STORAGE_BUCKET` | Yes | Bucket name |
| `STORAGE_ACCESS_KEY` | Yes | Access key ID |
| `STORAGE_SECRET_KEY` | Yes | Secret access key |
| `STORAGE_PUBLIC_BASE_URL` | No | Override constructed URL for CDN/custom domain |

## Testing

```ts
import { createStorageClient } from "@reading-advantage/storage";

// Use with explicit config for tests
const client = createStorageClient({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  bucket: "test-bucket",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
});
```
