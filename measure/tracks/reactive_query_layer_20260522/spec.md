# Specification: Reactive Query Layer — STUB

> **Status: STUB — design captured, not yet ready to plan or implement.**
> This track records decisions settled during the 2026-05-22 design session so
> they are not lost. It must be expanded into a full spec + plan before any work
> starts — see "Next Step" below.

## Goal

Give the product **reactive queries**: a client subscribes to a query, and a
write that affects that query's data pushes a re-run, so the UI updates without
manual refetching. Built on the monorepo's own Postgres + Drizzle + tRPC stack —
no third-party backend.

> Internal note (not for jr-dev-facing requirements): "backend-as-code in the
> style of Convex" is the strategic motivation. It must NOT appear in
> implementation requirements or do any explanatory lifting. When this stub is
> expanded, specify concrete behavior only — never "like Convex."

## Blocked On (hard prerequisites)

1. **`prisma_drizzle_slice_cleanup_20260505` (Track 4)** — the full
   Prisma→Drizzle migration. Reactivity instruments the domain layer; until
   every read goes through `packages/domain` there is no single chokepoint to
   instrument. Doing reactivity before the migration means instrumenting 145+
   scattered Prisma call sites and then redoing it — paying twice.
2. **`connection_pooling_20260522`** — transaction-mode pooling is incompatible
   with `LISTEN/NOTIFY`; reactivity needs the `DIRECT_DATABASE_URL` escape hatch
   that track establishes.

## Decisions Settled This Session (2026-05-22)

1. **No codegen.** Convex's `_generated/` codegen is an implementation detail,
   not a feature to copy. Drizzle's type inference already provides
   `Doc`/`Id`-equivalent types; tRPC's explicit router composition (the exported
   `AppRouter` type) already provides the typed API surface. Do **not** build a
   codegen step.
2. **The domain layer is the instrumentation point.** Reactivity is
   instrumentation on `packages/domain`, not a second app-wide migration. The
   apps are migrated once (Tracks 2–4); reactivity rides on top additively.
3. **Read/write seam already enforced.** Tracks 1–3 require every domain helper
   to be a pure read or a pure write, name-classified (`get*` / `list*` /
   `count*` / `exists*` / `find*` = read; all else = write). This track consumes
   that: reads become re-runnable reactive queries; writes emit invalidation. A
   reactive query MUST be safe to re-run — the purity rule guarantees it.
4. **Connection model.** Reactivity adds long-lived **browser→server**
   WebSocket/SSE connections (a Node-process scaling concern). It does **not**
   add one Postgres connection per client: the server holds a small fixed number
   of `LISTEN` connections and fans out. Postgres connection count is not the
   scaling limit.
5. **Pooler interaction.** Transaction-mode PgBouncer breaks `LISTEN/NOTIFY`;
   listener connections must use `DIRECT_DATABASE_URL` (see
   `connection_pooling_20260522`).

## Open Decisions (gate the full spec)

### Reactivity approach — choose one before expanding this track

| Approach | Summary | Trade-off |
|---|---|---|
| **Table-level `LISTEN/NOTIFY`** *(leaning)* | Writes emit `NOTIFY`; any subscription that read table `T` re-runs when `T` changes. | Coarse (table-grained — over-fires), but all our own code, no new infra, jr-maintainable. ~80% of the value. |
| Adopt a sync engine | ElectricSQL / PowerSync / Rocicorp Zero on top of Postgres. | Row-level precision, least code to write — but a heavy dependency, new operational surface, vendor learning curve. |
| WAL row-level streaming | Our own change feed from Postgres logical replication (`wal2json`). | Row-level precision, no vendor — but the most infra to build and operate; senior-level work. |

### Other open questions
- **Transport:** WebSocket vs SSE for tRPC subscriptions; does a transport layer
  need standing up? The deployment target affects this — on Cloudflare Workers,
  WebSocket fan-out is handled via Durable Objects, not a long-lived Node
  process; on GCP Cloud Run a Node container holds the sockets directly. Settle
  the deployment target (see `connection_pooling_20260522`) before designing transport.
- **Scope:** app-wide reactivity, or targeted high-value surfaces first
  (dashboards, leaderboards, notifications)?
- **Invalidation granularity:** if `LISTEN/NOTIFY`, accept table-level, or add a
  lightweight per-query read-set tag for precision?

## Next Step

After Track 4 and `connection_pooling_20260522` land, and once the reactivity
approach above is chosen, expand this stub into a full specification (FRs, ACs,
NFRs) and a phased `plan.md`. Until then this track is not schedulable.

## Out of Scope (provisional)

- Offline-first / local-first client persistence.
- Optimistic updates beyond what tRPC already offers.
- Reactivity for non-product surfaces (the marketing site).
