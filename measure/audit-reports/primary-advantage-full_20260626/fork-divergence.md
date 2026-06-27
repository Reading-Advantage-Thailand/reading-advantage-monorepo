# Primary Advantage Fork Divergence

Status: synthesized from 893 line-review findings (2026-06-27).

## Distribution

| Category | Count | Percent |
|---|---|---|
| Fork-specific regression | 414 | 46.4% |
| Same root cause as Reading Advantage | 213 | 23.9% |
| Primary-student adaptation risk | 115 | 12.9% |
| Intentional product divergence that needs documentation | 80 | 9.0% |
| Shared package migration blocker | 71 | 8.0% |

## Category Analysis

### Fork-Specific Regression (414 findings — 46.4%)

The dominant category. Primary Advantage introduced regressions during its fork from Reading Advantage that do not exist in the parent codebase.

**Key themes**:
- **Undefined variable/session crashes** (~30 findings): Copy-paste of game components omitted `update` and `session` imports/injections. Reading Advantage's equivalent game components use `useSession()` and `update()` from next-auth. Primary Advantage uses a different session provider and the imports were dropped during adaptation.
- **Optimistic-only admin CRUD** (LR-008-001/002/003): Student add/update/delete operations in admin page are purely local state updates; no server requests are issued. The Reading Advantage equivalent flows through Prisma controllers.
- **Admin UI commented out** (LR-006-003/009): Student table and teachers table components are commented out with early-return placeholders. These are functional in Reading Advantage.
- **Dashboards with fabricated data** (LR-028-012 and related): Charts use hardcoded arrays instead of API data. Reading Advantage equivalents query real data.
- **`as any` casts scattered universally** (~60 findings): TypeScript strictness eroded.

### Same Root Cause as Reading Advantage (213 findings — 23.9%)

Issues inherited from Reading Advantage that were not fixed during the fork.

**Key themes**:
- Missing auth/authorization in shared patterns that exist in both codebases.
- Missing tenant scoping in database queries inherited from Reading Advantage's Prisma-era patterns.
- XSS in AI feedback rendering (`dangerouslySetInnerHTML`).
- Hardcoded credentials in utility/config files.

### Primary-Student Adaptation Risk (115 findings — 12.9%)

Risks specific to the younger target audience (primary students vs. Reading Advantage's broader audience).

**Key themes**:
- Debug routes exposing student data without authentication (LR-015-002/004).
- `levels.indexOf(currentLevel)` returning -1 for unknown CEFR levels (LR-029-015, Critical).
- Unprotected child data in API responses without guardian consent workflows.
- Age-inappropriate error UX (raw error objects rendered to UI).
- Missing COPPA/GDPR-K considerations for under-13 data handling.

### Intentional Product Divergence (80 findings — 9.0%)

Deliberate differences that need formal documentation rather than remediation.

**Key themes**:
- CEFR-based level system (A0-A2) adapted from Reading Advantage's broader level system.
- Primary-specific flashcard deck organization and gamification.
- Simplified teacher/admins workflows.
- Localization for five Asian languages (CN, EN, TH, TW, VI).
- System-level license management UI unique to Primary.

### Shared Package Migration Blocker (71 findings — 8.0%)

Changes needed in shared packages (`@reading-advantage/db`, `@reading-advantage/auth`, etc.) before Primary can complete its migration.

**Key themes**:
- Flashcard API routes depend on Drizzle columns (`due`, `lapses`, `stability`, `difficulty`, etc.) that do not exist on shared `flashcardCards` table schema (LR-015-007/008/012/014/015/019/024-027/031/033).
- FSRS spaced-repetition service in `lib/fsrs-service.ts` references non-existent schema fields.
- Type declaration files reference Prisma types that were removed.
- Auth adapter gap: Primary uses its own `server/utils/auth.ts` with raw JWT handling instead of `@reading-advantage/auth`.

## Divergence by Component Area

| Area | Primary regressions | Shared root cause | Adaptation risk | Intentional | Migration blocker |
|---|---|---|---|---|---|
| Student games/lessons | 180+ | 30 | 60+ | 20 | 5 |
| Teacher workflows | 40+ | 15 | 10 | 10 | 5 |
| Admin/school mgmt | 50+ | 20 | 5 | 15 | 3 |
| API routes | 60+ | 40 | 15 | 5 | 15 |
| Auth/tenant | 15 | 30 | 10 | 5 | 10 |
| AI/content gen | 30+ | 20 | 5 | 10 | 15 |
| Data/i18n | 30+ | 10 | 5 | 15 | 3 |
| Infra/Docker/build | 10 | 5 | 0 | 5 | 10 |

## Top Divergence Recommendations

1. Fix undefined `update`/`session` variables across all game components — these are all fork-specific regressions.
2. Restore admin CRUD operations with real API calls — currently optimistic-only.
3. Re-enable commented-out admin UI components.
4. Document intentional CEFR/primary adaptations in project AGENTS.md.
5. Add FSRS columns to shared `@reading-advantage/db` flashcardCards schema, or provide migration path.
6. Complete auth adapter migration to use `@reading-advantage/auth` instead of raw JWT in `server/utils/auth.ts`.
