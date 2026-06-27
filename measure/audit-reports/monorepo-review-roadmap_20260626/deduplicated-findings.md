# Monorepo Review Roadmap — Deduplicated Findings

> **Track:** `monorepo_review_roadmap_20260626`  
> **Type:** Final synthesis of accepted/completed review artifacts. No remediation performed.

## Severity Bands

The child reviews contain thousands of line-anchored findings. This roadmap deduplicates them into roadmap-level findings, preserving app-specific evidence in the source artifact directories.

## Critical Roadmap Findings

### MR-C01 — Tenant isolation cannot be trusted monorepo-wide

- **Root evidence:** Shared Foundation F-SF-001/F-SF-004/F-SF-005; Cross-App CA-002.
- **Symptoms:** Reading has 0/209 routes using TenantDB; Primary has 48+ unscoped queries; Science gamification/lib-services bypass tenant checks; CodeCamp REFERENTIAL table calls throw `TenantScopeError`; Sales has IDOR/cross-tenant admin reporting; Games leaderboard tables are not tenant-safe.
- **Owner lane:** Foundation TenantDB + app migrations.

### MR-C02 — Auth/session/role adoption is fractured

- **Root evidence:** Cross-App CA-001; Shared Foundation F-SF-008/F-SF-010/F-SF-011.
- **Symptoms:** Reading/Primary unauthenticated sensitive routes; Sales role enum gap; Marketing public data/AI routes; Games mock auth; rate limiting is in-memory.
- **Owner lane:** Shared Auth + app auth hardening.

### MR-C03 — Legacy Reading/Primary APIs remain unsafe and uncontracted

- **Root evidence:** Reading full review Critical/High findings; Primary 66 Critical / 177 High findings.
- **Symptoms:** Reading classroom destructive operations lack ownership; unauthenticated server actions/system endpoints; Primary game completion crashes, nonfunctional admin UI, flashcard schema mismatch, unprotected routes, path traversal.
- **Owner lane:** Reading/Primary stabilization and domain migration.

### MR-C04 — API contracts and shared schemas are not a reliable source of truth

- **Root evidence:** Shared Foundation F-SF-002/F-SF-007/F-SF-017; Cross-App CA-003.
- **Symptoms:** Sales role/nullability drift; route-local contracts; inconsistent Reading responses; Marketing/Games lack Zod input boundaries; `@reading-advantage/types` has no tests.
- **Owner lane:** Contract-first API boundary program.

### MR-C05 — Business logic still runs in transport/request/UI paths

- **Root evidence:** Shared Foundation F-SF-003/F-SF-013; Cross-App CA-004.
- **Symptoms:** API router DB queries, Reading controller business logic, Science quiz-player orchestration in component, CodeCamp synchronous LLM webhook path, Sales REST bypasses.
- **Owner lane:** Transport-thin backend/domain migration.

## High Roadmap Findings

### MR-H01 — Provider adapters are present but not consistently enforced

- **Evidence:** Cross-App CA-005/CA-006/CA-011; Sales AI barrel leak; Reading/Primary direct SDKs; Marketing AI route behavior; storage adapter gaps.

### MR-H02 — Migration, schema, and seed governance can still break deploys

- **Evidence:** Cross-App CA-007; shared missing sentinels; Drizzle version drift; Science Vercel Prisma invocation; CodeCamp uniqueness backfill; Sales audio nullability drift; Primary flashcard schema mismatch.

### MR-H03 — Test signal is fragmented and sometimes false-green

- **Evidence:** Cross-App CA-010; Reading 0/209 route tests; Primary minimal tests; Science vacuous tenancy tests; CodeCamp false-green table classification; Marketing tautological tests; Games smoke-only E2E; shared types no tests.

### MR-H04 — CodeCamp and Sales production workflows need hardening before launch claims

- **Evidence:** CodeCamp TenantScopeError/webhook sync/idempotency/streaming; Sales IDOR, cross-tenant reporting, audio validation/privacy, role enum, XSS/draft curriculum leakage.

### MR-H05 — Advantage Games cannot be imported safely yet

- **Evidence:** Cross-App CA-013; Games D-01..D-11; all implemented games NOT-READY or AT-RISK.

### MR-H06 — Public website and marketing claims are out of sync with source reality

- **Evidence:** www LRF-001/002/012/014; Marketing public unauthenticated routes and token spend; stale launch dates, nonexistent app pages, placeholder case studies.

## Medium/Low Roadmap Findings

- Documentation/planning drift can mislead agents, especially Science stale Prisma/OAuth/track docs.
- Shared UI/types/config coverage is incomplete but rarely the first blocker.
- CodeCamp curriculum should be aligned with current AGENTS.md/security standards after runtime blockers.
- i18n/accessibility/performance issues should be remediated after Critical/High security and correctness lanes.
