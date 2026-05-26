# Implementation Plan: Proxy Admin/Role Guard Hardening

> TDD-first. Write failing tests for each FR before changing `proxy.ts`. Lessons-learned reminders: auth tests must pre-seed tokens (race condition gotcha 2026-05-02); mock-DB chain mocks must be thenables (2026-05-02); never trust cookie presence (this track's whole point).

## Phase 0: Runtime Feasibility Spike

- [x] Task: Confirm Next.js version in both apps (`apps/codecamp-advantage`, `apps/science-advantage`) supports `runtime = "nodejs"` for middleware. Document version + feature-flag status.

**Findings (2026-05-26):**
- Both apps on **Next.js 16.0.0**.
- Per official docs (https://nextjs.org/docs/app/api-reference/file-conventions/middleware): in Next.js 16, the `middleware` file convention was renamed to `proxy` AND defaults to the **Node.js runtime**. Setting the `runtime` config option in proxy files now **throws an error**.
- Version history: nodejs-runtime middleware was experimental in 15.2, stable in 15.5, default in 16.0.
- **Implication**: no `runtime = "nodejs"` opt-in needed. No `experimental.nodeMiddleware` flag needed. `@reading-advantage/auth` `requireRole` (postgres-js-based) can be imported and called directly from `proxy.ts`.
- **Bonus**: `next/experimental/testing/server` (since 15.1) exposes `unstable_doesProxyMatch`; full `proxy(request)` calls are also testable in unit tests. Use these for Phase 1/2.
- **Fallback design (internal `/api/auth/verify-role` endpoint) is no longer needed.** Spec FR-1 simplifies: just `import { requireRole } from "@reading-advantage/auth"`.
- **Constraint elimination**: per-request DB cost remains as documented (Spec "Constraints & Risks"). Edge KV caching follow-up still relevant if perf surfaces.

## Phase 1: codecamp-advantage Proxy Hardening

- [ ] Task: Write failing unit tests for `apps/codecamp-advantage/proxy.ts` covering: (a) no cookie hitting `/admin` → redirect to `/`, (b) cookie with invalid token → clear cookie + redirect signin, (c) STUDENT token hitting `/admin` → redirect `/`, (d) ADMIN token hitting `/admin` → pass through to intl middleware, (e) DB unreachable → fail-closed redirect with `?error=session_check_failed`.
- [ ] Task: Implement role-check using Phase 0 mechanism. Replace cookie-presence check on lines 36–44 with role-aware verification.
- [ ] Task: Preserve i18n redirect behavior — run role check before locale-prefix logic so the redirect target is correct.
- [ ] Task: Add `runtime = "nodejs"` (or fallback) to file.
- [ ] Task: Run unit tests; confirm all 5 scenarios pass.

## Phase 2: science-advantage Proxy Hardening

- [ ] Task: Write failing unit tests mirroring Phase 1 plus: (f) TEACHER token hitting `/student` → redirect `/dashboard`, (g) STUDENT token hitting `/teacher` → redirect `/dashboard`, (h) `/signin` with valid session → redirect `/dashboard`, (i) `/signin` with invalid session → clear cookie + render signin.
- [ ] Task: Implement role mapping per FR-2 (`/admin`, `/system` → ADMIN; `/teacher` → TEACHER|ADMIN; `/student` → STUDENT|ADMIN; `/dashboard` → any signed-in role).
- [ ] Task: Implement FR-6 dev-impersonation passthrough: when `process.env.DEV_AUTH_ENABLED === "true"` (read at module scope per 2026-05-24 lesson — NOT inside the handler — to avoid evaluating per request), honor the impersonation cookie before falling through to real role check.
- [ ] Task: Run unit tests; confirm all 9 scenarios pass.

## Phase 3: Integration Tests

- [ ] Task: Add one integration test per app driving a real signed-in STUDENT session through `/admin` and asserting redirect-without-render. Use existing test-DB infra (codecamp: mock-DB pattern; science-advantage: `science_advantage_test` per AGENTS.md).
- [ ] Task: Add one integration test per app driving a real ADMIN session through `/admin` and asserting the admin shell renders.

## Phase 4: Build & Manual Verification

- [ ] Task: `pnpm --filter codecamp-advantage build` passes with new middleware.
- [ ] Task: `pnpm --filter science-advantage build` passes with new middleware.
- [ ] Task: Local manual smoke: sign in as STUDENT in codecamp, try `/admin/cohorts`, confirm redirect.
- [ ] Task: Local manual smoke: sign in as STUDENT in science, try `/admin/users`, confirm redirect.
- [ ] Task: Measure - User Manual Verification 'Proxy Hardening' (Protocol in workflow.md): user confirms 4 smoke paths above and validates one prod-like scenario.

## Phase 5: Closeout

- [ ] Task: Update `measure/tech-debt.md`: mark 2026-05-15 `codecamp_review` proxy.ts entry `Resolved`. If a perf-concern entry emerges from FR-3, add it with severity Medium.
- [ ] Task: Add a lessons-learned entry if Phase 0 / Phase 2 surfaced a non-obvious gotcha (e.g., middleware runtime quirk, postgres-js boot cost, dev-impersonation interaction). Keep file ≤ 50 lines (prune oldest if needed).
- [ ] Task: Move track to `measure/archive/proxy_admin_guard_hardening_20260526/` and update `measure/tracks.md`.
