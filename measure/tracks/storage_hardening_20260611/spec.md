# Specification: Storage Package Hardening + Adoption

## Overview

Close the correctness and security gaps identified in the June 2026 audit of
`packages/storage`, then complete the adoption the original
`storage_package_20260603` track left unfinished: the package currently has
**zero consumers** (graph probe: `getStorageClient` — 0 callers), while
reading-advantage and primary-advantage still each carry their own
`@google-cloud/storage` client (`utils/storage.ts`) across 10 call-site files.

The two serious driver bugs (FR-1, FR-2) must land before adoption — they
would bite the first consumer.

## Functional Requirements

### FR-1: `getSignedUrl` Must Sign a GET, Not a PUT

**Problem:** `drivers/s3.ts:76-82` signs a `PutObjectCommand`. The interface
doc ("temporary access") and the README example
(`storage.getSignedUrl("private/report.pdf", 3600)`) clearly intend read
access — but the produced URL fails for GET and instead grants anyone holding
it the ability to **overwrite** the object. The existing test only asserts
the result is a string, so the bug is invisible.

**Change:**
- `getSignedUrl` signs a `GetObjectCommand`.
- Add a separate `getSignedUploadUrl(key, opts?: { expiresIn?, contentType? })`
  to `StorageClient` for the presigned-upload use case (signs `PutObjectCommand`
  with optional `ContentType` condition).
- Tests assert the signed command type for both methods.

---

### FR-2: Remove the Default `public-read` ACL

**Problem:** `drivers/s3.ts:56` sends `ACL: "public-read"` unless
`opts.public === false`. (a) AWS S3 buckets created since April 2023 have
ACLs disabled by default (Object Ownership = bucket owner enforced) and
reject any PutObject carrying an ACL with `AccessControlListNotSupported`;
Cloudflare R2 — a README-supported provider — does not support the
`public-read` ACL either. A plain `storage.put(key, buf)` therefore fails on
the most likely production backends. (b) Public-by-default is the wrong
security posture for a layer that will hold student-facing files.

**Change:**
- `put` sends **no ACL header by default**.
- `opts.public === true` opts in to `ACL: "public-read"` for backends that
  support it; document that public access should normally come from bucket
  policy / R2 public-bucket config instead.
- `PutOptions.public` JSDoc updated (no longer "defaults to true").
- Non-breaking in practice: the package has zero consumers (FR-6 adds the
  first ones against the new semantics).

---

### FR-3: `exists()` Must Not Swallow Infrastructure Errors

**Problem:** `drivers/s3.ts:101-112` catches every error and returns `false`.
Bad credentials, network failure, or a permissions problem are
indistinguishable from "object missing" — a caller could conclude data is
gone and regenerate/overwrite it during an outage.

**Change:** Return `false` only when the error is a 404
(`error.name === "NotFound"` or `$metadata.httpStatusCode === 404`); rethrow
everything else.

---

### FR-4: `getUrl()` Must URL-Encode the Key

**Problem:** `drivers/s3.ts:66-68` interpolates the raw key. Keys containing
spaces, `#`, `?`, or non-ASCII produce broken or truncated URLs.

**Change:** Encode each path segment
(`key.split("/").map(encodeURIComponent).join("/")`).

---

### FR-5: Configuration Diagnostics and URL Hygiene

**Problems:**
- `ProviderNotConfiguredError` discards the Zod issues — a malformed
  `STORAGE_ENDPOINT` produces the same "set the env vars" message as missing
  vars.
- `publicBaseUrl` fallback `${endpoint}/${bucket}` yields a double slash when
  the endpoint has a trailing slash.

**Changes:**
- `ProviderNotConfiguredError` accepts and includes a field-level summary
  (field names + issue messages only — never values, which include secrets).
- `storageConfigSchema` trims trailing slashes from `endpoint` and
  `publicBaseUrl` via `.transform`.
- `getSignedUrl` test in `s3-driver.test.ts` upgraded per FR-1 (asserts
  command type).

---

### FR-6: Adopt `@reading-advantage/storage` in reading-advantage and primary-advantage

**Problem:** The package's reason to exist — replacing the duplicated
`@google-cloud/storage` usage — never happened. 10 files still use the
app-local GCS clients; primary-advantage additionally hand-rolls a duplicate
`getStorageUrl` in `lib/storage-config.ts`.

**Change:**
- Migrate the 3 reading-advantage files (`server/controllers/
  {stories-assistant,validator,assistant}-controller.ts`) and the 7
  primary-advantage files (`lib/test.ts`, `actions/test.ts`,
  `server/models/articleModel.ts`, `server/utils/genaretors/{audio-word,
  audio-flashcard,image,audio}-generator.ts`) from `utils/storage.ts` to the
  shared `StorageClient`.
- Replace primary-advantage's `lib/storage-config.ts` URL builder with the
  package's `getStorageUrl`.
- Delete both apps' `utils/storage.ts`; remove `@google-cloud/storage` from
  both `package.json`s.
- Add the `STORAGE_*` env vars (GCS S3-interoperability endpoint + HMAC keys)
  to both apps' `.env.example` with setup instructions; local dev uses MinIO
  (per the package README).
- Buckets use uniform bucket-level access for public objects — no per-object
  ACLs (consistent with FR-2).

## Non-Functional Requirements

- Every FR lands with a test that fails before and passes after.
- `packages/storage` keeps ≥ 80% coverage.
- FR-1..5 are pure package changes; FR-6 must not change the public URLs the
  apps emit for existing objects (URL parity verified per app before deleting
  the old helpers).
- Production cutover of env vars (HMAC keys in Secret Manager) is an ops step
  documented in the plan but not blocked on — the code path falls back to
  failing fast with the FR-5 diagnostics if unconfigured.

## Acceptance Criteria

1. A presigned URL from `getSignedUrl` performs an HTTP GET successfully
   against MinIO and cannot PUT; `getSignedUploadUrl` does the inverse.
2. `put(key, body)` with no options sends no ACL header (asserted via
   aws-sdk-client-mock); `put(key, body, { public: true })` sends
   `public-read`.
3. `exists()` rethrows on a simulated 403/500 and returns false only on 404.
4. `getUrl("a b/c#d.png")` returns a URL whose path decodes back to the key.
5. `ProviderNotConfiguredError` for a malformed endpoint names the
   `endpoint` field without leaking any configured value.
6. No file in reading-advantage or primary-advantage imports
   `@google-cloud/storage`; both `utils/storage.ts` files are deleted; both
   apps type-check and build.
7. All `packages/storage` tests pass; suites of both migrated apps pass at
   their pre-track baseline or better.

## Out of Scope

- science-advantage / codecamp-advantage storage usage (neither currently
  stores objects).
- A `list()` operation and multipart upload support (add when a consumer
  needs them).
- Production Secret Manager provisioning of HMAC keys (ops runbook step,
  documented in plan Phase 4).
- www-reading-advantage (static marketing site, no storage).
