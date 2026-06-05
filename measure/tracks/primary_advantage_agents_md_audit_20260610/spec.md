# Spec: AGENTS.md Compliance Audit — primary-advantage (STUB)

> **Stub track.** Captures scope only; full spec/plan to be generated when the audit
> is opened, following `measure/agents-md-audit-protocol.md` (v1.1) and the
> science-advantage pilot (`agents_md_audit_science_advantage_20260603`).

## Why now

primary-advantage carries a Critical, mis-recorded debt:

- **15** files still import `@prisma/client`; `prisma/schema.prisma`, `migrations/`,
  and `lib/prisma.ts` still exist; `package.json` still depends on `@prisma/client`,
  `prisma`, and `@prisma/adapter-pg`
  (`measure/tech-debt.md` row `audit_20260526`, **Critical, Open**).
- The migration was **incorrectly listed as complete** in earlier registry notes.
  Any unified-backend work for this app is blocked until this is true.

## Scope

1. Pre-flight: `build-graph scan . ./graph.db`; confirm non-empty.
2. **First**, establish ground truth on the Prisma→Drizzle migration state for this app
   (the registry has been wrong before — verify against the filesystem).
3. Run the 13-section protocol over `apps/primary-advantage/`.
4. Produce `measure/audit-reports/primary-advantage_20260610/` artifact set.
5. Propose migration tracks; the Prisma removal is expected to be the load-bearing one.

## Acceptance criteria

- [ ] Prisma migration state verified against filesystem (not registry claims).
- [ ] Non-empty `graph.db` confirmed before audit.
- [ ] All 13 protocol sections scored; findings filed with canonical IDs.
- [ ] Migration tracks proposed in priority order; `audit_20260526` row reconciled.

## Notes

Coordinate with the Prisma→Drizzle program (`prisma_drizzle_slice_cleanup_20260505`,
Track 4 of 4), which explicitly carved out primary-advantage as a separate follow-up.
