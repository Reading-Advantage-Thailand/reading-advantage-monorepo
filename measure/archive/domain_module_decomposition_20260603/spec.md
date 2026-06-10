# Specification: Domain Module Decomposition + Per-Module `permissions.ts`

## Overview

Split each of the 14 `packages/domain/src/<module>/index.ts` files into per-concern files (`schema.ts`, `contracts.ts`, `queries.ts`, `mutations.ts`, `permissions.ts`, `errors.ts`) per AGENTS.md §3.5 target structure. Pilot on `gamification/` (smallest, 77 lines, 2 functions), then replicate across the 12 other modules. Special handling for `codecamp/` (1,987 lines) which is split into 8–10 sub-modules. Introduce a `domainModulePermissions` extension point in `packages/auth` so each domain module can declare its own permission keys; `assertCan` consults module-level overrides first, then the central `PERMISSIONS` map. Add 5 `relations()` blocks to `packages/db/src/schema/` for the most-queried aggregates. Re-validate the 2026-05-30 JSDoc track (per-export JSDoc on 153+ functions). Fulfills AGENTS.md §3.4 ("Permission checks live in a `permissions.ts` module colocated with the module, not inside handlers"), §3.5 ("Module file layout"), and §3.3 (Zod input/output schemas — partial).

## Problem

Audited 2026-06-03. Findings F-301 (Low) + F-303 (Medium) + F-304 (High) + F-504 (Medium, partial) + F-1101 (Medium):

### F-301 — No `command()` wrapper usage; entire domain layer uses inline `assertCan`
- `rg 'command\(\{' packages/domain/` returns **0 hits**. `rg 'export const \w+ = (command|query|mutation|action)\b' packages/domain/` returns 0 hits.
- 82 `assertCan(` calls across 14 module files, all inline in `index.ts`.
- AGENTS.md allows both `command()` and `assertCan()` patterns, but recommends `command()` for new code.

### F-303 — No `permissions.ts` colocated with any of the 14 domain modules
- `find packages/domain/src -name 'permissions.ts'` returns 0 results.
- The only `permissions.ts` in the repo is `packages/auth/src/permissions.ts` (a flat `PERMISSIONS: Record<Permission, Role[]>` map).
- The 14 modules each contain inline `assertCan(user, "<resource>:<action>", tenant)` calls (e.g. `users/index.ts:65` calls `assertCan(user, "user:read", tenant)`), but the *permission matrix entry* for `user:read` lives in `packages/auth/src/permissions.ts`, not in `packages/domain/src/users/permissions.ts`.

### F-304 — All 14 domain modules are single `index.ts` files (no per-concern split)
- `find packages/domain/src -maxdepth 2 -name '*.ts' | sort` shows every module has exactly one file (`index.ts`) except `codecamp` which has `index.ts` + `review-exercise.ts`. Total: 15 TS files.
- Module line counts: `articles` 159, `assignments` 352, `classes` 82, `codecamp` 1987, `curriculum` 113, `gamification` 77, `licenses` 107, `progress` 225, `quiz` 78, `reports` 175, `stories` 105, `students` 150, `users` 207.
- `codecamp/index.ts` at 1,987 lines is the worst offender.

### F-504 (partial) — Zero `relations()` declarations
- `rg 'relations\(' packages/db/src/schema/` → 0 hits. The Drizzle `relations()` API is unused; every JOIN is hand-written with `eq()` predicates.
- 3 raw `sql\`\`` sites in app code are legitimate arithmetic/column refs, but should be folded into domain functions (Track 1 covers most of this).

### F-1101 — JSDoc is file-level not per-export in some domain modules
- `codecamp/review-exercise.ts` and `codecamp/index.ts` exports do NOT have per-export JSDoc.
- The 2026-05-30 JSDoc track claim of "153 functions documented" used file-level counting.
- Per-export JSDoc is required for `build-graph inspect` to summarize functions.

## Why

- AGENTS.md §3.5 mandates the per-concern split. The current state is the work that should be done to land the spec compliance.
- The `codecamp/index.ts` 1,987-line file is a maintenance hazard — every PR touching it is a wall of diff.
- Per-module `permissions.ts` enables module owners to add new permission keys without editing a file in a different package.
- Per-export JSDoc is required for the knowledge graph to summarize functions (Track 0's graph.db rebuild is the consumer).

## Functional Requirements

### FR-1: Per-Concern Module Layout

For each of the 14 modules, the final shape is:

```
packages/domain/src/<module>/
  schema.ts        # Drizzle table references (or re-exports from packages/db)
  contracts.ts     # Zod input/output schemas; `z.infer<>` types
  queries.ts       # Read-side functions (get*, list*, search*)
  mutations.ts     # Write-side functions (create*, update*, delete*)
  permissions.ts   # Permission keys + role mappings (consumed by assertCan)
  errors.ts        # Module-specific error classes
  index.ts         # Barrel re-export
```

The split applies to the 13 small/medium modules. The `codecamp/` split is a special case (FR-3).

### FR-2: Pilot — `gamification/` Decomposition

- `packages/domain/src/gamification/index.ts` (77 lines, 2 functions: `getStudentGamification`, `updateStudentGamification`).
- Decompose into:
  - `schema.ts` — re-export `gamificationProfiles`, `xpEvents`, `badges` from `packages/db/src/schema/`.
  - `contracts.ts` — `getStudentGamificationInputSchema`, `getStudentGamificationOutputSchema`, `updateStudentGamificationInputSchema`.
  - `queries.ts` — `getStudentGamification({ studentId })`.
  - `mutations.ts` — `updateStudentGamification({ studentId, updates })`.
  - `permissions.ts` — `gamification:read:own`, `gamification:read:all`, `gamification:update`.
  - `errors.ts` — `GamificationError`, `InsufficientXpError`.
  - `index.ts` — re-export the public API.
- Add per-export JSDoc on each function.
- Add `command({ input, output, auth, authorize, handler })` wrapper for `updateStudentGamification` (the mutation). F-301 partial: introduce the wrapper here.
- Re-validate the 77 existing test cases (none should change).
- Lint + type-check + build green.

### FR-3: Replicate Across 12 Other Modules

For each of the 12 remaining modules (excluding `codecamp/`), apply the FR-1 pattern:

- [ ] `articles/` (159 lines)
- [ ] `assignments/` (352 lines)
- [ ] `classes/` (82 lines)
- [ ] `curriculum/` (113 lines)
- [ ] `licenses/` (107 lines)
- [ ] `progress/` (225 lines)
- [ ] `quiz/` (78 lines)
- [ ] `reports/` (175 lines)
- [ ] `stories/` (105 lines)
- [ ] `students/` (150 lines)
- [ ] `users/` (207 lines)

For each module:
- Decompose into the 7 files.
- Add per-export JSDoc.
- Add `command()` wrapper for new mutations.
- Add `permissions.ts` with module-scoped keys.
- Add `errors.ts` with module-specific errors.
- Update the module's index.ts barrel.
- Update `packages/domain/src/index.ts` to re-export the new barrel.
- Re-validate the module's existing test cases.

The pilot establishes the pattern; the replication is mechanical. Use a codemod if the pattern is uniform across modules.

### FR-4: `codecamp/` Decomposition (1,987 lines → 8–10 sub-modules)

- `packages/domain/src/codecamp/index.ts` (1,987 lines, 30+ functions) decomposes into:
  - `codecamp/modules.ts` — module-level queries/mutations
  - `codecamp/lessons.ts` — lesson queries/mutations
  - `codecamp/exercises.ts` — exercise queries/mutations
  - `codecamp/quizzes.ts` — quiz queries/mutations
  - `codecamp/chat.ts` — chat tutor queries/mutations
  - `codecamp/pr-review.ts` — PR review automation
  - `codecamp/webhook-events.ts` — GitHub webhook event handlers
  - `codecamp/intern-accounts.ts` — intern account management
  - `codecamp/permissions.ts`
  - `codecamp/errors.ts`
  - `codecamp/index.ts` — re-export barrel
- Per-export JSDoc on all 30+ functions.
- The existing `codecamp/review-exercise.ts` is merged into `codecamp/pr-review.ts`.
- Re-validate all `codecamp` tests.

### FR-5: `domainModulePermissions` Extension Point

In `packages/auth/src/permissions.ts`:

```ts
export interface DomainModulePermissions {
  moduleName: string;
  keys: Array<{ key: Permission; roles: Role[] }>;
}

const modulePermissions: DomainModulePermissions[] = [];

export function registerDomainModulePermissions(mod: DomainModulePermissions): void {
  modulePermissions.push(mod);
}

export function lookupPermission(key: Permission): Role[] | undefined {
  // 1. Check module-level first
  for (const mod of modulePermissions) {
    const entry = mod.keys.find((k) => k.key === key);
    if (entry) return entry.roles;
  }
  // 2. Fall back to central map
  return PERMISSIONS[key];
}
```

Each `packages/domain/src/<module>/permissions.ts` calls `registerDomainModulePermissions` at module load time. The `assertCan` function in `packages/auth/src/server.ts` uses `lookupPermission` instead of `PERMISSIONS[key]` directly.

- Per-module registration: each `permissions.ts` calls `registerDomainModulePermissions({ moduleName: 'gamification', keys: [...] })`.
- Add a test: `assertCan(STUDENT, 'gamification:read:own')` returns true; `assertCan(STUDENT, 'gamification:read:all')` returns false.

### FR-6: Add 5 `relations()` Blocks to `packages/db/src/schema/`

For the 5 most-queried aggregates:

- `users` → `accounts`, `sessions` (auth joins)
- `scienceClasses` → `scienceCurriculumUnits` → `scienceUnitLessons` → `scienceLessons` (curriculum hierarchy)
- `scienceAttempts` → `scienceQuestionResponses` (quiz attempt responses)
- `classrooms` → `classroomStudents` (enrollment)
- `scienceAssignments` → `scienceClassAssignments` (assignment-class join)

Use Drizzle's `relations()` API:

```ts
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));
```

This enables the `db.query.users.findMany({ with: { accounts: true } })` API. Existing query code that uses `.innerJoin(table, eq(...))` can be migrated incrementally (Track 1's domain function migration will use the new API).

### FR-7: Per-Export JSDoc Refresh (F-1101)

- For each of the 153+ functions across the 14 modules, add per-export JSDoc with description + `@param` + `@returns` (per AGENTS.md §11 style).
- This re-validates the 2026-05-30 JSDoc track (which used file-level counting).
- After the track, `build-graph inspect` (post-Track 0 rebuild) returns non-empty summaries for the domain functions.

### FR-8: Codemod the 3 Raw `sql\`\`` Sites (F-504 partial)

- `apps/science-advantage/lib/services/mastery/standard-mastery.ts:68` — replace `sql\`${col} + ${val}\`` with parameterized arithmetic (Drizzle supports this natively: `sql\`${col} + ${val}\`` is the correct form; the codemod is a no-op but document the pattern).
- `apps/science-advantage/app/api/teachers/dashboard/route.ts:163` — `lt(col, sql\`0.6\`)` → `lt(col, 0.6)`.
- `apps/science-advantage/app/api/teachers/classes/[classId]/intervention-alerts/route.ts:166` — `sql\`${col}\`` → `col` (it's a column reference).

## Non-Functional Requirements

- **Zero regressions** in the existing 153+ domain function tests. All pass with the same data shape.
- **Module size**: each `index.ts` is now < 50 lines (re-export only).
- **Per-export JSDoc** on 100% of exported functions.
- **Lint + type-check + build** green for `packages/domain`, `packages/auth`, `packages/db`, and `apps/codecamp-advantage`.
- **No `index.ts` line count > 100** post-decomposition.

## Acceptance Criteria

1. All 14 domain modules have the 7-file structure (`schema.ts`, `contracts.ts`, `queries.ts`, `mutations.ts`, `permissions.ts`, `errors.ts`, `index.ts`).
2. `codecamp/` has 8-10 sub-modules + `permissions.ts` + `errors.ts` + `index.ts` barrel.
3. Per-export JSDoc on 100% of exported functions (153+).
4. 5 `relations()` blocks added to `packages/db/src/schema/`.
5. `domainModulePermissions` extension point registered and used by `assertCan`.
6. The 3 raw `sql\`\`` sites in `apps/science-advantage` are codemodded.
7. `pnpm turbo run test --filter=@reading-advantage/domain` exits 0.
8. `pnpm turbo run test --filter=codecamp-advantage` exits 0.
9. `pnpm turbo run lint --filter=@reading-advantage/domain` exits 0.
10. `pnpm turbo run check-types --filter=@reading-advantage/domain` exits 0.

## Out of Scope

- Migrating Track 1's domain functions to use the new `relations()` API — Track 1 will pick this up opportunistically.
- Per-domain Zod contracts on every existing function — F-302 is partially covered by FR-1's `contracts.ts` files; the F-302 finding remains "partial" until every function has an input + output schema.
- Splitting `packages/auth/src/index.ts` — out of scope.
- Decomposing `packages/api/src/` modules — out of scope; this track is `packages/domain/` only.

## Constraints & Risks

- **Risk: 14 modules × 7 files = 98 new files; the PR is enormous.** Mitigation: ship the pilot (FR-2, `gamification/`) in one PR; replicate the pattern in 12 separate PRs (one per module). The `codecamp/` split is one PR.
- **Risk: The `assertCan` change to consult `domainModulePermissions` may regress existing callers that expect the central `PERMISSIONS` map to be the source of truth.** Mitigation: `lookupPermission` is backward-compatible — if no module registers a key, the central map is used. Add a test: for every key in the central map, `assertCan` returns the expected result.
- **Risk: `relations()` blocks may change Drizzle's join semantics for existing queries.** Mitigation: `relations()` is additive — it does not change the existing `.innerJoin()` behavior. The new API is opt-in. Track 1 will migrate queries opportunistically.
- **Cross-track dependency**: this track can run in parallel with Track 1; the `packages/domain/src/teachers/` module added by Track 1 is a 14th module that gets the same decomposition treatment in a follow-up.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 3 (F-301, F-303, F-304), §Section 5 (F-504), §Section 11 (F-1101)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 8
- `packages/domain/src/gamification/index.ts` (the pilot)
- `packages/domain/src/codecamp/index.ts` (the worst offender)
- `packages/auth/src/permissions.ts` (the central map; extended by FR-5)
- `packages/db/src/schema/` (where the 5 `relations()` blocks land)
- AGENTS.md §3.4, §3.5
- `measure/archive/jsdoc_shared_packages_20260530/` (the prior JSDoc track to re-validate)
