# Plan: Protocol v1.1 + graph.db Rebuild

> Pre-audit chore. Test-first not applicable (no app code changes). Each task is verifiable by running a `build-graph stats` query or by reading the protocol file.

## Phase 0: Setup

- [x] Task: Confirm `build-graph` is on PATH in the dev environment (`which build-graph`).
- [x] Task: Snapshot current `graph.db` for diff comparison: `cp ./graph.db /tmp/graph.db.pre-rebuild`.

## Phase 1: Rebuild graph.db

- [x] Task: Run `build-graph scan . ./graph.db` from the monorepo root.
- [x] Task: Verify `build-graph stats ./graph.db` reports non-zero: `Total files > 0`, `Total nodes > 0`, `Total edges > 0`.
- [x] Task: Spot-check 3 `build-graph inspect` queries against known symbols (e.g. `inspect requireRole`, `inspect createTenantDB`, `inspect generateRecommendation`) to confirm the graph has the expected structure.
- [x] Task: If stats are non-zero and spot-checks pass, commit `graph.db` to git (or note that the file is gitignored and the CI gate from Phase 3 must rebuild it).

## Phase 2: Update Protocol to v1.1

- [x] Task: Update `measure/agents-md-audit-protocol.md` header from "v1.0 (pilot)" to "v1.1 (2026-06-03)".
- [x] Task: Add a "Changelog" section at the top of the protocol listing the 6 v1.0 → v1.1 deltas.
- [x] Task: Add §3.6 "Domain layer used by app routes" — every `app/**/route.ts` and `app/**/page.tsx` that needs data should import from `@reading-advantage/domain` (not from `@reading-advantage/db`).
- [x] Task: Add §4.10 "Seed scripts use adapter hash" — any script that creates users must call `hashPassword` from `@reading-advantage/auth`.
- [x] Task: Add §5.10 "No in-memory `Map` for security state" — no `new Map<string, X>()` for rate-limit/session/session-cleanup in app code.
- [x] Task: Add §9.7 "Audit log present" — `audit_events` table exists in `packages/db/src/schema/` AND is append-only (REVOKE UPDATE, DELETE).
- [x] Task: Add §14 "Pre-audit Preconditions" with the graph.db pre-check step; move the §11.6 "graph.db current" rule here and add a "why" note referencing the F-1003 incident.
- [x] Task: Update §Severity Scheme with the multiline-safe counting method note.

## Phase 3: Add CI Gate

- [x] Task: Create `scripts/ci/check-graph-db.sh` — runs `build-graph stats ./graph.db`, exits 1 if `Total files = 0`.
- [x] Task: Make the script executable: `chmod +x scripts/ci/check-graph-db.sh`.
- [x] Task: Wire into `.github/workflows/ci.yml` as a pre-build step (after checkout, before install).

## Phase 4: Verify

- [x] Task: Re-run `build-graph stats` to confirm CI gate would pass.
- [x] Task: Re-run a sample of the science-advantage audit's `build-graph` queries to confirm they now return non-empty results.
- [x] Task: Commit `graph.db` (if not gitignored) + protocol changes + CI script + workflow change.

## Phase 5: Closeout

- [x] Task: Add a lessons-learned entry: "Always pre-flight `build-graph stats` before an audit; 0 files means the audit will silently degrade to grep-only."
- [x] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-1003 Resolved.
- [x] Task: Move track to `measure/archive/protocol_v1_1_graphdb_20260603/` and update `measure/tracks.md`.
