# Line Review — cc-batch-09

- Track: `codecamp_advantage_review_20260626`
- Batch: `cc-batch-09` (20 files)
- Reviewer scope: curriculum/progression correctness, GitHub/webhook/AI integration risk, auth/role boundaries, production readiness, AGENTS.md compliance, test quality.
- Source code edited: none (read-only review).
- Finding ID prefix: `F-CC-B09-###`. Severity scale: Critical / High / Medium / Low / Info.

> This is a line-review report only. It makes **no** acceptance or closeout claim for the track or any phase.

---

## Files reviewed (20/20)

1. `packages/domain/src/codecamp/lessons.ts`
2. `packages/domain/src/codecamp/modules.ts`
3. `packages/domain/src/codecamp/permissions.ts`
4. `packages/domain/src/codecamp/pr-reviews.ts`
5. `packages/domain/src/codecamp/progress.ts`
6. `packages/domain/src/codecamp/quizzes.ts`
7. `packages/domain/src/codecamp/review-exercise.ts`
8. `packages/integrations/github/README.md`
9. `packages/integrations/github/eslint.config.mjs`
10. `packages/integrations/github/package.json`
11. `packages/integrations/github/src/__tests__/client.test.ts`
12. `packages/integrations/github/src/__tests__/factory.test.ts`
13. `packages/integrations/github/src/client.ts`
14. `packages/integrations/github/src/drivers/rest.ts`
15. `packages/integrations/github/src/factory.ts`
16. `packages/integrations/github/src/index.ts`
17. `packages/integrations/github/tsconfig.json`
18. `packages/integrations/github/vitest.config.ts`
19. `packages/types/src/codecamp.ts`
20. `packages/webhooks/src/__tests__/github-client.test.ts`

---

## Cross-cutting / highest-impact finding

### F-CC-B09-001 — Critical — Codecamp domain functions select/insert REFERENTIAL tables directly through TenantDB and will throw `TenantScopeError` at runtime.

The codecamp tables are all classified `REFERENTIAL` in `packages/domain/src/tenant-registry.ts` (lines 184–193: `codecampModules`, `codecampLessons`, `codecampExercises`, `codecampQuizQuestions`, `codecampUserProgress`, `codecampChatConversations`, `codecampChatMessages`, `codecampExerciseRepos`, `codecampPrReviews`, `codecampWebhookEvents`). Per `db-contract.ts` (lines 350–359, 451–456), any `select().from()` / `insert()` against a REFERENTIAL table **through a TenantDB instance throws `TenantScopeError`**; callers must use `tenantDb.unscoped(reason)`.

However, several functions in this batch query codecamp tables **directly on `db`** (the TenantDB), without `unscoped()`:

- `lessons.ts` line 16–17, 20–21, 23–24 (`getLessonsForModule`); lines 42–43, 46–47, 50–53, 55–56 (`getLessonWithContent`).
- `modules.ts` lines 17–19, 25–26, 28–29 (`getModuleBySlug`); lines 55–56, 60, 63–64 (`getModulesWithProgress`); lines 89–91, 95, 98–99 (`getModulesByPhase`); lines 119–129 (`getModuleWithExercises`).
- `pr-reviews.ts` lines 21–22 (`getPrReviewsForUser`), 35–36 / 54–55 / 58–60 (`createPrReview`), 75–81 (`updatePrReview`), 97–107 (`completeApprovedPrReviewLesson`), 128–129 (`getPrReviewByPrUrl`), 144–150 (`logWebhookEvent`), 165–166 (`listWebhookEvents`).
- `quizzes.ts` lines 19–20 (`submitQuizAnswers`), 49–50 (`markTheoryComplete`).
- `progress.ts` lines 86–88 (`getUserDashboard` chat conversations query).

The production wiring confirms a **real** TenantDB is passed: `apps/codecamp-advantage/app/api/trpc/[trpc]/route.ts` → `@reading-advantage/api` `createContext` (`packages/api/src/context.ts` line 71 `createTenantDB(db, ...)`), and `packages/api/src/routers/codecamp.ts` passes `db: ctx.tenantDb` to every domain call (e.g. lines 73, 88, 104).

I empirically reproduced the throw with the **real** registry (test-suite mock removed):

```
getModuleBySlug → THROW TenantScopeError: Table "codecamp_modules" is REFERENTIAL …
db.select().from(codecampLessons) → THROW TenantScopeError: Table "codecamp_lessons" is REFERENTIAL …
```

By contrast, `modules.ts checkModulePrerequisite` (line 154), `progress.ts updateUserProgress` (line 20), `review-exercise.ts reviewExercise` (line 118), and `chat.ts` (line 16) **do** call `unscoped(...)` — confirming the intended pattern and that the functions above are inconsistent omissions.

Impact: every read/write path that does not use `unscoped()` (module/lesson browsing, quiz submission, PR-review CRUD, webhook logging, dashboard recent-conversations) will throw at runtime in production. This is either (a) a live production-breaking defect, or (b) evidence the app is reached through a code path that does not use the documented TenantDB — which itself would be an AGENTS multi-tenancy violation. Either way it must be resolved before any acceptance.

### F-CC-B09-002 — High — Test suite masks the multi-tenancy enforcement above (false-green coverage).

`packages/domain/src/__tests__/vitest.setup.ts` globally `vi.mock`s `tenant-registry.js` so `classifyTable` falls back to a `schoolId`-presence heuristic, returning `EXEMPT` for every codecamp table. I verified that under this mock `classifyTable(codecampModules) === "EXEMPT"` and the REFERENTIAL guard never fires, so `codecamp.test.ts` passes while exercising `wrapDb(db) = createTenantDB(...)`. Only `tenant-coverage.test.ts` / `db-contract.test.ts` `vi.unmock(...)` the registry. Consequently the codecamp domain tests give no signal on F-CC-B09-001: they validate logic against a TenantDB that behaves differently than production. This is a test-quality gap directly relevant to "Backend functionality is the primary testing target" (AGENTS Testing). Recommend at least one integration test per codecamp module that runs with the real registry to assert either correct `unscoped()` usage or correct scoping.

---

## Findings by file

### `packages/domain/src/codecamp/lessons.ts`

- **F-CC-B09-003 — High — Direct REFERENTIAL selects (see F-CC-B09-001).** Lines 16–24 and 42–56 query `codecampModules`/`codecampLessons`/`codecampExercises`/`codecampQuizQuestions`/`codecampUserProgress` directly on `db`. Will throw `TenantScopeError` under a real TenantDB.
- **F-CC-B09-004 — Low — "Module not found" overloaded for unpublished lessons.** Lines 44 and 48 both throw `"Lesson not found"` when the lesson exists but its module is unpublished; acceptable as information-hiding but worth confirming intent vs. a distinct 403/410. Info-adjacent.
- **F-CC-B09-005 — Info — Defensive JSON coercion is sound.** Lines 58–66 guard `contentJson`, `hintsJson`, `optionsJson` against non-array/non-object DB values before casting. Good production hygiene given untyped JSON columns. No action.

### `packages/domain/src/codecamp/modules.ts`

- **F-CC-B09-006 — High — Direct REFERENTIAL selects (see F-CC-B09-001).** `getModuleBySlug`, `getModulesWithProgress`, `getModulesByPhase`, `getModuleWithExercises` (lines 17–143) all select codecamp tables directly on `db`. Throws under real TenantDB. Note the inconsistency with `checkModulePrerequisite` (line 154) which correctly uses `unscoped`.
- **F-CC-B09-007 — Medium — `checkModulePrerequisite` prerequisite logic is order-fragile.** Lines 160–176: "previous module" is the published module with the next-lower `order` value. If module `order` values are non-contiguous, duplicated, or a module is unpublished/inserted between phases, the "immediately preceding" assumption breaks (e.g. a Phase-D module could gate on a Phase-C module across a phase boundary, or skip a same-order sibling). Progression correctness depends on a globally-monotonic unique `order`; this is not enforced here. Also `targetModule.order <= 1` (line 160) hard-codes that order starts at 1 — a 0-indexed seed would mis-gate the first module. Recommend gating within phase and/or asserting the ordering invariant.
- **F-CC-B09-008 — Low — `getModulesByPhase` re-validates phase already constrained by the type.** Lines 84–87 runtime-check `phase` against `["A","B","C","D"]` though the input type is the union and the router validates with `modulePhaseSchema`. Harmless defense-in-depth; consistent with "validate at boundaries."
- **F-CC-B09-009 — Info — N+1-free aggregation via in-memory joins.** `inArray` batch fetch + `.filter`/`.find` (lines 59–71, 94–106) is reasonable for small lesson counts but is O(modules×lessons); acceptable at curriculum scale.

### `packages/domain/src/codecamp/permissions.ts`

- **F-CC-B09-010 — Medium — Permission table is duplicated and can drift.** The `CODECAMP_PERMISSIONS` constant (lines 3–8) and the `registerDomainModulePermissions` call (lines 10–17) declare the same four keys/role-lists independently. There is no single source of truth; an edit to one and not the other silently desyncs the exported map from the registered authorizer. Recommend deriving the registration argument from `CODECAMP_PERMISSIONS` (e.g. `Object.entries`) so they cannot diverge.
- **F-CC-B09-011 — Medium — Broad role grants for `codecamp:*`.** Lines 4–6 grant `read`/`submit`/`chat` to `INTERN, STUDENT, TEACHER, ADMIN, SYSTEM`. Codecamp is an intern bootcamp product; granting `submit` (progress/quiz writes) to `STUDENT`/`TEACHER`/`ADMIN` may be intentional cross-product access, but it widens the authorization surface. Worth an explicit product confirmation that reading-advantage `STUDENT`/`TEACHER` should be able to write codecamp progress. Auth-boundary flag, not a defect.
- **F-CC-B09-012 — Low — `admin:dashboard` is a generic key reused for codecamp admin actions.** Lines 7/16 register `admin:dashboard` (ADMIN, SYSTEM) which `pr-reviews.ts`/`review-exercise.ts` use to gate PR-review mutation and LLM review. A shared generic admin key means any product's admin-dashboard grant authorizes codecamp PR approval. Consider a codecamp-scoped key (e.g. `codecamp:admin`) for least privilege.

### `packages/domain/src/codecamp/pr-reviews.ts`

- **F-CC-B09-013 — High — Direct REFERENTIAL selects/inserts (see F-CC-B09-001).** All eight functions query codecamp tables on `db` without `unscoped()` (lines 21–22, 35–36, 54–60, 75–81, 97–107, 128–129, 144–150, 165–166). Throws under real TenantDB.
- **F-CC-B09-014 — High — `completeApprovedPrReviewLesson` fabricates a `UserContext` and bypasses authorization for the target user.** Lines 111–112 construct a synthetic owner object `{ id: review.userId, username: review.userId, role: "INTERN", … }` and call `updateUserProgress` as that user. This means an admin action writes progress on behalf of an arbitrary user using a forged context whose `role`/`schoolId`/`username` are invented (username set to the userId, `schoolId: null`). `updateUserProgress` then runs `assertCan(user, "codecamp:submit", tenant)` against the **fabricated** principal, not the real caller — defeating the purpose of the auth check and embedding an impersonation primitive in domain code. Recommend a dedicated privileged progress-write path that takes a `targetUserId` parameter while authorizing the *actual* admin caller, rather than synthesizing a user.
- **F-CC-B09-015 — Medium — PR-URL ownership/uniqueness check is global and exploitable for enumeration/denial.** Lines 54–56: a single PR URL may have only one review row across **all** users (`where eq(prUrl)` with no user scoping). User B submitting the same `prUrl` as user A gets `"A review for this PR URL already exists"`, which both leaks that the PR was already submitted and lets one user block another's submission of a shared/forked URL. Combined with `getPrReviewByPrUrl` (lines 125–126) where non-SYSTEM callers are scoped to their own `userId` — the asymmetry suggests reviews were intended to be per-user, but `createPrReview` enforces global uniqueness. Reconcile the scoping model.
- **F-CC-B09-016 — Low — `createPrReview` repo-match comparison is brittle.** Lines 47–49 normalize `repo.repoUrl` by stripping `.git`/trailing slash and lowercasing, then compare to `https://github.com/owner/repo`. It does not strip `www.`, does not handle `http://` exercise repo URLs, and assumes the stored repoUrl is exactly `host/owner/repo` with no extra path. A stored URL with a trailing path segment or `git@` SSH form would always fail the match. Validate/normalize repoUrl at link time.
- **F-CC-B09-017 — Low — `updatePrReview` `reviewedAt` SQL fallback.** Line 79 uses `sql\`${codecampPrReviews.reviewedAt}\`` to preserve the existing value when status returns to `pending`; correct, but note that re-approving after a `needs_changes`→`approved` cycle keeps the *first* reviewedAt only if it transitions through pending — on a direct `approved` update it sets a new `new Date()` each time. Minor audit-trail ambiguity.
- **F-CC-B09-018 — Info — `listWebhookEvents` re-maps `outcome` redundantly.** Line 168 collapses any non-`failed` outcome to `ignored`; harmless normalization but masks unexpected DB values rather than surfacing them.

### `packages/domain/src/codecamp/progress.ts`

- **F-CC-B09-019 — Medium — "completed" status is sticky and silently ignores regressions, including score downgrades on re-completion.** Lines 38–42: the upsert preserves `completed` (`CASE WHEN status='completed' THEN status ELSE excluded.status`) and `completedAt` (`COALESCE`). But `score` (line 41) is overwritten whenever `input.score` is provided. So a learner who passed a quiz (score 90, completed) and later re-submits with a lower passing/failing score will have their `score` lowered to the new value while `status` stays `completed`. Progression/grade correctness: the recorded score no longer corresponds to the completion event. Decide whether score should be max-preserving like status.
- **F-CC-B09-020 — Low — `getUserDashboard` recent-conversations query selects `codecampChatConversations` on `db` (REFERENTIAL).** Lines 86–88. Same class as F-CC-B09-001; will throw under real TenantDB even though `updateUserProgress` in the same file correctly uses `unscoped`.
- **F-CC-B09-021 — Low — `PORTFOLIO_BY_PHASE` non-null assertions assume seed completeness.** Lines 55–58 use `PORTFOLIO_BY_PHASE["A"]!` … `["D"]!`. If `PORTFOLIO_PROJECTS` ever lacks a phase, this throws at module load (import time) with an opaque error. A guarded lookup or a load-time assertion with a clear message would be more diagnosable.
- **F-CC-B09-022 — Info — `nowIso` vs `now` mixed types in upsert.** Line 27/42 pass an ISO string into `COALESCE(..., ${nowIso})` while line 33/43 use the `Date` object. Drizzle handles both for timestamp columns, but mixing is a readability nit.

### `packages/domain/src/codecamp/quizzes.ts`

- **F-CC-B09-023 — Medium — Quiz grading is exact-string equality and case/whitespace sensitive.** Line 26: `userAnswer === q.correctAnswer`. For multiple-choice keyed by option text this is fine, but any leading/trailing whitespace, casing, or unicode normalization difference marks a correct answer wrong. If `correctAnswer` stores an option *index* vs option *text*, the contract is silent (`types/codecamp.ts` `correctAnswer: z.string()`). Confirm the answer-key convention is enforced at seed time.
- **F-CC-B09-024 — Low — Missing-answer treated as wrong silently.** Line 25 defaults an unanswered question to `""`; combined with the 70% threshold (line 7) this is reasonable, but there is no validation that submitted `answers` correspond to real `questionId`s or that duplicates aren't submitted — unknown/duplicate answer entries are ignored. Boundary validation lives only in `quizSubmissionSchema` (shape, not membership).
- **F-CC-B09-025 — Low — Direct REFERENTIAL select.** Lines 19–20 (`codecampQuizQuestions`) and 49–50 (`codecampLessons`) select on `db`; see F-CC-B09-001.
- **F-CC-B09-026 — Info — `QUIZ_PASS_THRESHOLD` exported and reused; good.** Line 7 centralizes the threshold. The `submitQuizAnswers` result omits the threshold from its payload; UI must hard-code it or read the constant.

### `packages/domain/src/codecamp/review-exercise.ts`

- **F-CC-B09-027 — Info — Provider-neutral AI seam is well-constructed.** Lines 15–17 (`AIClientLike`), 54–64 (`aiClientToGenerateReview`), and the injected `generateReview` callback (lines 27, 115, 156) keep the domain package free of `@reading-advantage/ai`/provider SDK imports, matching the AGENTS Provider-Neutrality Rule. Good.
- **F-CC-B09-028 — Medium — Prompt-injection mitigation is prompt-only and the diff is untrusted/unbounded.** Lines 86 + 154 embed an instruction telling the model to ignore embedded instructions, then interpolate the raw `prDiff` into a fenced block. This is a best-effort mitigation, not a guarantee; a hostile PR diff can still attempt jailbreaks, and there is no size cap on `prDiff` (token/cost exhaustion and truncation risk for large PRs). `reviewResultSchema` (lines 30–39) gives no bound on `comments`/`summary` length either. Recommend truncating/segmenting the diff and capping output, plus treating `passed` as advisory (a malicious diff could try to coerce `passed: true`). Because an `approved` review can auto-complete a lesson (F-CC-B09-014 path), a coerced `passed` has progression-integrity consequences.
- **F-CC-B09-029 — Low — `repoUrl` lookup is exact-match and unauthenticated against module mapping.** Lines 135–139 match `codecampExerciseRepos.repoUrl` exactly (same brittleness as F-CC-B09-016). If unmatched, the review proceeds ungrounded (no module context) rather than erroring — acceptable but means a typo silently degrades review quality.
- **F-CC-B09-030 — Info — `reviewExercise` correctly uses `db.unscoped(...)`.** Line 118. This is the pattern the other modules (F-CC-B09-001) should follow.
- **F-CC-B09-031 — Low — `aiClientToGenerateReview` double-casts to `ReviewResult`.** Lines 59–62 cast the `generateObject` result via `as ReviewResult` without re-validating against `schema`. If the underlying client does not enforce the schema, malformed output flows downstream untyped. Prefer `schema.parse(...)` for a runtime guarantee at this boundary.

### `packages/integrations/github/README.md`

- **F-CC-B09-032 — Low — Documented behavior diverges from code (token caching key).** Lines 42–44 claim the client "Caches the token until near expiry (refreshes 60s before)" and is keyed appropriately. The driver caches a **single** token regardless of installation ID (see F-CC-B09-039), so the multi-installation `listRepositoriesForInstallation("12345")` example (line 22) can return a token minted for the default installation. Doc and code disagree.
- **F-CC-B09-033 — Info — Env var alias documented.** Lines 33–35 document `GITHUB_APP_PRIVATE_KEY` as an alias; matches `factory.ts` line 40. Good.

### `packages/integrations/github/eslint.config.mjs`

- **F-CC-B09-034 — Info — Thin re-export of shared config.** Lines 1–3 spread `@reading-advantage/config/eslint`. Consistent with other packages; no action.

### `packages/integrations/github/package.json`

- **F-CC-B09-035 — Low — No build step ordering / `dist` may be stale for consumers.** Exports (lines 6–15) point at `./dist/*.js` but the package is consumed only by `@reading-advantage/domain` (via `integrations-github`); ensure turbo `dependsOn: ["^build"]` covers it so domain never imports stale `dist`. Informational unless build graph omits it.
- **F-CC-B09-036 — Info — Dependencies are minimal and provider-appropriate.** Only `zod` runtime dep (line 26); auth uses `node:crypto`. Good adapter hygiene.

### `packages/integrations/github/src/__tests__/client.test.ts`

- **F-CC-B09-037 — Medium — Tests assert almost nothing about behavior.** Lines 13–28: the "interface compliance" test constructs a plain object literal and asserts `issue.number === 1` — it exercises no production code and would pass even if `PracticeIssue`/`getPracticeIssues` were deleted. `vi`/`beforeEach` are imported (line 1) but unused. The only real assertion is the `GitHubClientError` shape (lines 4–11). The REST driver's parsing/filtering logic (`drivers/rest.ts` `getPracticeIssues`, PR-vs-issue filtering, error mapping, token caching) has **no** unit coverage in this batch. AGENTS "Write tests for all new backend code" / "API adapter tests" is not satisfied for the driver.

### `packages/integrations/github/src/__tests__/factory.test.ts`

- **F-CC-B09-038 — Low — Singleton-reset coupling and unused imports.** Tests correctly `resetGitHubClient()` and snapshot/restore `process.env` (lines 12–19) — good isolation. But `vi` (line 1) is imported unused, and the "returns the same instance" test (lines 35–41) depends on env set in the prior test's ordering only because `beforeEach` resets env from `originalEnv`; it sets its own env (lines 36–37) so it's fine. Coverage is limited to factory wiring; the driver itself remains untested (see F-CC-B09-037).

### `packages/integrations/github/src/client.ts`

- **F-CC-B09-039 — Info — Interface/types are clean and Zod-validated config.** `githubConfigSchema` (lines 83–87) validates `appId`/`privateKey` non-empty; `installationId` optional. Good boundary validation. The interface `getPracticeIssues` does not accept an installation ID, hard-binding issue listing to the default installation — see F-CC-B09-040.

### `packages/integrations/github/src/drivers/rest.ts`

- **F-CC-B09-040 — High — Installation token cache is keyed to nothing and leaks across installations.** Lines 61, 72–104: `cachedToken` is a single field on the driver. `getInstallationToken(installationId)` returns the cached token if unexpired **regardless of which `installationId` was requested**. So after `listRepositoriesForInstallation("A")` caches A's token, a subsequent `listRepositoriesForInstallation("B")` (or `getPracticeIssues` using the default installation) within the validity window returns **A's token**, which is scoped to A's repos. In a multi-org install this is a cross-tenant authorization/data-exposure bug; calls to B's repos either fail or, worse, operate with A's credentials. Cache must be keyed by `installationId`.
- **F-CC-B09-041 — Medium — Empty-string installation ID silently produces a malformed request instead of a clear error.** Lines 114–116 and 174: `getInstallationTokenForRepo`/`getPracticeIssues` pass `this.defaultInstallationId ?? ""`. With no default configured, the URL becomes `/app/installations//access_tokens` and GitHub returns a 4xx surfaced as a generic `GitHubClientError`. Should fail fast with a descriptive "no installation ID configured" error.
- **F-CC-B09-042 — Low — Hand-rolled JWT and base64url encoding.** Lines 23–51 implement RS256 JWT manually. It looks correct (header/payload/`createSign("RSA-SHA256")`, base64url stripping), and `iat: now-60` provides clock-skew tolerance, but a hand-rolled JWT is a maintenance/security risk vs. a vetted helper. Note this duplicates `packages/webhooks/src/github-client.ts:generateAppJWT` (which uses `sign("sha256", ...)` + `base64url` encoding) — two independent JWT implementations (see F-CC-B09-049).
- **F-CC-B09-043 — Low — Uses legacy `Authorization: token <t>` header for data calls.** Lines 129 and 189 use `token ${token}` while the token-exchange call (line 85) uses `Bearer`. Both are accepted by GitHub today, but the `token` scheme is the older form; the webhooks client uses `Bearer` for the same data calls. Inconsistent and worth standardizing on `Bearer`.
- **F-CC-B09-044 — Low — `state` cast is unchecked.** Line 159 casts the API `state` string to `"open" | "closed"`; GitHub only returns those today, but an unexpected value would flow through untyped. Minor.
- **F-CC-B09-045 — Info — PR-vs-issue filtering is correct.** Lines 153–154 exclude items with a `pull_request` field, matching the README "excluding pull requests" promise. `encodeURIComponent` on owner/repo (line 125) is a reasonable injection guard.

### `packages/integrations/github/src/factory.ts`

- **F-CC-B09-046 — Low — Module-level singleton caches across env changes / serverless reuse.** Lines 14, 36, 49–54: `cachedClient` persists for the process lifetime; the only reset is the test-only `resetGitHubClient`. In a long-lived server, rotating `GITHUB_PRIVATE_KEY`/installation env requires a process restart. Acceptable for typical deploys; document it. The `safeParse`→`GitHubNotConfiguredError` mapping (lines 44–47) is good boundary handling but discards the specific Zod issue (which field was missing) from the thrown error.
- **F-CC-B09-047 — Info — Clear, actionable not-configured error.** Lines 5–12 name the exact env vars. Good production ergonomics.

### `packages/integrations/github/src/index.ts`

- **F-CC-B09-048 — Info — Barrel export is complete and type/value split is correct.** Lines 1–15. No action.

### `packages/integrations/github/tsconfig.json` & `vitest.config.ts`

- **F-CC-B09-049 — Medium — Duplicate GitHub App client implementations across packages.** This package (`integrations/github`) and `packages/webhooks/src/github-client.ts` independently implement JWT signing, installation-token exchange, and GitHub REST calls. Per AGENTS provider-neutrality/adapter guidance there should be one GitHub adapter. Two divergent implementations (different auth header schemes, different JWT helpers, different caching) are a correctness and maintenance hazard — fixes/security patches must be applied twice. Recommend consolidating webhooks onto `@reading-advantage/integrations-github`. (Cross-file structural finding; `tsconfig.json`/`vitest.config.ts` themselves are unremarkable: standard `extends`, `outDir`/`rootDir`, 30s timeouts.)
- **F-CC-B09-050 — Info — `vitest.config.ts` timeouts are generous (30s).** Lines 5–7. Fine for network-mockable tests; no live calls per README line 48.

### `packages/types/src/codecamp.ts`

- **F-CC-B09-051 — Medium — Domain outputs are not validated against these contracts at the boundary.** The schemas are thorough (modules, lessons, quizzes, dashboard, PR reviews, webhook payloads). However, the domain functions in this batch return hand-built objects (e.g. `modules.ts` lines 33–42, `lessons.ts` lines 61–69) without `.parse()`-ing against `moduleBySlugResponseSchema`/`lessonResponseSchema`; the router sets `.output(...)` (codecamp.ts) which tRPC uses to validate, so there *is* a boundary check at the transport — but core domain functions remain transport-coupled for their output guarantee, contrary to AGENTS "Core business logic must not depend on a transport layer" for output validation. Confirm every codecamp procedure declares `.output(...)`; otherwise outputs are unvalidated.
- **F-CC-B09-052 — Low — `lessonResponseSchema.content` is `z.record(z.unknown())` while `userStatus` is nullable but domain defaults to `"not_started"`.** Lines 56, 59: the contract permits `userStatus: null`, but `getLessonWithContent` always returns a non-null string (line 67 `?? "not_started"`). The nullable in the contract is dead/permissive and may hide a future regression. Tighten to the enum (non-null) if the domain guarantees it.
- **F-CC-B09-053 — Low — `quizQuestionPublicSchema` correctly strips the answer key.** Lines 43–46 omit `correctAnswer`/`explanation`; `lessons.ts` line 66 builds exactly the public shape (no `correctAnswer`). Good — no answer-key leakage to the lesson-content endpoint. (Positive finding.)
- **F-CC-B09-054 — Low — `webhookEventSchema.outcome` enum is `["ignored","failed"]` only.** Lines 291. There is no `"processed"`/`"succeeded"` outcome, so successfully-processed webhooks cannot be represented; `pr-reviews.ts` `CodecampWebhookEventOutcome` (line 10) matches this two-value set. Confirm success cases are intentionally not logged (the log is described as diagnostic for ignored/failed only).
- **F-CC-B09-055 — Info — `githubWebhookPayloadSchema` is strict-ish but permits unknown top-level keys.** Lines 301–320 validate the nested PR shape (good, validates `html_url` as URL, `head.sha`, `base.repo.full_name`, `user.login`). Zod is non-strict by default so extra keys pass; acceptable for webhook tolerance.
- **F-CC-B09-056 — Info — `internAccountInputSchema` enforces password min length 8.** Lines 337–342. Reasonable; note no complexity rule (AGENTS does not mandate one). Hashing is the auth adapter's concern, out of scope here.

### `packages/webhooks/src/__tests__/github-client.test.ts`

- **F-CC-B09-057 — Medium — `crypto.sign` is mocked module-wide, weakening JWT-related coverage.** Lines 4–10 mock `crypto.sign` to return a constant buffer. This means `generateAppJWT`/`getInstallationToken` are never exercised against real signing, and any regression in the signing input (`header.body` construction, base64url) goes undetected. The `generateAppJWT` test (lines 166–172) only asserts the missing-env throw, not a produced token. `createHmac`/`timingSafeEqual` remain real (good for signature tests).
- **F-CC-B09-058 — Low — `fetchPrDiff` mock-diff fallback is asserted as desired behavior.** Lines 220–224 assert that with no token the function returns a string containing "Mock diff". This codifies a development convenience (`github-client.ts` lines 180–183) as tested behavior. In production a missing token silently yields a fake diff to the LLM reviewer rather than failing — a correctness/security concern (the reviewer would "review" a stub and could mark `passed`). The test locks in this behavior; recommend the production path require a token (or a `NODE_ENV` guard) and the test assert a throw in prod mode.
- **F-CC-B09-059 — Low — `postPrComment`/`postReviewComment` "no token → silent no-op" is tested as success.** Lines 269–272, 314–319 assert that without a token the functions return without calling fetch. Silent no-ops on a missing credential mean PR feedback silently disappears in misconfigured environments; combined with F-CC-B09-058 the whole review pipeline can appear to "work" while doing nothing. Flag the operational risk; tests are otherwise well structured (mock fetch, assert URL/method/body, error paths at lines 244–253, 289–298, 364–377).
- **F-CC-B09-060 — Info — Signature-verification and replay-window tests are strong.** Lines 84–162 cover valid/invalid signature, missing secret, length mismatch, timestamp boundary (300s), off-by-one (301s), undefined (backward-compat), and NaN/Infinity rejection. This is high-quality boundary testing of `verifyWebhookSignature`/`isWebhookTimestampFresh`. `parsePrUrl` SSRF/path-traversal cases (lines 55–68) are also good. (Positive finding.)
- **F-CC-B09-061 — Low — `postReviewComment` "existing review" branch posts under another author's review.** Tested at lines 343–362: the code (`github-client.ts` lines 267–323) adds a comment to `reviews[0]` — the *first* review found on the PR, which may belong to a different reviewer/author. The test asserts the URL contains `/reviews/123/comments` but does not assert authorship correctness. Behavioral risk: bot comments may attach to an unrelated human review. Worth confirming the intended GitHub review-threading model.

---

## Severity summary

| Severity | IDs |
|----------|-----|
| Critical | F-CC-B09-001 |
| High | F-CC-B09-002, F-CC-B09-003, F-CC-B09-006, F-CC-B09-013, F-CC-B09-014, F-CC-B09-040 |
| Medium | F-CC-B09-007, F-CC-B09-010, F-CC-B09-011, F-CC-B09-015, F-CC-B09-019, F-CC-B09-023, F-CC-B09-028, F-CC-B09-037, F-CC-B09-041, F-CC-B09-049, F-CC-B09-051, F-CC-B09-057 |
| Low | F-CC-B09-004, F-CC-B09-008, F-CC-B09-012, F-CC-B09-016, F-CC-B09-017, F-CC-B09-020, F-CC-B09-021, F-CC-B09-024, F-CC-B09-025, F-CC-B09-029, F-CC-B09-031, F-CC-B09-032, F-CC-B09-035, F-CC-B09-038, F-CC-B09-042, F-CC-B09-043, F-CC-B09-044, F-CC-B09-046, F-CC-B09-052, F-CC-B09-053, F-CC-B09-054, F-CC-B09-058, F-CC-B09-059, F-CC-B09-061 |
| Info | F-CC-B09-005, F-CC-B09-009, F-CC-B09-018, F-CC-B09-022, F-CC-B09-026, F-CC-B09-027, F-CC-B09-030, F-CC-B09-033, F-CC-B09-034, F-CC-B09-036, F-CC-B09-039, F-CC-B09-045, F-CC-B09-047, F-CC-B09-048, F-CC-B09-050, F-CC-B09-055, F-CC-B09-056, F-CC-B09-060 |

---

## Verification performed

- Read all 20 batch files in full.
- Cross-read supporting files to substantiate findings: `packages/domain/src/tenant-registry.ts`, `packages/domain/src/db-contract.ts`, `packages/domain/src/__tests__/vitest.setup.ts`, `packages/domain/src/__tests__/codecamp.test.ts`, `packages/domain/src/__tests__/mock-db.ts`, `packages/api/src/context.ts`, `packages/api/src/routers/codecamp.ts`, `apps/codecamp-advantage/app/api/trpc/[trpc]/route.ts`, `packages/webhooks/src/github-client.ts`.
- Empirically confirmed F-CC-B09-001/-002 with throwaway probe tests (removed after use): with the real `tenant-registry` (mock removed), `createTenantDB(...).select().from(codecampLessons)` and `getModuleBySlug({ db: tenantDb, ... })` both throw `TenantScopeError`; under the global `vitest.setup.ts` mock, `classifyTable(codecampModules)` returns `EXEMPT` and no throw occurs.
- Ran `pnpm --filter @reading-advantage/domain test -- codecamp.test`: the codecamp suite passed; 3 unrelated failures in `tenant-coverage.test.ts` (`verification_tokens` and other unclassified auth tables) are pre-existing and out of this batch's scope.

## Limitations

- No source code was modified; probe test files were temporary and deleted.
- I did not run the GitHub integration package's own test suite or the webhooks suite end-to-end; findings for those files are from static reading plus the domain-side reproduction.
- Whether F-CC-B09-001 manifests as a live production failure depends on the exact runtime path that reaches the codecamp router; I confirmed the documented `packages/api` context passes a real `createTenantDB`, but did not execute the deployed app to observe a 500. The finding is raised as Critical because the code-as-written throws under the documented TenantDB contract and the test suite cannot catch it (F-CC-B09-002).
- Answer-key conventions (quiz `correctAnswer` as index vs. text), module `order` invariants, and intended PR-review scoping (per-user vs. global) are inferred from code; product/seed confirmation is needed to close F-CC-B09-007, -015, -023.
- This report is a line review only and asserts no acceptance, phase-gate, or closeout status for the track.
