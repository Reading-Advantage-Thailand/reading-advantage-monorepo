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
- [b] Task: Deploy a no-traffic candidate — deferred:after-primary-cutover (owner 2026-10-15: the candidate carries 61 Sales commits since the 2026-07-19 deploy and 30 migrations on the Sales DB, which shares the Cloud SQL instance with Primary; run after the cutover, last date 2026-10-20)
    - [ ] Add a `qwen/qwen3.8-omni-flash` version to `SALES_AUDIO_EVAL_MODEL` and create `SALES_AUDIO_EVAL_FALLBACK_MODEL` (`google/gemini-2.5-flash-lite`) with the runtime service account's access (owner OK given 2026-10-15 for after the cutover)
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
_Start gate: the PR source-set commit exists and the feature freeze has ended._

- [b] Task: Contract — the new document list — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] List the pinned documents from the PR scope doc (`09-sales-enablement/sales-training-scope-2027.md`) in the candidate generator input
- [b] Task: Test — candidate generation — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] Update `scripts/curriculum-release.test.ts` and the candidate contract tests for the new commit and document list (red first)
- [b] Task: Implement — regenerate `release-candidate.json` — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] Run `curriculum:release-candidate` against the PR commit; keep the existing source-hash fields only (hashing policy: no new or wider hashes)
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S2: The curriculum uses the new PR source set' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end

## Phase S3: General selling modules are correct
_Story ref: spec.md#story-s3-general-selling-modules-are-correct_

- [b] Task: Contract — content rules — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] Add a seed content test: forbidden phrases ("Director Pim", "PSP school", "80% of reps", "48 hours"), pilot shape wording, no free period, no discount
- [b] Task: Test — red run of the content test against the current seed — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Implement — edit modules 1–3 in `apps/sales-advantage/scripts/static-seed.ts` — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] Remove the unsourced lines; set the pilot shape to one grade level, one semester; check each statistic against a source
    - [ ] Rubric rows: 3–5 criteria, weights sum to 1
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S3: General selling modules are correct' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end

## Phase S4: Product knowledge matches strategy v1.8
_Story ref: spec.md#story-s4-product-knowledge-matches-strategy-v18_

- [b] Task: Contract — product facts table in the content test (states, prices, Managed Service line, book-name prefix, CEFR-only) — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] Add the placement-to-book map and the print status of each book
    - [ ] Name each "fact that expires" from the PR scope doc in the content test, so S10 can find and check it
- [b] Task: Test — red run against the current "9-Product Suite" lesson — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Implement — replace the product module lessons and quiz from the PR sources — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S4: Product knowledge matches strategy v1.8' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end

## Phase S5: Tutor family sale (Thai first, with English)
_Story ref: spec.md#story-s5-tutor-family-sale-thai-first-with-english_

- [b] Task: Contract — placement-to-book map and roleplay content shape — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] Placement map (program + book level 1–4 → nearest printed book) as seed data with a test
    - [ ] Bilingual scenario text: Thai first, English below, in the existing fields (no schema change)
- [b] Task: Test — red tests for the map, the books on sale, the Reedy wording, and no B1+ close — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Implement — Family module lessons, roleplays (first sale, price objection, "already at a tutor school", next book), quiz, and rubrics from the PR playbook and success criteria (claims criterion passingScore 90) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Live check — score one Thai and one English recording for each new Tutor roleplay with the S1 scorer; record results in `scoring-check.md` — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S5: Tutor family sale (Thai first, with English)' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end

## Phase S6: Tutor recruitment
_Story ref: spec.md#story-s6-tutor-recruitment_
_Q-SV-16 check done by PR on 2026-10-15 (continuous rate, base 0.5; see spec.md, owner decision 4)._

- [b] Task: Contract — commission facts from the PR recruitment kit v1.2 in the content test — deferred:start-gate-pr-source-set-and-freeze-end
    - [ ] The rate rule, the differential payout, "no own students → no payout", "unverified → no payout", the checked example (30,000 ฿ GV = 55.6% = about 16,700 ฿)
- [b] Task: Test — red tests for the commission scale, the checked example, and no old step table (40/50/55/60/65%) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Implement — recruitment lesson, roleplay, and rubric (an invented earnings figure fails) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S6: Tutor recruitment' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end

## Phase S7: School sale with Primary Advantage and Blended Learning
_Story ref: spec.md#story-s7-school-sale-with-primary-advantage-and-blended-learning_

- [b] Task: Contract — school facts in the content test (Primary Advantage + Blended Learning, prices, demo flows, no unshipped features, Boonyathat consent rule) — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Test — red run against the current Reading Advantage modules — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Implement — School module lessons, roleplays, quizzes, and rubrics from the PR demo scripts and rep onboarding — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Generate docs and doctor — deferred:start-gate-pr-source-set-and-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S7: School sale with Primary Advantage and Blended Learning' (Protocol in workflow.md) — deferred:start-gate-pr-source-set-and-freeze-end

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
    - [ ] `media:` key form `training-media/v<n>/<th|en>/<file>`; allowed types `.mp4` (H.264 and AAC), `.png`, `.pdf`
    - [ ] A domain function changes each `media:` key in lesson Markdown to a URL through an injected signer; the app passes `storage.getSignedUrl` (1 hour), so `packages/domain` gets no storage dependency
- [b] Task: Test — red tests — deferred:start-gate-freeze-end
    - [ ] Domain: keys become signed URLs; other URLs do not change; a bad key or type throws
    - [ ] `LessonContent`: `.mp4` in image syntax → `<video controls playsinline preload="metadata">`; `.png` → `<img>` with alt text; `.pdf` link → new tab; raw HTML stays dropped
    - [ ] Seed gate: a missing object (`storage.exists`) stops `seed:production-curriculum`
- [b] Task: Implement — resolver, `LessonContent` components, the lesson query, the seed check; JSDoc — deferred:start-gate-freeze-end
- [b] Task: Media references — deferred:pr-media-files
    - [ ] Upload the PR files to the Sales bucket at release, with the owner's OK; put the keys and the Thai and English alt text in the lessons
    - [ ] Place the Tutor Advantage screenshot set (PR has it, 2026-10-15) where PR's list says
- [b] Task: Generate docs and doctor — deferred:start-gate-freeze-end
- [b] Task: Measure - User Manual Verification 'Phase S11: Lessons show supporting media' (Protocol in workflow.md) — deferred:start-gate-freeze-end
    - [ ] On an iPhone and on a desktop: one video plays inline, one infographic shows, one PDF opens
