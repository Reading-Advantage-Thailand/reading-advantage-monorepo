# Specification: Protocol v1.1 + graph.db Rebuild

## Overview

Pre-audit chore that (a) rebuilds `graph.db` from the current monorepo state and (b) updates `measure/agents-md-audit-protocol.md` from v1.0 (pilot) to v1.1 with the 6 refinements surfaced by the science-advantage pilot. Adds a CI gate to ensure `graph.db` stays non-empty going forward. **No application-code changes.**

## Problem

The 2026-06-03 pilot audit (`measure/audit-reports/science-advantage_20260603/`) ran against an empty `graph.db` (0 nodes, 0 edges, 0 files; 69 KB on disk). Every `build-graph search` / `callers` / `deps` query returned empty results, forcing the audit to fall back to manual `rg` for every section. The protocol's "query before grep" guidance (§Codebase Graph → Agent Rules) was not enforceable. Additionally, the pilot surfaced 6 protocol gaps (§3.6, §4.10, §5.10, §9.7, severity counting method, graph.db as a CI gate rather than a documentation rule).

## Why

Without a populated `graph.db`:
- Future audits hit the same problem (no structural facts to query).
- The §Codebase Graph "Update after structural edits" rule has not been honored for science-advantage.
- Subagent callers of `build-graph` get empty results and silently fall through to grep.

Without protocol v1.1:
- The F-305 root cause ("App does not use domain layer") is hard to express in the v1.0 ruleset.
- The F-403 (in-memory rate limiter) pattern recurs across the monorepo and needs a dedicated rule.
- The F-404 / F-901 (audit log missing) finding is currently buried in §4.7 and §9.4; a dedicated rule (§9.7) is easier to scan and gate.

## Functional Requirements

### FR-1: graph.db Rebuild

- Run `build-graph scan . ./graph.db` from the monorepo root.
- Verify `build-graph stats ./graph.db` reports >0 files, >0 nodes, >0 edges.
- Document the rebuild command in `measure/agents-md-audit-protocol.md` §Audit Procedure → Phase 0.

### FR-2: CI Gate

- Add a `scripts/ci/check-graph-db.sh` script that runs `build-graph stats ./graph.db` and exits 1 if total files = 0.
- Wire it into `.github/workflows/ci.yml` (monorepo root) as a pre-build step.

### FR-3: Protocol v1.1 Additions

Add the following rules to `measure/agents-md-audit-protocol.md`:

| New rule | Title | What it checks |
|----------|-------|----------------|
| §3.6 | Domain layer used by app routes | Every `app/**/route.ts` and `app/**/page.tsx` that needs data should import from `@reading-advantage/domain` (not from `@reading-advantage/db`). Captures the F-305 root. |
| §4.10 | Seed scripts use adapter hash | Any script that creates users must call `hashPassword` from `@reading-advantage/auth`, not `bcrypt.hash` directly. Captures F-402. |
| §5.10 | No in-memory `Map` for security state | No `new Map<string, X>()` for rate-limit/session/session-cleanup in app code. Captures F-403 (and the parallel `lib/platform/session-cleanup.ts` pattern). |
| §9.7 | Audit log present | `audit_events` table exists in `packages/db/src/schema/` AND is append-only (REVOKE UPDATE, DELETE). Captures F-404 / F-901 in a single check. |

### FR-4: Severity Counting Method

Add to `measure/agents-md-audit-protocol.md` §Severity Scheme:

> **Counting method for `route.ts` files:** Use a multiline-safe grep (`rg -l "from ['\"]@reading-advantage/db['\"]" app/`) to enumerate. The F-001 anchor's "27 of 27" count was a single-line grep; the multiline-safe retcon is 22 of 27. Critical threshold (≥25) and High threshold (10–24) are sensitive to this.

### FR-5: graph.db as a CI Precondition (not a Documentation Rule)

Move §11.6 "graph.db current" from §11 Documentation to a new §14 Pre-audit Preconditions section. Add a Pre-audit Phase 0 step: "If `build-graph stats` shows 0 files, abort audit and rebuild." Document the F-1003 incident as a "why" note.

### FR-6: Protocol Versioning

- Update `measure/agents-md-audit-protocol.md` header to show "v1.1 (2026-06-03)".
- Add a "Changelog" section at the top with the v1.0 → v1.1 deltas.

## Acceptance Criteria

1. `graph.db` on disk reports `Total files > 0`, `Total nodes > 0`, `Total edges > 0` (run `build-graph stats` and confirm)
2. `scripts/ci/check-graph-db.sh` exists, is executable, exits 1 on empty graph.db
3. `.github/workflows/ci.yml` calls `check-graph-db.sh` as a pre-build step
4. `measure/agents-md-audit-protocol.md` shows v1.1, has §3.6, §4.10, §5.10, §9.7, §14, and a Changelog section
5. The 6 refinements from `checklist.md` §Notes for protocol v1.1 are all reflected in the v1.1 protocol

## Out of Scope

- Any application-code change in `apps/` or `packages/`
- Resolving F-1001 (`ignoreBuildErrors: true` with 360 tsc errors) — separate track
- Migrating science-advantage to use the new rules — separate tracks (1–12)
- Re-running the science-advantage audit under v1.1 — separate re-audit chore after this track ships

## Constraints & Risks

- **graph.db mtime is sensitive**: per AGENTS.md §Codebase Graph, "fresh" = <24h mtime. CI may need to re-scan on every run (slow) or only when package.json files change (cheaper). Recommend the latter.
- **build-graph binary not in pnpm catalog**: `build-graph` is a local CLI; CI runners need it on PATH. Verify the image used by `.github/workflows/ci.yml` includes it.
- **Backwards compatibility**: any app that does not import from `packages/*` (none today) is unaffected. v1.1 is additive; no v1.0 rule is removed or weakened.
