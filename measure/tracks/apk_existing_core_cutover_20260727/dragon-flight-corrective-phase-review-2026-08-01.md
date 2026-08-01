# Dragon Flight Corrective Phase Review — 2026-08-01

## Bounded review decision

Sol accepts the Dragon Flight corrective implementation and contract evidence only. This record is not Phase-5, Task-5, track, production, cutover, retirement, cohort, or product-owner acceptance.

## Evidence reviewed

- The focused domain attempt/store suite passed 21/21. Focused coverage was 87.50% statements and 82.22% branches overall; the attempt module was 80.37% branch-covered and the durable store was 100% line-covered.
- The settled host-focused matrices passed: Reading 7 suites / 34 tests and Primary 8 files / 42 tests. The all-six client-invalid replay/conflict classifier suites passed: Reading 11/11 and Primary 12/12.
- The self-contained Task-5 plan-truth/remediation and host-proof-evidence Measure guards passed 13/13 using `timeout 180s python3 -m unittest measure.tests.test_apk_existing_core_task5_task6_acceptance measure.tests.test_apk_existing_core_cutover_task5_host_proof_evidence measure.tests.test_apk_existing_core_cutover_task5_host_proof_remediation`. This excludes the unreviewed program-wide candidate guard and all candidate artifacts; candidate-dependent Task-3, Task-4, and Task-6 guards remain unstaged; Task 6 stays blocked/unverified by this commit.
- Fresh isolated authenticated Chromium artifacts passed on both hosts: Reading 5 expected / 0 unexpected and Primary 5 expected / 0 unexpected. They cover seeded authentication plus compact keyboard, wide keyboard, pointer, and touch completion paths.

The browser assertions establish only server-observed ordered request sequencing: opaque receipt chaining, exact 250 ms server dwell, prior-receipt linkage, ordered completion receipts, no client-supplied score/XP, and visible verified result/history. They do not establish human play, anti-bot resistance, answer comprehension, mastery, anti-cheat efficacy, or broader XP-integrity proof.

## Narrow TypeScript test-support acceptance

Terra accepts only the two APK-local test-support defects identified in the pre-fix Reading attribution inventory: `lib/host-proof-config.test.ts:11,17` no longer directly assign the readonly `process.env.NODE_ENV`, and the production-like absent-flag behavior is covered independently by `lib/host-proof-config.production-env.test.ts` using `jest.replaceProperty(process, "env", ...)` isolation. The focused configuration suites passed 2/8, and a direct source scan found no remaining `process.env.NODE_ENV =` assignment in either configuration test. No runtime configuration behavior changed: `isHostProofEnabled()` remains true only for `HOST_PROOF_ENABLED === "true"`.

This acceptance is limited to those two local support-error sites. [`reading-typescript-baseline-attribution-2026-08-01.md`](./reading-typescript-baseline-attribution-2026-08-01.md) records the pre-fix larger-heap inventory of 81 diagnostics (79 non-local and two local). Its permitted post-fix larger-heap full-check retry timed out after 180 seconds with exit 124 and no diagnostics. The expected 79-non-local/0-local split is therefore an attribution inference, not a re-observed full result or a green Reading typecheck.

## Formal closure remains blocked

- A green whole-project Reading `tsc --noEmit` baseline has not been observed. The post-fix 4 GiB retry timed out after 180 seconds with exit 124 and no output; the pre-fix 79-non-local/2-local inventory cannot be treated as a fully re-observed 79/0 result.
- Required Measure phase closeout has not occurred: the manual verification and explicit user confirmation/checkpoint steps remain open.
- Explicit product-owner authorization remains required. Production exposure, deployment, title/cohort cutover, and Task-6 legacy retirement remain outside this bounded review.
- The shared 24-title candidate remains historical, drifted, quarantined, and non-consumable.

Accordingly, the active corrective phase stays `[~]` and downstream retirement/cohort tasks stay `[b]`.
