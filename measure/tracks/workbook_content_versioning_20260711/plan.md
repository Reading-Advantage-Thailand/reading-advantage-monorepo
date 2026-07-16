# Implementation Plan: Versioned Workbook Content and Editions

> This track establishes the release contract before importing the standalone workbook
> dashboard. Source apps retain article ownership; published editions retain immutable
> normalized snapshots and artifact provenance.

## Phase S1: Select source content

_Story ref: spec.md#story-s1-select-source-content_

_Blast radius: `mapArticleToWorkbookJSON` has zero indexed callers and is a parity
fixture only; do not change its public signature during this track._

- [~] Task: Define the source-catalog and normalized workbook-content contracts.
  - [ ] Create strict Zod schemas for source identity, revision, normalized content,
    questions, canonical asset keys, asset metadata, and structured incompatibility
    errors.
  - [ ] Define a transport-independent `ContentCatalogPort` with explicit tenant and
    authorization context; document the read-only ownership boundary.
  - [ ] Define canonical serialization and digest rules, including deterministic key
    ordering and the chosen hash algorithm.
- [~] Task: Write source-catalog contract tests before adapters exist.
  - [ ] Add Reading Advantage and Primary Advantage fixture inputs that represent their
    different article and question shapes.
  - [ ] Prove valid records normalize to one schema and incompatible, unpublished, or
    cross-tenant inputs fail closed with structured errors.
  - [ ] Add digest determinism tests for equivalent normalized records and asset-key
    validation tests that reject mutable URLs as authoritative references.
- [~] Task: Implement read-only source-catalog adapters.
  - [ ] Place source-independent contracts and orchestration in the owning backend
    module; keep app-specific reads behind injected adapters.
  - [ ] Implement Reading Advantage and Primary Advantage adapter bindings without
    importing app UI code or provider SDKs into the domain layer.
  - [ ] Compare Reading Advantage adapter output with the existing workbook JSON mapper
    as a parity fixture while preserving the existing export route unchanged.
- [~] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the code graph for added or changed contracts, exports, and imports.
  - [ ] Run the affected package lint, check-types, and Vitest commands; record any
    pre-existing failures separately from this track.
  - [ ] Run `measure/generate.sh` and `measure/doctor.sh` when their project-local
    prerequisites are available; record unsupported commands rather than bypassing
    them.
- [b] Task: Measure - User Manual Verification 'Phase S1: Select source content' (Protocol in workflow.md) — deferred:product-owner

## Phase S2: Publish immutable editions

_Story ref: spec.md#story-s2-publish-immutable-editions_

- [~] Task: Define versioned workbook persistence and publication contracts.
  - [ ] Design Drizzle schema and migration for workbook drafts, edition versions,
    immutable edition snapshots, source references, asset references, and publication
    audit events.
  - [ ] Classify every new table in the tenant registry and define permissions for
    editors, publishers, and auditors before generating the migration.
  - [ ] Define idempotency keys, optimistic-concurrency rules, state transitions, and
    structured domain errors for draft creation and publication.
- [~] Task: Write publication and persistence tests first.
  - [ ] Add unit tests for draft mutations, revision conflicts, duplicate publish
    requests, invalid snapshots, and failed asset checks using mocked ports.
  - [ ] Add PGlite/Drizzle integration tests for transaction rollback, tenant isolation,
    append-only edition history, and source updates after release.
  - [ ] Prove a safe fixture source mutation cannot alter the persisted release snapshot
    or its content digest.
- [~] Task: Implement draft and edition domain commands plus thin transport adapters.
  - [ ] Generate and review the Drizzle migration before applying it in the local test
    environment.
  - [ ] Implement `createWorkbookDraft`, source-selection, draft-update, and
    `publishWorkbookEdition` commands with authorization, validation, transactions,
    and audit metadata.
  - [ ] Expose the commands through the approved adapter layer without placing business
    logic in route handlers, server actions, or future dashboard components.
- [~] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the graph for database, contract, and adapter exports, then inspect
    changed caller relationships.
  - [ ] Run affected database, domain, API, lint, type-check, and Vitest gates; retain
    exact evidence in this track.
  - [ ] Run generated-documentation and doctor checks, recording known baseline debt
    separately.
- [b] Task: Measure - User Manual Verification 'Phase S2: Publish immutable editions' (Protocol in workflow.md) — deferred:product-owner

## Phase S3: Reproduce release artifacts

_Story ref: spec.md#story-s3-reproduce-release-artifacts_

- [~] Task: Define render-input and artifact-provenance contracts.
  - [ ] Define immutable render input, template/version metadata, renderer metadata,
    artifact digest, storage key, validation status, and revocation/error contracts.
  - [ ] Define the storage-port usage policy: canonical keys in snapshots, signed URLs
    only at the access boundary, and no source-asset URL as release authority.
  - [ ] Specify artifact lifecycle transitions and retention requirements without
    implementing the standalone dashboard or a production renderer.
- [~] Task: Write artifact reproducibility tests before implementation.
  - [ ] Add tests that render-input assembly reads only the edition snapshot and refuses
    live-source reads after publication.
  - [ ] Add tests for artifact metadata registration, digest mismatch, missing asset,
    stale template/renderer version, and tenant/authorization rejection.
  - [ ] Add an end-to-end fixture proving a source article update after publication does
    not change the edition's render input or artifact provenance.
- [~] Task: Implement render-input assembly and artifact registration.
  - [ ] Implement domain queries/commands that assemble a validated render input from a
    released edition and verify referenced storage keys through `@reading-advantage/storage`.
  - [ ] Implement append-only artifact metadata registration and audit events without
    uploading rendered bytes from a request-response path.
  - [ ] Provide the future render worker/dashboard a transport-neutral contract for
    requesting signed asset access and registering completed immutable artifacts.
- [~] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the graph and reference documentation for all public contracts and
    storage/domain boundary changes.
  - [ ] Run targeted storage, domain, database, API, lint, type-check, and Vitest
    commands, then run the applicable aggregate validation gates.
  - [ ] Record migration, rollback, and artifact-validation operational guidance in the
    track before any dashboard cutover is planned.
- [b] Task: Measure - User Manual Verification 'Phase S3: Reproduce release artifacts' (Protocol in workflow.md) — deferred:product-owner
