# Specification: Accounting Money Correctness

Track ID: `accounting_money_correctness_20260919`. Type: bug. App: `apps/accounting`.

## Overview

`docs/accounting-ux-refactor-plan.md` is the specification of record for this track.
This track covers Phase 1 (Money correctness) from that document.

## Acceptance Criteria

- Complete every numbered item in Phase 1 of the source roadmap.
- A JPY record exports the true baht-per-yen rate; a record submitted at 06:00 Bangkok time appears in that day's export; the review list shows 123.45 THB for 12345 satang.

## Out of Scope

- Framework upgrades. The version policy forbids them in feature work.
- New dependencies. Every fix uses an installed package or the platform.
- `packages/backend/src/modules/accounting`. The audit read it to verify the money claims in section 2. Only the currency allowlist in Phase 4 changes it.
- The deployment scripts under `apps/accounting/scripts` and the release gates in `app/lib/__tests__/*.red.test.ts`. They belong to the deployment track.
- The evidence storage adapter. `app/lib/private-evidence-storage.ts` is correct, and the audit records no defect in it.
