# Implementation Plan: Primary Advantage Runtime Boundary Repair

## Phase 1: Contract & Schema Definition

- [~] Task: Capture the reproducible build failure and import denominator.
  - [ ] Record the `proxy.ts` → `lib/session.ts` → `@reading-advantage/db` → `postgres` chain from a CI-compatible build.
  - [ ] Freeze the four-client-component denominator and distinguish executable imports from type-only contracts.
  - [ ] Inventory protected layouts, routes, and APIs plus their current role policy.
- [ ] Task: Define runtime-safe session and client contracts.
  - [ ] Define an Edge/browser-safe session-cookie-name contract with no database or server-session imports.
  - [ ] Define client DTO/runtime-constant contracts for activity values, assignment rows, and license rows.
  - [ ] Define Node-only session and role guards that validate opaque tokens before any authorization decision.
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md).

## Phase 2: Test

- [ ] Task: Write failing runtime-boundary tests.
  - [ ] Prove proxy and client import graphs cannot reach the database barrel, Drizzle runtime schemas, or `postgres`.
  - [ ] Prove the replacement client contracts contain the values and row shapes each component needs.
- [ ] Task: Write failing server authorization tests.
  - [ ] Cover missing, malformed, expired, and revoked session tokens.
  - [ ] Cover the existing allowed and denied role groups and prove proxy cookie presence is not authorization.
- [ ] Task: Write focused UI/route regressions.
  - [ ] Cover article-read chart filtering, student assignment rendering, and license edit/list DTO consumption.
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md).

## Phase 3: Implement

- [ ] Task: Isolate Node-only session resolution.
  - [ ] Remove `currentUser`/database reachability from `proxy.ts`.
  - [ ] Retain `validateSession(db, token)` only in a Node-only server helper.
  - [ ] Move role-sensitive redirects and protected-surface decisions behind server validation.
- [ ] Task: Preserve server-authoritative access control.
  - [ ] Add or strengthen server guards for student, teacher, admin, system, and settings surfaces according to the Phase 1 inventory.
  - [ ] Verify protected APIs validate sessions independently of proxy matching.
- [ ] Task: Remove browser database imports.
  - [ ] Replace the reading-chart enum import with a browser-safe activity contract.
  - [ ] Replace assignment and license schema-derived client types with DTOs and type-only contracts.
  - [ ] Confirm all four affected components retain their data and interaction behavior.
- [ ] Task: Apply minimal server-only bundling configuration if required.
  - [ ] Externalize `postgres` only after the proxy/client paths are clean and only for Node server bundling.
  - [ ] Prove no middleware/browser fallback, shim, or ignored error was introduced.
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md).

## Phase 4: Generate Docs & Doctor

- [ ] Task: Run and record focused automated gates.
  - [ ] `CI=true pnpm --filter primary-advantage test`
  - [ ] `pnpm --filter primary-advantage check-types:compat`
  - [ ] `pnpm --filter primary-advantage check-types`
  - [ ] `pnpm turbo run lint --filter=primary-advantage`
  - [ ] `pnpm --filter primary-advantage build`
- [ ] Task: Reconcile full-root evidence.
  - [ ] Run the hosted root build and classify all outcomes against the pre-repair baseline.
  - [ ] Verify the original Primary runtime-boundary blocker is absent.
- [ ] Task: Refresh documentation and graph evidence.
  - [ ] Run `bash measure/doctor.sh` and the documented generator if present.
  - [ ] Refresh graph evidence on a safe hosted runner; do not claim a local graph refresh without resource-safe proof.
- [ ] Task: Perform authenticated non-production manual verification.
  - [ ] Verify valid roles reach only their expected route groups.
  - [ ] Verify absent/revoked sessions are rejected server-side and chart, assignment, and license flows remain usable.
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md).
