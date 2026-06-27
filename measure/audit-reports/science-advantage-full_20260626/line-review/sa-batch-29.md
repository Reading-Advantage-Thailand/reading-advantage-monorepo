# Line-by-Line Review: sa-batch-29

**Track:** `science_advantage_review_20260626`  
**Batch:** 29 (20 files — Measure docs only, no app code)  
**Review Date:** 2026-06-27  
**Reviewer:** automated audit agent  
**Scope:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns  
**Constraint:** No app code edits; review only.

---

## Files Reviewed

| # | File | Type |
|---|------|------|
| 1 | `apps/science-advantage/measure/tech-stack.md` | Governance |
| 2 | `apps/science-advantage/measure/tracks.md` | Registry |
| 3 | `apps/science-advantage/measure/tracks/bilingual_architecture_20260428/index.md` | Track index |
| 4 | `apps/science-advantage/measure/tracks/bilingual_architecture_20260428/metadata.json` | Track metadata |
| 5 | `apps/science-advantage/measure/tracks/bilingual_architecture_20260428/plan.md` | Implementation plan |
| 6 | `apps/science-advantage/measure/tracks/bilingual_architecture_20260428/spec.md` | Specification |
| 7 | `apps/science-advantage/measure/tracks/content_release_workflow_20260425/metadata.json` | Track metadata |
| 8 | `apps/science-advantage/measure/tracks/content_release_workflow_20260425/plan.md` | Implementation plan |
| 9 | `apps/science-advantage/measure/tracks/content_release_workflow_20260425/spec.md` | Specification |
| 10 | `apps/science-advantage/measure/tracks/curriculum_foundation_20260311/index.md` | Track index |
| 11 | `apps/science-advantage/measure/tracks/curriculum_foundation_20260311/metadata.json` | Track metadata |
| 12 | `apps/science-advantage/measure/tracks/curriculum_foundation_20260311/plan.md` | Implementation plan |
| 13 | `apps/science-advantage/measure/tracks/curriculum_foundation_20260311/spec.md` | Specification |
| 14 | `apps/science-advantage/measure/tracks/lesson_type_differentiation_20260428/index.md` | Track index |
| 15 | `apps/science-advantage/measure/tracks/lesson_type_differentiation_20260428/metadata.json` | Track metadata |
| 16 | `apps/science-advantage/measure/tracks/lesson_type_differentiation_20260428/plan.md` | Implementation plan |
| 17 | `apps/science-advantage/measure/tracks/lesson_type_differentiation_20260428/spec.md` | Specification |
| 18 | `apps/science-advantage/measure/tracks/mastery_assistance_20260311/index.md` | Track index |
| 19 | `apps/science-advantage/measure/tracks/mastery_assistance_20260311/metadata.json` | Track metadata |
| 20 | `apps/science-advantage/measure/tracks/mastery_assistance_20260311/plan.md` | Implementation plan |

---

## File 1: `tech-stack.md` (70 lines)

### L6 — Platform Stack heading
**Clean.** The "Locked" label is good governance — it tells implementers what is settled.

### L14 — "Zod plus generated Prisma Zod schemas where useful"
**F-SA-B29-001 | medium | architecture-deviation**  
`apps/science-advantage/AGENTS.md` (regression guard F-205) states Drizzle is the source of truth and "no Prisma runtime artifacts belong at the app root." This line endorses Prisma as a first-class validation source. If Prisma-generated Zod schemas are still in use, the tech-stack should either (a) call this a migration-in-progress or (b) remove the Prisma reference if it is stale.

### L19 — "ORM: Prisma 6"
**F-SA-B29-002 | high | architecture-deviation**  
Direct conflict with the monorepo-wide `AGENTS.md` regression guard ("Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root"). The tech-stack should explain whether Science Advantage is intentionally diverging from the monorepo standard or whether this is an unresolved migration. The `apps/science-advantage/AGENTS.md` deviation note acknowledges a *dependency* deviation (caret ranges) but does not acknowledge this ORM deviation.

### L25 — "Vercel AI SDK (ai) with Google and OpenAI providers"
**Clean.** Follows the AI adapter pattern from monorepo AGENTS.md. No direct provider SDK coupling.

### L35 — "Google Cloud Storage"
**Clean.** Storage adapter pattern; GCS as target is acceptable as long as the `storage.put()`/`storage.get()` abstraction exists.

### L37 — "Redis-backed shared services for cache and rate limiting"
**Clean in principle.** However, `tech-debt.md` L15 shows "Redis client is scaffolding: createUpstashClient and createNodeRedisClient both return in-memory clients. No actual Redis I/O." The tech-stack should note this as aspirational, not delivered. Workflow.md line 5 ("Honest status") applies.

### L43 — "Required production auth: Google OAuth only"
**F-SA-B29-003 | high | auth-deviation**  
Monorepo AGENTS.md (Auth Philosophy) mandates username/password, session-based authentication as the default. Science Advantage has diverged to Google OAuth-only. This is a legitimate per-app choice, but the tech-stack should cross-reference the `apps/science-advantage/AGENTS.md` deviation note or at minimum explain the rationale. See also `lessons-learned.md` L18-L19 ("auth must be treated as a platform-alignment problem").

### L44-L46 — "dev-only impersonation... no dev-only override may leak into production behavior"
**Good security constraint.** This matches the pattern in `apps/science-advantage/AGENTS.md`.

### L54-L55 — "Authentication has drifted into a custom credential/session flow backed by Prisma account and session tables"
**F-SA-B29-004 | medium | auth-drift**  
The tech-stack says Google OAuth (target), but the repo reality is a custom Prisma-backed credential flow. Neither matches the monorepo username/password session norm. This drift should be tracked as active tech debt with a planned resolution track.

### L58-L59 — "npm run test:e2e is still a placeholder"
**F-SA-B29-005 | low | test-gap**  
Should also appear in `tech-debt.md`. Currently, `tech-debt.md` L5 says "npm run test:e2e now runs Playwright smoke tests" (Resolved), which contradicts this line. The two docs disagree about e2e test status.

### L63-L69 — Planning Rules
**Clean.** Good governance rules. Rule 3 ("Do not describe a technology as delivered unless... tested production path") directly addresses the Redis/placeholder honesty point above.

---

## File 2: `tracks.md` (54 lines)

### L10 — "Bilingual Architecture Reframe"
**F-SA-B29-006 | medium | state-inconsistency**  
Shown as `[ ]` (not started/foundation incomplete), but `plan.md` for this track (File 5) marks all 15 sub-tasks `[x]` (complete). Either the registry is stale or the plan was prematurely checked off. The two must agree.

### L11 — Tablet & Mobile Responsiveness
Shown as `[ ]`. No track directory for `tablet_responsiveness_20260428` exists in this batch — not reviewable here, but note the link target may be missing.

### L12 — Lesson Type Differentiation
Shown as `[ ]`. Consistent with `plan.md` (all tasks `[ ]`). Clean.

### L17-L31 — Completed tracks in `measure/archive/`
Good archival pattern. No issues.

### L33-L43 — Foundation tracks (curriculum, learning loop, delivery, mastery)
All `[ ]` as expected. Consistent with their respective plan.md files (partial or not started).

### L45-L51 — Upcoming Tracks
**F-SA-B29-007 | low | missing-index**  
`content_release_workflow_20260425` is listed here with a future link. The track directory exists but has no `index.md` (only spec.md, metadata.json, plan.md). Every track should have an index.md per Measure conventions (see `bilingual_architecture_20260428/index.md` and `curriculum_foundation_20260311/index.md` as templates).

---

## File 3: `bilingual_architecture_20260428/index.md` (5 lines)

**Clean.** Standard Measure track index with working links to spec, plan, and metadata. No issues.

---

## File 4: `bilingual_architecture_20260428/metadata.json` (11 lines)

### L4 — `"status": "new"`
**F-SA-B29-008 | medium | state-inconsistency**  
The plan.md shows all tasks `[x]` (complete). Status should be `"complete"` or at minimum `"in_progress"`. `"new"` is factually wrong and will confuse any automation that gates work on track status.

### L8 — `"estimated_tasks": 15`
Plan.md has 27 distinct `[x]` checkboxes across all phases. The estimate is ~55% of actual planned checkboxes. Either over-estimated or tasks were added after estimate. `actual_tasks: null` means no closeout has happened.

---

## File 5: `bilingual_architecture_20260428/plan.md` (67 lines)

### L3-L67 — Phase 1-3
All tasks marked `[x]`. Well-structured with clear task boundaries. TDD-first pattern (write tests before implementation) followed. Manual verification tasks included after each phase.

### L7 — "Add Thai fields to Lesson model"
**F-SA-B29-009 | medium | orm-deviation**  
References Prisma model updates ("Add `titleThai` and `descriptionThai` fields to Prisma `Lesson` model"). Per the monorepo AGENTS.md regression guard, all schema changes should use Drizzle. The fact that this app uses Prisma is a known deviation, but the plan should at minimum acknowledge the divergence.

### L30, L33, L58, L67 — Consensus "Measure - Manual Verification" tasks
**Clean.** Good practice — manual verification step after each phase reduces the risk of untested integration surfaces.

---

## File 6: `bilingual_architecture_20260428/spec.md` (64 lines)

### L12-L13 — "Add `titleThai` field to the `Lesson` Prisma model"
**F-SA-B29-010 | medium | orm-deviation**  
Same Prisma reference as plan.md. Should reference the app's actual ORM (Prisma is correct for this app *given its current tech-stack*), but this highlights the unresolved Prisma-vs-Drizzle split from the monorepo.

### L14 — "extend the `LessonContent` Zod schema"
**Clean.** Proper validation-first approach.

### L15 — "LanguageProvider context becomes a display preference"
**Clean.** Well-scoped.

### L36 — "Prisma migration adding titleThai and descriptionThai"
Same Prisma reference as above.

### L41-L46 — NFRs
**Clean.** Good backward-compatibility and graceful-degradation requirements.

### L59-L64 — Out of Scope
**Clean.** Clearly defines boundaries. Missing "Drizzle migration modernization" but that's a separate track concern.

---

## File 7: `content_release_workflow_20260425/metadata.json` (7 lines)

### L4 — `"status": "pending"`
**Clean.** Consistent with plan (all `[ ]`, no work started).

### L6 — `"priority": "medium"`
No issues.

---

## File 8: `content_release_workflow_20260425/plan.md` (19 lines)

### L1-L19 — All phases
**F-SA-B29-011 | medium | plan-quality**  
The entire plan is placeholder boilerplate:
- Phase 1: "Set up core infrastructure", "Write failing tests", "Implement core logic", "Verify tests pass"
- Phase 2: "Wire components together", "Add error handling", "Write integration tests", "Verify full suite passes"
- Phase 3: "Update tech-debt.md", "Update lessons-learned.md", "Final verification", "Commit and push"

This is not actionable. A Measure plan should break work into concrete, track-specific tasks with expected files and interfaces. Compare with `bilingual_architecture_20260428/plan.md` (67 lines of specific tasks) or `lesson_type_differentiation_20260428/plan.md` (105 lines). Before implementation begins, this plan needs to be fleshed out.

---

## File 9: `content_release_workflow_20260425/spec.md` (11 lines)

### L1-L11 — Entire spec
**F-SA-B29-012 | high | spec-quality**  
This is the thinnest spec in the batch. It contains:
- A one-line overview: "Implement governed content release workflow replacing seed-based operations"
- Five generic acceptance criteria: "Implementation complete", "Tests passing", "Build succeeds", "Tech debt updated", "Lessons learned updated"

**Missing entirely:**
- Functional requirements (what does the workflow look like? who triggers it? what environments?)
- Non-functional requirements (latency, security, auditability)
- Auth/authorization model (who can release content? admin-only? teacher-limited?)
- Architecture decisions (is this a script? a CI pipeline? a web UI? a webhook?)
- Rollback strategy
- Migration plan for existing seed-based content

This spec is **not implementable** as-is. It must be expanded before work begins, per Measure's own workflow rules (workflow.md L17: "Read product.md, tech-stack.md, ...spec.md" — a spec this thin provides zero guidance).

---

## File 10: `curriculum_foundation_20260311/index.md` (5 lines)

**Clean.** Standard track index. Links to spec, plan, metadata. No issues.

---

## File 11: `curriculum_foundation_20260311/metadata.json` (11 lines)

### L4 — `"status": "new"`
**F-SA-B29-013 | medium | state-inconsistency**  
Plan.md shows Phase 1 fully `[x]` complete (4 tasks) and Phase 2 partially complete (2 `[x]`, 1 `[~]`, 1 `[ ]`). "new" means zero work started; this track clearly has significant work done. Should be `"in_progress"`.

### L8 — `"estimated_tasks": 10`
Plan.md has ~10 tasks total (4+4+2), so estimate is roughly correct. `actual_tasks: null` is fine for an active track.

---

## File 12: `curriculum_foundation_20260311/plan.md` (39 lines)

### L17-L19 — Duplicate "Phase 2" header
**F-SA-B29-014 | low | formatting**  
Line 17 and line 19 are identical `## Phase 2: Source-of-Truth Content Migration`. This is a copy-paste artifact. The duplicate should be removed.

### L27 — Task 3 `[~]` (partial) "Normalize Grade 4 rich content"
**F-SA-B29-015 | low | stale-partial**  
The Grade 4 task is marked `[~]` with both sub-items still `[ ]`. The `[~]` partial marker was used inconsistently — sub-items should use `[~]` or the parent should remain `[ ]` until sub-items are done. Minor formatting issue.

### L35-L38 — Phase 3 all `[ ]`
Consistent. No implementation started.

---

## File 13: `curriculum_foundation_20260311/spec.md` (60 lines)

### L12-L41 — FR-1 through FR-5
**Clean.** Well-structured functional requirements with clear scope and measurable outcomes.

### L43-L47 — NFRs
**Clean.** Determinism, error specificity, and cross-audience readability are all good requirements.

### L49-L56 — Acceptance Criteria
**Clean.** Five clear criteria with measurable outcomes.

### L57-L60 — Out of Scope
**Clean.** Good boundary definition.

**F-SA-B29-016 | low | auth-gap**  
No mention of authorization for curriculum data. Who can create/release curriculum data? Should this be admin-only? Teacher-gated? The spec should at minimum note that auth is deferred or is part of the access model work. However, since this track focuses on the data model itself, this is a minor gap.

---

## File 14: `lesson_type_differentiation_20260428/index.md` (5 lines)

**Clean.** Standard track index. No issues.

---

## File 15: `lesson_type_differentiation_20260428/metadata.json` (11 lines)

### L4 — `"status": "new"`
**Clean.** Consistent with plan (all `[ ]`). No work started.

### L8 — `"estimated_tasks": 21`
Plan has ~40+ checkboxes across 5 phases. Estimate of 21 tasks is low by roughly 50%. Fine for a pre-work estimate.

---

## File 16: `lesson_type_differentiation_20260428/plan.md` (105 lines)

### L1-L105 — All 5 phases
**Clean.** Excellent plan. Detailed tasks with clear boundaries. TDD-first (every feature task begins with "Write tests for..."). Manual verification after every phase. Good accessibility consideration (L70: `prefers-reduced-motion`).

### L37 — "localStorage for persistence across page refreshes"
**F-SA-B29-017 | low | persistence-pattern**  
LocalStorage-based persistence is acceptable for MVP lab timers, but the spec (line 49) says "Lab timer must work offline (client-side countdown) **and sync with server when reconnected**." The sync-on-reconnect requirement is not detailed in the plan. This is a minor gap that should be addressed in implementation.

### L54 — "server stores assessment start time, client displays countdown"
**Clean.** Good tamper-resistant design. However, the spec (line 50) says "Assessment timer must be tamper-resistant (server stores the start time, client displays countdown)" — the plan does not detail the server-side validation of timer expiry (what happens when a student submits after time runs out?). Should be addressed during implementation.

---

## File 17: `lesson_type_differentiation_20260428/spec.md` (71 lines)

### L13-L16 — Visual identity for each lesson type
**Clean.** Well-defined color/icon system.

### L23-L29 — Lab features
**Clean.** Clear requirements.

### L48-L52 — NFRs
**Clean.** Offline timer, tamper-resistant assessment, graceful JS degradation, reduced-motion respect. All strong requirements.

### L54-L64 — Acceptance Criteria
**Clean.** Nine concrete, verifiable criteria.

### L66-L71 — Out of Scope
**Clean.** Good boundary.

**F-SA-B29-018 | low | auth-gap**  
No mention of authorization for assessment submission (who can submit? only the assigned student?). This is acceptable for MVP differentiation but should be documented as deferred.

---

## File 18: `mastery_assistance_20260311/index.md` (5 lines)

**Clean.** Standard track index. Links to spec, plan, metadata.

---

## File 19: `mastery_assistance_20260311/metadata.json` (11 lines)

### L4 — `"status": "new"`
**Clean.** Consistent with plan (all `[ ]`). No work started.

### L8 — `"estimated_tasks": 10`
Plan has ~9 tasks, so estimate is roughly correct.

---

## File 20: `mastery_assistance_20260311/plan.md` (37 lines)

### L3-L37 — Phase 1-3
**Clean.** Well-structured TDD-first plan. Each phase starts with "Define failing tests for..." and ends with manual verification.

### L20 — "Cover AI success, AI failure, invalid output, and cache refresh paths"
**Clean.** Strong test coverage requirements for AI fallback paths. Matches the spec's NFR requiring deterministic fallbacks.

### L39 (spec, referenced) — "Student privacy must be preserved in AI payloads and telemetry"
**Clean.** Important privacy constraint. Not explicitly detailed in plan.md, but spec covers it.

---

## Cross-Cutting Findings

### F-SA-B29-019 | high | batch-coverage-gap
File `apps/science-advantage/measure/tracks/mastery_assistance_20260311/spec.md` exists on disk (52 lines, well-written) but was **not included** in the batch-29 file list (Files 18-20 only cover index.md, metadata.json, plan.md for this track). A reviewer reading only the batch would miss the spec entirely. For a complete view of the `mastery_assistance_20260311` track, the spec must also be reviewed. Recommend either adding it to a future batch or acknowledging the intentional exclusion.

### F-SA-B29-020 | medium | missing-index-file
Track `content_release_workflow_20260425` has no `index.md`. Every Measure track in the repo should have one for consistency (every other track in this batch has one). The directory contains only spec.md, metadata.json, and plan.md.

### F-SA-B29-021 | high | monorepo-orm-divergence
The entire Science Advantage project uses Prisma 6 as its ORM, but the monorepo `AGENTS.md` (regression guard F-205, housekeeping_batch_20260603) mandates Drizzle as the source of truth with "no Prisma runtime artifacts at the app root." This batch contains four files explicitly referencing Prisma migrations (Files 5, 6, and the workflow.md commands). The `apps/science-advantage/AGENTS.md` deviation note only acknowledges the `^` dependency-range deviation — it does not mention this ORM deviation. A resolution plan (migration or formal exemption) is needed.

### F-SA-B29-022 | high | monorepo-auth-divergence
Science Advantage targets Google OAuth-only auth with dev impersonation, while the monorepo mandates username/password session-based auth. The `apps/science-advantage/AGENTS.md` deviation note is silent on auth. This is a larger-than-normal divergence that should be formally documented and, if intentional, approved.

### F-SA-B29-023 | medium | spec-quality-range
Spec quality across the 5 tracks in this batch varies wildly:
- **Excellent:** `lesson_type_differentiation` (71 lines), `curriculum_foundation` (60 lines), `bilingual_architecture` (64 lines), `mastery_assistance` (52 lines)
- **Unacceptable:** `content_release_workflow` (11 lines)

The `content_release_workflow` spec is not actionable. Per Measure workflow.md L17, a spec is a required reading before implementation begins. This spec provides no guidance and must be expanded before the track moves from `pending` to `active`.

### F-SA-B29-024 | low | track-status-integrity
Two of five tracks in this batch have metadata.json `status` fields that do not match their plan.md progress:
- `bilingual_architecture_20260428`: status `"new"` but plan 100% `[x]`
- `curriculum_foundation_20260311`: status `"new"` but plan shows significant progress

This undermines any automation or dashboard that depends on metadata.json for status reporting.

### F-SA-B29-025 | low | auth-tenancy-gap-across-tracks
None of the five specs/plans in this batch explicitly address authorization or multi-tenancy. While many features (lesson type rendering, bilingual display, curriculum data model) are UI/data-model concerns that may not need auth changes, the absence is notable:
- `mastery_assistance`: Mastery data is student-specific — who can view it? Teacher? Student themselves? Admin?
- `lesson_type_differentiation`: Assessment submission — who can submit? Is submission identity-verified?
- `content_release_workflow`: Who can release content? This is the most auth-relevant track and the spec is silent.

### F-SA-B29-026 | low | test-quality-baseline
The batch contains only Measure planning documents, not test files. No test code was reviewed. However, the plans consistently follow the TDD-first pattern (write tests before implementation) which is good. Notable:
- `lesson_type_differentiation_20260428/plan.md` has the best test coverage structure (tests specified for every feature)
- `bilingual_architecture_20260428/plan.md` also follows TDD
- `mastery_assistance_20260311/plan.md` has strong AI fallback test requirements

### F-SA-B29-027 | low | tech-debt-consistency
`tech-stack.md` L58 says `npm run test:e2e` is "a placeholder" while `tech-debt.md` L5 says it "now runs Playwright smoke tests" (Resolved). These two documents contradict each other. One should be updated to match reality.

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| High | 5 |
| Medium | 11 |
| Low | 11 |
| **Total** | **27** |

### Top Risks
1. **Monorepo ORM divergence** (Prisma vs Drizzle) — unresolved, affecting every schema-related task
2. **Monorepo auth divergence** (Google OAuth vs username/password) — undocumented deviation
3. **content_release_workflow spec** — too thin to implement; blocks that track from starting
4. **Track status metadata** — 2/5 tracks have wrong `status` fields, undermining automation
5. **Batch coverage gap** — mastery_assistance spec exists but was excluded from this batch

### No Acceptance/Closeout Claims
This is a line-review report only. No acceptance, closeout, or sign-off claims are made for any track or file.

---

## Limitations

1. **No app code reviewed.** This batch contains only Measure planning documents (specs, plans, metadata, track indexes). No tests, no domain functions, no routes, no components were reviewed.
2. **Prisma-vs-Drizzle finding** is based on the monorepo AGENTS.md regression guard. If Science Advantage has a formal exemption, that document should be updated to reflect it.
3. **Auth deviation finding** is based on the monorepo AGENTS.md Auth Philosophy section. Per-app deviations are permissible but must be documented in the app's own AGENTS.md deviation note.
4. **Batch-29 is Measure-docs-only.** Subsequent batches covering app code, tests, and routes will produce higher-signal findings on correctness, security, and tenancy.
5. **`content_release_workflow_20260425/index.md`** does not exist on disk; the finding about its absence is based on the glob result showing only 3 files.
6. **`mastery_assistance_20260311/spec.md`** exists (52 lines) but was not included in the batch. It was read for context but findings are limited to what was explicitly in the batch file list.
