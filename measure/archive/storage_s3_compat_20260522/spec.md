# Specification: Shared Storage Package — S3-Compatible Abstraction Layer

## Overview

Create `packages/storage` (`@reading-advantage/storage`) — a thin, provider-agnostic file storage package that exposes a unified `StorageClient` interface backed by `@aws-sdk/client-s3`. This package replaces the duplicated, GCS-SDK-specific `utils/storage.ts` files in `reading-advantage` and `primary-advantage` with a single shared implementation that works against any S3-compatible backend:

| Backend | When | Endpoint |
|---|---|---|
| GCS (current) | Prod today | `https://storage.googleapis.com` via S3 interoperability + HMAC keys |
| Cloudflare R2 (target) | Future migration | `https://<accountId>.r2.cloudflarestorage.com` |
| MinIO | Local dev | `http://localhost:9000` |

The migration is a **config change, not a code change** — swapping backends requires only updating environment variables.

This track covers the `packages/storage` package and migration of `reading-advantage` and `primary-advantage`. Science-advantage storage is deferred (minimal usage, separate per-app track).

## Current State

Two duplicate, GCS-only storage implementations exist:

- `apps/reading-advantage/utils/storage.ts` — raw `@google-cloud/storage` client, hardcoded bucket `artifacts.reading-advantage.appspot.com`
- `apps/reading-advantage/utils/uploadToBucket.ts` — wraps the above
- `apps/primary-advantage/utils/storage.ts` — raw `@google-cloud/storage` client with `uploadToBucket`, `deleteFile` helpers
- `apps/primary-advantage/lib/storage-config.ts` — hardcoded `storage.googleapis.com` URL builder

These are imported by ~20 server controllers and generator utilities across both apps.

## Functional Requirements

### FR-1: `StorageClient` Interface

```ts
export interface StorageClient {
  put(key: string, body: Buffer | Uint8Array | Readable, opts?: PutOptions): Promise<void>
  getUrl(key: string): string              // public URL (no network call)
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

export interface PutOptions {
  contentType?: string
  public?: boolean   // default: true (sets public-read ACL or equivalent)
}
```

### FR-2: S3 Driver

- Implemented with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- `StorageConfig` Zod schema:
  ```ts
  { endpoint: string; region: string; bucket: string;
    accessKeyId: string; secretAccessKey: string; publicBaseUrl?: string }
  ```
- `publicBaseUrl` overrides the constructed URL for CDN or custom domain use
- GCS: enable "Cloud Storage Interoperability" in GCS console, create HMAC keys
- R2: use `https://<accountId>.r2.cloudflarestorage.com`; set `publicBaseUrl` to R2 public bucket URL or custom domain

### FR-3: Factory & Lazy Singleton

- `createStorageClient(config: StorageConfig): StorageClient`
- `getStorageClient(): StorageClient` — lazily constructs and memoizes a singleton on the **first call**, reading and Zod-validating env vars at that point. Env vars must **not** be read or validated at module load: a throw at import time would break builds, test runs, and any file that imports the package barrel without using storage. A misconfiguration surfaces on first real use instead.
  - `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`
  - `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
  - `STORAGE_PUBLIC_BASE_URL` (optional)

### FR-4: URL Helper Utilities

Absorbs `apps/primary-advantage/lib/storage-config.ts` into the shared package:

- `getStorageUrl(key: string): string`
- `getArticleImageUrl(articleId: string, n: 1 | 2 | 3): string`
- `getAudioUrl(path: string): string`

Helpers are pure functions — they construct URLs from config without network calls.

### FR-5: Migration of Existing Usage

- Delete `apps/reading-advantage/utils/storage.ts`
- Delete `apps/reading-advantage/utils/uploadToBucket.ts`
- Delete `apps/primary-advantage/utils/storage.ts`
- Delete `apps/primary-advantage/lib/storage-config.ts`
- Migrate `apps/reading-advantage/utils/deleteStories.ts`: replace its direct `@google-cloud/storage` calls with `getStorageClient().delete()` per-file deletes. If its batch-delete pattern has no clean `StorageClient` equivalent, file a tech-debt entry — do not leave a `@google-cloud/storage` import behind (AC-2's grep covers `apps/reading-advantage/utils/`).
- Update all server controllers, generators, and utilities in both apps to import from `@reading-advantage/storage`
- Env var mapping: existing `SERVICE_ACCOUNT_KEY` / `PROJECT_ID` (reading-advantage) and `STORAGE_CLIENT_EMAIL` / `STORAGE_PRIVATE_KEY` / `STORAGE_BUCKET_NAME` (primary-advantage) replaced by the unified `STORAGE_*` vars. Document migration in package README.

## Non-Functional Requirements

- Zero `@google-cloud/storage` imports in any `packages/` directory
- Single `@aws-sdk/client-s3` version pinned at workspace root (`pnpm-workspace.yaml` catalog or root `package.json`)
- Package is pure ESM, exports `./` and `./client` subpaths
- Tests use `@aws-sdk/client-s3`'s built-in `mockClient` helper (via `aws-sdk-client-mock`) — no real network calls
- New package follows existing monorepo conventions: `dist/` output, `.js` extensions in imports, `tsconfig.json` extends shared config

## Acceptance Criteria

1. `packages/storage` builds (`pnpm --filter @reading-advantage/storage build`) and exports `StorageClient`, `createStorageClient`, `getStorageClient`, URL helpers
2. `grep -r "@google-cloud/storage" packages/ apps/reading-advantage/utils/ apps/primary-advantage/utils/ apps/primary-advantage/lib/storage-config.ts` returns zero matches
3. `apps/reading-advantage/utils/storage.ts`, `uploadToBucket.ts`, `apps/primary-advantage/utils/storage.ts`, and `lib/storage-config.ts` are deleted
4. All server controllers and generators in both apps import storage utilities from `@reading-advantage/storage`
5. `pnpm --filter @reading-advantage/storage test` passes with ≥80% coverage
6. Package README documents GCS HMAC key setup, R2 config, and MinIO local dev setup
7. `tech-stack.md` updated to note `@reading-advantage/storage` and S3-compatible backend pattern

## Out of Scope

- Science-advantage storage migration (deferred to per-app track — minimal usage)
- Browser-side direct upload (presigned upload URLs are a future enhancement)
- Multipart upload support
- CDN integration / image transformation
