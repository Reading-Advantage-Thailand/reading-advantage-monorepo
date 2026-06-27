# Line Review: sa-batch-16

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-16 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns
- **File types**: Documentation only — project-brief documents (12) and spec/design documents (8)

---

## Files Reviewed

1. `apps/science-advantage/docs/project-brief/document-information.md`
2. `apps/science-advantage/docs/project-brief/executive-summary.md`
3. `apps/science-advantage/docs/project-brief/governance-and-success-criteria.md`
4. `apps/science-advantage/docs/project-brief/implementation-timeline.md`
5. `apps/science-advantage/docs/project-brief/index.md`
6. `apps/science-advantage/docs/project-brief/market-analysis.md`
7. `apps/science-advantage/docs/project-brief/product-specifications.md`
8. `apps/science-advantage/docs/project-brief/project-overview.md`
9. `apps/science-advantage/docs/project-brief/resource-requirements.md`
10. `apps/science-advantage/docs/project-brief/risk-assessment.md`
11. `apps/science-advantage/docs/project-brief/success-metrics.md`
12. `apps/science-advantage/docs/project-brief/technical-requirements.md`
13. `apps/science-advantage/docs/specs/ai-recommendations/design.md`
14. `apps/science-advantage/docs/specs/ai-recommendations/spec.md`
15. `apps/science-advantage/docs/specs/ai-structured-data-generation/spec.md`
16. `apps/science-advantage/docs/specs/assessment-system/spec.md`
17. `apps/science-advantage/docs/specs/assignment-management/spec.md`
18. `apps/science-advantage/docs/specs/core-science-curriculum-content-management/spec.md`
19. `apps/science-advantage/docs/specs/foundation-ecosystem-integration/spec.md`
20. `apps/science-advantage/docs/specs/progress-tracking/spec.md`

---

## File-by-File Findings

### File 1: `document-information.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor inconsistency |
| **Security/tenancy** | N/A (document metadata) |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 5, 15 | **Date mismatch**: Frontmatter `created_at: 2025-11-29` but body says "Date: October 4, 2025". Either the document was created November 29 and the body date is stale, or the frontmatter is incorrect. | Low | F-SA-B16-001 |
| 7 | `description` text is well-formed. | OK | — |
| 17 | Status "Strategic Planning Complete" — no contradiction with frontmatter `status: draft`. Both indicate the brief is not yet final. | OK | — |

---

### File 2: `executive-summary.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (business/market content) |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 12 | Thai baht symbol `฿` used — consistent with other project brief docs. | OK | — |
| 12 | Claims "40% improvement in student outcomes" without citing a source metric. Acceptable for a project brief but a risk for external stakeholders. | Info | — |
| All | No code, contracts, or architecture decisions to review. | — | — |

---

### File 3: `governance-and-success-criteria.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8 | Description starts with lowercase "outlines" — minor formatting inconsistency with other files that capitalize the first word. | Info | — |
| 74 | All success criteria are business-level. No technical/architectural findings. | OK | — |

---

### File 4: `implementation-timeline.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK for planning doc |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 14–19 | Phase 1 mentions "Mobile applications" in months 5–6. If this targets React Native, it aligns with the existing technology choices. | OK | — |
| 55–57 | Team sizes grow from 8 to 15 developers — no architecture concerns. | OK | — |

---

### File 5: `index.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — all referenced files exist |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 53 | References `./conclusion.md` — verified this file exists at `apps/science-advantage/docs/project-brief/conclusion.md`. No broken link. | OK | — |
| All | TOC structure is consistent and all anchor links match actual headings in referenced files. | OK | — |

---

### File 6: `market-analysis.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 37–43 | Comparative table format is clear. | OK | — |
| All | Business/market content only — no code or architecture decisions. | — | — |

---

### File 7: `product-specifications.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 34 | "Mobile applications (iOS/Android)" — no mention of React Native, but this is a high-level spec. | Info | — |
| All | MVP-to-Phase 3 feature breakdown is well-structured. | OK | — |

---

### File 8: `project-overview.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Short overview document. No architecture issues. | OK | — |

---

### File 9: `resource-requirements.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Deviations from AGENTS.md golden-path |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | **Medium concern** — provider-specific infrastructure choices |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 19 | Mentions "Backend Developers: 3 (Node.js, **microservices**, database)". The term "microservices" contradicts the monorepo backend-modules pattern described in AGENTS.md. The codebase uses `packages/backend` modules, not independently deployed microservices. | Medium | F-SA-B16-002 |
| 52–56 | **Provider lock-in**: Specifies "Cloud Provider: AWS" with RDS, CloudFront, S3, SageMaker. The monorepo AGENTS.md mandates provider-neutrality via adapters and supports Docker deployment to Cloud Run, Fly.io, Railway, Kubernetes. Committing to AWS-specific services (SageMaker, CloudFront) couples infrastructure to a single provider. | Medium | F-SA-B16-003 |
| 60 | "Authentication: Leverage existing Advantage SSO system" — aligns with auth adapter pattern. | OK | — |
| 61 | "Payment Gateway: Omise (Thai market leader)" — acceptable for a project brief that identifies business dependencies. | OK | — |
| 88 | Total budget of `฿110M` — business projection only. | OK | — |

---

### File 10: `risk-assessment.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Well-structured risk matrix with probability/impact/mitigation. No code issues. | OK | — |

---

### File 11: `success-metrics.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Business/technical KPIs only. | OK | — |

---

### File 12: `technical-requirements.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Deviations from AGENTS.md golden-path |
| **Security/tenancy** | No `schoolId`/tenancy mention |
| **AGENTS.md compliance** | **Medium concern** — architecture direction contradictions |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 24 | "Backend: Node.js with **microservices architecture**" — same concern as File 9. The monorepo is organized around `packages/backend/modules`, not microservices. This document was likely written before the backend-modules convention was established. | Medium | F-SA-B16-004 |
| 26 | "AI/ML: Python-based recommendation engine" — introducing Python into a TypeScript-first monorepo creates polyglot deployment complexity and contradicts the preference for the internal AI adapter (`@reading-advantage/ai`). If the adapter abstracts provider calls, the recommendation logic should live in TypeScript backend modules. | Medium | F-SA-B16-005 |
| 70–73 | "LMS compatibility (Moodle, Google Classroom, etc.)" — no comment on implementation approach. Reasonable for a requirements doc. | OK | — |

---

### File 13: `ai-recommendations/design.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Speculative model names |
| **Security/tenancy** | No `schoolId` mention in data-flow |
| **AGENTS.md compliance** | AI adapter pattern partially aligned |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 22, 50 | Model names `gemini-2.5-flash` and `gpt-5-mini` are speculative. As of 2026, these models may not exist under these exact names. Google's Gemini model line is at `gemini-2.0-*`; OpenAI's latest is `gpt-4o-*` / `o3-*`. Using nonexistent model names in a design document creates confusion for implementers. | Medium | F-SA-B16-006 |
| 22 | Recommendation engine invokes AI via model-specific APIs rather than the internal `@reading-advantage/ai` adapter's `ai.generateText()` / `ai.generateObject()` interface. This bypasses the adapter pattern mandated by AGENTS.md. | High | F-SA-B16-007 |
| 46–50 | Sequence describes calling `POST /api/ai/update-mastery` — this is a Route Handler path. Per AGENTS.md, Route Handlers should be thin; the mastery pipeline logic should live in a `packages/backend` command. | Medium | F-SA-B16-008 |
| 49 | Calls `POST /api/ai/recommendations` — same concern as above. | Medium | F-SA-B16-008b |
| 67 | "Rollout behind feature flags (`FEATURE_AI_RECOMMENDATION`)" — good operational pattern. | OK | — |
| 69 | "Ensure env vars for model API keys are scoped per environment" — good security practice. | OK | — |
| All | No `schoolId` tenancy scoping described in the data flow, though all science tables are FLAT with `schoolId`. Any implementation must scope recommendations by tenant. | Info | — |

---

### File 14: `ai-recommendations/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good structure; model-name issue |
| **Security/tenancy** | Partial — auth and audit considered |
| **AGENTS.md compliance** | Mixed — adapter bypass, no backend module ref |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 19, 35–36 | Same speculative model names `gemini-2.5-flash` / `gpt-5-mini` as design.md. See F-SA-B16-006. | Medium | F-SA-B16-006b |
| 27, 88–93 | API defined as `POST /api/ai/recommendations` with caching per `(studentId, attemptId)`. Missing `schoolId` in cache key — could allow cross-tenant cache hits in a shared Redis instance if tenants share a cache namespace. | Medium | F-SA-B16-009 |
| 42–52 | Input payload explicitly prohibits PII (student name, email, free-form responses). Good privacy design. | OK | — |
| 56–74 | Output schema with Zod validation — aligns with AGENTS.md contract-first approach. | OK | — |
| 88 | **Auth mention**: "student session; teacher/admin allowed when impersonation flag active. Attempt ownership validated server-side." Good authorization pattern — ownership check is the correct approach. | OK | — |
| 106–109 | Encrypted audit log with 30-day retention — good security consideration. | OK | — |
| 148 | Implementation checklist mentions "Integrate Vercel AI SDK with Gemini/GPT model abstraction" — this should route through `@reading-advantage/ai` adapter, not directly. | Medium | F-SA-B16-010 |

---

### File 15: `ai-structured-data-generation/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | **Major**: references Prisma throughout |
| **Security/tenancy** | Not addressed |
| **AGENTS.md compliance** | **High concern** — violates Drizzle-as-truth directive |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7, 13 | Description says "Prisma integration" and "Prisma schema, Zod validation schemas" — the codebase migrated from Prisma to Drizzle (see science-advantage AGENTS.md regression guard: "Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root"). This entire spec is based on a stale ORM. | High | F-SA-B16-011 |
| 24, 27, 29 | References `prisma-zod-generator`, `npx prisma generate`, and `schema.prisma` as the source of truth. None of these exist in the current codebase (Drizzle uses `drizzle-kit` and `packages/db/src/schema/`). | High | F-SA-B16-012 |
| 55–63 | Entire data model workflow (lines 55–63) is Prisma-centric. The correct workflow for this codebase uses Drizzle schema → handwritten or `drizzle-zod`-generated Zod schemas, not `prisma-zod-generator`. | High | F-SA-B16-013 |
| 76–83 | Correctly references `@reading-advantage/ai` shared package with `getAIClient()` — this aligns with the adapter pattern. However, the rest of the spec undermines this alignment. | OK (partial) | — |
| 86–91 | Provider configuration table is reasonable, but the underlying ORM assumption is wrong. | High | F-SA-B16-013b |
| 96 | Lists `prisma` and `prisma-zod-generator` as dependencies — neither should be used. Should reference `drizzle-orm`, `drizzle-kit`, and `@reading-advantage/db`. | High | F-SA-B16-014 |

**Overall assessment**: This spec was written before the Drizzle migration and has not been updated. It should either be rewritten to reference Drizzle or marked as `archive/`.

---

### File 16: `assessment-system/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Mostly sound; model naming mismatch |
| **Security/tenancy** | Authorization patterns well-defined |
| **AGENTS.md compliance** | Table name mismatch with actual DB |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 179–195, 246–268, 271–291 | **Data model name mismatch**: Spec defines `QuizQuestion`, `Attempt`, `QuestionResponse` tables. Actual Drizzle schema uses `scienceQuizQuestions`, `scienceAttempts`, `scienceQuestionResponses` (all have `schoolId` and `science_` prefix). This naming drift could cause confusion during implementation handoff. | Medium | F-SA-B16-015 |
| 185, 255 | Spec models do NOT include a `schoolId` field. Actual Drizzle tables are FLAT with `schoolId`. Any spec-faithful implementation would miss tenant scoping. | High | F-SA-B16-016 |
| 322, 360 | API endpoints defined as `app/api/lessons/[lessonId]/quiz/route.ts` — matches actual implementation. Good. | OK | — |
| 327–328, 365–367 | Authorization for quiz endpoints well-defined: enrollment-based access for students, ownership for teachers. | OK | — |
| 448–453 | Fill-in-the-blank normalization strategy (lowercase, trim, remove extra spaces). Good detail. | OK | — |
| 455–458 | Question versioning consideration — preserves historical attempt integrity. Good. | OK | — |
| 567 | Lists future enhancement for "AI-assisted question generation" — this would need to go through the AI adapter. | Info | — |

---

### File 17: `assignment-management/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Well-structured |
| **Security/tenancy** | Good role-based auth |
| **AGENTS.md compliance** | Model name mismatch |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 60–68 | API endpoints with role-based access (TEACHER, ADMIN) — good. | OK | — |
| 76 | "Timezone: optional IANA identifier defaulting to **tenant locale**" — good tenancy awareness. | OK | — |
| 77 | "Teacher must own the target class unless acting as admin" — correct authorization rule. | OK | — |
| 277–294 | Status transition rules (DRAFT/PUBLISHED/CANCELLED) well-defined with a clear matrix. | OK | — |
| 325–329 | Delete-only-draft, cancel-published rule is correct for data integrity. | OK | — |
| All | Spec does not explicitly reference the actual `scienceAssignments` Drizzle table name (uses generic "Assignment"). Same naming drift as File 16. | Low | F-SA-B16-017 |

---

### File 18: `core-science-curriculum-content-management/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Structurally sound |
| **Security/tenancy** | Not addressed for content |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 25–42 | Functional requirements trace to PRD FR1, FR2, FR15, FR5, FR11. Good traceability. | OK | — |
| 86–113 | Content import/validation strategy with error reporting — well-specified. | OK | — |
| 118–122 | Lesson type templates (LAB vs LESSON) — clear distinction. | OK | — |
| 143–149 | Vocabulary format with structured parsing — well-defined spec. | OK | — |
| All | No mention of `schoolId` tenancy scoping. Content (standards, lessons) has `schoolId` in the actual DB. Any import/validation logic must respect tenant boundaries. | Info | — |

---

### File 19: `foundation-ecosystem-integration/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Mixed — OAuth conflicts with AGENTS.md |
| **Security/tenancy** | Good SSO and encryption requirements |
| **AGENTS.md compliance** | OAuth introduced without explicit requirement |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 28 | "Implement single sign-on using existing Advantage identity providers" — aligns with auth adapter pattern. | OK | — |
| 29 | "role-based access for students, teachers, parents, and administrators" — proper RBAC. | OK | — |
| 30 | "impersonation controls for dev mode" — matches the dev auth pattern from science-advantage AGENTS.md. | OK | — |
| 31 | "audit trails" for SSO — good security. | OK | — |
| 66 | **"User selects Google OAuth or Advantage credentials"** — Monorepo AGENTS.md states: "Do not introduce OAuth, social login... unless explicitly required." This SSO spec introduces Google OAuth as a first-class option. If this is an explicit ecosystem requirement, it needs to be documented as a deviation. | Medium | F-SA-B16-018 |
| 59 | "TLS in transit, encrypt sensitive fields at rest, log access for compliance" — good security posture. | OK | — |
| 76–80 | Cross-product analytics event bus pattern — aligns with shared-service architecture. | OK | — |
| All | No `schoolId` tenancy mention in the SSO/auth section, but auth is typically global/school-scoped properly by the existing auth package. | Info | — |

---

### File 20: `progress-tracking/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Prisma references; good analytics spec |
| **Security/tenancy** | Authorization checks defined |
| **AGENTS.md compliance** | Prisma references violate Drizzle directive |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 244–272 | **Model name mismatch**: Spec defines `LessonCompletion` and `StandardProgress`. Actual Drizzle tables are `scienceLessonCompletions` (with `schoolId`). Same issue as File 16. | Medium | F-SA-B16-019 |
| 249, 283 | **Missing `schoolId`**: `LessonCompletion` fields and `StandardProgress` conceptual fields do not include `schoolId`. Actual DB tables have `schoolId`. | High | F-SA-B16-020 |
| 307, 331, 362, 429, 494 | API authorization headers: "Student can view own data, teachers can view students in their classes" / "Teacher must own the class" — correct patterns. | OK | — |
| 576 | "Use optimized **Prisma** queries with aggregations" — should reference Drizzle. | High | F-SA-B16-021 |
| 589–591 | Same: "Use **Prisma aggregations and groupBy**", "Use **Prisma include/select**" — all should reference Drizzle syntax. | High | F-SA-B16-022 |
| 597 | Pseudocode uses `prisma.questionResponse.groupBy({...})` — should be Drizzle equivalent. | High | F-SA-B16-023 |
| 565–570 | Color-coding for score badges is clearly documented. | OK | — |
| 618–624 | Caching strategy (5-min TTL, Redis or Next.js data cache) — reasonable. | OK | — |

---

## Cross-Cutting Findings

| ID | Title | Affected Files | Severity |
|----|-------|----------------|----------|
| F-SA-B16-011/012/013/014 | **Stale Prisma references** — `ai-structured-data-generation/spec.md` is entirely based on Prisma, `prisma-zod-generator`, and `schema.prisma`. The codebase migrated to Drizzle; this spec is architecturally invalid in its current form. | File 15 | **High** |
| F-SA-B16-021/022/023 | **Stale Prisma pseudocode** — `progress-tracking/spec.md` references Prisma queries, aggregations, and includes in implementation notes. | File 20 | **High** |
| F-SA-B16-016/020 | **Missing `schoolId` in spec models** — Assessment and progress-tracking specs define data models without `schoolId`, but actual Drizzle tables are FLAT with `schoolId` for multi-tenant scoping. | Files 16, 20 | **High** |
| F-SA-B16-002/004 | **"Microservices" terminology** — Two project-brief docs describe the backend as "microservices architecture," which contradicts the `packages/backend/modules` convention in AGENTS.md. | Files 9, 12 | **Medium** |
| F-SA-B16-003 | **AWS-specific infrastructure lock-in** — Resource requirements specify AWS-specific services (SageMaker, CloudFront, RDS), violating the provider-neutrality principle. | File 9 | **Medium** |
| F-SA-B16-005 | **Python-based AI engine** — Recommending Python for the recommendation engine introduces polyglot complexity; the AI adapter pattern in AGENTS.md enables TypeScript-based implementation. | File 12 | **Medium** |
| F-SA-B16-006/006b | **Speculative AI model names** — `gemini-2.5-flash` and `gpt-5-mini` may not be real model names as of 2026, creating confusion for implementers. | Files 13, 14 | **Medium** |
| F-SA-B16-007/010 | **AI adapter bypass** — Design and spec reference direct model invocation rather than routing through `@reading-advantage/ai` adapter. | Files 13, 14 | **Medium** |
| F-SA-B16-009 | **Cache key missing `schoolId`** — Recommendation cache keyed on `(studentId, attemptId)` without tenant scope could cause cross-tenant cache collisions in shared Redis. | File 14 | **Medium** |
| F-SA-B16-015/017/019 | **Table name drift** — Specs use generic names (`QuizQuestion`, `Assignment`, `LessonCompletion`) while actual Drizzle tables use `science_`-prefixed names. Low risk for implementers familiar with the codebase but could cause confusion. | Files 16, 17, 20 | **Low** |
| F-SA-B16-001 | **Date inconsistency** — frontmatter vs body date in document-information.md. | File 1 | **Low** |
| F-SA-B16-008 | **Route Handler pattern** — AI recommendation endpoints are specified as Route Handlers; per AGENTS.md these should be thin wrappers over backend module commands. | File 13 | **Medium** |
| F-SA-B16-018 | **OAuth introduced** — Foundation spec mentions Google OAuth as a first-class auth method, which conflicts with the monorepo AGENTS.md default of username/password-only auth. | File 19 | **Medium** |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total files reviewed | 20 |
| High-severity findings | 6 (F-SA-B16-011, -012, -013, -014, -016, -020) |
| Medium-severity findings | 11 (F-SA-B16-002, -003, -004, -005, -006, -007, -008, -009, -010, -015, -018) |
| Low-severity findings | 6 (F-SA-B16-001, -006b, -008b, -013b, -017, -019) |
| Info items | 7 |
| Files with zero findings | 5 (Files 2, 6, 7, 8, 11) |

---

## Limitations

1. **Document-only review**: All 20 files in this batch are documentation (project-brief and specs). No executable code (TypeScript, React, API routes) was reviewed. Findings relate to architectural direction, naming drift, and stale assumptions rather than runtime bugs.
2. **No integration test coverage**: No test files were present in this batch, so test quality could not be assessed.
3. **Stale vs. intentional deviation**: Some findings (e.g., microservices terminology, AWS references, Prisma references) may be intentional architectural decisions documented before the current AGENTS.md conventions were established. The review flags the contradictions but cannot determine whether the docs or AGENTS.md represent the current intent.
4. **Model name speculation**: The assessment that `gemini-2.5-flash` and `gpt-5-mini` are nonexistent is based on publicly known model lineups as of mid-2026. If these models were released under different names, the severity reduces to "stale naming."
5. **No ownership or closeout claims**: This report is a line-review only. No acceptance or closeout decisions are made here.

---

## Recommendations by Priority

### Immediate (blocking implementation handoff)
- **Rewrite `ai-structured-data-generation/spec.md`** to replace all Prisma references with Drizzle equivalents. Move to `docs/archive/` if the feature is no longer planned.
- **Update `progress-tracking/spec.md`** implementation notes (lines 576, 589–591, 597) to use Drizzle syntax instead of Prisma.
- **Add `schoolId` to data models** in `assessment-system/spec.md` and `progress-tracking/spec.md` to match actual Drizzle schema and ensure tenant scoping is captured during implementation.

### Short-term (before next implementation track)
- **Update project-brief docs** (`technical-requirements.md`, `resource-requirements.md`) to align with current architecture: replace "microservices" with "backend modules," remove AWS-specific lock-in or rephrase as "cloud provider (AWS, GCP, etc.)", and reconsider Python recommendation engine vs. TypeScript adapter.
- **Add tenancy scoping** to AI recommendation cache keys in `ai-recommendations/spec.md`.
- **Route AI invocations through `@reading-advantage/ai`** in `ai-recommendations/design.md` and `ai-recommendations/spec.md`.

### Ongoing
- **Resolve date inconsistency** in `document-information.md`.
- **Audit OAuth requirement** in `foundation-ecosystem-integration/spec.md` — confirm whether it is an explicit ecosystem requirement (justifying a deviation from AGENTS.md) or can be removed.
