# Track: AGENTS.md Compliance Audit — science-advantage (pilot)

> **Type:** Chore (audit + track generation)
> **Goal:** Run the AGENTS.md compliance audit protocol against `apps/science-advantage/` and produce the four required artifacts: `checklist.md`, `findings.md`, `migration-tracks.md`, `executive-summary.md`.
> **Output:** Migration track proposals for every Critical/High finding, plus a refined protocol for the next-app rollout.

## Why

The 2026-05-26 one-off audit (`measure/tech-debt.md` row `audit_20260526`) surfaced 3 Critical findings for science-advantage but did not produce a structured checklist, classification scheme, or migration track plan. This track runs the new protocol end-to-end to (a) validate the protocol on the pilot, (b) generate actionable tracks, and (c) establish a baseline percentage of compliance.

## What

Apply the 13-section checklist in `measure/agents-md-audit-protocol.md` to `apps/science-advantage/`. Record pass/fail/N/A for each of the 80+ items, classify failures by severity, and propose Measure tracks for each Critical and High finding.

## Non-goals

- Fixing any of the findings. This track only audits.
- Auditing shared packages (`packages/*`) — separate track.
- Auditing other apps — this is the pilot; refine the protocol first.

## Acceptance Criteria

1. `measure/audit-reports/science-advantage_20260603/checklist.md` exists with a row for every item in the protocol, marked PASS/FAIL/N/A/DEFERRED.
2. `measure/audit-reports/science-advantage_20260603/findings.md` exists with one row per FAIL, classified by severity, with file:line evidence.
3. `measure/audit-reports/science-advantage_20260603/migration-tracks.md` proposes Measure tracks for every Critical and High finding.
4. `measure/audit-reports/science-advantage_20260603/executive-summary.md` fits on one page and is shared with the user for sign-off.
5. New Critical/High findings are added as rows in `measure/tech-debt.md`.
6. Proposed tracks are added to `measure/tracks.md` under a "Pending Tracks — Audit Findings" section.
7. The pilot produces a list of protocol refinements (added/removed/reworded check items) for the v1.1 protocol update.

## References

- Protocol: `measure/agents-md-audit-protocol.md`
- Prior one-off audit: `measure/tech-debt.md` row `audit_20260526`
- Known issues for science-advantage:
  - 360 tsc errors / 4 lint errors (pre-existing)
  - 27 `route.ts` files bypass domain layer
  - `/assignments` page is a hardcoded stub
  - `proxy.ts` admin guard (resolved 2026-05-26)
  - tsc blocker: `@testing-library/jest-dom/vitest` types missing from `vitest.unit.setup.ts`
