# Specification: Accounts Console Write Correctness

Track ID: `accounts_console_write_correctness_20260919`. Type: bug. App: `apps/accounts`.

## Overview

`docs/accounts-ux-refactor-plan.md` is the specification of record for this track.
This track covers Phase 1 (Write correctness in the console) from that document.

## Acceptance Criteria

- Complete every numbered item in Phase 1 of the source roadmap.
- Two fast role toggles keep both roles; a double click on "CREATE IDENTITY" creates one employee; a 500 with an HTML body shows a readable message.

## Out of Scope

- Framework upgrades. The version policy forbids them in feature work.
- New dependencies. Every fix uses an installed package or the platform.
- `packages/backend/src/modules/company-identity`. The audit read the route adapter and the capability executor to verify section 2 and section 6. Only the `package.json` exports entry in Phase 4 changes that package.
- The scripts under `apps/accounts/scripts`. The audit read `demo-accounts.ts` and confirmed that it reads every password from the environment and hardcodes none. The bootstrap and migration scripts belong to the deployment track.
- Sharing the sign-in design between Accounts and Accounting. Accounts hand-writes `app/globals.css` and Accounting uses `@reading-advantage/ui`. The two are far apart, and a merge is a product decision, not a defect. Record it in `measure/tech-debt.md`.
