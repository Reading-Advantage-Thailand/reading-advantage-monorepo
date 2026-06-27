# Line-by-Line Review: sa-batch-31

**Track:** `science_advantage_review_20260626`
**Batch:** 31 (20 files — Measure docs, app config, two test files, two backfill scripts, one proxy/middleware module)
**Review Date:** 2026-06-27
**Reviewer:** automated audit agent (ark-code-latest)
**Scope:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
**Constraint:** No app code edits; review only.

---

## Files Reviewed

| # | File | Type |
|---|------|------|
| 1 | `apps/science-advantage/measure/tracks/teacher_dashboard_surfaces_20260425/spec.md` | Specification |
| 2 | `apps/science-advantage/measure/tracks/teacher_delivery_20260311/index.md` | Track index |
| 3 | `apps/science-advantage/measure/tracks/teacher_delivery_20260311/metadata.json` | Track metadata |
| 4 | `apps/science-advantage/measure/tracks/teacher_delivery_20260311/plan.md` | Implementation plan |
| 5 | `apps/science-advantage/measure/tracks/teacher_delivery_20260311/spec.md` | Specification |
| 6 | `apps/science-advantage/measure/tracks/thai_localization_expand_20260425/metadata.json` | Track metadata |
| 7 | `apps/science-advantage/measure/tracks/thai_localization_expand_20260425/plan.md` | Implementation plan |
| 8 | `apps/science-advantage/measure/tracks/thai_localization_expand_20260425/spec.md` | Specification |
| 9 | `apps/science-advantage/measure/workflow.md` | Governance |
| 10 | `apps/science-advantage/next-env.d.ts` | Generated config |
| 11 | `apps/science-advantage/next.config.ts` | App config |
| 12 | `apps/science-advantage/package.json` | Manifest |
| 13 | `apps/science-advantage/playwright.config.ts` | Test config |
| 14 | `apps/science-advantage/postcss.config.mjs` | Build config |
| 15 | `apps/science-advantage/proxy.ts` | Auth middleware (route gating) |
| 16 | `apps/science-advantage/scripts/MANUAL_TEST_INTERVENTION_WIDGET.md` | Manual test doc |
| 17 | `apps/science-advantage/scripts/__tests__/migrate-lesson-content.test.ts` | Unit test |
| 18 | `apps/science-advantage/scripts/__tests__/validate-images.test.ts` | Integration test |
| 19 | `apps/science-advantage/scripts/backfill-mastery.ts` | Backfill script |
| 20 | `apps/science-advantage/scripts/backfill-thai-titles.ts` | Backfill script |

---

## File 1: `teacher_dashboard_surfaces_20260425/spec.md` (11 lines)

### L1-L11 — Entire spec
**F-SA-B31-001 | high | spec-quality**
This is a placeholder spec. It contains a one-line overview ("Build teacher dashboard with class management, progress monitoring, and assignment features") and five generic acceptance criteria ("Implementation complete", "Tests passing", "Build succeeds", "Tech debt updated", "Lessons learned updated"). Missing entirely: functional requirements, non-functional requirements, the authorization model (who can view which class? teacher-owns-class enforcement?), tenancy scoping (schoolId), and architecture decisions. This duplicates the well-developed `teacher_delivery_20260311` track scope (class management, progress, assignment) — see F-SA-B31-009. Not implementable as-is.

### L2 — No track `index.md` / `metadata.json` in batch
**F-SA-B31-002 | low | missing-index**
Only `spec.md` for this track appears in the batch. Other tracks in this batch (`teacher_delivery_20260311`) ship an `index.md` and `metadata.json`. Cannot confirm whether this track has metadata or an index from the batch alone; flagged as a coverage/consistency note (see Limitations).

---

## File 2: `teacher_delivery_20260311/index.md` (5 lines)

**Clean.** Standard Measure track index with links to metadata, spec, and plan. No issues.

---

## File 3: `teacher_delivery_20260311/metadata.json` (11 lines)

### L4 — `"status": "new"`
**Clean.** Plan.md (File 4) shows all tasks `[ ]` (no work started). `"new"` is consistent with plan state. This is correct — unlike several tracks in batch-29 whose status drifted from plan progress.

### L8-L9 — `"estimated_tasks": 10`, `"actual_tasks": null`
Plan has ~10 distinct task lines across 3 phases. Estimate is realistic; `actual_tasks: null` is correct for an unstarted track.

---

## File 4: `teacher_delivery_20260311/plan.md` (37 lines)

### L3-L37 — Phase 1-3
**Clean.** Well-structured, curriculum-first plan. Phase 1 opens with "Define failing tests" (TDD-first per workflow.md L10/L20). Each phase ends with a "Measure - Manual Verification" task, matching the project's phase-completion protocol (workflow.md L48-L56).

### L11-L13 — "Remove or replace placeholder dashboard cards"
**Clean and notable.** Directly supports the "Honest status" principle (workflow.md L11: "do not mark placeholders as shipped capability"). Good alignment.

### L5-L7 — No explicit auth/tenancy task
**F-SA-B31-003 | low | auth-tenancy-gap**
The plan exposes class metadata, roster context, join codes, and student progress — all tenant-scoped, student-PII-adjacent surfaces — but no task explicitly verifies teacher-owns-class authorization or `schoolId` scoping. The monorepo AGENTS.md requires every query be scoped by `schoolId` and that tenant IDs from the frontend not be trusted. Recommend an explicit authorization/tenancy test task before Phase 2 (assignment/progress) lands.

---

## File 5: `teacher_delivery_20260311/spec.md` (51 lines)

### L10-L46 — FR-1 through FR-4, NFRs, Acceptance Criteria
**Clean.** Well-formed functional requirements (curriculum-aware class setup, lesson preview, assignment/pacing, actionable progress). NFRs cover performance under class sizes and admin-free operability. Acceptance criteria are concrete and verifiable.

### L19 / L23 — "preview the exact lesson structure students will see" / "same structured content contract as the student app"
**Clean.** Good golden-path reuse — explicitly shares the structured-content contract with the student app rather than forking a parallel preview model.

### L28-L32 — FR-4: Actionable progress visibility
**F-SA-B31-004 | medium | auth-tenancy-gap**
"Class, student, and lesson detail views must expose progress and completion" — this exposes per-student progress data. The spec never states the authorization boundary (teacher may only see students in classes they own, scoped by `schoolId`). Given the monorepo's multi-tenancy mandate, an explicit access-control requirement is missing. This is the most security-relevant gap in the spec and should be added before implementation.

### L48-L51 — Out of Scope
**Clean.** Clearly excludes school administration and parent communications.

---

## File 6: `thai_localization_expand_20260425/metadata.json` (7 lines)

### L1-L7 — Schema shape differs from sibling tracks
**F-SA-B31-005 | medium | metadata-schema-inconsistency**
This metadata uses keys `id`, `name`, `status`, `created`, `priority`. The sibling track in this same batch (`teacher_delivery_20260311/metadata.json`, File 3) uses `track_id`, `type`, `status`, `created_at`, `updated_at`, `description`, `estimated_tasks`, `actual_tasks`, `deviation_notes`. Two different metadata schemas coexist. Any automation reading `track_id` or `estimated_tasks` will fail or silently skip this track. The Measure metadata schema should be normalized across all tracks.

### L4 — `"status": "pending"`
Consistent with plan (all `[ ]`). No issue beyond the schema mismatch above.

---

## File 7: `thai_localization_expand_20260425/plan.md` (19 lines)

### L1-L19 — All phases
**F-SA-B31-006 | medium | plan-quality**
This is generic boilerplate identical in structure to the `content_release_workflow_20260425` placeholder flagged in batch-29 (F-SA-B29-011): "Set up core infrastructure", "Write failing tests", "Implement core logic", "Wire components together", "Update tech-debt.md", "Commit and push". It is not actionable. For a localization expansion the plan should enumerate concrete work: which lessons/grades, which `structuredContent` block types, how Thai fields are validated against the `LessonContent` Zod schema, and how regression against existing Grade 3/4 content is verified. Compare with `teacher_delivery_20260311/plan.md` (File 4) which has track-specific tasks.

---

## File 8: `thai_localization_expand_20260425/spec.md` (11 lines)

### L1-L11 — Entire spec
**F-SA-B31-007 | high | spec-quality**
Placeholder spec: one-line overview ("Expand Thai localization to all text blocks and structuredContent in Grade 3/4") plus the same five generic acceptance criteria seen in Files 1. Missing functional requirements (which block types? title/description/body? captions?), the bilingual data contract (the repo has `titleThai`/`descriptionThai` and `parseBilingualTitle` — see File 20), validation expectations, and a definition of "all text blocks". Not implementable without expansion. Notably the related, mature `bilingual_architecture_20260428` track (reviewed in batch-29) already defines the bilingual model; this spec should reference it rather than restate scope thinly.

---

## File 9: `workflow.md` (174 lines)

### L31-L40 / L62-L85 — Validation commands use `npm run` and Prisma
**F-SA-B31-008 | high | governance-drift**
The workflow's required-validation and setup commands reference Prisma and npm:
- L33: "`npm run test:integration` when touching route handlers, **Prisma**, or auth"
- L38-L39: "`npx prisma generate`", "relevant **Prisma** sync command"
- L64-L65: "`npx prisma generate`", "`npx prisma db push`"

But `package.json` (File 12) defines **no** Prisma dependency, no `prisma generate` script, and uses **Drizzle** (`drizzle-orm` L66) with `vitest`-based scripts. The commands here are stale relative to the actual toolchain and will not run. This is the same Prisma-vs-Drizzle divergence flagged repo-wide (batch-29 F-SA-B29-021), but here it manifests as broken, un-runnable operator instructions. Additionally the package uses `pnpm`/`vitest`/`next` scripts while workflow.md prescribes `npm run` and Prisma — an agent following workflow.md literally would issue commands that fail.

### L1-L14 — Principles
**Clean and strong.** "Plan is source of truth", "Curriculum first", "Stay inside the stack", "TDD where code changes", "Honest status", "Non-interactive execution / CI=true". These are good governance and consistent with monorepo AGENTS.md.

### L87-L117 — Quality Gates / Definition of Done
**Clean.** Security-posture regression check (L92) and "placeholder work is not presented as complete" (L95) are good. L103 coverage requirement (>80%, also L146) is a concrete bar.

---

## File 10: `next-env.d.ts` (6 lines)

**Clean.** Generated Next.js type-reference file with the standard "should not be edited" notice. L3 imports the generated route types — normal for Next 16. No issue.

---

## File 11: `next.config.ts` (56 lines)

### L18-L42 — Security headers
**Clean and commendable.** Sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS (`max-age=31536000; includeSubDomains`) on all routes. Good baseline security posture.

### L18-L42 — Missing Content-Security-Policy
**F-SA-B31-010 | low | security-hardening**
No `Content-Security-Policy` header is set. CSP is the strongest defense against XSS and is a natural companion to the other headers configured here. Acceptable to defer (CSP requires per-app nonce/source tuning), but worth recording as a hardening gap.

### L15-L17 — `typescript.ignoreBuildErrors: false`
**Clean.** Build fails on type errors — correct strictness posture, matching monorepo expectations.

### L51-L55 — Sentry wrapper
**Clean.** Source-map upload and Sentry are gated behind `SENTRY_AUTH_TOKEN` presence (`disable`/`silent` keyed off the token), with a clear comment explaining the live-runtime initialization rationale. No secret is hardcoded; org/project come from env. Good adapter-style observability wiring.

---

## File 12: `package.json` (109 lines)

### L22-L104 — Caret (`^`) version ranges
**F-SA-B31-011 | low | dependency-pinning (known/grandfathered)**
Most deps use `^` ranges. `apps/science-advantage/AGENTS.md` explicitly grandfathers this ("56 `^`-ranged deps... Strict pinning is deferred to a follow-up track") and notes `pnpm-lock.yaml` is the source of truth. No new violation; recorded for completeness against the deviation note. Note pinned exceptions exist (`next` 16.2.9, `react`/`react-dom` 19.2.7, `@types/react*` via `overrides`), which is consistent.

### L5 — `"type": "module"`
**Clean.** ESM. Consistent with `.mjs`/`.ts` config files in the app.

### L22-L82 — Dependencies; no provider SDKs at app layer
**Clean.** AI/storage are consumed through `@reading-advantage/*` workspace packages (`@reading-advantage/ai`, `domain`, `db`, `auth`), not direct provider SDKs — consistent with the monorepo adapter-neutrality rule. `@sentry/nextjs` and OpenTelemetry are observability infra (acceptable). No `prisma` dependency present, confirming workflow.md's Prisma commands are stale (F-SA-B31-008).

### L10 / L12-L16 — Scripts
**Clean.** `lint` (eslint), `test`/`test:watch` (vitest), `check-types` (tsc --noEmit), `test:integration`, `test:e2e` (playwright) all present and match the AGENTS.md testing guidance.

---

## File 13: `playwright.config.ts` (28 lines)

### L1-L28 — Config
**Clean.** Sensible defaults: `forbidOnly` and `retries: 2` under CI, single worker in CI for determinism, `trace: 'on-first-retry'`. `baseURL` overridable via `E2E_BASE_URL`. `webServer` auto-starts `npm run dev` locally but is skipped in CI (expects an externally provisioned server) — reasonable.

### L16-L18 — Single browser project (chromium only)
**F-SA-B31-012 | low | test-coverage**
Only `chromium` is configured. The manual test doc (File 16, L308-L312) lists Chrome/Firefox/Safari/Edge as targets, and `tech-stack`/responsiveness tracks emphasize tablet/mobile classroom use. Cross-browser and mobile-viewport Playwright projects are absent. Acceptable for an MVP smoke suite; note as coverage debt.

---

## File 14: `postcss.config.mjs` (5 lines)

**Clean.** Minimal Tailwind v4 PostCSS config (`@tailwindcss/postcss`). Matches `tailwindcss@^4` in package.json. No issue.

---

## File 15: `proxy.ts` (118 lines) — Auth route gating

This is the security-critical file of the batch (Next 16 middleware-equivalent; exports `proxy` + `config.matcher`).

### L41-L77 — `/signin` and `/dashboard` handling
**Clean.** Session validated against the DB via `getSession`; bad cookies cleared; authenticated users redirected away from `/signin`. Errors are logged via the structured `logger` (not `console`) and fail safe (redirect to `/signin` with an error param). Good defensive posture.

### L84-L88 — Dev impersonation bypass
**F-SA-B31-013 | medium | auth-bypass (verify gating)**
When `DEV_AUTH_ENABLED` is true and there is no session token, **all role-gated routes** (`/admin`, `/system`, `/teacher`, `/student`) are allowed through with `NextResponse.next()` and **no role check**. This is the documented dev-impersonation affordance, and `lib/env.ts` L137 defaults `DEV_AUTH_ENABLED` to `NODE_ENV === 'development'` (i.e. `false` in production) — so the bypass is correctly off in prod by default. **However**, the control depends entirely on `DEV_AUTH_ENABLED` never being truthy in production. There is no secondary guard (e.g. an assertion that `NODE_ENV !== 'production'`) inside `proxy.ts` itself. Per AGENTS.md ("no dev overrides leaking to prod"), defense-in-depth would add an explicit `env.NODE_ENV !== 'production'` conjunct here so a misconfigured `DEV_AUTH_ENABLED=true` in prod cannot silently open every gated route. Recommend hardening; not a present-state vulnerability given the env default.

### L9-L22 — Role hierarchy via `matchGate`
**F-SA-B31-014 | low | correctness (verify hierarchy semantics)**
The comment (L9-L10) states role hierarchy: STUDENT(1) blocked from TEACHER(2)+, but TEACHER/ADMIN can view STUDENT pages. The actual hierarchy logic lives in `requireRole` (in `@reading-advantage/auth`, L95), not in this file. `matchGate` only resolves the *first* matching prefix. Because `ROLE_GATES` is ordered admin/system/teacher/student and `startsWith` is used, prefixes are mutually exclusive paths so ordering is fine. The hierarchy "TEACHER can view STUDENT pages" therefore depends on `requireRole` treating a higher role as satisfying a lower-role gate — not verifiable from this file. Flag to confirm `requireRole` implements the documented hierarchy (out of batch scope).

### L94-L106 — Error handling on role gate
**Clean.** `FORBIDDEN` → redirect to `/dashboard?error=forbidden`; `UNAUTHORIZED` → clear cookie + redirect to `/signin`; unexpected errors logged and fail to `/signin`. Fails closed (denies access on error). Good.

### L51, L68, L95 — DB calls in middleware
**F-SA-B31-015 | low | performance/runtime**
`getSession(db, ...)` and `requireRole(db, ...)` perform DB I/O inside the proxy/middleware on every gated navigation. This is correct for session validation but Next middleware traditionally runs on the Edge runtime where a Node Postgres client may be unavailable. Confirm this proxy runs on the Node runtime (Next 16 `proxy.ts` does run server-side, so likely fine) and that per-request session DB latency is acceptable. Note as an operational consideration, not a defect.

---

## File 16: `scripts/MANUAL_TEST_INTERVENTION_WIDGET.md` (330 lines)

### Overall
**Largely clean.** Thorough manual test plan covering loading/empty/success/error states, accessibility (keyboard + screen reader), responsive breakpoints, telemetry, performance, and cache behavior. Good QA discipline.

### L33-L34 — Numbering skips from §1 to §3
**F-SA-B31-016 | low | doc-quality**
Section 1 ("Loading State") is followed directly by Section 3 ("Empty State"); there is no Section 2. Minor numbering defect.

### L142-L158 — 401/403 manual checks
**Clean and valuable.** §8.2 (401 on session expiry) and §8.3 (403 when using a `classId` not owned by the teacher) are exactly the right tenancy/authorization checks. This confirms the intervention-alerts API is expected to enforce teacher-owns-class access — good. (The enforcement itself is in API code outside this batch.)

### L316-L321 — Known Limitations
**F-SA-B31-017 | medium | honest-status / placeholder-shipped-risk**
Documents that progress indicators are placeholders (`completed: false`, `started: false`) "until progress tracking is implemented", Thai fields may fall back to English, and slug may fall back to `id`. These are honest disclosures (good, per workflow.md L11), but they confirm the intervention widget surfaces **placeholder progress data** to teachers. This must not be presented in-product as real completion state. Cross-reference `teacher_delivery_20260311` FR-4, which calls for replacing placeholder widgets with real signals.

### L329 — "issue #125"
**F-SA-B31-018 | low | doc-reference**
References an external issue tracker ID (#125) with no link/context. Minor; verify the reference is still valid.

---

## File 17: `scripts/__tests__/migrate-lesson-content.test.ts` (654 lines)

### Overall
**High-quality unit test.** Comprehensive coverage of pure conversion helpers (`computeContentHash`, `parseMarkdownImages`, `countWords`, `mapSectionToBlockType`, `generateBlockId`, `extractImagesFromContent`, `convertSectionToBlock`, `convertMarkdownToLessonContent`), plus a golden-fixture comparison and schema-validation tests. Edge cases (empty/whitespace, Thai content, special chars, deeply nested sub-steps, malformed vocabulary fallback) are well covered.

### L13-L42 — DB mock
**Clean.** Mocks `@reading-advantage/db` with a chainable no-op stub so importing the migration script does not attempt a real DB connection. Uses `vi.importActual` to preserve real exports and only overrides `db`. This matches the AGENTS.md guidance to mock the DB layer in unit tests. Good.

### L297-L321 — "never drop content" / fallback-to-text tests
**Clean and important.** Verifies unknown sections and malformed vocabulary degrade to `TextBlock` rather than losing content — a strong correctness guarantee for a content-migration tool.

### L507-L554 — Golden Fixture test
**F-SA-B31-019 | low | test-strictness**
The golden test compares only `block.type`, array *lengths*, `wordCount`, and image `src` — it does not assert full deep equality against `golden-lesson.expected.json`, despite the fixture presumably containing full expected blocks. A structural-length comparison can pass even when block *contents* regress (e.g., wrong vocabulary definitions, reordered terms). Consider a deep-equal assertion (modulo metadata) to make the golden fixture catch content regressions, not just shape regressions. Functional, but weaker than a true golden test.

### L508-L516 — Synchronous `fs.readFileSync`
**Clean.** Acceptable in a test; deterministic fixture loading.

---

## File 18: `scripts/__tests__/validate-images.test.ts` (94 lines)

### Overall
**Good integration-style asset test.** Validates the lesson image manifest (required fields, filename pattern, alt-text length, licensing/attribution presence) and checks on-disk optimized assets against a 200KB budget and aspect-ratio accuracy via `sharp`.

### L42-L93 — Reads real filesystem assets
**F-SA-B31-020 | low | test-classification/portability**
This test reads from `public/images/lessons` and runs `sharp` against real `.webp` files on disk (L61-L92). It is effectively an integration/fixture test, not a hermetic unit test. If those assets are absent in a CI checkout (or the manifest references a missing file), `fs.stat`/`sharp` will throw and the suite fails for environmental reasons. Confirm these assets are committed and that this test runs in the integration suite (or is appropriately tagged), not the DB-free unit subset described in AGENTS.md.

### L45 — `expect(manifest.images.length).toBeGreaterThanOrEqual(20)`
**Clean.** A reasonable lower bound, and L48's filename regex `^g4-[a-z0-9-]+-\d{2}$` enforces a Grade-4 naming convention. Note the test is implicitly Grade-4-only; if the manifest later includes other grades the regex will reject them (intentional gate, but worth knowing).

### L49-L55 — Accessibility/licensing assertions
**Clean and commendable.** Enforcing alt-text ≥10 chars and non-empty source/license/attribution at test time is a strong content-governance guard.

---

## File 19: `scripts/backfill-mastery.ts` (419 lines)

### Overall
**Well-engineered backfill.** Keyset pagination (L353-L376), idempotency via `scienceMasteryRuns` status (L220-L226), `--dry-run` support, serializable transaction (L310-L312), and `onConflictDoUpdate` upserts (L284-L295). Good operational design for an offline replay job.

### L107-L135, L176-L259 — Uses raw `db`, not tenant-scoped DB
**F-SA-B31-021 | medium | tenancy**
The script queries `scienceAttempts`, `scienceQuestionResponses`, `scienceStandardMastery`, etc. through the raw `db` client with no `schoolId` filter on reads. It does propagate `attempt.schoolId` into inserts (L242, L282), which is correct for write attribution. As an operator-run backfill this is the conventional escape hatch (analogous to AGENTS.md `tenantDb.unscoped(reason)`), and the `--student` filter is the only tenancy-narrowing option. **Risk:** the existing-mastery read at L246-L259 filters only by `studentId` + `standardId`, not `schoolId`. If a `studentId` could ever be associated with rows under a different `schoolId` (or IDs collide across tenants), the calculation could read cross-tenant mastery. Given studentId is presumably globally unique this is likely safe, but the script should document why unscoped access is acceptable here (a greppable reason string per AGENTS.md) and ideally constrain reads by the attempt's `schoolId`.

### L160 — `answeredAt ?? attempt.completedAt ?? new Date()`
**F-SA-B31-022 | low | correctness (determinism)**
Falling back to `new Date()` when both `answeredAt` and `completedAt` are null makes the backfill non-deterministic and time-of-run dependent for the affected responses. For a historical replay, a missing timestamp ideally should be skipped or use a deterministic sentinel rather than wall-clock now, which could distort mastery recency/decay computations. Edge case (both null is unlikely given the `isNotNull(completedAt)` guard at L335), but the per-response `answeredAt` can still be null.

### L352, L416-L419 — `while (true)` loop and top-level error handling
**Clean.** Loop exits on empty page (L378-L380) and on null cursor `completedAt` (L402-L405). The keyset cursor uses `(completedAt, id)` compound ordering correctly to avoid skipping rows with duplicate timestamps. `main().catch` exits non-zero on failure. Good.

### L327-L413 — `console.log` progress output
**Clean.** ESLint `no-console` is disabled for `scripts/**` (verified in `eslint.config.mjs`), and these are CLI tools that legitimately log. Consistent with the documented exemption.

### L211-L313 — Transaction boundary
**Clean.** The run-status flip to `PROCESSING`, mastery upserts, and final `COMPLETED` are all inside one serializable transaction, so a crash leaves the run reprocessable. Good idempotency/atomicity.

---

## File 20: `scripts/backfill-thai-titles.ts` (71 lines)

### Overall
**Simple, correct one-shot backfill.** Reads all lessons, splits bilingual titles via `parseBilingualTitle`, and writes `title`/`titleThai`. Idempotent: skips lessons that already have `titleThai !== null` (L32-L35). Clear summary output and non-zero exit on failure.

### L18-L25 / L44-L50 — Uses raw `db` with no `schoolId` scoping
**F-SA-B31-023 | medium | tenancy**
`db.select().from(scienceLessons)` (L18-L25) loads **every lesson across all tenants**, and the update (L44-L50) is keyed only by `lesson.id`. For a content backfill of bilingual titles this is likely intended (lessons may be shared catalog content), but the script neither documents that nor offers a `--school`/`--grade` scoping option. Per AGENTS.md, unscoped multi-tenant access should carry a greppable justification. Lower risk than File 19 because titles are not student PII, but the unscoped full-table mutation should be acknowledged.

### L31-L54 — Sequential per-row `await` updates
**F-SA-B31-024 | low | performance**
Updates run one-at-a-time in a loop with no batching/transaction. Fine for a small lesson catalog; if lesson counts grow large this becomes slow and non-atomic (a mid-run failure leaves a partial backfill). Acceptable for current scale; note as a scalability consideration.

### L37-L42 — `parseBilingualTitle` returning `thai === null` → skip
**Clean.** Lessons without the " / " delimiter are correctly left untouched and counted as skipped. Sensible degradation.

---

## Cross-Cutting Findings

### F-SA-B31-025 | high | placeholder-spec-cluster
Two of three specs in this batch (`teacher_dashboard_surfaces_20260425`, `thai_localization_expand_20260425`) are non-actionable placeholder specs (11 lines, generic acceptance criteria). This mirrors the batch-29 pattern (`content_release_workflow`). Meanwhile the older `teacher_delivery_20260311` spec is well-developed. The two thin specs also **overlap** with mature tracks: `teacher_dashboard_surfaces` duplicates `teacher_delivery` scope, and `thai_localization_expand` duplicates `bilingual_architecture` scope. Recommend either folding them into the mature tracks or expanding them before they move out of `pending`/`new`.

### F-SA-B31-026 | high | workflow-toolchain-drift
`workflow.md` prescribes Prisma (`npx prisma generate`, `prisma db push`) and `npm run` commands, but the app has no Prisma dependency and uses Drizzle + the documented `pnpm`/vitest scripts. An operator or agent following workflow.md verbatim would run failing/no-op commands. This is the local manifestation of the repo-wide Prisma→Drizzle migration debt (batch-29 F-SA-B29-021) and should be corrected in the app's own governance docs.

### F-SA-B31-027 | medium | metadata-schema-inconsistency
Track metadata files use two incompatible schemas: the rich form (`track_id`, `type`, `estimated_tasks`, `deviation_notes` — File 3) and a minimal form (`id`, `name`, `priority` — File 6). Automation keyed on either schema will mishandle the other. Normalize the Measure metadata schema across tracks.

### F-SA-B31-028 | medium | auth-tenancy-not-specified-in-teacher-specs
The teacher-facing specs/plans (Files 1, 4, 5) surface per-student progress and class rosters but do not state the authorization boundary (teacher-owns-class, `schoolId` scoping). The manual test doc (File 16 §8.3) *does* expect 403 on a non-owned class, implying the API enforces it — but the specs themselves omit the requirement. Specs should encode the tenancy/authorization contract explicitly so it is testable and not merely implied by a manual QA step.

### F-SA-B31-029 | medium | unscoped-db-in-backfills
Both backfill scripts (Files 19, 20) access tenant tables via raw `db` with no `schoolId` scoping and no documented justification. AGENTS.md requires a greppable reason for unscoped tenant access (the `tenantDb.unscoped("reason")` pattern). Operator backfills are a legitimate use of unscoped access, but the scripts should carry an explicit comment justifying it, and File 19's existing-mastery read would be safer constrained by the attempt's `schoolId`.

### F-SA-B31-030 | medium | dev-auth-bypass-defense-in-depth
`proxy.ts` opens all role-gated routes when `DEV_AUTH_ENABLED` is truthy and no session exists, relying solely on the env default to keep it off in production. A redundant `NODE_ENV !== 'production'` guard inside the proxy would prevent a misconfiguration from disabling all route auth in prod. Not a present-state vulnerability (env defaults to false in prod) but a worthwhile hardening per AGENTS.md "no dev overrides leaking to prod."

### F-SA-B31-031 | low | positive-baselines
Several files demonstrate good golden-path/baseline patterns worth preserving: `next.config.ts` security headers + token-gated Sentry; `proxy.ts` fail-closed session/role handling with structured logging; `migrate-lesson-content.test.ts` DB-mock + golden-fixture + "never drop content" tests; `validate-images.test.ts` accessibility/licensing assertions; `backfill-mastery.ts` idempotent serializable replay with keyset pagination. These are reference-quality and should be cited as exemplars in lessons-learned.

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| High | 5 |
| Medium | 9 |
| Low | 17 |
| **Total** | **31** |

High-severity IDs: F-SA-B31-001, F-SA-B31-007, F-SA-B31-008, F-SA-B31-025, F-SA-B31-026.

### Top Risks
1. **workflow.md prescribes a non-existent Prisma/npm toolchain** (F-SA-B31-008/026) — operator/agent instructions are broken against the real Drizzle+pnpm stack.
2. **Two placeholder specs** (F-SA-B31-001/007/025) that also duplicate mature tracks — not implementable and risk scope fragmentation.
3. **Teacher specs omit the authorization/tenancy contract** (F-SA-B31-004/028) for per-student progress and rosters — security-relevant requirement only implied by a manual QA step.
4. **Unscoped raw-`db` access in both backfills** (F-SA-B31-021/023/029) — legitimate but undocumented; File 19's mastery read is not `schoolId`-constrained.
5. **Dev-auth bypass relies on a single env default** (F-SA-B31-013/030) — wants defense-in-depth against prod misconfiguration.

### No Acceptance/Closeout Claims
This is a line-review report only. No acceptance, closeout, verification, or sign-off claims are made for any track, file, phase, or the batch as a whole.

---

## Limitations

1. **Mixed batch.** This batch spans Measure docs, app/build/test config, two test files, one auth-middleware module (`proxy.ts`), and two backfill scripts. Findings vary in depth accordingly.
2. **Cross-file behavior not fully traceable.** `proxy.ts` delegates role-hierarchy semantics to `requireRole`/`getSession` in `@reading-advantage/auth` (out of batch). The documented "TEACHER can view STUDENT pages" hierarchy (F-SA-B31-014) was not verified against that package's implementation.
3. **`teacher_dashboard_surfaces_20260425`** appears in the batch only via its `spec.md`; its `index.md`/`metadata.json` (if any) were not in the file list, so track-status consistency could not be cross-checked.
4. **`validate-images.test.ts`** depends on on-disk assets and the live manifest; the test's pass/fail behavior could not be executed here (review is static, no app code run).
5. **Tenancy findings on backfill scripts** assume `studentId`/`lesson.id` global uniqueness; the actual cross-tenant collision risk depends on the DB schema in `@reading-advantage/db` (not in this batch).
6. **`env.ts` default** for `DEV_AUTH_ENABLED` was confirmed (`NODE_ENV === 'development'`, L137), but actual production env configuration cannot be verified from source.
7. **No app code was edited.** All findings are observations; no fixes were applied.
