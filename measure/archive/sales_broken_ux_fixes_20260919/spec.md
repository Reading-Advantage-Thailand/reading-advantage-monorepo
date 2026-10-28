# Specification: Sales Advantage Broken UX Fixes

Track ID: `sales_broken_ux_fixes_20260919`. Type: bug. App: `apps/sales-advantage`.

## Overview

`docs/sales-advantage-ux-refactor-plan.md` is the specification of record for this track.
This track covers Phase 0 (Broken UX) from that document.

## Acceptance Criteria

- Complete every numbered item in Phase 0 of the source roadmap.

## Out of Scope

- Framework upgrades. The version policy forbids them in feature work.
- New dependencies. Every fix uses an installed package or the platform.
- The release, seeding, and verification scripts under `scripts/`. They are operator tooling, not user pages. The missing `drizzle-orm` declaration is the one exception, because it breaks a declared `package.json` script.
- The curriculum JSON files under `curriculum/`. They hold content, not code.
- The shared `@reading-advantage/auth-client` package. Section 2 names one defect in it. The fix in this application is to correct the session route contract, which the marketing application already satisfies. A change to the shared package needs its own track.
