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

Each row comes from the named gate JSON. `GREEN` is the exit code in that JSON.

| Class | Task | Commit | cases_before | cases_after | GREEN | Coverage % | Gate JSON |
|---|---|---|---|---|---|---|---|
| D1 | 2.1 | 0be4a0374 | 3175 | 3168 | 0 | 89.92 | gate-0be4a037.json |
| D2 | 2.2 | e332f594e | 3168 | 3146 | 0 | 89.92 | gate-e332f594.json |
| D3 | 2.3 | 409108d3e | not recorded | not recorded | not recorded | not recorded | no gate; no rows (`plan.md:96`) |
| D4 | 2.4 | 0d705612d | 3146 | 3140 | 0 | 89.86 | gate-0d705612.json |
| D5 part 1 | 2.5 | ee5c7b739 | 3140 | 3140 | 0 | 89.94 | gate-ee5c7b73.json |
| D5 part 2 | 2.5 | 7008ccefd | 3140 | 3081 | 0 | 89.94 | gate-7008ccef.json |
| D5 part 3 | 2.5 | c577cdf18 | 3081 | 3048 | 0 | 89.94 | gate-c577cdf.json |
| D5 part 4 | 2.5 | 407c5d9bd | 3048 | 3035 | 0 | 90.03 | gate-407c5d9.json |
| R2 | 3.2 | adf24e723 | 3094 | 3094 | 0 | 91.60 | gate-adf24e7.json |
| Blog merge | 3.5 | 257a6b0cd | 3094 | 1385 | 0 | 91.60 | gate-257a6b0c.json |

All paths in the last column are under `measure/runs/www_test_audit_pilot_20261122/`.

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

Gate receipts for each fix commit are in `measure/runs/www_test_audit_pilot_20261122/gate-<short>.json`.

## 3. What went, what changed, why

Data in this section comes from `measure/tracks/www_test_audit_pilot_20261122/classification.md`.

- **D1 source-text**, 67 cases. Seven deletes remove static source reads with no rendered output (`classification.md:227`, `plan.md:83-87`). Sixty rewrites keep the rule through rendered or real-file behavior (`classification.md:227`). Examples: CEFR-only copy, real cover files, compact hero height, truthful claims.
- **D2 duplicate**, 22 cases deleted (`classification.md:228`, `plan.md:89-94`). The kept duplicates are named in `classification.md:146-154`. The Primary containers and order cases stay in `page.content.test.tsx`. The reading-time number cases stay in `blog.test.ts`. The favicon byte cases stay in `real-logos-captures-adversarial.test.ts`. The removed-literal sweep stays in `real-logos-adversarial.test.ts`. The retired picture set stays in `www-tutor-followups.adversarial.test.ts`. The M4 slot order stays in `tutor-screens.test.ts`.
- **D3 dead target**, zero rows (`classification.md:159-161`). No commit and no gate. Both image-source suites read sources that exist.
- **D4 weak check**, six cases deleted (`classification.md:228`, `plan.md:99-104`). Three navigation cases echoed a mocked locale. Two capture cases pinned the test file's own names. One image case returned early without an environment flag.
- **D5 copy pin**, 221 cases (`classification.md:231`). Four parts replace word-for-word pins with locale-key checks (`plan.md:106-125`). The final file count is 3035 cases (`gate-407c5d9.json`). Money pins stay as K.
- **R1 over-mocked**, zero rows (`classification.md:182-186`). Boundary mocks stand in for adapters, not for code under test.
- **R2 brittle**, 16 cases rewritten (`classification.md:233`). Fourteen files changed in `adf24e723` (`plan.md:259`). Two cases were rewritten earlier in `0be4a0374` under deviation F11 (`plan.md:272-276`). The checks now read computed CSS, real color tokens, and DOM behavior.
- **R3 unclear**, zero rows (`classification.md:203-206`). Case names already state a rule or contract id.
- **Blog merge**, one case per rule. Fifteen rule checks and two discovery cases remain (`plan.md:290-303`). The loader reads every post entry, including dotfiles, symlinks to files, and non-Markdown names. Broken links and non-file `.md` entries are named as violations.

## 4. K rows kept

`classification.md:33-110` lists 77 K file groups. The classification gives 2843 K cases (`classification.md:226`). No K row was deleted. The git diff over the seven tutor-commission files from `a1caa5803` to HEAD returns no output. The command exit code is 0. This is the empty result from this session's run.

The Mutation check column gives the status of each K row. A value of `none` means no mutation baseline exists for that file. A proof name means that a `proof-*.log` in `measure/runs/www_test_audit_pilot_20261122/` names the file as a failing test target. Sixty-seven rows say `none`. Ten rows name one or more proof logs. No Stryker baseline ran (`spec.md:26-34`). The www app imports no core module from source plan section 5 step 2.

| K file group | Cases | Mutation check |
|---|---|---|
| src/__tests__/proxy-redirect.test.ts | 5 | none |
| src/lib/blog-locale.test.ts | 4 | none |
| src/locales/navigation.test.tsx | 1 | none |
| src/__tests__/phase-2-seo-assets.red.test.ts | 4 | none |
| src/__tests__/phase-2-seo-blog-routes.red.test.ts | 10 | none |
| src/__tests__/phase-2-seo-remaining-static.red.test.ts | 10 | none |
| src/__tests__/phase-3-group-b-types.test.ts | 4 | none |
| src/__tests__/phase-3-i18n.red.test.ts | 1 | proof-f4b.log |
| src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx | 4 | none |
| src/__tests__/phase-4-browser-regressions.red.test.tsx | 1 | proof-adv17.log, proof-f19-phase-4-browser-regressions.log, proof-f20-phase-4-browser-regressions.log, proof-f21-phase-4-browser-regressions.log, proof-r2-phase-4-browser-regressions.log |
| src/__tests__/phase-4-browser-regressions-final.red.test.tsx | 1 | proof-r2-phase-4-browser-regressions-final.log |
| src/__tests__/phase-4-contact-authority.red.test.tsx | 2 | proof-f4-r2.log, proof-f4a.log, proof-pa-f1.log |
| src/__tests__/phase-5-pricing-legal.red.test.tsx | 2 | none |
| src/__tests__/products-page-pictures.red.test.tsx | 22 | none |
| src/__tests__/www-features-page.content.test.tsx | 32 | none |
| src/__tests__/www-features-pricing.assets.test.ts | 21 | none |
| src/__tests__/www-features-pricing.locale.test.ts | 13 | none |
| src/__tests__/www-pricing-page.content.test.tsx | 23 | proof-f12-r2.log |
| src/__tests__/www-pricing-required-rows.red.test.ts | 7 | none |
| src/__tests__/www-pricing-rows-fluid.red.test.ts | 3 | none |
| src/__tests__/www-pricing-stacking.red.test.ts | 22 | none |
| src/__tests__/www-reading-card.red.test.ts | 10 | none |
| src/__tests__/www-reading-cover.red.test.ts | 5 | proof-r2-www-reading-cover.log |
| src/__tests__/www-stem-date-line.locale.test.ts | 6 | none |
| src/__tests__/www-batch-20261116.locale.test.ts | 28 | none |
| src/__tests__/www-batch-20261119.locale.test.ts | 1 | none |
| src/__tests__/www-tutor-calculator.locale.test.ts | 15 | none |
| src/__tests__/www-tutor-followups.adversarial.test.ts | 5 | none |
| src/__tests__/www-tutor-reedy-claim.test.tsx | 7 | proof-adv3.log, proof-adv456.log, proof-f9-r2.log, proof-pa-f3.log |
| src/__tests__/www-tutor-screens-copy.adversarial.test.ts | 5 | none |
| src/app/[locale]/(marketing)/(home)/page.test.tsx | 6 | none |
| src/app/[locale]/(marketing)/blog/page.test.tsx | 9 | none |
| src/app/[locale]/(marketing)/products/codecamp-advantage/page.test.tsx | 3 | none |
| src/app/[locale]/(marketing)/products/math-advantage/page.test.tsx | 4 | none |
| src/app/[locale]/(marketing)/products/primary-advantage/page.adversarial.test.tsx | 40 | none |
| src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx | 53 | none |
| src/app/[locale]/(marketing)/products/reading-advantage/page.test.tsx | 6 | none |
| src/app/[locale]/(marketing)/products/science-advantage/page.test.tsx | 4 | none |
| src/app/[locale]/(marketing)/products/stem-advantage/page.test.tsx | 4 | none |
| src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx | 33 | none |
| src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx | 2 | none |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.adversarial.test.tsx | 5 | none |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.followups.adversarial.test.tsx | 4 | none |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx | 33 | none |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.phase3.adversarial.test.tsx | 25 | none |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.placeholders.test.tsx | 3 | none |
| src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx | 14 | none |
| src/app/[locale]/(marketing)/products/zhongwen-advantage/page.test.tsx | 4 | none |
| src/components/blog/blog-pagination.test.tsx | 5 | proof-r2-blog-pagination.log |
| src/components/common/localized-link.test.tsx | 8 | none |
| src/components/marketing/experience-demo.test.tsx | 3 | none |
| src/components/marketing/hero-section.test.tsx | 5 | proof-f24.log, proof-r2-hero-section.log |
| src/components/marketing/mastery-advantage-graph.test.tsx | 13 | none |
| src/components/marketing/tutor-commission-calculator.test.tsx | 22 | none |
| src/components/marketing/tutor-commission-calculator.adversarial.test.tsx | 17 | none |
| src/components/marketing/tutor-commission-calculator.legs.adversarial.test.tsx | 30 | none |
| src/components/products/storytime-song-player.test.tsx | 15 | none |
| src/lib/__tests__/real-logos-adversarial.test.ts | 114 | none |
| src/lib/__tests__/real-logos-captures-adversarial.test.ts | 103 | none |
| src/lib/__tests__/real-logos-captures.red.test.ts | 16 | none |
| src/lib/__tests__/real-logos-favicon.red.test.ts | 1 | none |
| src/lib/__tests__/real-logos-mapping.red.test.ts | 34 | none |
| src/lib/__tests__/real-logos-references.red.test.ts | 12 | none |
| src/lib/__tests__/site-assets.test.ts | 2 | none |
| src/lib/__tests__/storytime-page-images.test.ts | 3 | none |
| src/lib/__tests__/tutor-screens.adversarial.test.ts | 4 | none |
| src/lib/__tests__/tutor-screens.test.ts | 12 | none |
| src/lib/blog-blocks.test.ts | 18 | none |
| src/lib/blog-draft.test.ts | 6 | none |
| src/lib/blog-posts-validation.test.ts | 1726 | proof-adv11.log, proof-adv22.log, proof-adv8.log, proof-blog-merge.log, proof-f22.log, proof-f25.log |
| src/lib/blog.test.ts | 28 | none |
| src/lib/tutor-commission.test.ts | 34 | none |
| src/lib/tutor-commission.adversarial.test.ts | 24 | none |
| src/lib/tutor-commission.followups.adversarial.test.ts | 4 | none |
| src/lib/tutor-commission.settlement.adversarial.test.ts | 37 | none |
| src/lib/wave2-product-claim-helper.test.ts | 12 | none |
| src/lib/__tests__/primary-page-images.test.ts | 9 | none |

The money rules stay through the seven tutor-commission files named in this section. The per-row Mutation check column above is the record required by `spec.md:35`.

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

- F1: CSS fixture missed inline overrides and media conditions. Review A. Fix 733319505, 7c2d93e2 (`plan.md:151,175`).
- F2: claim suite passed with a hard-coded 95 % claim. Review A. Fix 4d1688131, 7480484d4, 7c2d93e2 (`plan.md:156,164,175`).
- F3: workbook image test read only CSS declarations. Review A. Fix 3b044ec9 (`plan.md:175`).
- F4: contact authority test missed a wrong phone destination. Review A. Fix 7480484d4 (`plan.md:164`).
- F5: two D2 rewrites kept different rules. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- F6: D4 removed supported-locale behavior. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- F7: D5 derived required keys from the checked dictionary. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- F8: D5 removed page wiring checks with the prose pins. Review A. Fix fb5622ed7, 9eb3b9c4f (`plan.md:151`).
- F9: Reedy assertions accepted a false claim. Review A. Fix bcaa97ff4 (`plan.md:164`).
- F10: D5 part 2 lacked a matching GREEN log. Review A. Recorded deviation; new evidence in `plan.md` Recorded deviations.
- F11: D1 commit also rewrote two R2 cases. Review A. Recorded deviation; PM approved 2026-11-23 (`plan.md` Recorded deviations).
- F12: pricing example used substring matching. Review A. Fix bcaa97ff4 (`plan.md:164`).
- F13: D-10 stayed guarded. Review A. Note in `review-a-c673f21.json`.
- F14: gate-0be4a037.json named the strategy commit as phase base. Review A. Note in `review-a-c673f21.json`.
- F15: lint warnings predated the phase. Review A. Note in `review-a-c673f21.json`.
- F16: plan entry closed three commits with one gate. Review A. Recorded deviation in `plan.md`.
- F17: locale-key lists remain duplicated. Review A. Open nit in `review-a-2be9b74.json`.
- F18: AC-24 exact-string allowlist. Review A and acceptance. Orchestrator default A keeps the allowlist; PM confirmation remains pending (`phase-acceptance-8a126f6.json:27`).
- F19: isDarkText ignored background contrast. Review A. Fix 09c48878d (`plan.md:304`).
- F20: backdrop resolution skipped unsupported paint. Review A. Fix 0f63c5a9a (`plan.md:323`).
- F21: background read from class tokens only. Review A. Fix 93a16fe3b (`plan.md:345`).
- F22: dot-prefixed post skipped by the loader. Acceptance. Fix 286d95a99 (`plan.md:408`).
- F23: contrast resolved vars from a global map. Acceptance. Fix de68074d9 (`plan.md:408`).
- F24: hero test checked only two gradient stops. Acceptance. Fix 338047c69 (`plan.md:408`).
- F25: symlinked post skipped by the loader. Review A and acceptance. Fix 7b62bed78 (`plan.md:472`).
- F26: ADV-22 test used a fixed directory under `/home/daniebo`. Acceptance. Nonblocking note; fix not recorded (`phase-acceptance-e91c4d4.json:14`).
- ADV-1: D4 delete count did not match the plan. Adversarial. Fix 9eb3b9c4f (`plan.md:151`).
- ADV-2: coverage labels lived in gate JSON, not logs. Adversarial. Note in `adversarial-2be9b74.json`.
- ADV-3: Reedy check admitted non-active packages. Adversarial. Fix e153b885 (`plan.md:188`).
- ADV-4: English 'formerly active' reversal passed. Adversarial. Fix dce443985 (`plan.md:217`).
- ADV-5: Thai expired-package reversal passed. Adversarial. Fix dce443985 (`plan.md:217`).
- ADV-6: Chinese expired-package reversal passed. Adversarial. Fix dce443985 (`plan.md:217`).
- ADV-7: positive eligibility check is not self-referential. Adversarial. Note in `adversarial-8a126f6.json`.
- ADV-8: non-.md post escaped the loader. Adversarial. Fix 98c2713d3 (`plan.md:370`).
- ADV-9: R2 rewrites catch the old mutations. Adversarial. Held note in `adversarial-8f7d949.json`.
- ADV-10: merge names offenders and fails on empty discovery. Adversarial. Held note in `adversarial-8f7d949.json`.
- ADV-11: uppercase .MD post escaped. Adversarial. Fix 88b26fb9b (`plan.md:389`).
- ADV-12: -segments.json allowance is by design. Adversarial. Note in `adversarial-04e7ff8.json`.
- ADV-13: nested post folders are not read. Adversarial. Note in `adversarial-704745a.json`.
- ADV-14: suffix checks are ASCII. Adversarial. Note in `adversarial-704745a.json`.
- ADV-15: local color token pre-resolved by jsdom. Adversarial. Fix a53d426d5 (`plan.md:432`).
- ADV-16: loader filter mirrors blog.ts. Adversarial. Note in `adversarial-e9ccdac.json`.
- ADV-17: injected stylesheet rule was not scanned. Adversarial. Fix 6be92dd85 (`plan.md:453`).
- ADV-18: ancestor match was not checked. Adversarial. Fix 6be92dd85 (`plan.md:453`).
- ADV-19: grouped at-rules were not scanned. Adversarial. Fix 6be92dd85 (`plan.md:453`).
- ADV-20: selector evaluation may differ from a browser. Adversarial. Note in `adversarial-a0b8e18.json`.
- ADV-21: shadow-root styles are outside `document.styleSheets`. Adversarial. Note in `adversarial-a0b8e18.json`.
- ADV-22: symlink to a directory named .md was skipped. Adversarial. Fix 66aeb1011 (`plan.md:490`).
- ADV-23: locale-level directory symlink is skipped. Adversarial. Note in `adversarial-865f52a.json`.
- ADV-24: hard link to a post is read and validated. Adversarial. Note in `adversarial-e91c4d4.json`.

### Items that still need the PM

F18 needs PM confirmation of default A. F17 stays an open nit. F26 is a nonblocking test portability issue. ADV-12, ADV-13, ADV-14, ADV-16, ADV-20, ADV-21, ADV-23 and ADV-24 are notes. F24 is closed; its history runs from the acceptance nit through fix 338047c69 and the fresh probe in `phase-acceptance-a0b8e18.json:29`. No other item needs a PM decision.

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

To make the claim checkable, one verbose run at head went through heavy-run. The log is `measure/runs/www_test_audit_pilot_20261122/timing-at-head.log`. The JSON report is `measure/runs/www_test_audit_pilot_20261122/timing-at-head.json`. The JSON `duration` field reads zero, so the file figures below sum the assertion durations in that JSON. The five slowest files at head are:

| Slowest file | Sum of assertion durations |
|---|---|
| src/components/marketing/tutor-commission-calculator.legs.adversarial.test.tsx | 6461.93 ms |
| src/lib/__tests__/real-logos-captures-adversarial.test.ts | 1649.38 ms |
| src/lib/blog-blocks.test.ts | 1303.32 ms |
| src/lib/__tests__/storytime-page-images.test.ts | 970.85 ms |
| src/app/[locale]/(marketing)/products/primary-advantage/page.content.test.tsx | 859.77 ms |

All five files are unchanged K rows (`classification.md:33-110`). The timing run does not prove the hypothesis.

Recommendation: a follow-up task should compare per-file times of the deleted tests and the added tests. That task must run both commits with a JSON reporter and keep both reports.

## 8. Facts changed for the PM

None. This track changed test files, test fixtures and `measure/` files only. No company copy changed.
