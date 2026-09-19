# Specification: Accounting Broken UX Fixes

Track ID: `accounting_broken_ux_fixes_20260919`. Type: bug. App: `apps/accounting`.

## Overview

`docs/accounting-ux-refactor-plan.md` is the specification of record for this track.
This track covers Phase 0 (Broken UX) from that document.

## Acceptance Criteria

- Complete every numbered item in Phase 0 of the source roadmap.

## Out of Scope

- Framework upgrades. The version policy forbids them in feature work.
- New dependencies. Every fix uses an installed package or the platform.
- `packages/backend/src/modules/accounting`. The audit read it to verify the money claims in section 2. Only the currency allowlist in Phase 4 changes it.
- The deployment scripts under `apps/accounting/scripts` and the release gates in `app/lib/__tests__/*.red.test.ts`. They belong to the deployment track.
- The evidence storage adapter. `app/lib/private-evidence-storage.ts` is correct, and the audit records no defect in it.
