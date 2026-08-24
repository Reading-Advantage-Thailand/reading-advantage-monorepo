# Implementation Plan: Storage Hardening and Floci Verification

_Rebased 2026-08-24 against the current adapter, consumers, Compose stack, and
CI workflow._

## Phase 0: Rebaseline and Preserve Accepted Work

- [x] Task 0.1: Reclassify the original requirements against current code.
  - [x] Record signed GET semantics as complete.
  - [x] Preserve the accepted ACL evidence and commit `2bf39841f`.
  - [x] Record `exists`, URL, and diagnostics work as open.
- [x] Task 0.2: Correct the adoption scope.
  - [x] Record current Sales, Accounting, Reading, and Marketing consumers.
  - [x] Remove the stale zero-consumer claim.
  - [x] Defer Reading and Primary GCS cutovers under the portfolio hold policy.
- [x] Task 0.3: Select Floci for local and CI S3 verification.
  - [x] Pin Floci 1.7.0 in the specification.
  - [x] Select shared Compose and CI services instead of Testcontainers.
  - [x] Record the decision in `measure/tech-stack.md`.
- [x] Task 0.4: Update track metadata and the tracks registry.

## Phase 1: Signed Read Baseline and Existence Errors

- [ ] Task 1.1: Lock the accepted signed-read behavior with a unit test.
  - [ ] Assert that `getSignedUrl` passes `GetObjectCommand` to the presigner.
  - [ ] Confirm that the current implementation passes this regression test.
- [ ] Task 1.2: Add failing `exists()` classification tests and confirm Red.
  - [ ] Return `false` for `NotFound` and HTTP 404 responses.
  - [ ] Normalize HTTP 403 and 500 responses as `STORAGE_EXISTS_FAILED`.
  - [ ] Normalize a network failure as `STORAGE_EXISTS_FAILED`.
  - [ ] Assert that the normalized error retains the provider cause.
  - [ ] Command: `CI=true pnpm --filter @reading-advantage/storage test`
- [ ] Task 1.3: Implement provider-neutral `exists()` errors and confirm Green.
  - [ ] Return `false` only for confirmed not-found responses.
  - [ ] Throw `StorageOperationError` for all other failures.
  - [ ] Use the code `STORAGE_EXISTS_FAILED`.
  - [ ] Command: `CI=true pnpm --filter @reading-advantage/storage test`

## Phase 2: URL and Configuration Hardening

- [ ] Task 2.1: Add failing URL construction tests and confirm Red.
  - [ ] Encode spaces, `#`, `?`, percent signs, and Unicode per path segment.
  - [ ] Preserve key path separators.
  - [ ] Cover direct driver, explicit factory, and environment factory paths.
- [ ] Task 2.2: Implement URL encoding and slash normalization, then confirm Green.
  - [ ] Encode each key segment.
  - [ ] Normalize endpoint and public-base trailing slashes.
  - [ ] Apply normalization through every public construction path.
- [ ] Task 2.3: Add failing configuration diagnostic tests and confirm Red.
  - [ ] Name each invalid field.
  - [ ] Exclude every configured value from the error message.
  - [ ] Cover malformed endpoint and public-base URLs.
  - [ ] Cover environment and explicit factories.
- [ ] Task 2.4: Implement safe configuration diagnostics and confirm Green.
  - [ ] Pass field-level Zod issues to `ProviderNotConfiguredError`.
  - [ ] Include field names and issue messages only.
  - [ ] Keep all configured values out of the message.
- [ ] Task 2.5: Run focused package verification.
  - [ ] `CI=true pnpm --filter @reading-advantage/storage test`
  - [ ] `pnpm --filter @reading-advantage/storage check-types`
  - [ ] `pnpm --filter @reading-advantage/storage lint`

## Phase 3: Floci Local Development and Integration Tests

- [ ] Task 3.1: Write the Floci integration contract before infrastructure.
  - [ ] Add `s3-driver.integration.test.ts`.
  - [ ] Add a dedicated Vitest integration configuration.
  - [ ] Add `test:integration` to `packages/storage/package.json`.
  - [ ] Keep integration files outside the normal unit-test selection.
  - [ ] Use a bounded readiness retry and a unique test bucket.
  - [ ] Confirm the command fails because no declared Floci service exists.
- [ ] Task 3.2: Add the pinned local Floci service.
  - [ ] Add `docker.io/floci/floci:1.7.0-compat` to `docker-compose.yml`.
  - [ ] Publish port 4566.
  - [ ] Set `hybrid` storage and `/app/data` as the persistent path.
  - [ ] Mount a named volume at `/app/data`.
  - [ ] Mount `docker/floci/init/ready.d` at `/etc/floci/init/ready.d`.
  - [ ] Enable signature validation with the SDK test secret.
  - [ ] Wait for the `/_floci/init` ready phase in the health check.
  - [ ] Do not mount the Docker socket.
- [ ] Task 3.3: Add idempotent local bucket initialization.
  - [ ] Create `sales-advantage` only when absent.
  - [ ] Create `accounting` only when absent.
  - [ ] Verify repeated startup succeeds.
  - [ ] Verify both buckets after each startup.
- [ ] Task 3.4: Confirm the integration contract Green against local Floci.
  - [ ] Command: `docker compose up -d --wait floci`
  - [ ] Command: `CI=true pnpm --filter @reading-advantage/storage test:integration`
  - [ ] Verify put, exists, signed GET, byte parity, delete, and absence.
  - [ ] Change the signature and verify access fails.
  - [ ] Verify the command through the repository's Docker-compatible CLI.

## Phase 4: Developer Configuration and CI

- [ ] Task 4.1: Replace local MinIO examples with Floci examples.
  - [ ] Update `packages/storage/README.md`.
  - [ ] Update `apps/sales-advantage/.env.example`.
  - [ ] Update `apps/accounting/.env.example`.
  - [ ] Document `http://localhost:4566`, `us-east-1`, and test credentials.
- [ ] Task 4.2: Add explicit storage gates to the existing CI workflow.
  - [ ] Add `docker-compose.yml` and `docker/floci/**` to path filters.
  - [ ] Start pinned Floci 1.7.0 in memory mode.
  - [ ] Enable signature validation with the SDK test secret.
  - [ ] Run the storage unit command.
  - [ ] Run the storage integration command.
  - [ ] Keep the existing root test command unchanged.
- [ ] Task 4.3: Verify container independence and reproducibility.
  - [ ] Stop Floci and run normal storage unit tests.
  - [ ] Start Floci twice and verify idempotent bucket setup.
  - [ ] Confirm no mutable Floci image tag exists in changed files.
  - [ ] Confirm no Testcontainers dependency exists.
- [ ] Task 4.4: Add and run final package coverage and infrastructure gates.
  - [ ] Add the catalog `@vitest/coverage-v8` development dependency.
  - [ ] Add a storage `test:coverage` command with an 80 percent threshold.
  - [ ] `CI=true pnpm --filter @reading-advantage/storage test`
  - [ ] `CI=true pnpm --filter @reading-advantage/storage test:coverage`
  - [ ] `CI=true pnpm --filter @reading-advantage/storage test:integration`
  - [ ] `pnpm --filter @reading-advantage/storage check-types`
  - [ ] `pnpm --filter @reading-advantage/storage lint`
  - [ ] `docker compose config`

## Phase 5: Review and Acceptance

- [ ] Task 5.1: Run independent correctness and security reviews.
  - [ ] Review signed method coverage and tamper rejection.
  - [ ] Review error classification and secret-safe diagnostics.
  - [ ] Review container isolation and pinned dependencies.
  - [ ] Review whether tests exercise the production driver.
- [ ] Task 5.2: Record residual emulator limits.
  - [ ] State that Floci does not prove production IAM or bucket policy behavior.
  - [ ] Preserve the accepted live GCS evidence for private uploads.
- [ ] Task 5.3: Complete Measure phase acceptance and closeout.
