# Specification: Workbook Publishing Platform and Ecosystem Import

## Overview

Import `advantage-workbooks` as `apps/workbooks`, an internal web-based curriculum
publishing application. It replaces filesystem persistence, disk JSON ingestion,
direct provider SDK calls, and local artifact storage with governed backend modules,
S3-compatible storage, durable rendering, and the internal AI adapter.

Workbooks is a projection of shared curriculum, not another canonical content corpus.
Reading and Primary retain ownership of articles, questions, media, and live-app
add-ons. Workbooks owns drafts, review state, immutable editions, release artifacts,
and migration provenance. Approved reusable additions return to their owning product
only through typed, authorized, idempotent promotion commands.

## Baseline and Evidence

- Reading Advantage already exposes `mapArticleToWorkbookJSON` and an article workbook
  export route. The mapper has no indexed callers and is therefore a useful parity
  fixture, not a shared contract to extend in place.
- Primary Advantage and Reading Advantage have separate article model/controller
  surfaces with differing shapes and legacy ownership boundaries.
- The standalone dashboard persists workbook projects and lessons through filesystem
  read/write helpers. That persistence cannot provide concurrent editing, tenant
  scoping, immutable releases, or auditable artifact provenance.
- `@reading-advantage/storage` provides the provider-neutral object operations needed
  for asset lookup and immutable rendered-artifact storage.

## Product and Boundary Decisions

- The MVP serves explicit internal editor, publisher, and auditor employee roles through Accounts SSO; teachers and students do not receive production-editor authority.
- Workbooks owns global company publishing data only. School assignment, licensing, teacher activity, and knowledge state remain tenant-scoped in Reading or Primary; editions and AI evidence contain no PII.
- Reading and Primary each expose a versioned, authenticated catalog adapter behind `ContentCatalogPort`; Workbooks never joins their databases or imports their UI/controller code.
- Eligible source content is published, approved, rights-cleared, level-tagged, media-complete, and non-withdrawn. URLs, pasted remote content, drafts, and private/custom source records fail closed.
- Drafts are optimistic-concurrency controlled. Editions are immutable, versioned, auditable, supersedable, and revocable; source drift is explicitly adopted only into a new draft revision.
- Print-ready PDF is the primary artifact. Private S3-compatible artifacts use signed links or stable app redirects; public samples require separate approval.
- AI creates provenance-rich review proposals only. A publisher distinct from the generator approves releases and any typed promotion into a source app.
- The first classroom signal is teacher-recorded unit coverage in the consuming app; OCR, bubble-sheet grading, and paper-answer capture are excluded.

## Stories

### Story S0: Establish the workbook product boundary

**As a** company owner
**I want** explicit publishing ownership, roles, rights, privacy, and rollout policy
**So that** the port does not recreate a local authoring silo or mix employee and school authority.

**Acceptance Criteria:**

- Given an authoring action, When evaluated, Then only the defined employee roles may perform it.
- Given publishing and classroom data, When inspected, Then global workbook operations and product-local tenant data remain separate.

**Estimate:** S
**Priority:** Must


**As a** curriculum editor
**I want** to select eligible Reading Advantage and Primary Advantage articles through
one normalized catalog contract
**So that** a workbook draft can reuse existing content and media without copying or
mutating its source record.

**Acceptance Criteria:**

- Given an eligible source article, When it is selected for a workbook draft, Then its
  normalized record includes source app, stable source ID, source revision, content
  hash, structured body and question data, and storage asset keys.
- Given two source apps with different article shapes, When either is selected, Then
  both satisfy the same strict Zod contract or return a structured incompatibility
  error.
- Given a source article outside the editor's authorized tenant or approval state,
  When it is requested, Then the catalog rejects it without exposing its content or
  asset location.
- Given an asset, When it is included in a normalized record, Then the record stores a
  canonical storage key and metadata, never a mutable public URL as its authority.

**Estimate:** M
**Priority:** Must

### Story S2: Publish immutable editions

**As a** workbook publisher
**I want** to turn an editable workbook draft into an immutable edition
**So that** every printed or digital release remains tied to the exact content and
assets that were approved.

**Acceptance Criteria:**

- Given an editable draft, When it is published, Then publication is transactional and
  assigns an immutable edition version with a complete normalized content snapshot.
- Given a released edition, When its source article or source asset later changes, Then
  the released edition's snapshot, source revision, hashes, and referenced asset keys
  do not change.
- Given a publisher tries to change a released edition, When the change is submitted,
  Then the system rejects it and requires a new draft version.
- Given a source snapshot is incomplete, unavailable, or invalid, When publication is
  attempted, Then no edition is released and a structured error explains the missing
  source or asset.

**Estimate:** L
**Priority:** Must

### Story S3: Import legacy workbook projects and assets

**As a** publisher
**I want** standalone projects and assets imported with hashes and provenance
**So that** the desktop dashboard can become read-only without losing historical work.

**Acceptance Criteria:**

- Given a legacy project, lesson, template, font, image, or artifact, When dry-run, Then its source ID/path, hash, object key, parse status, and exceptions are recorded.
- Given an approved import manifest, When rerun, Then import is idempotent and preserves original identifiers without silently repairing invalid records.
- Given imported binaries, When stored, Then immutable namespaced object keys replace runtime local-disk paths.

**Estimate:** L
**Priority:** Must

### Story S4: Use the web publishing workspace

**As a** curriculum editor
**I want** a secure browser workspace for drafts, catalog selection, editing, and release review
**So that** the production workflow no longer depends on the standalone dashboard.

### Story S5: Render and distribute approved editions

**As a** publisher or auditor
**I want** durable, traceable, private release artifacts
**So that** approved editions can be reproduced, delivered, and revoked safely.

### Story S6: Review AI proposals and promote reusable additions

**As a** curriculum editor
**I want** AI suggestions reviewed and selectively promoted into their owning source app
**So that** workbook work strengthens live curriculum without unsafe automatic change.

### Story S7: Pilot classroom consumption and retire standalone writes

**As a** product owner
**I want** representative Primary and Reading pilots with controlled cutover
**So that** migration, publication, ecosystem reuse, and classroom consumption are proven before rollout.

## Functional Requirements

- FR-1: Define source-catalog, normalized article, asset reference, workbook draft,
  immutable edition, and render-artifact Zod contracts in an owning shared backend
  module.
- FR-2: Provide transport-independent domain commands for creating drafts, selecting
  source content, publishing an edition, creating a render request, and recording an
  artifact.
- FR-3: Store workbook state through Drizzle migrations with tenant scoping,
  authorization, transactions, append-only release history, and optimistic-concurrency
  protection for editable drafts.
- FR-4: Keep source articles read-only to this workflow. A workbook release must
  snapshot normalized content; it must not overwrite a Reading or Primary article.
- FR-5: Use `@reading-advantage/storage` through its interface for source asset checks,
  signed preview/distribution access, and immutable artifact records. Do not introduce
  a direct provider SDK dependency.
- FR-6: Make all source/version/hash/template/renderer decisions queryable for audit
  and repeatable validation.

- FR-7: Add `apps/workbooks` as a separately deployable internal web app with thin UI and route layers over an owning workbook backend module.
- FR-8: Import legacy projects, lessons, templates, fonts, and assets through an idempotent dry-run/manifest/import workflow with original-ID and hash provenance; eliminate runtime local-disk persistence.
- FR-9: Render immutable edition snapshots only through the shared durable worker and keep full rendering/retries out of request paths.
- FR-10: Keep artifacts private by default and provide authorized, revocable signed preview/download access with source/template/renderer/checksum provenance.
- FR-11: Route generation through `@reading-advantage/ai`; output is proposal-only until editorial review and publisher approval.
- FR-12: Promote approved reusable additions through source-owned Reading/Primary commands; prohibit direct workbook-to-source database writes and automatic overwrites.
- FR-13: Pilot one imported Primary workbook and one Reading catalog/promotion workflow before standalone writes are frozen or broad migration is authorized.

## Non-Functional Requirements

- All external and cross-app inputs must have runtime Zod validation.
- Publishing operations use explicit global company scope; product-local assignments,
  access, and knowledge state remain school/tenant-scoped. Every path is authorized by
  backend permissions, not frontend identifiers.
- Publishing must be idempotent and transactional; a failed publication must not leave
  a partially released edition or orphaned provenance row.
- Hashing must use a documented canonical serialization so equivalent normalized
  content produces the same digest across runs.
- Source-article reads, asset validation, publication, and artifact registration must
  produce structured audit metadata without logging sensitive content or credentials.
- New exported contracts and domain functions require focused Vitest coverage and
  JSDoc compliant with `AGENTS.md`.

## Track-Level Acceptance Criteria

1. A Reading Advantage or Primary Advantage article can be selected through one tested
   normalized catalog contract without copying it into a second mutable corpus.
2. Every published edition records immutable normalized content, source ID/revision,
   content digest, and canonical asset keys.
3. Editing a source article or its active asset after release cannot alter an existing
   edition or artifact provenance record.
4. Every stored artifact is traceable to an edition, content snapshot digest, template
   version, renderer version, artifact digest, and object-storage key.
5. Tenant/authorization, invalid-source, unavailable-asset, duplicate-publication,
   and source-drift cases are covered by tests.
6. A manual verification can select a source article, publish an edition, mutate the
   source in a safe fixture, and prove the edition render input remains unchanged.

## Explicit MVP Non-Goals

- Replacing Reading Advantage or Primary Advantage article storage with a new canonical
  content system.
- Arbitrary web URL ingestion, scraping, AI auto-publication, automatic source overwrite,
  or direct workbook-to-source database writes.
- Teacher-facing free-form generation or teacher/student production-editor access.
- Real-time collaboration, OCR, bubble-sheet capture, automated paper grading, public
  marketplace/sharing, LMS/LTI integration, DRM, or print-shop logistics.
- Mobile-first production editing, big-bang migration, or automatic source changes into
  drafts or editions.
- Full GSE/Mastery rollout; the initial knowledge-state connection is separately
