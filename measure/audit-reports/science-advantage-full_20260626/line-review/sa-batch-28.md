# Line Review: sa-batch-28

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-28 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns
- **File types**: Measure framework files — archived track specs/plans (7), archive metadata (2), code styleguides (4), autonomous/review prompts (2), product docs (3), setup state (1), tech-debt/lessons registry (2)

---

## Files Reviewed

1. `apps/science-advantage/measure/archive/teacher_dashboard_actionability_20260428/index.md`
2. `apps/science-advantage/measure/archive/teacher_dashboard_actionability_20260428/metadata.json`
3. `apps/science-advantage/measure/archive/teacher_dashboard_actionability_20260428/plan.md`
4. `apps/science-advantage/measure/archive/teacher_dashboard_actionability_20260428/spec.md`
5. `apps/science-advantage/measure/archive/visual_refresh_20260425/metadata.json`
6. `apps/science-advantage/measure/archive/visual_refresh_20260425/plan.md`
7. `apps/science-advantage/measure/archive/visual_refresh_20260425/spec.md`
8. `apps/science-advantage/measure/autonomous_prompt.md`
9. `apps/science-advantage/measure/code_styleguides/general.md`
10. `apps/science-advantage/measure/code_styleguides/html-css.md`
11. `apps/science-advantage/measure/code_styleguides/javascript.md`
12. `apps/science-advantage/measure/code_styleguides/typescript.md`
13. `apps/science-advantage/measure/current-directive.md`
14. `apps/science-advantage/measure/index.md`
15. `apps/science-advantage/measure/lessons-learned.md`
16. `apps/science-advantage/measure/product-guidelines.md`
17. `apps/science-advantage/measure/product.md`
18. `apps/science-advantage/measure/review-prompt.md`
19. `apps/science-advantage/measure/setup_state.json`
20. `apps/science-advantage/measure/tech-debt.md`

---

## File-by-File Findings

### File 1: `archive/teacher_dashboard_actionability_20260428/index.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — minimal index linking to spec, plan, and metadata |
| **Security/tenancy** | N/A (measure document index) |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (no code) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–5 | Minimal track context file with valid relative links to `./spec.md`, `./plan.md`, and `./metadata.json`. No issues. | OK | — |

---

### File 2: `archive/teacher_dashboard_actionability_20260428/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Contradiction — metadata status conflicts with `tracks.md` and `plan.md` |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (metadata file) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 4 | `"status": "new"` — but `tracks.md` line 27 marks this track as **Completed: 2026-04-29** and `plan.md` has all 17 tasks checked `[x]`. Metadata was never updated to reflect completion. | **High** | F-SA-B28-001 |
| 9 | `"actual_tasks": null` — all 17 tasks in `plan.md` are checked complete. `actual_tasks` should be `17` (or the true count if different). Being `null` indicates incomplete housekeeping on track closeout. | Medium | F-SA-B28-002 |
| 3 | `"type": "feature"` — this is correct. However, `estimated_tasks: 17` and `actual_tasks: null` creates a planning-vs-actual gap that cannot be evaluated. | Info | — |

---

### File 3: `archive/teacher_dashboard_actionability_20260428/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Significant correctness concern — all tasks marked `[x]` but metadata contradicts; references Prisma in multiple places where Drizzle is mandated |
| **Security/tenancy** | N/A (planning document) |
| **AGENTS.md compliance** | **Violation** — references Prisma operations in a codebase where `AGENTS.md` declares "Drizzle is the source of truth" and `apps/science-advantage/AGENTS.md` line 3 explicitly says "no Prisma runtime artifacts" |
| **Test quality** | Plan includes test-first phases (Phase 1: "Write tests for...", Phase 2: "Write tests for...") — good TDD alignment. |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 11 | "aggregate in Prisma, not in application code" — references Prisma directly. `apps/science-advantage/AGENTS.md` line 3 declares "Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root." The `measure/tech-stack.md` line 19 says "ORM: Prisma 6" which contradicts the app-level AGENTS.md. This plan follows the tech-stack.md, which is itself out of alignment with the repository's declared migration target. | **High** | F-SA-B28-003 |
| 52 | "Add `Assignment` model to Prisma schema, Run migration" — again references Prisma. The monorepo `AGENTS.md` and `apps/science-advantage/AGENTS.md` both mandate Drizzle. If this track was implemented as written, it created Prisma schema artifacts that are now regressions. | **High** | F-SA-B28-004 |
| 37 | "Soft-delete if students have progress; hard-delete if no progress" — this is a valid data-integrity approach. The plan correctly distinguishes the two deletion strategies. No finding on correctness of this design choice. | OK | — |
| 5–70 | All 17 tasks marked `[x]` (complete). However, `metadata.json` shows `actual_tasks: null` and `status: "new"`. The track is listed in `tracks.md` as "Completed: 2026-04-29" which contradicts the metadata. These three sources must agree on status. | Medium | F-SA-B28-005 |
| 64 | "Remove `NEXT_PUBLIC_FEATURE_INTERVENTION_ALERTS` feature flag" — this is a deployment-level concern (env var removal). Plan doesn't mention a migration for existing deployments that may still reference this flag. Minor operational gap. | Info | — |

---

### File 4: `archive/teacher_dashboard_actionability_20260428/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — well-written spec with clear FRs, NFRs, and acceptance criteria |
| **Security/tenancy** | OK — spec does not make security claims that violate policy |
| **AGENTS.md compliance** | OK (spec is technology-agnostic) |
| **Test quality** | N/A (specification document) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–58 | Clean, well-structured specification. Functional requirements (1–5) are concrete and testable. Non-functional requirements are specific (line 37: "under 2 seconds for classes with up to 40 students"). Acceptance criteria (lines 43–51) map 1:1 to FRs. Out-of-scope section (lines 53–58) correctly walls off adjacent concerns. No issues. | OK | — |
| 13 | References "Class Progress Card" with color thresholds: blue (90%+), green (80%+), yellow (60%+), red (<60%). These thresholds are well-defined but do not specify accessibility accommodations for color-blind teachers. Should include a pattern or text label alongside the color coding per product-guidelines.md line 49 (WCAG AA). | Low | F-SA-B28-006 |

---

### File 5: `archive/visual_refresh_20260425/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Schema mismatch — uses different field names than the other archived track's metadata |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (metadata file) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 2 | `"id": "visual_refresh_20260425"` — the other archived track (`teacher_dashboard_actionability`) uses `"track_id"` for the same purpose. Inconsistent schema across archive metadata files. The `visual_refresh` metadata uses `id`/`title` while the other uses `track_id`/`description`. | Low | F-SA-B28-007 |
| 3 | `"title": "Visual Refresh: Define Unique Identity"` — the other archived track uses `description` instead of `title`. See F-SA-B28-007. | Low | — |
| 5 | `"status": "completed"` — this file correctly reflects completion, unlike the other archive metadata (F-SA-B28-001). However, `tracks.md` line 52–54 also marks it complete. Consistent. | OK | — |
| 1–7 | Missing fields that exist in `teacher_dashboard_actionability_20260428/metadata.json`: `estimated_tasks`, `actual_tasks`, `deviation_notes`. Not all tracks need these fields, but having two different schemas without a shared base type makes automated processing harder. | Info | F-SA-B28-008 |

---

### File 6: `archive/visual_refresh_20260425/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — minimal but appropriate for a visual refresh track |
| **Security/tenancy** | N/A (planning document) |
| **AGENTS.md compliance** | OK |
| **Test quality** | OK — visual identity work does not require unit tests |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 6 | "Select a highly opinionated visual theme" — this is subjective. No acceptance criteria defined for what constitutes "highly opinionated." Compare with `teacher_dashboard_actionability` spec which has 8 concrete acceptance criteria. | Info | — |
| 7 | "Run `npx -y @google/design.md lint DESIGN.md`" — this is referenced in the plan. The spec (line 10) omits the `-y` flag. Minor inconsistency between spec and plan for the same command. | Low | F-SA-B28-009 |
| 1–12 | Only 12 lines for 2 phases, 6 tasks. Appropriately scoped for a visual identity track. All tasks use `[x]` with no metadata contradiction (metadata says `status: "completed"`). | OK | — |

---

### File 7: `archive/visual_refresh_20260425/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (spec) |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (spec) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 4 | Critiques existing DESIGN.md as containing "generic 'AI slop' descriptions (e.g., 'modern', 'clean', 'sleek')" — this is a valid quality observation for design documents. | OK | — |
| 10 | `npx @google/design.md lint` — spec omits `-y` flag that the plan (line 7) uses. See F-SA-B28-009. | Low | — |
| 1–11 | Sparse spec (11 lines, 5 requirements). Appropriate for a visually-focused track; the DESIGN.md output would be the primary deliverable. | OK | — |

---

### File 8: `measure/autonomous_prompt.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — operational prompt for unattended Measure runs |
| **Security/tenancy** | N/A (operational prompt) |
| **AGENTS.md compliance** | OK — aligns with Measure workflow described in both AGENTS.md files |
| **Test quality** | N/A (prompt document) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 15–21 | FUNCTIONALITY REVIEW section requires CDP-based browser verification. References `browser-harness-js` CLI tool. If this tool is not installed or unavailable, the entire verification step (step 2.1) cannot execute. No fallback is described (unlike the autonomous rules at line 61 which mention CDP fallback for step 4). | Medium | F-SA-B28-010 |
| 23 | "Implement ONE phase with TDD: Red-Green-Refactor cycle" — mandates test-first. Good alignment with AGENTS.md and Measure workflow. | OK | — |
| 45–46 | Enforces memory limits: `tech-debt.md` ≤50 lines and `lessons-learned.md` ≤50 lines. Current `lessons-learned.md` is 49 lines (at the limit). `tech-debt.md` is 21 lines (well under). These limits create an ongoing housekeeping obligation that is not mentioned in any spec or plan. | Info | — |
| 50–55 | "CRITICAL UNATTENDED RULES" — auto-answer yes to any prompt asking "Proceed?", "Continue?", "Shall I?". This is an operational safety concern for unattended runs: if a destructive operation (database reset, deletion, migration) generates a confirmation prompt, the agent will auto-approve it. No guard against destructive confirmations. | Medium | F-SA-B28-011 |
| 59 | "NEVER mark a track or phase complete if the app doesn't launch or the feature doesn't work" — hard requirement. Correct. | OK | — |
| 61 | "If CDP is unavailable, fall back to manual verification instructions" — this conflicts with the unattended prompt's own self-sufficiency requirement. If no human is present, "manual verification instructions" are a dead end. The line 15–21 step has no such fallback provision (see F-SA-B28-010). | Medium | — |

---

### File 9: `measure/code_styleguides/general.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK — aligns with general principles |
| **Test quality** | N/A (style guide) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–23 | Generic coding principles: readability, consistency, simplicity, maintainability, documentation. These are broadly correct and uncontroversial. No line-by-line issues. | OK | — |
| 22 | "Document *why* something is done, not just *what*" — standard convention. Aligns with monorepo AGENTS.md JSDoc guidance (lines 678–679: "Describe each parameter's purpose"). | OK | — |

---

### File 10: `measure/code_styleguides/html-css.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — accurate summary of Google HTML/CSS Style Guide |
| **Security/tenancy** | N/A (style guide) |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (style guide) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 6 | "Use HTTPS for all embedded resources" — correct security practice. | OK | — |
| 33 | "Use 3-character hex notation where possible" — this is a minimization preference. Not a correctness or security issue. | OK | — |
| 34 | "Avoid using `!important`" — correct CSS best practice. | OK | — |
| 37 | "Alphabetize declarations within a rule" — this is a Google style choice. The monorepo uses Tailwind utility classes for styling, so raw CSS declaration ordering is less relevant in practice. No conflict. | OK | — |
| 47–49 | Standard disclaimer to be consistent when editing. No issues. | OK | — |

---

### File 11: `measure/code_styleguides/javascript.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | **Violation** — JSDoc guidance (lines 47–49) directly contradicts monorepo AGENTS.md line 678 |
| **Security/tenancy** | N/A (style guide) |
| **AGENTS.md compliance** | **Violation** — recommends JSDoc style with types in `@param`/`@return` blocks, which the monorepo AGENTS.md explicitly forbid |
| **Test quality** | N/A (style guide) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 13 | ".js extension in import paths is mandatory" — this is Google JS style. The monorepo uses TypeScript where imports do not use `.ts` extensions. This is a JavaScript guide and does not apply to `.ts` files. However, it could confuse agents who read this guide and apply `.js` extensions to TypeScript imports. | Low | F-SA-B28-012 |
| 47–49 | Recommends `/** @param {string} userName */` — types in `@param` blocks. The monorepo AGENTS.md line 678 explicitly states: "do not repeat types in JSDoc — TypeScript already provides type information." This is a **direct contradiction** between this style guide and the project's authoritative standard. The `typescript.md` guide (File 12, line 40) correctly omits types from JSDoc. The JavaScript guide was not updated to match the project's actual policy. | **High** | F-SA-B28-013 |
| 27 | "Do not use JavaScript getter/setter properties (`get name()`)" — this is Google JS style. The project uses TypeScript, where getters/setters have slightly different implications. Not a critical conflict but worth noting that the JS guide's restrictions may not apply 1:1 to TS. | Info | — |
| 12 | "Use named exports. Do not use default exports" — aligns with monorepo AGENTS.md and `typescript.md`. Consistent. | OK | — |
| 28 | "Prefer arrow functions for nested functions to preserve `this` context" — the `typescript.md` (line 13) says "Prefer function declarations for named functions. Use arrow functions for anonymous functions/callbacks." These two guides give different advice for the same scenario. The TypeScript guide should take precedence for `.ts` files. | Low | F-SA-B28-014 |

---

### File 12: `measure/code_styleguides/typescript.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — accurate Google TS Style Guide summary |
| **Security/tenancy** | N/A (style guide) |
| **AGENTS.md compliance** | Line 40 correctly aligns with monorepo AGENTS.md JSDoc rule (unlike the JavaScript guide) |
| **Test quality** | N/A (style guide) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 6 | "Use `const` by default" — correct. Aligns with monorepo convention. | OK | — |
| 17 | "Avoid type assertions (`x as SomeType`) and non-nullability assertions (`y!`). If you must use them, provide a clear justification." — good practice. | OK | — |
| 19 | "Avoid `any`. Prefer `unknown` or a more specific type." — correct. | OK | — |
| 29 | "Do not use `_` as a prefix or suffix for identifiers, including for private properties." — This is Google style. The project AGENTS.md does not mandate this. However, some existing test files use underscore-prefixed private methods. Not a project-wide requirement. | Info | — |
| 34 | "Prefer optional parameters and fields (`?`) over adding `|undefined`" — correct, aligns with modern TS convention. | OK | — |
| 39–41 | JSDoc guidance: "Do not declare types in `@param` or `@return` blocks" — **correctly aligned** with monorepo AGENTS.md line 678. Note that `javascript.md` (File 11, line 47–49) contradicts this — see F-SA-B28-013. | OK | — |
| 10 | "Do not use `#private` fields. Use TypeScript's `private` visibility modifier." — Google TS style. The project does not mandate either but `private` is more common. No conflict. | OK | — |

---

### File 13: `measure/current-directive.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — single directive line |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (directive) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | "Tests require running PostgreSQL — consider adding Docker Compose for CI" — this is valid operational advice. The `tech-debt.md` line 17 already tracks the underlying issue ("vitest.setup.ts runs `prisma db push --force-reset` for ALL tests including pure unit tests"). The directive is not tracked in any active plan. | Info | — |

---

### File 14: `measure/index.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — valid references to all core context files |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (index) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 9 | References `./tech-stack.md` — file exists and was read. | OK | — |
| 10 | References `./workflow.md` — file exists and was read. | OK | — |
| 11 | References `./tracks.md` — file exists and was read. | OK | — |
| 3 | "Root for Measure's file resolution protocol" — accurate description of purpose. | OK | — |
| 22 | "Replan Archive (2026-03-11): `./archive/replan_20260311/`" — this directory was not verified to exist in this review batch (not listed in batch). Assumed present. | OK | — |

---

### File 15: `measure/lessons-learned.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — 49 entries documenting project lessons |
| **Security/tenancy** | OK — includes auth-related lessons (lines 18–19, 22–24, 31–32) |
| **AGENTS.md compliance** | OK — captures project-specific drift and conventions |
| **Test quality** | N/A (lessons doc) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 28–29 | "vitest.setup.ts runs `prisma db push --force-reset` before ALL tests, requiring a running database even for unit tests" — references Prisma. This is a known tech-debt item (tech-debt.md line 17). The lesson accurately describes the problem but uses Prisma terminology when the migration target is Drizzle. | Info | — |
| 41 | "Seed functions must generate slugs when inserting Lesson/QuizQuestion records. Use `slug: lessonId.toLowerCase().replace(/\s+/g, '-')` pattern" — Prisma reference. See F-SA-B28-003/F-SA-B28-004 for the cross-cutting Prisma issue. | Info | — |
| 48–49 | [Design] entries about Tailwind CSS custom shadow classes not working with `hover:` prefix. These are concrete technical lessons with workaround guidance. Good quality for a lessons-learned entry. | OK | — |
| 3–49 | Document is 49 lines — at the 50-line enforcement limit from `autonomous_prompt.md` (line 45). No stale entries identified, but any new lesson will exceed the limit, requiring consolidation or removal of outdated entries. | Info | F-SA-B28-015 |
| 18–19 | "Auth must be treated as a platform-alignment problem, not a side task" — accurate self-assessment that auth alignment is incomplete. | OK | — |

---

### File 16: `measure/product-guidelines.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — well-written product guidelines |
| **Security/tenancy** | OK — no auth/tenancy claims |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (guidelines doc) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 30–34 | Teacher experience principles: "A teacher should be able to answer three questions quickly: What should my class do next? Who is off track? Which standards or lessons are causing the problem?" — clear, actionable framing. | OK | — |
| 49 | "Accessibility target is WCAG AA for contrast, keyboard flow, and semantic labeling" — correct standard. | OK | — |
| 52–53 | "Avoid placeholder widgets in production-facing routes; hide incomplete features instead of presenting dead surfaces" — directly addresses the teacher-dashboard placeholder removal in the archived track (File 4). Good self-consistency. | OK | — |
| 5 | "Student-facing copy should be warm, concrete, and confidence-building" — tone guideline. | OK | — |
| 21–26 | Bilingual content rules: "Thai support must be intentional and content-aware. Do not fake Thai localization by duplicating English into Thai fields." — important architectural constraint. | OK | — |

---

### File 17: `measure/product.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — coherent product definition |
| **Security/tenancy** | OK — no auth/tenancy claims |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (product definition) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 5–10 | Product thesis is well-stated: "Thai-aligned school delivery" with "bilingual support" and "mastery and intervention signals." Aligns with the project scope. | OK | — |
| 69–78 | Five product priorities: curriculum foundation, student learning loop, teacher visibility, platform alignment, assistive AI. These map well to the tracks in `tracks.md`. | OK | — |
| 92–99 | Explicit non-goals (iOS, Android, parent portal, live tutoring, AR/VR, LMS/SIS integrations). These help scope discussions. | OK | — |

---

### File 18: `measure/review-prompt.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — operational code review prompt |
| **Security/tenancy** | OK — no security concerns |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A (prompt) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8–9 | References `git log --since="24 hours ago"` and `git diff --name-only HEAD~20 HEAD` — operational commands. The `HEAD~20` range could miss changes if more than 20 commits occurred in 24 hours. Should use time-based range instead (`git diff --name-only @{24.hours.ago}`) for accuracy. | Low | F-SA-B28-016 |
| 25 | "Fix up to 5-7 lint warnings or minor issues if found. Do NOT refactor unrelated code." — specific, bounded scope. Good pattern. | OK | — |
| 33–36 | Same unattended auto-confirm rule as `autonomous_prompt.md` (see F-SA-B28-011). If run in unattended mode, the same "auto-approve any prompt" safety concern applies. | Medium | — |
| 3 | "CODE REVIEW — PAST 24 HOURS" — title. The prompt is intended for daily review workflows. | OK | — |

---

### File 19: `measure/setup_state.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — single key-value pair |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | N/A |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `{"last_successful_step": "3.3_initial_track_generated"}` — state tracking for Measure setup process. The value `"3.3_initial_track_generated"` suggests setup reached initial track generation. No documented meaning for this state outside the Measure setup workflow. | OK | — |

---

### File 20: `measure/tech-debt.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — 21 entries, 9 open, 7 resolved, 5 addressed |
| **Security/tenancy** | Line 18 flags missing CSRF on Google OAuth — valid security finding |
| **AGENTS.md compliance** | OK — documents known drift |
| **Test quality** | N/A (tech debt registry) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3 | "Auth: Google OAuth flow implemented" — marked "Addressed." But `apps/science-advantage/AGENTS.md` line 85 says "Authentication is username/password-only via shared `@reading-advantage/auth`" for local auth, while line 83 says "Demo accounts are seeded." There is a **contradiction** between the project AGENTS.md (username/password) and tech-stack.md (Google OAuth only). The tech-debt entry correctly captures that Google OAuth was implemented, but does not note the contradiction with the repo's documented auth model. | **High** | F-SA-B28-017 |
| 18 | "Google OAuth callback reads but does not validate `state` parameter. No CSRF protection on the OAuth flow." — valid high-severity security finding. Marked "Open" but only "Medium" priority. Given that this is a CSRF vulnerability in the auth flow, it should be **High** priority, not Medium. | **High** (severity of the finding itself) | F-SA-B28-018 |
| 7 | "Lesson, curriculum unit, and quiz question slugs now have dedicated slug fields in Prisma schema" — marked "Addressed" but references Prisma schema. See F-SA-B28-003 for the cross-cutting Prisma issue. | Info | — |
| 17 | "vitest.setup.ts runs `prisma db push --force-reset` for ALL tests including pure unit tests" — marked "Open / High." Accurate assessment of a real infrastructure problem. | OK | — |
| 19 | "seed-questions.ts does not call validateQuizQuestionsFile() before inserting data. Validation exists but seed script bypasses it." — marked "Open / Medium." Valid quality finding. | OK | — |
| 21 | "Design system uses CSS custom properties for shadows but Tailwind only provides standard shadow utilities." — marked "Open / Low." Documented workaround exists in lessons-learned.md lines 48–49. | OK | — |
| 1–21 | Document is 21 lines, well within the 50-line enforcement limit. All entries are on separate lines with pipe-delimited columns. Format is parseable. | OK | — |

---

## Cross-Cutting Observations

| Observation | Files Affected | Severity | ID |
|-------------|---------------|----------|-----|
| **Prisma vs Drizzle contradiction**: The archived track's `plan.md` references adding Prisma models and running Prisma migrations. The `measure/tech-stack.md` declares "ORM: Prisma 6." However, `apps/science-advantage/AGENTS.md` line 3 explicitly states "Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root." The `agent.md` (lines 30, 36, 44, 48, 74) consistently references Drizzle. There is no open tech-debt entry acknowledging this contradiction. The tech-stack.md is **out of date** and contradicts the app-level authoritative docs. | 3, 7, 15, 20, tech-stack.md | **High** | F-SA-B28-019 |
| **Metadata schema inconsistency**: Two archive tracks have different metadata field schemas (`id`/`title` vs `track_id`/`description`). No shared schema or validation. | 2, 5 | Low | F-SA-B28-007 |
| **JSDoc contradiction between style guides**: `javascript.md` recommends types in `@param` blocks; `typescript.md` correctly omits them. The monorepo AGENTS.md line 678 supports the TypeScript guide's approach. The JavaScript guide should be updated with a note that for TypeScript files (which is the project standard), the TypeScript guide takes precedence. | 11, 12 | **High** | F-SA-B28-013 |
| **Unattended auto-confirm safety concern**: Both `autonomous_prompt.md` (line 52) and `review-prompt.md` (line 34) instruct the agent to auto-answer "yes" to any prompt asking "Proceed?" or "Continue?" — this could auto-approve destructive operations in unattended runs. No guard against destructive confirmations. | 8, 18 | Medium | F-SA-B28-011 |
| **No acceptance/closeout claims in this batch**: All files are Measure framework planning/docs/style files. No production code, no tests, no implementation files. The review found 19 issues across the batch but none that affect running application correctness. | All | Info | — |

---

## Findings Summary

| Severity | Count | IDs |
|----------|-------|-----|
| **High** | 6 | F-SA-B28-001, F-SA-B28-003, F-SA-B28-004, F-SA-B28-013, F-SA-B28-017, F-SA-B28-019 |
| **Medium** | 5 | F-SA-B28-002, F-SA-B28-005, F-SA-B28-010, F-SA-B28-011, F-SA-B28-018 |
| **Low** | 5 | F-SA-B28-006, F-SA-B28-007, F-SA-B28-009, F-SA-B28-012, F-SA-B28-014, F-SA-B28-016 |
| **Info** | 6 | F-SA-B28-008, F-SA-B28-015, (cross-cutting) F-SA-B28-019 |
| **OK (no finding)** | 0 | — |

Note: F-SA-B28-019 is categorized as both a cross-cutting observation (High) and referenced in findings; F-SA-B28-011 is counted once in the Medium count.

---

## Limitations

- **No production code reviewed**: This batch consists entirely of Measure framework files (specs, plans, metadata, style guides, prompts, product docs). No application code, API routes, database migrations, tests, or UI components were reviewed. Findings relate to documentation correctness, alignment, and process, not application runtime behavior.
- **`pnpm test` not run**: All files in this batch are markdown, JSON, or plaintext — no executable tests exist to run.
- **`build-graph` not applicable**: No TypeScript exports to analyze. Codebase graph analysis was omitted.
- **No cross-file integrity check against active tracks**: The archived track `teacher_dashboard_actionability_20260428` references Prisma models, but whether those Prisma artifacts still exist in the current codebase was not verified (the `prisma/` directory was confirmed absent, but the Drizzle schema may or may not have equivalent tables).
- **`tech-stack.md` read for context but noted as contradictory**: The tech-stack was read to understand the declared stack. Its Prisma declaration (line 19) conflicts with the app-level AGENTS.md (Drizzle). This contradiction is flagged as F-SA-B28-019 but a full reconciliation is outside this batch's scope.
- **No acceptance/closeout claims**: This report identifies findings and does not assert batch acceptance or closeout.
