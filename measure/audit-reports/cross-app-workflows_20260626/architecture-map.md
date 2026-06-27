# Cross-App Architecture Map

> **Track:** `cross_app_workflows_review_20260626`
> **Date:** 2026-06-27
> **Type:** Review-only synthesis. No remediation performed.

## Package Dependency Graph (inferred from child reviews)

```
                      ┌──────────────────────┐
                      │   apps/www-          │
                      │   reading-advantage  │
                      └─────┬───┬────────────┘
                            │   │ (imports utils, UI)
                            │   │
┌───────────────────────────┼───┼───────────────────────────────────┐
│ packages/                 │   │                                    │
│   types ──────────────────┤   │                                    │
│   utils (cn, hooks) ──────┤   │                                    │
│   config (ts, eslint) ────┤   │                                    │
│   ui  ────────────────────┤   │                                    │
│   auth ───────────────────┤   │                                    │
│   auth-client ────────────┤   │                                    │
│   db (schema/migrations) ─┤   │                                    │
│   domain ─────────────────┤   │                                    │
│   api (tRPC) ─────────────┤   │                                    │
│   ai  ────────────────────┤   │                                    │
│   storage ────────────────┤   │                                    │
│   webhooks ───────────────┤   │                                    │
│   integrations/github ────┤   │                                    │
└───────────────────────────┼───┼────────────────────────────────────┘
                            │   │
     ┌──────────────────────┼───┼─────────────────────────┐
     │ apps/                │   │                          │
     │   reading-advantage ─┘   │ (209 route.ts, 54 ctrl) │
     │   primary-advantage ─────┘ (fork regression wall)   │
     │   science-advantage ───────── (new baseline, auth OK)│
     │   codecamp-advantage ────────── (GH webhook + AI)    │
     │   sales-advantage ────────────── (audio+multimodal AI)│
     │   marketing ──────────────────── (video pipeline, AI)│
     │   advantage-games ───────────── (standalone Phaser+) │
     └──────────────────────────────────────────────────────┘
```

## Cross-App Boundary Map

### 1. Auth/Session/Identity

| App | Auth Mechanism | Session Provider | Role Model | Issues |
|-----|---------------|------------------|------------|--------|
| reading-advantage | Multiple: JWT, cookie, middleware mix | Inconsistent; some routes unprotected | Legacy roles; 209 routes, 0 use assertCan | F-SF-008, C-RA-CRIT-01..05, H-03 (18+ routes) |
| primary-advantage | Fork of reading; 72+ routes no auth | Ad-hoc per-route auth | Same as reading with fork drift | 72 unprotected endpoints, 48 queries unscoped |
| science-advantage | `requireRole()` / `requireAuth()` | `@reading-advantage/auth` | Correctly wired; golden path | CR-01 (gamification bypass), HI-01 (lib/services) |
| codecamp-advantage | tRPC `adminProcedure` + `assertCan` | Shared auth package | INTERN, ADMIN, SYSTEM | H-8 (UI-only gates on admin pages) |
| sales-advantage | tRPC context + cookie session | Shared auth | SALES_REP, SALES_ADMIN missing from enum → unauthenticated at runtime | C3 (F-SALES-B00-030) |
| marketing | None on data/AI routes | N/A | N/A | Critical: API keys leaked, public LLM spend |
| advantage-games | Mock-only; force-static routes | None | None | D-03 (mock non-persistent API) |

**Cross-app root cause:** The shared `@reading-advantage/auth` package and `packages/api` context are the intended SSOT, but app-level auth is inconsistent. Reading and Primary lack systematic adoption; Sales has a runtime-breaking role-enum gap; Marketing/games have none. Shared finding F-SF-008 (authorization scattered across API and domain) applies to all.

### 2. Tenant/School/License Model

| App | Tenant Scoping | Tables Used | TenantDB Usage | Gaps |
|-----|---------------|-------------|----------------|------|
| reading-advantage | 0/209 routes use TenantDB | Direct db imports | None | F-SF-001 (9 unclassified tables) |
| primary-advantage | 48+ queries unscoped | Direct db + Prisma remnants | None | Fork regression; schema typo `sentencs...` |
| science-advantage | Domain functions use TenantDB; gamification bypasses | createTenantDB in routes | Present but inconsistent | CR-01, HI-01/02/03, CR-04 (vacuous tests) |
| codecamp-advantage | All tables EXEMPT (single-tenant) or REFERENTIAL | No schoolId on core tables | CR-1: TenantDB throws on REFERENTIAL tables without unscoped() | F-CC-B10-001 |
| sales-advantage | EXEMPT/global-tenant | No schoolId | salesRawDb() | C2: cross-tenant exposure in admin reporting |
| marketing | EXEMPT (documented) | No schoolId | N/A | Intentional |
| advantage-games | Unregistered + nullable schoolId | xpLogs/gameRankings no schoolId; leaderboards unregistered | None | D-04, B46-036 (tenant-coverage CI red) |

**Cross-app root cause:** F-SF-001 (9 unclassified tables) and F-SF-004 (null-tenant TenantDB) are shared root causes affecting all apps. The tenant registry drift makes tenant isolation guarantees untrustworthy across the monorepo.

### 3. Database & Migrations

| Concern | Scope | Finding Refs |
|---------|-------|-------------|
| Tenant registry stale (9 unclassified tables) | `packages/domain` | F-SF-001 |
| Missing migration sentinels (0022, 0023) | `packages/db` | F-SF-006 |
| Drizzle version mismatch across packages | packages | F-SF-014 |
| Schema typo `sentencsAndWordsForFlashcards` | `packages/db` → primary-advantage | F-SF-025 |
| `audio_storage_key` nullability drift (0021 vs 0023) | sales-advantage | F-SALES-B04-001, F-SALES-B05-006 |
| Migration 0010 uniqueness backfill can halt deploy | codecamp-advantage | F-CC-B07-034/038 |

### 4. AI Adapter Usage

| App | Adapter Compliance | Issues |
|-----|-------------------|--------|
| reading-advantage | Bypassed: direct OpenAI v4, Google Cloud Translate SDK | C-013 (provider lock-in), C-014 (Firebase SDK) |
| primary-advantage | Multiple direct provider SDK bypasses | 72+ routes; adapter compliance gap |
| science-advantage | AI adapter used correctly at server seam | CR-02 (Sentry SDK bypass in AI route) |
| codecamp-advantage | AI adapter respected at server seam | F-CC-B07-017, F-CC-B09-027 |
| sales-advantage | AI barrel re-exports raw SDK; arch-guard blind | C6 (F-SALES-B03-010) |
| marketing | Per-request createAIClient() instead of ai.generateText() | LR-004-003 |
| advantage-games | N/A (no server-side AI) | — |

**Cross-app root cause:** F-SF-021 (legacy scripts bypass AI adapters) and the AI barrel re-export leak (F-SALES-B03-010) are shared root causes. The `@reading-advantage/ai` barrel can silently pass raw SDK through the compliance guard.

### 5. Storage Adapter

| App | Storage Usage | Issues |
|-----|--------------|--------|
| reading-advantage | Direct @google-cloud/storage | Provider lock-in |
| primary-advantage | Direct storage SDK calls | Path traversal in upload routes |
| science-advantage | `packages/storage` used correctly | — |
| codecamp-advantage | N/A (GitHub-based) | — |
| sales-advantage | `packages/storage` with `public:false` | Positive; FR-4 no-orphan invariant |
| marketing | N/A | — |
| advantage-games | N/A (no server storage) | — |

**Cross-app root cause:** F-SF-022 (StorageClient missing get()/download method). Reading/Primary use direct provider SDKs instead of the shared adapter — F-SF-021.

### 6. UI / Design System

| Concern | Scope | Ref |
|---------|-------|-----|
| `cn()` duplicated: packages/utils vs apps/www | cross-app | F-SF-020 |
| Shared UI: 10/20 component families untested | `packages/ui` | F-SF-018 |
| Marketing app: no error states on campaign detail | marketing | LR-004-008 |
| Website: empty component files (0 bytes), full client-render | www | LRF-010, LRF-007 |
| Reading/Primary: 180+ routes repeat next-connect boilerplate | reading/primary | C-012, H-18 |

### 7. Games → Product Apps Import Gap

All 26 games are NOT-READY or AT-RISK for import. Eleven explicit import-contract gaps (D-01 through D-11 in `advantage-games_20260626/findings.md`):
- No shared completion/scoring contract
- Client-trusted XP, no validation
- Mock non-persistent API
- Leaderboard tables unregistered, no schoolId
- English-only, hardcoded /en/ paths
- No embeddable navigation
- Divergent content response keys
- Duplicated primitives, two competing builder skills
- Dead/missing integration guide

### 8. Website Claims vs Product Reality

From `www-reading-advantage_20260626/claims-matrix.md`:
- "Nine products" overstated; 4 apps have directories (LRF-001)
- 6+ product pages claim "Launching/Coming in 2025" (LRF-002)
- Primary Advantage efficacy stats duplicated from Reading Advantage (LRF-014)
- GPT-5 claimed for Primary Advantage (unverifiable) (LRF-013)
- Math/STEM/Storytime/Tutor Advantage pages describe apps with no code directories
- Case studies are placeholder data under "Real Results" heading (LRF-012)

### 9. Deployment / Env / Secrets / CI / Observability

| Concern | Apps Affected | Ref |
|---------|--------------|-----|
| `ignoreBuildErrors: true` in primary (was removed in science) | primary-advantage | Primary exec summary |
| Prisma invoked in Vercel build of Drizzle-only science app | science-advantage | HI-08 |
| `codecamp-advantage` Cloud Run public `allUsers` binding | codecamp-advantage | H-10 |
| Sales `:free`/preview model defaults for production scoring | sales-advantage | F-SALES-B04-011 |
| Marketing `vinext pinned to latest` | marketing | LR-marketing-app-006-002 |
| Hardcoded secrets: science `AI_RECOMMENDER_HASH_SECRET` fallback | science-advantage | HI-07 |
| Direct Sentry SDK import in science AI route (bypass adapter) | science-advantage | CR-02 |
| No structured logging: console.log/error in reading, primary, marketing, sales | cross-app | Multiple |
| Rate limiting: in-memory Map across all apps (F-SF-010, F-SF-011) | cross-app | F-SF-010 |

### 10. Test Strategy & Quality Gates

| Concern | Scope | Ref |
|---------|-------|-----|
| reading-advantage: 0/54 controller tests, 0/209 route tests, ~1/209 with Zod | reading | Test-gaps.md |
| primary-advantage: No systematic test coverage | primary | Test-gaps.md |
| science-advantage: Vacuous tenant-isolation tests (fixtures omit schoolId) | science | CR-04 |
| codecamp-advantage: Tenant-scope enforcement untestable (false-green mock) | codecamp | CR-2 |
| codecamp: Prod-smoke suites hit live production by default | codecamp | C-H-5 |
| advantage-games: E2E smoke/screenshot only, no scoring assertions | games | C-13 |
| marketing: Tautological assertions, stale "RED at HEAD" docblocks | marketing | LR-marketing-app-001-002 |
| `@reading-advantage/types`: zero tests despite owning shared contracts | shared | F-SF-017 |
| `@reading-advantage/ai`: 13 pre-existing test failures | shared | F-SF-019 |
| Legacy scripts: `jest --passWithNoTests` vacuous | shared | F-SF-021 |
