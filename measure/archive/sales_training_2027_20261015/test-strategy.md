# Test Strategy: Phase S2 — Re-pin to advantage-pr 7eff8c10

> Track: `sales_training_2027_20261015` · Phase: S2 · Task: "Re-pin to advantage-pr 7eff8c10"
> Spec: [spec.md](./spec.md) Story S2 · Plan: [plan.md](./plan.md) Phase S2
> Review input: [review/repin-7eff8c10.md](./review/repin-7eff8c10.md) (109 rows, 67 seed changes, 1 Thai row)
> Target pin: `7eff8c106c7265b41d584c4ea997d65ea30dadfb` (replaces `e7ee72b6`; current pin `a3c4df08`)
> Scope: this one task. The S1 and S3–S11 work stays out of scope.
> Writer: Measured at `role_base_sha` `d3e24d0c0d5ef3aa2c0fd1fae6b3c4786334ce16` on 2026-11-11.

## 1. Base capture and the base run

**Capture point.** Commit this file alone. The orchestrator then runs:

```bash
git rev-parse HEAD
```

That value is the immutable `phase_base_sha`. It is the strategy commit itself. Do not embed a SHA that predates the strategy commit. Do not reuse `role_base_sha`.

**The base run.** Red runs the text check at `phase_base_sha` before it writes a row. The base run records three numbers: files, tests, failed.

Measured at `role_base_sha` on 2026-11-11 with the Red command in section 2:

- Test Files: 2 passed (2)
- Tests: 91 passed (91)
- Failed: 0
- Duration: 22.01 s

A base run that shows any failure stops the phase. The Red count then cannot be attributed to the new rows.

## 2. Commands

`RED_TEST_COMMAND` and `GREEN_TEST_COMMAND` are the same line. Only the expected result differs. Run each line inside the one machine job.

**RED_TEST_COMMAND**

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm --filter sales-advantage exec vitest run --maxWorkers=1 scripts/curriculum-content-2027.test.ts scripts/curriculum-release.test.ts'
```

**GREEN_TEST_COMMAND**

```bash
HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo && CI=true pnpm --filter sales-advantage exec vitest run --maxWorkers=1 scripts/curriculum-content-2027.test.ts scripts/curriculum-release.test.ts'
```

| Run | Exit | Expected result |
|---|---|---|
| Red | 1 | 67 failing cases from the new rows, 0 other failures |
| Green | 0 | 2 files pass, 0 failed |

Rules. One heavy job at a time. `--maxWorkers=1` on every named-file run. A role waits on the job only in the foreground call itself. No push and no deploy.

## 3. The Red rule

Red adds content-test rows to `apps/sales-advantage/scripts/curriculum-content-2027.test.ts`. Each row names one review row that needs a seed change. The review rows that say "no seed change" get no row.

**One row proves two facts:** the new source text holds, and the old text is gone. Use exact literals. Do not paraphrase. Do not use a regular expression that can match a neighbour line.

**Grouping makes the count checkable.** Put the rows in one exported table, `REPIN_ROWS`, and group by review section. A guard case proves the count.

| Review section | Document | Rows that need a seed change |
|---|---|---|
| 1 | `advantage-suite-at-a-glance.md` | 5 |
| 2 | `battle-cards/vs-tutor.md` | 2 |
| 3 | `demo-scripts-checklist.md` | 4 |
| 4 | `demo-scripts.md` | 11 |
| 5 | `distributor-launch-kit.md` | 5 |
| 6 | `distributor-rep-onboarding/README.md` | 0 |
| 7 | `distributor-rep-onboarding/faq.md` | 8 |
| 8 | `distributor-rep-onboarding/rep-certification-checklist.md` | 6 |
| 9 | `distributor-rep-onboarding/role-play-scenarios.md` | 4 |
| 10 | `facilitator-recruitment-kit.md` | 1 |
| 11 | `line-trial-facilitator-script.md` | 3 |
| 12 | `roi-calculator.md` | 2 |
| 13 | `sales-training-scope-2027.md` | 10 |
| 14 | `tutor-family-sales-playbook.md` | 6 |
| **Total** | | **67** |

**Count guard.** `REPIN_ROW_COUNT = 67`. One case asserts `REPIN_ROWS` has length 67. One case asserts the per-section counts above with `toEqual`. The count is a labeled integer, not a digit match.

**Shared edits do not change the count.** Three rows name one seed edit (the trainer-only edition rule, sections 11, 13, and 14). The Managed Service line sits in nine seed lines. The rows still count one each, because the count is rows, not edits.

**Expected Red count: exactly 67 new failing cases.** Every row must fail at `phase_base_sha`.

A row that passes at the base is vacuous. It cannot falsify the seed. Red re-words it, or demotes it to a "no seed change" row, and records the demotion in the run log. The Red gate is not met until 67 named rows fail.

**Retargets are rows too.** An existing assertion that quotes a replaced line becomes a `REPIN_ROWS` row. Examples: the S4 product-state case, the tier-price case, the placement-map case, and the S5 books-on-sale case. Do not delete an assertion. Record the case count before and after in the log.

**Red edits two files only:** the content test and the run log. Red does not edit `static-seed.ts`, the release test, or the candidate JSON.

**Red commits alone.** The Red commit holds the failing rows and nothing else.

## 4. The Green rule

**Step 1. Apply the seed edits.** Edit `apps/sales-advantage/scripts/static-seed.ts` for all 67 rows.

- The trainer-only edition rule goes in once, as trainer-only text in the placement lesson, after line 1272. Copy the text word for word from `09-sales-enablement/sales-training-scope-2027.md:62` at `7eff8c10`. The scope document wins over the line-trial script and the playbook.
- The Managed Service line replaces the old condition in every named seed line. The review lists nine.
- The pilot rules state no free term and no discount. They do not say "paid or free is not decided".
- The dates become "on sale after delivery, about 2026-11-23 to 2026-11-30". The full product name comes with the date.
- The Thai row is the only new Thai text. Copy it byte for byte from the review row. Green does not invent Thai text. The row goes to the PM for Daniel's check.

**Step 2. Update the canonical claim guards.** `apps/sales-advantage/scripts/curriculum-release.ts` holds three lists that the seed must satisfy: `canonicalProductListClaims`, `canonicalTierClaims`, and `forbiddenCurriculumClaims`. The re-pin replaces the Reading Advantage row, the planned-program rows, and the Managed Service tier cell. The old literals then fail the automated review with `SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID`. Change only the entries that a pinned line changed. Keep every other entry.

This step is the changed-contract risk of the task. A review that skips it fails at the text check, not at the seed.

**Step 3. Repair the fixture literals.** `curriculum-release.test.ts` quotes replaced lines in its rejection fixtures. A fixture that replaces an absent literal becomes a no-op, so the case fails. Swap each quoted literal for the new pinned line. Do not change an assertion, a case count, or an error code.

**Step 4. Regenerate the candidate against the pin.** Do not read `/home/daniebo/Desktop/advantage-pr` with anything but `git show` and `git diff`. Do not check out or write there. Use a sparse clone outside the repository:

```bash
git clone --no-checkout /home/daniebo/Desktop/advantage-pr /tmp/opencode/repin-7eff8c10/advantage-pr
git -C /tmp/opencode/repin-7eff8c10/advantage-pr sparse-checkout init --cone
git -C /tmp/opencode/repin-7eff8c10/advantage-pr sparse-checkout set 09-sales-enablement 04-services 02-brand 06-research-and-evidence 15-business-applications
git -C /tmp/opencode/repin-7eff8c10/advantage-pr checkout --detach 7eff8c106c7265b41d584c4ea997d65ea30dadfb
pnpm --filter sales-advantage exec tsx scripts/curriculum-release.ts --source-root=/tmp/opencode/repin-7eff8c10/advantage-pr
rm -rf /tmp/opencode/repin-7eff8c10
```

The generator reads the source in this order:

1. It runs `git -C <source-root> rev-parse HEAD`. HEAD must equal the pin. A detached checkout satisfies this.
2. It reads the 20 files of `CURRICULUM_SOURCE_PATHS` from the working tree.
3. It hashes each file and the seed graph.
4. It verifies each working byte against `git show <commit>:<path>`. A dirty clone fails with `SALES_CURRICULUM_SOURCE_HASH_MISMATCH`.

Remove the clone after the run. A leftover clone is not allowed.

**Only existing fields change.** The candidate diff holds three groups of values:

- `source.commit` becomes the pin.
- The 20 `source.documents[*].sha256` values change where the file changed. The document count, order, and paths stay.
- `graphSha256` changes with the seed text.

Do not add a field. Do not add a document. Do not widen a hash. `approval` stays `awaiting_human_review`. This is the hashing policy of AGENTS.md.

**Step 5. Run the text check.** Use `GREEN_TEST_COMMAND`. The gate is exit 0 with 2 files and 0 failed.

**Step 6. Keep the known red gates red.** Do not edit and do not run these as a gate: `scripts/sales-curriculum-production.test.ts`, `scripts/sales-curriculum-reconciliation.test.ts`, `scripts/production-readiness.test.ts`, and the 8 tests in `packages/sales-knowledge`. They wait for S9 and S10.

## 5. Fixtures, mocks, and live behavior

- The seed is pure data. `buildStaticSalesCurriculumRows()` runs in process. No mock and no stub is needed for the content rows.
- The release test builds its own git fixture in a temp directory. Leave that fixture alone.
- The generator reads real bytes from the clone and real git objects. It needs no network, no database, and no model.
- These are artifact tests, not live-behavior tests. They prove that the pinned text and the seed text agree. They do not prove that a trainee sees a lesson.
- No live-behavior proof belongs to this task. The export, the seed run, and the trainee check are S10. The only live element here is read-only: the pin must exist and `git show` must read it.

## 6. Applicable gates

| Gate | Applies | Reason |
|---|---|---|
| Review A (`measure-review-a-correctness`) | Yes | Correctness, architecture, callers, blast radius, and test meaning. Exact literals, the three claim lists, the 20-document list, and the hashing rule need a read-only check. Each of the 67 rows traces to a review row and to `git show 7eff8c10:<path>`. The changed set stays inside the named files, and the known red gates stay as they are. |
| Review B (`measure-review-b-security`) | No | No route, auth, permission, secret, SQL, or provider change. The hash fields follow the existing contract; Review A checks them. |
| Review C (`measure-review-c-ux-api`) | No | No API contract, route, component, or message string changes. The seed is content data. |
| Adversarial (`measure-adversarial-testing`) | Yes | See section 7. The attack surface is a claim guard that passes after the new line lands while an old claim survives elsewhere. |
| UX browser (`measure-ux-browser-review`) | No | No rendered surface changes. The owner's curriculum review is S10. The Thai row waits for Daniel through the PM; that is a text gate, not a browser gate. |

## 7. Anti-pattern coverage

Each test must have a falsification condition. The table below names the defense and the failure that proves it.

| ID | Defense in this phase | Falsification |
|---|---|---|
| A1 | The supervisor signal is a marker plus a labeled count, not a substring. The run log records the plan marker and the `REPIN_ROWS` length. | The count guard reads 67, not a word in the log. |
| A2 | Not applicable. The candidate stays `awaiting_human_review`; S10 owns the approval gate. | No publish action exists in this phase. |
| A3 | `REPIN_ROW_COUNT = 67` plus a per-section object compared with `toEqual`. | A change to any per-section count fails a named case. |
| A4 | Every row must fail at the base. A row that passes is vacuous and is re-worded or demoted. | The Red run prints exactly 67 failing row names; a passing row fails the Red gate. |
| A5 | The plan, the log, and the report state the measured exit code and counts only. "Passes" is written after exit 0. | A claim of pass with exit 1 is a false claim; the log holds the raw tail. |
| A6 | The plan and `tracks.md` say "re-pinned locally, not deployed" until the text check passes. The candidate is not approved. | A registry line that says "done" before exit 0 fails Review A. |
| A7 | The old-text check is an exact literal absence over the full graph: `expect(allText()).not.toContain(old)`. No bare English word filter, no negation filter. | A surviving old claim in another lesson fails the row. The Managed Service line is the probe; it sits in nine seed lines. |
| A8 | The plan task moves to `[~]` and then `[x]`; no `[ ]` marker is added. | The plan marker guard fails on a space marker. |
| A9 | Not applicable. The two test files reference no archived track path. The approval fixture points at `sales_advantage_golive_20260701`, which is active. | A move of that track to the archive breaks the fixture path; record it as a new risk. |
| A10 | `measure/generate.sh` and `measure/doctor.sh` run once if the phase commits a Measure doc; no generated fact changes from a seed edit. | A generated-file diff that is not the revision line fails the check. |
| A11 | Not applicable. This is not a review track, and the S2 owner-verification row stays `[b]` for the real S10 gate. | No block marker is used as a placeholder. |
| A12 | No new guard reference is added to the catalog. | A `Guard:` line for a missing file fails the catalog check. |
| A13 | Not applicable. No track directory moves. | A stale `measure/tracks/` copy would fail the audit. |
| A14 | Not applicable. No new detector command is added. If one is added, use `rg -n '<regex>'`, never `rg -nE`. | Exit code 2 is an audit failure, not a zero-hit result. |
| A15 | The role receipt binds the Red commit, the Green commit, and the candidate hash after the last edit. | A receipt that names a pre-fix hash fails the receipt check. |

Two attack cases belong in the adversarial gate, and each one has a falsifier:

1. Add the new Managed Service line to the product lesson but leave the old condition in one of the other lessons. The row for that seed line must fail.
2. Weaken `canonicalProductListClaims` by deleting an entry instead of replacing it. The content rows must still fail, and Review A must reject the deletion.

## 8. Risk classification

**Phase risk: medium.**

- High sub-surface: the Managed Service line (nine seed lines) and the three claim lists in `curriculum-release.ts`. A partial edit turns the automated review red or lets an old claim survive.
- Medium sub-surface: the 67 rows across 14 documents, and the candidate regeneration.
- Low sub-surface: the Thai row (one line, owner-gated) and the document hashes (mechanical).
- Not high: no code path, no route, no schema, no migration, and no live provider call.

The phase moves to high if a Green edit must touch a file outside `static-seed.ts`, `curriculum-release.ts`, `curriculum-release.test.ts`, and `curriculum-release.json`. Stop and ask the orchestrator first.

## 9. Phase acceptance checks

Run these after the Green commit. Each check is a command with an expected result.

1. **Pin.** `git -C apps/sales-advantage show HEAD:curriculum/release-candidate.json | jq -r .source.commit` prints `7eff8c106c7265b41d584c4ea997d65ea30dadfb`.
2. **Document set.** The candidate holds 20 documents in `CURRICULUM_SOURCE_PATHS` order. The paths equal the list in `curriculum-release.ts` with `jq -r '.source.documents[].path'`.
3. **Document hashes.** For each of the 20 paths, `git -C /tmp/opencode/repin-7eff8c10/advantage-pr show 7eff8c10:<path> | sha256sum` equals the candidate value. Run this before the clone is removed.
4. **Graph hash.** The candidate `graphSha256` changes from `7e7dc5b6…`, and the text check recomputes the same value.
5. **Only existing fields change.** `git diff HEAD~1 -- apps/sales-advantage/curriculum/release-candidate.json` shows only `source.commit`, per-document `sha256`, and `graphSha256`. The key set is unchanged, and `approval.status` is still `awaiting_human_review`.
6. **Hashing policy.** The candidate still holds 21 `sha256` keys: 20 documents and 1 graph. No new hash field exists.
7. **Text check.** `GREEN_TEST_COMMAND` exits 0 with 2 files and 0 failed. The log holds the tail.
8. **Red evidence.** The log holds the base counts (2 files, 91 tests, 0 failed) and the Red counts (67 failing row names).
9. **Old pin gone.** `rg -n 'a3c4df082a|e7ee72b6' apps/sales-advantage` returns no hit.
10. **Thai row.** The new Thai line appears once in the seed and equals the review quote. `review/thai-lines-for-daniel.md` lists it for the PM.
11. **Known red gates.** `git diff --name-only HEAD~2..HEAD` names no file of the four known red gates, and no file under `packages/sales-knowledge`.
12. **Clone removed.** `test ! -e /tmp/opencode/repin-7eff8c10` exits 0.
13. **Commit hygiene.** The Red commit holds only the content test. The Green commit holds the seed, the guard lists, the fixtures, and the candidate. Both subjects carry `(track_id: sales_training_2027_20261015)`. No push and no amend.
