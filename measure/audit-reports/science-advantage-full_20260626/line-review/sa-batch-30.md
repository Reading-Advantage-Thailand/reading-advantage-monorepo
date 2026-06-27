# Line-by-Line Review: sa-batch-30

**Track:** `science_advantage_review_20260626`  
**Batch:** 30 (20 files — Measure track docs only, no app code)  
**Review Date:** 2026-06-27  
**Reviewer:** automated audit agent (`ark-code-latest`)  
**Scope:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns  
**Constraint:** No app code edits; review only. This batch contains no application source — every file is Measure governance documentation (spec, plan, metadata, index). Findings are therefore about spec/plan quality, traceability, and architectural intent, not runtime behavior.

---

## Files Reviewed

| # | File | Type |
|---|------|------|
| 1 | `apps/science-advantage/measure/tracks/mastery_assistance_20260311/spec.md` | Specification |
| 2 | `apps/science-advantage/measure/tracks/onboarding_flow_20260428/index.md` | Track index |
| 3 | `apps/science-advantage/measure/tracks/onboarding_flow_20260428/metadata.json` | Track metadata |
| 4 | `apps/science-advantage/measure/tracks/onboarding_flow_20260428/plan.md` | Implementation plan |
| 5 | `apps/science-advantage/measure/tracks/onboarding_flow_20260428/spec.md` | Specification |
| 6 | `apps/science-advantage/measure/tracks/redis_actual_integration_20260425/metadata.json` | Track metadata |
| 7 | `apps/science-advantage/measure/tracks/redis_actual_integration_20260425/plan.md` | Implementation plan |
| 8 | `apps/science-advantage/measure/tracks/redis_actual_integration_20260425/spec.md` | Specification |
| 9 | `apps/science-advantage/measure/tracks/student_engagement_loop_20260428/plan.md` | Implementation plan |
| 10 | `apps/science-advantage/measure/tracks/student_engagement_loop_20260428/spec.md` | Specification |
| 11 | `apps/science-advantage/measure/tracks/student_learning_loop_20260311/index.md` | Track index |
| 12 | `apps/science-advantage/measure/tracks/student_learning_loop_20260311/metadata.json` | Track metadata |
| 13 | `apps/science-advantage/measure/tracks/student_learning_loop_20260311/plan.md` | Implementation plan |
| 14 | `apps/science-advantage/measure/tracks/student_learning_loop_20260311/spec.md` | Specification |
| 15 | `apps/science-advantage/measure/tracks/tablet_responsiveness_20260428/index.md` | Track index |
| 16 | `apps/science-advantage/measure/tracks/tablet_responsiveness_20260428/metadata.json` | Track metadata |
| 17 | `apps/science-advantage/measure/tracks/tablet_responsiveness_20260428/plan.md` | Implementation plan |
| 18 | `apps/science-advantage/measure/tracks/tablet_responsiveness_20260428/spec.md` | Specification |
| 19 | `apps/science-advantage/measure/tracks/teacher_dashboard_surfaces_20260425/metadata.json` | Track metadata |
| 20 | `apps/science-advantage/measure/tracks/teacher_dashboard_surfaces_20260425/plan.md` | Implementation plan |

---

## File 1: `mastery_assistance_20260311/spec.md` (52 lines)

A well-structured spec. Functional requirements (FR-1..FR-4) are explicit, and the non-functional section captures the architectural concerns that matter most for this domain (deterministic fallbacks, multi-instance shared state, privacy).

### L20–22 — FR-2 deterministic recommendation fallback
**Clean / strong.** "Recommendation output must always fall back to deterministic curriculum logic when AI fails, times out, or returns invalid output." This is exactly the AI-adapter golden path from monorepo `AGENTS.md` ("Deterministic fallbacks are required wherever AI is optional"). Good.

### L38 — "Shared-state services must support multi-instance deployments."
**F-SA-B30-001 | medium | cross-track-consistency**  
This NFR depends directly on the `redis_actual_integration_20260425` track (files 6–8 in this batch) and on `tech-debt.md`, which records that the Redis client is in-memory scaffolding only. As written, this spec asserts a multi-instance requirement that the current platform cannot satisfy. The spec should cross-reference the Redis integration track as a prerequisite, otherwise an implementer could mark FR-3 caching "done" against an in-memory store that silently breaks horizontally. Recommend adding an explicit dependency note.

### L39 — "Student privacy must be preserved in AI payloads and telemetry."
**F-SA-B30-002 | low | spec-precision**  
Good intent but unverifiable as stated. No definition of what PII must be stripped (names, student IDs, free-text answers) before reaching the AI adapter or logs. Monorepo `AGENTS.md` requires audit/logging metadata and privacy in AI payloads; the acceptance criteria (L41–47) contain no privacy-specific check. Recommend adding an acceptance criterion such as "AI payloads contain no direct student identifiers (verified by test)."

### L41–47 — Acceptance Criteria
**F-SA-B30-003 | low | testability**  
Criteria are reasonable but several are not objectively measurable: "explanation must remain concise and believable" (L22) has no acceptance criterion; "Metrics/logging exist for the main failure modes" (L46) does not state which modes or the verification method. Per `measure/workflow.md` honest-status norms, acceptance criteria should be independently verifiable. Non-blocking for a spec at `status: new`.

---

## File 2: `onboarding_flow_20260428/index.md` (5 lines)

### L1–5 — Index links
**Clean.** Standard three-link index (spec, plan, metadata). All three referenced files exist in the same directory (verified in this batch: files 3, 4, 5). No issues.

---

## File 3: `onboarding_flow_20260428/metadata.json` (11 lines)

### L1–11 — Metadata schema
**F-SA-B30-004 | low | metadata-schema-inconsistency**  
This metadata uses the "long" schema (`track_id`, `type`, `status`, `created_at`, `updated_at`, `description`, `estimated_tasks`, `actual_tasks`, `deviation_notes`). The `redis_actual_integration` (file 6) and `teacher_dashboard_surfaces` (file 19) metadata use a different "short" schema (`id`, `name`, `status`, `created`, `priority`). Two incompatible metadata schemas coexist in the same tracks directory. This breaks any tooling that reads track metadata uniformly (e.g. automated status rollups). Recommend normalizing to a single schema. This is a batch-wide observation; see also F-SA-B30-009 and F-SA-B30-019.

### L4 — `"status": "new"`
**Clean.** Consistent with `actual_tasks: null` and empty `deviation_notes` — an un-started track. No closeout/acceptance claims present, which satisfies the audit constraint.

---

## File 4: `onboarding_flow_20260428/plan.md` (89 lines)

A detailed, TDD-oriented plan (tests-first ordering in Phases 1–3). Good adherence to the Measure "write failing tests" convention.

### L7 — `useFirstRun()` hook checks enrolled class count from API
**F-SA-B30-005 | medium | tenancy/auth (forward-looking)**  
The plan derives first-run state from "enrolled class count from API." When implemented, the underlying endpoint must scope the class query by the authenticated user (and `schoolId` per monorepo multi-tenancy rules) — never by a client-supplied user/tenant ID. The plan does not state this constraint. Since this is the exact surface where tenancy bugs appear, recommend the spec/plan name the auth+tenant scoping requirement explicitly so the Red tests cover it. Forward-looking; no code exists yet.

### L8 — "Cache first-run state to avoid re-checking on every render"
**F-SA-B30-006 | low | correctness (forward-looking)**  
Caching first-run state risks a stale-cache bug: a student who joins their first class must transition out of first-run immediately (L19 requires this). If first-run state is cached (localStorage/memory), the transition step must invalidate it. The plan's L19 "refresh or state update" is vague. Recommend the plan require cache invalidation on successful join to avoid a student being stuck on the welcome screen. Non-blocking.

### L46–52 — Landing page update
**Clean.** Replacing "Coming 2025"/waitlist with `/signin` CTA is content-only and low-risk. "Verify all links work" (L52) is a reasonable manual check.

### L59 / L68 — Dismissal persists to localStorage
**Clean (with caveat).** localStorage dismissal is appropriate for non-critical UI state. Note this is per-device, not per-account — acceptable for help tooltips/checklists. Spec L46 correctly insists first-run *detection* itself must be data-driven, not a localStorage flag, which avoids the anti-pattern. Consistent.

### L76–80 — Progressive enhancement (no-JS)
**Clean / strong.** Requiring the welcome screen and wizard to degrade to server-rendered forms is good architecture and matches the spec's non-flow requirement (spec L47). Notable because it is rarely specified; positive.

---

## File 5: `onboarding_flow_20260428/spec.md` (67 lines)

Clear, well-scoped spec with explicit out-of-scope section (L62–67) that correctly excludes email invitations, CSV import, and admin onboarding — good scope discipline per the avoid-feature-creep principle.

### L46 — First-run detection from data state, not a flag
**Clean / strong.** "First-run detection must be based on actual data state ... not a separate 'has seen onboarding' flag." This is the correct, idempotent approach and avoids drift between a flag and reality.

### L21 — Teacher Step 2 "display the join code"
**F-SA-B30-007 | medium | security/authorization (forward-looking)**  
Join codes are bearer credentials for class enrollment. The spec/plan never state who may view or regenerate a code, nor whether codes expire or are rate-limited against enumeration (6-char codes per spec L5 of the tablet... actually onboarding spec describes 6-char codes implicitly). Anyone with a valid code can join a class. The spec should reference the authorization model for join-code issuance/visibility (teacher-of-that-class only) and note brute-force protection. Cross-reference: a class-join endpoint must rate-limit and scope by school. Forward-looking design gap.

### L51–60 — Acceptance Criteria
**Clean.** Eight concrete, mostly verifiable criteria, including the important negative case (L60: returning users do NOT see onboarding). Good test surface.

---

## File 6: `redis_actual_integration_20260425/metadata.json` (7 lines)

### L1–7 — Short-schema metadata
**F-SA-B30-008 | low | metadata-schema-inconsistency**  
Uses the short schema (`id`/`name`/`created`/`priority`) — incompatible with the long schema used by onboarding/student_learning_loop/tablet tracks in this same batch. See F-SA-B30-004. No `type`, `description`, or task-estimate fields, so this track carries less traceability metadata than its peers.

### L4 — `"status": "pending"`
**Clean.** No acceptance/closeout claim. Consistent with an unstarted track.

---

## File 7: `redis_actual_integration_20260425/plan.md` (19 lines)

### L1–19 — Generic boilerplate plan
**F-SA-B30-009 | high | plan-quality / honest-status**  
This is a template skeleton, not a real plan. Phases are the generic "Set up core infrastructure / Write failing tests / Implement core logic" placeholders with zero track-specific content. For a track whose whole purpose is replacing in-memory Redis stubs with real I/O (a change with real operational risk — connection pooling, failure modes, fallback when Redis is down), the plan names no files, no clients (`createUpstashClient`/`createNodeRedisClient` per tech-debt), no connection-failure fallback strategy, and no integration-test approach against a real/ephemeral Redis. This plan provides no implementation guidance and would not survive a Measure planning review. Recommend rewriting with concrete tasks referencing the actual client modules and a degradation strategy.

### L4–7 — "Write failing tests" / "Implement core logic"
**F-SA-B30-010 | medium | test-quality (forward-looking)**  
Redis integration cannot be meaningfully unit-tested with the DB-mock pattern; it needs an integration harness (ephemeral Redis container or a contract test). The plan should specify the test substrate. As written, "Verify tests pass" (L7) could be satisfied by tests that still run against the in-memory stub — exactly the failure mode this track exists to eliminate. High-risk gap for a correctness-critical track.

---

## File 8: `redis_actual_integration_20260425/spec.md` (11 lines)

### L1–11 — Minimal spec
**F-SA-B30-011 | high | spec-quality**  
The entire functional spec is one line (L4: "Replace in-memory Redis clients with actual Redis I/O connections"). There are no functional requirements, no non-functional requirements (timeouts, retry, pooling, TLS, auth to Redis, graceful degradation when Redis is unavailable), and no privacy/security treatment of what is cached. The acceptance criteria (L6–11) are generic ("Implementation complete / Tests passing / Build succeeds") and not independently verifiable. For shared cache + rate-limiting infrastructure that the `mastery_assistance` multi-instance NFR (F-SA-B30-001) depends on, this spec is materially under-specified. Recommend expanding before implementation.

### L4 — Security note (forward-looking)
**F-SA-B30-012 | medium | security (forward-looking)**  
Rate limiting is one of the named Redis use-cases (per tech-stack). If real Redis I/O replaces the in-memory store but the fallback path (Redis down) defaults to "allow," rate limiting silently fails open — a security regression. The spec must state the fail-closed/fail-open policy for the rate-limiter under Redis outage. Not addressed anywhere in the track.

---

## File 9: `student_engagement_loop_20260428/plan.md` (32 lines)

This is a Phase 4 plan with all items checked `[x]` — the only track in the batch claiming completed work. Reviewed carefully because completed claims carry audit weight.

### L6–32 — All tasks marked `[x]`
**F-SA-B30-013 | medium | unverifiable-completion**  
Every item is checked complete, but this review cannot confirm the referenced artifacts exist or behave as described (constraint: no app-code review in this batch; the cited files — `gamification-dashboard-card.tsx`, `app/api/students/me/gamification/route.ts`, `student-badges-section.tsx` — are outside this file list). The completion claims are recorded here as **unverified within this batch**, not endorsed. No acceptance/closeout statement is being made by this audit. The corresponding source files should be confirmed in their own batch.

### L16–20 — Gamification API endpoint auth/tenancy
**F-SA-B30-014 | high | security/tenancy (forward-looking, completed-claim)**  
L18 requires student auth via `getCurrentSession()` — good. However:
- `/api/students/me/gamification` (L16) keys off the session user ("me"), which is the correct, non-spoofable pattern. Good.
- The sibling endpoint referenced in Task 4, `/api/students/[studentId]/achievements` (plan L31), takes a `studentId` path param. This is the classic IDOR surface: it must verify the authenticated caller is that student (or an authorized teacher of that student's class within the same `schoolId`). The plan/spec do not state this authorization check. Because this task is marked complete, it should be explicitly verified that the `[studentId]` endpoint enforces ownership/teacher-scope-with-tenant and does not leak another student's achievements. Flag for source-level verification.

### L20 — "Returns 404 if no gamification profile exists"
**Clean.** Reasonable; 404 over silent empty avoids ambiguous UI state. (Minor: a 200 with an empty/initial profile is also defensible, but 404 is acceptable.)

---

## File 10: `student_engagement_loop_20260428/spec.md` (37 lines)

A focused, well-bounded spec for client-side celebration animations. No backend/data concerns, so low security surface.

### L5 — "All animations use CSS/canvas — no external animation libraries."
**Clean / strong.** Explicit dependency constraint avoids bundle bloat and aligns with provider-neutral/minimal-dependency intent.

### L14, L21, L28, L34 — `prefers-reduced-motion` respected on every animation
**Clean / strong.** Accessibility is specified per-animation plus globally (L33–37), including ARIA labels and click-to-dismiss. This is a model accessibility spec.

### L10 — Particle counts "20/50/80 by intensity"
**F-SA-B30-015 | low | performance (forward-looking)**  
80 canvas particles is fine on a laptop but the product targets classroom tablets (cross-ref tablet_responsiveness track). No performance/FPS budget or low-end-device cap is stated. Minor; recommend a note that intensity scales down on low-power devices. Non-blocking.

---

## File 11: `student_learning_loop_20260311/index.md` (5 lines)

### L1–5 — Index links
**Clean.** Links to metadata, spec, plan — all present in this batch (files 12, 13, 14). No issue.

---

## File 12: `student_learning_loop_20260311/metadata.json` (11 lines)

### L1–11 — Long-schema metadata
**Clean (schema-wise consistent with onboarding/tablet).** `status: new`, `actual_tasks: null`, empty deviation notes — unstarted track, no completion claims. Subject to the same batch-wide schema-inconsistency note (F-SA-B30-004) only insofar as peer tracks use the short schema.

---

## File 13: `student_learning_loop_20260311/plan.md` (39 lines)

Solid TDD-ordered plan (failing tests precede implementation in all three phases).

### L9 — "Align student routes ... with canonical curriculum identifiers"
**Clean / strong.** Canonical-slug routing is the correct golden path and reduces the duplicate-entry-path bugs the spec calls out (spec L14–15).

### L11–13 — "Ensure enrollment, access checks ... stay consistent"
**F-SA-B30-016 | medium | tenancy/auth (forward-looking)**  
"Access checks" is the right instinct, but the plan does not state the authorization model: a student may only open lessons for classes they are enrolled in, scoped to their school. The Red tests in L5–7 should include negative authorization cases (student attempts to load a lesson/class they are not enrolled in → denied). Recommend making this explicit so access control is test-covered rather than incidental.

### L25–27 — "Remove fake translation and placeholder behaviors"
**Clean / strong.** Making bilingual affordances conditional on real translated content (also spec FR-4, L29–32) removes a user-trust anti-pattern (fake Thai toggle with no content). Good honesty-of-UI requirement; matches `measure/workflow.md` honest-status ethos applied to UX.

### L37 — Deterministic fallback guidance when AI unavailable
**Clean.** Consistent with mastery_assistance FR-2 and monorepo AI-adapter fallback rule.

---

## File 14: `student_learning_loop_20260311/spec.md` (56 lines)

### L39–43 — Non-functional: tablet widths + graceful AI degradation
**Clean / strong.** Explicitly ties into the tablet_responsiveness track and the AI-fallback principle. Cross-track coherence is good here.

### L45–51 — Acceptance Criteria
**Clean.** Verifiable and includes the bilingual negative case (L50: Thai only when valid translated content exists). Well-formed.

### L31 — FR-4 "Thai support should appear where the content contract provides it."
**F-SA-B30-017 | low | spec-precision**  
"Content contract" is referenced but not linked. For an auditor/implementer, the spec should point to the Zod/Drizzle schema that defines the translated-content shape (per monorepo AGENTS.md "external boundaries validated with Zod"). Without the reference, "valid translated content" is judgment-based. Minor traceability gap.

---

## File 15: `tablet_responsiveness_20260428/index.md` (5 lines)

### L1–5 — Index links
**Clean.** Standard three-link index; all targets present in this batch (files 16, 17, 18).

---

## File 16: `tablet_responsiveness_20260428/metadata.json` (11 lines)

### L1–11 — Long-schema metadata
**Clean.** `status: new`, unstarted, no claims. Consistent with onboarding/student_learning_loop long schema. Same batch-wide schema-divergence note applies (F-SA-B30-004).

---

## File 17: `tablet_responsiveness_20260428/plan.md` (66 lines)

Detailed, mostly UI/CSS plan. Low security surface (presentation layer). Strong accessibility orientation.

### L6, L10 — Mobile nav focus trap + keyboard accessibility
**Clean / strong.** Focus trap, Escape-to-close, Tab cycling, close-on-route-change are all specified — correct accessibility for a modal drawer.

### L33–36 — ResponsiveTable card layout for analytics tables
**F-SA-B30-018 | low | tenancy (forward-looking)**  
Teacher analytics tables render student data. This is a presentation change only, but when implemented the underlying data must remain scoped to the teacher's classes/school. The plan correctly stays presentation-only; flagged solely so the data source is not silently broadened during the refactor. Non-blocking.

### L63–66 — "Run Lighthouse audit ... score >= 90 ... Document final score"
**Clean.** Concrete, measurable acceptance gate. Good.

### L48–51 — 44x44px touch targets
**Clean.** Matches WCAG 2.5.5 (spec L46). Auditable.

---

## File 18: `tablet_responsiveness_20260428/spec.md` (67 lines)

### L42–48 — Non-functional requirements
**Clean / strong.** Concrete, measurable NFRs: Lighthouse >= 90, no horizontal scroll at 375px, 44x44px targets, <300ms nav transition, portrait+landscape. These are unusually testable for a responsiveness spec. Positive.

### L62–67 — Out of scope
**Clean.** Correctly excludes native app, offline/service-worker, push, sensors — good scope discipline.

### General
No correctness, security, or tenancy concerns in this spec — it is purely presentation/accessibility scoped. No findings beyond F-SA-B30-018 (presentation-only data-scope reminder).

---

## File 19: `teacher_dashboard_surfaces_20260425/metadata.json` (7 lines)

### L1–7 — Short-schema metadata
**F-SA-B30-019 | low | metadata-schema-inconsistency**  
Short schema again (`id`/`name`/`created`/`priority`), matching `redis_actual_integration` and diverging from the long-schema tracks. See F-SA-B30-004. Lacks `type`/`description`/task-estimate traceability fields.

### L4 — `"status": "pending"`
**Clean.** No acceptance/closeout claim.

---

## File 20: `teacher_dashboard_surfaces_20260425/plan.md` (19 lines)

### L1–19 — Generic boilerplate plan
**F-SA-B30-020 | high | plan-quality / honest-status**  
Identical generic skeleton to the Redis plan (F-SA-B30-009): "Set up core infrastructure / Write failing tests / Implement core logic / Wire components / Update tech-debt." Zero track-specific content for what should be a data- and authorization-heavy feature (teacher dashboard surfaces aggregate student/class data across a school). A teacher-dashboard track with no named surfaces, no data contracts, and no mention of teacher-scope/tenant authorization is not a usable plan and provides no test guidance. Recommend a full rewrite naming the concrete dashboard surfaces and, critically, the authorization model (teacher sees only their classes within their school).

### L4–7 — "Write failing tests"
**F-SA-B30-021 | medium | test-quality (forward-looking)**  
For a teacher dashboard, the most important tests are authorization/tenancy negative cases (teacher A cannot see teacher B's class data; cross-school isolation). The boilerplate plan does not mention these. Per monorepo AGENTS.md (permission tests are a primary testing target), these must be planned explicitly.

---

## Cross-Cutting Observations

1. **Metadata schema fragmentation (F-SA-B30-004, -008, -019).** Two incompatible metadata schemas coexist across the science-advantage tracks directory. The medium-detail "long" schema (track_id/type/description/estimated_tasks/deviation_notes) is clearly superior for auditability; the "short" schema tracks (redis, teacher_dashboard) are also the two with boilerplate plans — suggesting they were stub-generated and never fleshed out. Recommend normalizing all metadata to the long schema and back-filling missing fields.

2. **Boilerplate plans correlate with thin specs (F-SA-B30-009/011, -020).** `redis_actual_integration` and `teacher_dashboard_surfaces` both pair a one-line spec with a generic skeleton plan. These two tracks are the weakest in the batch and the highest-risk (shared infra + cross-tenant teacher data). They should not enter implementation until specs/plans are expanded.

3. **Authorization/tenancy is under-specified across feature tracks (F-SA-B30-005, -007, -014, -016, -020, -021).** Multiple tracks touch student/class/teacher data and join codes but rarely state the auth + `schoolId` scoping model. The monorepo AGENTS.md treats tenant scoping and permission tests as first-class; the specs/plans should encode these as explicit requirements and Red tests, not leave them implicit.

4. **Cross-track dependency on Redis (F-SA-B30-001, -012).** `mastery_assistance`'s multi-instance NFR and any rate-limiting depend on the (currently in-memory, per tech-debt) Redis layer. Until `redis_actual_integration` lands with a defined fail-open/fail-closed policy, downstream "multi-instance" and "rate limiting" claims are not satisfiable. Track dependencies should be made explicit.

5. **Positive patterns.** Where specs are mature (`mastery_assistance`, `onboarding_flow`, `student_learning_loop`, `tablet_responsiveness`, `student_engagement_loop`), they show strong adherence to the golden path: deterministic AI fallbacks, data-driven (not flag-driven) state, progressive enhancement, per-animation `prefers-reduced-motion`, canonical-slug routing, honest UX (no fake translation affordances), and measurable accessibility gates.

---

## Findings Summary

| ID | Severity | Category | File |
|----|----------|----------|------|
| F-SA-B30-001 | medium | cross-track-consistency | mastery_assistance/spec.md L38 |
| F-SA-B30-002 | low | spec-precision (privacy) | mastery_assistance/spec.md L39 |
| F-SA-B30-003 | low | testability | mastery_assistance/spec.md L41–47 |
| F-SA-B30-004 | low | metadata-schema-inconsistency | onboarding_flow/metadata.json |
| F-SA-B30-005 | medium | tenancy/auth (fwd) | onboarding_flow/plan.md L7 |
| F-SA-B30-006 | low | correctness (fwd) | onboarding_flow/plan.md L8 |
| F-SA-B30-007 | medium | security/authorization (fwd) | onboarding_flow/spec.md L21 |
| F-SA-B30-008 | low | metadata-schema-inconsistency | redis_actual_integration/metadata.json |
| F-SA-B30-009 | high | plan-quality / honest-status | redis_actual_integration/plan.md |
| F-SA-B30-010 | medium | test-quality (fwd) | redis_actual_integration/plan.md L4–7 |
| F-SA-B30-011 | high | spec-quality | redis_actual_integration/spec.md |
| F-SA-B30-012 | medium | security (fwd) | redis_actual_integration/spec.md L4 |
| F-SA-B30-013 | medium | unverifiable-completion | student_engagement_loop/plan.md L6–32 |
| F-SA-B30-014 | high | security/tenancy (fwd, completed-claim) | student_engagement_loop/plan.md L31 |
| F-SA-B30-015 | low | performance (fwd) | student_engagement_loop/spec.md L10 |
| F-SA-B30-016 | medium | tenancy/auth (fwd) | student_learning_loop/plan.md L11–13 |
| F-SA-B30-017 | low | spec-precision | student_learning_loop/spec.md L31 |
| F-SA-B30-018 | low | tenancy (fwd) | tablet_responsiveness/plan.md L33–36 |
| F-SA-B30-019 | low | metadata-schema-inconsistency | teacher_dashboard_surfaces/metadata.json |
| F-SA-B30-020 | high | plan-quality / honest-status | teacher_dashboard_surfaces/plan.md |
| F-SA-B30-021 | medium | test-quality (fwd) | teacher_dashboard_surfaces/plan.md L4–7 |

**Severity counts:** high 4 · medium 8 · low 9 · total 21

---

## Limitations

- **Docs-only batch.** All 20 files are Measure governance documents (spec/plan/metadata/index). No application source code is in this file list, so findings concern spec/plan quality, traceability, and architectural intent — not runtime behavior. All findings tagged "(fwd)" / "forward-looking" describe risks to verify when the corresponding source code is reviewed.
- **Completion claims unverified.** `student_engagement_loop/plan.md` marks Phase 4 tasks `[x]` and references source files (`gamification-dashboard-card.tsx`, `app/api/students/me/gamification/route.ts`, `app/api/students/[studentId]/achievements`, `student-badges-section.tsx`) that are outside this batch. This review records those claims as **unverified**; it does not confirm or endorse them. F-SA-B30-014 (the `[studentId]` IDOR surface) in particular must be checked at source level.
- **No app code was edited** (per task constraint). This review is read-only.
- **No cross-file execution/tests were run**; assessment is static document review only.
- **No acceptance or closeout determination is made** by this report. It is a line-review artifact for track `science_advantage_review_20260626` and makes no claim that any reviewed track is accepted, complete, or ready to close.
