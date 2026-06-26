# Line Review Evidence: packages-storage-001

Reviewer: Measure Review B (security and data handling)
Files assigned: 10
Lines assigned: 558

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/storage/README.md | 1-67 | reviewed | 0 |
| packages/storage/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/storage/package.json | 1-37 | reviewed | 0 |
| packages/storage/src/__tests__/factory.test.ts | 1-49 | reviewed | 0 |
| packages/storage/src/__tests__/s3-driver.test.ts | 1-117 | reviewed | 0 |
| packages/storage/src/__tests__/urls.test.ts | 1-26 | reviewed | 0 |
| packages/storage/src/client.ts | 1-73 | reviewed | 0 |
| packages/storage/src/drivers/s3.ts | 1-113 | reviewed | 3 |
| packages/storage/src/factory.ts | 1-59 | reviewed | 0 |
| packages/storage/src/index.ts | 1-14 | reviewed | 0 |

## Findings

### LR-packages-storage-001-001 — getSignedUrl signs PutObjectCommand (upload URL) instead of GetObjectCommand (download URL)

- Severity: Medium
- File: `packages/storage/src/drivers/s3.ts:77-81`
- Evidence: The `getSignedUrl` method constructs a `PutObjectCommand` and passes it to the `@aws-sdk/s3-request-presigner` `getSignedUrl` function. This produces a pre-signed URL that authorizes a PUT (upload) operation, not a GET (download) operation. The README example (`const signedUrl = await storage.getSignedUrl("private/report.pdf", 3600)`) and method JSDoc ("Generate a pre-signed URL for temporary access") suggest this should produce a download URL. The test in `s3-driver.test.ts:79-84` mocks `PutObjectCommand` resolution, confirming the command type is PUT. A caller expecting a download URL would receive an upload-only URL, breaking the documented contract.
- Impact: Callers using this method for generating temporary download links will receive non-functional URLs (PUT signed, not GET). This is a contract mismatch between the documented intent (download) and the implementation (upload).
- Recommendation: Replace `PutObjectCommand` with `GetObjectCommand` at line 77-80 to align implementation with documented download semantics. If both upload and download pre-signed URLs are needed, split into separate `getSignedUploadUrl` and `getSignedDownloadUrl` methods or add a `method` parameter.

### LR-packages-storage-001-002 — exists() catches all errors, masking auth/permission failures as "not found"

- Severity: Low
- File: `packages/storage/src/drivers/s3.ts:109-111`
- Evidence: The `exists` method wraps the `HeadObjectCommand` send in a try/catch that returns `false` for any thrown error (`catch { return false; }`). This indiscriminate catch converts authentication failures (InvalidAccessKeyId, SignatureDoesNotMatch), authorization failures (403 Forbidden), network errors, and genuine NotFound (404) into the same `false` result. The caller cannot distinguish between "object genuinely does not exist" and "the storage client is misconfigured."
- Impact: In production, a misconfigured S3 client or expired credentials would silently report all objects as non-existent, potentially causing data loss or incorrect application behavior (e.g., thinking an upload is needed when the object exists but credentials are wrong).
- Recommendation: Distinguish between `NotFound` (return `false`) and other errors (re-throw or return a typed error). The `@aws-sdk/client-s3` `HeadObjectCommand` throws with a `$metadata.httpStatusCode` property; check for `404` specifically and re-throw other status codes.

### LR-packages-storage-001-003 — Default put ACL is public-read; callers may accidentally expose objects

- Severity: Low
- File: `packages/storage/src/drivers/s3.ts:56`
- Evidence: The `put` method sets `ACL: opts?.public !== false ? "public-read" : "private"`. The default ACL (when `opts` is omitted or `opts.public` is `true`/`undefined`) is `"public-read"`. While the JSDoc on `PutOptions.public` documents "Defaults to true", a default-public approach diverges from the principle of least privilege and increases the risk of accidental data exposure. All other comparable storage adapter conventions (e.g., AWS SDK defaults, `@aws-sdk/client-s3` default) use private-by-default.
- Impact: A developer calling `storage.put("avatars/user-123.jpg", buffer)` without specifying `public: false` will upload the object with public-read ACL, potentially exposing sensitive user data. This is especially risky if the storage bucket is not configured with a default bucket policy blocking public ACLs.
- Recommendation: Change the default to `"private"` and require explicit `public: true` for public objects. Update the `PutOptions.public` JSDoc accordingly. This is a one-line change at `s3.ts:56`: `ACL: opts?.public === true ? "public-read" : "private"`.

## No-Finding Notes

- `packages/storage/README.md`: reviewed line-by-line; documentation-only file, no code logic. Documents env vars including secrets; examples use hardcoded MinIO test credentials (standard for dev docs).
- `packages/storage/eslint.config.mjs`: reviewed line-by-line; single config re-export, no logic.
- `packages/storage/package.json`: reviewed line-by-line; standard package manifest. Dependencies are appropriate (`@aws-sdk/client-s3`, `zod`). No `prepare` or postinstall scripts.
- `packages/storage/src/__tests__/factory.test.ts`: reviewed line-by-line; test-only code. Properly mutates/restores `process.env`. Tests memoization, error cases, and correct driver instantiation.
- `packages/storage/src/__tests__/s3-driver.test.ts`: reviewed line-by-line; test-only code. Uses `aws-sdk-client-mock` for clean S3 mocking. All test values are synthetic. No secrets.
- `packages/storage/src/__tests__/urls.test.ts`: reviewed line-by-line; test-only code. Tests URL construction via the singleton helper.
- `packages/storage/src/client.ts`: reviewed line-by-line; interface definitions and Zod schema. `storageConfigSchema` provides runtime validation for all config fields. `PutOptions` interface is clear. `StorageClient` interface is well-typed and provider-agnostic. No tenant-awareness at this layer (by design; upstream concern per AGENTS.md adapter pattern).
- `packages/storage/src/factory.ts`: reviewed line-by-line; singleton factory with Zod validation of env vars. `resetStorageClient()` available for testing. `ProviderNotConfiguredError` provides clear error message. No secrets logged or exposed in error messages.

## A2 / A6 Audit Notes

- **A2 (consent-blind publish gate):** Not applicable. This batch covers the storage adapter package, which has no publish gate, draft-to-published workflow, or named-subject artifacts.
- **A6 (registry overstatement):** Checked. No `measure/tracks.md` entry claims a "resolved" security state for storage that isn't backed by passing adversarial tests. The tech-debt entry for `F-102 (no storage adapter)` correctly shows `Resolved` with evidence.
