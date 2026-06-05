# Science-Advantage AGENTS.md Audit — Executive Summary

> **Audit target:** `apps/science-advantage/`
> **Audit date:** 2026-06-03
> **Protocol:** `measure/agents-md-audit-protocol.md` (13 sections, 80+ checks)
> **Companion artifacts:** `checklist.md`, `findings.md`, `migration-tracks.md`, partials 1–13

---

## Headline finding

The app **bypasses its own domain layer** on both sides — 22 of 27 `app/api/**/route.ts` and 2 of 22 `app/**/page.tsx` files import `db` directly from `@reading-advantage/db` instead of going through `@reading-advantage/domain`, and the app uses a **user-centric tenancy model** rather than `schoolId` predicates or `createTenantDB`. `packages/domain/src/` (14 modules, 82 `assertCan` calls, 4,000+ lines) is **dead code from this app's perspective**. The 2026-05-26 one-off audit caught the surface symptom; this audit reclassifies it as the **root** — F-305 ("Zero `app/**` route handlers import from `@reading-advantage/domain`", Critical) — and subsumes the F-203, F-208, F-306, F-307, F-405, F-701, F-702 findings (previously filed at High) as symptoms of the same architectural gap. F-501 and F-502 (multi-tenancy) merge into the same root cause: the app never adopted the `TenantDB` wrapper.

## Compliance scorecard

| § | Section | Pass | Fail | Partial | N/A | Score |
|---|---------|-----:|-----:|--------:|----:|------:|
| 1 | Provider Neutrality | 1 | 1 | 0 | 2 | 50% |
| 2 | Package Boundaries | 4 | 4 | 0 | 0 | 50% |
| 3 | Backend-as-Code | 1 | 3 | 1 | 0 | 20% |
| 4 | Authentication | 5 | 2 | 2 | 0 | 56% |
| 5 | Database | 4 | 2 | 1 | 0 | 60% |
| 6 | Validation | 2 | 2 | 2 | 0 | 33% |
| 7 | Transport | 1 | 1 | 0 | 3 | 50% |
| 9 | Observability | 0 | 5 | 1 | 0 | 0% |
| 10 | Testing | 4 | 2 | 0 | 2 | 67% |
| 11 | Documentation | 2 | 0 | 0 | 4 | 67% |
| 12 | Monorepo Hygiene | 3 | 4 | 0 | 0 | 43% |
| 13 | Workflow | 4 | 2 | 0 | 0 | 67% |
| **Total** | | **31** | **28** | **7** | **13** | **49%** |

## Severity rollup (57 findings)

| Severity | Count | Key findings |
|----------|------:|----------------------------|
| Critical | 10 | F-305 (domain layer unused, umbrella), F-306, F-307 (subsumed), F-402 (bcryptjs in seeds), F-404 (no audit log), F-406 (bcryptjs in auth pkg), F-501 (no `schoolId`), F-502 (no `TenantDB`), F-1001 (`ignoreBuildErrors`), F-1003 (empty `graph.db`) |
| High | 12 | F-203, F-208, F-302 (no Zod in domain), F-304 (single-file modules), F-405, F-601, F-701, F-702, F-901, F-1002, F-1204, F-1205 |
| Medium | 17 | F-101, F-205, F-206, F-303, F-403, F-503, F-504, F-602, F-902, F-903, F-904, F-905, F-1101, F-1201, F-1207, F-1301, F-1306 |
| Low | 18 | F-102, F-201, F-202, F-204, F-207, F-301, F-401, F-407, F-603, F-604, F-703, F-704, F-705, F-906, F-1102, F-1202, F-1203, F-1305 |

> Severity counts are per-finding-ID as classified in `findings.md`. Some findings are filed under multiple section numbers (e.g. F-404/F-901 are the same audit-log gap from §4 and §9 angles). See `findings.md` for canonical IDs and manual inspection notes.

## The 12 proposed migration tracks (priority-ordered)

| # | Track ID | Title | Severity | Effort |
|---|---------|-------|----------|--------|
| 1 | `app_domain_migration_20260603` | **App → Domain Layer Migration** (umbrella; F-305 root) | **Critical** | 4 weeks |
| 2 | `tenant_db_school_id_20260603` | **TenantDB & schoolId Adoption** (F-501, F-502) | **Critical** | 2–4 weeks |
| 3 | `argon2id_password_20260603` | **Argon2id Migration + Auth Adapter Flatten** (F-401, F-402, F-406) | **Critical** | 1 week |
| 4 | `audit_log_infrastructure_20260603` | **Audit Log Infrastructure** (F-404, F-901) | **Critical** | 1 week |
| 5 | `ai_adapter_package_20260603` | **Shared `packages/ai` + `lib/ai/` Refactor** (F-101, F-202) | High | 2 weeks |
| 6 | `storage_package_20260603` | **Shared `packages/storage` S3-Compatible Package** (F-102) | High | 1 week |
| 7 | `zod_boundary_hardening_20260603` | **Zod Boundary + Env Hardening** (F-601, F-602) | High | 1.5 weeks |
| 8 | `domain_module_decomposition_20260603` | **Domain Module Decomposition + Per-Module `permissions.ts`** (F-301, F-303, F-304) | High | 3 weeks (parallel to #1) |
| 9 | `observability_stack_20260603` | **Observability Stack: Sentry + Request Context + Tracing** (F-902–F-906) | Medium | 1 week |
| 10 | `rate_limiter_v2_20260603` | **Postgres-Backed Rate Limiter + Per-IP Throttling** (F-403, F-407) | Medium | 1 week |
| 11 | `ci_typecheck_alignment_20260603` | **CI Alignment + tsc Blocker Resolution** (F-1001, F-1002, F-1204, F-1205) | High | 2 weeks |
| 12 | `housekeeping_batch_20260603` | **Audit Housekeeping Batch** (F-205, F-705, F-1201, F-1202, F-1207, F-1301, F-1305, F-1306) | Low | 1–2 days |

> Cross-references the in-flight `proxy_admin_guard_hardening_20260526` (post-pilot, in §Pending Tracks of `measure/tracks.md`) and the prior `audit_20260526` row in `measure/tech-debt.md`. The 4 Critical tracks supersede the F-001 anchor and add the security/audit dimensions.

## Top 5 risks

1. **Silent security regression** — without an audit log, a credential-stuffing or `schoolId` leak incident cannot be triaged, and the 23 hand-rolled `role ===` checks cannot be retroactively verified.
2. **Multi-tenant data leak** — science tables have no `schoolId` column; teachers who change schools keep their class data, and a student in school A can read school B class data via the join-code model. Compliance-relevant for district procurement.
3. **Type-safety void** — `ignoreBuildErrors: true` masks 360 tsc errors and the app-local CI workflow runs only `lint` + `build`, never `tsc --noEmit`. New errors land silently.
4. **Dead domain layer** — `packages/domain/src/` (14 modules, 82 `assertCan` calls, 4,000+ lines) has zero callers in the science-advantage app. Auth, tenancy, and permission enforcement infrastructure exists but is completely bypassed, making every other compliance fix downstream of this architectural gap.
5. **CI gate gap** — the app-local CI workflow uses `npm` (no `package-lock.json` exists), runs only `lint`, and has no `check-types` or `test` step. The monorepo root CI does not path-filter for science-advantage, so type errors and lint failures accumulate without blocking merges.

## Recommended next 3 tracks

The following 3 tracks should be opened first, in priority order. They resolve the 4 Critical findings that block all other compliance work:

1. `app_domain_migration_20260603` — **App → Domain Layer Migration** (Track 1; F-305 umbrella, 4 weeks). The load-bearing track: every other section's compliance is downstream of the app actually using its domain layer.
2. `tenant_db_school_id_20260603` — **TenantDB & schoolId Adoption** (Track 2; F-501, F-502, 2–4 weeks). Multi-tenancy isolation; requires Track 1 to land first so `schoolId` predicates live in domain functions, not in route handlers.
3. `argon2id_password_20260603` — **Argon2id Migration + Auth Adapter Flatten** (Track 3; F-401, F-402, F-406, 1 week). Highest-leverage single PR: migrates the shared password module and unblocks all 6 apps.

## What to do next

1. **Sign off** the F-305 umbrella reclassification and the 12-track migration plan.
2. **Open the 3 recommended tracks** above in `measure/tracks/` in priority order. Track 1 is the load-bearing one — every other section's compliance is downstream of it.
3. **Schedule Track 4** (Audit Log Infrastructure, `audit_log_infrastructure_20260603`) in parallel with Track 3 once the first 3 are staffed. It is also Critical and has no dependency on Tracks 1–3.
4. **Schedule the next audit** (`reading-advantage_20260610` or similar) using the refined protocol v1.1 (see Track #0 of `migration-tracks.md`).

---

**Sign-off line:** *The audit identifies 1 architectural root cause (F-305, F-501, F-502) that subsumes 8 symptoms and 4 distinct Critical findings (domain layer, tenancy, auth hashing, audit log). 12 tracks are proposed; the 4 Critical tracks should be opened in priority order before any new feature work in `apps/science-advantage/`.*
