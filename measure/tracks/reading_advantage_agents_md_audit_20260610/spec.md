# Spec: AGENTS.md Compliance Audit — reading-advantage (STUB)

> **Stub track.** Captures scope only; full spec/plan to be generated when the audit
> is opened, following `measure/agents-md-audit-protocol.md` (v1.1) and the
> science-advantage pilot (`agents_md_audit_science_advantage_20260603`).

## Why now

The science-advantage pilot validated the audit protocol. reading-advantage is the
largest remaining compliance gap in the monorepo:

- **209** `app/**/route.ts` files import `db` directly; **0** route through
  `@reading-advantage/domain`, `assertCan`, or `TenantDB`
  (`measure/tech-debt.md` row `audit_20260526`, **Critical, Open**). This is ~8× the
  surface the science pilot's F-305 umbrella covered (27 routes).
- Same downstream concerns the pilot surfaced are likely present: tenancy predicates,
  Zod boundary validation, observability, `ignoreBuildErrors`.

## Scope

1. Pre-flight: `build-graph scan . ./graph.db` (Graph-Aware Mode); confirm non-empty.
2. Run the 13-section protocol over `apps/reading-advantage/`.
3. Produce `measure/audit-reports/reading-advantage_20260610/`:
   `executive-summary.md`, `checklist.md`, `findings.md`, `migration-tracks.md`.
4. Classify findings by severity; propose migration tracks (expect a domain-bypass
   umbrella analogous to F-305, but far larger).
5. Reconcile against the existing `audit_20260526` tech-debt row.

## Acceptance criteria

- [ ] Non-empty `graph.db` confirmed before audit (protocol v1.1 §3.6).
- [ ] All 13 protocol sections scored.
- [ ] Findings filed with canonical IDs; migration tracks proposed in priority order.
- [ ] `audit_20260526` tech-debt row updated/superseded by the new finding IDs.

## Notes

Out of scope here: implementing the remediation tracks (those are separate tracks the
audit proposes). This track produces the audit artifacts only.
