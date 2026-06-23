# Implementation Plan: 72h Review Findings Remediation

> Classic FR plan. Each phase follows Contract-First → Test (Red) → Implement (Green).
> Order is by severity: Critical/High first (FR-1..FR-4), then Medium/Low (FR-5..FR-8),
> then docs/doctor + lessons-learned closeout.

## Phase 0: Pre-flight

- [ ] Task: Capture current test/type baselines for the four affected packages.
    - [ ] `pnpm --filter sales-advantage test` + `check-types` (record pass/fail counts)
    - [ ] `pnpm --filter primary-advantage test` + `check-types`
    - [ ] `pnpm --filter @reading-advantage/domain test`; `pnpm --filter @reading-advantage/api test`
- [ ] Task: Confirm reproduction of each finding at its cited file:line; record SHAs/lines as Red evidence.

## Phase 1: FR-1 — Chat route authorization (Critical)

- [ ] Task: Contract — decide enforcement point (route → domain `sendChatMessage`/`assertCan("sales:chat")`, or explicit route gate); document in spec/AGENTS.
- [ ] Task: Test (Red) — add a route test: authenticated non-sales user → 401/403; `SALES_REP` → allowed.
- [ ] Task: Implement (Green) — route the chat handler through the domain `assertCan(user,"sales:chat",tenant)` path (reuse `mutations.ts:287`); keep streaming behavior.
- [ ] Task: Verify no regression in the happy-path chat stream.

## Phase 2: FR-2 — Duplicate-row fan-out in migrated list queries (High)

- [ ] Task: Test (Red) — fixture with a student enrolled in 2 classrooms; assert `getStudents` returns 1 row and `totalCount === 1`.
- [ ] Task: Implement (Green) — fix `studentModel.getStudents` (aggregate classrooms / `selectDistinct` / two-step fetch); make list and count consistent.
- [ ] Task: Audit — grep sibling migrated models (`classroomModel.ts`, `teacherModel.ts`, `assignmentModel.ts`) for `include → flat leftJoin` fan-out; fix or document each.

## Phase 3: FR-3 — Un-awaited transaction + lossy fills in new-generator.ts (High)

- [ ] Task: Test (Red) — assert the article-generation path awaits its write (inner failure rejects the caller) and rejects a row whose `correctAnswer` cannot be derived.
- [ ] Task: Implement (Green) — `await db.transaction(...)`; await the inner `Promise.all`; on failed `correctAnswer`/`content` derivation, fail or skip the row instead of persisting a wrong key.

## Phase 4: FR-4 — Roleplay evaluation grounding + storage/type integrity (High)

- [ ] Task: Contract — define where roleplay excerpts come from (scenario/module curriculum) and align `getScenario` return shape + `SalesDomainContext` db typing with the evaluator inputs.
- [ ] Task: Test (Red) — assert the evaluator receives non-empty excerpts; assert `audioStorageKey` is persisted only on successful upload; assert no `as never` casts needed (type-check).
- [ ] Task: Implement (Green) — pass real excerpts; persist storage key only on success (or null + flag); remove `as never`/`as unknown as` casts via correct types.

## Phase 5: FR-5..FR-6 — Evaluator error causes + permission DRY (Medium)

- [ ] Task: Test (Red) — `EVALUATION_FAILED` exposes underlying cause(s); single-source permission mapping (registration derived from `SALES_PERMISSIONS`).
- [ ] Task: Implement (Green) — attach `{ cause }`/log in `roleplay-evaluator.ts`; refactor `permissions.ts` to derive `registerDomainModulePermissions` from the const.

## Phase 6: FR-7..FR-8 — Rate limiter durability + chat input hardening (Medium/Low)

- [ ] Task: Decide FR-7 — durable limiter (align with `rate_limiter_v2_20260603`) vs. documented best-effort; record the decision (gate with the user).
- [ ] Task: Test (Red) — Zod validation rejects malformed `/api/chat` `messages` payloads; role markers in content are escaped/sanitized.
- [ ] Task: Implement (Green) — apply FR-7 decision; add `messages` Zod schema + sanitization in the chat route.

## Phase 7: Closeout — Docs, Doctor, Lessons Learned

- [ ] Task: Run `measure/generate.sh` (if present) and `measure/doctor.sh`; resolve findings.
- [ ] Task: Add `lessons-learned.md` entry (FR-9 / AC-9): never bend production SQL/code to satisfy a test's structural string assertion (ref `920ff302`→`019b9d83`).
- [ ] Task: Re-run all four package test/type baselines; confirm no regression vs Phase 0.
- [ ] Task: Final acceptance — verify AC-1..AC-9; update metadata + tracks.md on closeout.
