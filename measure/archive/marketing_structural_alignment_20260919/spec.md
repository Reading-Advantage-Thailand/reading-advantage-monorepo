# Specification: Marketing Structural Alignment

Track ID: `marketing_structural_alignment_20260919`. Type: bug. App: `apps/marketing`.

## Overview

`docs/marketing-ux-refactor-plan.md` is the specification of record for this track.
This track covers Phase 4 (Structural alignment) from that document.

## Acceptance Criteria

- Complete every numbered item in Phase 4 of the source roadmap.

## Out of Scope

- Framework upgrades. The version policy forbids them in feature work. A move from `vinext` to stock `next` is a migration, not a fix; section 2 only makes the code work under both.
- New dependencies. Every fix uses an installed package or the platform.
- The release and smoke scripts under `scripts/`. They are operator tooling, not user pages. Section 7 names the two lines that a deletion of `/api/health/db` must update.
- A second language. `app/lib/i18n.ts` holds one locale by design. Section 7 records the cost of a later change.
- The shared `@reading-advantage/auth-client` package. This application already satisfies the session route contract that `apps/sales-advantage` breaks.
- Per-row tenant scoping of the marketing tables. `app/lib/auth.ts:1-17` records that the tables hold no `schoolId` column. That change belongs to the schema, not to the pages.
