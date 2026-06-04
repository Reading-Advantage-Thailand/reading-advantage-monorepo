# Plan: Shared `packages/storage` + GitHub Integration

> TDD-first. The StorageClient interface is inherited from the in-flight `storage_s3_compat_20260522` track; this plan adds the GitHub integration extraction.

## Phase 0: Setup

- [ ] Task: Coordinate with the in-flight `storage_s3_compat_20260522` track; inherit the `StorageClient` design.
- [ ] Task: Confirm `packages/storage/` does not exist today. Initialize the package.
- [ ] Task: Confirm `packages/integrations/` does not exist today. Initialize.

## Phase 1: `packages/storage` Foundation (inherited from prior track)

- [ ] Task: Create `packages/storage/package.json`, `tsconfig.json`, `src/index.ts` barrel.
- [ ] Task: Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to `dependencies`. Pin to the workspace catalog version.
- [ ] Task: Add `aws-sdk-client-mock` to `devDependencies` for tests.

### Phase 1a: `StorageClient` Interface

- [ ] Task: Create `packages/storage/src/client.ts` with the `StorageClient` interface (FR-1).
- [ ] Task: Write failing tests: a `MockStorageClient` test double implements the interface; verify it satisfies the type.
- [ ] Task: Confirm.

### Phase 1b: S3 Driver

- [ ] Task: Create `packages/storage/src/drivers/s3.ts` implementing `StorageClient` with `@aws-sdk/client-s3`.
- [ ] Task: Constructor takes `StorageConfig` (Zod-validated). No `process.env` reads.
- [ ] Task: Write failing tests using `aws-sdk-client-mock`:
  - `put(key, body, opts)` → mock asserts `PutObjectCommand` is called with right args.
  - `getUrl(key)` → returns the constructed public URL.
  - `getSignedUrl(key, expiresIn)` → mock returns a presigned URL.
  - `delete(key)` → mock asserts `DeleteObjectCommand` is called.
  - `exists(key)` → mock returns true for a present key, false for a missing one.
- [ ] Task: Implement. Confirm tests pass.

### Phase 1c: Factory & Lazy Singleton

- [ ] Task: Create `packages/storage/src/factory.ts` with `createStorageClient(config)` and `getStorageClient()`.
- [ ] Task: `getStorageClient()` reads env vars on first call; subsequent calls return the memoized instance.
- [ ] Task: Write failing tests:
  - `getStorageClient()` with no env vars in `NODE_ENV='production'` throws `ProviderNotConfiguredError`.
  - `getStorageClient()` with `STORAGE_*` env vars returns the S3 driver.
  - 2 consecutive `getStorageClient()` calls return the same instance (memoization).
- [ ] Task: Confirm.

### Phase 1d: URL Helpers

- [ ] Task: Create `packages/storage/src/urls.ts` with `getStorageUrl(key)`, `getAudioUrl(path)`, etc.
- [ ] Task: Write tests: each helper returns the expected URL pattern.
- [ ] Task: Confirm.

## Phase 2: `packages/integrations/github` Foundation

- [ ] Task: Create `packages/integrations/github/package.json`, `tsconfig.json`, `src/index.ts` barrel.
- [ ] Task: Add `zod` to `dependencies` for response validation.

### Phase 2a: `GitHubClient` Interface

- [ ] Task: Create `packages/integrations/github/src/client.ts` with the `GitHubClient` interface (FR-5).
- [ ] Task: Write failing tests: a `MockGitHubClient` test double implements the interface.
- [ ] Task: Confirm.

### Phase 2b: GitHub Driver (thin fetch wrapper)

- [ ] Task: Create `packages/integrations/github/src/drivers/rest.ts` implementing `GitHubClient` with a `fetch` wrapper.
- [ ] Task: Constructor takes `{ appId, privateKey, installationId? }`. No `process.env` reads.
- [ ] Task: `getPracticeIssues` calls `GET https://api.github.com/repos/{owner}/{repo}/issues` with the right headers and Zod-validates the response.
- [ ] Task: `getInstallationTokenForRepo` calls `POST https://api.github.com/app/installations/{installationId}/access_tokens` and returns the token.
- [ ] Task: Write failing tests using `msw` (Mock Service Worker) or a custom `fetch` mock:
  - `getPracticeIssues('codecamp', 'm1-intro')` → mock returns a list of issues; client parses and Zod-validates.
  - `getPracticeIssues` with invalid response (e.g. 404) → throws `GitHubClientError`.
  - `getInstallationTokenForRepo('codecamp', 'm1-intro')` → mock returns `{ token: '...' }`; client returns the token.
- [ ] Task: Confirm.

### Phase 2c: Lazy Singleton

- [ ] Task: Create `packages/integrations/github/src/factory.ts` with `getGitHubClient()` lazy singleton.
- [ ] Task: Reads `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID` on first call.
- [ ] Task: Write tests similar to Phase 1c.
- [ ] Task: Confirm.

## Phase 3: Refactor `packages/domain/src/codecamp/index.ts:1952`

- [ ] Task: Write failing test for the new `getPracticeIssues(input: { owner, repo, options? })` function: returns parsed issues via `getGitHubClient().getPracticeIssues(...)`.
- [ ] Task: Replace the inline `fetch` in `packages/domain/src/codecamp/index.ts:1946-1969` with `getGitHubClient().getPracticeIssues(input.owner, input.repo, input.options)`.
- [ ] Task: **Remove the `next: { revalidate: 300 }` cast.** The cache semantics move to the caller.
- [ ] Task: Update the function's signature: `getPracticeIssues(input: { owner: string; repo: string; options?: { state?: 'open' | 'closed' | 'all'; labels?: string[]; perPage?: number } }): Promise<PracticeIssue[]>`.
- [ ] Task: Run `pnpm turbo run test --filter=codecamp-advantage`; the existing tests should still pass (the cache may be applied at the route layer; the domain function returns a plain value).
- [ ] Task: At the route layer (`apps/codecamp-advantage/app/api/...`), wrap the call with the standard `fetch`-style revalidation if needed. Document the move in a code comment.

## Phase 4: Remove Direct SDK Deps

- [ ] Task: For any app that imported `@google-cloud/storage` (currently 0 in `apps/science-advantage/`), remove the import.
- [ ] Task: Grep gate: `rg "@google-cloud/storage" packages/ apps/` returns 0 hits.
- [ ] Task: For science-advantage, remove the `GOOGLE_CLOUD_*` vars from `.env.example` (F-102 latent). If the maintainer wants to keep them, wire them through `packages/storage`.
- [ ] Task: For codecamp-advantage, add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID` to `.env.example` if not already.

## Phase 5: Update Docs

- [ ] Task: Update `apps/science-advantage/docs/archive/architecture/external-apis.md:62,195` to reference `@reading-advantage/storage` (not the non-existent `@google-cloud/storage` SDK).
- [ ] Task: Update `tech-stack.md` to note `@reading-advantage/storage` and `@reading-advantage/integrations/github` in the Shared Packages section.
- [ ] Task: Write `packages/storage/README.md` with config examples (GCS, R2, MinIO).
- [ ] Task: Write `packages/integrations/github/README.md` with auth flow + usage examples.

## Phase 6: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-102, F-703 `Resolved`.
- [ ] Task: Coordinate with the in-flight `storage_s3_compat_20260522` track: this track supersedes it for science-advantage; the prior track's reading + primary migration continues.
- [ ] Task: Add a lessons-learned entry: "Domain functions must not carry transport concerns (fetch, headers, revalidation); move them to the caller."
- [ ] Task: Move track to `measure/archive/storage_package_20260603/` and update `measure/tracks.md`.
