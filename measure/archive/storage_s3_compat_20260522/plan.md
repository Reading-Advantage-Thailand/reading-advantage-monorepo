# Implementation Plan: Shared Storage Package — S3-Compatible Abstraction Layer

> Track Type: Chore (infrastructure/shared package). TDD applies to the storage package and all migrated callers.

## Phase 1: Package Scaffold & Contract Definition

- [ ] Task: Scaffold `packages/storage`
    - [ ] Sub-task: Create `packages/storage/` with `package.json` (`name: @reading-advantage/storage`, ESM, `dist/` exports for `.` and `./client`)
    - [ ] Sub-task: Create `tsconfig.json` extending `@reading-advantage/config`
    - [ ] Sub-task: Create `eslint.config.mjs` extending shared config
    - [ ] Sub-task: Add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` as dependencies; pin version at workspace root
    - [ ] Sub-task: Add `aws-sdk-client-mock` as devDependency
    - [ ] Sub-task: Add package to `pnpm-workspace.yaml` and `turbo.json` build pipeline
- [ ] Task: Define `StorageClient` interface and `StorageConfig` Zod schema
    - [ ] Sub-task: Write `src/types.ts` with `StorageClient` interface, `PutOptions`, `StorageConfig` Zod schema
    - [ ] Sub-task: Write `src/index.ts` barrel exporting types, factory, lazy singleton accessor (`getStorageClient`), and URL helpers — the barrel must be import-safe with no env vars set
    - [ ] Sub-task: Export `StorageConfig` type from `packages/types/`
- [ ] Task: Measure - User Manual Verification 'Scaffold & Contract' (Protocol in workflow.md)

## Phase 2: Tests

- [ ] Task: Write tests for S3 driver
    - [ ] Sub-task: Create `src/__tests__/storage-client.test.ts`
    - [ ] Sub-task: Write failing test: `put()` calls `PutObjectCommand` with correct bucket, key, body, ContentType, and ACL
    - [ ] Sub-task: Write failing test: `put()` with `public: false` omits the public-read ACL
    - [ ] Sub-task: Write failing test: `getSignedUrl()` calls `getSignedUrl` from presigner with correct expiry
    - [ ] Sub-task: Write failing test: `delete()` calls `DeleteObjectCommand` with correct bucket and key
    - [ ] Sub-task: Write failing test: `exists()` returns `true` when `HeadObjectCommand` succeeds, `false` on `NotFound`
- [ ] Task: Write tests for `createStorageClient` factory and `getStorageClient` lazy singleton
    - [ ] Sub-task: Write failing test: factory rejects invalid config (missing bucket, missing credentials) via Zod
    - [ ] Sub-task: Write failing test: factory constructs correct `S3Client` with provided endpoint and credentials
    - [ ] Sub-task: Write failing test: importing the package barrel with **no `STORAGE_*` env vars set** does not throw — the Zod error surfaces only on the first `getStorageClient()` call
    - [ ] Sub-task: Write failing test: `getStorageClient()` memoizes — two calls return the same instance
- [ ] Task: Write tests for URL helpers
    - [ ] Sub-task: Write failing tests for `getStorageUrl`, `getArticleImageUrl`, `getAudioUrl` covering path construction and edge cases (leading slashes, missing bucket env)
- [ ] Task: Measure - User Manual Verification 'Tests Red' (Protocol in workflow.md)

## Phase 3: Implement S3 Driver

- [ ] Task: Implement S3 driver
    - [ ] Sub-task: Create `src/s3-driver.ts` implementing `StorageClient` using `S3Client`, `PutObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`
    - [ ] Sub-task: Implement `getUrl()` as pure URL construction (no network call) using `publicBaseUrl` or derived endpoint + bucket
    - [ ] Sub-task: Implement `getSignedUrl()` using `@aws-sdk/s3-request-presigner`
    - [ ] Sub-task: Run tests — confirm green
- [ ] Task: Implement factory and lazy singleton
    - [ ] Sub-task: Create `src/client.ts` with `createStorageClient(config)` factory and `getStorageClient()` — a lazily-memoized singleton that reads `STORAGE_*` env vars on first call, not at module load
    - [ ] Sub-task: Confirm Zod validation throws on the first `getStorageClient()` call when env vars are missing — and that merely importing the module does not throw
    - [ ] Sub-task: Run full test suite — confirm ≥80% coverage
- [ ] Task: Implement URL helpers
    - [ ] Sub-task: Create `src/url-helpers.ts` with `getStorageUrl`, `getArticleImageUrl`, `getAudioUrl`
    - [ ] Sub-task: Run tests — confirm green
- [ ] Task: Build package and verify exports
    - [ ] Sub-task: `pnpm --filter @reading-advantage/storage build` — confirm `dist/` emits cleanly
    - [ ] Sub-task: Verify `dist/index.d.ts` exports all public types
- [ ] Task: Measure - User Manual Verification 'Driver Implementation' (Protocol in workflow.md)

## Phase 4: App Migration

- [ ] Task: Migrate `reading-advantage` storage usage
    - [ ] Sub-task: Add `@reading-advantage/storage` to `apps/reading-advantage/package.json`
    - [ ] Sub-task: Update all server controllers importing `../utils/storage` or `../utils/uploadToBucket` to import from `@reading-advantage/storage`
    - [ ] Sub-task: Update all generator utilities (`server/utils/generators/`) importing old storage utils
    - [ ] Sub-task: Migrate `utils/deleteStories.ts` — replace `@google-cloud/storage` calls with `getStorageClient().delete()` per-file deletes; if the batch-delete pattern has no clean equivalent, file a tech-debt entry (do not leave a GCS import — AC-2's grep covers this directory)
    - [ ] Sub-task: Delete `apps/reading-advantage/utils/storage.ts` and `apps/reading-advantage/utils/uploadToBucket.ts`
    - [ ] Sub-task: Remove `@google-cloud/storage` from `apps/reading-advantage/package.json`
- [ ] Task: Migrate `primary-advantage` storage usage
    - [ ] Sub-task: Add `@reading-advantage/storage` to `apps/primary-advantage/package.json`
    - [ ] Sub-task: Update all server generators (`server/utils/genaretors/` — sic, the directory really is spelled `genaretors` in primary-advantage; do not "correct" it) importing old storage utils
    - [ ] Sub-task: Update `server/models/articleModel.ts` and any other callers
    - [ ] Sub-task: Delete `apps/primary-advantage/utils/storage.ts` and `apps/primary-advantage/lib/storage-config.ts`
    - [ ] Sub-task: Remove `@google-cloud/storage` from `apps/primary-advantage/package.json`
- [ ] Task: Verify no remaining GCS SDK imports
    - [ ] Sub-task: `grep -r "@google-cloud/storage" packages/ apps/reading-advantage/ apps/primary-advantage/` — expect zero matches outside `node_modules`
- [ ] Task: Measure - User Manual Verification 'App Migration' (Protocol in workflow.md)

## Phase 5: Documentation & Cleanup

- [ ] Task: Write package README
    - [ ] Sub-task: Document `StorageClient` interface and factory usage
    - [ ] Sub-task: Document GCS HMAC key setup (enable interoperability in GCS console → create HMAC keys → map to `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`). Note this is an ops/admin step needing GCS console access, outside the codebase — the package itself is fully verifiable against MinIO locally without it.
    - [ ] Sub-task: Document Cloudflare R2 config (endpoint pattern, `publicBaseUrl` for public bucket)
    - [ ] Sub-task: Document MinIO local dev setup (add MinIO service to `docker-compose.yml`, env var values)
- [ ] Task: Add MinIO to `docker-compose.yml` for local dev
    - [ ] Sub-task: Add `minio` service (image: `minio/minio`, port 9000/9001, env vars, volume)
    - [ ] Sub-task: Add `mc` one-shot container to create default bucket on startup
- [ ] Task: Update project metadata
    - [ ] Sub-task: Update `tech-stack.md` — add `@reading-advantage/storage` row under Backend & Data, note S3-compatible abstraction pattern and provider matrix
    - [ ] Sub-task: Close tech-debt items resolved by this track (if any)
- [ ] Task: Final regression sweep
    - [ ] Sub-task: `pnpm --filter @reading-advantage/storage test`
    - [ ] Sub-task: `pnpm --filter reading-advantage build` (or type-check if build is slow)
    - [ ] Sub-task: `pnpm --filter primary-advantage build` (or type-check)
- [ ] Task: Measure - User Manual Verification 'Docs & Cleanup' (Protocol in workflow.md)
