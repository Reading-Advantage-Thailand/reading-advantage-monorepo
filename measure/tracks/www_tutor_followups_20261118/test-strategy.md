# Test Strategy: www Tutor Advantage follow-ups (picture and copy)

Track: `www_tutor_followups_20261118`. Baseline: `3cc5358` (spec-review PASS).
Page: `/products/tutor-advantage` in en, th, zh. Scope: two webp pictures, manifest split, `aspect-video`, old file removal, four copy items, one explain state.

Recommendation: run Phase 1 and Phase 2 under one Red pass and one Green pass. The plan allows this. Task 1.2 and task 2.1 define the Red set. Tasks 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, and 2.5 define the Green set. Task 3.3 keeps one push. The PM wants one push today. Keep plan task ids unchanged.

## Red, Green, closeout per phase

### Phase 1: the two pictures (tasks 1.2–1.7). Risk: low.

Targeted Red (task 1.2):

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run "src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx" "src/app/[locale]/(marketing)/products/tutor-advantage/page.phase3.adversarial.test.tsx" --reporter=dot --silent=true --maxWorkers=1'
```

Expect exit 1. The hero and the block show the old file. Two content blocks share one file. The box holds `aspect-4/3`.

Green gate (tasks 1.3–1.5 plus types):

```bash
pnpm --filter www-reading-advantage exec tsc --noEmit -p .
```

The Red command above exits 0. The scan below exits 1 with no output:

```bash
rg -n -i "downline|ดาวน์ไลน์" apps/www-reading-advantage/src --glob '!**/*.test.*'
```

This is the corrected gate command. The spec table shows `\|` from markdown escaping. The real command uses one unescaped pipe. Record this form in tasks 1.6 and 2.6.

Closeout gate (tasks 1.6–1.7): types, lint, build, downline scan, and affected-apps pass. Captures for hero and `#become-a-tutor` exist in `measure/runs/www_tutor_followups_20261118/p1-captures/` with `checks.json`. Every test has a falsification condition: change the pinned file, alt, class, or size back and the test fails.

### Phase 2: the PR copy items (tasks 2.1–2.6). Risk: low.

Targeted Red (task 2.1):

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts src/lib/tutor-commission.adversarial.test.ts src/__tests__/www-tutor-reedy-claim.test.tsx --reporter=dot --silent=true --maxWorkers=1'
```

Expect exit 1. The `needsOwnStudents` key is missing. The caption, the leg label, and the Thai Reedy line hold old text.

Green gate (tasks 2.2–2.5 plus types): the same Red command exits 0 after all four items land. The locale deep-equal cases pass in en, th, and zh. Then `tsc --noEmit` exits 0.

Closeout gate (task 2.6): the same five app gates as Phase 1 pass. Every test has a falsification condition: restore one old string and the locale or adversarial case fails.

### Phase 3: gates, push, and live checks (tasks 3.1–3.4). Risk: medium.

Targeted check (task 3.1):

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run --maxWorkers=1'
```

Expect exit 0. Gate 3.2 `[b]` blocks the push until the PM sends PASS on the captures. Task 3.3 allows one www-only fast-forward push. Task 3.4 checks three live pages for HTTP 200, both webp files, the new caption, and absence of the old file and banned terms.

Falsification: a red suite blocks the push. A missing PM PASS blocks the push. A live page without the new file fails closeout.

## Fixtures, mocks, live-behavior proof

Fixtures: real dictionaries in en, th, zh. Real `webpSize` header reads. Real byte counts against 300 KB. Real built page for captures at 390, 980, and 1280 px in en and th.

Mocks: none for behavior. The DB layer needs no mock here. The page renders with the real locale data.

Live proof: built-page captures show four faces and the book with no crop. Live `curl` checks confirm the new files and strings. Capture files and `checks.json` are the evidence.

## Architecture guardrails and changed-contract risks

Keep changes inside `apps/www-reading-advantage/**` and `measure/**`. Touch no other app. Touch no dependency or lockfile. Add no hash field and no checksum (AGENTS.md policy). The spec records `SHA256SUMS` output as evidence only.

Changed contracts: `productPictures` drops `tutorSession` and adds `tutorHero` and `tutorTeachClass` with true 1920 by 1080 sizes. The calculator `explainVariant` gains `needsOwnStudents`. The render at line 472 needs no change. Blast radius: `page.tsx` lines 195 and 329–334, `product-pictures.ts`, locale file, `tutor-commission.ts`, calculator component. `graph.db` is absent in this checkout, so use these file paths as the blast radius. Rebuild the graph only if a shared export changes.

## Intentionally-red aggregate-suite handling

The full www suite runs first at task 3.1, not at tasks 1.6 or 2.6. Tasks 1.6 and 2.6 run the five app gates only. A red focused Red command is expected before Green. A red aggregate suite at task 3.1 blocks the push. Do not weaken the suite to reach green. Record the log as `green-3.1-<short sha>.log`.

## Artifact tests versus live behavior tests

Artifact tests check file shape: webp header size, byte limit, manifest entries, locale deep-equal, old-file absence, no shared content file, `aspect-video` presence. They do not prove the page looks right.

Live behavior tests prove the page: built-page captures at three widths, PM look check, live HTTP 200 checks, live content checks. The PM PASS is the only look gate. Daniel checks the Thai Reedy line on the live page after the push.

## Review applicability

Review A (correctness): applies to all phases. It checks file paths, alts, strings, payout state, and gate logs.

Review B (security): light. This track ships static pictures and copy only. It adds no input, no auth, no route, and no secret. Review B confirms no secret in logs and no new network call.

Review C (UX/API): applies. It checks the hero `priority`, the 16:9 frame, no overlap, and no horizontal scroll at 390 px.

Adversarial testing: applies but stays bounded. It checks the two new files, the preload `imagesrcset`, the `zero` versus `needsOwnStudents` boundary, and the banned-term scan.

Browser review: applies. The PM wants captures of the hero and `#become-a-tutor` at 390, 980, and 1280 px in en and th. Twelve captures plus `checks.json`.

## Anti-pattern coverage (A1–A11)

Phase 1 defends A4, A5, A7, A14. A4: the Red set must fail before Green; an empty pass is not a pass. A5: no task claims gates pass until the commands exit as stated. A7: the downline scan uses the exact corrected pattern above; no broad word filter hides a hit. A14: the scan uses `rg -n -i` with one unescaped pipe and `--glob`; exit 2 is a failure, not a pass. Falsification: restore the escaped `\|` form and the scan misses `downline`.

Phase 2 defends A3, A4, A5, A6. A3: size limits parse labeled integers (1920, 1080, 307200 bytes); a bare digit match is not a size proof. A4: the locale deep-equal must fail on the missing key before Green. A5/A6: no plan or registry note claims copy is live until the locale tests and the live checks pass. Falsification: restore one old string and the deep-equal fails.

Phase 3 defends A1, A5, A6, A8, A11. A1: only `[b]` with `deferred:<owner>` blocks the push; prose never blocks or unblocks. A5/A6: the push record names the commit range, gate output, capture folder, and CD run; no "all checks pass" without logs. A8: markers stay in `[~]`, `[x]`, `[b]`; a legacy blank marker is an error. A11: task 3.2 keeps `[b]` only for the real PM gate; completed tasks move to `[x]` with SHA evidence. Falsification: a red suite or a missing PM PASS blocks tasks 3.3 and 3.4.

A2 and A9 and A10 do not apply directly. This track has no publish gate, no archived-path test reference, and no generated facts. A13 is a closeout duty: remove the active track dir after archive.

## Phase base rule

Do not embed a SHA that predates this strategy commit. After this strategy commit lands, the orchestrator captures the immutable `phase_base_sha` from `git rev-parse HEAD`. That SHA starts the Red work. The affected-apps gate uses `--base 80ac554b426551e5749f0e2cd500cbbf0eb375090a` with the full 40-character head, per spec section 6.1.

---
MEASURE_AGENT_RESULT
role: strategy
status: complete
track: www_tutor_followups_20261118
phase: track setup and full-track strategy
commits: pending (strategy commit on test-strategy.md only)
tests_run: read-only checks (git rev-parse HEAD = 3cc5358; spec-review JSON verdict pass with F1 Major recorded as corrected scan)
files_changed: measure/tracks/www_tutor_followups_20261118/test-strategy.md (new)
plan_updates: none — plan.md left intact; strategy is supplementary guidance
known_failures: none in strategy scope; Red suites are expected red until Green lands
handoff: Orchestrator captures phase_base_sha after the strategy commit, then runs one combined Red pass (tasks 1.2 + 2.1) and one combined Green pass (tasks 1.3-1.5 + 2.2-2.5); Review A and C apply, Review B is light, adversarial stays bounded, browser review needs 12 captures; push waits on PM PASS at task 3.2.
END_MEASURE_AGENT_RESULT
