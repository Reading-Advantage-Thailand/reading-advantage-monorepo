# Implementation Plan: Storage Package Hardening + Adoption

_Blast radius: `getStorageClient` (0 callers — package currently unconsumed; graph probe 2026-06-11). FR-6 creates the first callers._

## Phase 1: Contract & Schema Definition

- [~] Task 1: Extend `StorageClient` contract in `packages/storage/src/client.ts`
    - [ ] Add `getSignedUploadUrl(key: string, opts?: { expiresIn?: number; contentType?: string }): Promise<string>` to the interface
    - [ ] Update `getSignedUrl` JSDoc: "temporary **read** access"
    - [x] Update `PutOptions.public` JSDoc: "Opt in to a `public-read` object ACL. Default: no ACL header. Prefer bucket-level public access." [evidence: acl-compatibility-verification.md]

- [~] Task 2: Harden `storageConfigSchema`
    - [ ] `.transform` trailing-slash trim on `endpoint` and `publicBaseUrl`
    - [ ] `ProviderNotConfiguredError` constructor accepts optional `fields: string[]` + per-field issue messages (names only, never values); factory passes `result.error` field summaries

- [~] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

---

## Phase 2: Test (Red Phase)

- [~] Task 3: Failing tests — FR-1 signed URL semantics (`packages/storage/src/__tests__/s3-driver.test.ts`)
    - [ ] `getSignedUrl` result contains `X-Amz-SignedHeaders` for a GET (assert via URL inspection or by spying which command class is passed to the presigner)
    - [ ] `getSignedUploadUrl` signs a `PutObjectCommand` (and carries `ContentType` when given)
    - [ ] Confirm fail (Red)

- [x] Task 4: Failing tests — FR-2 ACL default (`s3-driver.test.ts`) [evidence: acl-compatibility-verification.md]
    - [x] `put(key, body)` → command input has **no** `ACL` property
    - [x] `put(key, body, { public: true })` → `ACL: "public-read"`
    - [x] Confirm fail (Red)

- [~] Task 5: Failing tests — FR-3 & FR-4 (`s3-driver.test.ts`)
    - [ ] `exists()` rethrows when HeadObject rejects with `$metadata.httpStatusCode: 403`
    - [ ] `exists()` returns false when rejection is `name: "NotFound"` / 404
    - [ ] `getUrl("a b/c#d.png")` returns encoded path segments
    - [ ] Confirm fail (Red)

- [~] Task 6: Failing tests — FR-5 (`packages/storage/src/__tests__/factory.test.ts`)
    - [ ] Malformed `STORAGE_ENDPOINT` (`"not-a-url"`) → error message names `endpoint`, does not contain the value
    - [ ] `endpoint: "http://localhost:9000/"` → `getUrl("k")` has no `//` in path
    - [ ] Confirm fail (Red)

- [~] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

---

## Phase 3: Implement (Green Phase)

- [~] Task 7: Implement FR-1 in `packages/storage/src/drivers/s3.ts`
    - [x] `getSignedUrl` → `GetObjectCommand` [evidence: existing implementation verified in acl-compatibility-verification.md]
    - [ ] New `getSignedUploadUrl` → `PutObjectCommand` (+ `ContentType`)
    - [ ] Verify Task 3 tests pass (Green)

- [x] Task 8: Implement FR-2 — opt-in ACL [evidence: acl-compatibility-verification.md]
    - [x] `put`: include `ACL: "public-read"` only when `opts?.public === true`
    - [x] Verify Task 4 tests pass (Green)

- [~] Task 9: Implement FR-3 & FR-4
    - [ ] `exists`: narrow catch to 404/NotFound, rethrow otherwise
    - [ ] `getUrl`: encode path segments
    - [ ] Verify Task 5 tests pass (Green)

- [~] Task 10: Implement FR-5 — schema transforms + error diagnostics
    - [ ] Verify Task 6 tests pass (Green)
    - [ ] Update `packages/storage/README.md`: ACL semantics, signed read vs upload URLs, bucket-policy guidance for public objects

- [~] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

---

## Phase 4: Adoption — reading-advantage & primary-advantage (FR-6)

- [~] Task 11: Inventory + URL-parity snapshot
    - [ ] For each of the 10 call-site files, record operation (upload/URL-build/delete), bucket, key pattern, and ACL/public expectations
    - [ ] Capture current public URL format per app; define `STORAGE_PUBLIC_BASE_URL` values that keep emitted URLs byte-identical

- [~] Task 12: Env plumbing
    - [ ] Add `STORAGE_ENDPOINT/REGION/BUCKET/ACCESS_KEY/SECRET_KEY/PUBLIC_BASE_URL` to both apps' `.env.example` with GCS S3-interop + HMAC setup notes
    - [ ] Document the prod Secret Manager provisioning step (ops runbook — not blocking)

- [~] Task 13: Migrate reading-advantage (3 files)
    - [ ] `server/controllers/stories-assistant-controller.ts`, `validator-controller.ts`, `assistant-controller.ts` → `getStorageClient()` operations
    - [ ] Delete `apps/reading-advantage/utils/storage.ts`; remove `@google-cloud/storage` from its `package.json`
    - [ ] App test suite + `check-types` + build pass

- [~] Task 14: Migrate primary-advantage (7 files + URL helper)
    - [ ] `server/models/articleModel.ts`, 4 `server/utils/genaretors/*` files, `lib/test.ts`, `actions/test.ts` → `getStorageClient()` operations
    - [ ] `lib/storage-config.ts` delegates to (or is replaced by) the package's `getStorageUrl`
    - [ ] Delete `apps/primary-advantage/utils/storage.ts`; remove `@google-cloud/storage` from its `package.json`
    - [ ] App test suite + `check-types` + build pass

- [~] Task 15: Adoption verification
    - [ ] `grep -r "@google-cloud/storage"` over both apps returns nothing (source + package.json)
    - [ ] URL parity: sampled keys produce identical public URLs pre/post migration

- [~] Task: Measure - User Manual Verification 'Phase 4: Adoption' (Protocol in workflow.md)

---

## Phase 5: Generate Docs & Doctor

- [~] Task 16: Full suites and quality gates
    - [ ] `CI=true pnpm --filter @reading-advantage/storage test`
    - [ ] `pnpm --filter @reading-advantage/storage check-types && pnpm --filter @reading-advantage/storage lint`
    - [ ] `pnpm --filter reading-advantage check-types` and `pnpm --filter primary-advantage check-types`
    - [ ] Top-level `npm run build` (supervisor gate — both migrated apps must build)

- [~] Task 17: Close the loop in project memory
    - [ ] Update `measure/tech-debt.md`: note adoption completed (F-102 row context)
    - [ ] Lessons-learned candidate: "a shared package without a same-track adoption phase ships as dead code" (apply at retro)

- [~] Task: Measure - User Manual Verification 'Phase 5: Generate Docs & Doctor' (Protocol in workflow.md)
