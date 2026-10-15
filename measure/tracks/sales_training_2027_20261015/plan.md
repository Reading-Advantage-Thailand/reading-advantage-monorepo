# Implementation Plan: Sales Advantage 2027 training — roleplay scoring repair and curriculum rebuild

> Track: `sales_training_2027_20261015` · Spec: [spec.md](./spec.md)
> Worktree: `~/Desktop/rama-worktrees/sales-training` (branch `sales/training-2027`)
> Heavy jobs (`pnpm install`, package `tsc`, test sweeps, builds): tell the Monorepo session,
> then run `flock ~/Desktop/primary-parity-progress/heavy.lock nice <command>`.
> Commits: Conventional Commits, lower-case subject, header ≤ 100 characters including
> `(track_id: sales_training_2027_20261015)`.

## Phase S1: Roleplay scoring works in Thai and English
_Story ref: spec.md#story-s1-roleplay-scoring-works-in-thai-and-english_
_Blast radius (grep; the graph has no call edges for these): `aiClientToEvaluateRoleplay` (1 caller: `apps/sales-advantage/app/api/roleplay-attempts/route.ts`), `OpenRouterProvider.generateObjectFromMedia` / `transcribeAudio` (1 caller: `packages/domain/src/sales/roleplay-evaluator.ts`); tests: `packages/ai/src/__tests__/phase-multimodal-openrouter.test.ts`, `packages/ai/src/providers/openrouter.test.ts`, `packages/domain/src/__tests__/sales-roleplay-evaluator.test.ts`._

- [x] Task: Calculate the overall score and the pass in code `84ecd83`
    - [x] Contract: `scoreRoleplayEvaluation(result, rubricCriteria)` — weighted mean of the rubric criteria; pass only when each criterion meets its `passingScore`; a criterion the model did not score counts as 0; no rubric criteria → equal weights and a pass mark of 70
    - [x] Test: 6 cases in `packages/domain/src/sales/__tests__/permissions-and-evaluator.test.ts` (observed 80/pass case → 42/fail, per-criterion gate, all pass, name match and missing criterion, empty rubric, primary and fallback paths)
    - [x] Implement: apply it on both evaluator paths in `packages/domain/src/sales/roleplay-evaluator.ts`
    - [x] Commit with the package `tsc` result (domain `tsc --noEmit` clean)
- [x] Task: Contract for audio media calls through chat completions `dbe5efecc`
    - [x] Define the audio format map (in `57c500e`) in the OpenRouter adapter: `audio/webm` → `webm`, `audio/ogg` → `ogg`, `audio/wav` → `wav`, `audio/mpeg` and `audio/mp3` → `mp3`; any other type throws `AIClientError` (`UNSUPPORTED`)
    - [x] Define the env contract: `SALES_AUDIO_EVAL_MODEL` (default `qwen/qwen3.8-omni-flash`) and `SALES_AUDIO_EVAL_FALLBACK_MODEL` (default `google/gemini-2.5-flash-lite`); remove `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL` and `SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL`
    - [x] Update `apps/sales-advantage/.env.example` and the `--set-secrets` lists in `apps/sales-advantage/cloudbuild.yaml`
- [x] Task: Red tests for the media request `57c500e`
    - [x] `packages/ai`: `generateObjectFromMedia` posts to `/chat/completions` with `input_audio {data, format: "webm"}` and a `json_schema` response format made by `zodSchema()`, parses the reply, validates it with the zod schema, and maps HTTP and parse errors to `AIClientError`
    - [x] `packages/ai`: a WebM file never reaches the Responses request format
    - [x] `packages/domain`: the fallback is a second media call with the fallback model; `transcribeAudio` is not called; both model errors are in the `EVALUATION_FAILED` cause
    - [x] Update `phase-multimodal-openrouter.test.ts` and `sales-roleplay-evaluator.test.ts` expectations that assert the old path
    - [x] Run the tests and confirm that they fail for the expected reason
- [x] Task: Implement the media request and the two-model evaluator `57c500e`
    - [x] `packages/ai/src/providers/openrouter.ts`: media calls use chat completions with `input_audio` (adapter-internal request code; no new dependency)
    - [x] `packages/domain/src/sales/roleplay-evaluator.ts`: main model, then the backup model, both single-pass audio; remove the speech-to-text path and the Nemotron and Parakeet defaults; JSDoc
    - [x] `apps/sales-advantage/app/api/roleplay-attempts/route.ts`: `maxDuration` 180
    - [x] Tests green; package `tsc` and eslint for `packages/ai`, `packages/domain`, `apps/sales-advantage`
- [x] Task: Live model check before deploy
    - [x] Run the scratchpad Thai test clips (WebM) through the new adapter code with the production models; record scores, time, and cost in `measure/tracks/sales_training_2027_20261015/scoring-check.md`
- [x] Task: Fix the S1 phase review findings (see `plan-review.md`) `f8e2723`
    - [x] Red tests: criteria fallback without reuse, duplicate rubric names, prompt copy rule, scoring error outside the model fallback, logs without error objects, `audio/mp4` → `m4a`, private API key, recorder blob type from the browser recorder
    - [x] Implement the fixes; live check: Safari-style MP4/AAC accepted as `m4a` and `mp4` by both models (2026-10-15)
    - [x] Tests, `tsc`, and eslint for `packages/ai`, `packages/domain`, `apps/sales-advantage`
- [x] Task: Grounded scorer after the S5 live check (`scoring-check.md`, 2026-10-15)
    - [x] Red tests: reference text fenced, transcript first, quotes before scores, conditional and claims rules, schema key order
    - [x] Implement in `packages/domain/src/sales/roleplay-evaluator.ts` and `schema.ts`; domain `tsc` and eslint clean; live: main model 8 of 8 correct
- [x] Task: Backup path for the scorer (the backup model invented transcripts in 6 of 13 answers; the main model is often rate-limited upstream; model comparison in `scoring-check.md`)
    - [x] Owner decision 2026-10-15: main `qwen/qwen3.8-omni-flash`, backup `google/gemini-3.8-flash` with low reasoning effort (16 of 16 correct, $0.0050–0.0064 for each score)
    - [x] Red tests, then `reasoningEffort` on the media call (`packages/ai`: OpenRouter `reasoning.effort`) and the new backup default in the evaluator; ai and domain `tsc` and eslint clean
    - [x] PR review: Thai house voice and 7 claim clips; Gemini 16 of 16, Qwen timed out on most Thai clips; owner decision 2026-10-16: main `google/gemini-3.8-flash`, backup `qwen/qwen3.8-omni-flash`, low reasoning on both calls; the adapter names a body-read time-out
- [b] Task: Deploy a no-traffic candidate — deferred:after-primary-cutover (owner 2026-10-15: the candidate carries 61 Sales commits since the 2026-07-19 deploy and 30 migrations on the Sales DB, which shares the Cloud SQL instance with Primary; run after the cutover, last date 2026-10-20)
    - [ ] Add a `google/gemini-3.8-flash` version to `SALES_AUDIO_EVAL_MODEL` and create `SALES_AUDIO_EVAL_FALLBACK_MODEL` (`qwen/qwen3.8-omni-flash`) with the runtime service account's access (owner OK given 2026-10-15 for after the cutover)
    - [ ] Run the full Sales release pipeline (`cloudbuild.yaml`: curriculum backup, migrations, curriculum verify, `candidate` tag, no traffic); promotion only with `scripts/promote-sales-candidate.sh` after the acceptance note says `status: pass`
    - [ ] Update `measure/deployment-status.md`
- [x] Task: Generate docs and doctor
    - [x] Run `measure/generate.sh` and `measure/doctor.sh` — generate: no route or package change from this track (diff only the revision line and one master Primary route), so nothing committed; doctor: 4 failures that exist on master (A13 stale `agents_md_audit_science_advantage_20260603`; missing `measure/automation-supervisor.py`; `[ ]` markers in 55 other plans; architecture manifest of 2026-09-08 with 598 later source commits — not refreshed, hashing policy); this plan passes the marker guard
    - [x] Add a dated note to `measure/tech-stack.md`: OpenRouter audio goes through chat completions with `input_audio`
    - [b] Add a lessons-learned entry: the `@ai-sdk/openai` default (Responses) rejects audio, and SDK-level mocks hid it; test media calls against the live provider once — deferred:lessons-learned-over-50-line-cap (57 lines on master; add at track closeout after a prune)
- [b] Task: Measure - User Manual Verification 'Phase S1: Roleplay scoring works in Thai and English' (Protocol in workflow.md) — deferred:owner-browser-recording
    - [ ] The owner records one Thai and one English roleplay in a real browser on the candidate; each gets a score, feedback, and a transcript excerpt in its language
    - [ ] Promote the candidate to 100% only after the owner says yes

## Phase S2: The curriculum uses the new PR source set
_Story ref: spec.md#story-s2-the-curriculum-uses-the-new-pr-source-set_
_Start gate: the PR source-set commit exists (done: advantage-pr `e6f7cc22e`, 2026-10-15; see spec.md S2). Owner decision 2026-10-15 ("draft now, ship later"): S2–S7 are drafted on the branch only during the freeze; merge, deploy, and database work wait for the freeze end._
_Known red gates until S9/S10 (approval pins, not changed on purpose): `scripts/sales-curriculum-production.test.ts` (cardinalities and pinned digest), `scripts/sales-curriculum-reconciliation.test.ts` (approved digest `ccba54…`), `scripts/production-readiness.test.ts` (approved candidate), and 8 tests in `packages/sales-knowledge` (approved coordinates)._

- [x] Task: Contract — the new document list `84b151b7f`
    - [x] List the 20 pinned documents from the PR scope doc (`09-sales-enablement/sales-training-scope-2027.md`) in `CURRICULUM_SOURCE_PATHS`; 22 canonical rubric source refs
- [x] Task: Test — candidate generation `84b151b7f`
    - [x] Update `scripts/curriculum-release.test.ts` for the new document list, the product-status and tier-claim rules, and the product lesson "One Catalogue, Two Channels" (red first)
- [x] Task: Implement — regenerate `release-candidate.json` `1ec13d473`
    - [x] Run `curriculum:release-candidate` against the PR commit `e6f7cc22e` (sparse clone of the pin); graph `f922e71d…`, status `awaiting_human_review`; only the existing source-hash fields changed (hashing policy)
- [x] Task: Generate docs and doctor
    - [x] doctor: only the A13 failure that exists on master; generate: not run, because S2–S7 change no route, package, or export; the marker guard passes for this plan
- [x] Task: Tone pass (Daniel 2026-10-16: the claims rule is a gate, not a theme)
    - [x] `review/tone-pass-proposal.md` (45 rows); PR claims check passed with 3 changes (G3–G8 and G13 removed with no replacement, T4, M2), 1 addition (remove "I am not a teacher"), and no word test
    - [x] Apply to `static-seed.ts`; update the 2 tests of changed strings; Thai check list updated; candidate at advantage-pr `919d1c1`, graph `87d3e04c…`, only existing fields changed (`f572515cc`)
    - [x] PR follow-up (pin `7ed5a4b`): M6.1 TL;DR from the recruitment kit §1; "a small class with a local teacher" in 6 places (R5 line and criterion, M5.3, M2 quiz); candidate graph `f3a56c34…`; R5 rescored on Gemini: new wording 100, old 94, weak 10, Pearson claim 0
- [b] Task: Measure - User Manual Verification 'Phase S2: The curriculum uses the new PR source set' (Protocol in workflow.md) — deferred:owner-review-with-s10-approval
    - [ ] Daniel sees the candidate source commit (now `7ed5a4b`, tone pass) and the 20 documents in the approval file at S10

## Phase S3: General selling modules are correct
_Story ref: spec.md#story-s3-general-selling-modules-are-correct_

- [x] Task: Contract — content rules `84b151b7f`
    - [x] Content test `apps/sales-advantage/scripts/curriculum-content-2027.test.ts`: forbidden phrases, pilot shape wording, no free period, no discount, rubric rules (3–5 criteria, weights sum to 1, one claims criterion at passingScore 90)
- [x] Task: Test — red run of the content test against the current seed `84b151b7f`
    - [x] Red: 31 of 34 tests failed against the old seed; green: 34 of 34 with the new seed
- [x] Task: Implement — edit modules 1–3 in `apps/sales-advantage/scripts/static-seed.ts` `84b151b7f`
    - [x] Remove the unsourced lines; set the pilot shape to one grade level, one semester; check each statistic against a source
    - [x] Rubric rows: 3–5 criteria, weights sum to 1; each core roleplay has a Thai-first parent scenario and a school scenario
- [x] Task: Generate docs and doctor
    - [x] Same run as S2
- [b] Task: Measure - User Manual Verification 'Phase S3: General selling modules are correct' (Protocol in workflow.md) — deferred:owner-thai-check
    - [x] PR claims review of group 1 (S3 + S4): no hard violation; 6 fixes in `19ea64ba1`
    - [ ] Daniel checks the Thai lines (`review/thai-lines-for-daniel.md`)

## Phase S4: Product knowledge matches strategy v1.8
_Story ref: spec.md#story-s4-product-knowledge-matches-strategy-v18_

- [x] Task: Contract — product facts table in the content test (states, prices, Managed Service line, book-name prefix, CEFR-only) `84b151b7f`
    - [x] Add the placement-to-book map and the print status of each book
    - [x] Name each "fact that expires" from the PR scope doc: `SALES_CURRICULUM_EXPIRING_FACTS` (5 facts, each with its §8 check), and every ISO-dated line must contain one of them
- [x] Task: Test — red run against the current "9-Product Suite" lesson `84b151b7f`
- [x] Task: Implement — replace the product module lessons and quiz from the PR sources `84b151b7f`
    - [x] "One Catalogue, Two Channels", "Honest Claims: The Rules for Every Conversation" (the 9 claims conditions), a two-scenario roleplay, and a quiz
- [x] Task: Generate docs and doctor
    - [x] Same run as S2
- [b] Task: Measure - User Manual Verification 'Phase S4: Product knowledge matches strategy v1.8' (Protocol in workflow.md) — deferred:owner-thai-check
    - [x] PR claims review of group 1 (S3 + S4): no hard violation; 6 fixes in `19ea64ba1`
    - [ ] Daniel checks the Thai lines (`review/thai-lines-for-daniel.md`)

## Phase S5: Tutor family sale (Thai first, with English)
_Story ref: spec.md#story-s5-tutor-family-sale-thai-first-with-english_

- [x] Task: Contract — placement-to-book map and roleplay content shape `84b151b7f`
    - [x] Placement map (program + book level 1–4 → nearest printed book) as lesson tables in the product and placement lessons, checked by the content test (no new seed table, no schema change)
    - [x] Bilingual scenario text: Thai first, then a blank line and "English: ", in the existing fields (no schema change); the recorder keeps the line break (`whitespace-pre-line`)
- [x] Task: Test — red tests for the map, the books on sale, the Reedy wording, and no B1+ close `84b151b7f`
- [x] Task: Implement — Family module lessons, roleplays (first sale, price objection, "already at a tutor school", next book), quiz, and rubrics from the PR playbook and success criteria (claims criterion passingScore 90) `84b151b7f`
    - [x] 4 theory lessons, roleplays R1–R5 with the playbook weights, quiz; interim placement method marked "Until the tool exists" (Q-SE-12)
- [x] Task: Live check — score one Thai and one English recording for each new Tutor roleplay with the S1 scorer; record results in `scoring-check.md`
    - [x] 16 synthetic answers (R1–R5, RR1–RR3, Thai and English) and 2 weak answers; found the scorer defect and the unsafe backup model (see S1 tasks below the S1 fix)
- [x] Task: Generate docs and doctor
    - [x] Same run as S2
- [b] Task: Measure - User Manual Verification 'Phase S5: Tutor family sale (Thai first, with English)' (Protocol in workflow.md) — deferred:owner-thai-check
    - [x] PR claims review of group 2 (S5 + S6): no violation; contacts added in `19ea64ba1`
    - [ ] Daniel checks the Thai lines (`review/thai-lines-for-daniel.md`)

## Phase S6: Tutor recruitment
_Story ref: spec.md#story-s6-tutor-recruitment_
_Q-SV-16 check done by PR on 2026-10-15 (continuous rate, base 0.5; see spec.md, owner decision 4)._

- [x] Task: Contract — commission facts from the PR recruitment kit v1.2 in the content test `84b151b7f`
    - [x] The rate rule, the differential payout, "no own students → no payout", "unverified → no payout", the checked example (30,000 ฿ GV = 55.6% = about 16,700 ฿)
- [x] Task: Test — red tests for the commission scale, the checked example, and no old step table `84b151b7f`
- [x] Task: Implement — recruitment lesson, roleplay, and rubric (an invented earnings figure fails) `84b151b7f`
    - [x] 3 theory lessons, roleplays RR1–RR3 with the kit weights, quiz; the recruitment claims criterion fails a promise of income and an unlabelled baht figure
- [x] Task: Generate docs and doctor
    - [x] Same run as S2
- [b] Task: Measure - User Manual Verification 'Phase S6: Tutor recruitment' (Protocol in workflow.md) — deferred:owner-thai-check
    - [x] PR claims review of group 2 (S5 + S6): no violation; contacts added in `19ea64ba1`
    - [ ] Daniel checks the Thai lines (`review/thai-lines-for-daniel.md`)

## Phase S7: School sale with Primary Advantage and Blended Learning
_Story ref: spec.md#story-s7-school-sale-with-primary-advantage-and-blended-learning_

- [x] Task: Contract — school facts in the content test (Primary Advantage + Blended Learning, prices, demo flows, no unshipped features, Boonyathat consent rule) `84b151b7f`
- [x] Task: Test — red run against the current Reading Advantage modules `84b151b7f`
- [x] Task: Implement — School module lessons, roleplays, quizzes, and rubrics from the PR demo scripts and rep onboarding `84b151b7f`
    - [x] 5 theory lessons (rules, demos, 8 objections, total cost of English, end-of-semester review), 3 scenario roleplays with the scenario checklists, quiz
- [x] Task: Generate docs and doctor
    - [x] Same run as S2
- [b] Task: Measure - User Manual Verification 'Phase S7: School sale with Primary Advantage and Blended Learning' (Protocol in workflow.md) — deferred:owner-thai-check
    - [x] PR claims review of group 3 (S7): 1 hard finding (B2) and 5 fixes in `048090037`; PR source fixes pinned at `c211d1c` (`c3d48dd17`)
    - [ ] Daniel accepts the school lessons (no Thai text in S7)

## Phase S8: Role paths in one course
_Story ref: spec.md#story-s8-role-paths-in-one-course_
_Blast radius (grep): `deriveSalesLearningAccess` (callers: `packages/domain/src/sales/learning-path.ts`; test: `packages/domain/src/__tests__/sales-progression.test.ts`)._

- [b] Task: Contract — an optional module prerequisite (core vs branch) in the seed data and the progression input — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Test — red tests: both branches unlock after the core; a linear course without branch data does not change — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Implement — `packages/domain/src/sales/progression.ts`, the seed, and the dashboard labels (EN/TH messages) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S8: Role paths in one course' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] Until the CONTRACTOR role ships, Daniel and Phikul test the Family branch with their own accounts

## Phase S9: Mastery bindings follow the new course
_Story ref: spec.md#story-s9-mastery-bindings-follow-the-new-course_

- [b] Task: Contract — confirm with `sales_mastery_consumer_20260810` which binding fields change (module slug, lesson order, rubric refs) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Test — red run of the sales-knowledge tests against the new seed — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Implement — regenerate the binding release with `packages/sales-knowledge/src/generator.ts`; change only the files the existing contract requires — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S9: Mastery bindings follow the new course' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end

## Phase S10: Release the new curriculum
_Story ref: spec.md#story-s10-release-the-new-curriculum_

- [b] Task: PR claims review of the drafted lessons; fix each finding — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Daniel checks all Thai text — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Daniel completes `curriculum-approval.json` and puts its SHA-256 in Secret Manager (existing process) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: On the seed day, check each "fact that expires" (PR scope doc) against advantage-pr; correct each changed fact before the seed — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Run `seed:production-curriculum` and `verify:production-curriculum`; deploy through the existing Sales release path — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Update `measure/deployment-status.md`, `measure/tracks.md`, and close the predecessor rows that this track replaces — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S10: Release the new curriculum' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Tutor access gate — one tutor account with the CONTRACTOR role signs in and opens the Family branch before the branch is announced to tutors — deferred:contractor-role-track-monorepo-after-cutover

## Phase S11: Lessons show supporting media
_Story ref: spec.md#story-s11-lessons-show-supporting-media_
_Start gate: the feature freeze has ended (app code); PR delivers the files after the text source set (media references)._
_Blast radius (grep): `LessonContent` (1 caller: `apps/sales-advantage/app/[locale]/lesson/[id]/page.tsx`); the `sales.lesson` query in `packages/api/src/routers/sales.ts`._

- [b] Task: Contract — media keys and file rules — deferred:start-gate-freeze-end
    - [ ] `media:` key form `training-media/v<n>/<th|en>/<file>`; allowed types `.png`, `.pdf` (videos are YouTube links, Daniel 2026-10-16)
    - [ ] A domain function changes each `media:` key in lesson Markdown to a URL through an injected signer; the app passes `storage.getSignedUrl` (1 hour), so `packages/domain` gets no storage dependency
- [b] Task: Test — red tests — deferred:start-gate-freeze-end
    - [ ] Domain: keys become signed URLs; other URLs do not change; a bad key or type throws
    - [ ] `LessonContent`: `.png` → `<img>` with alt text; a `.pdf` link and a YouTube link → new tab; raw HTML stays dropped
    - [ ] Seed gate: a missing object (`storage.exists`) stops `seed:production-curriculum`
- [b] Task: Implement — resolver, `LessonContent` components, the lesson query, the seed check; JSDoc — deferred:start-gate-freeze-end
- [b] Task: Media references — deferred:pr-media-files
    - [ ] Upload the PR infographics and decks to the Sales bucket at release, with the owner's OK; put the keys and the Thai and English alt text in the lessons
    - [ ] Put the YouTube links of the S5, S6, and S7 videos (TH and EN) in the lessons; the S4 video waits for its link from PR
    - [ ] Draft the screenshot → lesson list from PR's starting list and the 9 screenshot rules (spec.md S11), with each crop marked; PR checks it
    - [ ] Upload the checked (and cropped) screenshots under `training-media/v1/th/`; put their keys and Thai and English alt text in the lessons
- [b] Task: Generate docs and doctor — deferred:start-gate-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S11: Lessons show supporting media' (Protocol in workflow.md) — deferred:start-gate-freeze-end
    - [ ] On an iPhone and on a desktop: one YouTube video link opens, one infographic shows, one PDF opens
