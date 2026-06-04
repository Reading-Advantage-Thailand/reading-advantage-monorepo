# Specification: Shared `packages/storage` S3-Compatible Package + GitHub Integration

## Overview

Create `packages/storage` with a `StorageClient` interface backed by `@aws-sdk/client-s3` (works with GCS S3 interop, Cloudflare R2, MinIO). Inherits the StorageClient interface design from the in-flight `storage_s3_compat_20260522` track. **Additionally**: extract `packages/domain/src/codecamp/index.ts:1952` GitHub `fetch()` (with inline `headers` and `next: { revalidate: 300 }` cast) to a new `packages/integrations/github` package with typed methods. Fulfills AGENTS.md §Storage ("Application code should call: `storage.put()`, `storage.get()`, `storage.delete()`, `storage.getSignedUrl()`. Application code must not directly call storage provider SDKs") and §7.3 (no transport imports in domain).

## Problem

Audited 2026-06-03. Findings F-102 (Low) + F-703 (Low):

### F-102 — No storage/email adapter package exists for science-advantage to consume
- No `apps/science-advantage/lib/storage/` directory. No `packages/storage/` exists in the monorepo (`ls packages/` returns `api auth auth-client config db domain reading-advantage-scripts types ui utils webhooks` — no `storage`).
- `apps/science-advantage/.env.example:34-36` declares `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_KEY_FILE` — env vars validated by no Zod schema, consumed by no code.
- `apps/science-advantage/docs/archive/architecture/external-apis.md:62,195` describes GCS and SendGrid integrations as "Integrated via @google-cloud/storage SDK" but the corresponding source code does not exist.
- The latent risk: if storage is added for real, the most direct path is `@google-cloud/storage` in a route handler — the exact §1.1 violation F-101 documents.

### F-703 — GitHub client embedded in domain
- `packages/domain/src/codecamp/index.ts:1946-1969` — `getPracticeIssues()` makes a `fetch('https://api.github.com/...')` call with `headers: { Accept: "application/vnd.github.v3+json" }` and `next: { revalidate: 300 }` (the `next` extension is a Next.js ISR-specific `RequestInit`).
- Domain code reaches out to an external provider directly. The `next: { revalidate: 300 }` cast ties the function to Next.js's extended `RequestInit` type.
- If/when a backend service replaces the route handler, the function breaks.

## Why

- AGENTS.md §Storage has mandated the adapter pattern since the monorepo was scaffolded. This track is the implementation.
- The in-flight `storage_s3_compat_20260522` track is a partial implementation; this track inherits the design and completes it for science-advantage + the GitHub integration.
- The GitHub client extraction is a §7.3 violation (transport in domain) that will become a §1.1-style latent risk if the function ever needs to be called from a non-Next.js context (worker, CLI).

## Functional Requirements

### FR-1: `StorageClient` Interface (inherited from `storage_s3_compat_20260522`)

```ts
// packages/storage/src/client.ts
export interface StorageClient {
  put(key: string, body: Buffer | Uint8Array | Readable, opts?: PutOptions): Promise<void>;
  getUrl(key: string): string;                       // public URL (no network call)
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface PutOptions {
  contentType?: string;
  public?: boolean;   // default: true (sets public-read ACL or equivalent)
}
```

### FR-2: S3 Driver (inherited)

- Implemented with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- `StorageConfig` Zod schema: `{ endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicBaseUrl?: string }`.
- `publicBaseUrl` overrides the constructed URL for CDN or custom domain use.
- GCS: enable "Cloud Storage Interoperability" in GCS console, create HMAC keys.
- R2: use `https://<accountId>.r2.cloudflarestorage.com`; set `publicBaseUrl` to R2 public bucket URL or custom domain.
- MinIO: local dev at `http://localhost:9000`.

### FR-3: Factory & Lazy Singleton (inherited)

- `createStorageClient(config: StorageConfig): StorageClient`
- `getStorageClient(): StorageClient` — lazily constructs and memoizes a singleton on the **first call**, reading and Zod-validating env vars at that point. Env vars must **not** be read or validated at module load (a throw at import time would break builds, test runs, and any file that imports the package barrel without using storage).
- Env vars: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_BASE_URL` (optional).

### FR-4: URL Helper Utilities (inherited)

- `getStorageUrl(key: string): string`
- `getArticleImageUrl(articleId: string, n: 1 | 2 | 3): string` (per-app, only if needed)
- `getAudioUrl(path: string): string` (per-app, only if needed)
- Helpers are pure functions — they construct URLs from config without network calls.

### FR-5: GitHub Integration Package (new in this track)

Create `packages/integrations/github/` with:

```ts
// packages/integrations/github/src/client.ts
export interface GitHubClient {
  getPracticeIssues(owner: string, repo: string, options?: { state?: 'open' | 'closed' | 'all'; labels?: string[]; perPage?: number }): Promise<PracticeIssue[]>;
  getInstallationTokenForRepo(owner: string, repo: string): Promise<string>;
  listRepositoriesForInstallation(installationId: string): Promise<Repository[]>;
}

export interface PracticeIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}
```

- Implement with a thin `fetch` wrapper that injects the standard GitHub headers (`Accept: application/vnd.github.v3+json`, `Authorization: token <installationToken>`) and parses JSON.
- **No `next: { revalidate: 300 }` cast** — the cache semantics move to the caller (the route handler or domain function decides the revalidation policy).
- Configuration: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID` (single-org default, multi-org via `getInstallationTokenForRepo(owner, repo)`).

### FR-6: Refactor `packages/domain/src/codecamp/index.ts:1952`

- Replace the inline `fetch` in `getPracticeIssues` with `getGitHubClient().getPracticeIssues(owner, repo, options)`.
- Move the `headers` injection and the URL construction into the new client.
- The `next: { revalidate: 300 }` cast moves to the **caller** (the codecamp route handler) — the domain function returns a plain value.
- The function's signature changes: `getPracticeIssues(input: { owner: string; repo: string; options?: {...} })` (no more `RequestInit`).

### FR-7: Update `.env.example`

- For science-advantage: remove `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_KEY_FILE` from `.env.example` (no live code uses them; F-102 is latent). Or wire them through `packages/storage` if a real storage feature is being added in parallel.
- For codecamp-advantage: add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID` if not already declared.

## Non-Functional Requirements

- **Zero `@google-cloud/storage` imports** anywhere in `packages/` or `apps/`. Grep gate: `rg "@google-cloud/storage" packages/ apps/` returns 0 hits.
- **Single `@aws-sdk/client-s3` version** pinned at workspace root (`pnpm-workspace.yaml` catalog or root `package.json`).
- **Package is pure ESM**, exports `./` and `./client` subpaths.
- **Tests use `@aws-sdk/client-s3`'s built-in `mockClient` helper** (via `aws-sdk-client-mock`) — no real network calls.
- **Lint + type-check + build** green for `packages/storage`, `packages/integrations/github`, and the affected apps.

## Acceptance Criteria

1. `packages/storage/` package exists with `StorageClient` interface, `createStorageClient`, `getStorageClient`, URL helpers.
2. `packages/integrations/github/` package exists with `GitHubClient` interface, `getGitHubClient`, typed methods.
3. 0 `@google-cloud/storage` imports in `packages/` or `apps/`.
4. `packages/domain/src/codecamp/index.ts:1952` no longer uses `fetch` directly; uses `getGitHubClient().getPracticeIssues(...)`.
5. 0 `next: { revalidate: 300 }` casts in `packages/domain/`.
6. `pnpm turbo run test --filter=@reading-advantage/storage` exits 0 with ≥80% coverage.
7. `pnpm turbo run test --filter=@reading-advantage/integrations` exits 0.
8. `pnpm turbo run test --filter=science-advantage --filter=codecamp-advantage` exits 0.
9. `pnpm turbo run build --filter=science-advantage --filter=codecamp-advantage` exits 0.
10. `.env.example` for science-advantage no longer declares the unused `GOOGLE_CLOUD_*` vars (or wires them through `packages/storage` if a real feature is being added).
11. `tech-stack.md` updated to note `@reading-advantage/storage` and `@reading-advantage/integrations/github`.

## Out of Scope

- Migrating the existing `apps/reading-advantage/utils/storage.ts` and `apps/primary-advantage/utils/storage.ts` files — covered by the in-flight `storage_s3_compat_20260522` track (which this track supersedes for science-advantage; reading + primary remain with the prior track).
- Browser-side direct upload (presigned upload URLs are a future enhancement).
- Multipart upload support.
- CDN integration / image transformation.
- Email integration (`packages/integrations/email`) — separate track; not surfaced by the science-advantage audit.
- Multi-org GitHub App support beyond the `getInstallationTokenForRepo` flow — separate track.

## Constraints & Risks

- **Risk: The in-flight `storage_s3_compat_20260522` track may already be implementing the same package.** Mitigation: this track inherits the design; the prior track's work becomes the foundation. Coordinate with the maintainer to merge the two plans.
- **Risk: The GitHub integration requires App credentials; tests cannot exercise the real API without secrets.** Mitigation: implement a `mock` provider similar to Track 5's mock pattern; tests use the mock; a single integration test gates on env-var presence.
- **Risk: Removing the `next: { revalidate: 300 }` cast from `getPracticeIssues` changes the cache semantics.** Mitigation: the caller (codecamp route handler) re-applies the same revalidation policy via the standard `fetch(..., { next: { revalidate: 300 } })` at the route layer. Document the move in `packages/integrations/github/README.md`.
- **Risk: `.env.example` cleanup for `GOOGLE_CLOUD_*` vars may be premature** if a parallel feature is being added. Mitigation: the maintainer decides; if the vars are still needed, wire them through `packages/storage`.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 1 (F-102) and §Section 7 (F-703)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 6
- `measure/tracks/storage_s3_compat_20260522/` (in-flight; this track inherits)
- `apps/science-advantage/.env.example:34-36` (the `GOOGLE_CLOUD_*` vars)
- `packages/domain/src/codecamp/index.ts:1946-1969` (the GitHub client to extract)
- AGENTS.md §Storage: "Use S3-compatible object storage through an internal adapter. Application code should call: storage.put(), storage.get(), storage.delete(), storage.getSignedUrl()"
