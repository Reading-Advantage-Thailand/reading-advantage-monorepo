# Phase 1 — Prisma 7 Rejection Rationale

> **Track:** `drizzle045_major_migration`
> **Phase:** 1 (Contract & Schema Definition)
> **Decision:** **Prisma 7 is explicitly rejected.** primary-advantage
> migrates off Prisma to Drizzle, not to Prisma 7.

This rationale is the deliverable for Phase 1 Task 3 of the
`drizzle045_major_migration` track. It records the rejection of
Prisma 7 as a monorepo-wide upgrade target and points
primary-advantage at its existing Prisma-to-Drizzle migration path
instead. The decision is **rejected**, not deferred or "to be
evaluated" — primary-advantage will not adopt Prisma 7.

---

## 1. Decision

**Prisma 7 is rejected.** The monorepo does **not adopt** Prisma 7.

The chosen alternative for primary-advantage is the existing
Prisma-to-Drizzle migration path (the program that already closed out
reading-advantage, science-advantage, and the shared backend in
Q2 2026). primary-advantage's own migration to Drizzle continues as
a follow-up track carved out by
`measure/tracks/prisma_drizzle_slice_cleanup_20260505/spec.md`
(FR-4 carve-out), not by adopting Prisma 7.

The decision is a **rejection**, not a deferral:

- Prisma 7 will not be installed in any workspace in this monorepo.
- No `package.json` will declare `prisma@^7` or `@prisma/client@^7`.
- The existing `prisma:generate` / `prisma:migrate-dev` /
  `prisma:migrate-deploy` scripts in `apps/primary-advantage` remain
  pinned to Prisma 6.x until the primary-advantage Prisma-to-Drizzle
  migration track lands.
- The root `package.json` `pnpm.peerDependencyRules` entries that
  exempt `@prisma/client` and `prisma` from peer-resolution remain
  in place until primary-advantage migration lands.

---

## 2. Why Prisma 7 is rejected

### 2.1 Monorepo direction

The reading-advantage monorepo consolidated on **Drizzle ORM** as the
single ORM in 2026 Q1–Q2. Tracks 1–3 of the Prisma → Drizzle program
closed out reading-advantage, science-advantage, and the shared
backend (`packages/db`, `packages/domain`, `packages/api`,
`packages/auth`) by 2026-05-26. Adopting Prisma 7 would re-introduce
a second ORM into the shared backend — the exact anti-pattern the
migration program was created to eliminate.

`measure/tracks/prisma_drizzle_slice_cleanup_20260505/spec.md`
documents the carve-out:

> Out of Scope: primary-advantage Prisma → Drizzle migration
> (carved out as new track `primary_advantage_drizzle_migration_*`).
> primary-advantage retains its own Prisma schema, NextAuth, and
> `@prisma/client` runtime until that track lands.

The carve-out names primary-advantage explicitly. Prisma 7 is not
named because it is **not on the table** — it is a non-option.

### 2.2 Operational cost

Two ORMs in the same monorepo means:

- Two migration workflows (`drizzle-kit` + `prisma migrate`).
- Two connection-pool strategies (`postgres-js` + `@prisma/client`).
- Two schema sources of truth (`packages/db/src/schema/` + each
  app's `prisma/schema.prisma`).
- Two query-builder patterns (`db.select()` + `prisma.<model>.findMany()`).
- Two test-stack surfaces (Drizzle's `packages/db/src/__tests__/*` +
  primary-advantage's Prisma migrations).

primary-advantage's existing Prisma-to-Drizzle migration track
delivers **one** ORM for the whole monorepo at lower ongoing cost
than upgrading primary-advantage in place to Prisma 7.

### 2.3 Lock-in avoidance

The monorepo's `AGENTS.md` provider-neutrality rule (see
`AGENTS.md` §"Provider Neutrality Rule") says:

> Provider-specific code belongs behind adapters.
>
> Application code should depend on
> `auth.login()` / `storage.put()` / `ai.generateText()` style
> internal interfaces, not on provider SDKs.

Drizzle is a query-builder that operates on the SQL primitives; it
does not lock the monorepo into a vendor-specific query DSL. Prisma 7
introduces a new client-generator pipeline and a new query engine
(`@prisma/adapter-pg` plus a queryCompiler binary) that **are**
vendor-specific. Adopting Prisma 7 deepens the lock-in the monorepo
is actively trying to unwind.

### 2.4 Track-coherence

The current `drizzle045_major_migration` track is the
**Drizzle-only** upgrade. The spec (§6, "Prisma 7 is NOT adopted —
primary-advantage continues its Prisma-to-Drizzle migration path")
makes the rejection an explicit acceptance criterion:

> 6. Prisma 7 is NOT adopted — primary-advantage continues its
>    Prisma-to-Drizzle migration path.

The contract test (`packages/db/src/__tests__/drizzle045-phase1-contracts.test.ts`)
asserts this rationale exists in writing and references both
**Prisma 7** and **primary-advantage** explicitly. Adopting Prisma 7
would invalidate the track's own acceptance criteria.

---

## 3. The chosen alternative: primary-advantage → Drizzle

primary-advantage continues on its existing Prisma-to-Drizzle
migration path. That path is owned by the follow-up track carved out
by `prisma_drizzle_slice_cleanup_20260505` (FR-4) and references this
rationale as the upstream decision.

When the primary-advantage migration track lands:

- primary-advantage's `prisma/schema.prisma` is removed.
- The shared `packages/db/src/schema/` becomes the single source of
  truth for all ten apps in the monorepo.
- `apps/primary-advantage/package.json` no longer declares
  `prisma`, `@prisma/client`, or `@prisma/adapter-pg`.
- The root `package.json` `pnpm.peerDependencyRules` entries that
  exempt `@prisma/client` / `prisma` are removed.
- The lockfile's `@prisma/*` entries are removed.
- `prisma:generate` / `prisma:migrate-dev` / `prisma:migrate-deploy`
  scripts in `apps/primary-advantage/package.json` are deleted.

Until that track lands, primary-advantage remains on Prisma 6.x
(`^6.19.0`) per its current `apps/primary-advantage/package.json`.

---

## 4. What is NOT changed by this rationale

- `apps/primary-advantage/package.json` keeps its current Prisma 6.x
  pins.
- The root `package.json` `pnpm.peerDependencyRules.ignoreMissing`
  entries that exempt `@prisma/client` and `prisma` stay in place.
- The root `package.json` `onlyBuiltDependencies` entries (if any)
  for `prisma` / `@prisma/client` stay in place.
- No `drizzle-orm` bump is needed in primary-advantage because it
  doesn't currently consume `@reading-advantage/db` (it has its own
  Prisma client).
- No Drizzle 0.45 migration work is blocked by this rationale —
  Phase 3 of this track proceeds against the Drizzle side
  regardless.

---

## 5. Cross-references

- `measure/tracks/drizzle045_major_migration/spec.md` AC #6
  ("Prisma 7 is NOT adopted — primary-advantage continues its
  Prisma-to-Drizzle migration path") — the spec-level anchor.
- `measure/tracks/drizzle045_major_migration/plan.md` Phase 1
  ("Prisma 7 is explicitly rejected. primary-advantage will migrate
  off Prisma to Drizzle, not to Prisma 7.") — the plan-level anchor.
- `measure/tracks/prisma_drizzle_slice_cleanup_20260505/spec.md`
  (Out of Scope + FR-4 carve-out) — the upstream decision that
  carved primary-advantage out of the slice-cleanup track.
- `AGENTS.md` "Provider Neutrality Rule" — the architectural
  principle the rejection enforces.
- `apps/primary-advantage/package.json` — current Prisma 6.x pin.

---

## 6. Provenance

- Decision source: track spec §6 ("Prisma 7 is NOT adopted") and
  plan preamble ("Prisma 7 is explicitly rejected").
- primary-advantage ORM stack: `apps/primary-advantage/package.json`
  (Prisma 6.19.0, `@prisma/adapter-pg` 7.0.0, `@prisma/client` 6.19.0).
- Carve-out source: `measure/tracks/prisma_drizzle_slice_cleanup_20260505/spec.md`.
- Provider-neutrality source: `AGENTS.md` "Provider Neutrality Rule"
  and "Core Architecture Decisions" sections.