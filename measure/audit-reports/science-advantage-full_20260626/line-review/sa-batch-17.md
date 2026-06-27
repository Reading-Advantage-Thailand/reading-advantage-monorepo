# Line Review: sa-batch-17

- **Track:** `science_advantage_review_20260626`
- **Batch:** 17 (20 files)
- **Reviewer focus:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
- **Scope:** Spec docs (student-profile, teacher-intervention), sprint plans S0–S5, review logs, manual test plan, E2E smoke tests, ESLint config, hooks, i18n JSON files
- **Date:** 2026-06-27

---

## File-by-File Review

### F1: `apps/science-advantage/docs/specs/student-profile/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Spec logic is sound, but contains Prisma-era notation |
| **Security/tenancy** | Auth guards described (lines 157, 171); impersonation flag noted |
| **AGENTS.md compliance** | Prisma schemas and references predate Drizzle migration |
| **Architecture** | Good: idempotency via `masteryRun`, telemetry, backfill strategy |

| Line | Finding |
|------|---------|
| 33–46 | **F-SA-B17-001 [prisma-ref]** — Data model uses Prisma notation (`String @id`, `cuid()`, `@db.Decimal(3,2)`, `@updatedAt`). The project uses Drizzle via `packages/db/`. Schema descriptions in spec docs should use field-type tables without ORM-specific annotations, or reference Drizzle column types. **Severity: medium**. |
| 53 | **F-SA-B17-022 [prisma-ref]** — "Database-level CHECK is not available in Prisma yet" — explicitly Prisma-specific. Drizzle supports raw SQL / check constraints in PostgreSQL. This statement is no longer accurate. **Severity: low**. |
| 138 | **F-SA-B17-002 [prisma-ref]** — Sequence diagram labels "Prisma/Postgres". Should reference Drizzle or database layer generically. **Severity: low**. |
| 157, 171 | Authorization spec: "Student session required; teachers/admins allowed when impersonation flag is active" — references impersonation, which aligns with `apps/science-advantage/AGENTS.md` dev auth pattern. ✓ |
| 203–204 | Cursor pagination with `limit <= 200` — standard pagination contract. ✓ |
| 214–218 | Color thresholds (red < 0.60, amber 0.60–0.80, green ≥ 0.80) — clear and well-defined. ✓ |
| 120–129 | Telemetry section with metrics and structured logs — good observability consideration. ✓ |
| 261–266 | Implementation checklist shows items still unchecked (#119, #120, #121) — spec is "draft" and partially implemented. Acceptable for spec document. |
| 79 | References `scripts/backfill-mastery.ts` — verified this file exists and uses Drizzle imports (`@reading-advantage/db`). ✓ |

---

### F2: `apps/science-advantage/docs/specs/teacher-intervention/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound, well-structured spec |
| **Security/tenancy** | References audit logging, class ownership checks, 403 on unauthorized access |
| **AGENTS.md compliance** | No Prisma-specific schema syntax — stays valid after Drizzle migration |
| **Test quality** | References widget unit test (13 cases) and E2E tests (11 scenarios) |

| Line | Finding |
|------|---------|
| 31–45 | Alert scoring model with configurable thresholds via `lib/interventions/config.ts` — verified this file exists. ✓ |
| 52 | Auth: "Teacher owning class or admin; others receive 403" — proper class-level authorization. ✓ |
| 56 | Caching per `(classId, severity)` for 5 minutes — documented cache strategy. ✓ |
| 88 | In-memory TTL cache with "Redis-parity semantics" — pragmatic for initial implementation, but production deployments should use Redis. Documented as such. |
| 97 | "Audit log each access (teacherId, classId, alertCount, traceId)" — good security practice. ✓ |
| 128–135 | Implementation checklist: 5 of 6 checked. **F-SA-B17-023 [unchecked-item]** — "Add metrics dashboards + alerting thresholds" remains unchecked (line 135). **Severity: informational** — documents incomplete feature. |
| 137–198 | Extensive implementation notes for frontend widget — verified `intervention-alerts-widget.tsx` and its test file exist. ✓ |
| 183–188 | References specific test files with test counts — verified widget unit test (`.test.tsx`) exists. ✓ |
| No Prisma/Drizzle-specific schema syntax | Spec uses API-level JSON schemas and field-type tables without ORM locking. This is the correct pattern for ORM-agnostic spec documents. ✓ *Golden-path pattern* |

---

### F3: `apps/science-advantage/docs/sprint/S0-Foundation.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Historical sprint planning document |
| **Correctness** | Accurate for the original Prisma-era implementation, outdated for current Drizzle/pnpm state |
| **AGENTS.md compliance** | Documents Prisma/npm tooling that has since been replaced |

| Line | Finding |
|------|---------|
| 27 | References BMAD agent roles ("dev (James), architect (Winston)") — legacy multi-agent framework. AGENTS.md references Measure tracks. **Severity: informational** (historical document). |
| 52 | "Prisma schema" and `prisma/schema.prisma` — outdated per Drizzle migration. **Severity: low** (historical). |
| 59–60 | `npx prisma generate` and `npx prisma db push` — outdated commands. **Severity: low**. |
| 78 | "Better Auth is configured for username/password authentication" — auth has since migrated to `@reading-advantage/auth`. |
| 100 | `npm install`, `npm run lint`, `npm run build` in CI — outdated. Project uses `pnpm`. **Severity: low**. |
| 111 | `prisma/seed.ts` — actual seed is under `scripts/seed.ts`. **Severity: low**. |
| 116 | `npm run db:seed` — outdated. **Severity: low**. |

This is a historical artifact documenting S0. The Prisma/npm references reflect the state of the project at that time. **No action needed** beyond awareness that these docs no longer reflect current tooling.

---

### F4: `apps/science-advantage/docs/sprint/S0.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Alternative historical sprint document (redundant with S0-Foundation.md) |
| **Correctness** | Prisma-era, Google OAuth-era references |

| Line | Finding |
|------|---------|
| 7 | "Prisma schema setup, and Google OAuth authentication" — both replaced (Drizzle, username/password auth). **Severity: low** (historical). |
| 100 | `npx prisma generate` / `npx prisma db push` — outdated. **Severity: low**. |
| 109 | `area:prisma` label — should be `area:db` with Drizzle. **Severity: low**. |
| 117 | "Google OAuth sign-in and sign-out work" — auth model has since changed to username/password. **Severity: low**. |
| 29 | References `./nextjs-better-auth` starter template — this directory no longer exists. |

Historical document. Same caveats as F3.

---

### F5: `apps/science-advantage/docs/sprint/S1-Teacher-Experience.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Historical sprint plan |
| **Correctness** | Prisma-era commands; some npm references |

| Line | Finding |
|------|---------|
| 23 | `npx prisma db push` — outdated. **Severity: low**. |
| 26 | `prisma/seed.ts` — actual path is `scripts/seed.ts`. **Severity: low**. |
| 33 | `npm run seed` — should be `pnpm seed`. **Severity: low**. |
| 45 | `next-intl` or equivalent i18n library — unclear if this was implemented. |
| 48 | `docker-compose up -d` — should be `docker compose up -d` (modern Docker CLI). **Severity: informational**. |
| 50–51 | `npm run dev` / `npm run test` — should use `pnpm`. **Severity: low**. |
| 115–117 | API route references (`app/api/classes/`) and component directories (`components/features/teacher/`) — these exist in the current codebase. ✓ |
| 95 | References clipboard test file `lib/utils/clipboard.test.ts` — not verified in this batch. |

---

### F6: `apps/science-advantage/docs/sprint/S1-sprint-improvements-summary.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Historical sprint improvement summary |
| **Correctness** | Prisma and npm references throughout |

| Line | Finding |
|------|---------|
| 28 | `prisma/schema.prisma` — outdated. **Severity: low**. |
| 33, 152 | `prisma/seed.ts` — outdated. **Severity: low**. |
| 100 | `npx prisma db push` — outdated. **Severity: low**. |
| 142–150 | Prisma schema diff — outdated. **Severity: low**. |
| 152–158 | References "Better Auth accounts" — auth has since migrated. |
| 208 | `npx prisma db push` — outdated. **Severity: low**. |
| 209 | `npm run seed` — should be `pnpm seed`. **Severity: low**. |
| 265 | `npm install next-intl` — should be `pnpm add next-intl`. **Severity: low**. |
| 298 | `npm run seed` — should be `pnpm seed`. **Severity: low**. |

Historical artifact — same caveats as other S0–S1 docs.

---

### F7: `apps/science-advantage/docs/sprint/S1.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Alternative S1 sprint plan |
| **Correctness** | Prisma/Google OAuth references but also documents Zod env validation |

| Line | Finding |
|------|---------|
| 4 | `created_at: 2025-01-06` — earliest date in batch. |
| 7 | "Prisma schema" — outdated. **Severity: low**. |
| 37 | Zod schema for environment validation — good pattern. ✓ |
| 45–107 | Class creation API with join code — comprehensive implementation notes. |
| 111–171 | "Bug: Login is broken" section — documents migration from Google OAuth to Better Auth. Useful historical trace. |
| 147 | "Missing `username` field in User model" — documented and resolved. |
| 249 | "Create Prisma migration" — outdated. **Severity: low**. |
| 251–263 | Zod schema validation for type safety — good. ✓ |

---

### F8: `apps/science-advantage/docs/sprint/S2-Student-Experience.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Sprint plan (completed) |
| **Correctness** | Mostly clean — curriculum structure reuse documented |
| **AGENTS.md compliance** | No Prisma-specific schema notation |

| Line | Finding |
|------|---------|
| 11 | Epic completed, 14/14 issues closed. ✓ |
| 37–42 | Detailed PR merge tracking with commit hashes. ✓ |
| 127–133 | Student settings page uses "dynamic form views based on Zod schemas" — good golden-path pattern for form handling. ✓ |
| 141 | "Logic for displaying the curriculum structure can be reused from Sprint 1" — good reuse pattern. ✓ |

No material findings. ✓

---

### F9: `apps/science-advantage/docs/sprint/S3-Interactive-Learning.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | **Path mismatch** — seed data directories referenced with wrong paths |
| **AGENTS.md compliance** | References `area:prisma` label |
| **Test quality** | Detailed integration test plans for quiz/analytics endpoints |

| Line | Finding |
|------|---------|
| 4 | **F-SA-B17-014 [status-stale]** — Status says "active" but the document shows 64% completion (line 17) and many stories are marked complete. This should be "in-progress" or "completed" depending on current state. **Severity: informational**. |
| 49 | **F-SA-B17-012 [path-mismatch]** — Story #90 references `prisma/seed-data/` directory structure (also lines 52, 988, 989). The actual seed data lives in `scripts/seed-data/` and `scripts/seed/`. These directories exist and are populated, but the spec was never updated to reflect the final location. **Severity: medium**. |
| 246 | `area:prisma` label — outdated, should reference Drizzle. **Severity: low**. |
| 260 | "LessonType enum to Prisma schema" — outdated. **Severity: low**. |
| 306, 958 | Prisma-era data model definitions. **Severity: low**. |
| 991 | `scripts/migrate-seed-data.ts` — verified this file exists. ✓ |
| 493–514 | Comprehensive UI component implementation with accessibility and mobile-responsive design. ✓ |
| 716–735 | Detailed analytics API with 10 integration tests passing. ✓ |
| 964–969 | API design principles: auth-required, student-own-data, teacher-class-data. Strong authorization pattern. ✓ |

---

### F10: `apps/science-advantage/docs/sprint/S4-AI-Personalization.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Sprint plan (status: "ready") |
| **Correctness** | Prisma references; some AI patterns align with AGENTS.md |
| **AGENTS.md compliance** | References Vercel AI SDK `generateObject` with Zod — aligns with adapter pattern |

| Line | Finding |
|------|---------|
| 4 | Status: "ready" — this sprint plan was never fully executed or its status was not updated. |
| 35 | "model, `StandardMastery`, is added to `prisma/schema.prisma`" — outdated. This model now lives in Drizzle under `packages/db/`. **Severity: low**. |
| 38 | `npx prisma db push` — outdated. **Severity: low**. |
| 44 | `area:prisma` label — outdated. **Severity: low**. |
| 105–114 | AI recommendation using Vercel AI SDK `generateObject` with Zod schema — recommended pattern in root AGENTS.md. ✓ |
| 111 | "Zod schema ensures the AI returns a valid JSON object" — good structured output pattern. ✓ |

Sprint 4 was apparently "ready for seeding" but may not have been completed. The route `/api/ai/update-mastery` exists (confirmed), and `scripts/backfill-mastery.ts` exists with Drizzle imports, but `/student/profile` route exists, suggesting partial implementation.

---

### F11: `apps/science-advantage/docs/sprint/S5-Rich-Curriculum-Development.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Sprint plan (status: active) |
| **Correctness** | Clean — no Prisma/npm references |
| **Architecture** | References modular seed data architecture from S3 |

| Line | Finding |
|------|---------|
| 4 | Status: "active" — but implementation appears complete (10 Grade 4 lesson JSON files exist at `scripts/seed-data/grade-4/lessons/`, 10 question files at `scripts/seed-data/grade-4/questions/`). Status may be stale. **Severity: informational**. |
| 22–24 | 10 new Grade 4 lessons — verified 10 lesson JSON files exist. ✓ |
| 25 | Question banks for each lesson — verified 10 question JSON files exist. ✓ |
| 63 | References modular seed data architecture from S3 — consistent. ✓ |
| 46–48 | Images sourced to `/public/images/lessons/` — not verified in this batch. |

No material findings. ✓

---

### F12: `apps/science-advantage/docs/sprint/S5-UX-Evaluation-Summary.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | UX evaluation report |
| **Correctness** | Sound evaluation |
| **Security/tenancy** | Not applicable — UX evaluation |
| **AGENTS.md compliance** | No conflicts |

| Line | Finding |
|------|---------|
| 38 | "Type-safe implementation using Zod for runtime validation" — good pattern alignment. ✓ |
| 50–51 | Suggests "accessibility fields for diverse learner support" — enhancement, not defect. |
| 144–157 | Strengths: bilingual support, accessibility-first, mobile-first. ✓ |
| 186–203 | Architecture and UX quality rated 5/5. Subjective but documented. |

No material findings. ✓

---

### F13: `apps/science-advantage/docs/sprint/review-log-20251022.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Review audit log |
| **Correctness** | Minimal, accurate |
| **AGENTS.md compliance** | No conflicts |

| Line | Finding |
|------|---------|
| 13 | Reviewer: "Gemini (AI Reviewer)" — documents AI-assisted review process. |
| 31–37 | Summary: 0 architecture concerns, 0 wording improvements, 1 planning suggestion, 9 additional considerations. |
| 30–36 | Findings categories are administrative, not code issues. |

No material findings. ✓

---

### F14: `apps/science-advantage/docs/sprint/review-log-20251027.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Review audit log |
| **Correctness** | Minimal, accurate |

| Line | Finding |
|------|---------|
| 28 | Notes: "The main recurring suggestion is the creation of the spec files referenced in the issues" — the spec files (`docs/specs/student-profile/spec.md`, `docs/specs/teacher-intervention/spec.md`, `docs/specs/ai-recommendations/spec.md`) now exist, so this gap was closed. ✓ |

No material findings. ✓

---

### F15: `apps/science-advantage/docs/testing/quiz-ui-manual-test-plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Manual test plan |
| **Correctness** | Comprehensive, well-structured |
| **Test quality** | 60+ test scenarios across 16 categories, 5 question types, accessibility, responsive, edge cases |

| Line | Finding |
|------|---------|
| 14 | **F-SA-B17-016 [npm-mismatch]** — References `npm run dev`. Should reference `pnpm dev`. **Severity: low**. |
| 36 | 401 error message — good auth guard verification. ✓ |
| 41 | 403 error for unauthorized access — good multi-tenancy verification. ✓ |
| 241–259 | Accessibility test cases: keyboard navigation, screen reader, color contrast. ✓ |
| 282–297 | Edge cases: fill-in-blank whitespace normalization, multiple-select validation, vocabulary match completeness. ✓ |
| 300–317 | **F-SA-B17-024 [empty-results]** — Test results summary table has empty Passed/Failed columns. Expected for a plan document (not an execution log). **Severity: informational**. |

Well-constructed test plan covering happy path, error states, accessibility, and edge cases. ✓

---

### F16: `apps/science-advantage/e2e/smoke.spec.ts`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Playwright E2E smoke tests |
| **Correctness** | Functional but has pattern issues |
| **Test quality** | Covers basic smoke scenarios; has weak assertions |

| Line | Finding |
|------|---------|
| 3 | `E2E_BASE_URL` env var with `http://localhost:3000` default — reasonable. |
| 6–17 | Smoke test verifies signin page loads without console errors. Good pattern with `page.on('console')` error capture. ✓ |
| 19–27 | Root redirect test confirms unauthenticated users go to `/signin`. ✓ |
| 40–42 | **F-SA-B17-017 [test-skip-antipattern]** — Uses `test.skip()` inside test body (also lines 50–52, 64–66). This is an anti-pattern: the test appears as "passed" when skipped, and `beforeEach` has already run before the skip. Preferred: `test.skip(condition, 'reason')` or `test.fixme()`. **Severity: medium**. |
| 53–54 | **F-SA-B17-018 [weak-assertion]** — `waitForURL('**/student**').catch(() => {})` silently swallows navigation failures. Combined with the fact that `test.skip()` was called if the student button wasn't visible, this test only asserts that the URL doesn't contain `/signin` — a very weak check. **Severity: low**. |
| 68–69 | Same pattern for teacher impersonation. |
| 45–71 | No assertions on page content after impersonation (e.g., dashboard elements, user name). Tests only verify redirect away from `/signin`. **F-SA-B17-025 [weak-e2e]** — should assert at least one dashboard element is visible. **Severity: low**. |

**Recommendation:** Refactor dev impersonation tests to use conditional test skipping at the test-definition level, add content assertions after successful impersonation.

---

### F17: `apps/science-advantage/eslint.config.mjs`

| Aspect | Assessment |
|--------|-----------|
| **Type** | ESLint flat config |
| **Correctness** | Well-structured with clear audit trail |
| **AGENTS.md compliance** | Excellent — track IDs referenced in comments |

| Line | Finding |
|------|---------|
| 17–22 | Ignores for generated files and ESLint micro-fixtures. Clean. ✓ |
| 25–26 | `no-unused-vars` (warn) and `no-explicit-any` (warn) — reasonable settings. |
| 27 | **F-SA-B17-019 [rule-suppression]** — `react-hooks/set-state-in-effect: "off"` — suppressed without a documented reason. No track ID or Jira reference. This rule catches stale closures and infinite effect loops. The suppression should reference why it was disabled. **Severity: informational**. |
| 34 | `no-console: ["error", { allow: ["error", "warn"] }]` — good default, blocks `console.log` in production code. ✓ |
| 40–43 | Logger sink exemption for `lib/observability/logger.ts` — well-documented. ✓ |
| 47–50 | Client logger exemption for `components/client-logger.ts` — well-documented. ✓ |
| 52–65 | Test file exemptions — permissive (`no-explicit-any: off`, `no-unused-vars: off`) which could allow type-safety regressions in tests, but this is a practical trade-off. |
| 67–77 | Script exemptions — reasonable for CLI tools. |
| 79–87 | `vitest.integration.global-setup.ts` exemption — necessary. |
| 88–98 | ESLint micro-fixtures re-enable `no-console` for contract testing — clever pattern from Phase 7 FR-7. ✓ |

This is a **golden-path example** for ESLint configuration: clear audit trail with track IDs, documented exemptions, targeted rule application.

---

### F18: `apps/science-advantage/hooks/use-mobile.ts`

| Aspect | Assessment |
|--------|-----------|
| **Type** | React hook (shadcn/ui pattern) |
| **Correctness** | Functional but has minor SSR concern |
| **AGENTS.md compliance** | No conflict |

| Line | Finding |
|------|---------|
| 3 | `MOBILE_BREAKPOINT = 768` — standard Tailwind `md` breakpoint. ✓ |
| 11 | `(max-width: 767px)` — correct media query for "below 768px". ✓ |
| 13–16 | **F-SA-B17-020 [redundant-code]** — The `onChange` handler calls `window.innerWidth < MOBILE_BREAKPOINT`, but `mql.matches` already provides the current match state from the same query. Computing `innerWidth` is redundant. **Severity: informational**. |
| 20 | **F-SA-B17-021 [ssr-flash]** — `!!isMobile` coerces `undefined` → `false`. On SSR, the hook returns `false` (desktop), then on client hydration it may update to `true` (mobile), causing a layout flash. A better pattern is to use CSS media queries for the initial render or accept the tri-state `boolean | undefined` and handle it in consumers. **Severity: low**. |

Standard shadcn/ui hook. The SSR flash is a known trade-off of this pattern.

---

### F19: `apps/science-advantage/i18n/ai-recommendation.en.json`

| Aspect | Assessment |
|--------|-----------|
| **Type** | i18n locale JSON |
| **Correctness** | Valid JSON, well-structured |

| Line | Finding |
|------|---------|
| 1–26 | 26 keys covering: heading, badges (AI + fallback), CTAs, loading/error/empty/celebration states, polling hints, toast timeout. ✓ |
| 4–5 | Both `aiBadge` and `fallbackBadge` — suggests fallback mechanism when AI unavailable. Good architectural resilience. ✓ |
| 11–14 | Loading and error states with user-friendly messages. ✓ |
| 16–17 | Empty state: "You're all caught up!" — positive UX. ✓ |
| 25 | `translationNotice`: "Reasoning currently available in English. Translation coming soon." — transparent about incomplete localization. ✓ |

No material findings. ✓

---

### F20: `apps/science-advantage/i18n/ai-recommendation.th.json`

| Aspect | Assessment |
|--------|-----------|
| **Type** | i18n locale JSON (Thai) |
| **Correctness** | Valid JSON, consistent structure with English version |
| **AGENTS.md compliance** | Supports bilingual requirement (English/Thai) |

| Line | Finding |
|------|---------|
| 1–26 | Same 26 keys as English version. Thai text renders correctly. ✓ |
| 25 | `translationNotice`: Thai version of the note — transparent about English-only reasoning. ✓ |

No material findings. ✓

---

## Cross-Cutting Findings

| ID | Theme | Files Affected | Severity |
|----|-------|---------------|----------|
| F-SA-B17-001/002/022 | **Prisma-era schema notation in spec docs** | `docs/specs/student-profile/spec.md` | Medium |
| F-SA-B17-012 | **Path mismatch: prisma/seed-data vs scripts/seed-data** | `docs/sprint/S3-Interactive-Learning.md` | Medium |
| F-SA-B17-017 | **test.skip() anti-pattern in E2E smoke tests** | `e2e/smoke.spec.ts` | Medium |
| F-SA-B17-018/025 | **Weak E2E assertions (silent catch, no content checks)** | `e2e/smoke.spec.ts` | Low |
| F-SA-B17-016 | **npm → pnpm mismatch** | `docs/testing/quiz-ui-manual-test-plan.md` | Low |
| F-SA-B17-019 | **Suppressed eslint rule without documented reason** | `eslint.config.mjs` | Informational |
| F-SA-B17-020/021 | **Minor hook quality (redundant code, SSR flash)** | `hooks/use-mobile.ts` | Low/Info |
| F-SA-B17-023 | **Unchecked implementation item in spec** | `docs/specs/teacher-intervention/spec.md` | Informational |
| F-SA-B17-014 | **Stale sprint status fields** | `docs/sprint/S3-Interactive-Learning.md`, `docs/sprint/S5-Rich-Curriculum-Development.md` | Informational |
| Various (3–11) | **Prisma-era references in historical sprint docs S0–S2** | S0-Foundation.md, S0.md, S1-Teacher-Experience.md, S1-sprint-improvements-summary.md, S1.md | Low (historical) |

---

## Golden-Path Patterns Identified

1. **ESLint config with audit trail** (`eslint.config.mjs`) — targeted exemptions with track ID references, clear separation of logger sinks from production code. This is a reference-quality config for monorepo apps adopting Phase 7/8 patterns.

2. **Teacher intervention spec API contract** (`docs/specs/teacher-intervention/spec.md`) — uses field-type tables without ORM-specific annotations, making it ORM-agnostic and durable across migrations. This is the recommended spec-writing pattern.

3. **Form handling via dynamic Zod schemas** (`docs/sprint/S2-Student-Experience.md`, line 127–133) — "dynamic form views based on Zod schemas" is a golden-path pattern for the monorepo.

4. **Idempotency via pipeline status table** (`docs/specs/student-profile/spec.md`, lines 55–71, 105–110) — `masteryRun` with status transitions and serialized transactions is a strong pattern for reliable data pipelines.

---

## Patterns Not to Generalize

1. **In-memory TTL cache** (teacher-intervention spec, line 88) — described with "Redis-parity semantics" but actually in-memory. This is acceptable for a single-instance deployment but not suitable for horizontally scaled deployments. Should be replaced with actual Redis/ValKey when scaling.

2. **Prisma-era schema notation in spec docs** — spec docs should use ORM-agnostic field-type tables. The student-profile spec's Prisma notation is brittle and will become increasingly incorrect as the codebase evolves.

---

## Limitations

1. **Historical docs reviewed as current code** — Files F3–F8 (S0, S0-Foundation, S1 variants, S1-sprint-improvements-summary, S1.md) are historical sprint artifacts. Their Prisma/npm references reflect the project state at the time and are intentionally not actionable unless they cause active confusion.

2. **No actual implementation code** — This batch contains specs, sprint plans, test plans, config, and i18n files — but no actual application/business-logic TypeScript files. Assessments of correctness, security, and AGENTS.md compliance are limited to the documented intent rather than the code implementation.

3. **Image paths not verified** — `docs/sprint/S5-Rich-Curriculum-Development.md` references images in `/public/images/lessons/`. These were not inspected in this review.

4. **Manual test plan not executed** — `docs/testing/quiz-ui-manual-test-plan.md` has 60+ test scenarios with no results logged. This is expected for an unexecuted plan, but the test plan itself has not been validated against the current app.

5. **No acceptance/closeout claims** — This report identifies findings for remediation; it does not declare any batch "accepted" or "closed."

---

## Summary

**20 files reviewed.** Key findings:

| Severity | Count |
|----------|-------|
| 🔴 High | 0 |
| 🟡 Medium | 3 (Prisma schema notation in active spec, path mismatch in S3 sprint doc, test.skip anti-pattern in E2E) |
| 🔵 Low | 10+ (historical Prisma/npm references across sprint docs, weak E2E assertions, SSR flash in hook) |
| ℹ️ Informational | 4 (stale status fields, suppressed eslint rule, unchecked implementation item, redundant code) |

**Most important action items:**

1. **Fix path references in `docs/sprint/S3-Interactive-Learning.md`** — Replace `prisma/seed-data/` with `scripts/seed-data/` and `prisma/seed-functions/` with `scripts/seed/` throughout (F-SA-B17-012).

2. **Remove Prisma notation from `docs/specs/student-profile/spec.md`** — Replace Prisma field annotations with ORM-neutral field-type tables (F-SA-B17-001).

3. **Refactor E2E smoke tests** — Replace `test.skip()` body calls with conditional test-level skip. Add content assertions after impersonation (F-SA-B17-017, F-SA-B17-025).

4. **Document eslint rule suppression** — Add a JSDoc comment or inline comment explaining why `react-hooks/set-state-in-effect` is disabled (F-SA-B17-019).

5. **(Deferred) Update sprint document status fields** — S3 and S5 documents have stale status metadata (informational).
