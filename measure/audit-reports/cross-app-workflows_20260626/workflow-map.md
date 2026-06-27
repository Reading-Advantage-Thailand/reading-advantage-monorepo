# Cross-App Workflow Map

> **Track:** `cross_app_workflows_review_20260626`
> **Date:** 2026-06-27
> **Type:** Review-only synthesis. No remediation performed.

## Workflow: User Identity Flow (Login → Session → Authorization)

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│ Login Route   │────▶│ @reading-advantage│────▶│ App Route / Controller│
│ (app-specific)│     │ /auth + /api/     │     │                       │
└──────────────┘     │ context.ts        │     └───────────────────────┘
                     │ (shared session)  │              │
                     └──────────────────┘              │
                                                       ▼
                                              ┌──────────────────┐
                                              │ Domain Function  │
                                              │ assertCan() +    │
                                              │ createTenantDB() │
                                              └──────────────────┘
```

**Actual state across apps:**

| Step | Reading Advantage | Primary Advantage | Science Advantage | CodeCamp Advantage | Sales Advantage |
|------|-------------------|-------------------|-------------------|-------------------|-----------------|
| Login | Ad-hoc / JWT remnants | Fork of reading | Shared auth package | Shared auth package | Shared auth + broken role enum |
| Session | Inconsistent middleware | Ad-hoc per-route | requireAuth/requireRole | tRPC adminProcedure | tRPC context (role gap) |
| Authorization | 0/209 routes use assertCan | 48+ unscoped queries | assertCan in domain | assertCan in domain | IDOR (C1/C2) |
| Tenant Scoping | 0/209 routes use TenantDB | 48+ unscoped queries | TenantDB + gamification bypass | CR-1: TenantScopeError at runtime | salesRawDb() unscoped |

**Critical cross-app finding:** The shared auth package works correctly (tested by science/codecamp positive flows), but app adoption is fractured. Reading/Primary never migrated; Sales has a role-enum gap that may make the entire tRPC surface unauthenticated at runtime (F-SALES-B00-030).

## Workflow: AI Content Generation → Learning Loop

```
┌────────────────┐     ┌────────────────┐     ┌─────────────────┐
│ Content Gen     │────▶│ AI Adapter      │────▶│ Provider         │
│ (app route)     │     │ @reading-       │     │ (OpenAI/         │
└────────────────┘     │ advantage/ai    │     │  OpenRouter/     │
                       └────────────────┘     │  Google)         │
                                              └─────────────────┘
                                                       │
                       ┌───────────────────────────────┘
                       ▼
┌────────────────┐     ┌────────────────┐     ┌──────────────────┐
│ Student        │────▶│ Mastery/XP      │────▶│ Leaderboard      │
│ Activity       │     │ Engine          │     │ / Progress       │
└────────────────┘     └────────────────┘     └──────────────────┘
```

**Issues per app:**
- **Reading:** Direct OpenAI v4, direct Google Cloud Translate; no adapter. XP double-award race (PB-001).
- **Primary:** Multiple direct provider calls; fabricated dashboard data; incorrect XP/CEFR.
- **Science:** AI adapter used correctly; AI hash-secret weak fallback; Sentry bypass in AI route.
- **CodeCamp:** AI adapter respected; streaming protocol mismatch (text/plain vs SSE).
- **Sales:** AI barrel leaks raw SDK; `:free` model for production scoring.
- **Marketing:** Per-request createAIClient bypass; no auth on AI routes.

## Workflow: Webhook → LLM Review → PR Comment (CodeCamp-specific, cross-system)

```
GitHub PR ──▶ Webhook (HMAC verified) ──▶ runReview() [synchronous, blocks ACK]
                                              │
                    ┌──────────────────────────┘
                    ▼
           ┌───────────────┐     ┌────────────────┐     ┌──────────────┐
           │ fetchPrDiff()  │────▶│ LLM Review     │────▶│ GitHub Comment│
           │ (fabricates    │     │ (AI adapter)   │     │ + Lesson Done │
           │  mock on err)  │     └────────────────┘     └──────────────┘
           └───────────────┘
```

**Issues:** H-2 (sync LLM blocks ACK → timeout/redelivery), H-3 (fabricated mock diff on missing token), H-6 (no UNIQUE delivery_id), CR-1 (TenantScopeError on real events).

## Workflow: Game Completion → XP → Progress → Leaderboard

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Game Engine   │────▶│ /complete route   │────▶│ XP Award      │
│ (client-side) │     │ (mock / no auth)  │     │ (client-trusted)│
└──────────────┘     └──────────────────┘     └──────────────┘
                                                      │
                                                      ▼
                                              ┌───────────────┐
                                              │ Leaderboard    │
                                              │ (localStorage  │
                                              │  only, no DB)  │
                                              └───────────────┘
```

**Cross-app import gap:** The entire server-side completion pipeline is mock-only. Reading/Primary import blocked by D-01 through D-11.

## Workflow: Enrollment / Lead Capture

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────┐
│ www Marketing      │────▶│ Waitlist/Contact   │────▶│ ??? (no       │
│ Site               │     │ Form               │     │  backend/CRM) │
└───────────────────┘     └───────────────────┘     └───────────────┘
```

**Issues:** Science/Zhongwen waitlist forms are no-ops; contact form is mailto-only (LRF-008, LRF-009).

## Workflow: Admin Management

| App | Student CRUD | Teacher CRUD | Class CRUD | Dashboard | Issues |
|-----|-------------|-------------|------------|-----------|--------|
| Reading | Via controllers | Via controllers | Classroom controller: 0 ownership check (C-007) | Real data but unscoped | C-007, PB-004, PB-005 |
| Primary | Optimistic-only / commented out | Commented out | Edit silently discards | Fabricated/hardcoded data | ~66 Critical |
| Science | Working with TenantDB | Working | Working | Working | Gamification bypass |
| CodeCamp | tRPC adminProcedure | adminProcedure | N/A (modules) | Tenant+user-keyed cache | UI-only guard H-8 |
| Sales | Via domain functions | Via domain functions | N/A (cohort) | Cross-tenant exposure C2 | C2, C8 |
