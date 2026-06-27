# Line Review — cc-batch-08

- Track: `codecamp_advantage_review_20260626`
- Batch: `cc-batch-08` (20 files)
- Reviewer scope: curriculum/progression correctness, GitHub/webhook/AI integration risk, auth/role boundaries, production readiness, AGENTS.md compliance, test quality.
- Source code edited: none (read-only review). One throwaway probe file was created and deleted under `packages/domain`; no batch source changed.
- Finding ID prefix: `F-CC-B08-###`. Severity scale: Critical / High / Medium / Low / Info.

> This is a line-review report only. It makes **no** acceptance or closeout claim for the track or any phase.

---

## Files reviewed (20/20)

1. `packages/db/src/__tests__/codecamp-curriculum-data-phase-b.test.ts`
2. `packages/db/src/__tests__/codecamp-curriculum-data-phase-c.test.ts`
3. `packages/db/src/__tests__/codecamp-curriculum-data-phase-d.test.ts`
4. `packages/db/src/__tests__/codecamp-curriculum-data.test.ts`
5. `packages/db/src/__tests__/codecamp-curriculum-fidelity.test.ts`
6. `packages/db/src/__tests__/codecamp-stale-seed.test.ts`
7. `packages/db/src/schema/codecamp.ts`
8. `packages/db/src/seed/codecamp-backfill-exercises.ts`
9. `packages/db/src/seed/codecamp-curriculum-data.ts`
10. `packages/db/src/seed/codecamp-seed.ts`
11. `packages/domain/src/__tests__/codecamp-github-identity.test.ts`
12. `packages/domain/src/__tests__/codecamp-github-issues.test.ts`
13. `packages/domain/src/__tests__/codecamp-quiz-progression.test.ts`
14. `packages/domain/src/__tests__/codecamp.test.ts`
15. `packages/domain/src/codecamp/chat.ts`
16. `packages/domain/src/codecamp/errors.ts`
17. `packages/domain/src/codecamp/exercises.ts`
18. `packages/domain/src/codecamp/github-issues.ts`
19. `packages/domain/src/codecamp/index.ts`
20. `packages/domain/src/codecamp/intern-accounts.ts`

---

## Cross-cutting / highest-priority findings

### F-CC-B08-001 — Critical — Domain read paths select REFERENTIAL codecamp tables directly through `TenantDB`; in the compiled/production build these throw `TenantScopeError`.

Affected batch files and lines:
- `chat.ts:52` (`getChatHistory` — `db.select().from(codecampChatConversations)`), `chat.ts:56` (`codecampChatMessages`), `chat.ts:75` (`getUserConversations`), `chat.ts:93` + `chat.ts:99` + `chat.ts:102` (`getChatContext` — `codecampModules`/`codecampLessons`).
- `exercises.ts:17` (`submitExerciseAttempt`), `exercises.ts:45` (`getExerciseRepos`), `exercises.ts:59` (`getExerciseRepoByUrl`), `exercises.ts:74`/`78` (`linkExerciseRepo`).
- `intern-accounts.ts:88–108` (`listInterns`) and `intern-accounts.ts:158–166` (`getInternProgress`) — selects on `codecampModules`, `codecampLessons`, `codecampUserProgress`, `codecampExerciseRepos`, `codecampPrReviews`.

Evidence gathered during review:
- `packages/domain/src/tenant-registry.ts:184–193` registers all `codecamp*` tables as `REFERENTIAL`. The compiled `dist/tenant-registry.js:78–87` matches.
- `db-contract.ts` `createTenantDB` throws `TenantScopeError` on `select().from()` of a `REFERENTIAL` table (db-contract.ts:350–359).
- Direct probe against the **compiled** build confirmed the throw for both null and non-null tenants:
  - `createTenantDB(fakeDb,{schoolId:'s1'}).select().from(codecampChatConversations)` → `TenantScopeError`
  - `…from(codecampExerciseRepos)` → `TenantScopeError`
  - null-tenant variant → `TenantScopeError`
- The codecamp tRPC router passes `ctx.tenantDb` to every one of these functions (`packages/api/src/routers/codecamp.ts:209,236,251,316,332,522,537`, etc.).

Net: as built, the chat-history, conversation-list, chat-context, exercise-repo, and intern-dashboard reads would raise `TenantScopeError` at runtime. `chat.ts` `saveChatMessage` correctly calls `db.unscoped(...)` (chat.ts:16); `progress.ts`/`modules.ts` (out of batch) use `unscoped` in some functions but the batch read functions above do **not**. This is an inconsistent/incomplete `unscoped()` migration. AGENTS.md (TenantDB section) requires REFERENTIAL tables be accessed via `tenantDb.unscoped("reason")`.

Caveat / limitation: I could not exercise the live app. See F-CC-B08-002 — the unit suite does **not** catch this because in the Vitest environment these same tables classify as `EXEMPT` (pass-through, no throw), so the tests give false confidence. Severity is set on the compiled-build evidence; if a deployed build differs from `dist/`, confirm against the actual deploy artifact before remediating.

### F-CC-B08-002 — High — Unit tests cannot detect the TenantDB scoping divergence (false-green); codecamp tables resolve to `EXEMPT` under Vitest but `REFERENTIAL` under the compiled build.

In the Vitest runtime, `classifyTable(codecampChatConversations)` / `articles` / `classroomStudents` all returned `EXEMPT`, while the same lookups against `dist/tenant-registry.js` returned `REFERENTIAL`. Because the proxy treats `EXEMPT` as pass-through, every codecamp test in `codecamp.test.ts`, `codecamp-quiz-progression.test.ts`, and `codecamp-github-identity.test.ts` exercises the *non-scoped* path and therefore never observes the `TenantScopeError` that the production build raises (see F-CC-B08-001). This is a test-environment/registry-identity mismatch (the Vitest module graph appears to register or look up table identities differently than the compiled graph). The practical consequence: the test layer cannot regression-guard tenant-scope enforcement for codecamp. Recommend a dedicated test that asserts the *intended* classification of a `codecamp*` table and that a `TenantDB.select` on it throws, importing through the same module path the registry uses. Affects all four domain test files in this batch indirectly.

### F-CC-B08-003 — High — `createInternAccount` performs FLAT inserts with explicit `schoolId: null`, which throws under a school-scoped admin tenant.

`intern-accounts.ts:41–50`: the `users` insert sets `schoolId: null` explicitly, and the `accounts` insert follows. `users` is a FLAT table. Probe against the compiled `createTenantDB({schoolId:'s1'})` confirmed:
`Insert into FLAT table has conflicting schoolId: got "null", expected "s1"` → `TenantScopeError`.
If a codecamp admin is ever authenticated with a non-null `tenant.schoolId` (the tRPC context derives `tenant.schoolId` from `session.user.schoolId`, context.ts:58–60), intern creation throws. It only works when the acting admin's `schoolId` is null. This is an implicit, undocumented coupling between "codecamp admin must be a global (null-school) user" and the insert path. Recommend either using `db.unscoped(...)` for these global-account inserts (and documenting that intern/account rows are intentionally global), or removing the explicit `schoolId: null` so the FLAT proxy can inject. The accompanying tests pass only because of F-CC-B08-002 (admin fixture uses `schoolId:"s1"` but the proxy never enforces).

---

## Per-file findings

### `packages/db/src/schema/codecamp.ts`

- **F-CC-B08-004 — Medium — `codecampChatMessages` has no `updatedAt` and no length bound on `content`.** Lines 106–114. Messages are append-only (reasonable), but `content` is unbounded `text`. AI chat content should have a server-enforced size cap somewhere on the write path; confirm the Zod input schema (`chatMessageInputSchema`, out of batch) bounds message length, otherwise a very large message persists unbounded.
- **F-CC-B08-005 — Medium — `codecampWebhookEvents.payloadJson` stores raw webhook payloads with no retention/PII note.** Lines 152–163. Raw GitHub payloads may contain usernames, emails, repo metadata. There is no TTL/retention or redaction. For production readiness, document retention and confirm no secrets (tokens) are persisted in `payloadJson`.
- **F-CC-B08-006 — Low — `codecampChatMessages.role` is a free-text column, not an enum.** Line 111 (`role: text("role")`, comment `'user' | 'assistant'`). Other status fields use `pgEnum`. A DB-level enum (or check constraint) would prevent invalid roles from being persisted by any non-domain writer.
- **F-CC-B08-007 — Low — Empty index callback on `codecampLessons`.** Lines 36–39: the table's extra-config callback returns an empty array with a comment explaining no index is added on `module_id`. `module_id` is the primary lookup key for per-module lesson queries (`getLessonsForModule`, seed, backfill). For curriculum scale this is fine, but the comment ("no explicit index needed") is an assertion worth validating against query plans before scale-up.
- **F-CC-B08-008 — Info — `codecampUserProgress` correctly enforces `(userId, lessonId)` uniqueness.** Line 89. Good — this underpins the monotonic upsert in `progress.ts`.

### `packages/db/src/seed/codecamp-curriculum-data.ts` (3674 lines, largely static content)

- **F-CC-B08-009 — Low — Hardcoded technology version strings embedded throughout lesson content will silently drift from the monorepo.** e.g. `React 19.2.5`, `Next.js 16.0.0`, `Zod 3.25.76`, `Drizzle ORM 0.44.7`, `Vitest 4.1.5`, `pnpm 8.15.8`, `Vercel AI SDK 4.3.19`. The phase tests (files 1–4) pin these exact strings (e.g. phase-b test lines 105–108, phase-d lines 123–129), so a real dependency bump makes curriculum prose and tests stale together with no link to actual `package.json`. Informational: acceptable for static teaching copy, but there is no single source of truth tying these to installed versions.
- **F-CC-B08-010 — Info — `MODULE_REPO_MAP` (lines 2715–2798) intentionally omits `dev-environment` and `monorepo-packages`, and maps `real-world-practice` to the capstone `codecamp-progress-tracker` repo.** This is consistent with `getExerciseRepos` (2805–2818), backfill `getModulesWithExerciseRepos` (backfill:60–62), and phase-A/D tests. No defect; documents intended exclusions.
- **F-CC-B08-011 — Info — `PORTFOLIO_PROJECTS` Phase C and Phase D both point at `codecamp-progress-tracker`.** Lines 2846 and 2853. Intentional (D extends C's project to production), but the duplicate URL is easy to mistake for a copy-paste error; a comment would help.
- **F-CC-B08-012 — Low — Embedded code samples are teaching content, not linted/compiled.** e.g. the rate-limit sample (line 3119) and tRPC context sample (line 2579). These won't be type-checked, so they can rot relative to the real adapter/auth APIs they illustrate. Acceptable for curriculum; flagged for maintenance awareness.

### `packages/db/src/seed/codecamp-seed.ts`

- **F-CC-B08-013 — Medium — Seed `onConflictDoUpdate` for modules does not update `slug`/identity but is otherwise idempotent; "insert only missing lesson *types*" can leave a module under-seeded.** Lines 104–166: for an existing module, the seed inserts a lesson only if its `type` is not already present (`existingTypes.has(lesson.type)`, line 118). If a module legitimately has multiple `theory` lessons in the canonical data but the DB already has one `theory` lesson, the remaining theory lessons are skipped forever. Given Phase A `javascript` has 8 lessons (mostly theory), a partially-seeded module would never converge to the full lesson set on re-run. The new-module path (170–211) inserts all lessons, so this only bites modules seeded before their lesson list grew. Recommend keying on `(moduleId, order)` or `(moduleId, title)` rather than `type`.
- **F-CC-B08-014 — Low — Exercise-repo reconciliation uses "first repo per module" semantics.** Lines 227–249 select `existingRepo` with `.limit(1)` by `moduleId` and update it; the schema allows one repo per module in practice but the unique constraint is on `repoUrl`, not `moduleId`. If a module ever had two repo rows, the seed updates an arbitrary one. Minor data-hygiene risk.
- **F-CC-B08-015 — Low — Stale-module handling unpublishes but never deletes; orphaned lessons/progress remain.** Lines 273–292 set stale modules to `draft`. Lessons/progress under a stale module persist (by design, to preserve student progress), but there is no surfaced count of orphaned lessons. Acceptable; documented behavior.
- **F-CC-B08-016 — Info — Direct-connection + `isMain` guard are correct and well-documented.** Lines 1–7, 306–329: uses `DIRECT_DATABASE_URL`, warns on fallback, and only runs `seed()` when executed directly via `pathToFileURL` comparison (correctly handles spaces/unicode). Good production hygiene.

### `packages/db/src/seed/codecamp-backfill-exercises.ts`

- **F-CC-B08-017 — Medium — Backfill ordering can collide with existing lesson `order` values.** Lines 215–261: `exerciseOrder = lastTheory.order + 1`, then the combined quiz lesson is bumped to `exerciseOrder + 1` only if `combinedLesson.order <= exerciseOrder`. If a module has other lessons already occupying `lastTheory.order + 1` (not just the quiz), the new exercise lesson collides on `order` with them — there is no unique constraint on `(moduleId, order)`, so two lessons can share an order, making UI sequencing nondeterministic. Recommend computing a gap-free reordering for the whole module rather than a local +1.
- **F-CC-B08-018 — Low — `getExerciseLessonData` title rewrite is brittle string surgery.** Line 99: `exerciseLesson.title.replace(" Exercise + Quiz", " Exercise")`. If the canonical title format ever changes (e.g. "Exercise & Quiz"), the rewrite silently no-ops and the exercise lesson inherits the combined title. Low risk; depends on the title convention staying exact.
- **F-CC-B08-019 — Info — Dry-run-by-default is good production hygiene.** Lines 32, 219–227, 293–295. Defaults to dry-run; requires `--apply`.

### `packages/domain/src/codecamp/chat.ts`

- (See F-CC-B08-001 for the REFERENTIAL/TenantDB issue affecting `getChatHistory`, `getUserConversations`, `getChatContext`.)
- **F-CC-B08-020 — Medium — Errors are thrown as bare `Error("Conversation not found")` rather than the typed `ConversationNotFoundError` defined in `errors.ts`.** Lines 25, 32, 54. The router's `mapDomainError` keys on the exact string `"Conversation not found"` (codecamp.ts:55), so it works, but it bypasses the typed error hierarchy this batch ships (`errors.ts:29–34`). String-keyed error mapping is fragile; a typo in either place silently degrades a 404 to a 500. Prefer throwing `ConversationNotFoundError`.
- **F-CC-B08-021 — Low — Assistant-message branch lets an authenticated `codecamp:chat` caller write `role:"assistant"` into any conversation they own.** Lines 19, 26–33, 35–36. `saveChatMessage` accepts `role` from `input`. The router relies on `chatMessageInputSchema` stripping `role` from client input (validated by `codecamp.test.ts:1915–1935`), so the transport layer is the only thing preventing a client from forging assistant turns. The domain function itself trusts the `role` it is given. Defense-in-depth: the domain layer should not accept `role` from the same input object that may carry untrusted client fields; pass assistant writes through a distinct internal entry point. Currently safe only because the Zod schema omits `role`.
- **F-CC-B08-022 — Low — Conversation `title` is derived from the first user message with a naive 60-char slice.** Line 28. Unbounded message length (F-CC-B08-004) plus `slice(0,60)` is fine for the title, but confirm message length itself is bounded upstream.

### `packages/domain/src/codecamp/exercises.ts`

- (See F-CC-B08-001 for the REFERENTIAL/TenantDB issue affecting all four functions.)
- **F-CC-B08-023 — Medium — `submitExerciseAttempt` always returns `passed:false` and never evaluates code.** Lines 23–28. The function persists `in_progress` and returns a canned "Submitted for review." This is by design (review happens via PR/AI elsewhere), but the name implies evaluation. The `expectedOutput`/`starterCode` columns exist (schema 48–49) yet are never used here. Confirm no UI treats `passed` as authoritative completion. Flagged for production-readiness clarity.
- **F-CC-B08-024 — Low — `getExerciseRepoByUrl` normalizes the *input* URL but the stored value may not be normalized identically.** Line 58 strips trailing `.git` and `/` from the query input; the seed/`linkExerciseRepo` store whatever URL is provided. `linkExerciseRepo` (line 78–80) does **not** normalize before the duplicate check or insert, so a repo stored with a trailing slash or `.git` would not be found by a normalized lookup, and the duplicate guard could be bypassed by `.git`-vs-not variants. Recommend normalizing on write as well as read.
- **F-CC-B08-025 — Low — `linkExerciseRepo` duplicate check races with the unique constraint.** Lines 78–84: select-then-insert without a transaction; concurrent calls can both pass the check and then one hits the `repoUrl` unique constraint (schema 128) with a raw DB error instead of the friendly "already exists". Low likelihood (admin-only), but the friendly message is not guaranteed.

### `packages/domain/src/codecamp/github-issues.ts`

- **F-CC-B08-026 — Low — Swallows all GitHub errors and returns `[]`, masking auth/config failures as "no issues".** Lines 23–26: `catch` logs a `console.warn` and returns an empty array. A 401/403 (bad/missing GitHub App credentials) is indistinguishable from a repo with zero open issues. For Module 18 this means a misconfiguration silently presents students an empty practice list. Recommend distinguishing transport/auth errors (surface or log structured) from genuinely-empty results.
- **F-CC-B08-027 — Low — Uses `console.warn` rather than structured logging.** Line 24. AGENTS.md Observability section asks for structured logs in production code; the rest of the API layer uses JSON logs (`codecamp.ts:46`).
- **F-CC-B08-028 — Info — Correctly routes through the `@reading-advantage/integrations-github` adapter (no direct `fetch`/Octokit).** Lines 15–22. Compliant with the provider-neutrality rule; dynamic `import()` keeps the GitHub dependency lazy.

### `packages/domain/src/codecamp/intern-accounts.ts`

- (See F-CC-B08-001 and F-CC-B08-003 for TenantDB issues affecting `listInterns`, `getInternProgress`, `createInternAccount`.)
- **F-CC-B08-029 — Medium — `createInternAccount` is not transactional across the two existence checks and the insert.** Lines 30–53: username-exists check (30), github-exists check (33), then a transaction that inserts user+account (40–53). The two pre-checks run *outside* the transaction, so concurrent creates can both pass and then collide on the `users.username` / `users.githubUsername` unique constraints (users.ts:32) — raising a raw DB error instead of the friendly message. Move the checks inside the transaction or rely on constraint-violation mapping.
- **F-CC-B08-030 — Low — `PASSWORD_COMPLEXITY` enforces character classes but no minimum length in the domain layer.** Line 10, 23–25. The regex requires lower+upper+digit but not length; length (`min(8)`) is only enforced by the Zod `internAccountInputSchema` (types/codecamp.ts:340). Anyone calling the domain function directly (worker/CLI/test) bypasses the length floor. AGENTS.md requires validation at the boundary, but a domain-level length assert would be defense-in-depth. Note `createInternAccount` test passes `"Password1"` (9 chars) so the gap is untested.
- **F-CC-B08-031 — Low — GitHub username defaulting silently coerces login into a GitHub handle.** Line 28: `normalizedGithubUsername = (input.githubUsername || input.username)…`. An intern with no GitHub account gets a `githubUsername` equal to their login username, which then participates in the `users.githubUsername` unique check and could collide or mis-attribute a webhook PR to the wrong intern (webhook matching is by github username, schema `codecampWebhookEvents.githubUsername`). Recommend leaving `githubUsername` null when not provided rather than fabricating one.
- **F-CC-B08-032 — Low — `listInterns`/`getInternProgress` "current module" and quiz-average computations are done in-memory across all interns/modules.** Lines 111–146, 168–190. Fine at intern-cohort scale; flagged only as a scale-awareness note (N interns × M modules × L lessons fan-out with `.find`/`.filter` per row).

---

## Test-quality findings

### `packages/domain/src/__tests__/codecamp.test.ts`

- **F-CC-B08-033 — High — The hand-rolled `db.select` mocks bypass the `TenantDB` proxy semantics, so none of the tenant-scope guarantees are actually verified.** Throughout (e.g. 75–90, 166–187, 318–344): tests replace `db.select` with a `vi.fn()` chain and wrap in `createTenantDB`, but because codecamp tables resolve to `EXEMPT` in Vitest (F-CC-B08-002), the proxy never injects/blocks anything. The suite therefore validates business logic but provides zero coverage of multi-tenant isolation — the most security-sensitive property. Same pattern in `codecamp-quiz-progression.test.ts` and `codecamp-github-identity.test.ts`.
- **F-CC-B08-034 — Medium — Mocks encode call-ordering assumptions (`selectCallCount === 1/2/3`) that are brittle.** e.g. 74–90, 318–344, 1794–1822. Any reordering of internal queries in the domain functions silently changes which fixture a call receives, potentially producing false passes/failures unrelated to behavior. The `selectSequence` helper in `mock-db` is the more robust pattern and is used elsewhere; the inline counters are fragile.
- **F-CC-B08-035 — Low — `updateUserProgress` monotonic-SQL test asserts on rendered SQL substrings.** Lines 753–764: renders the `onConflictDoUpdate` `status` expression and asserts it contains `"completed"` and `"excluded.status"`. Good that monotonicity is pinned, but substring matching on rendered SQL is coupled to Drizzle's output format and would break on a Drizzle upgrade. Acceptable given the importance of the invariant.
- **F-CC-B08-036 — Low — `getPrReviewByPrUrl` "SYSTEM user" test (1400–1414) confirms a broad read grant.** `codecamp:read` includes `SYSTEM` (permissions.ts:4). This is presumably for the webhook pipeline; confirm the SYSTEM role is only assumable by server-side webhook processing and never by a client session. Auth-boundary note, not a defect in this file.
- **F-CC-B08-037 — Info — JSONB runtime-validation tests (2089–2185) are good defensive coverage** for malformed `contentJson`/`hintsJson`/`optionsJson`, matching AGENTS.md's "validate at boundaries" guidance.

### `packages/domain/src/__tests__/codecamp-quiz-progression.test.ts`

- **F-CC-B08-038 — Low — Pass-threshold tests only cover 10%, exactly-70%, and 100%; no test for 69% (just-below boundary).** Lines 105–184. The exact-70 boundary is tested (good), but a 69%→fail case would harden the `>=` vs `>` boundary against regression. The `QUIZ_PASS_THRESHOLD === 70` test (35–38) is good.
- **F-CC-B08-039 — Info — Tests verify the persisted `status` (`in_progress` vs `completed`) by inspecting insert payloads** (127–131, etc.), which is meaningful coverage of progression correctness.

### `packages/domain/src/__tests__/codecamp-github-identity.test.ts`

- **F-CC-B08-040 — Medium — PR-URL validation is well covered, but all "happy path" creates rely on the unscoped/EXEMPT artifact (F-CC-B08-002).** Lines 230–415 thoroughly cover malformed URL, wrong repo, non-GitHub host, issue-vs-PR, missing pull number, and `.git` suffix — strong integration-risk coverage. However the create assertions (256–265, 407–415) would not run in a build where `codecampPrReviews`/`codecampExerciseRepos` are REFERENTIAL (they'd throw before validation). Coverage is real for the validation logic but not for the end-to-end persisted path under production scoping.
- **F-CC-B08-041 — Low — The normalized-githubUsername assertions are guarded by `if (insertPayload)`.** Lines 65–67: if the mock introspection fails to find the payload, the assertion is silently skipped and the test still passes on the top-level `expect(result.githubUsername)`. The conditional weakens the "values passed to insert" check.

### `packages/domain/src/__tests__/codecamp-github-issues.test.ts`

- **F-CC-B08-042 — Low — `returns empty array when GitHubClient throws` (43–47) pins the error-swallowing behavior flagged in F-CC-B08-026.** The test cements that auth/transport failures look identical to "no issues" — i.e., it locks in the questionable behavior rather than asserting error differentiation.
- **F-CC-B08-043 — Info — Adapter is correctly mocked at the `@reading-advantage/integrations-github` boundary** (5–11), consistent with provider-neutrality.

### `packages/db/src/__tests__/codecamp-curriculum-data*.test.ts` (phase A/B/C/D) and `codecamp-curriculum-fidelity.test.ts`

- **F-CC-B08-044 — Info — Strong structural pinning of the curriculum** (module counts, order ranges, phase labels, lesson counts, quiz-last invariant, ≥3 questions/quiz, repo-map exclusions). Phase A test (file 4) lines 7–115, phase B 7–114, phase C 7–111, phase D 7–135.
- **F-CC-B08-045 — Low — The fidelity test documents a brief/data mismatch instead of resolving it.** `codecamp-curriculum-fidelity.test.ts:33–39,150–164`: the task brief said "Unit 11 = Authentication (Phase B)" but the seed has it at order=13/Phase C; the tests assert the seed's values and annotate the discrepancy. This is honest, but it means a real curriculum-numbering error and a brief error are indistinguishable — the test cannot fail to flag a future genuine mis-placement. Recommend a single canonical curriculum spec the tests derive from.
- **F-CC-B08-046 — Low — Version-string assertions duplicate the drift risk of F-CC-B08-009.** phase-b test 105–108, phase-c 102–105, phase-d 123–129, phase-a 120–123. Tests assert literal version strings present in lesson JSON; a real upgrade requires editing both the data and these tests, with no tie to actual installed versions.
- **F-CC-B08-047 — Info — Fidelity test correctly pins "no standalone exercise lesson; exercises embedded in quiz" and "capstone has no quiz"** (132–134, 225–227, 318–320, 383–395). These `TODO`-annotated invariants document intentional curriculum shape; they are coherent with the backfill script's purpose (backfill exists precisely because most modules lack a standalone `exercise`-type lesson).

### `packages/db/src/__tests__/codecamp-stale-seed.test.ts`

- **F-CC-B08-048 — Info — `findStaleModuleSlugs` is pure and well-covered** (empty canonical, empty db, multiple stale, order preservation). Good unit isolation; matches the seed's stale-unpublish logic (codecamp-seed.ts:273–292). No findings.

### `packages/domain/src/codecamp/errors.ts`

- **F-CC-B08-049 — Low — Typed error classes are defined and exported but under-used by the batch's own functions.** `ConversationNotFoundError`, `ExerciseNotFoundError`, etc. (errors.ts:22–40) are exported via `index.ts:33–36`, yet `chat.ts`/`exercises.ts`/`intern-accounts.ts` throw bare `Error(...)` with matching strings (see F-CC-B08-020). The classes set `this.name` but the router's `mapDomainError` matches on `err.message`, so the typed classes provide no behavioral benefit today. Either adopt the classes at throw sites or have `mapDomainError` switch on `instanceof`.

### `packages/domain/src/codecamp/index.ts`

- **F-CC-B08-050 — Info — Barrel re-exports schema tables from `@reading-advantage/db/schema` and domain functions.** Lines 1–41. Re-exporting raw schema tables (1–5) from the domain barrel makes it easy for transport/UI code to import tables and bypass domain functions; consider not re-exporting tables from the domain entrypoint. Minor architectural smell, not a defect. `getPracticeIssues`/`reviewExercise`/`createInternAccount` etc. are all surfaced here.

---

## Positive observations

- Monotonic progress upsert (referenced from tests; `progress.ts` out of batch) is pinned by `codecamp.test.ts:735–764` so completed progress cannot be downgraded — good.
- PR-URL validation (`createPrReview`, exercised by `codecamp-github-identity.test.ts`) is thorough: host check, pull-vs-issue, numeric pull id, `.git` normalization.
- GitHub access is correctly behind the `@reading-advantage/integrations-github` adapter (provider-neutral).
- Seed and backfill scripts default to safe behavior (direct connection, dry-run, `isMain` guard).
- `updatePrReview` `reviewedAt` semantics are well-tested (terminal-vs-pending, no clobber of prior terminal `reviewedAt`).

---

## Limitations

- Read-only review; no batch source was modified. One temporary probe module was created under `packages/domain` and deleted.
- I could not run the live codecamp app or hit a real Postgres. The TenantDB scoping findings (F-CC-B08-001/002/003) are based on: (a) the registry source/dist registering `codecamp*` as `REFERENTIAL`; (b) direct probes against the **compiled** `dist/db-contract.js` + `dist/tenant-registry.js` confirming `TenantScopeError` on `select`/conflicting-insert; and (c) the observation that the same lookups return `EXEMPT` under Vitest. If the deployed artifact differs from the current `dist/` (e.g. an older build that predates the REFERENTIAL registration, or a build where the registry resolves table identities as in Vitest), the runtime impact of F-CC-B08-001/003 may differ — confirm against the actual deploy before remediation.
- The Vitest-vs-dist classification divergence itself was not root-caused (it lives in `tenant-registry.ts`/`db-contract.ts`/build config, which are outside this batch). It is reported as observed behavior with reproduction steps.
- `codecamp-curriculum-data.ts` (3674 lines) is overwhelmingly static teaching content; I reviewed its structure, the `MODULE_REPO_MAP`, `getExerciseRepos`, `PORTFOLIO_PROJECTS`, and sampled code blocks, but did not line-verify every lesson body.
- Severity ratings reflect reviewer judgment on the compiled-build evidence; the owning track should confirm production behavior before treating F-CC-B08-001 as a release blocker.
- No acceptance or closeout determination is made or implied by this report.
