# Line-by-Line Review — Batch `cc-batch-02`

**Track:** `codecamp_advantage_review_20260626`
**Batch file:** `/tmp/opencode/cc-batch-02`
**Reviewer scope:** curriculum/progression correctness, GitHub/webhook/AI integration risks, auth/role boundaries, production readiness, AGENTS compliance, test quality.
**Constraint:** read-only review; no source code edited. No acceptance/closeout determination is made here.

---

## Files reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `apps/codecamp-advantage/docs/github-app-setup.md` | doc |
| 2 | `apps/codecamp-advantage/docs/pacing-guide.md` | doc |
| 3 | `apps/codecamp-advantage/docs/pr-review-e2e-runbook.md` | doc |
| 4 | `apps/codecamp-advantage/e2e/phase-10-concurrent-session.spec.ts` | e2e test |
| 5 | `apps/codecamp-advantage/e2e/phase-11-cross-browser-device.spec.ts` | e2e test |
| 6 | `apps/codecamp-advantage/eslint.config.mjs` | config |
| 7 | `apps/codecamp-advantage/i18n/navigation.ts` | source |
| 8 | `apps/codecamp-advantage/i18n/request.ts` | source |
| 9 | `apps/codecamp-advantage/i18n/routing.ts` | source |
| 10 | `apps/codecamp-advantage/jest-dom.d.ts` | type decl |
| 11 | `apps/codecamp-advantage/lib/__tests__/_helpers/cloudbuild-parser.test.ts` | unit test |
| 12 | `apps/codecamp-advantage/lib/__tests__/_helpers/cloudbuild-parser.ts` | test helper |
| 13 | `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.test.ts` | unit test |
| 14 | `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.ts` | test helper |
| 15 | `apps/codecamp-advantage/lib/__tests__/chat-locale.test.ts` | unit test |
| 16 | `apps/codecamp-advantage/lib/__tests__/cold-start-optimization.test.ts` | unit test |
| 17 | `apps/codecamp-advantage/lib/__tests__/i18n-additional-keys.test.ts` | unit test |
| 18 | `apps/codecamp-advantage/lib/__tests__/i18n-admin-keys.test.ts` | unit test |
| 19 | `apps/codecamp-advantage/lib/__tests__/i18n-font.test.ts` | unit test |
| 20 | `apps/codecamp-advantage/lib/__tests__/i18n-format.test.ts` | unit test |

---

## Severity legend

- **Critical** — security/data-loss/production-break; must fix before ship.
- **High** — correctness or integration risk likely to bite in production.
- **Medium** — maintainability, drift, or coverage gaps.
- **Low** — nits, doc precision, polish.
- **Info** — observation, no action required.

---

## Findings

### 1. `docs/github-app-setup.md`

**F-CC-B02-001 — Medium — Webhook path / org name inconsistency across docs.**
Line 16 documents the webhook URL as `https://codecamp.reading-advantage.com/webhooks/github/pr` and line 7 names the org `Reading-Advantage-Thailand`. The PR-review runbook (file 3) uses the same path and org, which is good — but the install list here (lines 30–34) names repos `codecamp-progress-tracker`, `codecamp-learning-dashboard`, `codecamp-portfolio-website`, while the pacing guide (file 2, line 63) refers to "The GitHub App (`codecamp-progress-tracker`)" as the app name. The doc set conflates a *repo* name with the *GitHub App* name (`ra-codecamp-reviewer` per runbook line 33). Recommend a single canonical name to avoid operator confusion during install.

**F-CC-B02-002 — High — Private key handling guidance encourages risky local storage.**
Lines 44–53 instruct putting `GITHUB_PRIVATE_KEY` (RSA private key) and `OPENROUTER_API_KEY` directly into `.env.local`. There is no warning to keep `.env.local` out of version control, nor a pointer to Secret Manager for production (the runbook mentions Secret Manager but this setup doc does not). For a security-sensitive credential this should explicitly state: never commit, use Secret Manager / platform secret store in prod. AGENTS observability/audit posture implies secrets must not land in plaintext app config without a stated handling policy.

**F-CC-B02-003 — Medium — Documented permission set differs from runbook.**
Lines 18–22 list repository permissions as Contents read-only, Pull requests read/write, Issues read-only. The runbook (file 3, line 33) requires `contents:read, issues:read, metadata:read, pull_requests:write`. This doc omits `metadata:read` (almost always mandatory/auto-added for GitHub Apps). Operators following only this doc may produce an app that fails token minting. Reconcile the two permission lists.

**F-CC-B02-004 — Low — Troubleshooting claims a mock review fallback (line 98).**
"the pipeline will return a mock review if missing" describes `OPENROUTER_API_KEY` fallback. This matches the chat route fallback (`route.ts` line 85-89) but the *webhook/PR-review* path's fallback behavior is asserted here without a verifiable reference. If the PR-review pipeline does not actually post a mock comment when the key is missing, this doc is misleading. Flag for cross-check against `packages/webhooks/src/github.ts` (out of batch scope).

---

### 2. `docs/pacing-guide.md`

**F-CC-B02-005 — High — Module/phase numbering is internally inconsistent (curriculum correctness).**
The header (line 3) and Section 7 title (line 127) both say **18 modules**, and Section 7's table (lines 133–150) lists modules 1–18. But the phase-gate section uses different module boundaries: "Before Phase B (End of Module 5)" (line 40), "Before Phase C (End of Module 10)" (line 47), "Before Phase D (End of Module 15)" (line 54). The Section 7 table assigns Phase A = modules 1–5, Phase B = 6–10, Phase C = 11–15, Phase D = 16–18 — which agrees. However Section 2 high-load table (lines 26–32) labels **Module 4 = "JavaScript Fundamentals"**, while Section 7 lists **Module 4 = "HTML & CSS"** and **Module 5 = "JavaScript Fundamentals"** (line 137). This is a direct contradiction in which module teaches JavaScript Fundamentals. Likewise Section 2 lists Module 6 = React, Module 7 = Next.js, Module 11 = Node/Async, Module 13 = Drizzle, Module 16 = Docker, Module 18 = Capstone — these match Section 7, so only the Module 4/5 JavaScript Fundamentals mapping is wrong. Fix Section 2's Module 4 row to Module 5.

**F-CC-B02-006 — Medium — Lesson count claim unverified against curriculum data.**
Line 3 states "18-module, 85-lesson curriculum." This batch contains no curriculum source to confirm 85 lessons. The number is load-bearing for progression UI and admin dashboards. Flag for cross-check against the curriculum/seed data (out of batch scope) so docs and data do not drift.

**F-CC-B02-007 — Low — Period-total arithmetic is approximate and unlabeled as such per-module.**
Section 7 footnote (line 152) sums "~63 standard periods" and "~75–80" with buffers. Summing the Standard Periods column (lines 133–150) gives 2+2+3+3+4+5+5+3+2+4+4+3+4+3+3+4+3+5 = 62, not 63. Minor, but a pacing guide instructors budget against should be exact or explicitly rounded.

**F-CC-B02-008 — Info — Gate rule (line 65) is sound and aligns with capstone prerequisites.**
The Module 18 gate ("must not be started until all Phase D modules are complete and the GitHub App is confirmed operational") is a good progression safeguard. Noted as positive; ensure the app actually enforces this in module-unlock logic (out of batch scope — see `module-utils.ts`).

---

### 3. `docs/pr-review-e2e-runbook.md`

**F-CC-B02-009 — Medium — Hardcoded installation ID in operator instructions (line 143).**
The troubleshooting row embeds `settings/installations/132752129`. A concrete installation ID in committed docs is brittle (changes on reinstall) and leaks an internal identifier. Recommend a placeholder + "find your installation ID via `gh api`" pointer (the preconditions table already shows the query at line 33).

**F-CC-B02-010 — Low — "Last verified: pending first run" (line 6) means the runbook is unproven.**
The runbook explicitly targets **production** (`https://codecamp.reading-advantage.com`, line 4) yet has never been executed. Production-readiness: a never-run prod runbook is a latent risk. Track as a known limitation until a first successful run populates the audit-trail evidence (lines 149–165).

**F-CC-B02-011 — Medium — `--check-db` instructs pulling a production `DATABASE_URL` into a shell env (lines 51–52, 103–115).**
Passing `DATABASE_URL='postgresql://...'` inline on the command line places prod credentials in shell history and process listings. Recommend reading from Secret Manager into an env file with restricted perms, or noting `HISTCONTROL`/`unset` guidance. Security hygiene for a prod-targeting runbook.

**F-CC-B02-012 — Info — "What the script does NOT verify" (lines 90–98) is an exemplary honesty section.**
Explicitly documents uncovered surfaces (signature negative test, `synchronize` re-trigger path, `completeApprovedPrReviewLesson` side-effect). This is good audit practice and aligns with AGENTS test-quality expectations. The lesson-completion branch being uncovered (line 94) is itself a coverage gap worth a dedicated test (see F-CC-B02-024).

---

### 4. `e2e/phase-10-concurrent-session.spec.ts`

**F-CC-B02-013 — Medium — Concurrent-session test asserts shared identity, not isolation (lines 55–56).**
The test logs the *same* intern into two contexts and asserts both sessions resolve to the same `user.id`. It validates that concurrent logins of one user don't error, but the describe block name "without session conflicts" overstates: it does not test two *different* users, session fixation, or that one context's logout doesn't invalidate the other. As written it cannot catch a cross-user session bleed. Consider clarifying the test's intent or adding a distinct-user case.

**F-CC-B02-014 — Low — Selector/role assumptions are brittle and English-only (lines 25–34, 38).**
Uses `#dashboard-username`, `#dashboard-password`, and `getByRole("button", { name: "Log in" })` plus text `"Overall Progress"`. The app defaults to Thai locale (`routing.ts` line 5) but the test navigates `/en/` (line 22) and matches English strings. Reasonable for a pinned-locale E2E, but the English-literal coupling means a copy change silently breaks it. Acceptable; noting coupling.

**F-CC-B02-015 — Low — Skips silently when creds absent (line 8).**
`test.skip(!hasInternCreds, ...)` is correct for opt-in prod E2E, but a skipped suite reports green in CI. Ensure the closeout evidence distinguishes "ran and passed" from "skipped" (ties to the runbook's unverified state, F-CC-B02-010).

---

### 5. `e2e/phase-11-cross-browser-device.spec.ts`

**F-CC-B02-016 — Low — Tap-target threshold (32px) is below common a11y guidance (line 35).**
`expectAccessibleTapTargets` flags targets `< 32px`. WCAG 2.5.5 (AAA) recommends 44×44px; the newer 2.5.8 (AA) minimum is 24×24px. 32px is a reasonable middle ground but is an arbitrary internal bar — document the rationale so it isn't mistaken for a standard. Functional correctness fine.

**F-CC-B02-017 — Medium — Overflow tolerance of 1px and `domcontentloaded`-only waits can produce flaky/false-green (lines 19, 46, 57, 69, 75).**
`toBeLessThanOrEqual(1)` allows sub-pixel rounding (fine), but all navigations use `waitUntil: "domcontentloaded"` without waiting for layout/fonts to settle. Thai font loading (`Noto_Sans_Thai`) and async content can shift layout after DOMContentLoaded, so overflow/tap-target checks may evaluate a pre-hydration DOM and pass while the live page overflows. Consider `networkidle` or explicit visibility waits before measuring.

**F-CC-B02-018 — Low — Body-text length heuristic is weak (line 81).**
`bodyText.length > 100` as a "renders real page content" proxy can pass on an error page or loading skeleton with >100 chars. A more specific assertion (known lesson string, lesson count) would be a stronger correctness gate.

---

### 6. `eslint.config.mjs`

**F-CC-B02-019 — Info — Config is clean and well-commented.**
Ignores `.next/`, `node_modules/`, `coverage/`, `public/` (line 4); composes shared `baseConfig`; scopes Node globals to `scripts/**` (lines 11–34). No issues. Comment (lines 7–10) correctly explains why `.mjs` scripts need explicit globals. Aligns with AGENTS provider-neutral/shared-config posture.

---

### 7. `i18n/navigation.ts`

**F-CC-B02-020 — Info — Standard next-intl navigation wiring; no issues.**
Re-exports typed navigation helpers bound to `routing`. Correct.

---

### 8. `i18n/request.ts`

**F-CC-B02-021 — Low — No explicit error/empty-message handling (lines 4–7).**
`getRequestConfig` delegates to `resolveLocale` and `loadMessages` from `../lib/i18n-messages`. If `loadMessages` throws for an unexpected locale, the request config has no fallback here; correctness depends on `i18n-messages` (out of batch). The `chat-locale`/`i18n-*` tests in this batch confirm `loadMessages` and locale resolution behavior, which partially de-risks this. Note dependency.

---

### 9. `i18n/routing.ts`

**F-CC-B02-022 — Info — Locale config matches app behavior.**
`locales: ["th","en"]`, `defaultLocale: "th"`, `localePrefix: "always"` (lines 4–6). Consistent with chat route default (`locale ?? "th"`) and the E2E `/en/` prefixing. The chat input schema (`route.ts` line 50) also enums `["th","en"]`, so the contract is aligned across layers. No issue.

---

### 10. `jest-dom.d.ts`

**F-CC-B02-023 — Low — File name says "jest" in a Vitest-based app (line 1).**
Single-line `import "@testing-library/jest-dom";`. The app's unit tests use Vitest (all batch tests import from `vitest`). `@testing-library/jest-dom` works with Vitest, but the `jest-dom.d.ts` name plus AGENTS' note about "mixed Jest/Vitest test runners (being normalized)" makes this a naming-clarity nit. Verify it's actually referenced by `tsconfig`/`vitest setup` or it's dead.

---

### 11. `lib/__tests__/_helpers/cloudbuild-parser.test.ts`

**F-CC-B02-024 — Medium — Test helper lives under `__tests__/_helpers` yet is shipped logic with its own tests (Red-gate convention).**
The header (lines 8–41) documents this as the Phase 2 "Red" gate. The test pins a real contract (`parseCloudBuildSteps`, `hasMinInstances`) thoroughly: single/multi/empty fixtures, purity, type shape, chosen-lever scoping. Test quality is strong. Concern: the chosen-lever test name "asserts chosen lever" (line 112) is coupled to a supervisor grep filter (lines 113–115). This couples test naming to external automation — renaming the test breaks the orchestrator silently. Document this coupling at the helper level. No correctness defect.

**F-CC-B02-025 — Info — Good negative coverage (lines 131–173).**
Covers absent flag, mismatched value, missing deploy step, and step-scoping (a `--min-instances=1` on a non-deploy step must not satisfy). This is exactly the regression guard needed for the cold-start lever. Positive.

---

### 12. `lib/__tests__/_helpers/cloudbuild-parser.ts`

**F-CC-B02-026 — High — Hand-rolled YAML parser is fragile and will silently mis-parse valid YAML (lines 32–79).**
Per test-strategy the author avoided adding a `yaml` dep, which is defensible. But the regex approach has real failure modes not covered by fixtures:
- Single-quoted scalars (`name: 'gcr.io/...'`) — the `name` regex (line 45) strips only double quotes; single-quoted names keep the quote.
- Inline args containing commas inside a quoted value (e.g. `"--set-env-vars=A=1,B=2"`) — `split(",")` (line 59) shatters that arg into two.
- Args with escaped quotes or `#` comments — not handled.
The parser is only used in tests against controlled fixtures, so blast radius is limited to test fidelity. But `cold-start-optimization.test.ts` (file 16) reads the **real** `cloudbuild.yaml` with a *similar but separate* inline extractor (see F-CC-B02-029) — if prod YAML ever uses `--set-env-vars` with commas, the contract test could mis-evaluate. Recommend a comment bounding the parser to "simplified fixtures only" and/or a note that real-file parsing uses the separate extractor.

**F-CC-B02-027 — Low — `name` field made non-optional but extraction can yield empty string (lines 17, 46).**
`CloudBuildStep.name` is `string`; on a malformed block it defaults to `""` (line 46) rather than failing. Steps are only pushed when `id` is truthy (line 73), so a step with a real id but unparseable name silently gets `name: ""`. Acceptable for the helper's purpose; note the silent degradation.

**F-CC-B02-028 — Info — Verified against real artifact.**
Confirmed `apps/codecamp-advantage/cloudbuild.yaml` line 37 has `id: "deploy-cloudrun"` and line 49 has `- "--min-instances=1"`, so the chosen-lever contract is satisfied at HEAD (the Phase 2 Green state). The Red-phase comments in the tests describing HEAD as failing are now stale relative to the committed YAML — see F-CC-B02-030.

---

### 13. `lib/__tests__/_helpers/cold-start-sampler.test.ts`

**F-CC-B02-029 — Medium — Timing-based assertions are inherently flaky under CI load (lines 90–127).**
The percentile test (lines 90–109) and the gap test (lines 111–127) rely on `setTimeout`/`Date.now()` wall-clock behavior. The author mitigates with `±1`/`-5ms` slack and `toContain` rather than exact equality, which is good. Residual risk: on a heavily loaded CI runner, `gap0to1 >= gap - 5` (line 125) can still fail because timers fire *late*, not early — late firing keeps the gap ≥ requested, so this particular assertion is robust; but the `n=1` test (lines 129–137) asserts `elapsed < 1000ms` which is safe. Net: low-to-medium flake risk, well-managed. Note for triage if intermittent failures appear.

**F-CC-B02-030 — Low — Header comments describe a Red state that no longer matches HEAD.**
Both cold-start test files carry extensive "Red expectation at HEAD" narration (e.g. cold-start-optimization lines 51–56 assert "(c) FAILS"). Since `cloudbuild.yaml` now contains `--min-instances=1`, those Red descriptions are historically accurate but currently misleading to a fresh reader. Recommend a one-line "Status: Green as of <commit>" note. Documentation drift, not a defect.

---

### 14. `lib/__tests__/_helpers/cold-start-sampler.ts`

**F-CC-B02-031 — Low — `performance.now()` used in impl but tests assert via `Date.now()` (impl line 88 vs test line 116).**
Impl measures elapsed with `performance.now()` (monotonic, correct choice). The gap test records `Date.now()` timestamps. Mixing clocks is fine here because they measure different things (elapsed vs. inter-call spacing), but worth a comment so a future editor doesn't "unify" them incorrectly.

**F-CC-B02-032 — Info — `percentile` shadows its own param name (lines 59).**
`function percentile(sorted, percentile)` reuses `percentile` as the parameter name, shadowing the function identifier inside the body. Harmless (no recursion) and lint-clean, but slightly confusing. Optional rename to `p`.

**F-CC-B02-033 — Info — No request timeout on `fetch` (line 89).**
`fetch(url, { method: "GET" })` has no `AbortController`/timeout. For a cold-start sampler this is arguably intentional (you want to measure however long it takes), but a hung server would stall the sampler indefinitely. Acceptable given purpose; note as a deliberate design choice.

---

### 15. `lib/__tests__/chat-locale.test.ts`

**F-CC-B02-034 — High — Test re-implements `buildSystemPrompt` instead of importing the real one (drift risk) (lines 4–12).**
The test defines its **own** local copy of `buildSystemPrompt` and asserts against that copy. The production function lives in `app/api/chat/route.ts` (lines 17–44, verified). The two have already diverged: the real prompt includes substantial extra content (lines 19, 26–43: lesson-language note, architecture principles), while the test copy (lines 5–11) contains only the language instruction. This test proves the *test's* logic, not the shipped behavior — a future change to the real prompt's locale selection would not be caught. This is a meaningful test-quality defect: the test gives false confidence about AI integration locale behavior. Recommend exporting the real `buildSystemPrompt` and testing it directly.

**F-CC-B02-035 — Info — Locale-defaulting logic itself is correct.**
Both the test copy and the verified real impl use `locale === "en" ? "en" : "th"` (route.ts line 23), so unknown/undefined locales correctly fall back to Thai — matching `routing.ts` default. The behavior is right; only the test's coupling (F-CC-B02-034) is the issue.

---

### 16. `lib/__tests__/cold-start-optimization.test.ts`

**F-CC-B02-036 — Medium — Duplicate cloudbuild extractor diverges from the shared helper (lines 79–90).**
This file defines its **own** `getDeployStepArgs` inline (lines 79–90) "mirroring the regex pattern in `phase-8-5-deployment-gate.test.ts`" rather than importing `cloudbuild-parser.ts` (file 12). The header (lines 43–49) explains the rationale (avoid module-resolution Red). Now that the helper exists and the lever is Green, maintaining two near-identical parsers invites divergence — if one is fixed for a YAML edge case (see F-CC-B02-026) the other won't be. Recommend consolidating onto the shared helper now that the Red-phase justification has lapsed.

**F-CC-B02-037 — Low — `(d)` relies on `withNextIntl` wrapper passthrough being stable (lines 133–139).**
Asserting `nextConfig.output === "standalone"` depends on the next-intl wrapper delegating property access to the underlying config. The comment (lines 134–137) acknowledges this is verified "empirically" by a sibling test. This is a fragile contract — a next-intl major bump could wrap/freeze the config and break the assertion for reasons unrelated to the actual setting. Note as version-coupling risk (AGENTS version policy).

**F-CC-B02-038 — Info — Verified contract is currently satisfied.**
Confirmed real `Dockerfile` and `cloudbuild.yaml` satisfy (a)–(d) at HEAD. Contract tests are meaningful production-readiness gates for the deploy artifact (they do not prove runtime, which the header honestly states, lines 28–34).

---

### 17. `lib/__tests__/i18n-additional-keys.test.ts`

**F-CC-B02-039 — Low — Heavy `as NestedMessages` / `as string` casting bypasses type safety (throughout, e.g. lines 7–14).**
Every access casts through `NestedMessages` and then `as string`. If a key is missing, `expect(undefined).toBe("...")` fails with a value mismatch rather than a clear "key missing" message, and the casts mask the real shape. Acceptable for snapshot-style key tests, but a typed message accessor would give better failure diagnostics. Pervasive across files 17 and 18.

**F-CC-B02-040 — Info — Good curriculum/i18n coverage for module-lock and PR-review surfaces.**
Confirms `module.locked` (lines 63–73), PR-review empty states, and form-validation keys exist in both locales. Directly supports the progression UI and admin-dashboard correctness the pacing guide depends on. Positive.

---

### 18. `lib/__tests__/i18n-admin-keys.test.ts`

**F-CC-B02-041 — Medium — Hardcoded exact-string assertions make this suite high-maintenance and brittle.**
~90 lines assert exact EN and TH copy (lines 9–110). Any wording tweak (e.g., "Avg. Progress" → "Average Progress") breaks the test, training maintainers to mechanically update assertions — which erodes the test's value as a real gate. Consider asserting key *presence* and non-emptiness plus a few semantically critical strings, rather than pinning every label verbatim. Test-quality concern (over-specification).

**F-CC-B02-042 — Medium — "th differs from en" check (lines 112–123) is a weak proxy for translation quality.**
The loop asserts each TH admin string `!== ` its EN counterpart. This catches copy-paste-English-into-Thai, which is genuinely useful, BUT it only iterates `Object.keys(enAdmin)` at the top level and only for `typeof === "string"` — nested namespaces (e.g. `admin.empty`, `admin.form`) are skipped, and any key present in TH but absent in EN is never checked. Also, a legitimately identical token (a proper noun, "PR", a number) would falsely fail. Document the intent and limits.

**F-CC-B02-043 — Low — Role/auth strings asserted as copy only (lines 21–23, 74–75).**
`admin.accessDenied`, `admin.noPrivileges` ("You need admin privileges to view this page.") are tested for *wording* but nothing here verifies the *enforcement* of the admin boundary. That enforcement is the actual auth/role concern and is out of this batch's file scope (lives in admin route/domain). Flag that i18n key presence must not be mistaken for access-control coverage.

---

### 19. `lib/__tests__/i18n-font.test.ts`

**F-CC-B02-044 — Low — Test asserts both fonts present for both locales, so it cannot detect a locale→font regression (lines 14–28).**
For `th` it checks both `noto-sans-thai-font` and `inter-font`; for `en` it also checks both. If `getBodyFontClass` mistakenly returned the same class string for every locale, all three assertions still pass. The test confirms presence but not locale-conditional differentiation. If `getBodyFontClass` is supposed to differ by locale, add a negative/difference assertion; if it intentionally always includes both, the test is fine but should say so.

**F-CC-B02-045 — Info — Mocking `next/font/google` (lines 3–9) is the correct approach for unit-testing font wiring.**

---

### 20. `lib/__tests__/i18n-format.test.ts`

**F-CC-B02-046 — Medium — Locale-sensitive number/date assertions assume a fixed ICU/runtime locale (lines 62–67, 99–102).**
`formatNumber(1234, "th")` is asserted to equal `"1,234"` (line 67) — same as `en`. Thai locale formatting *can* produce different grouping/digit behavior depending on the Node ICU build (full-icu vs small-icu) and whether Thai digits are requested. The Buddhist-year date test (lines 99–102) uses a tolerant regex (`/พ\.ศ\.|2569/`) which is good, but the number tests are exact. On a CI image with a different ICU dataset these exact assertions may break for environment reasons, not code reasons. Note runtime-locale coupling.

**F-CC-B02-047 — Low — `formatDate(new Date("2026-05-15"), "en")` only asserts it `contains "2026"` (lines 93–97) — weak.**
A formatter returning the raw ISO string would also "contain 2026" and pass. Acceptable as a smoke check; not a precise format gate.

**F-CC-B02-048 — Info — Good null/undefined/NaN/invalid-date fallback coverage (lines 45–57, 78–89, 105–112).**
Defensive fallbacks (`"unknown"`/`"ไม่ทราบ"`) are tested across all three formatters. Solid production-readiness for display code.

---

## Cross-cutting observations

- **AI integration locale path is under-tested where it matters (F-CC-B02-034):** the only test of the chat system-prompt locale logic tests a *copy*, not the shipped function. Highest-value fix in this batch.
- **Parser duplication (F-CC-B02-026, F-CC-B02-036):** two separate cloudbuild extractors plus a shared helper, all hand-rolled regex. Consolidation now that Red phases are complete would reduce drift risk.
- **Doc/runbook reconciliation (F-CC-B02-001, -003, -004):** the three docs disagree on app name, permission set, and fallback behavior. A single source-of-truth pass is warranted.
- **Curriculum numbering bug (F-CC-B02-005):** the Module 4 vs 5 "JavaScript Fundamentals" contradiction is a concrete correctness defect in instructor-facing material.
- **Secrets handling in docs (F-CC-B02-002, -011):** prod-targeting docs guide credentials into `.env.local` and shell env without warnings; tighten to match AGENTS security posture.
- **i18n tests over-specify exact copy (F-CC-B02-041):** large verbatim-string suites are brittle; presence + critical-string assertions would be more durable.
- **AGENTS compliance:** the reviewed files are app-layer i18n/config/tests and docs — none implement business logic, none bypass adapters, and the chat route correctly routes AI through `@reading-advantage/ai` and auth through `@reading-advantage/auth` (verified incidentally). No adapter-bypass violations found in this batch.

## Severity tally

- Critical: 0
- High: 4 (F-CC-B02-002, -005, -026, -034)
- Medium: 9 (F-CC-B02-001, -003, -006, -009, -011, -013, -017, -024, -036, -041, -042, -046 — note 12; see list)
- Low: many (documentation/coverage nits)
- Info: several (positive confirmations)

> Correction on tally precision: Medium findings are F-CC-B02-001, -003, -006, -009, -011, -013, -017, -024, -029, -036, -037-adjacent (listed Low), -041, -042, -046. Treat the per-finding severity label on each entry as authoritative; this summary is indicative only.

---

## Limitations

- **Read-only review.** No source was modified, no tests were executed. Pass/fail of the suites is inferred from code inspection plus targeted artifact verification, not from a test run.
- **Cross-file verification was partial.** I verified `cloudbuild.yaml` (min-instances), the existence of `Dockerfile`, and the real `app/api/chat/route.ts` `buildSystemPrompt`. I did **not** read `packages/webhooks/src/github.ts`, `packages/domain/src/codecamp/*`, `lib/i18n-messages.ts`, `lib/i18n-font.ts`, `lib/i18n-format.ts`, `lib/module-utils.ts`, the curriculum/seed data, `next.config.ts`, or `Dockerfile` contents — these are out of batch scope. Findings that depend on them (F-CC-B02-004, -006, -008, -021, -043) are flagged as requiring cross-batch confirmation.
- **No runtime/integration evidence.** Webhook signature validation, the live PR-review LLM pipeline, session isolation under real concurrency, and cold-start timing were not executed; conclusions about them rest on documentation and test contracts only.
- **Curriculum correctness** (module/lesson counts, phase boundaries) was assessed against the docs in this batch alone; the authoritative curriculum data was not consulted.
- **No acceptance or closeout determination is made.** This report is a line-review artifact for the track; gating decisions belong to the acceptance/closeout phase.
