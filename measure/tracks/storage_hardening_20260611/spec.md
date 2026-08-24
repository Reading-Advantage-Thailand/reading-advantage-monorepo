# Specification: Storage Hardening and Floci Verification

## Overview

This track hardens the shared S3 adapter and adds local protocol verification.
The 2026-08-24 rebaseline replaces assumptions from the original 2026-06-11
specification.

The adapter now has production consumers. Sales stores roleplay audio,
Accounting stores private evidence, and Reading uses the adapter for cleanup.
Marketing also re-exports the shared factory.

Local development has no declared S3 service. Current examples reference MinIO
on port 9000, but `docker-compose.yml` does not provide MinIO.

Floci 1.7.0 will provide the local and CI S3 protocol boundary. It supports the
operations used by `StorageClient` and accepts the driver's path-style requests.

## Rebaseline

### Completed Work

1. `getSignedUrl` signs `GetObjectCommand`. The original overwrite-capable URL
   defect is fixed in `packages/storage/src/drivers/s3.ts`.
2. Private and default uploads omit object ACLs. Commit `2bf39841f` completed
   this change with focused tests and live GCS evidence.
3. Provider errors from `put`, `delete`, and `getSignedUrl` become
   `StorageOperationError` instances.
4. New consumers disproved the original zero-consumer claim.

### Open Work

1. `exists()` returns `false` for every provider failure.
2. `getUrl()` does not encode object-key path segments.
3. Configuration errors do not identify invalid fields.
4. Endpoint and public-base trailing slashes can produce malformed URLs.
5. Storage package tests do not run in the current root CI test step.
6. The repository has no local S3-compatible service.
7. The adapter has no emulator-backed lifecycle test.

### Scope Correction

The original Reading and Primary migration is deferred. Both apps retain live
legacy GCS dependencies, and the portfolio policy holds legacy cutovers behind
product need and explicit approval.

This track does not remove `@google-cloud/storage` from either legacy app. It
also does not rewrite their existing public object URLs.

## Functional Requirements

### FR-1: Preserve Signed Read Semantics

`getSignedUrl` must continue to sign `GetObjectCommand` for temporary reads.
Unit tests must assert the command type. The Floci lifecycle test must fetch the
stored bytes through the signed URL.

Floci verification must enable signature validation. A signed request must
succeed, and the same URL with a changed signature must fail.

This track will not add `getSignedUploadUrl`. No current consumer requires that
capability.

### FR-2: Preserve Private-By-Default Uploads

`put(key, body)` and `put(key, body, { public: false })` must omit the ACL
header. `{ public: true }` remains an explicit legacy ACL option.

The accepted evidence remains
`acl-compatibility-verification.md` and commit `2bf39841f`.

### FR-3: Distinguish Missing Objects From Provider Failures

`exists()` must return `false` only for a confirmed HTTP 404 or equivalent
not-found provider response.

Authentication, authorization, network, and service failures must throw
`StorageOperationError` with code `STORAGE_EXISTS_FAILED`. The original provider
error must remain available as the cause.

### FR-4: Produce Safe Public URLs

`getUrl()` must encode each object-key path segment. It must preserve slash
separators between segments.

Endpoint and public-base configuration must remove trailing slashes before URL
construction. The result must contain one separator before the bucket and key.

Both `getStorageClient()` and `createStorageClient()` must apply the same
validation and normalization. Direct `S3StorageDriver` construction must not
bypass URL normalization.

### FR-5: Report Safe Configuration Diagnostics

`ProviderNotConfiguredError` must identify invalid configuration fields. The
message must not include configured values.

Diagnostics may include Zod issue messages and field names. They must not expose
access keys, secret keys, endpoint values, bucket names, or public URLs.

### FR-6: Provide Floci for Local Development

The root Compose stack must provide Floci at `http://localhost:4566`.

The local image must use the pinned
`docker.io/floci/floci:1.7.0-compat` reference. The full image name supports the
repository's Docker and rootless Podman environments.

Local Floci must use a named volume and `hybrid` storage mode. An idempotent
ready hook must create only these active local buckets:

- `sales-advantage`
- `accounting`

Compose must mount the volume at `/app/data`. It must set
`FLOCI_STORAGE_PERSISTENT_PATH=/app/data` and mount ready hooks at
`/etc/floci/init/ready.d`.

The health check must wait for the `/_floci/init` ready phase. A successful port
connection alone is insufficient.

S3 runs inside Floci, so the service must not mount the Docker socket.
Application code must not create buckets automatically.

### FR-7: Add Emulator-Backed Integration Tests

The storage package must have a separate Vitest integration command. Normal
unit tests must not require Docker, Podman, Floci, or a fixed host port.

The integration suite must connect through a declared Floci endpoint. It must
create a unique bucket and verify this lifecycle through `S3StorageDriver`:

1. Upload an object with a content type.
2. Confirm that the object exists.
3. Read the object through a signed URL.
4. Compare the returned bytes.
5. Delete the object.
6. Confirm that the object no longer exists.
7. Change the signed URL signature and confirm that access fails.

The suite may use the AWS SDK directly for test setup and cleanup. Production
application code must continue to use the shared storage adapter.

The test service must set `FLOCI_AUTH_VALIDATE_SIGNATURES=true`. Its presign
secret must match the SDK test secret.

### FR-8: Run Storage Tests in CI

The existing CI workflow must run storage unit and integration commands
explicitly. The root `pnpm test` command currently runs only four Codecamp
tests, so it cannot provide this gate.

CI must use pinned Floci 1.7.0 in memory mode. The integration harness must use
a bounded readiness retry instead of a fixed sleep.

The workflow path filter must include `docker-compose.yml` and `docker/floci/**`.

## Non-Functional Requirements

- Keep AWS SDK imports inside the storage driver and test files.
- Keep the existing provider-neutral `StorageClient` contract.
- Keep normal package unit tests independent from containers.
- Pin Floci image versions. Do not use `latest`.
- Do not add `@floci/testcontainers` in this track.
- Keep Floci test data ephemeral in CI.
- Keep local Floci state inside a named Compose volume.
- Maintain at least 80 percent coverage for changed package code.
- Add and run an explicit storage coverage command.

## Acceptance Criteria

1. `exists()` returns `false` for 404 responses.
2. `exists()` normalizes 403, 500, and network failures.
3. `getUrl("a b/c#d.png")` returns encoded path segments.
4. Trailing configuration slashes do not create duplicate separators.
5. Configuration diagnostics name invalid fields without values.
6. Explicit and environment factories apply identical URL normalization.
7. `docker compose up -d floci` starts the pinned local service.
8. Local startup creates the Sales and Accounting buckets idempotently.
9. The Floci integration lifecycle passes through the production driver.
10. A changed signed URL signature fails against Floci.
11. Normal storage unit tests pass without a running container service.
12. CI runs both storage test commands before its existing root test step.
13. Storage unit, coverage, type, lint, and integration gates pass.

## Out of Scope

- Reading Advantage or Primary Advantage GCS migration.
- Removal of hardcoded legacy GCS public URLs.
- A generic object `get()` method.
- Signed upload URLs.
- Object listing or multipart upload APIs.
- Production bucket provisioning or secret management.
- Real-provider IAM, CORS, lifecycle, encryption, or retention verification.
- Testcontainers adoption.
- Application upload-limit, retention, or orphan-cleanup changes.
