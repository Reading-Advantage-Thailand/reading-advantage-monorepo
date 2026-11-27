# Implementation Plan: Reactive Query Layer — STUB

> **This track is a STUB.** It has no real phases or tasks until it is expanded —
> see `spec.md` "Next Step". It is blocked on Track 4
> (`prisma_drizzle_slice_cleanup_20260505`) and `connection_pooling_20260522`,
> and on the reactivity-approach decision recorded in `spec.md`.

## Phase 0: Expand This Track (do this first, when unblocked)

- [ ] Task: Confirm prerequisites are complete (Prisma→Drizzle migration; connection pooling)
- [ ] Task: Ratify the reactivity approach (table-level `LISTEN/NOTIFY` / sync engine / WAL streaming — see `spec.md`)
- [ ] Task: Decide transport (WebSocket vs SSE) and scope (app-wide vs targeted surfaces)
- [ ] Task: Rewrite this `plan.md` with real phases and tasks; promote `spec.md` from STUB to a full specification
