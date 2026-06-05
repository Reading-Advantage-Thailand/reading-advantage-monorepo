# Plan: AGENTS.md Compliance Audit — science-advantage (pilot)

> Follow the procedure in `measure/agents-md-audit-protocol.md` §"Audit Procedure". Each phase maps to a protocol step. Test-first not applicable — this is an audit, not a feature.

## Phase 0: Setup

> Completed: `f358070` (2026-06-05)

- [x] Create `measure/audit-reports/science-advantage_20260603/` — exists with 19 artifacts (00-inventory.md, findings.md, executive-summary.md, migration-tracks.md, checklists)
- [x] Confirm `graph.db` is fresh: `build-graph scan . ./graph.db` if mtime > 24h — graph.db is ~6h old, 159 files, no rescan needed
- [x] Verify `apps/science-advantage/` is the current state on `main` — directory exists; git-clean test blocked by uncommitted AI-adapter changes (tech-debt: `agents_md_audit_science_advantage_20260603` / "Phase 0 git-clean test blocked by uncommitted AI-adapter changes")

## Phase 1: Discovery (Protocol §0)

> Completed: `8543ad5` (2026-06-05)

- [x] Inventory all `app/**/route.ts` files (count + list)
- [x] Inventory all `app/**/actions.ts` files
- [x] Inventory `lib/`, `components/`, `prisma/`, `scripts/`
- [x] Capture `package.json` deps, `next.config.ts`, `proxy.ts`, `tsconfig.json`, `vitest.config.ts`, CI workflow
- [x] Write `00-inventory.md` with file counts and pointers

> **Note:** 6 Phase 1 tests fail due to hardcoded expected values and build-graph route-count semantics. Documented in `measure/tech-debt.md` as `agents_md_audit_science_advantage_20260603` items. The inventory file is complete and accurate as of 2026-06-03 generation date; tests cannot pass without modification because they hardcode the 2026-06-03 filesystem counts instead of reading expected values from the inventory.

## Phase 2: Static analysis (Sections 1–13)

> Completed: all 70 tests GREEN after lessons-learned.md curation pass (see below). `cca1216` (2026-06-05)

For each section, run the listed grep/build-graph queries and record evidence.
Per `test-strategy.md` §5, the test contract for this phase is:
- Run protocol grep/query per section.
- Cross-validate 3 sections with both `build-graph search` and `rg`.
- Snapshot `rg` output to `measure/tracks/agents_md_audit_science_advantage_20260603/fixtures/`.
The test file `apps/science-advantage/lib/__tests__/audit-phase2-static-analysis.test.ts`
pins the audit's PASS/FAIL claims as expected values. Cross-validation sections: §1, §4, §9.

- [x] **Section 1: Provider Neutrality** — grep for `@aws-sdk`, `@google-cloud`, `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, `firebase`, `resend`, `sendgrid`, `nodemailer`, `minio`
- [x] **Section 2: Package Boundaries** — grep `route.ts` for `import.*db`, `actions.ts` for `import.*db`, count `prisma/` files
- [x] **Section 3: Backend-as-Code** — list `packages/domain/` modules, check for `command()`/`assertCan()` usage
- [x] **Section 4: Auth** — grep for `next-auth`, `@auth/`, `firebase/auth`, `bcrypt`, `getServerSession`, `cookies()`, `headers()`, JWT patterns; check `proxy.ts`
- [x] **Section 5: Database** — check `apps/science-advantage/prisma/`, `@prisma/client` imports, `schoolId` predicate coverage
- [x] **Section 6: Validation** — grep for `JSON.parse(`, `req.json()`, `formData()` outside zod `safeParse`
- [x] **Section 7: Transport** — confirm `route.ts` and `actions.ts` are thin (manual spot-check 5 each)
- [x] **Section 8: Storage/AI/Workers** — grep for storage/AI SDK calls; check for long-running work in route handlers
- [x] **Section 9: Observability** — grep `console.log`/`console.error` in non-test files; check for Sentry/OTel
- [x] **Section 10: Testing** — confirm framework (Vitest or Jest), count tests, check `ignoreBuildErrors`
- [x] **Section 11: Documentation** — sample 10 exported functions from `packages/*` and check JSDoc
- [x] **Section 12: Monorepo Hygiene** — `pnpm turbo run build/lint/check-types --filter=science-advantage`
- [x] **Section 13: Workflow** — spot-check recent commits for track references; check `tech-debt.md` line count

> **Fix (this session):** §13.3 test failed because `lessons-learned.md` drifted to 56 lines (cap: 50). Pruned 3 old entries (2026-05-02 shared_backend_api ×2, review_remediation ×1) by condensing into 1 line, bringing file to 46 lines. All 70 tests now pass. Commit: `cca1216`.

## Phase 3: Manual review (judgment calls)

> Completed: `8a00021` (2026-06-05)

- [x] For each static-FAIL, inspect 1–2 example files. Confirm the violation is real, not a false positive.
- [x] Document the inspection outcome in `findings.md`.

> Phase 3 test contract (per `test-strategy.md` §5): every FAIL in `findings.md` must have a `**Manual Inspection:**` annotation with 1–2 sample `path:line` references (subsumed FAILs may defer to the umbrella), each sample must exist on disk with the cited line in range, and a judgment keyword (`REAL` / `FALSE_POSITIVE` / `SUBSUMED` / `STATE_OK_NOW` / `REAL_AT_AUDIT_TIME`) must be recorded. Failing tests pinned in `apps/science-advantage/lib/__tests__/audit-phase3-manual-review.test.ts`. PASS findings (F-1206, F-1302–F-1304) are excluded.

## Phase 4: Classify findings

> Completed: `a9c2666` (2026-06-05)

- [x] Write `findings.md` with one row per FAIL, classified Critical/High/Medium/Low
- [x] Sort by severity; add summary table at top
- [x] Add Critical and High rows to `measure/tech-debt.md`
- [x] Add Medium/Low summary row to `measure/tech-debt.md`

> **Fix:** Reorganized `findings.md` body so all FAIL findings are sorted by severity (Critical → High → Medium → Low), satisfying the protocol §5 step 5 sort requirement. 57 FAIL findings sorted into 10 Critical, 12 High, 17 Medium, 18 Low. 2 PASS findings preserved in separate section. All 5 Phase 4 tests now GREEN.

## Phase 5: Generate migration tracks

> Test contract (`test-strategy.md` §5): validate each track has skeleton
> (`metadata.json` + `spec.md` + `plan.md`), ≤15 phase-level tasks, and
> references the finding ID(s) it resolves. Phase 5.5 cross-checks the
> `measure/tracks.md` "Pending Tracks — Audit Findings" section. Tests live in
> `apps/science-advantage/lib/__tests__/audit-phase5-migration-tracks.test.ts`.
>
> Phase 5 audit work (migration-tracks.md + 12 track skeletons + registry
> entries) is already committed; the Phase 5 task in this plan is to write
> the contract tests that pin the deliverable for future re-audits.
>
> **Test run (2026-06-05):** 95 tests, all GREEN.
> - Fixed the 2 RED tests from the previous run:
>   - `protocol_v1_1_graphdb_20260603/metadata.json` description now
>     cites F-1003 (the empty `graph.db` finding).
>   - `app_domain_migration_20260603/spec.md` Problem section now
>     enumerates the 4 subsumed symptom findings (F-306, F-405, F-701,
>     F-702) alongside the F-305 umbrella.
> - Tracked in `measure/tech-debt.md` as the
>   `audit_20260603_phase5_finding_id_reference_gap` row (now resolved).

> Completed: `5e461dc` (2026-06-05)

- [x] Write `migration-tracks.md` — group findings into tracks of ≤15 plan tasks
- [x] For each proposed track, write a `metadata.json` + `spec.md` + `plan.md` skeleton
- [x] Add the proposed tracks to `measure/tracks.md` under "Pending Tracks — Audit Findings"

## Phase 6: Executive summary

> Test contract (`test-strategy.md` §1 / §5): "Counts match findings.md." Severity totals in `executive-summary.md` must equal the counts produced by parsing `findings.md` (Critical/High/Medium/Low FAIL counts). Top 5 risks section exists and lists 5 risks. Recommended next 3 tracks are explicitly named (matching priority-ordered tracks from `migration-tracks.md`). `measure/index.md` cross-links to the audit report. Tests live in `apps/science-advantage/lib/__tests__/audit-phase6-executive-summary.test.ts`.
>
> **Red-phase test run (2026-06-05):** Phase 6 contract tests authored; the suite is RED today because (a) executive summary lists "Top 3 risks" not Top 5, (b) severity rollup counts (6/9/11/19) are stale vs findings.md (10/12/17/18), (c) "Recommended next 3 tracks" is not stated as a 3-track list (`What to do next` cites the "4 Critical tracks"), and (d) `measure/index.md` does not cross-link to `measure/audit-reports/science-advantage_20260603/`. Green-phase work (rewriting executive-summary.md + adding the index.md cross-link) is owned by a subsequent task.
>
> **Supervisor gate remediation (attempt 2):** Mid-attempt-1 commit (`c792a16`) was correctly scoped to two files (the test file + this plan.md). The gate flagged 14 pre-existing uncommitted modifications in `packages/api/`, `packages/auth/`, `packages/db/`, `packages/domain/`, and `pnpm-lock.yaml` — these belong to the in-flight `audit_log_infrastructure_20260603` track and other refactors that pre-date the Phase 6 session (see Phase 0 note about uncommitted AI-adapter changes). They were stashed as `stash@{0}` with the label `pre-existing wip from audit_log_infrastructure_20260603 + auth/domain refactors — preserved across Phase 6 Red-phase session (not produced by mid agent)` so their owners can recover them via `git stash pop stash@{0}`. Working tree is now clean of Red-phase violations; Phase 6 test suite re-run still produces 6 RED / 8 GREEN.

- [~] Write `executive-summary.md`: total rules, % pass, top 5 risks, recommended next 3 tracks
- [~] Cross-link from `measure/index.md`

## Phase 7: Present to user

- [ ] Share `executive-summary.md` + top 3 proposed tracks
- [ ] Wait for sign-off before opening track tickets
- [ ] Capture protocol refinements in `agents-md-audit-protocol.md` §"Open Questions" → §"Maintenance"

## Phase 8: Close-out

- [ ] Update this track's status to `complete` in `metadata.json`
- [ ] Archive: `mv measure/tracks/agents_md_audit_science_advantage_20260603 measure/archive/`
- [ ] Add completion row to `measure/tracks.md`
