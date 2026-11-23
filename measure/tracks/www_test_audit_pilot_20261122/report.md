# Pilot report: www test audit

Track: `www_test_audit_pilot_20261122`.
Scope: test files under `apps/www-reading-advantage`.
Source: PM plan A-66, approved by Daniel on 2026-11-17.
Source: `measure/tracks/www_test_audit_pilot_20261122/spec.md`.

## 1. Result

The baseline holds 3175 cases and 86.52 % line coverage (`measure/runs/www_test_audit_pilot_20261122/baseline.json`). The final run at `e91c4d4cc` holds 1412 cases and 92.07 % line coverage (`measure/runs/www_test_audit_pilot_20261122/gate-66aeb1011.json`). The cut is 1763 cases, or 55.5 % of the baseline (`baseline.json`, `gate-66aeb1011.json`; computed from those two files). The target is a cut of 20 % (the `spec.md` Goal section). That share of 3175 cases is 635 cases (the `spec.md` Goal section, `baseline.json`; computed). The result passes that target. Line coverage rose by 5.55 points (`baseline.json`, `gate-66aeb1011.json`).

The blog merge carried the cut. The merged file fell from 1726 cases to 17 cases (`measure/runs/www_test_audit_pilot_20261122/gate-257a6b0c.json`: cases_before 3094, cases_after 1385). The merge removed 1709 cases. It counts only because one broken post fails the merged test and is named in the failure (`measure/runs/www_test_audit_pilot_20261122/proof-blog-merge.log`). The rule is the `Approved merge line` of the `classification.md` Approved merge line section.

Without the merge, the cut is small. Phase 2 ended at 3094 cases (`gate-257a6b0c.json`, cases_before). That cut is 81 cases, or 2.6 % of 3175 (`baseline.json`, `gate-257a6b0c.json`). Later R2 and helper cases raised the count. Without the merge, the final count would be 3121 cases, a cut of 54 cases or 1.7 % (`gate-66aeb1011.json`, `gate-257a6b0c.json`; computed from those files). The classification projected 5.5 % to 6.2 % (the `classification.md` Projected cut section). The honest pre-merge cut stays below that range.

## 2. Per-class commits

Each row comes from the named gate JSON. The `GREEN` column is its `green_exit_code` field.

| Class | Task | Commit | cases_before | cases_after | GREEN | Coverage % | GREEN log | COVERAGE log | Gate JSON |
|---|---|---|---|---|---|---|---|---|---|
| D1 | 2.1 | 0be4a0374 | 3175 | 3168 | 0 | 89.92 | green-0be4a037.log | coverage-0be4a037.log | gate-0be4a037.json |
| D2 | 2.2 | e332f594e | 3168 | 3146 | 0 | 89.92 | green-e332f594.log | coverage-e332f594.log | gate-e332f594.json |
| D3 | 2.3 | 409108d3e | not recorded | not recorded | not recorded | not recorded | none; no rows | none; no rows | none; no gate (the `plan.md` Phase 2 task for D3) |
| D4 | 2.4 | 0d705612d | 3146 | 3140 | 0 | 89.86 | green-0d705612.log | coverage-0d705612.log | gate-0d705612.json |
| D5 part 1 | 2.5 | ee5c7b739 | 3140 | 3140 | 0 | 89.94 | green-ee5c7b73.log | coverage-ee5c7b73.log | gate-ee5c7b73.json |
| D5 part 2 | 2.5 | 7008ccefd | 3140 | 3081 | 0 | 89.94 | green-at-7008ccef.log | coverage-7008ccef.log | gate-7008ccef.json |
| D5 part 3 | 2.5 | c577cdf18 | 3081 | 3048 | 0 | 89.94 | green-c577cdf.log | coverage-c577cdf.log | gate-c577cdf.json |
| D5 part 4 | 2.5 | 407c5d9bd | 3048 | 3035 | 0 | 90.03 | green-407c5d9.log | coverage-407c5d9.log | gate-407c5d9.json |
| R2 | 3.2 | adf24e723 | 3094 | 3094 | 0 | 91.60 | green-adf24e7.log | coverage-adf24e7.log | gate-adf24e7.json |
| Blog merge | 3.5 | 257a6b0cd | 3094 | 1385 | 0 | 91.60 | green-257a6b0c.log | coverage-257a6b0c.log | gate-257a6b0c.json |

All log and gate paths are under `measure/runs/www_test_audit_pilot_20261122/`. Every named log exists. A GREEN log ends with the Vitest summary lines for files, tests and duration. A COVERAGE log ends with the coverage table and its `Coverage summary` block with percentage rows. I read the ends of `green-4d168813.log`, `green-bcaa97f.log`, `coverage-4d168813.log` and `coverage-bcaa97f.log` to confirm this. The original `green-7008ccef.log` holds an accounting-track task plan, with Phase 7 Red and Green rows for intake documents and monthly close. It holds no Vitest summary and no result block. The rerun `green-at-7008ccef.log` is the cited evidence for D5 part 2. The two reruns are `green-at-733319505.log` with `coverage-at-733319505.log`, and `green-at-fb5622ed7.log` with `coverage-at-fb5622ed7.log`.

Each fix commit has a named GREEN log and COVERAGE log in `measure/runs/www_test_audit_pilot_20261122/`.

| Fix commit | GREEN log | COVERAGE log |
|---|---|---|
| 733319505 | green-at-733319505.log | coverage-at-733319505.log |
| 7c2d93e2 | green-7c2d93e2.log | coverage-7c2d93e2.log |
| 3b044ec9 | green-3b044ec9.log | coverage-3b044ec9.log |
| 7480484d4 | green-7480484.log | coverage-7480484.log |
| 4d1688131 | green-4d168813.log | coverage-4d168813.log |
| bcaa97ff4 | green-bcaa97f.log | coverage-bcaa97f.log |
| 9eb3b9c4f | green-9eb3b9c4.log | coverage-9eb3b9c4.log |
| fb5622ed7 | green-at-fb5622ed7.log | coverage-at-fb5622ed7.log |
| 09c48878d | green-09c48878d.log | coverage-09c48878d.log |
| 0f63c5a9a | green-0f63c5a9a.log | coverage-0f63c5a9a.log |
| 93a16fe3b | green-93a16fe3b.log | coverage-93a16fe3b.log |
| 286d95a99 | green-286d95a99.log | coverage-286d95a99.log |
| de68074d9 | green-de68074d9.log | coverage-de68074d9.log |
| 338047c69 | green-338047c69.log | coverage-338047c69.log |
| 7b62bed78 | green-7b62bed78.log | coverage-7b62bed78.log |
| e153b885 | green-e153b88.log | coverage-e153b88.log |
| dce443985 | green-dce4439.log | coverage-dce4439.log |
| 98c2713d3 | green-98c2713d3.log | coverage-98c2713d3.log |
| 88b26fb9b | green-88b26fb9b.log | coverage-88b26fb9b.log |
| a53d426d5 | green-a53d426d5.log | coverage-a53d426d5.log |
| 6be92dd85 | green-6be92dd85.log | coverage-6be92dd85.log |
| 66aeb1011 | green-66aeb1011.log | coverage-66aeb1011.log |
| 8d5ad1c4 | green-8d5ad1c4.log | coverage-8d5ad1c4.log |

Every named log exists. GREEN logs end with the Vitest summary; COVERAGE logs end with the coverage table and `Coverage summary` block. The two `green-at-*` rows above are reruns.

## 3. What went, what changed, why

Data in this section comes from `measure/tracks/www_test_audit_pilot_20261122/classification.md`.

- **D1 source-text**, 67 cases. Seven deletes remove static source reads with no rendered output. Sixty rewrites keep the rule through rendered or real-file behavior. Sources: `classification.md`, D1 rows section; `plan.md`, Phase 2 tasks. Examples: CEFR-only copy, real cover files, compact hero height, truthful claims.
- **D2 duplicate**, 22 cases deleted. The original explicit-English row was not kept as a same-rule duplicate. Commit `fb5622ed7` restored the test `returns the en directory when locale is en` in `src/lib/blog-locale.test.ts`. The omitted-argument case checks a different rule. The Primary containers and order cases stay in `page.content.test.tsx`. The reading-time number cases stay in `blog.test.ts`. The favicon byte cases stay in `real-logos-captures-adversarial.test.ts`. The removed-literal sweep stays in `real-logos-adversarial.test.ts`. The retired picture set stays in `www-tutor-followups.adversarial.test.ts`. The M4 slot order stays in `tutor-screens.test.ts`.
- **D3 dead target**, zero rows. No commit and no gate. Both image-source suites read sources that exist. Source: `classification.md`, D3 rows section.
- **D4 weak check**, six cases deleted. Commit `0d705612d` deleted three navigation cases that asserted the active locale through the real `useCurrentLocale` hook; commit `9eb3b9c4f` restored the Thai and Chinese cases. Two capture cases pinned the test file own names. One image case returned early without an environment flag. Source: `classification.md`, D4 rows section.
- **D5 copy pin**, 221 cases. Four parts replace word-for-word pins with locale-key checks. The final case count is 3035 cases (`gate-407c5d9.json`). Money pins stay as K. Source: `classification.md`, D5 rows section.
- **R1 over-mocked**, zero rows. Boundary mocks stand in for adapters, not for code under test. Source: `classification.md`, R1 rows section.
- **R2 brittle**, 16 cases rewritten. Fourteen R2 cases were rewritten in nine files in `adf24e723`. Two cases were rewritten earlier in `0be4a0374`. The checks now read computed CSS, real color tokens, and DOM behavior. Sources: `classification.md`, R2 rows section; `plan.md`, Phase 3 tasks; `git show --stat adf24e723`.
- **R3 unclear**, zero rows. Case names already state a rule or contract id. Source: `classification.md`, R3 rows section.
- **Blog merge**, one case per rule. Fifteen rule checks and two discovery cases remain. The loader reads only names ending in the exact lowercase `.md` suffix (`fixtures/blog-posts-loader.ts`). Dot-prefixed `.md` posts and symlinks to `.md` files restore parity with the phase-base test and `blog.ts`. A non-file entry named with lowercase `.md` also keeps parity. The phase-base test called readFileSync on every `.md` name. A directory named `x.md` failed with EISDIR. The `.mdx` and uppercase `.MD` name checks are new, stricter naming validation, not parity checks. Sources: `plan.md`, blog merge task; `proof-f22.log`, `proof-f25.log`, `proof-adv8.log`, `proof-adv11.log`, `proof-adv22.log`.
- **Lint warnings**, three. Only the unused `beforeEach` import predates Phase 2. D5 part 2 made `sectionOf` and `copy` unused. Source: `review-a-c673f21.json`.

## 4. K rows kept

`classification.md`, K rows section, lists 77 K file groups. The classification summary table gives 2843 K cases. No K row was deleted. The git diff over the seven tutor-commission files from `a1caa5803` to HEAD returns no output. The command exit code is 0. This is the empty result from this session's run.

The Mutation check column gives the status of each K row. A proof name is listed only when that proof breaks the rule of THAT K row. I read each cited proof log and compared its failing target with the K rule in the `classification.md` K rows section. A value of `none` means no proof of that row's own rule exists. The Other file proofs column records proofs that break another rule in the same file. A passing run is named as such and is not a mutation proof.

The blog validation row has mixed evidence. `proof-adv8.log` and `proof-adv11.log` name a failing `.md` extension assertion. That assertion belongs to the blog K row naming checks. The same two logs also assert new discovery conditions for `.mdx` and uppercase `.MD` names. Those discovery conditions are stricter naming validation, not parity with the phase-base test. `proof-adv22.log` asserts a lowercase `.md` non-file entry, which keeps parity with the phase-base test. No Stryker baseline ran. The www app imports no core module.

| K file group | Cases | Mutation check | Other file proofs |
|---|---|---|---|
| src/__tests__/proxy-redirect.test.ts | 5 | none |  |
| src/lib/blog-locale.test.ts | 4 | none |  |
| src/locales/navigation.test.tsx | 1 | none |  |
| src/__tests__/phase-2-seo-assets.red.test.ts | 4 | none |  |
| src/__tests__/phase-2-seo-blog-routes.red.test.ts | 10 | none |  |
| src/__tests__/phase-2-seo-remaining-static.red.test.ts | 10 | none |  |
| src/__tests__/phase-3-group-b-types.test.ts | 4 | none |  |
| src/__tests__/phase-3-i18n.red.test.ts | 1 | proof-f4b.log |  |
| src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx | 4 | none |  |
| src/__tests__/phase-4-browser-regressions.red.test.tsx | 1 | none | proof-f19-phase-4-browser-regressions.log, proof-f20-phase-4-browser-regressions.log, proof-f21-phase-4-browser-regressions.log (contrast); proof-r2-phase-4-browser-regressions.log (mobile width); proof-adv17.log (passing run) |
| src/__tests__/phase-4-browser-regressions-final.red.test.tsx | 1 | none | proof-r2-phase-4-browser-regressions-final.log (R2 overflow case) |
| src/__tests__/phase-4-contact-authority.red.test.tsx | 2 | proof-f4-r2.log, proof-f4a.log, proof-pa-f1.log |  |
| src/__tests__/phase-5-pricing-legal.red.test.tsx | 2 | none |  |
| src/__tests__/products-page-pictures.red.test.tsx | 22 | none |  |
| src/__tests__/www-features-page.content.test.tsx | 32 | none |  |
| src/__tests__/www-features-pricing.assets.test.ts | 21 | none |  |
| src/__tests__/www-features-pricing.locale.test.ts | 13 | none |  |
| src/__tests__/www-pricing-page.content.test.tsx | 23 | proof-f12-r2.log |  |
| src/__tests__/www-pricing-required-rows.red.test.ts | 7 | none |  |
| src/__tests__/www-pricing-rows-fluid.red.test.ts | 3 | none |  |
| src/__tests__/www-pricing-stacking.red.test.ts | 22 | none |  |
| src/__tests__/www-reading-card.red.test.ts | 10 | none |  |
| src/__tests__/www-reading-cover.red.test.ts | 5 | none | proof-r2-www-reading-cover.log (crop fit R2) |
| src/__tests__/www-stem-date-line.locale.test.ts | 6 | none |  |
| src/__tests__/www-batch-20261116.locale.test.ts | 28 | none |  |
| src/__tests__/www-batch-20261119.locale.test.ts | 1 | none |  |
| src/__tests__/www-tutor-calculator.locale.test.ts | 15 | none |  |
| src/__tests__/www-tutor-followups.adversarial.test.ts | 5 | none |  |
| src/__tests__/www-tutor-reedy-claim.test.tsx | 7 | none | proof-adv3.log, proof-adv456.log, proof-pa-f3.log, proof-f9-r2.log (eligibility rules) |
| src/__tests__/www-tutor-screens-copy.adversarial.test.ts | 5 | none |  |
| src/app/[locale]/(marketing)/(home)/page.test.tsx | 6 | none |  |
| src/app/[locale]/(marketing)/blog/page.test.tsx | 9 | none |  |
| src/app/[locale]/(marketing)/products/codecamp-advantage/page.test.tsx | 3 | none |  |
| src/app/[locale]/(marketing)/products/math-advantage/page.test.tsx | 4 | none |  |
| src/app/[locale]/(marketing)/products/primary-advantage/page.adversarial.test.tsx | 40 | none |  |
| src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx | 53 | none |  |
| src/app/[locale]/(marketing)/products/reading-advantage/page.test.tsx | 6 | none |  |
| src/app/[locale]/(marketing)/products/science-advantage/page.test.tsx | 4 | none |  |
| src/app/[locale]/(marketing)/products/stem-advantage/page.test.tsx | 4 | none |  |
| src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx | 33 | none |  |
| src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx | 2 | none |  |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.adversarial.test.tsx | 5 | none |  |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.followups.adversarial.test.tsx | 4 | none |  |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx | 33 | none |  |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.phase3.adversarial.test.tsx | 25 | none |  |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.placeholders.test.tsx | 3 | none |  |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx | 14 | none |  |
| src/app/[locale]/(marketing)/products/zhongwen-advantage/page.test.tsx | 4 | none |  |
| src/components/blog/blog-pagination.test.tsx | 5 | none | proof-r2-blog-pagination.log (wrap rule) |
| src/components/common/localized-link.test.tsx | 8 | none |  |
| src/components/marketing/experience-demo.test.tsx | 3 | none |  |
| src/components/marketing/hero-section.test.tsx | 5 | none | proof-f24.log, proof-r2-hero-section.log (gradient rules) |
| src/components/marketing/mastery-advantage-graph.test.tsx | 13 | none |  |
| src/components/marketing/tutor-commission-calculator.test.tsx | 22 | none |  |
| src/components/marketing/tutor-commission-calculator.adversarial.test.tsx | 17 | none |  |
| src/components/marketing/tutor-commission-calculator.legs.adversarial.test.tsx | 30 | none |  |
| src/components/products/storytime-song-player.test.tsx | 15 | none |  |
| src/lib/__tests__/real-logos-adversarial.test.ts | 114 | none |  |
| src/lib/__tests__/real-logos-captures-adversarial.test.ts | 103 | none |  |
| src/lib/__tests__/real-logos-captures.red.test.ts | 16 | none |  |
| src/lib/__tests__/real-logos-favicon.red.test.ts | 1 | none |  |
| src/lib/__tests__/real-logos-mapping.red.test.ts | 34 | none |  |
| src/lib/__tests__/real-logos-references.red.test.ts | 12 | none |  |
| src/lib/__tests__/site-assets.test.ts | 2 | none |  |
| src/lib/__tests__/storytime-page-images.test.ts | 3 | none |  |
| src/lib/__tests__/tutor-screens.adversarial.test.ts | 4 | none |  |
| src/lib/__tests__/tutor-screens.test.ts | 12 | none |  |
| src/lib/blog-blocks.test.ts | 18 | none |  |
| src/lib/blog-draft.test.ts | 6 | none |  |
| src/lib/blog-posts-validation.test.ts | 1726 | proof-blog-merge.log, proof-f25.log, proof-f22.log, proof-adv8.log, proof-adv11.log (title, slug and .md extension naming rules) | proof-adv8.log, proof-adv11.log (new .mdx and uppercase .MD discovery assertions), proof-adv22.log (lowercase .md non-file parity assertion) |
| src/lib/blog.test.ts | 28 | none |  |
| src/lib/tutor-commission.test.ts | 34 | none |  |
| src/lib/tutor-commission.adversarial.test.ts | 24 | none |  |
| src/lib/tutor-commission.followups.adversarial.test.ts | 4 | none |  |
| src/lib/tutor-commission.settlement.adversarial.test.ts | 37 | none |  |
| src/lib/wave2-product-claim-helper.test.ts | 12 | none |  |
| src/lib/__tests__/primary-page-images.test.ts | 9 | none |  |

The money rules stay through the seven tutor-commission files named in this section. The per-row Mutation check and Other file proofs columns above are the record required by the `spec.md` Out of scope section. The 77 rows still sum to 2843 cases in the `classification.md` Summary table.

## 5. Finding history

The true history is in the run files under `measure/runs/www_test_audit_pilot_20261122/`.
Role result logs are the files that hold a `MEASURE_AGENT_RESULT` block. List them with `grep -l MEASURE_AGENT_RESULT measure/runs/www_test_audit_pilot_20261122/green-*.log`. Some hold a `dispositions:` line and some do not.

Test-run logs are `green-at-*.log`, `coverage-*.log`, `coverage-at-*.log` and the `green-<sha>.log` files that hold only runner output, with no `MEASURE_AGENT_RESULT` block.

One file, `green-7008ccef.log`, holds a task plan for the accounting track. It lists Phase 7 tasks, such as Red and Green rows for intake documents and monthly close. It holds no Vitest summary and no `MEASURE_AGENT_RESULT` block. The rerun is `green-at-7008ccef.log`.

These categories overlap in name. A role result log and a test-run log can share the `green-<short>.log` pattern. Open a file to learn its kind.

Read `review-a-*.json` for Review A, `adversarial-*.json` for adversarial testing, `phase-acceptance-*.json` for phase acceptance and `second-check-*.json` for the second check.

Finding IDs repeat across roles. Read an ID with its role file. This report copies no finding text on purpose.

PM-approved items and recorded deviations are in `plan.md` under Recorded deviations and in the review and acceptance JSON files. See the run files for the full record.

## 6. Lessons

- A merged or rewritten test must reuse the exact reading code of the test it replaces. Loader defects came from a reader stricter or looser than the phase-base code. Fixes widened the sweep to match `blog.ts` and the phase-base test. Stricter naming checks stay separate from parity checks.
- The jr-green role gate ran tests only. Check-types and lint were outside it. A type error from `4d1688131` passed three review rounds. The repair is `8d5ad1c4`. Add check-types and lint to that gate for later audits.
- Hand-built CSS contrast checks cost six remediation rounds. jsdom does not evaluate custom properties in a full cascade. The helper now fails closed on local token overrides. Only two R2 contrast tests use it. A later audit should consider dropping contrast checks from unit tests.
- The second check by another family passed (`second-check-d1b9d59.json`).
- A hand-written evidence table needs a script. The report now points to run files instead of copying finding history.

## 7. Time

Before: `Test Files  91 passed (91)`, `Tests  3175 passed (3175)`, `Duration  90.47s (transform 1.33s, setup 4.25s, import 8.62s, tests 32.00s, environment 37.01s)` (`measure/runs/www_test_audit_pilot_20261122/baseline.log`, GREEN tail). The same value is `test_wall_seconds=90.47` in `baseline.json`.

After: `Test Files  98 passed (98)`, `Tests  1412 passed (1412)`, `Duration  98.11s (transform 1.34s, setup 4.43s, import 16.37s, tests 27.05s, environment 41.28s)` (`measure/runs/www_test_audit_pilot_20261122/green-66aeb1011.log`).

The difference is +7.64 seconds (`baseline.log`, `green-66aeb1011.log`; computed from those two lines). Both runs used the shared runner with `HEAVY_PREFLIGHT_WAIT_S=3600` (`baseline.log`; `gate-66aeb1011.json`, green command). Both used the same Vitest command with one worker and the dot reporter (`baseline.log`, `gate-66aeb1011.json`). The two runs are comparable.

The cause of the increase is not recorded. Neither runner log holds per-file timing, and no per-file timing was recorded at the baseline commit. The before comparison by file is not recorded. The baseline suite was not run again for this report.

HYPOTHESIS (not a finding): the added tests compile the real stylesheet and read computed styles through `fixtures/real-css.ts` and `fixtures/contrast.ts`. That work is heavier than the deleted source-text and copy-pin cases. The two runs each ran once, so run-to-run noise is not excluded.

To make the claim checkable, one verbose run at head went through heavy-run. The log is `measure/runs/www_test_audit_pilot_20261122/timing-at-head.log`. The JSON report is `measure/runs/www_test_audit_pilot_20261122/timing-at-head.json`. That JSON has no root `duration` field. Its root keys are `numTotalTestSuites`, `numPassedTestSuites`, `numFailedTestSuites`, `numPendingTestSuites`, `numTotalTests`, `numPassedTests`, `numFailedTests`, `numPendingTests`, `numTodoTests`, `snapshot`, `startTime`, `success` and `testResults`. Each `testResults[]` item holds `assertionResults`, `startTime`, `endTime`, `status`, `message` and `name`. It holds no file duration field. Each `assertionResults[]` item holds a nonzero `duration`. The figures below sum `assertionResults[].duration` across all items of one `testResults[]` file entry. The five slowest files at head are:

| Slowest file | Sum of assertionResults[].duration |
|---|---|
| src/components/marketing/tutor-commission-calculator.legs.adversarial.test.tsx | 6461.93 ms |
| src/lib/__tests__/real-logos-captures-adversarial.test.ts | 1649.38 ms |
| src/lib/blog-blocks.test.ts | 1303.32 ms |
| src/lib/__tests__/storytime-page-images.test.ts | 970.85 ms |
| src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx | 859.77 ms |

Four of the five files are unchanged K rows (the `classification.md` K rows section). The fifth file, `src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx`, was changed in this track. The command `git log --oneline 635a604c8..HEAD -- <path>` lists 7008ccefd, 733319505 and fb5622ed7. From the Phase 3 base, `git log --oneline 8a126f612..HEAD -- <path>` lists no commit. The file holds both kept K cases and rewritten cases. The timing run does not prove the hypothesis. The PM decided that the time gap and the hypothesis stay in this report only. No follow-up task was opened.

## 8. Facts changed for the PM

None. This track changed test files, test fixtures and `measure/` files only. No company copy changed.
