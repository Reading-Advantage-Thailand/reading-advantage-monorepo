# Line Review — cc-batch-03

- Track: `codecamp_advantage_review_20260626`
- Batch: `cc-batch-03` (20 files)
- Reviewer model: `ark-code-latest` (Doubao-Seed-Code)
- Date: 2026-06-27
- Scope of this report: line-by-line review only. **No source code was edited.** This document makes **no acceptance or closeout claims**; it is input to the broader review track.
- Focus areas: curriculum/progression correctness, GitHub/webhook/AI integration risks, auth/role boundaries, production readiness, AGENTS.md compliance, test quality.

## Files Reviewed (20/20)

1. `apps/codecamp-advantage/lib/__tests__/i18n-key-parity.test.ts`
2. `apps/codecamp-advantage/lib/__tests__/i18n-locale-loading.test.ts`
3. `apps/codecamp-advantage/lib/__tests__/i18n-request.test.ts`
4. `apps/codecamp-advantage/lib/__tests__/i18n-routing.test.ts`
5. `apps/codecamp-advantage/lib/__tests__/lesson-language-badge.test.ts`
6. `apps/codecamp-advantage/lib/__tests__/module-utils.test.ts`
7. `apps/codecamp-advantage/lib/__tests__/next-config-security-headers.test.ts`
8. `apps/codecamp-advantage/lib/__tests__/pr-url.test.ts`
9. `apps/codecamp-advantage/lib/__tests__/prod-smoke/local-qa-parity-matrix.json`
10. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts`
11. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-10-edge-cases-and-production-scenarios.test.ts`
12. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-11-cross-browser-and-device-testing.test.ts`
13. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-12-regression-against-local-qa.test.ts`
14. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-13-production-readiness-report.test.ts`
15. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-2-database-and-configuration.test.ts`
16. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-3-authentication-and-authorization.test.ts`
17. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-4-feature-parity.test.ts`
18. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-5-real-external-integrations.test.ts`
19. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts`
20. `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-7-cdn-and-caching.test.ts`

## Severity Legend

- **Critical** — security/data-integrity defect or broken core flow shipped to production.
- **High** — likely functional break, real security/abuse risk, broken test that gives false assurance, or strong AGENTS.md violation.
- **Medium** — correctness/robustness gap, maintainability or UX risk.
- **Low** — minor/cosmetic, style, or nit.
- **Info** — observation, no action implied.

---

## Cross-cutting context

This batch is **entirely test code plus two JSON artifacts** (the parity matrix and, transitively, the report summary). There is no production application code in the batch, so most findings concern **test quality, false-assurance risk, and production-readiness claims encoded in artifacts** rather than shipped runtime defects. Several "prod-smoke" suites make **live HTTPS calls to the production deployment** (`https://codecamp.reading-advantage.com`) and are matched by the default Vitest `include` glob (`lib/**/*.{test,spec}.{ts,tsx}` — `vitest.config.ts:13`), which is the single most important systemic risk in the batch (F-CC-B03-001).

---

## Findings

### Systemic / multi-file

- **F-CC-B03-001 — High — Prod-smoke suites hit live production by default in the normal test run.**
  `vitest.config.ts:13` includes `lib/**/*.{test,spec}.{ts,tsx}`, which matches every `lib/__tests__/prod-smoke/phase-*.test.ts`. Those suites default `PROD_URL` to `https://codecamp.reading-advantage.com` (e.g. `phase-1:24`, `phase-2:33`, `phase-3:38`, `phase-4:47`, `phase-5:62`, `phase-6:69`, `phase-7:52`, `phase-10:93`, `phase-11:68`, `phase-12:73`) and only skip when `PHASE<n>_SKIP=1` is set. Unless every `PHASE*_SKIP` is exported, `pnpm turbo run test` will issue **real network requests against production** — including `POST /api/auth/login` with bad creds (`phase-2:193`, `phase-3:263`, `phase-10:321`), unauthenticated webhook POSTs (`phase-5:526`), and 10 parallel root-URL probes (`phase-10:798`). This makes the unit-test run network-dependent, flaky, and capable of generating production auth-failure/audit noise from CI. There is no shared default-skip (no `PHASE*_SKIP` in `setup.ts`, `lib/__tests__/setup.ts:1-23`). Recommend isolating prod-smoke into a separate Vitest project/glob that is opt-in, or defaulting `SKIP` to true unless an explicit `RUN_PROD_SMOKE` flag is set.

- **F-CC-B03-002 — High — Network-probe tests throw (not soft-fail) when prod is unreachable, so CI breakage is indistinguishable from a real gap.**
  The per-check probes use `expect.soft(...)` for assertions but the `await fetchWithTimeout(...)` calls are not wrapped — a DNS/TLS/timeout error rejects the test outright (e.g. `phase-3:155`, `phase-4:96`, `phase-6:147`). The file headers explicitly call this an "expected Red-phase failure mode" (e.g. `phase-1:14-18`, `phase-2:16-20`), conflating "test infrastructure cannot reach prod" with "production contract unmet." Combined with F-CC-B03-001, a transient network issue fails the whole package test run. The `report-summary.json` even records this happening: `productionOnlyIssues[1]` = "Runner network ETIMEDOUT to 142.250.x.x:443 affects multiple test phases" (`report-summary.json:120-125`).

- **F-CC-B03-003 — Medium — "prod=pass" in the parity matrix frequently means "source/commit verified," not "observed on live production."**
  `local-qa-parity-matrix.json` marks rows `prod: "pass"` whose `note` is a code reference rather than a live observation: e.g. session-cookie security row `local:"skip" prod:"pass"` with note "COOKIE_OPTIONS in login.ts:17-23" (`:88-94`); `INTERN cannot access /admin` note "proxy.ts:59-62" (`:96-102`); webhook signature rows `local:"skip" prod:"pass"` (`:167-182`, `:288-302`); rate-limit row note "rate-limit.ts:7" (`:183-190`). The contract reader (`phase-12`) treats `prod:"pass"` as a passing production observation when computing regressions (`phase-12:264-274`, `:790-805`). Conflating static source-contract verification with live production verification overstates production-readiness and is the same class of issue the `findUnsupportedLocalPassClaims` helper was built to guard against (`phase-12:363-379`) — but that guard only fires for `local:"pass"`, not for `prod:"pass"` source-only claims.

- **F-CC-B03-004 — Medium — Parity matrix and report-summary disagree on P0 status (matrix shows all P0 prod=pass; summary records 2 P0 fails).**
  `local-qa-parity-matrix.json` contains **no** row with `prod:"fail"` (all P0 rows are `pass`, some `skip`→`pass`). But `report-summary.json:7-14` records `counts.p0.fail = 2`, backed by blockers `B-AI-001` (live OpenRouter AI tutor unverified) and `B-GH-001` (GitHub PR-review E2E unverified) (`report-summary.json:30-48`). The live AI-tutor and PR-review-E2E P0 acceptance items have **no corresponding matrix row** (the matrix only covers the unauth chat-401 and webhook-401 probes, `:159-182`). Phase-12's "zero prod regressions" gate therefore passes while two P0 production-readiness gaps are open. The two surfaces should be reconciled so the matrix represents the same P0 set the report blocks on.

### `lib/__tests__/i18n-key-parity.test.ts`

- **F-CC-B03-005 — Low — "not byte-identical to English" assertion will false-positive on legitimately identical short strings.**
  `i18n-key-parity.test.ts:80-88` asserts every Thai value differs from English unless allow-listed in `ALLOWED_IDENTICAL_VALUES` (`:41-47`). Legitimate locale-identical values (numerals, symbols, brand fragments, single-word technical terms that are the same in both bundles) will fail and require manual allow-list maintenance. This couples the test to translation content; consider scoping the check to namespaces that are prose, or treating it as a warning. Anchor `:80-88`.

- **F-CC-B03-006 — Info — `flattenValues` coerces non-string leaves via `String(value ?? "")`, so a missing/empty Thai value could pass the non-empty check after coercion.**
  `:30-34` stringifies non-string leaves; combined with the `toBeTruthy()` check at `:76`, a numeric `0` or boolean `false` leaf would behave unexpectedly, though current message bundles appear to be string-only. Observation only. Anchor `:21-37, :74-78`.

### `lib/__tests__/i18n-locale-loading.test.ts`

- **F-CC-B03-007 — Info — Asserts Thai is the default locale; correct for this app but a behavioral coupling worth noting.**
  `:9-11` pins `routing.defaultLocale === "th"`. Fine and intentional (matches `phase-4` redirect expectations), recorded for cross-file consistency. No action.

### `lib/__tests__/i18n-request.test.ts`

- **F-CC-B03-008 — Low — Path-traversal locale input is asserted to reject, but only via the generic "Unsupported locale" path.**
  `:51-56` confirms `loadMessages("../../../etc/passwd")` rejects with "Unsupported locale". Good defensive test; note it validates an allow-list rather than a sanitizer, so the guarantee depends entirely on `resolveLocale`/`loadMessages` keeping a strict allow-list. Worth a comment linking to the implementation’s allow-list. Anchor `:51-56`.

### `lib/__tests__/i18n-routing.test.ts`

- **F-CC-B03-009 — Info — Thin config-snapshot test; adequate as a regression guard.**
  `:4-17` asserts locales `["th","en"]`, default `th`, prefix `always`. No issue.

### `lib/__tests__/lesson-language-badge.test.ts`

- **F-CC-B03-010 — Medium — Test asserts an exact prose substring inside `app/api/chat/route.ts` by reading the file from disk.**
  `:38-46` does `fs.readFileSync(.../app/api/chat/route.ts)` and asserts it `toContain("lesson content is written in English")`. This couples a unit test to the literal wording of a system-prompt string in unrelated source; any reword of the prompt (even improving it) breaks this test without a behavioral change, and it tests source text rather than behavior. Prefer exporting the prompt constant and asserting against it, or testing the rendered badge behavior. Anchor `:39-45`.

### `lib/__tests__/module-utils.test.ts`

- **F-CC-B03-011 — Medium — `getLockedByModuleTitle` is exported but has zero test coverage in this suite.**
  `module-utils.ts:26-40` exports `getLockedByModuleTitle` (the user-facing "locked by which module" label), but `module-utils.test.ts` only covers `isModuleLocked` and `getModulePrStatus`. The progression-lock label is curriculum-correctness-relevant (it tells the intern which prerequisite to finish) and shares the same gap-handling logic that the locking tests exercise; it should have parallel coverage. Anchor `module-utils.test.ts:1-2` (imports only the two tested fns).

- **F-CC-B03-012 — Low — Locking tests do not cover unpublished/duplicate-order or `order === 0` edge cases.**
  `isModuleLocked` (`module-utils.ts:6-20`) keys on `order <= 1` and "highest preceding order"; tests (`:4-48`) cover order 1, gaps, and a standalone `order:5`, but not `order:0`, equal orders, or modules absent from the array passed for a prereq. These are plausible seed/data states. Medium-low. Anchor `module-utils.test.ts:4-48`.

### `lib/__tests__/next-config-security-headers.test.ts`

- **F-CC-B03-013 — Low — CORS allow-origin is asserted as a hard-coded production hostname, coupling the test to one environment.**
  `:34` asserts `access-control-allow-origin === "https://codecamp.reading-advantage.com"`. If `next.config` ever derives the origin from an env var (the portable approach AGENTS.md favors), this test must change. Acceptable as a pin, but note the coupling. Anchor `:34`.

- **F-CC-B03-014 — Info — Good positive coverage of P0 security headers (CSP, HSTS, XFO, XCTO, Referrer-Policy) on both app and API routes.**
  `:18-42` is a solid static contract over `next.config.headers()`. No issue.

### `lib/__tests__/pr-url.test.ts`

- **F-CC-B03-015 — Info — Adequate coverage of `getPrDisplayName` including non-GitHub, issue, malformed, and short-path fallbacks.**
  `:4-29`. No issue.

### `lib/__tests__/prod-smoke/local-qa-parity-matrix.json`

- **F-CC-B03-016 — Medium — Multiple P0 rows recorded as `local:"skip" prod:"pass"`, meaning the regression oracle had no local baseline yet is asserted clean in prod.**
  Examples: session-cookie security (`:88-94`), progress-update-after-quiz (`:135-142`), webhook missing/invalid signature (`:167-182`), concurrent logins (`:311-318`), responsive coverage (`:335-342`). Per the `isProdRegression` policy these `skip→pass` transitions are explicitly *not* regressions (`phase-12:268-273`), so they pass silently. For P0 items this is a real gap: the "regression against local QA" phase cannot detect a regression on an item that was never locally observed. See also F-CC-B03-003. Anchor: rows noted above.

- **F-CC-B03-017 — Low — `note` fields cite commit hashes and "Phase 8.5 deploy verified" that cannot be independently confirmed from this artifact.**
  E.g. `:29` ("commit a0862b3; Deploy verified in Phase 8.5 (commit e3ed0c01)"), `:277` ("45/45 pass"). These are trust-me provenance strings; the audit cannot verify them here. Recorded as a limitation, not a defect. Anchor throughout `rows[].note`.

### `lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts`

- **F-CC-B03-018 — Low — `extractResourceReferences` helper unit tests are sound, but the live "no mixed content" check pushes both `data:`/`mailto:`/root-relative refs into `refs` then filters — only `http://` and `//` are flagged.**
  `:287-307` collects many ref classes; the live check at `:88-93` filters to `http://`/`//` only, so the broad collection is benign. Helper tests at `:227-277` are good. Info/low. Anchor `:88-93, :287-307`.

- **F-CC-B03-019 — Info — Cold-start budget test (`:130-142`) measures end-to-end wall time including DNS/TLS from the runner; budget comparisons are environment-sensitive (acknowledged in later phases).**
  No action; consistent with the stated methodology.

### `lib/__tests__/prod-smoke/phase-10-edge-cases-and-production-scenarios.test.ts`

- **F-CC-B03-020 — Medium — "Concurrent quiz submissions" probe submits all-zero/synthetic UUIDs and only asserts `status < 500`, so it does not actually exercise the race condition it documents.**
  `:415-466` fires 5 parallel `submitQuiz` with `lessonId = "0000…0000"` and a fake questionId, then only checks each response is `< 500` (`:456-462`). A non-existent lesson yields a 4xx well before any concurrent progress-row write, so the stated guarantee ("no race conditions on concurrent quiz submissions … losing the `eq` filter on `userId`", `:425-432`) is not tested. This is a false-assurance probe. Anchor `:439-462`.

- **F-CC-B03-021 — Medium — Per-user chat rate-limit "isolation" probe sends a single request and asserts 200; it does not test isolation between two users at all.**
  `:367-413` logs in one INTERN, sends one `/api/chat`, asserts 200 (`:406-409`). The test name claims "rate limits isolated per user" but no second user and no budget exhaustion occurs; the comment concedes it is "informational" (`:401-403`). The assertion also presumes the chat route returns 200 for a real LLM call from CI, which couples it to live OpenRouter. Misleading name vs. behavior. Anchor `:368-410`.

- **F-CC-B03-022 — Low — `HAS_LARGE_CONVERSATION_ID` is computed then discarded with `void` (`:108-111`); the "large chat history" probe instead uses a synthetic UUID and accepts 404.**
  The keystone-gated large-history path is effectively never exercised even when the env var is provided, because the probe ignores the flag and uses `process.env.PHASE10_TEST_LARGE_CONVERSATION_ID ?? "0000…"` directly (`:599-600`) without gating on a real ≥200-message conversation. The "loads without timeout" guarantee is unverified for a genuinely large payload. Anchor `:108-111, :584-636`.

- **F-CC-B03-023 — Info — Cloud Run `--max-instances=100` / `--concurrency=80` source-contract detectors (`:744-781, :860-928`) are reasonable static checks against `cloudbuild.yaml`; they depend on the deploy spec format staying stable.**

### `lib/__tests__/prod-smoke/phase-11-cross-browser-and-device-testing.test.ts`

- **F-CC-B03-024 — Medium — Responsive-coverage and viewport contracts are inferred from server-rendered HTML / source string-grep, which cannot establish actual cross-browser rendering.**
  `:271-336` greps the SSR body for any `sm:/md:/lg:/xl:/2xl:` Tailwind prefix and a `<meta viewport>`; `:366-442` greps page source files for the same and for `min-h-8`/`min-w-8` touch targets. The file header is candid that real cross-browser verification "still requires BrowserStack or real devices" (`:21-27`). The risk is that a green suite is read as "responsive verified" when it only proves a class substring exists somewhere in the markup. Anchor `:300-329, :435-441`.

- **F-CC-B03-025 — Low — `header navigation declares minimum touch-target sizing` (`:435-441`) hard-asserts the literal classes `min-h-8`/`min-w-8` in two component files; refactoring class names (e.g. to `min-h-9`) breaks the test without a UX regression.**
  Anchor `:439-440`.

### `lib/__tests__/prod-smoke/phase-12-regression-against-local-qa.test.ts`

- **F-CC-B03-026 — Medium — Brittle indentation-coupled regex parsers for the curriculum seed (`countSeedModules`, `countSeedLessons`, `readSeedPhaseASlugs`).**
  `:389-392` requires exactly 6-space-indented `slug:`; `:415-448` walks bracket depth and counts 8-space-indented `{`; `:455-469` mirrors the indentation assumption. A `prettier`/formatting change or a single mis-indented seed entry silently changes the 18/85 counts and the Phase-A slug list, producing either false failures or—worse—false passes (e.g. if a real module is added at the wrong indent it won't be counted, masking a 18→19 drift). The 18/85 data-integrity oracle (`:113-115, :845-869`) is only as reliable as the seed file’s exact formatting. Recommend importing the seed module and counting structurally. Anchor `:389-448`.

- **F-CC-B03-027 — Medium — `isProdRegression` treats `skip→pass` and `fail→pass` as non-regressions, so a P0 item that was a local failure and is now merely "skipped→pass via source note" never trips the gate.**
  `:264-274`. Combined with the matrix’s `skip→pass` rows (F-CC-B03-016), the "zero prod regressions" gate (`:790-805`) and the P0 launch gate (`:928-1026`) can be green while P0 items lack any live verification. The logic is internally consistent but the *policy* under-detects for skip-heavy baselines.

- **F-CC-B03-028 — Low — `findUnsupportedLocalPassClaims` only audits `local==="pass"` claims, and only when a NOT-TESTED pattern is present in the archived report (`:363-379`); a matrix that marks `local:"skip"` (as most P0 gaps do) bypasses the audit entirely.**
  This narrows the guard to a case the current matrix largely avoids by using `skip` instead of `pass`. Anchor `:363-379`, cross-ref F-CC-B03-016.

- **F-CC-B03-029 — Info — The suite hard-requires the existence of `measure/tracks/codecamp_qa_local_20260517/{index,spec,plan,metadata}.md|json` (`:479-518`); these are filesystem/process artifacts outside this batch and were not verified here.**

### `lib/__tests__/prod-smoke/phase-13-production-readiness-report.test.ts`

- **F-CC-B03-030 — High — The Phase 13 "P0 launch gate" can pass while the documented decision is `no-go`, decoupling the gate from the actual go/no-go state.**
  The P0 launch-gate sub-task 3 (`:1264-1280`) passes as long as both signoffs `decision === "approve"`, regardless of `overall`. The committed `report-summary.json` has `overall: "no-go"` (`report-summary.json:6`) **and** both signoffs `decision: "approve"` (`:101, :107`) with notes acknowledging the no-go (`:102, :108`). So the "P0 launch gate" test (`:1188-1318`) is satisfied even though production readiness is explicitly **no-go** with two unresolved P0 blockers. A reader could mistake a green Phase-13 gate for "cleared to launch." The gate should additionally assert consistency between `overall`, open P0 blockers, and signoff semantics. Anchor `:1264-1280`, `report-summary.json:6,30-48,97-110`.

- **F-CC-B03-031 — Medium — Blocker→parity-row coverage check is trivially satisfied by any blocker that has a `followUpTrackId` or `resolved`, so it does not actually verify per-row coverage.**
  `:929-934` (and the gate duplicate `:1237-1245`) consider a P0 prod-fail row "covered" if **any** blocker is `resolved` OR has a non-null `followUpTrackId` OR matches phaseId+checklistItem. Because the `||` short-circuits on the first two global conditions, a single resolved/tracked blocker marks *all* rows covered regardless of relevance. (Currently moot because the matrix has no `prod:"fail"` rows — F-CC-B03-004 — so the loop returns early at `:918`.) The check gives weaker assurance than its description. Anchor `:927-938, :1237-1250`.

- **F-CC-B03-032 — Medium — `Blocker` has no `phaseId` field, yet the coverage code reads `b.phaseId` (`:920, :933, :1243`).**
  The `Blocker` interface (`:195-203`) defines only `source`, not `phaseId`. `summary.blockers.map((b) => `${b.phaseId ?? ""}::…`)` (`:920`) and `b.source.includes(row.phaseId)` (`:933`) reference a non-existent property on the typed object; `b.phaseId` is always `undefined`, so the `(b.description.includes(...) && b.source.includes(row.phaseId))` branch can never be the deciding condition via phaseId. Dead/incorrect logic that compiles only because the cast at `:914` is loose. Anchor `:195-203, :920, :933`.

- **F-CC-B03-033 — Low — `report-summary.json` integration results mark `github-webhook` as `pass` while two of three integrations are `deferred` (`report-summary.json:178-194`), and `overall` is `no-go`; the "no pass while evidence says deferred" guard (`:1020-1031`) only catches a `pass` row whose own `evidence` contains deferred/skipped, not the cross-row inconsistency.**
  Defensible (webhook unauth/sig paths are genuinely live-verified) but worth noting the guard is narrow. Anchor `:1020-1031`, `report-summary.json:184-193`.

- **F-CC-B03-034 — Info — Suite hard-requires `measure/tracks/.../report.md`, `metadata.json` terminal status, and three follow-up track directories (`:526-587, :947-973, :1035-1047`). Track `metadata.json` status was not confirmable in this review (see Limitations).**

### `lib/__tests__/prod-smoke/phase-2-database-and-configuration.test.ts`

- **F-CC-B03-035 — Medium — `loadCloudbuildYaml` resolves `cloudbuild.yaml` from `process.cwd()` (`:112-121`), unlike every other phase which resolves from `__dirname`/`import.meta.url`.**
  `resolve(process.cwd(), "cloudbuild.yaml")` (`:118`) assumes the test runner’s CWD is the app directory. When the monorepo runs tests from the repo root or via Turbo with a different CWD, this read fails and the entire Secret-Manager describe block (`:231-298`) plus the launch gate (`:378-443`) throw at import/first-call. Inconsistent and fragile vs. the `__dirname`-relative pattern used in phase-10/12/13. Anchor `:112-121`.

- **F-CC-B03-036 — Info — Good P0 secret-leakage contract: asserts each of the 5 secrets is bound via `--set-secrets=` and absent from `--set-env-vars=` (`:50-56, :231-298, :420-435`). Strong, source-grounded check.**

- **F-CC-B03-037 — Low — Dashboard "< 500ms" DB-read budget (`:158-185`) measures `/api/auth/session` round-trip from the CI runner, so it conflates network latency with server time; likely flaky cross-region.** Anchor `:41, :176-179`.

### `lib/__tests__/prod-smoke/phase-3-authentication-and-authorization.test.ts`

- **F-CC-B03-038 — Info — Strong auth/role boundary coverage: INTERN vs ADMIN proxy gating (`:467-541`), tRPC `protectedProcedure`→401 / `adminProcedure`→403 (`:543-653`), cookie attribute contract incl. HttpOnly/Secure/SameSite/Max-Age (`:298-337`), and logout invalidation read-back (`:404-464`). `parseSetCookie` unit tests are thorough (`:792-866`). This is the best-constructed suite in the batch.**

- **F-CC-B03-039 — Low — Cookie `Secure` assertion (`:312-316`) only holds when the target sets `NODE_ENV=production`; running against a non-prod `PHASE3_PROD_URL` override will fail this check (documented at `:30-35`). Acceptable but environment-coupled.**

- **F-CC-B03-040 — Low — `username` round-trip assertion lowercases the expected value (`:357-359`); this hard-codes a normalization rule (usernames stored lowercased) that, if changed server-side, fails here without a security/behavior regression.** Anchor `:357-359`.

### `lib/__tests__/prod-smoke/phase-4-feature-parity.test.ts`

- **F-CC-B03-041 — High — `trpcPost` sends no request body, so every mutation probe in this file submits its input only via the `?input=` query string — which tRPC mutations do not read — making the create/submit/update probes structurally unable to exercise the mutations they claim.**
  `:134-149`: the POST is issued as `fetchWithTimeout(url, { method: "POST", headers })` with **no `body`**, while the input is encoded into the query (`:140`). tRPC mutation procedures read input from the POST body, not the query string; with an absent body the server receives `undefined` input and will reject (Zod/parse error) before the mutation logic runs. This affects `markTheoryLessonComplete` (`:519`), `submitExercise` (`:589`), `submitQuiz` (`:669, :747`), `updateProgress` (`:806`), and `createIntern` (`:977, :1027`). These are credential-gated so they don’t run in CI without creds, but when they do run the `expect.soft(status).toBe(200)` checks would fail for the wrong reason (malformed request), giving no real coverage of quiz scoring, progress updates, or intern creation. Note phase-6 (`:186-206`) and phase-10 (`:256-276`) define `trpcPost` *with* a body — phase-4 is the inconsistent/defective copy. Anchor `:134-149` vs `phase-6:186-206`.

- **F-CC-B03-042 — Medium — Seed-oracle `readSeedPhaseMap` (`:173-206`) shares the same indentation-coupled regex fragility as phase-12 (F-CC-B03-026); a formatting change to the seed silently changes the phase map and the 18-module floor (`:1433-1442`).** Anchor `:190-205`.

- **F-CC-B03-043 — Low — The 70%-threshold quiz contract test (`:712-780`) assumes empty answers always score `< 70`; for a quiz where blank is a correct option, or a 1-question quiz, this boundary assumption could be wrong. Reasonable in practice but undocumented dependency on quiz content.** Anchor `:758-761`.

- **F-CC-B03-044 — Info — `createIntern` probe creates real intern rows in production with `phase4_<suffix>` usernames (`:967-1005`) when ADMIN creds are present; no cleanup. Repeated runs accrete test users in the prod DB. Worth a teardown or a dedicated test tenant.** Anchor `:974-985`.

### `lib/__tests__/prod-smoke/phase-5-real-external-integrations.test.ts`

- **F-CC-B03-045 — Medium — The 30/min rate-limit probe fires up to 31 real `POST /api/chat` requests at production OpenRouter when INTERN creds are present (`:420-460`), incurring real LLM cost/latency and depending on per-instance limiter semantics.**
  `:439` sends 30 parallel chats then a 31st expecting 429. On a multi-replica Cloud Run deploy the in-memory limiter (noted elsewhere as keyed per instance) may not trip at exactly 31, making the assertion both costly and potentially flaky. Anchor `:431-457`.

- **F-CC-B03-046 — Low — Webhook signature unit/E2E helper `signWebhookPayload` (`:192-196`) correctly mirrors HMAC-SHA256, but the keystone E2E posts to prod `/webhooks/github/pr` and can create/update real `codecamp_pr_reviews` rows (`:567-660`) — production side effects from a test run with the webhook secret present.** Anchor `:589-619`.

- **F-CC-B03-047 — Medium — `readSeedExerciseRepoUrls` (`:212-252`) uses a heuristic "first 6-space-indented URL after a 2-space-indented slug key" that the comment admits is loose ("we don't constrain on `repoUrl:` itself", `:241-246`). A seed entry whose first following URL is not the repo URL (e.g. a `description` containing a github link) would map the wrong URL; the unit test (`:996-1035`) only checks presence and github.com prefix, not correctness of the mapping.** Anchor `:226-251`.

- **F-CC-B03-048 — Low — Enum contracts are verified by regex-scraping `packages/types/src/codecamp.ts` (`:1039-1091`) rather than importing the schema. A formatting change to the Zod enum (multi-line, trailing comment) could break the regex and produce a false failure; importing `webhookEventSchema.options` would be robust.** Anchor `:1050, :1066, :1086`.

- **F-CC-B03-049 — Info — Good negative-path coverage: missing-sig 401, bad-sig 401, unmapped-repo graceful-ignore (`:522-708`), and webhook audit-trail outcome enum `['ignored','failed']` (`:1039-1056`). The webhook security contract is well-specified.**

### `lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts`

- **F-CC-B03-050 — Medium — All latency budgets are measured as end-to-end wall time from the CI runner (`:131-136`), so cross-region runner latency is charged against server budgets; the warm-dashboard 1000ms budget is already recorded as failing (1363ms) in `report-summary.json:136-141`.**
  The header acknowledges this methodology (`:45-50`) but the budgets (`:79-93`) are then asserted as if server-side. The result is environment-dependent pass/fail; the suite is better treated as informational (which the P1 gate framing at `:916-928` partially does). Anchor `:79-93, :131-136`.

- **F-CC-B03-051 — Low — `submitQuiz` latency probe submits `lessonId: "0000…0000"` with empty answers (`:498-505, :818-826`) and only requires `< 500`/`< 8000`; like F-CC-B03-020 it times an error path, not the real quiz-scoring path, so the "submitQuiz < 500ms" budget is measured against a 4xx, not a successful scored submission.** Anchor `:498-516`.

- **F-CC-B03-052 — Info — Helper unit tests for `extractScriptUrls`/`extractImageUrls`/`countRenderBlockingScripts`/`resolveAssetUrl` (`:1036-1223`) are thorough and run offline; good. The render-blocking-script detector correctly excludes `async`/`defer`/`type=module` and `<body>` scripts (`:281-297`).**

### `lib/__tests__/prod-smoke/phase-7-cdn-and-caching.test.ts`

- **F-CC-B03-053 — High — Operator-precedence bug in the P1 launch-gate 404 check: `!notFound.status === 404` is always `false`, so the 404 status validation is dead and the gate never flags a wrong status on the not-found probe.**
  `:578`: `if (!notFound.status === 404 || !notFoundOk)`. `!notFound.status` evaluates first: for any non-zero status (e.g. 404, 200, 500) `notFound.status` is truthy, so `!notFound.status` is `false`, and `false === 404` is `false`. The intended check was `notFound.status !== 404`. Result: the launch gate only ever evaluates `!notFoundOk`; a route that returns, say, `200` (no real 404 page) with an acceptable cache header would **pass** the gate. The standalone per-check test at `:493-515` correctly asserts `toBe(404)`, but the hard launch gate is defective. Anchor `:578`.

- **F-CC-B03-054 — Medium — "No stale data after deploy" / "data cache invalidates" tests assert only that two responses’ `Date` headers differ by ≥1s after a 1.1s sleep (`:410-436, :466-491`); a fully CDN-cached response can still emit a fresh `Date`, so this does not actually prove the response was not served from a shared cache.**
  The `Date` header reflects when the response message was generated by whichever node served it, including some caches; it is a weak proxy for "live server render / not CDN-cached." The companion `Cache-Control` checks (`:294-340`) are the real signal; the Date-diff tests add little and could pass for a cached surface. Anchor `:421-433, :478-489`.

- **F-CC-B03-055 — Low — `AUTH_NO_STORE_DIRECTIVES` (`:73`) is declared and only used by a self-referential unit test (`:753-756`); it is dead in the live probes (which inline `"no-store"`/`"private"` checks). Minor dead-constant.** Anchor `:73, :753-756`.

- **F-CC-B03-056 — Info — `parseCacheControl`, `extractHashedAssetUrls`, `extractFontUrls` unit tests (`:624-746`) are solid; content-hash assertion for `/_next/static/**` (`:379-408`) is a good cache-invalidation contract.**

---

## Summary of higher-severity items

| ID | Sev | One-line |
|----|-----|----------|
| F-CC-B03-001 | High | Prod-smoke suites hit live production by default under `pnpm test`. |
| F-CC-B03-002 | High | Network-unreachable failures are indistinguishable from real contract gaps. |
| F-CC-B03-030 | High | Phase-13 "P0 launch gate" passes while documented decision is `no-go`. |
| F-CC-B03-041 | High | phase-4 `trpcPost` sends no body → all mutation probes structurally broken. |
| F-CC-B03-053 | High | phase-7 launch-gate `!notFound.status === 404` precedence bug; 404 check is dead. |
| F-CC-B03-003 | Med | Matrix `prod:"pass"` often means source-verified, not live-verified. |
| F-CC-B03-004 | Med | Parity matrix vs report-summary disagree on P0 fail set. |
| F-CC-B03-016 | Med | P0 rows recorded `skip→pass`; regression oracle has no baseline. |
| F-CC-B03-020 | Med | Concurrent quiz probe tests an error path, not the race condition. |
| F-CC-B03-021 | Med | Chat rate-limit "isolation" probe doesn’t test isolation. |
| F-CC-B03-026 | Med | Seed-count parsers are indentation-coupled regex (18/85 oracle fragile). |
| F-CC-B03-031 | Med | Blocker→row coverage check trivially satisfied by any tracked blocker. |
| F-CC-B03-032 | Med | `Blocker.phaseId` referenced but not defined on the type. |
| F-CC-B03-035 | Med | phase-2 reads `cloudbuild.yaml` from `process.cwd()`, CWD-fragile. |
| F-CC-B03-042 | Med | phase-4 seed-oracle shares the brittle-regex fragility. |
| F-CC-B03-047 | Med | Exercise-repo URL oracle uses a loose "first URL after slug" heuristic. |
| F-CC-B03-050 | Med | Latency budgets measured as runner wall-time; warm-dashboard already failing. |
| F-CC-B03-054 | Med | `Date`-diff "no stale data" tests don’t actually prove non-cached. |
| F-CC-B03-010/011/024/025/045/046 | Med | (see body) prose-coupled test, untested export, grep-based responsive contract, real-prod side effects. |

---

## Limitations

- This review covered **only the 20 files listed in `/tmp/opencode/cc-batch-03`**. Implementation files referenced by the tests (e.g. `packages/api/src/routes/auth/login.ts`, `packages/auth/src/session.ts`, `packages/webhooks/src/github.ts`, `packages/types/src/codecamp.ts`, `app/api/chat/route.ts`, `next.config`, `i18n/routing`, `lib/i18n-messages`, `cloudbuild.yaml`) were inspected only where needed to validate a specific claim (`module-utils.ts` was read in full; `report-summary.json` and the `_helpers` directory were listed/spot-checked). Their correctness is **out of scope** here.
- The bug in F-CC-B03-053 and the harness defect in F-CC-B03-041 were identified by static reading of JS/TS semantics; they were **not** confirmed by executing the suites against a live deployment.
- Provenance strings in the parity matrix and `report-summary.json` (commit hashes, "Phase 8.5 deploy verified", 45/45 counts) and the existence/terminal-status of `measure/tracks/codecamp_qa_prod_20260517/metadata.json` and the local-QA track were **not independently verified** in this review.
- Live production behavior (actual headers, status codes, cache directives, AI/webhook responses) was **not** exercised; all conclusions about the *suites* are from source, and all conclusions about *prod* are limited to what the artifacts assert.
- No source code was modified. This report is **input to the broader review track only** and makes **no acceptance or closeout claims**.
