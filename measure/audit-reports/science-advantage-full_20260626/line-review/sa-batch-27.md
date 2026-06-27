# Line Review: sa-batch-27

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-27 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns
- **File types**: Archival Measure documentation (specs, plans, metadata, product docs, workflow templates) — no app code

---

## Files Reviewed

1. `apps/science-advantage/measure/archive/quiz_system_20260114/plan.md`
2. `apps/science-advantage/measure/archive/quiz_system_20260114/spec.md`
3. `apps/science-advantage/measure/archive/replan_20260311/README.md`
4. `apps/science-advantage/measure/archive/replan_20260311/root/autonomous_prompt.md`
5. `apps/science-advantage/measure/archive/replan_20260311/root/product-guidelines.md`
6. `apps/science-advantage/measure/archive/replan_20260311/root/product.md`
7. `apps/science-advantage/measure/archive/replan_20260311/root/setup_state.json`
8. `apps/science-advantage/measure/archive/replan_20260311/root/tech-stack.md`
9. `apps/science-advantage/measure/archive/replan_20260311/root/tracks.md`
10. `apps/science-advantage/measure/archive/replan_20260311/root/workflow.md`
11. `apps/science-advantage/measure/archive/replan_20260311/tracks/auth_centralization_20260206/metadata.json`
12. `apps/science-advantage/measure/archive/replan_20260311/tracks/auth_centralization_20260206/plan.md`
13. `apps/science-advantage/measure/archive/replan_20260311/tracks/auth_centralization_20260206/spec.md`
14. `apps/science-advantage/measure/archive/replan_20260311/tracks/data_safety_20260206/metadata.json`
15. `apps/science-advantage/measure/archive/replan_20260311/tracks/data_safety_20260206/plan.md`
16. `apps/science-advantage/measure/archive/replan_20260311/tracks/data_safety_20260206/spec.md`
17. `apps/science-advantage/measure/archive/student_engagement_loop_20260428/index.md`
18. `apps/science-advantage/measure/archive/student_engagement_loop_20260428/metadata.json`
19. `apps/science-advantage/measure/archive/student_engagement_loop_20260428/plan.md`
20. `apps/science-advantage/measure/archive/student_engagement_loop_20260428/spec.md`

**Character note:** All 20 files are archival Measure documentation (specs, plans, product docs, workflow templates, metadata). None contain production code, tests, or runtime logic. Findings below address the quality, completeness, and alignment of these specifications, with particular attention to what they reveal about the intended system design.

---

## File-by-File Findings

### File 1: `quiz_system_20260114/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — plan format matches Measure conventions |
| **Security/tenancy** | Gap — no mention of authorization, tenancy, or schoolId scoping for quiz data |
| **AGENTS.md compliance** | OK (archival plan, no code) |
| **Spec quality** | Acceptable for an archived track plan |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3, 9, 15 | Phase headings include checkpoint SHAs (`5a57f1b`, `a36ac71`, `3c8f1f8`). These commit hashes cannot be verified from the archive — they reference commits that may exist in git history but are not present in the file. Acceptable for archival format. | Info | — |
| 4–7 | Phase 1 tasks reference "Analyze current Quiz API and UI implementation" and "fix the Quiz route integration bug (#135)". No reference to a `@reading-advantage/domain` backend module — the quiz logic appears app-local rather than extracted to the shared package. This is consistent with the pre-March 2026 architecture assumption (before the monorepo push to centralize business logic). | Info | F-SA-B27-001 |
| All | No task-level time estimates or dependencies. All tasks are marked `[x]` (completed). The plan is a retrospective record, not a forward-planning artifact — acceptable given its archival nature. | OK | — |

---

### File 2: `quiz_system_20260114/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | Gap — no authorization model, no schoolId scoping |
| **AGENTS.md compliance** | OK (archival spec) |
| **Spec quality** | Adequate for a small feature track |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 13–15 | API requirements: `GET /api/student/quiz/:lessonId` and `POST /api/student/quiz/:lessonId/submit`. No authorization check specified — any authenticated student can read/ submit any lesson's quiz. No mention of verifying the student is enrolled in a class that includes that lesson. No schoolId tenant scoping on the quiz data access. | **High** | F-SA-B27-002 |
| 13–15 | No input validation contract specified for quiz submission. No Zod schema for the submission payload, no mention of validation at the boundary. The monorepo AGENTS.md requires Zod validation at every external boundary. | Medium | F-SA-B27-003 |
| 12–20 | Requirements section has no "Non-Functional Requirements" heading. No mention of test coverage targets, latency, or error handling behavior beyond "Error handling for network issues" (line 20). | Medium | F-SA-B27-004 |
| 22–25 | References section links three issues (#135, #93, #94). No link to a shared backend module or contract file. | Info | — |
| All | No mention of multi-tenancy or schoolId anywhere in the spec. Quiz questions may be shared across tenants, but student answers and scores must be tenant-scoped. This was a gap at the spec level. | **High** | F-SA-B27-005 |

---

### File 3: `replan_20260311/README.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (archival documentation) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Good — clear rationale for archival |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–19 | Clearly explains why the pre-replan state was archived: root docs didn't reflect live repo, tracks were infrastructure-heavy cleanup, autonomous_prompt.md referenced another product. Good archival documentation practice. | OK | — |
| 11–12 | "autonomous_prompt.md referenced another product entirely" — this is the SubLink reference (see File 4). The README correctly flags it as a reason for archival. | OK | — |
| All | No issues — this is a well-written archival note. | OK | — |

---

### File 4: `replan_20260311/root/autonomous_prompt.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Wrong product context — refers to "SubLink", not Science Advantage |
| **Security/tenancy** | N/A (archival prompt) |
| **AGENTS.md compliance** | N/A (archival, flagged as out-of-date) |
| **Spec quality** | N/A — operational prompt, not a spec |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | "Define a new high-value feature or improvement for **SubLink**" — this prompt was copied from another project (SubLink) and never adapted for Science Advantage. The README (File 3) explicitly mentions this as a reason for archival. No action needed, but confirms the archival was justified. | Info | — |
| 5 | "All shell commands MUST use non-interactive flags" — operational instruction for unattended AI runs. Not relevant to app code quality. | Info | — |
| 7 | "first new track of any calendar day should be a refactor / cleanup track" — heuristic that doesn't align with Measure's spec-driven priority system. Could force unnecessary refactor work on days when feature delivery is more important. | Info | F-SA-B27-006 |
| All | This file was correctly archived. It should not be used as a reference for future Science Advantage work. | OK | — |

---

### File 5: `replan_20260311/root/product-guidelines.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — well-written product guidelines |
| **Security/tenancy** | N/A (product guidelines) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Good — clear, values-driven |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–17 | Covers tone, visual identity, brand messaging, multilingual support. "Seamless L1 Scaffolding" (line 16) and "Guardrailed AI Assistant" (line 18) are good strategic positioning statements. | OK | — |
| 14 | "Empowerment through Data" — mentions "tools necessary to make data-driven decisions" but doesn't specify privacy safeguards for student data. Acceptable at the product-guidelines level but the architectural counterpart (data isolation per tenant) is essential. | Info | — |
| All | No issues found — well-written product guidance that could be used as-is. | OK | — |

---

### File 6: `replan_20260311/root/product.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (product vision) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Good — clear product vision |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 6 | "K-12 science learning platform designed to bridge the gap in English-based science education across East and Southeast Asia" — clear market focus. | OK | — |
| 9–11 | Target users: Students, Teachers, Administrators. Three-tier model is well-defined. | OK | — |
| 15–16 | "Data-Driven Intervention" and "Automated intervention alerts" — implies real-time data processing which has architectural implications (workers, queuing). Not addressed in this document (and doesn't need to be at the product vision level). | Info | — |
| All | Well-written product vision. No technical issues to flag. | OK | — |

---

### File 7: `replan_20260311/root/setup_state.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — minimal state tracking |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Minimal but functional |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `{"last_successful_step": "3.3_initial_track_generated"}` — single field indicating Measure setup progress. The `3.3` versioning suggests this is a point-in-time snapshot from a multi-step initial setup wizard. | OK | — |
| All | Minimal artifact. Appropriate for its purpose. No issues. | OK | — |

---

### File 8: `replan_20260311/root/tech-stack.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | **Outdated** — documents a technology stack that no longer matches the project |
| **Security/tenancy** | References NextAuth/Google OAuth which conflicts with the monorepo's username/password-only auth model |
| **AGENTS.md compliance** | **Critical violations** — conflicts with both monorepo and science-advantage AGENTS.md |
| **Spec quality** | Well-formatted but architecturally stale |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 11 | "**ORM:** Prisma (v6.17) for schema management and type-safe database access." — **Direct conflict with current architecture**. The monorepo AGENTS.md states "Drizzle is the source of truth" and science-advantage AGENTS.md states "Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root." This tech-stack.md was never updated after the Prisma→Drizzle migration. | **Critical** | F-SA-B27-007 |
| 12 | "**Validation:** Zod for runtime schema validation, with `prisma-zod-generator` automatically creating schemas from Prisma models." — `prisma-zod-generator` is a Prisma-specific tool. The current codebase uses Drizzle and hand-rolled or domain-package Zod schemas. | **Critical** | F-SA-B27-008 |
| 21 | "**Authentication:** NextAuth.js (Auth.js) with Google OAuth, integrating with the broader Advantage SSO ecosystem." — **Direct conflict with current architecture**. The monorepo AGENTS.md specifies "username/password-only via shared `@reading-advantage/auth`" and science-advantage AGENTS.md repeats "Authentication is username/password-only via shared `@reading-advantage/auth`." NextAuth.js with Google OAuth is not the current approach. | **Critical** | F-SA-B27-009 |
| 13 | "**Caching:** Redis (planned/configured)" — Redis is referenced as planned infrastructure but the actual `redis-client.ts` (see batch-23, F-SA-B23-016) has stubbed implementations that never connect to Redis. The tech-stack overstates the implementation maturity. | Medium | F-SA-B27-010 |
| 4 | "**Programming Language:** TypeScript (v5.8+)" — references a specific TypeScript version. The current monorepo likely uses a different pinned version. Minor. | Info | — |
| 22 | "Integrating with the broader Advantage SSO ecosystem" — no such SSO ecosystem is documented in the monorepo. The monorepo auth is minimal first-party username/password. | **High** | F-SA-B27-011 |
| All | This file is **known to be outdated** (it was archived during the replan). The archive README (File 3) explains it "did not reflect the live repository." However, the severity of the Prisma/Drizzle and NextAuth/auth-adapter conflicts is high enough to flag. **Future track specs must not reference this document as an authority.** | **Critical** | F-SA-B27-012 |

---

### File 9: `replan_20260311/root/tracks.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (track listing) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Minimal but functional |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 10 | Link to `./measure/archive/quiz_system_20260114/` references the correct archival location. | OK | — |
| 11 | Link to `./measure/tracks/auth_centralization_20260206/` — this is a **broken relative path**. The file is in `measure/archive/replan_20260311/tracks/`, so the relative link `./measure/tracks/...` would not resolve from the file's location at `measure/archive/replan_20260311/root/tracks.md`. The correct relative path should be `../tracks/auth_centralization_20260206/`. | Medium | F-SA-B27-013 |
| 13 | Same broken path for `data_safety_20260206`. | Medium | — |
| All | Simple track listing. The broken relative links are minor since this is an archived file, but they indicate the file was not validated after archival relocation. | Medium | F-SA-B27-014 |

---

### File 10: `replan_20260311/root/workflow.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — comprehensive workflow template |
| **Security/tenancy** | N/A (workflow template) |
| **AGENTS.md compliance** | OK — follows Measure conventions |
| **Spec quality** | Very detailed; some project-specific gaps |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 35 | Python example: `pytest --cov=app --cov-report=html` in step 6 (Verify Coverage). This is a TypeScript/Node.js project — the example should reference `vitest --coverage` or `nyc`. A TypeScript project template should use TypeScript-appropriate tooling examples. | Low | F-SA-B27-015 |
| 141–149 | Quality gates checklist uses `- [ ]` (unchecked) format. This is a template artifact — the checklist is intended to be checked during task completion but all items render as unchecked, making it look like requirements are never met. Should use `- [ ]` template items with instructions to check them, or pre-check those that are always verified. | Info | — |
| 156–160 | Setup commands are placeholder examples (`npm install`, `go mod tidy`). Should be adapted to the project's actual commands (`pnpm install`, Drizzle migrations). The file explicitly says "AI AGENT INSTRUCTION: This section should be adapted" at line 153. | Info | — |
| 176–195 | Testing Requirements section mixes generic guidelines with no TypeScript-specific tooling references. The "Mobile Testing" section (lines 190–196) references iPhone/Safari testing which is not relevant to this project's testing strategy. | Low | — |
| 302–325 | Deployment section references a generic "deployment service" — no concrete provider or procedure. Acceptable for a template, but the project now uses GCP Cloud Run (per gcp-cloud-run-monorepo-deploy skill). | Info | — |
| All | This is a generic Measure workflow template that was not customized for Science Advantage. Many sections (commands, tooling, deployment) are placeholders. The file explicitly permits this with line 153. | Info | — |

---

### File 11: `auth_centralization_20260206/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (metadata) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Well-formed |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–8 | Track ID `auth_centralization_20260206`, type `chore`, status `new`. Created and updated timestamps are both `2026-02-06T11:30:00Z`, indicating the metadata was never modified after creation. The track was never started. | OK | — |
| 7 | Description: "Centralize scattered authorization logic with withAuth wrapper and standardized API responses" — clear and concise. | OK | — |
| All | Well-formed metadata. No issues. | OK | — |

---

### File 12: `auth_centralization_20260206/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Well-structured plan with clear TDD pattern |
| **Security/tenancy** | Gaps — no tenant scoping or role-based access for AI endpoints |
| **AGENTS.md compliance** | **Conflict** — references Prisma, not Drizzle; references app-local auth, not shared package |
| **Spec quality** | High — thorough task decomposition with test-first steps |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7 | "Write unit tests for `withAuth`: returns 401 when no session, passes session to handler when valid" — correct test specification. | OK | — |
| 8 | "returns 403 when role insufficient" — correct. | OK | — |
| 8 | "Create `lib/auth/api.ts` with `withAuth(handler, options?)` implementation" — proposes creating auth wrappers in the app's `lib/auth/` directory. The monorepo AGENTS.md specifies that auth should go through the shared `@reading-advantage/auth` package, not be reimplemented per-app. This plan predates the monorepo standardization push. | **High** | F-SA-B27-016 |
| 63, 64 | AI routes `/api/ai/update-mastery` and `/api/ai/recommendations` are checked only with `withAuth` (not role-gated). These are sensitive operations — AI mastery updates and LLM recommendations should require at minimum a TEACHER role. `withAuth` alone allows any authenticated user (including students) to trigger AI processing, which could lead to abuse or data pollution. | **High** | F-SA-B27-017 |
| 87 | "Add `@@index([userId])` to `account` model in `prisma/schema.prisma`" — **Prisma reference**. The current codebase uses Drizzle. Indexes would need to be added via Drizzle schema files in `packages/db/`. | **Critical** | F-SA-B27-018 |
| 88 | Same Prisma issue for providerId index. | **Critical** | — |
| 90 | "Run `npx prisma generate`" — Prisma command. Current workflow uses `drizzle-kit generate` and `drizzle-kit migrate`. | **Critical** | F-SA-B27-019 |
| 38, 39 | `/api/classes` POST uses `withRole('TEACHER')` — correct role check. However, there is no mention of verifying the teacher belongs to the same schoolId as the class being created. A teacher from School A could potentially create classes for School B if the role check passes but tenant isolation is missing. | **High** | F-SA-B27-020 |
| 41 | `/api/classes/join` POST uses `withRole('STUDENT')` — correct. But no tenant-scoped enrollment check (student must belong to the same school as the class). | **High** | F-SA-B27-021 |
| 7 | "withAuth higher-order function" — no input validation contract (Zod) specified for the wrapper's own configuration. The monorepo AGENTS.md requires every backend function to define input/output schemas. | Medium | F-SA-B27-022 |
| All | Plan assumes all api route files exist at the listed paths. If any files were removed or restructured during the Prisma→Drizzle migration, the plan would need path updates. | Info | — |

---

### File 13: `auth_centralization_20260206/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Well-structured spec with numbered functional requirements |
| **Security/tenancy** | Gaps — no tenant scoping, no schoolId verification |
| **AGENTS.md compliance** | **Conflict** — Prisma references, app-local auth wrappers |
| **Spec quality** | High — thorough FRs, clear acceptance criteria |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3 | "Eliminate scattered, duplicated authorization logic across 18+ API routes" — correct problem statement. | OK | — |
| 8–14 | FR-1: `withAuth` wrapper specification — session retrieval, null-session 401, role check 403. Well-defined. | OK | — |
| 39–43 | FR-4: Session validation in proxy.ts — currently checks cookie existence only; proposes DB-backed validation. Correct analysis. | OK | — |
| 51–53 | FR-6: Consolidate role constants — single source of truth for ROLE_HIERARCHY and ROLE_ROUTES. Good architectural goal. | OK | — |
| 55–57 | FR-7: Add missing account model indexes — references Prisma schema. Same CRITICAL issue as File 12. | **Critical** | F-SA-B27-023 |
| 66 | "No API route directly calls `getCurrentSession()`" — good acceptance criterion for centralization. | OK | — |
| 72–75 | Out of Scope section properly excludes CSRF, 2FA, Redis cache, schema changes. Good boundary management. | OK | — |
| All | No mention of tenant isolation (schoolId) in any FR or acceptance criterion. The entire spec focuses on authentication (who is the user) without addressing authorization (is this user allowed to access this tenant's data). | **High** | F-SA-B27-024 |

---

### File 14: `data_safety_20260206/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (metadata) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Well-formed |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–8 | Track ID `data_safety_20260206`, type `chore`, status `new`. Created/updated both `2026-02-06T11:30:00Z`. Track was never started. | OK | — |
| 7 | Description: "Implement soft deletes, session cleanup, Redis-backed caching, and data safety improvements" — clear scope summary. | OK | — |
| All | Well-formed metadata. No issues. | OK | — |

---

### File 15: `data_safety_20260206/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Well-structured plan with clear TDD-first approach |
| **Security/tenancy** | Good session cleanup patterns; audit logging gap |
| **AGENTS.md compliance** | **Conflict** — Prisma references throughout |
| **Spec quality** | High — thorough 4-phase decomposition |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7 | "Add `deletedAt DateTime?` to `user`, `Class`, `Attempt`, `LessonCompletion`, `StandardMastery` in `prisma/schema.prisma`" — **Prisma reference**. These models would need to be modified in Drizzle schema files (`packages/db/src/schema/`). | **Critical** | F-SA-B27-025 |
| 12, 23 | All references to `prisma/schema.prisma`, `npx prisma generate`, Prisma query extensions. Entire plan is written for Prisma. | **Critical** | F-SA-B27-026 |
| 13 | "Create `lib/prisma-extensions.ts` with Prisma client extension" — the current architecture uses Drizzle, not Prisma. Soft-delete filtering would need to be implemented as Drizzle query filters or SQL middleware, not Prisma extensions. | **Critical** | F-SA-B27-027 |
| 37 | `/api/admin/cleanup-sessions` uses SYSTEM role check — correct access control. But no mention of **audit logging** for this operation. AGENTS.md requires "Security-sensitive actions should create audit events." An admin-triggered session cleanup deleting records is a security-sensitive action. | Medium | F-SA-B27-028 |
| 52 | References both `ioredis` and `@upstash/redis` as options without choosing one. Spec should commit to a single Redis client library. The actual `redis-client.ts` (batch-23, F-SA-B23-016) stubs both and uses neither. | Medium | F-SA-B27-029 |
| 53 | `REDIS_URL` env var in `lib/env.ts` — references a `lib/env.ts` file that may not exist in the current Drizzle-based architecture. Good concept (Zod-validated env vars per AGENTS.md), but the file path assumption should be verified. | Info | — |
| 81–83 | Zod schema creation for JSON fields (`options`, `correctAnswer`, `studentAnswer`) — good pattern. Aligns with AGENTS.md requirement for Zod validation at all external boundaries. | OK | — |
| 94 | "Decision on `ipAddress`/`userAgent`" — explicitly flags a design decision that needs resolution. Good practice for a spec. | OK | — |
| All | Despite the Prisma conflict, the conceptual design (soft deletes, session sliding window, Redis caching, JSON validation) is architecturally sound and would translate well to Drizzle if re-specified. | Info | — |

---

### File 16: `data_safety_20260206/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Well-structured spec with clear FR boundaries |
| **Security/tenancy** | Good session and data safety concerns; missing multi-tenant data isolation |
| **AGENTS.md compliance** | **Conflict** — Prisma assumptions |
| **Spec quality** | High — thorough, well-organized |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8–14 | FR-1: Soft deletes for `user`, `Class`, `Attempt`, `LessonCompletion`, `StandardMastery`. The choice of models is sensible — these are the core data entities where accidental deletion would be damaging. | OK | — |
| 9 | "Add Prisma middleware or query extension" — Prisma-specific implementation. Current architecture would use Drizzle's `where` middleware or a tenant-aware query builder. | **Critical** | F-SA-B27-030 |
| 13 | "Keep `onDelete: Cascade` for truly ephemeral data: `session`, `account`, `MasteryRun`, `QuestionResponse`" — correct architectural judgment. Sessions and question responses are safe to cascade-delete. | OK | — |
| 15–18 | FR-2: Expired session cleanup with SYSTEM-role-protected admin endpoint. Well-specified. | OK | — |
| 20–24 | FR-3: Redis-backed rate limiting with fail-open fallback. Good pattern — graceful degradation is the correct choice for rate limiting. | OK | — |
| 31–34 | FR-5: Session sliding window — extend `expiresAt` when less than half the session duration remains. Correct design, avoids unnecessary writes on every request. | OK | — |
| 36–39 | FR-6: JSON schema validation with Zod — directly aligns with AGENTS.md requirements. Good. | OK | — |
| 45–49 | Non-functional requirements include backwards-compatible migrations, graceful Redis failure, safe concurrent execution. Well-considered. | OK | — |
| All | Spec does not mention multi-tenancy. Soft-deleted records from one school should not leak to another school. Session cleanup should only affect sessions for the caller's schoolId (or be SYSTEM-wide with appropriate logging). | Medium | F-SA-B27-031 |

---

### File 17: `student_engagement_loop_20260428/index.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (navigation index) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Minimal — just links to other files |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–5 | Simple index file linking to spec.md, plan.md, metadata.json. Functional but doesn't include a one-line summary of the track. While not required, a brief description would help readers scanning the archive. | Info | — |
| All | Minimal but functional index file. No substantive issues. | OK | — |

---

### File 18: `student_engagement_loop_20260428/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (metadata) |
| **AGENTS.md compliance** | OK |
| **Spec quality** | Well-formed |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–11 | Track ID `student_engagement_loop_20260428`, type `feature`, status `new`. Created `2026-04-28T00:00:00Z`. Has `estimated_tasks: 19` with `actual_tasks: null` — track was not completed. `deviation_notes: ""` (empty). | OK | — |
| 10 | `estimated_tasks: 19` — provides an effort estimate, which is useful metadata that the other tracks' metadata.json files lack. | OK | — |
| All | Well-formed metadata. No issues. | OK | — |

---

### File 19: `student_engagement_loop_20260428/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Many tasks marked [x] — significant completion achieved |
| **Security/tenancy** | Gaps — no authorization or tenant scoping for gamification data |
| **AGENTS.md compliance** | **Conflict** — references Prisma schema |
| **Spec quality** | High — thorough TDD decomposition |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7 | "Add `GamificationProfile` model to **Prisma schema**" — **Prisma reference**. The current codebase uses Drizzle. New models for gamification would need to be added via Drizzle schema in `packages/db/src/schema/`. | **Critical** | F-SA-B27-032 |
| 8 | "Add `Achievement` model" — same Prisma issue. | **Critical** | — |
| 9 | "Run migration and verify schema" — Drizzle uses `drizzle-kit generate` + `drizzle-kit migrate`, not Prisma. | **Critical** | — |
| 7 | "GamificationProfile model (userId, xp, level, streak, lastActiveAt)" — good column design. However, **no schoolId column** is specified. Gamification profile data must be tenant-scoped. A student from School A should not have their XP data visible in School B's context. | **High** | F-SA-B27-033 |
| 8 | "Achievement model (userId, badgeType, unlockedAt)" — same schoolId gap. | **High** | — |
| 25–28 | Badge rules with 10 badge types and thematic names. Well-defined. Line 28 explicitly notes "BILINGUAL_SCHOLAR deferred" — good management of scope. | OK | — |
| 39–51 | Phase 3: Celebration animations. Tests for confetti trigger and reduced-motion fallback. Accessibility included (`prefers-reduced-motion`). Good. | OK | — |
| 14 | "Wire XP award into quiz submission endpoint" — this is the correct server-side placement (per spec NFR: "XP calculations must be deterministic and server-side"). However, no authorization check is mentioned for the XP award call — could a student POST to a different endpoint to claim XP fraudulently? The spec says server-side only, but the plan doesn't specify how the quiz submission endpoint authorizes the XP award. | Medium | F-SA-B27-034 |
| 55–68 | Phase 4: Dashboard and profile integration. Includes "Remove dead code" task (lines 65–67) for `hover-bounce` and `hover-wiggle` CSS classes. Good housekeeping practice. | OK | — |
| 19, 33, 49, 68 | Manual verification tasks at end of each phase. Good QA practice. | OK | — |

---

### File 20: `student_engagement_loop_20260428/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Well-written feature spec with clear motivation |
| **Security/tenancy** | Good server-side enforcement mandate; gap on access control and tenant isolation |
| **AGENTS.md compliance** | **Conflict** — no mention of shared backend package; Prisma assumption |
| **Spec quality** | High — well-organized with FRs and NFRs |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3–7 | Motivation paragraph: "There is no reason to return" — compelling problem statement that justifies the feature. | OK | — |
| 12–15 | FR-1: XP system — "100 XP for 90%+, 75 XP for 80%+, 50 XP for passing". Well-specified scoring. "Quiz attempts award bonus XP for first-attempt success" — incentivizes first-attempt accuracy. | OK | — |
| 44–46 | FR-5: "Show completed lessons as filled nodes, current lesson as pulsing, upcoming as outlined" — detailed visual spec for the progress visualization. | OK | — |
| 53–57 | Non-Functional Requirements: CSS-only animations (no heavy libraries), server-side XP (no client spoofing), DB persistence (not localStorage), graceful degradation, WCAG 2.1 AA reduced motion. **All excellent requirements** that align with AGENTS.md patterns. | OK | — |
| 54 | "XP calculations must be deterministic and server-side (no client-side XP spoofing)" — directly addresses the security concern raised in File 19 (F-SA-B27-034). The spec correctly mandates server-side enforcement. | OK | — |
| 55 | "Gamification state (XP, streaks, badges) must be stored in the database, not just localStorage" — correct persistence requirement. | OK | — |
| 59 | Acceptance criteria — 8 concrete, testable criteria. Well-written. | OK | — |
| 70–75 | Out of Scope: Leaderboards, real-time features, purchasable items, push notifications. Good boundary management — explicitly excludes features that could create anxiety or scope creep. | OK | — |
| All | **No mention of authorization model** for gamification APIs. Who can read XP data? Only the owning student? Their teacher? School admin? No mention of tenant isolation — gamification data must be scoped by schoolId so that School A's teachers cannot see School B's students' XP. | **High** | F-SA-B27-035 |
| All | **No mention of monorepo package boundaries**. The gamification logic (XP calculation, badge evaluation, streak tracking) belongs in `packages/backend/modules/gamification/` per AGENTS.md. The spec assumes app-local implementation. | **High** | F-SA-B27-036 |

---

## Cross-Cutting Observations

| Observation | Files Affected | Severity | ID |
|-------------|---------------|----------|-----|
| **Prisma vs Drizzle**: All three track specs and plans (quiz_system, auth_centralization, data_safety, student_engagement_loop) reference Prisma schema files (`prisma/schema.prisma`), Prisma commands (`npx prisma generate`), and Prisma-specific patterns (query extensions, middleware). The current architecture uses Drizzle exclusively. These documents are archival and pre-date the migration, but the mismatch is the single largest architectural gap in this batch. | 12, 13, 15, 16, 19 | **Critical** | F-SA-B27-007/008/018/019/023/025/026/027/030/032 |
| **NextAuth/Google OAuth vs auth-adapter**: tech-stack.md specifies NextAuth.js with Google OAuth, but the current monorepo uses username/password-only auth via the shared `@reading-advantage/auth` package. | 8 | **Critical** | F-SA-B27-009/011 |
| **No tenant/scoped isolation**: None of the track specs mention schoolId scoping, tenant isolation, or multi-tenant data access controls — despite this being a core architectural requirement in both the monorepo and science-advantage AGENTS.md. Quiz submissions, XP data, badges, soft-delete filtering, session cleanup all need tenant-aware implementation. | 2, 12, 13, 15, 16, 19, 20 | **High** | F-SA-B27-002/005/020/021/024/031/033/035 |
| **App-local vs shared-package architecture**: All three feature tracks assume app-local implementations (auth wrappers in `lib/auth/`, gamification in app routes, quiz API in `app/api/`). The monorepo AGENTS.md requires business logic in `packages/backend/`. | 12, 13, 15, 19, 20 | **High** | F-SA-B27-016/036 |
| **Broken relative paths in archived tracks.md**: Two track links in the archived `tracks.md` resolve to incorrect relative paths after archival relocation. | 9 | Medium | F-SA-B27-013/014 |
| **Workflow template not customized**: The 333-line workflow.md is a generic Measure template with Python examples, placeholder commands, and non-TypeScript references. It was never adapted for Science Advantage. | 10 | Low | F-SA-B27-015 |

---

## Findings Summary

| Severity | Count | IDs |
|----------|-------|-----|
| **Critical** | 5 (multi-file) | F-SA-B27-007, F-SA-B27-008, F-SA-B27-009, F-SA-B27-012 (tech-stack out of date), and the Prisma-vs-Drizzle cluster (F-SA-B27-018/019/023/025/026/027/030/032) |
| **High** | 8 | F-SA-B27-002 (quiz auth gap), F-SA-B27-005 (quiz tenancy gap), F-SA-B27-011 (non-existent SSO), F-SA-B27-016 (app-local auth), F-SA-B27-017 (AI routes not role-gated), F-SA-B27-020 (class creation tenant gap), F-SA-B27-021 (class join tenant gap), F-SA-B27-024 (tenant isolation absent from spec), F-SA-B27-033 (gamification no schoolId), F-SA-B27-035 (gamification auth gap), F-SA-B27-036 (no shared-package boundary) |
| **Medium** | 8 | F-SA-B27-003 (no Zod validation in quiz spec), F-SA-B27-004 (no NFR section), F-SA-B27-010 (Redis overstatement), F-SA-B27-013/014 (broken paths), F-SA-B27-022 (no Zod in withAuth), F-SA-B27-028 (no audit logging for admin ops), F-SA-B27-029 (uncommitted Redis client), F-SA-B27-031 (no tenant in soft-delete spec), F-SA-B27-034 (XP authorization gap) |
| **Low** | 2 | F-SA-B27-015 (Python example in TS project), F-SA-B27-006 (autonomous cleanup heuristic) |
| **Info** | 6 | F-SA-B27-001 (pre-monorepo architecture assumption), various template/placeholder notes |

**Note on severity inflation:** Many Critical findings are the same root cause (Prisma vs Drizzle, NextAuth vs auth-adapter) appearing across multiple files. If the root cause is counted once, the unique Critical count is **2** (outdated tech-stack + Prisma dependency in all tracks). The cross-cutting table above reflects this clustering.

---

## Limitations

- **All files are archival documentation**: This batch contains zero production code, zero tests, and zero runtime logic. Findings assess specification quality, architectural alignment, and security assumptions — not code correctness or test quality. The "test quality" focus area is N/A for this batch.
- **Documents pre-date Prisma→Drizzle migration**: Many Critical findings stem from these documents referencing a Prisma-based architecture that no longer exists. The documents were correctly archived during the March 2026 replan. The findings are recorded so that future spec writers do not accidentally re-introduce Prisma patterns.
- **Track completion status**: `auth_centralization_20260206` and `data_safety_20260206` have status "new" (never started). `student_engagement_loop_20260428` has `actual_tasks: null` with 19 estimated tasks — partial completion is visible in the plan.md but the track was never closed out. `quiz_system_20260114` appears fully completed but is pre-replan.
- **No runtime verification**: Findings are based on static review of specification documents only. No tests were run, no code was executed.
- **No git history checked**: Commit SHAs referenced in quiz_system plan.md were not verified against `git log` — they may exist in history but are outside the scope of this batch review.
- **No acceptance/closeout claims**: This report identifies findings and does not assert batch acceptance or closeout.
