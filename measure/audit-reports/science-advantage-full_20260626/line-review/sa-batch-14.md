# Line-Review Report: sa-batch-14

**Track:** `science_advantage_review_20260626`  
**Batch:** `sa-batch-14`  
**Review Date:** 2026-06-27  
**Reviewer:** AI Agent (line-review mode)  
**Scope:** 20 files — all documentation under `apps/science-advantage/docs/`  
**Focus:** Correctness, security/tenancy/auth, AGENTS compliance, test quality, architecture baseline/golden-path patterns.  
**Constraint:** No app code edits; report only. No acceptance/closeout claims.

---

## Files Reviewed

All 20 files from `/tmp/opencode/sa-batch-14`:

| #  | File | Status in Doc |
|----|------|---------------|
| 1  | `apps/science-advantage/docs/archive/front-end-spec/information-architecture-ia.md` | `status: deprecated` |
| 2  | `apps/science-advantage/docs/archive/front-end-spec/introduction.md` | `status: deprecated` |
| 3  | `apps/science-advantage/docs/archive/front-end-spec/next-steps.md` | `status: deprecated` |
| 4  | `apps/science-advantage/docs/archive/front-end-spec/performance-considerations.md` | `status: deprecated` |
| 5  | `apps/science-advantage/docs/archive/front-end-spec/responsiveness-strategy.md` | `status: deprecated` |
| 6  | `apps/science-advantage/docs/archive/front-end-spec/testing-and-quality-assurance.md` | `status: deprecated` |
| 7  | `apps/science-advantage/docs/archive/front-end-spec/thai-language-support-and-cultural-considerations.md` | `status: deprecated` |
| 8  | `apps/science-advantage/docs/archive/front-end-spec/user-flows.md` | `status: deprecated` |
| 9  | `apps/science-advantage/docs/archive/front-end-spec/wireframes-mockups.md` | `status: deprecated` |
| 10 | `apps/science-advantage/docs/archive/github-alignment-summary.md` | (no status frontmatter) |
| 11 | `apps/science-advantage/docs/archive/implementation-summary-class-creation-api.md` | `status: deprecated` |
| 12 | `apps/science-advantage/docs/archive/onboarding/environment.md` | `status: deprecated` |
| 13 | `apps/science-advantage/docs/archive/prd-monolithic.md` | `status: deprecated` |
| 14 | `apps/science-advantage/docs/archive/project-brief-monolithic.md` | `status: deprecated` |
| 15 | `apps/science-advantage/docs/archive/science-advantage-project-brief.md` | `status: deprecated` |
| 16 | `apps/science-advantage/docs/changes/retrospective.md` | `status: active` |
| 17 | `apps/science-advantage/docs/changes/rich-curriculum-and-interactive-content/proposal.md` | `status: approved` |
| 18 | `apps/science-advantage/docs/changes/rich-curriculum-and-interactive-content/spec-delta.md` | `status: draft` |
| 19 | `apps/science-advantage/docs/changes/rich-curriculum-and-interactive-content/tasks.yml` | (YAML, no frontmatter) |
| 20 | `apps/science-advantage/docs/content-templates/README.md` | `status: active` |

---

## Findings

### F-SA-B14-001 — Active guide references removed Prisma paths
**Severity:** HIGH  
**File:** `docs/content-templates/README.md`  
**Lines:** 18, 177, 201  
**Category:** AGENTS compliance / correctness  

The `science-advantage` AGENTS.md regression guard states: *"The `prisma/` directory at the app root must not exist. Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root."* The `prisma/` directory does not exist (confirmed via `ls`). However this **active** guide repeatedly references the old Prisma path structure:

- Line 18: `"The actual lesson content is stored in JSON files under \`prisma/seed-data/lessons/\`"` — actual location is `scripts/seed-data/lessons/`.
- Line 177: `"The seed script (\`prisma/seed.ts\`) validates lesson content during import"` — actual seed scripts are in `scripts/seed/`.
- Line 201: `"See completed examples in \`prisma/seed-data/lessons/thai-g3-unit-1.json\`"` — stale path reference.

Content authors following this guide will be unable to locate the referenced files. The guide should be updated to reference the current `scripts/seed-data/` and `scripts/seed/` paths.

---

### F-SA-B14-002 — Active guide references Prisma seed data validation
**Severity:** MEDIUM  
**File:** `docs/content-templates/README.md`  
**Lines:** 176–191  
**Category:** AGENTS compliance / correctness  

The validation section (lines 176–191) describes seed-time validation that occurs in `prisma/seed.ts`. The current Drizzle-based seeding pipeline in `scripts/seed/` may not implement the same validation logic (section header matching, regex pattern validation for vocabulary/materials/procedure formats). Documented guarantees about "Seed script will fail with detailed errors if validation fails" (line 191) may be inaccurate if the current seed scripts do not enforce these rules.

---

### F-SA-B14-003 — Deprecated onboarding doc uses `npm` commands
**Severity:** LOW  
**File:** `docs/archive/onboarding/environment.md`  
**Lines:** 26, 40–42, 46, 148, 229  
**Category:** Correctness  

The archived environment guide uses `npm install`, `npm run dev`, `npm run seed`, `npx prisma generate`, `npx prisma db push` throughout. The monorepo uses `pnpm` exclusively. The frontmatter correctly notes `status: deprecated` with description *"Refer to the root README.md for current instructions"* (line 7), which mitigates this finding. However the guide may still confuse readers who do not notice the deprecation banner.

---

### F-SA-B14-004 — Deprecated onboarding doc references Prisma/NextAuth stack
**Severity:** LOW  
**File:** `docs/archive/onboarding/environment.md`  
**Lines:** 39–42, 57–59, 82–83  
**Category:** AGENTS compliance / architecture drift  

The document describes a stack (Prisma + NextAuth + Google OAuth) that has been replaced with Drizzle + `@reading-advantage/auth` + username/password auth. Specifically:
- Line 57: References `NEXTAUTH_SECRET` and `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` as required variables — current auth uses neither.
- Lines 82–83: Google OAuth callback URIs — no longer applicable.
- Lines 39–42: `npx prisma generate` / `npx prisma db push` — replaced by Drizzle migrations.

This is expected for an archive doc but creates a misleading impression of what the current stack requires.

---

### F-SA-B14-005 — Deprecated implementation summary Documents Prisma-based code
**Severity:** LOW  
**File:** `docs/archive/implementation-summary-class-creation-api.md`  
**Lines:** 24–28, 33, 90–91, 127–143, 206, 209, 218  
**Category:** Correctness / architecture drift  

The class creation API summary describes a Prisma-based implementation (`prisma/schema.prisma`, `prisma.class.findUnique()`, Prisma model definitions). The current codebase uses Drizzle. The auth section (line 206) references "NextAuth session" and the security section (line 209) mentions "Prisma ORM" for SQL injection protection.

**Notable:** The documented patterns — Role-Based Access (TEACHER/ADMIN only), ownership validation, Zod input validation (lines 52–57) — align well with current security requirements. The technical approach (Prisma) is outdated but the security patterns remain valid.

---

### F-SA-B14-006 — Archived PRD assumes microservices architecture
**Severity:** LOW  
**File:** `docs/archive/prd-monolithic.md`  
**Lines:** 113–116, 127  
**Category:** AGENTS compliance / architecture baseline  

The PRD assumes "microservices architecture within the monorepo" with API Gateway, service discovery, and separate backend services. The current monorepo AGENTS.md prescribes cohesive backend modules in `@reading-advantage/domain` with Route Handlers as the transport layer, and explicitly states *"Do not create a dedicated API service without a clear boundary."* The PRD's architecture assumption conflicts with the current golden path. Mitigated by its `status: deprecated` frontmatter.

---

### F-SA-B14-007 — Archived project brief assumes MongoDB
**Severity:** LOW  
**File:** `docs/archive/project-brief-monolithic.md`  
**Lines:** 121–122  
**Category:** Architecture baseline  

The project brief specifies "PostgreSQL for structured data, MongoDB for flexible content storage." The current architecture is PostgreSQL-only via Drizzle. MongoDB is not in the stack. Mitigated by `status: deprecated`.

---

### F-SA-B14-008 — Archived project brief has duplicated content
**Severity:** LOW  
**File:** `docs/archive/project-brief-monolithic.md`  
**Lines:** 537–601 and 603–669  
**Category:** Correctness  

The "Governance and Success Criteria" section (§9) appears twice verbatim (lines 537–601 and again at lines 603–669). The second copy also includes the §9.3 "Exit Strategy" sub-section duplicated. This is a copy-paste error in the archived document.

---

### F-SA-B14-009 — Archived onboarding doc dev auth env var name mismatch
**Severity:** LOW  
**File:** `docs/archive/onboarding/environment.md`  
**Lines:** 131–132  
**Category:** Correctness  

Archive doc references `NEXT_PUBLIC_DEV_AUTH=true` for the dev auth toggle. The current science-advantage AGENTS.md references `DEV_AUTH_ENABLED=true`. While the archive is deprecated, the naming mismatch could cause confusion if a developer relies on this old doc.

---

### F-SA-B14-010 — Archived GitHub alignment document uses `npm` commands
**Severity:** LOW  
**File:** `docs/archive/github-alignment-summary.md`  
**Lines:** 119–120  
**Category:** Correctness  

The "Commands for Development" section (lines 107–128) uses `npm run lint && npm run test && npm run test:integration`. The monorepo uses `pnpm` exclusively. Additionally the `gh issue create` commands reference milestone names (S1–S4) that may no longer be current.

---

### F-SA-B14-011 — Archived implementation summary lacks multi-tenant scoping
**Severity:** MEDIUM  
**File:** `docs/archive/implementation-summary-class-creation-api.md`  
**Lines:** 52–57, 203–210  
**Category:** Security / tenancy  

The documented class creation API describes role-based access (TEACHER/ADMIN) and ownership validation ("Teachers can only access their own classes") but makes no mention of `schoolId` scoping or multi-tenant isolation. The current monorepo AGENTS.md requires *"Every query must be scoped by `schoolId`"* and *"Never trust tenant IDs from the frontend."* For an archive doc this is only a historical observation, but it shows the gap between the original implementation and current tenancy requirements.

---

### F-SA-B14-012 — Active retrospective references `lib/` code locations
**Severity:** LOW  
**File:** `docs/changes/retrospective.md`  
**Lines:** 29, 113, 124–126  
**Category:** AGENTS compliance / architecture baseline  

The retrospective documents schema and parser files under `lib/schemas/` and `lib/content-parsers.ts`. The monorepo AGENTS.md states business logic must live in `@reading-advantage/domain` (packages/backend/modules), not in `lib/`. Since this is a retrospective (lessons-learned doc), it is descriptive rather than prescriptive, but it documents a pattern that diverges from the golden path.

---

### F-SA-B14-013 — Active retrospective describes schema change in app, not shared package
**Severity:** LOW  
**File:** `docs/changes/retrospective.md`  
**Line:** 75  
**Category:** AGENTS compliance / architecture baseline  

Line 75: *"Added structuredContent Json field to Lesson model"* — this appears to describe a schema change made directly in the app's data model rather than in `packages/db` where the monorepo AGENTS.md requires schema definitions to live. Without the actual PR code, this is inferred from the doc text and cannot be definitively confirmed. Flagged for awareness.

---

### F-SA-B14-014 — Active proposal documents client-side rendering for lesson player
**Severity:** INFO  
**File:** `docs/changes/rich-curriculum-and-interactive-content/spec-delta.md`  
**Line:** 40  
**Category:** Architecture baseline  

The spec-delta calls out *"Client-Side Rendering"* as a design decision for the Lesson Player component. The monorepo prefers React Server Components via Next.js App Router. For an interactive component like a lesson player this may be justified, but it should be noted that the current Next.js best practices (next-best-practices skill) prefer server components with client islands. Not necessarily wrong, but worth calling out the architectural trade-off.

---

### F-SA-B14-015 — Active proposal JSON-first content model aligns with Zod contracts
**Severity:** INFO  
**File:** `docs/changes/rich-curriculum-and-interactive-content/proposal.md`  
**Lines:** 17, 38–41  
**Category:** Architecture baseline / golden-path  

The proposal's JSON-first structured content model aligns well with the monorepo's contract-driven approach (Zod schemas at boundaries). The retrospective confirms (line 19) *"Clean implementation of Zod schemas for structured lesson content."* This is a positive pattern consistent with the golden path.

---

### F-SA-B14-016 — Active retrospective demonstrates strong test culture
**Severity:** INFO  
**File:** `docs/changes/retrospective.md`  
**Lines:** 19, 29, 63–65, 88, 113  
**Category:** Test quality  

The retrospective documents consistent high test coverage across all PRs in the epic: 27 tests (schema), 33 tests (lesson player), 34 tests (vocabulary flashcards), 46 tests (migration script). Tests cover edge cases, accessibility, and error scenarios. This is a positive signal — the team follows the monorepo testing guidelines.

---

### F-SA-B14-017 — Archived front-end spec aligns with WCAG AA and accessibility
**Severity:** INFO  
**Files:** `docs/archive/front-end-spec/introduction.md` (L63), `docs/archive/front-end-spec/testing-and-quality-assurance.md` (L12–24)  
**Category:** Correctness / test quality  

The archived front-end spec defines WCAG AA compliance, axe-core integration, screen reader testing, keyboard navigation verification. These are consistent with the current AGENTS.md accessibility requirements. The testing section (testing-and-quality-assurance.md) describes a comprehensive testing pyramid. For an archive doc this is well above typical spec quality.

---

### F-SA-B14-018 — Archived front-end spec performance targets are reasonable
**Severity:** INFO  
**File:** `docs/archive/front-end-spec/performance-considerations.md`  
**Lines:** 12–17  
**Category:** Architecture baseline  

Performance goals (2s 3G load, 100ms interaction, 60fps animations, 16ms frame time for virtual lab, 1s lesson content load) are reasonable targets for a modern Next.js application. No contradictions with current performance expectations.

---

### F-SA-B14-019 — Archived front-end spec Thai i18n coverage is thorough
**Severity:** INFO  
**File:** `docs/archive/front-end-spec/thai-language-support-and-cultural-considerations.md`  
**Lines:** 1–70  
**Category:** Correctness  

The Thai language support document is comprehensive, covering font loading (`font-display: swap`), character encoding (UTF-8), mixed content rendering, persistent language preferences, screen reader compatibility, and cultural integration. This level of detail is valuable reference material even in its archived state.

---

### F-SA-B14-020 — Active content templates guide provides valuable content authoring standards
**Severity:** INFO  
**File:** `docs/content-templates/README.md`  
**Lines:** 28–37, 43–73, 97–120, 154–173  
**Category:** Correctness / test quality  

Despite the stale Prisma path references (F-SA-B14-001, F-SA-B14-002), the content templates guide provides well-structured authoring standards with section header conventions, vocabulary formatting rules, validation regex patterns, and grade-level guidelines. The validation rules (line 73 validation regex, line 120 procedure requirements) represent a quality bar that should be preserved in whatever replaces the Prisma seed validation.

---

## Summary

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| HIGH     | 1     | F-SA-B14-001 |
| MEDIUM   | 2     | F-SA-B14-002, F-SA-B14-011 |
| LOW      | 10    | F-SA-B14-003, F-SA-B14-004, F-SA-B14-005, F-SA-B14-006, F-SA-B14-007, F-SA-B14-008, F-SA-B14-009, F-SA-B14-010, F-SA-B14-012, F-SA-B14-013 |
| INFO     | 7     | F-SA-B14-014, F-SA-B14-015, F-SA-B14-016, F-SA-B14-017, F-SA-B14-018, F-SA-B14-019, F-SA-B14-020 |
| **Total** | **20** | |

### Key Themes

1. **HIGH: Active guide references deleted Prisma paths** (F-SA-B14-001). The `docs/content-templates/README.md` — marked `status: active` — points content authors at `prisma/seed-data/` and `prisma/seed.ts` which no longer exist. This is the only actionable finding that affects current work. Seed data is now at `scripts/seed-data/` and `scripts/seed/`.

2. **MEDIUM: Stale validation guarantees** (F-SA-B14-002). The same active guide describes validation behavior in a seed script (`prisma/seed.ts`) that no longer exists. The current Drizzle-based seed pipeline may not enforce the same section-header and regex validation rules.

3. **MEDIUM: Archived class API has no tenancy scoping** (F-SA-B14-011). The deprecated class creation API summary documents ownership validation but no `schoolId` scoping. This is a historical gap that should be addressed if similar endpoints are re-implemented under the current multi-tenancy requirements.

4. **10 LOW findings** across archive docs that reference the old Prisma/NextAuth/Google OAuth stack. This is expected for archived documentation but creates noise.

5. **All tests documented in active docs show strong coverage** — a positive signal for quality culture.

### Limitations

- All 20 files are documentation, not code. Audit dimensions like "test quality" and "security" are assessed from what the docs describe, not from runtime behavior.
- Findings about path existence (`prisma/` dir, `scripts/seed-data/`) are based on filesystem inspection at review time and may not reflect past or future states.
- No TypeScript code was run, compiled, or type-checked during this review.
- This report makes no acceptance, closeout, or sign-off claims.
- Findings F-SA-B14-012 and F-SA-B14-013 about `lib/` locations and schema changes in the app are inferred from retrospective descriptions; the actual PR code was not examined.
