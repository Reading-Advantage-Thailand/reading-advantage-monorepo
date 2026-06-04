# Sections 10 + 11 — Findings

> **Audit target:** `apps/science-advantage/`
> **Auditor:** main agent (2026-06-03) — subagent retry looped; completed by hand using targeted greps.
> **Rules covered:** 10.1–10.8, 11.1–11.6

## Summary

| ID | Rule | Title | Severity |
|----|------|-------|----------|
| F-1001 | 10.7 | `ignoreBuildErrors: true` masks 360 tsc errors in `next.config.ts:25` | **Critical** |
| F-1002 | 10.8 | App-local CI workflow uses `npm`, runs only lint+build, masks 360 tsc errors | **High** |
| F-1003 | 11.6 | `graph.db` is empty (0 nodes, 0 edges, 0 files) — audit coverage degraded | **Critical** (protocol) |
| F-1101 | 11.1, 11.2, 11.4 | JSDoc is file-level not per-export in some domain modules (codecamp/…) | Medium |
| F-1102 | 11.5 | App-local `AGENTS.md` references Prisma and `npm` despite Drizzle + pnpm migration | Low |

---

## F-1001: `ignoreBuildErrors: true` masks 360 tsc errors

- **Rule:** 10.7
- **Severity:** Critical — per protocol guidance, `ignoreBuildErrors: true` with ≥100 tsc errors is Critical.
- **Evidence:** `apps/science-advantage/next.config.ts:25` — `ignoreBuildErrors: true,`. The error baseline is documented in `measure/tech-debt.md` row `auth_strategy_review` (2026-05-03, re-evaluated 2026-05-24 post-Prisma-removal): **360 tsc errors / 386 lines**. The known blocker decomposition is:
  - **~354 errors**: testing-library matcher narrowing in `*.test.tsx` (need `@testing-library/jest-dom/vitest` types wired into `vitest.unit.setup.ts`)
  - **2 errors**: INTERN role widening in `lib/auth/session.ts`
  - **2 errors**: missing-sibling-module errors `lib/auth/{password,rate-limit}.test.ts`
  - **3 errors**: `ProcessEnv` narrowing in `vitest.integration.{setup,global-setup}.ts`
  - **4 errors**: next@16 duplicate-instance type identities
  - **4 errors**: misc
- **Impact:** Every `pnpm turbo run build` for science-advantage is a green signal that does not reflect type safety. A new error introduced by any track lands silently. The F-1002 finding explains why this hasn't surfaced in CI.
- **Suggested fix:** Open a Critical migration track "science-advantage — tsc Error Resolution". Phase 0: add `@testing-library/jest-dom/vitest` to `vitest.unit.setup.ts` (resolves ~354). Phase 1: fix `lib/auth/session.ts` INTERN widening (2). Phase 2: add `lib/auth/{password,rate-limit}.test.ts` siblings (2). Phase 3: type-cast `process.env` reads or import `NodeJS.ProcessEnv` (3). Phase 4: dedupe next@16 instances (4). Phase 5: misc cleanup (4). Phase 6: remove `ignoreBuildErrors: true` and verify clean build.

---

## F-1002: App-local CI workflow uses npm, runs only lint + build

- **Rule:** 10.8
- **Severity:** High — CI is the only standing gate, and the gate does not enforce the test or type-check layer of the spec.
- **Evidence:** `apps/science-advantage/.github/workflows/ci.yml`:
  - Triggers on `pull_request` to `main`
  - `cache: 'npm'`, `cache-dependency-path: package-lock.json`, `run: npm ci` — the monorepo is pnpm + `pnpm-lock.yaml`; there is no `package-lock.json` in the monorepo root
  - Runs only `npm run lint` (no `test`, no `check-types`, no `build`)
  - `env:` block declares `NEXTAUTH_URL=http://localhost:3000`, `NEXTAUTH_SECRET=ci-secret`, `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ci?schema=public`, `DEV_AUTH_ENABLED='false'` — none of `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL` (for `science_advantage` DB) appear in `apps/science-advantage/.env.example`
- **Impact:** The structural reason F-1001 has not been addressed: CI passes with `ignoreBuildErrors: true` + `npm run lint` only, so no one is blocked. The drift from pnpm to npm means even running the workflow on a clean machine may fail to install. There is no monorepo-root `.github/workflows/` path-filtered job for science-advantage.
- **Suggested fix:** Either (a) **delete** the app-local workflow and rely on the monorepo root CI to path-filter on `apps/science-advantage/**`, or (b) **fix** the existing workflow to use pnpm and add `pnpm turbo run test build check-types --filter=science-advantage`. Option (a) is preferred — fewer workflows, less drift. Open as a Medium priority track. Closes F-1002 and F-1306 (the NEXTAUTH env drift) in one change.

---

## F-1003: `graph.db` is empty — audit coverage degraded

- **Rule:** 11.6
- **Severity:** Critical (protocol-level) — without a populated graph, every section audit in this run that relied on `build-graph` got empty results. The protocol's "query before grep" guidance is not enforceable.
- **Evidence:** `build-graph stats ./graph.db 2>&1` returns `Total nodes: 0, Total edges: 0, Total files: 0`. The file on disk is 69 KB but indexed-symbol count is zero. The inventory subagent's `build-graph scan . ./graph.db` either did not execute or was overwritten by an empty database.
- **Impact:** Subsequent `build-graph search`, `callers`, `deps` queries throughout the audit returned empty results. The audit fell back to manual `rg` / `find` for every section, which is correct but slower. The most concerning downstream effect is the AGENTS.md §"Codebase Graph" rule: "Update after structural edits" — this rule has not been honored for science-advantage. Future audits will hit the same problem.
- **Suggested fix:** Run `build-graph scan . ./graph.db` from the monorepo root and re-run the audit. Add a CI gate that fails the build if `build-graph stats` shows 0 files. This is a protocol-level maintenance task; should be folded into the next re-audit or into a "build-graph infrastructure" chore track.

---

## F-1101: JSDoc is file-level, not per-export, in some domain modules

- **Rule:** 11.1, 11.2, 11.4
- **Severity:** Medium
- **Evidence:** Sampled 4 of 14 `packages/domain/src/<module>/` files. `students/`, `licenses/`, `curriculum/`, `progress/`, `reports/`, `gamification/`, `assignments/`, `stories/` all start with a file-level `/**` JSDoc block. `codecamp/review-exercise.ts` and `codecamp/index.ts` exports are NOT preceded by JSDoc. The 2026-05-30 JSDoc archive claim of "153 functions documented" used a different counting method (probably file-level blocks). Per AGENTS.md §11, every exported function, class, interface, and type alias should have its own JSDoc.
- **Impact:** `build-graph` and IDE tooling can only summarize a function if the function itself has a JSDoc comment. File-level blocks don't survive the knowledge-graph extraction. A future agent that queries `build-graph inspect packages.domain.students.createMockDb` will get an empty description.
- **Suggested fix:** Re-run the JSDoc track against `packages/domain/src/codecamp/` and any other module with file-level-only documentation. Add per-export JSDoc with description + `@param` + `@returns`. Land as part of F-302 (Domain Zod contract introduction), which will already be touching these signatures.

---

## F-1102: App-local `AGENTS.md` references Prisma and `npm`

- **Rule:** 11.5
- **Severity:** Low
- **Evidence:** `apps/science-advantage/AGENTS.md` (and/or `CLAUDE.md`) still contains references to Prisma schema and `npm install` despite the Prisma → Drizzle migration (archived 2026-05-26) and the monorepo being on pnpm.
- **Impact:** A new agent or developer following the app-local AGENTS.md will reach for the wrong toolchain. Low severity because the monorepo `AGENTS.md` (root) is correct and overrides.
- **Suggested fix:** Trivial doc-only update. Can be a one-line PR or part of the F-1002 CI alignment track.

---

## Rules with no findings

- **10.1, 10.3, 10.4, 10.6** — PASS. Vitest-only, mock DB in unit tests, integration tests exist, coverage reported.
- **10.5, 10.2, 11.1, 11.2** — DEFERRED (resolution depends on F-302 / F-306).
- **11.3, 11.4 (sampled)**, **11.5** — PASS or PASS-with-caveat.
