# Implementation Plan: Workbook Publishing Platform and Ecosystem Import

> This plan imports `advantage-workbooks` as a governed internal web publishing platform.
> It preserves Reading and Primary source ownership, replaces runtime filesystem storage,
> and adds immutable editions, durable artifacts, reviewed AI proposals, and source-owned
> live-app promotion. It does not authorize a direct port of filesystem helpers or legacy routes.

> **Landed-work reconciliation (2026-08-04).** The previous status note said the track
> "remains `new`" and every task was left `[ ]`. That was already false when written:
> nine commits had landed under this `track_id`. Status markers below are now reconciled
> against the tree, each checked task carrying the SHA that delivered it.
>
> | SHA | Delivered |
> |---|---|
> | `ebd75ff76` | `packages/db` workbook schema + migration `0048_workbook_publishing` |
> | `599b9a117` | `packages/domain/src/workbooks` — contracts, ports, normalizers, draft/publish commands, repositories, renderers (6 test suites) |
> | `dd60bbdc5` | `apps/workbooks` scaffold — routes, server actions, repository binding |
> | `c109a372f` | legacy-import manifest contract + `dry-run:import` CLI |
> | `dbaafe9a0` | home view listing tenant-scoped drafts and editions |
> | `bc9ee5951` | lesson section editor port — 4 sub-editors, banners, mapping, hook |
> | `6034a1dc8` | legacy-lesson fidelity carriers on the normalized contract |
> | `6e94288db` | lossless legacy field mapping + `origins-2-a0` round-trip fixture |
> | `3c595ef1c` | workbook tables classified REFERENTIAL; FR-6 tenant-coverage gate restored to green |
>
> **`[~]` means partially landed** — the gap is stated inline. Three gaps recur and are
> not yet booked anywhere: (1) `graph.db` is stale (2026-08-01, older than every commit
> above), so no "update the graph" sub-task is done; (2) there are no PGlite/Drizzle
> integration tests — `drizzle-edition-repository.ts` (430 lines) has coverage only for
> tenant scoping; (3) `html-renderer.ts`, `pdf-renderer.ts`, `artifact-store.ts` and
> `render-port.ts` have no test suite at all.

## Phase S0: Establish the product and operational boundary

- [~] Task: Ratify internal editor/publisher/auditor roles, global publishing tenancy, PII exclusion, source eligibility, rights, public-sample, teacher-consumption, and release/revocation policy. — **Gap:** only one role exists (`WORKBOOK_ADMIN`, track `workbooks_sso_onboarding_20260803`); the editor/publisher/auditor split, rights, public-sample and teacher-consumption policy are unratified. No product-owner artifact.
- [~] Task: Select the workbook operational database/adapter root, source-catalog transport, workload identity, forwarded editor context, and source-owned promotion authority; prohibit cross-database joins. — Realized in code (`packages/db` root, `ContentCatalogPort` transport, session-derived editor context in `772a618ad`) but never recorded as a decision. **Gap:** workload identity and promotion authority undecided.
- [~] Task: Write Red policy, permission, privacy, tenant-boundary, and architecture tests before creating application code. — Permission tests landed with the SSO track; the tenant-boundary test landed `3c595ef1c`, **after** the schema and repository it guards, not before. Policy and privacy tests do not exist.
- [ ] Task: Complete independent policy/security review and product-owner acceptance before source changes. — Not started; source changes proceeded without it.
- [ ] Task: Measure - User Manual Verification 'Phase S0: Establish the product and operational boundary' (Protocol in workflow.md).

## Phase S1: Build governed source catalog contracts

_Story ref: spec.md#story-s1-select-source-content_

_Blast radius: `mapArticleToWorkbookJSON` has zero indexed callers and is a parity
fixture only; do not change its public signature during this track._

- [x] Task: Define the source-catalog and normalized workbook-content contracts. 599b9a117, 6034a1dc8
  - [x] Create strict Zod schemas for source identity, revision, normalized content,
    questions, canonical asset keys, asset metadata, and structured incompatibility
    errors. — `workbooks/contracts.ts`; extended with 14 legacy fidelity carriers in 6034a1dc8
  - [x] Define a transport-independent `ContentCatalogPort` with explicit tenant and
    authorization context; document the read-only ownership boundary. — `workbooks/content-catalog-port.ts`
  - [x] Define canonical serialization and digest rules, including deterministic key
    ordering and the chosen hash algorithm. — `workbooks/digest.ts`
- [x] Task: Write source-catalog contract tests before adapters exist. 599b9a117, 6034a1dc8
  - [x] Add Reading Advantage and Primary Advantage fixture inputs that represent their
    different article and question shapes. — `workbooks-source-catalog.test.ts`
  - [x] Prove valid records normalize to one schema and incompatible, unpublished, or
    cross-tenant inputs fail closed with structured errors.
  - [x] Add digest determinism tests for equivalent normalized records and asset-key
    validation tests that reject mutable URLs as authoritative references. — `workbookAssetKeySchema` rejects `http(s)://`
- [~] Task: Implement read-only source-catalog adapters. 599b9a117
  - [x] Place source-independent contracts and orchestration in the owning backend
    module; keep app-specific reads behind injected adapters.
  - [x] Implement Reading Advantage and Primary Advantage adapter bindings without
    importing app UI code or provider SDKs into the domain layer. — `reading-advantage-normalizer.ts`, `primary-advantage-normalizer.ts`
  - [ ] Compare Reading Advantage adapter output with the existing workbook JSON mapper
    as a parity fixture while preserving the existing export route unchanged.
    — **Not done.** `workbooks-primary-advantage-normalizer.test.ts` proves parity
    *between the two normalizers*, not against `mapArticleToWorkbookJSON`. The blast-radius
    note above exists precisely for this comparison.
- [~] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the code graph for added or changed contracts, exports, and imports.
    — **Not done.** `graph.db` mtime 2026-08-01 predates every commit in this track.
  - [x] Run the affected package lint, check-types, and Vitest commands; record any
    pre-existing failures separately from this track. — 2026-08-04: domain tsc clean,
    lint 0 errors / 31 pre-existing warnings, workbook domain suites 173/173,
    `apps/workbooks` 101/101. Full domain suite: 5 failed, all pre-existing
    (mastery-persistence, codecamp-curriculum-assignments, activity-drizzle ×2 + dist copy).
  - [ ] Run `measure/generate.sh` and `measure/doctor.sh` when their project-local
    prerequisites are available; record unsupported commands rather than bypassing
    them.
- [b] Task: Measure - User Manual Verification 'Phase S1: Select source content' (Protocol in workflow.md) — deferred:product-owner

## Phase S2: Implement drafts, immutable editions, and provenance

_Story ref: spec.md#story-s2-publish-immutable-editions_

- [~] Task: Define versioned workbook persistence and publication contracts. ebd75ff76
  - [x] Design Drizzle schema and migration for workbook drafts, edition versions,
    immutable edition snapshots, source references, asset references, and publication
    audit events. — `schema/workbooks.ts`, `0048_workbook_publishing.sql`
  - [~] Classify every new table in the tenant registry and define permissions for
    editors, publishers, and auditors before generating the migration.
    — **Order violated.** The migration shipped unclassified and left the FR-6
    tenant-coverage gate red for a day; classification landed after the fact in
    `3c595ef1c` (all three tables REFERENTIAL: they carry a company publishing
    `tenantId`, not a `schoolId`). Editor/publisher/auditor permissions still undefined.
  - [x] Define idempotency keys, optimistic-concurrency rules, state transitions, and
    structured domain errors for draft creation and publication. — `edition-state.ts`,
    `edition-repository-port.ts`; `REVISION_CONFLICT` on stale-revision updates
- [~] Task: Write publication and persistence tests first. 599b9a117
  - [x] Add unit tests for draft mutations, revision conflicts, duplicate publish
    requests, invalid snapshots, and failed asset checks using mocked ports.
    — `workbooks-publish-edition{,-rejections}.test.ts`, `workbooks-update-draft.test.ts`
  - [ ] Add PGlite/Drizzle integration tests for transaction rollback, tenant isolation,
    append-only edition history, and source updates after release.
    — **Not done.** No PGlite harness for workbooks; every suite runs against
    `in-memory-edition-repository.ts`, so the 430-line Drizzle repository is exercised
    only by the tenant-scope test added in `3c595ef1c`.
  - [x] Prove a safe fixture source mutation cannot alter the persisted release snapshot
    or its content digest. — `workbooks-editions.test.ts`
- [x] Task: Implement draft and edition domain commands plus thin transport adapters. 599b9a117, dd60bbdc5
  - [x] Generate and review the Drizzle migration before applying it in the local test
    environment.
  - [x] Implement `createWorkbookDraft`, source-selection, draft-update, and
    `publishWorkbookEdition` commands with authorization, validation, transactions,
    and audit metadata. — `create-draft.ts`, `update-draft.ts`, `publish-edition.ts`
  - [x] Expose the commands through the approved adapter layer without placing business
    logic in route handlers, server actions, or future dashboard components.
    — `apps/workbooks/lib/repository.ts` is a thin binding; no runtime filesystem in the app
- [~] Task: Generate documentation and perform the Measure doctor gate.
  - [ ] Update the graph for database, contract, and adapter exports, then inspect
    changed caller relationships. — **Not done** (stale `graph.db`, see header).
  - [x] Run affected database, domain, API, lint, type-check, and Vitest gates; retain
    exact evidence in this track. — evidence recorded under S1 above.
  - [ ] Run generated-documentation and doctor checks, recording known baseline debt
    separately.
- [b] Task: Measure - User Manual Verification 'Phase S2: Publish immutable editions' (Protocol in workflow.md) — deferred:product-owner

## Phase S3: Import legacy projects and establish artifact foundations

_Story ref: spec.md#story-s3-import-legacy-workbook-projects-and-assets_

- [~] Task: Inventory standalone projects, lesson JSON, templates, fonts, images, generated artifacts, external references, rights state, and filesystem helper call sites; publish a versioned manifest and exception taxonomy. c109a372f, 6e94288db
  — Manifest v2 published for **1 of 4** standalone projects (`origins-2-a0`: 14 lessons,
  14 parse-OK, 0 exceptions, 42 provenance entries). **Gap:** `adventures-1.0-a1`,
  `origins-3.1-a0`, `origins-3.1-a1` (35 further lesson files) not inventoried; templates,
  fonts, rights state and filesystem helper call sites not covered.
- [~] Task: Define legacy normalization, immutable object-key naming, hashes, original-ID/path provenance, dry-run, approval, resume, rollback, and idempotent-import contracts. c109a372f, 6034a1dc8
  — Normalization (`importLegacyWorkbook`), object-key naming, SHA hashing, original-path
  provenance and dry-run all defined. **Gap:** approval, resume and rollback contracts
  do not exist.
- [~] Task: Write Red migration tests for invalid lessons, missing files, changed hashes, unsafe URLs, partial runs, reruns, asset mismatch, and zero runtime filesystem dependence after cutover. 6034a1dc8
  — `workbooks-legacy-importer.test.ts` (327 lines) + `legacy-import-manifest.test.ts`
  cover invalid lessons, hashes and unsafe URLs. **Gap:** partial runs, reruns and asset
  mismatch untested (no importer to run them against).
- [ ] Task: Implement a read-only importer through `@reading-advantage/storage`, reconcile the Primary pilot by count/hash, and preserve the sibling app as a read-only archive.
  — **Not started.** Nothing writes through `@reading-advantage/storage`; the package is
  a `transpilePackages` entry and a docstring reference only. The 42 provenance entries
  still point at mutable `storage.googleapis.com` URLs, which the contract forbids as
  release authority. Archive/cutover guard is incomplete on the standalone side — see
  its tech-debt registry entry `monorepo_cutover_s7 (d604899)`.
- [~] Task: Define render-input and artifact-provenance contracts. 599b9a117
  - [x] Define immutable render input, template/version metadata, renderer metadata,
    artifact digest, storage key, validation status, and revocation/error contracts.
    — `workbooks/render-port.ts`, `workbooks/artifact-store.ts`
  - [x] Define the storage-port usage policy: canonical keys in snapshots, signed URLs
    only at the access boundary, and no source-asset URL as release authority.
    — enforced by `workbookAssetKeySchema`; `legacyUrl` is provenance-only
  - [ ] Specify artifact lifecycle transitions and retention requirements without
    implementing the standalone dashboard or a production renderer.
- [ ] Task: Write artifact reproducibility tests before implementation.
  — **Not started.** `render-port.ts`, `artifact-store.ts`, `html-renderer.ts` and
  `pdf-renderer.ts` have no test suite. Note also that `html-renderer.ts` emits a
  111-line placeholder document (title, paragraphs, `<ol>` of questions) and
  `apps/workbooks/lib/html-to-pdf.ts` drives Playwright `page.pdf()` directly with no
  Paged.js — neither reproduces workbook layout, and `html-to-pdf.ts` is currently
  unreferenced. The S4/S5 renderer extraction, not this task, is where they get real.
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

- [x] Task: Scaffold `apps/workbooks` as a separately deployable Company-SSO application with explicit workbook role gates, thin UI/routes, and no copied filesystem or provider-SDK business logic. — scaffold `dd60bbdc5`, SSO gate `772a618ad` + `2df52486c` (track: workbooks_sso_onboarding_20260803). Verified: no runtime filesystem in the app (only the import CLI and a test fixture loader).
- [x] Task (S4a): Run the legacy importer dry-run for pilot project `origins-2-a0`, record the manifest/exceptions, and build the project list read page over domain queries (drafts/editions from DB, no filesystem). c109a372f, dbaafe9a0, 6e94288db
- [x] Task (S4b): Port the lesson/section editor from `advantage-workbooks` HEAD (refactored suite per divergence register) onto workbook backend server actions with optimistic concurrency. bc9ee5951, 6e94288db, efe21f5c2
  — All 8 sub-editors + status banners + mapping + `useDraftLessonEditor` landed
  (`c5492b575` wired the last four and repaired the component test wiring: those suites
  were never collected before it). Losslessness is now proven against a maximal fixture
  pinned to `draftLessonSchema` by an exhaustiveness assertion, which found and fixed two
  real defects (`b960b07f7`): `writing_practice_url` was silently dropped on save, and a
  structured article image was emitted into both editor image fields, duplicating its URL
  on every save/load cycle. `LessonPreviewModal` + `LessonPreview` ported in `efe21f5c2`
  (modal wired to the Preview button with an S4c empty state until compile wiring lands).
- [x] Task (S4c): Port settings + preview/compile wiring over the domain render port (no runtime filesystem, no provider SDKs). 37d8958cc, 295565f3e, 7d40b6dad, 8617bbac5, b18160062
  — Draft preview: pure `renderWorkbookContentHtml` extracted from `renderEditionHtml`,
  tenant-scoped `previewDraftAction`, Preview modal with loading/error states. Settings:
  `workbookDraftSettingsSchema` rides inside the source-record jsonb (no migration),
  `updateWorkbookDraftSettings` command + drizzle + in-memory repos, `updateDraftSettingsAction`,
  shadcn-free `DraftSettingsDialog` with ported level constants, importer accepts optional
  settings. Editor hook owns settings+revision so settings saves never clobber unsaved edits.
- [x] Task (S4d): Port the teacher-manual workflow including the Paged.js shim and regression tests (divergence register), plus its docs. d1b17a1de, fc57d2840, 0fd9ac13e, 1d2e89923, 0546d5c89
  — **Design decision (2026-08-04):** the monorepo has no project entity (drafts are
  per-lesson; `sourceId` = legacy lesson file name), so the legacy "one project = one
  manual" grouping ports as a **user-selected draft set**: the drafts table gains
  selection + a Teacher Manual action compiling the chosen drafts in lesson-number
  order, taking series metadata from the first ordered draft's settings. Generators
  port verbatim from `advantage-workbooks` HEAD; a single `toTeacherManualLesson`
  adapter maps `WorkbookNormalizedContent` (camelCase) → the legacy lesson shape the
  ported generators consume, pinned by a maximal-fixture test.
  — Landed: foundation (types/i18n/theme/adapter, 23 tests), six generators (67
  tests), document-wrapper + compiler (16 tests; rAF shim order, title-page overflow,
  and .tm-step-block packing pinned per divergence register; deliberate deviation —
  preface welcome() now escapes series metadata, legacy rendered it raw), app
  workflow (tenant-scoped `compileTeacherManualAction`, accessible draft multi-select,
  sandboxed srcDoc modal with en/th toggle + print panel, 16 tests), docs port.
  — **Deferred:** the fdc6277 Playwright e2e (Paged.js page-count assertion) — the
  workbooks app has no e2e harness or seeded-DB infra; the shim presence/order the
  e2e guarded is unit-pinned. Recorded in tech-debt.
- [x] Task: Write Red UI, accessibility, and authorization tests for catalog browsing, drafts, source selection, editing, optimistic conflicts, source drift, rights warnings, review state, and immutable-release confirmation. 5a8c14cee, dcca3a722, 6beba4efe, 3fe0e1072
  — Review-state actions + publish dialog + publish-action app tests (Red observed,
  28 failing → green); source-drift adoption pinned at domain + manifest v3; pasted
  ingestion rejected (page + action deleted, fail-closed guidance); transition
  writes made transactional (recordEvent failure rolls back status); rights
  rejection pinned for both normalizers (private/withdrawn eligibility gap is the
  catalog layer's job — tech-debt); a11y sweep (scope=col, status regions; dialog
  focus management deferred to tech-debt as a shared-hook design). Editing +
  optimistic-conflict coverage landed earlier in S4b/S4c.
- [x] Task: Port the project list, settings, lesson/section editor, preview setup, and teacher-manual workflow over workbook backend commands; reject arbitrary URL/pasted-remote ingestion. 6beba4efe
  — Pasted ingestion rejected: the orphaned paste-JSON page + `createDraftAction`
  deleted; `/drafts/new` fails closed with guidance (legacy import CLI or future
  source catalog only). All other port surfaces landed in S4a–S4d. Review-state
  workflow (submit/return/publish + immutable-release confirmation) in `5a8c14cee`;
  source-drift adoption detection in `dcca3a722`. **Open spec gap recorded in
  tech-debt:** private/withdrawn source eligibility is the ContentCatalogPort's job
  and remains unenforced until the catalog lands.
- [~] Task: Complete desktop-first browser acceptance plus app/backend lint, type, test, build, graph, and independent permission/UI review gates.
  — Lint/type/test/build all green (app 29 files/251 tests; domain workbook scope
  25 files/324 tests; `tsc` + `next build` clean). Graph gate: the shared graph.db
  predates apps/workbooks entirely (repo-wide staleness, Aug 1); a scoped scratch-db
  scan + audit of apps/workbooks + packages/domain ran clean instead. Independent
  `claude -p` permission/UI review over the S4 diff found 2 High (dead print button
  behind the iframe sandbox; un-typeable JSON editors), 5 Medium, 6 Low — ALL fixed
  (74bf4f648, 42b5fe22f, 9feff4919) with tenant isolation, XSS/escaping, secrets,
  and audit-rollback explicitly confirmed clean. **Gap: desktop-first browser
  acceptance is blocked** — this environment has no DATABASE_URL or Company SSO
  credentials, so the app cannot be driven end-to-end here; needs a credentialed
  workstation run before the S4 user-manual verification.
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
