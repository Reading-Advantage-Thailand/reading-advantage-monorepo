# Line Review: sa-batch-15

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-15 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns

---

## Files Reviewed

1. `apps/science-advantage/docs/content-templates/primary/assessment-template.md`
2. `apps/science-advantage/docs/content-templates/primary/lab-template.md`
3. `apps/science-advantage/docs/content-templates/primary/lesson-template.md`
4. `apps/science-advantage/docs/issue-template-example.md`
5. `apps/science-advantage/docs/prd/checklist-results-report.md`
6. `apps/science-advantage/docs/prd/epic-1-foundation-ecosystem-integration.md`
7. `apps/science-advantage/docs/prd/epic-2-core-science-curriculum-content-management.md`
8. `apps/science-advantage/docs/prd/epic-3-ai-powered-personalization-cross-subject-learning.md`
9. `apps/science-advantage/docs/prd/epic-4-user-engagement-classroom-management.md`
10. `apps/science-advantage/docs/prd/epic-5-mobile-applications-offline-capabilities.md`
11. `apps/science-advantage/docs/prd/epic-6-analytics-reporting.md`
12. `apps/science-advantage/docs/prd/epic-7-advanced-features-integrations.md`
13. `apps/science-advantage/docs/prd/epic-list.md`
14. `apps/science-advantage/docs/prd/goals-and-background-context.md`
15. `apps/science-advantage/docs/prd/index.md`
16. `apps/science-advantage/docs/prd/next-steps.md`
17. `apps/science-advantage/docs/prd/requirements.md`
18. `apps/science-advantage/docs/prd/technical-assumptions.md`
19. `apps/science-advantage/docs/prd/user-interface-design-goals.md`
20. `apps/science-advantage/docs/project-brief/conclusion.md`

---

## File-by-File Findings

### File 1: `assessment-template.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–102 | Content authoring template for quiz instructions/review topics. Defines the separation between assessment lessons (metadata) and QuizQuestion model (actual questions). Correctly states that questions should not be inlined (L60–63). Entity-relationship diagram at L75–81 accurately describes the data flow. | OK | — |
| 1–6 | Frontmatter with `status: active` — appropriate for an active template. | OK | — |
| 52 | References `QuizQuestion` model "stored separately" and "Issue #92" — references a data model and issue number. This is a reasonable cross-reference for a content template. | OK | — |
| 92–95 | Lists validation checks for content authors — good authoring quality control. | OK | — |

**Verdict**: Clean content template. No security, tenancy, or architectural concerns.

---

### File 2: `lab-template.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–146 | Hands-on lab lesson template with required sections: Introduction, Learning Objectives, Materials, Safety Notes, Procedure, Observations, Conclusion Questions, Summary. Structurally sound. | OK | — |
| 52 | Safety notes format uses `⚠ Warning text` — clear and appropriate for a template. | OK | — |
| 120–146 | Notes for Content Authors with validation rules (L132–136) — good quality control guidance. | OK | — |
| 133–134 | Validation specifies "Materials must follow format" and "Safety notes must use warning emoji" — these are template-level rules, not code-level validation. Reasonable. | OK | — |

**Verdict**: Clean content template. No findings.

---

### File 3: `lesson-template.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–91 | Standard instructional lesson template with sections: Introduction, Main Content, Key Vocabulary (with Thai translations), Reading Passage, Summary. Structurally appropriate. | OK | — |
| 36 | Vocabulary format requires Thai translations (`**Term** (Thai: ไทย) - Definition`) — correctly enforces bilingual content structure. | OK | — |
| 72–84 | Validation checks: 8–12 vocabulary terms, all with Thai translations, reading passage 300–500 words for Grade 3. These are reasonable content authoring guidelines. | OK | — |

**Verdict**: Clean content template. No findings.

---

### File 4: `issue-template-example.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–127 | Example GitHub issue template for a `StandardMastery` data model story. | OK | — |
| 16 | Labels include `area:prisma` — **the codebase migrated from Prisma to Drizzle. Any new issue template should reference Drizzle schema, not Prisma.** | Medium | F-SA-B15-001 |
| 28–38 | Acceptance criteria reference `prisma/schema.prisma` and Prisma-specific field annotations (`@id`, `@default(cuid())`, `@updatedAt`) — **the current codebase uses Drizzle schema definitions in `packages/db/src/schema/`, not Prisma.** | Medium | F-SA-B15-001 |
| 44–48 | Migration steps: `npx prisma format`, `npx prisma db push`, `npx prisma generate` — **these commands do not apply to the current Drizzle-based migration workflow. Drizzle uses `drizzle-kit generate` and `drizzle-kit migrate`.** | Medium | F-SA-B15-001 |
| 58 | "Create test file at `prisma/__tests__/standard-mastery.test.ts`" — **tests should be colocated in `packages/domain/src/__tests__/` or adjacent to the domain function, not in a `prisma/` directory.** | Medium | F-SA-B15-001 |
| 97–99 | Implementation notes reference `prisma/schema.prisma` as file location — should reference `packages/db/src/schema/` or equivalent Drizzle location. | Medium | F-SA-B15-001 |
| 102–118 | Full Prisma `model StandardMastery` schema example — **this should be a Drizzle table definition instead, using `pgTable()`, `uuid()`, `timestamp()`, etc.** | Medium | F-SA-B15-001 |
| 75–76 | Test plan includes `masteryLevel: 1.5` (out of range 0.0–1.0) — the test plan correctly notes "if validation added or document acceptable range." This reveals the schema design at L105 has **no CHECK constraint on `masteryLevel`** — the DB would accept `1.5` without complaint. The test plan flags this gap. | Low | F-SA-B15-002 |
| 14 | References "Epic #118 - AI-Powered Personalization" — the current PRD (epic-3) covers AI personalization. Cross-reference is reasonable. | OK | — |
| 122 | "Blocks #120 (Calculate and Update Student Mastery)" — shows task dependency awareness. | OK | — |

**Verdict**: This template example is the most impactful finding in the batch. It was presumably written during the Prisma era and has not been updated to reflect the Drizzle migration. As a template for new issues, it will lead developers to create Prisma-based schemas and follow Prisma workflows.

---

### File 5: `checklist-results-report.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–12 | Placeholder document with a single sentence: "This section will be populated after executing the PM checklist during the final review process." Minimal content. | OK | — |
| 4 | `status: draft` — correct for a placeholder. | OK | — |

**Verdict**: Trivial placeholder. No findings.

---

### File 6: `epic-1-foundation-ecosystem-integration.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–83 | Epic covering project infrastructure, authentication/SSO, API gateway/service architecture, and data integration. | OK | — |
| 12 | Describes "cross-product functionality and unified user experience across all Advantage products" — aligns with the ecosystem integration goal. | OK | — |
| 45–46, 48 | Story 1.2 describes "Single sign-on integration" with "Role-based access control configured for students, teachers, parents, and administrators" — refers to SSO (line 45) and RBAC (line 48). The monorepo auth model per AGENTS.md is username/password-only with session-based auth. OAuth/SSO is explicitly excluded by default. The RBAC mention is consistent with `@reading-advantage/auth` roles. | Low | F-SA-B15-003 |
| 55–67 | Story 1.3 proposes "microservices architecture with API gateway and service discovery" (line 56). **The monorepo does not use microservices. The established pattern is Route Handlers + backend modules (`packages/domain`) + optional tRPC. Microservices would require separate deploy units, service discovery, inter-service auth, and a dedicated API gateway — none of which exist in the current codebase.** | Medium | F-SA-B15-004 |
| 61 | "API gateway implemented with unified routing, rate limiting, and request/response transformation" — over-engineered for a Next.js monorepo. Rate limiting belongs at the reverse proxy or middleware layer, not a dedicated API gateway service. | Info | — |
| 63 | "Database connection pooling and transaction management established" — these are already handled by Drizzle + Postgres.js/pg-pool in `packages/db`. | Info | — |
| 64 | "Caching layer implemented with Redis for session management" — Redis cache adapter exists in the codebase. This is a reasonable feature. | OK | — |
| 22–23 | Story 1.1 shows `⏳` for CI/CD pipeline and code quality gates — indicates these are still pending. | OK | — |
| 77–78 | Story 1.4 mentions "Real-time data synchronization implemented between Science Advantage and Reading Advantage" — this is a complex cross-product synchronization requirement with significant architectural implications. | Info | — |

**Verdict**: Contains the most significant architectural deviation in the batch — the microservices assumption. Story 1.3 should be revised to align with the Route Handler + backend module pattern.

---

### File 7: `epic-2-core-science-curriculum-content-management.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–92 | Epic covering curriculum framework, interactive lessons, virtual lab, bilingual content, and assessments. | OK | — |
| 22 | "Curriculum framework implemented for Prathom 1-6 and Matthayom 1-6 science standards" — 12 grade levels of Thai curriculum. | OK | — |
| 54–60 | Virtual lab system with physics, chemistry, biology simulation engines — very significant scope, noted as aspirational. | Info | — |
| 70–76 | Bilingual content management with "Language switching functionality" and "Content validation system for linguistic accuracy" — important features for the target market. | OK | — |
| 86–91 | Assessment system with multiple question types and automatic grading — consistent with assessment-template.md (File 1). | OK | — |

**Verdict**: Curriculum-focused epic. Reasonable scope. No architecture or security concerns in this file alone.

---

### File 8: `epic-3-ai-powered-personalization-cross-subject-learning.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–76 | Epic covering AI personalization, recommendation engine, cross-subject learning, and predictive analytics. | OK | — |
| 22–28 | Story 3.1 includes "Profile privacy controls implemented with student and parental consent management" (L28) — addresses a valid privacy/security concern. | OK | — |
| 38–44 | Story 3.2 describes a recommendation engine with collaborative filtering, concept prerequisite mapping, and engagement optimization. **The implementation path for these features is not stated — they should use the AI adapter pattern from `@reading-advantage/ai` (via `ai.generateText()`, `ai.generateObject()`, `ai.embed()`) rather than direct provider SDK calls.** | Low | F-SA-B15-005 |
| 43 | "Collaborative filtering to leverage successful learning patterns from similar students" — this implies student grouping and analytics that would need careful privacy consideration. | Info | — |
| 54–60 | Story 3.3 cross-subject learning integration — aligns with the overarching ecosystem approach. | OK | — |
| 70–76 | Predictive analytics and early intervention — appropriate for an AI-powered education platform. | OK | — |

**Verdict**: Does not reference the AI adapter pattern mandated by AGENTS.md. Otherwise consistent with product goals.

---

### File 9: `epic-4-user-engagement-classroom-management.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–75 | Epic covering teacher dashboard, gamification, parent portal, and collaborative learning. | OK | — |
| 25 | "Bulk student enrollment system implemented with spreadsheet import" — data import feature with potential injection/validation risks, but as a PRD requirement this is appropriate at this level of detail. | OK | — |
| 41 | "Streak and consistency rewards" and "Leaderboard system with privacy controls" (L42) — privacy controls are correctly flagged. | OK | — |
| 54–59 | Parent portal with "secure access" (L54) and "Privacy controls" (L60) — security awareness is present. | OK | — |
| 70–75 | Collaborative features including video conferencing integration and virtual study groups — significant scope. | Info | — |

**Verdict**: Engagement-focused epic. Security/privacy controls are mentioned in relevant places. No architecture concerns.

---

### File 10: `epic-5-mobile-applications-offline-capabilities.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–76 | Epic covering mobile app architecture, touch UI, offline sync, and device-specific features. | OK | — |
| 22 | "React Native project structure implemented with shared codebase for iOS and Android" — proposes React Native. **The monorepo currently has no React Native package or mobile build pipeline. This would require significant new infrastructure including a new `apps/mobile` or `/packages/mobile` package, React Native CLI/Expo setup, native module integration, and a mobile CI/CD pipeline.** | Info | F-SA-B15-006 |
| 26 | "App store deployment pipeline implemented with automated builds" — implies investment in mobile DevOps. | Info | — |
| 54–60 | Offline content access and synchronization — the most technically challenging mobile feature. Conflict resolution (L56), background sync (L59), and offline analytics (L60) are all complex distributed systems problems. | Info | — |
| 70–75 | AR features (L71), sensor integration (L72), GPS-based learning (L73) — these are high-scope features that would require significant platform-specific development. | Info | — |

**Verdict**: Aspirational mobile epic. Realistically, the offline sync feature alone (Story 5.3) represents substantial distributed-systems work. No code-level correctness issues — this is a planning document.

---

### File 11: `epic-6-analytics-reporting.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–76 | Epic covering learning analytics, cross-subject insights, student reporting, and system analytics. | OK | — |
| 25 | "Data export functionality implemented for administrative reporting" — potential data exfiltration concern, but appropriate for an admin feature. | OK | — |
| 38–43 | Cross-subject correlation analytics and "Longitudinal studies tracking student progress across multiple years" — significant data storage and privacy implications. | Info | — |
| 70–76 | System performance monitoring, error tracking, cost optimization analytics — appropriate for system administration. | OK | — |
| 44 | "Predictive modeling implemented for forecasting academic outcomes" — this overlaps with Epic 3's predictive analytics (Story 3.4). | Info | — |

**Verdict**: Analytics-focused epic. No architectural issues. Overlaps slightly with Epic 3 on predictive modeling.

---

### File 12: `epic-7-advanced-features-integrations.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–76 | Epic covering live tutoring, AR/VR, third-party integrations, and international curriculum. | OK | — |
| 26 | "Payment processing integration implemented for tutoring sessions and package purchases" — **payment processing is a highly sensitive feature requiring PCI DSS compliance, secure tokenization, and thorough security review. The PRD does not mention any security or compliance requirements for this.** | Medium | F-SA-B15-007 |
| 22–28 | Live tutoring with video conferencing, scheduling, session recording, and payment processing — this is essentially a separate product (tutoring marketplace) embedded within the platform. | Info | — |
| 54–60 | LMS/SIS integrations (Moodle, Google Classroom, Canvas) — these are reasonable integration targets for a school product. SSO integration at L56 overlaps with Epic 1. | OK | — |
| 70–76 | International curriculum alignment (IB, Cambridge, NGSS) — extends beyond the initial Thai MOE focus from Epic 2. | Info | — |

**Verdict**: High-scope epic covering features that could be separate products. The payment processing requirement (Story 7.1) needs security and compliance elaboration.

---

### File 13: `epic-list.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–18 | One-line summary of all 7 epics. Concise and accurate relative to the full PRD documents. | OK | — |
| 12 | Epic 1 described as "Foundation & Ecosystem Integration" — consistent with epic-1.md. | OK | — |
| 12 | Epic 1 summary references "authentication integration with Advantage ecosystem" — echoes the SSO assumption noted in File 6. | Info | — |

**Verdict**: Minimal, accurate epic summary. No actionable findings.

---

### File 14: `goals-and-background-context.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–30 | Business goals and market context. | OK | — |
| 15 | "Deliver 25% improvement in science scores and 15% improvement in reading comprehension within first semester" — ambitious quantitative targets. These are product goals, not architectural concerns. | OK | — |
| 22 | References "100+ Reading Advantage school partnerships" — provides business context for the ecosystem approach. | OK | — |

**Verdict**: Business strategy document. No code-level concerns.

---

### File 15: `index.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–103 | PRD table of contents. Cross-references all epic documents, requirements, UI goals, and technical assumptions. Well-structured. | OK | — |
| 14–103 | Links use relative paths with anchor references — correct markdown syntax. All referenced files exist in the batch. | OK | — |

**Verdict**: Accurate central index. No findings.

---

### File 16: `next-steps.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–18 | Two prompts: one for UX Expert, one for Architect. Minimal content. | OK | — |
| 18 | Architect prompt: "design the technical architecture for Science Advantage, focusing on microservices integration with the existing Advantage ecosystem" — **same microservices assumption as Epic 1 (F-SA-B15-004). The architect would be instructed to design a microservices architecture that contradicts the monorepo's established Route Handler + backend module pattern.** | Medium | F-SA-B15-004 |

**Verdict**: The Architect prompt propagates the microservices assumption. Should reference backend modules and Route Handlers instead.

---

### File 17: `requirements.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–46 | 15 functional requirements (FR1–FR15) and 15 non-functional requirements (NFR1–NFR15). Solid coverage of the platform's scope. | OK | — |
| 17 | FR4: "seamless single sign-on integration with existing Reading Advantage and Primary Advantage accounts" — same SSO assumption (F-SA-B15-003). | Low | F-SA-B15-003 |
| 37 | NFR6: "end-to-end encryption for all student data and communication" — this is a very strong security requirement. End-to-end encryption (E2EE) implies data is encrypted at rest and in transit such that even the platform provider cannot decrypt it. This has significant architectural implications for search, analytics, AI processing, and data portability. It is unclear whether "end-to-end" is used precisely or colloquially. | Info | — |
| 40 | NFR9: "comprehensive audit logging for all user actions and data access" — aligns with AGENTS.md audit log requirements. | OK | — |
| 41 | NFR10: "WCAG AA accessibility compliance" — aligns with `user-interface-design-goals.md` (File 19). | OK | — |
| 32–34 | NFR1–NFR3: 99.5% uptime, <2s load times, <500ms API responses — standard SLOs for a SaaS product. | OK | — |
| 35 | NFR4: "scale to support 100,000 concurrent users" — this is a significant scalability requirement. | OK | — |
| 43 | NFR13: "real-time data synchronization between all Advantage products within 5 seconds" — this is the strongest latency requirement in the document and would drive the cross-product synchronization architecture. | Info | — |

**Verdict**: Well-structured requirements document. NFR6 (E2EE) would benefit from elaboration on what "end-to-end" means in this context.

---

### File 18: `technical-assumptions.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–37 | Core technical architecture assumptions. | OK | — |
| 18 | "The platform shall implement a microservices architecture within the monorepo" — **this is incompatible with the existing monorepo architecture. Microservices are independently deployable units with their own CI/CD, data stores, and network boundaries. A monorepo with shared packages is the opposite: it prioritizes code sharing, unified builds, and co-deployment.** | Medium | F-SA-B15-004 |
| 29 | "Python-based recommendation engine integrated via REST APIs, leveraging existing Advantage AI platform" — **introducing Python as a second runtime in the monorepo is a significant architecture decision not reflected anywhere in the current codebase. AGENTS.md mandates AI access through internal TypeScript adapters (`ai.generateText()`, `ai.generateObject()`). A Python service would bypass this entirely.** | Medium | F-SA-B15-008 |
| 35 | "OAuth 2.0 and JWT tokens for authentication, building on existing Advantage SSO system" — **the monorepo is migrating FROM JWT/OAuth TO session-based auth via `@reading-advantage/auth`. AGENTS.md states "The implementation must remain replaceable" and current feature work is building session-based auth. This assumption is backward.** | Medium | F-SA-B15-009 |
| 31 | "AWS for consistency with ecosystem" — the monorepo's deployment target is Docker-based container platforms (Cloud Run, Fly.io, Kubernetes). AWS-specific services are not currently part of the infrastructure. | Low | F-SA-B15-010 |
| 27 | "React/Next.js for consistency" — correct and consistent with the codebase. | OK | — |
| 28 | "Node.js with TypeScript for type safety" — correct and consistent. | OK | — |
| 26–36 | Multiple assumptions reference existing Advantage systems — relies on ecosystem integration. | OK | — |
| 22 | "unit tests (70% coverage)" — coverage target is aspirational. The current test suite (per `pnpm turbo run test`) does not have a 70% coverage gate. | Info | — |

**Verdict**: The most architecturally problematic document in the batch. Three medium-severity findings (microservices, Python AI engine, OAuth/JWT) directly contradict established architecture decisions in the monorepo.

---

### File 19: `user-interface-design-goals.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–46 | UI/UX vision, interaction paradigms, core screens, accessibility, branding, and platform targets. | OK | — |
| 36 | "WCAG AA accessibility standards" — clearly stated with specific requirements (screen reader, keyboard nav, contrast, alt text). | OK | — |
| 27 | "Unified Login Dashboard: Single sign-on entry point showing progress across all Advantage subjects" — SSO assumption echoed from other PRD files. | Info | — |
| 42 | "Advantage color palette with science-themed accent colors" — follows the ecosystem branding approach. | OK | — |

**Verdict**: Coherent UI vision document. No findings beyond the cross-cutting SSO assumption.

---

### File 20: `project-brief/conclusion.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–19 | Brief project conclusion with strategic summary and next steps. | OK | — |
| 3 | "leveraging existing ecosystem assets, proven technology platform, and established customer relationships" — aligns with the ecosystem integration strategy. | OK | — |
| 9–13 | Next steps: executive review, team formation, PRD creation, curriculum development, MVP sprint — high-level project planning. | OK | — |

**Verdict**: Clean concluding document. No findings.

---

### Cross-Cutting Findings

In addition to file-specific findings, the following systemic issues span multiple files:

| Finding | Files Involved | Description | Severity | ID |
|---------|---------------|-------------|----------|----|
| **Prisma vs Drizzle** | File 4 (issue-template-example.md) | The sole code-implementation template in the batch references Prisma workflows, schema locations, and commands throughout. The codebase migrated to Drizzle. This template, if used, would lead developers down the wrong path. | Medium | F-SA-B15-001 |
| **Microservices assumption** | Files 6 (epic-1), 16 (next-steps), 18 (technical-assumptions) | Three files reference "microservices architecture" for the platform. The monorepo does not use microservices — it uses shared packages with Route Handlers, backend modules, and optional tRPC. | Medium | F-SA-B15-004 |
| **SSO / OAuth / JWT assumption** | Files 6 (epic-1), 17 (requirements), 18 (technical-assumptions), 19 (UI-goals) | Multiple files assume OAuth 2.0, SSO, and/or JWT-based auth. The monorepo is migrating from JWT/OAuth to session-based auth via `@reading-advantage/auth`. AGENTS.md explicitly excludes OAuth by default. | Low | F-SA-B15-003 |
| **Python AI engine** | File 18 (technical-assumptions) | Proposes a Python-based recommendation engine, which would introduce a second runtime and bypass the TypeScript AI adapter layer mandated by AGENTS.md. | Medium | F-SA-B15-008 |
| **Missing AI adapter pattern** | File 8 (epic-3) | Describes AI features without referencing the internal AI adapter (`ai.generateText()`, etc.). Should specify that AI capabilities go through `@reading-advantage/ai`. | Low | F-SA-B15-005 |
| **Missing multi-tenancy** | Files 6–19 (all PRD docs) | None of the PRD documents mention multi-tenancy or `schoolId` scoping. The monorepo's tenant-registry requires every query to be scoped by `schoolId`. This is a significant omission in the architectural specification. | Medium | F-SA-B15-011 |
| **Payment processing without security requirements** | File 12 (epic-7) | Story 7.1 includes payment processing but mentions no PCI DSS compliance, tokenization, or security requirements. | Medium | F-SA-B15-007 |

---

## Summary of Findings

### Critical (must fix)

None identified in this batch. All files are documentation — no production code.

### Medium

| ID | File | Description |
|----|------|-------------|
| F-SA-B15-001 | `issue-template-example.md` (L16, 28–38, 44–48, 58, 97–99, 102–118) | References Prisma schema, commands, and test locations throughout. The codebase migrated from Prisma to Drizzle. This template will mislead developers into creating Prisma-based implementations. **Should be rewritten to use Drizzle schema definitions (`packages/db/src/schema/`), `drizzle-kit` migration commands, and domain function test patterns.** |
| F-SA-B15-004 | `epic-1.md` (L55–67), `next-steps.md` (L18), `technical-assumptions.md` (L18) | Three documents specify a microservices architecture with API gateway and service discovery. The monorepo uses shared packages (Route Handlers, backend modules, tRPC) — not microservices. This architectural direction would introduce unnecessary complexity and contradicts the existing pattern. |
| F-SA-B15-007 | `epic-7.md` (L26) | Payment processing integration is specified without PCI DSS compliance, tokenization, or security requirements. This is a high-risk feature that needs elaboration on security posture. |
| F-SA-B15-008 | `technical-assumptions.md` (L29) | Proposes a Python-based recommendation engine. This introduces a second runtime, bypasses the TypeScript AI adapter pattern (`ai.generateText()`), and is not supported by the current monorepo infrastructure. |
| F-SA-B15-009 | `technical-assumptions.md` (L35) | States "OAuth 2.0 and JWT tokens for authentication." The monorepo is migrating from JWT/OAuth to session-based auth via `@reading-advantage/auth`. This assumption is backward relative to current architecture. |
| F-SA-B15-010 | `technical-assumptions.md` (L31) | Specifies "AWS for consistency with ecosystem." The monorepo's deployment target is Docker-based container platforms (Cloud Run, Fly.io, Kubernetes). AWS-specific lock-in contradicts the provider-neutrality rule. |
| F-SA-B15-011 | All PRD files (6–19) | No PRD document mentions multi-tenancy or `schoolId` scoping. The monorepo requires every query to be scoped by schoolId through the tenant-registry. This is a critical architectural concern absent from all planning documents. |

### Low

| ID | File | Description |
|----|------|-------------|
| F-SA-B15-002 | `issue-template-example.md` (L75–76) | Test plan reveals that the schema design has no CHECK constraint on `masteryLevel` (0.0–1.0 range). The test documents an attempt to insert `1.5` with the note "if validation added or document acceptable range" — this flags a gap between the acceptance criteria and the schema design. |
| F-SA-B15-003 | `epic-1.md` (L45–46), `requirements.md` (L17), `technical-assumptions.md` (L35), `user-interface-design-goals.md` (L27) | Multiple documents reference SSO/OAuth/JWT authentication. The monorepo auth model is username/password-only with session-based auth per AGENTS.md. OAuth/SSO is explicitly excluded by default. |
| F-SA-B15-005 | `epic-3.md` (L38–44) | AI recommendation engine features are described without any reference to the AI adapter pattern. Should specify using `ai.generateText()`, `ai.generateObject()`, `ai.embed()` from `@reading-advantage/ai`. |
| F-SA-B15-006 | `epic-5.md` (L22) | Proposes React Native without acknowledging the infrastructure investment needed — new mobile package, CI/CD for app stores, native module management. This is an info observation about scope, not an error. |

### Info (non-blocking observations)

| ID | File | Description |
|----|------|-------------|
| — | `technical-assumptions.md` (L22) | 70% unit test coverage target is aspirational — no coverage gate currently exists in CI. |
| — | `requirements.md` (L37) | NFR6 requires "end-to-end encryption for all student data and communication" — this is a very strong requirement with significant architectural implications for search, analytics, and AI processing if "end-to-end" is meant precisely. |
| — | `requirements.md` (L43) | NFR13 requires "real-time data synchronization between all Advantage products within 5 seconds" — the strongest latency requirement, which would drive the cross-product architecture. |
| — | `epic-2.md` (L54–60) | Virtual lab with physics, chemistry, and biology simulation engines — very significant scope. |
| — | `epic-5.md` (L54–60) | Offline sync with conflict resolution — a complex distributed systems problem. |
| — | `epic-7.md` (L22–28) | Live tutoring with video conferencing and payment processing is essentially a separate product. |

---

## Strengths Observed

1. **Content template quality (Files 1–3)**: The assessment, lab, and lesson templates are well-structured with clear required sections, validation checks, and authoring guidance. The separation of assessment metadata from quiz questions is an appropriate architectural boundary.

2. **PRD scope coverage (Files 6–13, 17)**: The 7 epics collectively cover the full breadth of a science education platform — from infrastructure (Epic 1) to advanced features (Epic 7). Functional and non-functional requirements (File 17) are reasonably comprehensive for a planning document.

3. **Accessibility requirement (Files 17, 19)**: WCAG AA compliance is explicitly called out in both `requirements.md` (NFR10) and `user-interface-design-goals.md` (L36) — consistent with AGENTS.md accessibility requirements.

4. **Audit logging (File 17)**: NFR9 requires "comprehensive audit logging for all user actions and data access" — directly aligns with AGENTS.md audit log requirements.

5. **Privacy controls (Files 8, 9)**: Student/parental consent management (Epic 3, L28) and parent portal privacy controls (Epic 4, L60) are flagged in the relevant epics.

6. **Data model continuity (File 4)**: Despite the Prisma→Drizzle migration gap, the `StandardMastery` data model concept (student-standard many-to-many with mastery level and timestamps) is sound and would map cleanly to a Drizzle schema.

7. **Cross-referencing (Files 15, 4)**: The PRD index correctly cross-references all epic documents, and the issue template references the relevant epic (#118) and dependent tasks (#120).

---

## Limitations

- **Documentation-only batch**: All 20 files are documentation (content templates, PRD epics, issue template, project brief). There is zero production code — no components, no route handlers, no domain functions, no tests. Findings are limited to architectural alignment, correctness of technical assumptions, and potential to mislead developers.

- **PRD aspirational scope**: The 7 epics collectively describe a platform that would take years and a large team to build. Many features (virtual lab simulation engines, AR/VR, live tutoring marketplace, React Native mobile apps with offline sync) are aspirational. This review assesses them for architectural consistency with the monorepo, not feasibility.

- **Issue template is an example, not production**: File 4 (`issue-template-example.md`) is documented as "An example of a high-quality GitHub issue template." Its Prisma references may have been intentionally illustrative at the time it was written. However, as a living template for new issues, it needs updating.

- **No multi-tenancy in scope**: The PRD documents do not mention multi-tenancy or schoolId scoping (F-SA-B15-011). It is possible this was intentionally deferred to the technical architecture phase, but given its criticality in the existing monorepo, the omission is notable.

- **Auth architecture uncertainty**: The conflict between PRD assumptions (OAuth/SSO/JWT) and current migration direction (session-based auth) may reflect a genuine architectural decision that has not been resolved. The PRD may represent the stakeholder-desired auth model, while the monorepo is moving in a different direction.

- **No test files**: Unlike prior batches (e.g., batch-05 which included 6 integration test files), this batch has zero test files. Test quality could not be assessed.

---

## Batch-Level Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 20/20 |
| Content template files | 3 (files 1–3) |
| Issue template files | 1 (file 4) |
| PRD epic files | 8 (files 6–13) |
| PRD support files | 5 (files 5, 14–17) |
| Technical assumptions file | 1 (file 18) |
| UI/UX file | 1 (file 19) |
| Project brief file | 1 (file 20) |
| Test files | 0 |
| Production code files | 0 |
| Critical findings | 0 |
| Medium findings | 7 (F-SA-B15-001, F-SA-B15-004, F-SA-B15-007, F-SA-B15-008, F-SA-B15-009, F-SA-B15-010, F-SA-B15-011) |
| Low findings | 4 (F-SA-B15-002, F-SA-B15-003, F-SA-B15-005, F-SA-B15-006) |
| Info observations | 7 |
| Total findings | 11 |

---

*End of batch report. No acceptance or closeout claims are made in this document.*
