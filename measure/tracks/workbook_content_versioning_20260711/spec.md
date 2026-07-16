# Specification: Versioned Workbook Content and Editions

## Overview

Create a versioned workbook-edition foundation that reuses article content and media
already owned by Reading Advantage and Primary Advantage. A workbook project may work
with current source content while it is a draft, but publication must record an
immutable normalized content snapshot, source revision, content hash, storage asset
keys, and rendering provenance. A released workbook must not silently change when an
article, asset, template, or source app changes later.

This is the foundation for importing the `advantage-workbooks` dashboard. It does not
make the dashboard or a new content database the owner of articles and assets.

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

## Stories

### Story S1: Select source content

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

### Story S3: Reproduce release artifacts

**As a** publisher or auditor
**I want** every rendered workbook artifact to identify its exact edition and inputs
**So that** we can reproduce, verify, and revoke a release without guessing which
content was used.

**Acceptance Criteria:**

- Given a released edition, When a render request is created, Then it uses only the
  edition snapshot plus a versioned template/render configuration rather than live
  source article reads.
- Given a rendered PDF or equivalent artifact, When it is stored, Then its metadata
  records edition ID, artifact checksum, template version, renderer version, source
  snapshot digest, and storage key.
- Given an auditor retrieves an artifact record, When all referenced snapshot assets
  still exist, Then the recorded inputs can be validated against their digests before
  rendering or distribution.
- Given an artifact or referenced asset is unavailable or mismatched, When validation
  runs, Then the edition is flagged and no replacement artifact is silently substituted.

**Estimate:** M
**Priority:** Must

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

## Non-Functional Requirements

- All external and cross-app inputs must have runtime Zod validation.
- All access and persistence paths must be scoped by school/tenant and authorized by
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

## Out of Scope

- Importing or redesigning the `advantage-workbooks` dashboard UI.
- Bulk migration of the dashboard's filesystem projects and lessons.
- Replacing Reading Advantage or Primary Advantage article storage with a new canonical
  content system.
- Full PDF rendering implementation, print-layout redesign, or a production render
  worker. This track defines and validates the immutable render input and artifact
  provenance required by a later rendering track.
- Mastery Advantage objective mapping, workbook pedagogical coverage matrices, or
  automated content generation.
- Automatic promotion of source article changes into published editions.
