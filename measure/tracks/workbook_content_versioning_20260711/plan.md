# Implementation Plan: Workbook Publishing Platform and Ecosystem Import

> This plan imports `advantage-workbooks` as a governed internal web publishing platform.
> It preserves Reading and Primary source ownership, replaces runtime filesystem storage,
> and adds immutable editions, durable artifacts, reviewed AI proposals, and source-owned
> live-app promotion. It does not authorize a direct port of filesystem helpers or legacy routes.

> **Status correction:** This track remains `new`; historic `[~]` parent markers below are
> planning placeholders, not completed implementation. Every unchecked child task remains
> pending until started under the Measure workflow.

## Phase S0: Establish the product and operational boundary

- [ ] Task: Ratify internal editor/publisher/auditor roles, global publishing tenancy, PII exclusion, source eligibility, rights, public-sample, teacher-consumption, and release/revocation policy.
- [ ] Task: Select the workbook operational database/adapter root, source-catalog transport, workload identity, forwarded editor context, and source-owned promotion authority; prohibit cross-database joins.
- [ ] Task: Write Red policy, permission, privacy, tenant-boundary, and architecture tests before creating application code.
- [ ] Task: Complete independent policy/security review and product-owner acceptance before source changes.
- [ ] Task: Measure - User Manual Verification 'Phase S0: Establish the product and operational boundary' (Protocol in workflow.md).

## Phase S1: Build governed source catalog contracts

_Story ref: spec.md#story-s1-select-source-content_

_Blast radius: `mapArticleToWorkbookJSON` has zero indexed callers and is a parity
fixture only; do not change its public signature during this track._

- [ ] Task: Define the source-catalog and normalized workbook-content contracts.
  - [ ] Create strict Zod schemas for source identity, revision, normalized content,
    questions, canonical asset keys, asset metadata, and structured incompatibility
    errors.
  - [ ] Define a transport-independent `ContentCatalogPort` with explicit tenant and
    authorization context; document the read-only ownership boundary.
  - [ ] Define canonical serialization and digest rules, including deterministic key
    ordering and the chosen hash algorithm.
- [ ] Task: Write source-catalog contract tests before adapters exist.
  - [ ] Add Reading Advantage and Primary Advantage fixture inputs that represent their
    different article and question shapes.
  - [ ] Prove valid records normalize to one schema and incompatible, unpublished, or
    cross-tenant inputs fail closed with structured errors.
  - [ ] Add digest determinism tests for equivalent normalized records and asset-key
    validation tests that reject mutable URLs as authoritative references.
- [ ] Task: Implement read-only source-catalog adapters.
  - [ ] Place source-independent contracts and orchestration in the owning backend
    module; keep app-specific reads behind injected adapters.
  - [ ] Implement Reading Advantage and Primary Advantage adapter bindings without
    importing app UI code or provider SDKs into the domain layer.
  - [ ] Compare Reading Advantage adapter output with the existing workbook JSON mapper
    as a parity fixture while preserving the existing export route unchanged.
- [ ] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the code graph for added or changed contracts, exports, and imports.
  - [ ] Run the affected package lint, check-types, and Vitest commands; record any
    pre-existing failures separately from this track.
  - [ ] Run `measure/generate.sh` and `measure/doctor.sh` when their project-local
    prerequisites are available; record unsupported commands rather than bypassing
    them.
- [b] Task: Measure - User Manual Verification 'Phase S1: Select source content' (Protocol in workflow.md) — deferred:product-owner

## Phase S2: Implement drafts, immutable editions, and provenance

_Story ref: spec.md#story-s2-publish-immutable-editions_

- [ ] Task: Define versioned workbook persistence and publication contracts.
  - [ ] Design Drizzle schema and migration for workbook drafts, edition versions,
    immutable edition snapshots, source references, asset references, and publication
    audit events.
  - [ ] Classify every new table in the tenant registry and define permissions for
    editors, publishers, and auditors before generating the migration.
  - [ ] Define idempotency keys, optimistic-concurrency rules, state transitions, and
    structured domain errors for draft creation and publication.
- [ ] Task: Write publication and persistence tests first.
  - [ ] Add unit tests for draft mutations, revision conflicts, duplicate publish
    requests, invalid snapshots, and failed asset checks using mocked ports.
  - [ ] Add PGlite/Drizzle integration tests for transaction rollback, tenant isolation,
    append-only edition history, and source updates after release.
  - [ ] Prove a safe fixture source mutation cannot alter the persisted release snapshot
    or its content digest.
- [ ] Task: Implement draft and edition domain commands plus thin transport adapters.
  - [ ] Generate and review the Drizzle migration before applying it in the local test
    environment.
  - [ ] Implement `createWorkbookDraft`, source-selection, draft-update, and
    `publishWorkbookEdition` commands with authorization, validation, transactions,
    and audit metadata.
  - [ ] Expose the commands through the approved adapter layer without placing business
    logic in route handlers, server actions, or future dashboard components.
- [ ] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the graph for database, contract, and adapter exports, then inspect
    changed caller relationships.
  - [ ] Run affected database, domain, API, lint, type-check, and Vitest gates; retain
    exact evidence in this track.
  - [ ] Run generated-documentation and doctor checks, recording known baseline debt
    separately.
- [b] Task: Measure - User Manual Verification 'Phase S2: Publish immutable editions' (Protocol in workflow.md) — deferred:product-owner

## Phase S3: Import legacy projects and establish artifact foundations

_Story ref: spec.md#story-s3-import-legacy-workbook-projects-and-assets_

- [ ] Task: Inventory standalone projects, lesson JSON, templates, fonts, images, generated artifacts, external references, rights state, and filesystem helper call sites; publish a versioned manifest and exception taxonomy.
- [ ] Task: Define legacy normalization, immutable object-key naming, hashes, original-ID/path provenance, dry-run, approval, resume, rollback, and idempotent-import contracts.
- [ ] Task: Write Red migration tests for invalid lessons, missing files, changed hashes, unsafe URLs, partial runs, reruns, asset mismatch, and zero runtime filesystem dependence after cutover.
- [ ] Task: Implement a read-only importer through `@reading-advantage/storage`, reconcile the Primary pilot by count/hash, and preserve the sibling app as a read-only archive.
- [ ] Task: Define render-input and artifact-provenance contracts.
  - [ ] Define immutable render input, template/version metadata, renderer metadata,
    artifact digest, storage key, validation status, and revocation/error contracts.
  - [ ] Define the storage-port usage policy: canonical keys in snapshots, signed URLs
    only at the access boundary, and no source-asset URL as release authority.
  - [ ] Specify artifact lifecycle transitions and retention requirements without
    implementing the standalone dashboard or a production renderer.
- [ ] Task: Write artifact reproducibility tests before implementation.
  - [ ] Add tests that render-input assembly reads only the edition snapshot and refuses
    live-source reads after publication.
  - [ ] Add tests for artifact metadata registration, digest mismatch, missing asset,
    stale template/renderer version, and tenant/authorization rejection.
  - [ ] Add an end-to-end fixture proving a source article update after publication does
    not change the edition's render input or artifact provenance.
- [ ] Task: Implement render-input assembly and artifact registration.
  - [ ] Implement domain queries/commands that assemble a validated render input from a
    released edition and verify referenced storage keys through `@reading-advantage/storage`.
  - [ ] Implement append-only artifact metadata registration and audit events without
    uploading rendered bytes from a request-response path.
  - [ ] Provide the future render worker/dashboard a transport-neutral contract for
    requesting signed asset access and registering completed immutable artifacts.
- [ ] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the graph and reference documentation for all public contracts and
    storage/domain boundary changes.
  - [ ] Run targeted storage, domain, database, API, lint, type-check, and Vitest
    commands, then run the applicable aggregate validation gates.
  - [ ] Record migration, rollback, and artifact-validation operational guidance in the
    track before any dashboard cutover is planned.
- [b] Task: Measure - User Manual Verification 'Phase S3: Reproduce release artifacts' (Protocol in workflow.md) — deferred:product-owner

## Phase S4: Port the production workspace to `apps/workbooks`

> **Divergence register (added 2026-08-03).** The standalone repo kept shipping after
> the scaffold was cut (2026-07-11). The port MUST take these from
> `advantage-workbooks` HEAD; they must not be silently lost:
>
> - **Renderer:** Paged.js rAF-chain freeze fix — dual-arm frame-independent driver
>   shim (`708bed9`), title-page `overflow:hidden` removal (`3a55973`),
>   `.tm-step-block` packing (`2b644eb`, 209→167 pages), pagination regression tests
>   (`fdc6277`). Applies wherever the legacy compiler/teacher-manual HTML is ported
>   (S4 teacher-manual workflow, S5 renderer extraction).
> - **Editor:** lesson editor ships from HEAD's refactored component suite — 7
>   sub-editors + `useLessonEditor` hook + `LessonStatusBanners` +
>   `LessonPreviewModal` (`98a98fc`..`26bc270`), not the pre-refactor monolith.
> - **Docs:** teacher-manual README section + `docs/teacher-manual.md` 4-period model
>   + preview screenshot (`fc1751c`) port with the teacher-manual workflow.
> - **Teacher guide:** 13-step renumbering of trainer's guide, observation forms,
>   rebuilt PDFs, portable build scripts (`efa1b42`, `c48e5e6`, `0231293`,
>   `19ed891`, `0e90470`) rides with template import.
> - **Cutover guard:** `dashboard/lib/cutover.ts` (`d604899`) is S7 evidence; known
>   gaps (image write paths unguarded, no tests) recorded in the standalone
>   tech-debt registry.

- [ ] Task: Scaffold `apps/workbooks` as a separately deployable Company-SSO application with explicit workbook role gates, thin UI/routes, and no copied filesystem or provider-SDK business logic. — **DONE ahead of plan:** scaffold `dd60bbdc5`, SSO gate `772a618ad` + `2df52486c` (track: workbooks_sso_onboarding_20260803)
- [ ] Task (S4a): Run the legacy importer dry-run for pilot project `origins-2-a0`, record the manifest/exceptions, and build the project list read page over domain queries (drafts/editions from DB, no filesystem).
- [ ] Task (S4b): Port the lesson/section editor from `advantage-workbooks` HEAD (refactored suite per divergence register) onto workbook backend server actions with optimistic concurrency.
- [ ] Task (S4c): Port settings + preview/compile wiring over the domain render port (no runtime filesystem, no provider SDKs).
- [ ] Task (S4d): Port the teacher-manual workflow including the Paged.js shim and regression tests (divergence register), plus its docs.
- [ ] Task: Write Red UI, accessibility, and authorization tests for catalog browsing, drafts, source selection, editing, optimistic conflicts, source drift, rights warnings, review state, and immutable-release confirmation.
- [ ] Task: Port the project list, settings, lesson/section editor, preview setup, and teacher-manual workflow over workbook backend commands; reject arbitrary URL/pasted-remote ingestion.
- [ ] Task: Complete desktop-first browser acceptance plus app/backend lint, type, test, build, graph, and independent permission/UI review gates.
- [ ] Task: Measure - User Manual Verification 'Phase S4: Port the production workspace to apps/workbooks' (Protocol in workflow.md).

## Phase S5: Render, distribute, and revoke durable artifacts

- [ ] Task: After Durable Job Worker Phase 4 acceptance, define render-job, immutable-input, template/renderer version, cancellation, retry budget, artifact lifecycle, retention, revocation, and signed-delivery contracts.
- [ ] Task: Write Red tests proving jobs use released snapshots only, reject live-source reads/missing assets/revoked editions, preserve idempotency, and never expose mutable public artifact URLs.
- [ ] Task: Extract the legacy compiler into a versioned renderer package and durable worker handler; store preview, HTML/PDF, and teacher-manual artifacts with full provenance through the storage adapter.
- [ ] Task: Run worker/storage failure drills, print-browser acceptance, and independent artifact-access/revocation review.
- [ ] Task: Measure - User Manual Verification 'Phase S5: Render, distribute, and revoke durable artifacts' (Protocol in workflow.md).

## Phase S6: Govern AI proposals and live-app promotion

- [ ] Task: Define proposal, model/prompt/template, input/output digest, reviewer disposition, field-level decision, promotion request, source-provenance, budget, cancellation, and initial promotable-type contracts.
- [ ] Task: Write Red tests for adapter-only AI access, secret-safe provenance, proposal-only generation, selective review, distinct publisher approval, rejected-output invisibility, and promotion idempotency.
- [ ] Task: Implement durable AI/image proposal jobs through `@reading-advantage/ai`, then source-owned Reading/Primary promotion commands for accepted types; prohibit workbook-side direct writes.
- [ ] Task: Prove one approved addition appears through each source app's normal product path while draft/rejected/workbook-only material remains invisible.
- [ ] Task: Measure - User Manual Verification 'Phase S6: Govern AI proposals and live-app promotion' (Protocol in workflow.md).

## Phase S7: Pilot consumption, cut over, and retain rollback

- [ ] Task: Select rights-cleared representative Primary and Reading pilots; define exact import, parity, catalog, promotion, print, assignment, and rollback acceptance evidence.
- [ ] Task: Add product-local teacher consumption, assignment, download/open, and separately approved coarse unit-covered signaling; exclude OCR and paper-answer capture.
- [ ] Task: Run shadow import/parallel render, internal dogfood, controlled teacher consumption, full reconciliation, human print sign-off, and reverse-order rollback rehearsal.
- [ ] Task: Freeze standalone writes only after independent final review, no open Critical/High findings, a final hash manifest, read-only archive, and product-owner cutover acceptance.
- [ ] Task: Measure - User Manual Verification 'Phase S7: Pilot consumption, cut over, and retain rollback' (Protocol in workflow.md).
