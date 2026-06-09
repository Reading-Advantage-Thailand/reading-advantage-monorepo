# Plan: Shared `packages/storage` + GitHub Integration

> TDD-first. The StorageClient interface is inherited from the in-flight `storage_s3_compat_20260522` track; this plan adds the GitHub integration extraction.

## Phase 0: Setup

- [x] Task: Coordinate with the in-flight `storage_s3_compat_20260522` track; inherit the `StorageClient` design.
- [x] Task: Confirm `packages/storage/` does not exist today. Initialize the package.
- [x] Task: Confirm `packages/integrations/` does not exist today. Initialize.

## Phase 1: `packages/storage` Foundation (inherited from prior track)

- [x] Task: Create `packages/storage/package.json`, `tsconfig.json`, `src/index.ts` barrel.
- [x] Task: Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to `dependencies`. Pin to the workspace catalog version.
- [x] Task: Add `aws-sdk-client-mock` to `devDependencies` for tests.

### Phase 1a: `StorageClient` Interface

- [x] Task: Create `packages/storage/src/client.ts` with the `StorageClient` interface (FR-1).
- [x] Task: Write failing tests: a `MockStorageClient` test double implements the interface; verify it satisfies the type.
- [x] Task: Confirm.

### Phase 1b: S3 Driver

- [x] Task: Create `packages/storage/src/drivers/s3.ts` implementing `StorageClient` with `@aws-sdk/client-s3`.
- [x] Task: Constructor takes `StorageConfig` (Zod-validated). No `process.env` reads.
- [x] Task: Write failing tests using `aws-sdk-client-mock`:
  - `put(key, body, opts)` → mock asserts `PutObjectCommand` is called with right args.
  - `getUrl(key)` → returns the constructed public URL.
  - `getSignedUrl(key, expiresIn)` → mock returns a presigned URL.
  - `delete(key)` → mock asserts `DeleteObjectCommand` is called.
  - `exists(key)` → mock returns true for a present key, false for a missing one.
- [x] Task: Implement. Confirm tests pass.

### Phase 1c: Factory & Lazy Singleton

- [x] Task: Create `packages/storage/src/factory.ts` with `createStorageClient(config)` and `getStorageClient()`.
- [x] Task: `getStorageClient()` reads env vars on first call; subsequent calls return the memoized instance.
- [x] Task: Write failing tests:
  - `getStorageClient()` with no env vars in `NODE_ENV='production'` throws `ProviderNotConfiguredError`.
  - `getStorageClient()` with `STORAGE_*` env vars returns the S3 driver.
  - 2 consecutive `getStorageClient()` calls return the same instance (memoization).
- [x] Task: Confirm.

### Phase 1d: URL Helpers

- [x] Task: Create `packages/storage/src/urls.ts` with `getStorageUrl(key)`, `getAudioUrl(path)`, etc.
- [x] Task: Write tests: each helper returns the expected URL pattern.
- [x] Task: Confirm.

## Phase 2: `packages/integrations/github` Foundation

- [x] Task: Create `packages/integrations/github/package.json`, `tsconfig.json`, `src/index.ts` barrel.
- [x] Task: Add `zod` to `dependencies` for response validation.

### Phase 2a: `GitHubClient` Interface

- [x] Task: Create `packages/integrations/github/src/client.ts` with the `GitHubClient` interface (FR-5).
- [x] Task: Write failing tests: a `MockGitHubClient` test double implements the interface.
- [x] Task: Confirm.

### Phase 2b: GitHub Driver (thin fetch wrapper)

- [x] Task: Create `packages/integrations/github/src/drivers/rest.ts` implementing `GitHubClient` with a `fetch` wrapper.
- [x] Task: Constructor takes `{ appId, privateKey, installationId? }`. No `process.env` reads.
- [x] Task: `getPracticeIssues` calls `GET https://api.github.com/repos/{owner}/{repo}/issues` with the right headers and Zod-validates the response.
- [x] Task: `getInstallationTokenForRepo` calls `POST https://api.github.com/app/installations/{installationId}/access_tokens` and returns the token.
- [x] Task: Write failing tests using `msw` (Mock Service Worker) or a custom `fetch` mock:
  - `getPracticeIssues('codecamp', 'm1-intro')` → mock returns a list of issues; client parses and Zod-validates.
  - `getPracticeIssues` with invalid response (e.g. 404) → throws `GitHubClientError`.
  - `getInstallationTokenForRepo('codecamp', 'm1-intro')` → mock returns `{ token: '...' }`; client returns the token.
- [x] Task: Confirm.

### Phase 2c: Lazy Singleton

- [x] Task: Create `packages/integrations/github/src/factory.ts` with `getGitHubClient()` lazy singleton.
- [x] Task: Reads `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID` on first call.
- [x] Task: Write tests similar to Phase 1c.
- [x] Task: Confirm.

## Phase 3: Refactor `packages/domain/src/codecamp/index.ts:1952`

- [x] Task: Write failing test for the new `getPracticeIssues(input: { owner, repo, options? })` function: returns parsed issues via `getGitHubClient().getPracticeIssues(...)`.
- [x] Task: Replace the inline `fetch` in `packages/domain/src/codecamp/index.ts:1946-1969` with `getGitHubClient().getPracticeIssues(input.owner, input.repo, input.options)`.
- [x] Task: **Remove the `next: { revalidate: 300 }` cast.** The cache semantics move to the caller.
- [x] Task: Update the function's signature: `getPracticeIssues(repoOwner: string, repoName: string): Promise<PracticeIssue[]>`.
- [x] Task: Run domain tests; all pass (276/281, 5 require DATABASE_URL).
- [x] Task: Updated the API router output schema to include `createdAt` and `updatedAt` fields.

## Phase 4: Remove Direct SDK Deps

- [x] Task: For any app that imported `@google-cloud/storage` (currently 0 in `apps/science-advantage/`), remove the import.
- [x] Task: Grep gate: `rg "@google-cloud/storage" packages/storage/ packages/integrations/` returns 0 hits.
- [x] Task: For science-advantage, remove the `GOOGLE_CLOUD_*` vars from `.env.example` (F-102 latent).
- [x] Task: For codecamp-advantage, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID` already in `.env.example`.

## Phase 5: Update Docs

- [x] Task: Update `apps/science-advantage/docs/archive/architecture/external-apis.md:62` to reference `@reading-advantage/storage`.
- [x] Task: Update `tech-stack.md` to note `@reading-advantage/storage` and `@reading-advantage/integrations/github`.
- [x] Task: Write `packages/storage/README.md` with config examples (GCS, R2, MinIO).
- [x] Task: Write `packages/integrations/github/README.md` with auth flow + usage examples.

## Phase 6: Closeout

- [x] Task: Update `measure/tech-debt.md` to mark F-102, F-703 `Resolved`.
- [x] Task: Add a lessons-learned entry: "Domain functions must not carry transport concerns (fetch, headers, revalidation); move them to the caller."
- [x] Task: Move track to `measure/archive/storage_package_20260603/` and update `measure/tracks.md`.
