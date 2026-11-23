# Pilot report: www test audit

Track: `www_test_audit_pilot_20261122`.
Scope: test files under `apps/www-reading-advantage`.
Source: PM plan A-66, approved by Daniel on 2026-11-17.
Source: `measure/tracks/www_test_audit_pilot_20261122/spec.md`.

## 1. Result

The baseline holds 3175 cases and 86.52 % line coverage (`measure/runs/www_test_audit_pilot_20261122/baseline.json`). The final run at `e91c4d4cc` holds 1412 cases and 92.07 % line coverage (`measure/runs/www_test_audit_pilot_20261122/gate-66aeb1011.json`). The cut is 1763 cases, or 55.5 % of the baseline (`baseline.json`, `gate-66aeb1011.json`; computed from those two files). The target is a cut of 20 % (`spec.md:11`). That share of 3175 cases is 635 cases (`spec.md:11`, `baseline.json`; computed). The result passes that target. Line coverage rose by 5.55 points (`baseline.json`, `gate-66aeb1011.json`).

The blog merge carried the cut. The merged file fell from 1726 cases to 17 cases (`measure/runs/www_test_audit_pilot_20261122/gate-257a6b0c.json`: cases_before 3094, cases_after 1385). The merge removed 1709 cases. It counts only because one broken post fails the merged test and is named in the failure (`measure/runs/www_test_audit_pilot_20261122/proof-blog-merge.log`). The rule is the `Approved merge line` of `measure/tracks/www_test_audit_pilot_20261122/classification.md:250-258`.

Without the merge, the cut is small. Phase 2 ended at 3094 cases (`gate-257a6b0c.json`, cases_before). That cut is 81 cases, or 2.6 % of 3175 (`baseline.json`, `gate-257a6b0c.json`). Later R2 and helper cases raised the count. Without the merge, the final count would be 3121 cases, a cut of 54 cases or 1.7 % (`gate-66aeb1011.json`, `gate-257a6b0c.json`; computed from those files). The classification projected 5.5 % to 6.2 % (`classification.md:246`). The honest pre-merge cut stays below that range.

## 2. Per-class commits

Each row comes from the named gate JSON. The `GREEN` column is its `green_exit_code` field.

| Class | Task | Commit | cases_before | cases_after | GREEN | Coverage % | GREEN log | COVERAGE log | Gate JSON |
|---|---|---|---|---|---|---|---|---|---|
| D1 | 2.1 | 0be4a0374 | 3175 | 3168 | 0 | 89.92 | green-0be4a037.log | coverage-0be4a037.log | gate-0be4a037.json |
| D2 | 2.2 | e332f594e | 3168 | 3146 | 0 | 89.92 | green-e332f594.log | coverage-e332f594.log | gate-e332f594.json |
| D3 | 2.3 | 409108d3e | not recorded | not recorded | not recorded | not recorded | none; no rows | none; no rows | none; no gate (`plan.md:96`) |
| D4 | 2.4 | 0d705612d | 3146 | 3140 | 0 | 89.86 | green-0d705612.log | coverage-0d705612.log | gate-0d705612.json |
| D5 part 1 | 2.5 | ee5c7b739 | 3140 | 3140 | 0 | 89.94 | green-ee5c7b73.log | coverage-ee5c7b73.log | gate-ee5c7b73.json |
| D5 part 2 | 2.5 | 7008ccefd | 3140 | 3081 | 0 | 89.94 | green-at-7008ccef.log | coverage-7008ccef.log | gate-7008ccef.json |
| D5 part 3 | 2.5 | c577cdf18 | 3081 | 3048 | 0 | 89.94 | green-c577cdf.log | coverage-c577cdf.log | gate-c577cdf.json |
| D5 part 4 | 2.5 | 407c5d9bd | 3048 | 3035 | 0 | 90.03 | green-407c5d9.log | coverage-407c5d9.log | gate-407c5d9.json |
| R2 | 3.2 | adf24e723 | 3094 | 3094 | 0 | 91.60 | green-adf24e7.log | coverage-adf24e7.log | gate-adf24e7.json |
| Blog merge | 3.5 | 257a6b0cd | 3094 | 1385 | 0 | 91.60 | green-257a6b0c.log | coverage-257a6b0c.log | gate-257a6b0c.json |

All log and gate paths are under `measure/runs/www_test_audit_pilot_20261122/`. Every named log exists. Each GREEN log reports a passing test run. The original `green-7008ccef.log` holds an accounting plan, not a test run. The F10 rerun `green-at-7008ccef.log` is the cited evidence for D5 part 2. The F16 reruns are `green-at-733319505.log` with `coverage-at-733319505.log`, and `green-at-fb5622ed7.log` with `coverage-at-fb5622ed7.log`. Each of those four logs exists and ends with a passing test summary.

### Remediation commits

Each row names the finding and the fix commit recorded in `measure/tracks/www_test_audit_pilot_20261122/plan.md`.

| Finding | Fix commit | Plan task |
|---|---|---|
| F1, F2 | 733319505, 7c2d93e2 | 2.7, 2.10 |
| F3 | 3b044ec9 | 2.10 |
| F4, F17 | 7480484d4 | 2.9 |
| F5 to F8 | fb5622ed7, 9eb3b9c4f | 2.7 |
| F9, F12 | bcaa97ff4 | 2.9 |
| F10, F11, F16 | recorded deviations; no fix commit | `plan.md` Recorded deviations |
| F19 | 09c48878d | 3.6 |
| F20 | 0f63c5a9a | 3.7 |
| F21 | 93a16fe3b | 3.8 |
| F22 to F24 | 286d95a99, de68074d9, 338047c69 | 3.11 |
| F25 | 7b62bed78 | 3.14 |
| ADV-3 | e153b885 | 2.11 |
| ADV-4 to ADV-6 | dce443985 | 2.13 |
| ADV-8 | 98c2713d3 | 3.9 |
| ADV-11 | 88b26fb9b | 3.10 |
| ADV-15 | a53d426d5 | 3.12 |
| ADV-17 to ADV-19 | 6be92dd85 | 3.13 |
| ADV-22 | 66aeb1011 | 3.15 |
| 8d5ad1c4 type repair | 8d5ad1c4 | 2.12 |

Each fix commit has a named GREEN log and COVERAGE log in `measure/runs/www_test_audit_pilot_20261122/`.

| Fix commit | GREEN log | COVERAGE log |
|---|---|---|
| 733319505 | green-at-733319505.log | coverage-at-733319505.log |
| 7c2d93e2 | green-7c2d93e2.log | coverage-7c2d93e2.log |
| 3b044ec9 | green-3b044ec9.log | coverage-3b044ec9.log |
| 7480484d4 | green-7480484.log | coverage-7480484.log |
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

All 42 named logs exist and end with a passing test summary. The F16 reruns are the two `green-at-*` rows above.

## 3. What went, what changed, why

Data in this section comes from `measure/tracks/www_test_audit_pilot_20261122/classification.md`.

- **D1 source-text**, 67 cases. Seven deletes remove static source reads with no rendered output (`classification.md:227`, `plan.md:83-87`). Sixty rewrites keep the rule through rendered or real-file behavior (`classification.md:227`). Examples: CEFR-only copy, real cover files, compact hero height, truthful claims.
- **D2 duplicate**, 22 cases deleted (`classification.md:228`, `plan.md:89-94`). The kept duplicates are named in `classification.md:146-154`. The Primary containers and order cases stay in `page.content.test.tsx`. The reading-time number cases stay in `blog.test.ts`. The favicon byte cases stay in `real-logos-captures-adversarial.test.ts`. The removed-literal sweep stays in `real-logos-adversarial.test.ts`. The retired picture set stays in `www-tutor-followups.adversarial.test.ts`. The M4 slot order stays in `tutor-screens.test.ts`.
- **D3 dead target**, zero rows (`classification.md:159-161`). No commit and no gate. Both image-source suites read sources that exist.
- **D4 weak check**, six cases deleted (`classification.md:228`, `plan.md:99-104`). Three navigation cases echoed a mocked locale. Two capture cases pinned the test file's own names. One image case returned early without an environment flag.
- **D5 copy pin**, 221 cases (`classification.md:231`). Four parts replace word-for-word pins with locale-key checks (`plan.md:106-125`). The final case count is 3035 cases (`gate-407c5d9.json`). Money pins stay as K.
- **R1 over-mocked**, zero rows (`classification.md:182-186`). Boundary mocks stand in for adapters, not for code under test.
- **R2 brittle**, 16 cases rewritten (`classification.md:233`). Fourteen R2 cases were rewritten in nine files in `adf24e723` (`plan.md:259`; `git show --stat adf24e723` lists nine paths). Two cases were rewritten earlier in `0be4a0374` under deviation F11 (`plan.md:272-276`). The checks now read computed CSS, real color tokens, and DOM behavior.
- **R3 unclear**, zero rows (`classification.md:203-206`). Case names already state a rule or contract id.
- **Blog merge**, one case per rule. Fifteen rule checks and two discovery cases remain (`plan.md:290-303`). The loader reads every post entry, including dotfiles, symlinks to files, and non-Markdown names. Broken links and non-file `.md` entries are named as violations.

## 4. K rows kept

`classification.md:33-110` lists 77 K file groups. The classification gives 2843 K cases (`classification.md:226`). No K row was deleted. The git diff over the seven tutor-commission files from `a1caa5803` to HEAD returns no output. The command exit code is 0. This is the empty result from this session's run.

The Mutation check column gives the status of each K row. A proof name is listed only when that proof breaks the rule of THAT K row. I read each cited proof log and compared its failing target with the K rule in `classification.md:33-110`. A value of `none` means no proof of that row's own rule exists. The Other file proofs column records proofs that break another rule in the same file. A passing run is named as such and is not a mutation proof. No Stryker baseline ran (`spec.md:26-34`). The www app imports no core module from source plan section 5 step 2.

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
| src/lib/blog-posts-validation.test.ts | 1726 | proof-blog-merge.log, proof-f25.log, proof-f22.log | proof-adv8.log, proof-adv11.log, proof-adv22.log (discovery rules) |
| src/lib/blog.test.ts | 28 | none |  |
| src/lib/tutor-commission.test.ts | 34 | none |  |
| src/lib/tutor-commission.adversarial.test.ts | 24 | none |  |
| src/lib/tutor-commission.followups.adversarial.test.ts | 4 | none |  |
| src/lib/tutor-commission.settlement.adversarial.test.ts | 37 | none |  |
| src/lib/wave2-product-claim-helper.test.ts | 12 | none |  |
| src/lib/__tests__/primary-page-images.test.ts | 9 | none |  |

The money rules stay through the seven tutor-commission files named in this section. The per-row Mutation check and Other file proofs columns above are the record required by `spec.md:35`. The 77 rows still sum to 2843 cases (`classification.md:226`).

## 5. Review and gate history

Counts come from `measure/runs/www_test_audit_pilot_20261122/` filenames and each JSON `route` and `phase` field.

- Review A: 15 rounds. Phase 2 holds 8 rounds. Phase 3 holds 7 rounds. Route `openai/gpt-6-luna#high` ran 13 times. Route `openai/gpt-6.2-sol#high` ran 2 times.
- Adversarial: 13 rounds. Phase 2 holds 5 rounds. Phase 3 holds 8 rounds. Route `kimi-code-plan-cn/kimi-for-coding` ran all 13.
- Phase acceptance: 5 rounds. Phase 2 holds 2 rounds. Phase 3 holds 3 rounds. Route `openai/gpt-6.2-sol#high` ran all 5 as an approved substitution.
- Second check: 3 rounds at `second-check-*.json`. Route `openai/gpt-6-luna#high` ran all 3.
- Spec review: 1 round at `spec-review-735a7fe.json`. No route is recorded there.

Total audited role rounds: 37. The second check used a model family different from the Muse classifier. `second-check-d1b9d59.json` records a pass.

### Finding lines

Each line names what escaped, the role that found it, and the fix. `Review A`, `adversarial` and `acceptance` are the finding roles. Source: the first run JSON that names the id, and `plan.md`.

- Review A F1 (`review-a-8a78788.json`): CSS fixture missed inline overrides and media conditions. Fixed in 7480484d4, which changes `fixtures/real-css.ts` (`git show --name-only 7480484d4`; `plan.md:151-155`).
- Review A F2 (`review-a-8a78788.json`): claim suite passed with a hard-coded 95 % claim. Fixed in 7480484d4, which changes `phase-w3-claims.test.ts`, and in 4d1688131 (`git show --name-only 7480484d4 4d1688131`; `plan.md:151-156`).
- Review A F3 (`review-a-8a78788.json`): workbook image test read only CSS declarations. Fixed in 4d1688131, which rewrites the D1 behavior tests (`git show --name-only 4d1688131`; `plan.md:156`). The file `3b044ec9` changes only the Reedy test and is not this fix.
- Acceptance F1 (`phase-acceptance-bfda22b.json`): D1 contact rewrite weakened the kept duplicate-raw-values check. Fixed in 7c2d93e2, which changes `phase-4-contact-authority.red.test.tsx` (`git show --name-only 7c2d93e2`; `plan.md:175`).
- Acceptance F2 (`phase-acceptance-bfda22b.json`): D1 CEFR-only rewrite omitted real customer copy. Fixed in 7c2d93e2, which changes `no-gse-in-customer-copy.test.ts` (`git show --name-only 7c2d93e2`; `plan.md:175`).
- Acceptance F3 (`phase-acceptance-bfda22b.json`): D5 Reedy check accepted an active-package reversal. Fixed in 3b044ec9, which changes `www-tutor-reedy-claim.test.tsx` (`git show --name-only 3b044ec9`; `plan.md:175`).
- Review A F4 (`review-a-8a78788.json`): contact authority test missed a wrong phone destination. Review A. Fix 7480484d4 (`plan.md:164`).
- Review A F5 (`review-a-c673f21.json`): two D2 rewrites kept different rules. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- Review A F6 (`review-a-c673f21.json`): D4 removed supported-locale behavior. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- Review A F7 (`review-a-c673f21.json`): D5 derived required keys from the checked dictionary. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- Review A F8 (`review-a-c673f21.json`): D5 removed page wiring checks with the prose pins. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- Review A F9 (`review-a-8a78788.json`): Reedy assertions accepted a false claim. Review A. Fix bcaa97ff4 (`plan.md:164`).
- Review A F10 (`review-a-8a78788.json`): D5 part 2 lacked a matching GREEN log. Review A. Recorded deviation; new evidence in `plan.md` Recorded deviations.
- Review A F11 (`review-a-8a78788.json`): D1 commit also rewrote two R2 cases. Review A. Recorded deviation; PM approved 2026-11-23 (`plan.md` Recorded deviations).
- Review A F12 (`review-a-8a78788.json`): pricing example used substring matching. Review A. Fix bcaa97ff4 (`plan.md:164`).
- Review A F13 (`review-a-c673f21.json`): D-10 stayed guarded. Review A. Note in `review-a-c673f21.json`.
- Review A F14 (`review-a-c673f21.json`): gate-0be4a037.json named the strategy commit as phase base. Review A. Note in `review-a-c673f21.json`.
- Review A F15 (`review-a-c673f21.json`): lint warnings predated the phase. Review A. Note in `review-a-c673f21.json`.
- Review A F16 (`review-a-8a78788.json`): plan entry closed three commits with one gate. Review A. Recorded deviation in `plan.md`.
- Acceptance F17 (`phase-acceptance-8a126f6.json`): locale-key lists remain duplicated. Review A. Open nit in `review-a-2be9b74.json`.
- Review A F18 (`review-a-8a126f6.json`): AC-24 exact-string allowlist. Disposition: approved by the PM on 2026-11-24, option A. AC-24 keeps its fixed approved sentences (`phase-acceptance-8a126f6.json:27`, `review-a-8a126f6.json:11`).
- Review A F19 (`review-a-0165b8e.json`): isDarkText ignored background contrast. Review A. Fix 09c48878d (`plan.md:304`).
- Review A F20 (`review-a-b2e6558.json`): backdrop resolution skipped unsupported paint. Review A. Fix 0f63c5a9a (`plan.md:323`).
- Review A F21 (`review-a-1dd9134.json`): background read from class tokens only. Review A. Fix 93a16fe3b (`plan.md:345`).
- Acceptance F22 (`phase-acceptance-704745a.json`): dot-prefixed post skipped by the loader. Acceptance. Fix 286d95a99 (`plan.md:408`).
- Acceptance F23 (`phase-acceptance-704745a.json`): contrast resolved vars from a global map. Acceptance. Fix de68074d9 (`plan.md:408`).
- Acceptance F24 (`phase-acceptance-704745a.json`): hero test checked only two gradient stops. Acceptance. Fix 338047c69 (`plan.md:408`).
- Acceptance F25 (`phase-acceptance-a0b8e18.json`): symlinked post skipped by the loader. Review A and acceptance. Fix 7b62bed78 (`plan.md:472`).
- Acceptance F26 (`phase-acceptance-e91c4d4.json`): ADV-22 test used a fixed directory under `/home/daniebo`. Acceptance. Nonblocking note; fix not recorded (`phase-acceptance-e91c4d4.json:14`).
- Adversarial ADV-1 (`adversarial-2be9b74.json`): D4 delete count did not match the plan. Adversarial. Fix 9eb3b9c4f (`plan.md:151`).
- Adversarial ADV-2 (`adversarial-2be9b74.json`): coverage labels lived in gate JSON, not logs. Adversarial. Note in `adversarial-2be9b74.json`.
- Adversarial ADV-3 (`adversarial-d30e5a2.json`): Reedy check admitted non-active packages. Adversarial. Fix e153b885 (`plan.md:188`).
- Adversarial ADV-4 (`adversarial-5c47707.json`): English 'formerly active' reversal passed. Adversarial. Fix dce443985 (`plan.md:217`).
- Adversarial ADV-5 (`adversarial-5c47707.json`): Thai expired-package reversal passed. Adversarial. Fix dce443985 (`plan.md:217`).
- Adversarial ADV-6 (`adversarial-5c47707.json`): Chinese expired-package reversal passed. Adversarial. Fix dce443985 (`plan.md:217`).
- Adversarial ADV-7 (`adversarial-8a126f6.json`): positive eligibility check is not self-referential. Adversarial. Note in `adversarial-8a126f6.json`.
- Adversarial ADV-8 (`adversarial-8f7d949.json`): non-.md post escaped the loader. Adversarial. Fix 98c2713d3 (`plan.md:370`).
- Adversarial ADV-9 (`adversarial-04e7ff8.json`): R2 rewrites catch the old mutations. Adversarial. Held note in `adversarial-8f7d949.json`.
- Adversarial ADV-10 (`adversarial-04e7ff8.json`): merge names offenders and fails on empty discovery. Adversarial. Held note in `adversarial-8f7d949.json`.
- Adversarial ADV-11 (`adversarial-04e7ff8.json`): uppercase .MD post escaped. Adversarial. Fix 88b26fb9b (`plan.md:389`).
- Adversarial ADV-12 (`adversarial-04e7ff8.json`): -segments.json allowance is by design. Adversarial. Note in `adversarial-04e7ff8.json`.
- Adversarial ADV-13 (`adversarial-704745a.json`): nested post folders are not read. Adversarial. Note in `adversarial-704745a.json`.
- Adversarial ADV-14 (`adversarial-704745a.json`): suffix checks are ASCII. Adversarial. Note in `adversarial-704745a.json`.
- Adversarial ADV-15 (`adversarial-e9ccdac.json`): local color token pre-resolved by jsdom. Adversarial. Fix a53d426d5 (`plan.md:432`).
- Adversarial ADV-16 (`adversarial-e9ccdac.json`): loader filter mirrors blog.ts. Adversarial. Note in `adversarial-e9ccdac.json`.
- Adversarial ADV-17 (`adversarial-3bad021.json`): injected stylesheet rule was not scanned. Adversarial. Fix 6be92dd85 (`plan.md:453`).
- Adversarial ADV-18 (`adversarial-3bad021.json`): ancestor match was not checked. Adversarial. Fix 6be92dd85 (`plan.md:453`).
- Adversarial ADV-19 (`adversarial-3bad021.json`): grouped at-rules were not scanned. Adversarial. Fix 6be92dd85 (`plan.md:453`).
- Adversarial ADV-20 (`adversarial-a0b8e18.json`): selector evaluation may differ from a browser. Adversarial. Note in `adversarial-a0b8e18.json`.
- Adversarial ADV-21 (`adversarial-a0b8e18.json`): shadow-root styles are outside `document.styleSheets`. Adversarial. Note in `adversarial-a0b8e18.json`.
- Adversarial ADV-22 (`adversarial-865f52a.json`): symlink to a directory named .md was skipped. Adversarial. Fix 66aeb1011 (`plan.md:490`).
- Adversarial ADV-23 (`adversarial-865f52a.json`): locale-level directory symlink is skipped. Adversarial. Note in `adversarial-865f52a.json`.
- Adversarial ADV-24 (`adversarial-e91c4d4.json`): hard link to a post is read and validated. Adversarial. Note in `adversarial-e91c4d4.json`.

### Items that still need the PM

F18 is approved by the PM as option A on 2026-11-24. F17 stays an open nit. F26 is a nonblocking test portability issue. ADV-12, ADV-13, ADV-14, ADV-16, ADV-20, ADV-21, ADV-23 and ADV-24 are notes. F24 is closed; its history runs from the acceptance nit through fix 338047c69 and the fresh probe in `phase-acceptance-a0b8e18.json:29`. No other item needs a PM decision.

## 6. Lessons

- A merged or rewritten test must reuse the exact reading code of the test it replaces. Five loader defects came from a reader stricter or looser than the phase-base code: F22, F25, ADV-8, ADV-11 and ADV-22. Each fix widened the sweep to match `blog.ts` and the phase-base test.
- The jr-green role gate ran tests only. Check-types and lint were outside it. A type error from `4d1688131` passed three review rounds. The repair is `8d5ad1c4` (`plan.md:205-215`). Add check-types and lint to that gate for later audits.
- Hand-built CSS contrast checks cost six rounds: F19, F20, F21, F23, ADV-15 and ADV-17. jsdom does not evaluate custom properties in a full cascade. The helper now fails closed on local token overrides. Only two R2 contrast tests use it. A later audit should consider dropping contrast checks from unit tests.
- The second check by another family passed (`second-check-d1b9d59.json`). Cost: 37 audited role rounds.
- Review A used `gpt-6-luna` for 13 rounds and `gpt-6.2-sol` for 2 rounds. Adversarial used `kimi-for-coding` for 13 rounds. Acceptance used `gpt-6.2-sol` for 5 rounds. Second check used `gpt-6-luna` for 3 rounds. Spec review recorded no route. All counts come from `measure/runs/www_test_audit_pilot_20261122/`.

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

Four of the five files are unchanged K rows (`classification.md:33-110`). The fifth file, `src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx`, was changed in this track. The command `git log --oneline 635a604c8..HEAD -- <path>` lists 7008ccefd, 733319505 and fb5622ed7. From the Phase 3 base, `git log --oneline 8a126f612..HEAD -- <path>` lists no commit. The file holds both kept K cases and rewritten cases. The timing run does not prove the hypothesis. The PM decided that the time gap and the hypothesis stay in this report only. No follow-up task was opened.

## 8. Facts changed for the PM

None. This track changed test files, test fixtures and `measure/` files only. No company copy changed.
