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
- [ ] Task: Contract for audio media calls through chat completions
    - [ ] Define the audio format map in the OpenRouter adapter: `audio/webm` → `webm`, `audio/ogg` → `ogg`, `audio/wav` → `wav`, `audio/mpeg` and `audio/mp3` → `mp3`; any other type throws `AIClientError` (`UNSUPPORTED`)
    - [ ] Define the env contract: `SALES_AUDIO_EVAL_MODEL` (default `qwen/qwen3.8-omni-flash`) and `SALES_AUDIO_EVAL_FALLBACK_MODEL` (default `google/gemini-2.5-flash-lite`); remove `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL` and `SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL`
    - [ ] Update `apps/sales-advantage/.env.example` and the `--set-secrets` lists in `apps/sales-advantage/cloudbuild.yaml`
- [ ] Task: Red tests for the media request
    - [ ] `packages/ai`: `generateObjectFromMedia` posts to `/chat/completions` with `input_audio {data, format: "webm"}` and a `json_schema` response format made by `zodSchema()`, parses the reply, validates it with the zod schema, and maps HTTP and parse errors to `AIClientError`
    - [ ] `packages/ai`: a WebM file never reaches the Responses request format
    - [ ] `packages/domain`: the fallback is a second media call with the fallback model; `transcribeAudio` is not called; both model errors are in the `EVALUATION_FAILED` cause
    - [ ] Update `phase-multimodal-openrouter.test.ts` and `sales-roleplay-evaluator.test.ts` expectations that assert the old path
    - [ ] Run the tests and confirm that they fail for the expected reason
- [ ] Task: Implement the media request and the two-model evaluator
    - [ ] `packages/ai/src/providers/openrouter.ts`: media calls use chat completions with `input_audio` (adapter-internal request code; no new dependency)
    - [ ] `packages/domain/src/sales/roleplay-evaluator.ts`: main model, then the backup model, both single-pass audio; remove the speech-to-text path and the Nemotron and Parakeet defaults; JSDoc
    - [ ] `apps/sales-advantage/app/api/roleplay-attempts/route.ts`: `maxDuration` 180
    - [ ] Tests green; package `tsc` and eslint for `packages/ai`, `packages/domain`, `apps/sales-advantage`
- [ ] Task: Live model check before deploy
    - [ ] Run the scratchpad Thai test clips (WebM) through the new adapter code with the production models; record scores, time, and cost in `measure/tracks/sales_training_2027_20261015/scoring-check.md`
- [ ] Task: Deploy a no-traffic candidate
    - [ ] Add the new model secret versions in Secret Manager (owner OK first)
    - [ ] Build and deploy with the existing Sales release path (`scripts/promote-sales-candidate.sh`), no traffic
    - [ ] Update `measure/deployment-status.md`
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
    - [ ] Add a dated note to `measure/tech-stack.md`: OpenRouter audio goes through chat completions with `input_audio`
    - [ ] Add a lessons-learned entry: the `@ai-sdk/openai` default (Responses) rejects audio; test media calls against the live provider once
- [ ] Task: Measure - User Manual Verification 'Phase S1: Roleplay scoring works in Thai and English' (Protocol in workflow.md)
    - [ ] The owner records one Thai and one English roleplay in a real browser on the candidate; each gets a score, feedback, and a transcript excerpt in its language
    - [ ] Promote the candidate to 100% only after the owner says yes

## Phase S2: The curriculum uses the new PR source set
_Story ref: spec.md#story-s2-the-curriculum-uses-the-new-pr-source-set_
_Start gate: the PR source-set commit exists and the feature freeze has ended._

- [ ] Task: Contract — the new document list
    - [ ] List the pinned documents from the PR scope doc (`09-sales-enablement/sales-training-scope-2027.md`) in the candidate generator input
- [ ] Task: Test — candidate generation
    - [ ] Update `scripts/curriculum-release.test.ts` and the candidate contract tests for the new commit and document list (red first)
- [ ] Task: Implement — regenerate `release-candidate.json`
    - [ ] Run `curriculum:release-candidate` against the PR commit; keep the existing source-hash fields only (hashing policy: no new or wider hashes)
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S2: The curriculum uses the new PR source set' (Protocol in workflow.md)

## Phase S3: General selling modules are correct
_Story ref: spec.md#story-s3-general-selling-modules-are-correct_

- [ ] Task: Contract — content rules
    - [ ] Add a seed content test: forbidden phrases ("Director Pim", "PSP school", "80% of reps", "48 hours"), pilot shape wording, no free period, no discount
- [ ] Task: Test — red run of the content test against the current seed
- [ ] Task: Implement — edit modules 1–3 in `apps/sales-advantage/scripts/static-seed.ts`
    - [ ] Remove the unsourced lines; set the pilot shape to one grade level, one semester; check each statistic against a source
    - [ ] Rubric rows: 3–5 criteria, weights sum to 1
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S3: General selling modules are correct' (Protocol in workflow.md)

## Phase S4: Product knowledge matches strategy v1.8
_Story ref: spec.md#story-s4-product-knowledge-matches-strategy-v18_

- [ ] Task: Contract — product facts table in the content test (states, prices, Managed Service line, book-name prefix, CEFR-only)
- [ ] Task: Test — red run against the current "9-Product Suite" lesson
- [ ] Task: Implement — replace the product module lessons and quiz from the PR sources
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S4: Product knowledge matches strategy v1.8' (Protocol in workflow.md)

## Phase S5: Tutor family sale (Thai first, with English)
_Story ref: spec.md#story-s5-tutor-family-sale-thai-first-with-english_

- [ ] Task: Contract — placement-to-book map and roleplay content shape
    - [ ] Placement map (program + book level 1–4 → nearest printed book) as seed data with a test
    - [ ] Bilingual scenario text: Thai first, English below, in the existing fields (no schema change)
- [ ] Task: Test — red tests for the map, the books on sale, the Reedy wording, and no B1+ close
- [ ] Task: Implement — Family module lessons, roleplays (first sale, price objection, "already at a tutor school", next book), quiz, and rubrics from the PR playbook and success criteria (claims criterion passingScore 90)
- [ ] Task: Live check — score one Thai and one English recording for each new Tutor roleplay with the S1 scorer; record results in `scoring-check.md`
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S5: Tutor family sale (Thai first, with English)' (Protocol in workflow.md)

## Phase S6: Tutor recruitment
_Story ref: spec.md#story-s6-tutor-recruitment_
_Gate for the earnings example: PR's Q-SV-16 check._

- [ ] Task: Contract — commission facts from the PR recruitment kit v1.2 in the content test
- [ ] Task: Test — red tests for the commission scale and for "no earnings example without the Q-SV-16 check"
- [ ] Task: Implement — recruitment lesson, roleplay, and rubric (an invented earnings figure fails)
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S6: Tutor recruitment' (Protocol in workflow.md)

## Phase S7: School sale with Primary Advantage and Blended Learning
_Story ref: spec.md#story-s7-school-sale-with-primary-advantage-and-blended-learning_

- [ ] Task: Contract — school facts in the content test (Primary Advantage + Blended Learning, prices, demo flows, no unshipped features, Boonyathat consent rule)
- [ ] Task: Test — red run against the current Reading Advantage modules
- [ ] Task: Implement — School module lessons, roleplays, quizzes, and rubrics from the PR demo scripts and rep onboarding
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S7: School sale with Primary Advantage and Blended Learning' (Protocol in workflow.md)

## Phase S8: Role paths in one course
_Story ref: spec.md#story-s8-role-paths-in-one-course_
_Blast radius (grep): `deriveSalesLearningAccess` (callers: `packages/domain/src/sales/learning-path.ts`; test: `packages/domain/src/__tests__/sales-progression.test.ts`)._

- [ ] Task: Contract — an optional module prerequisite (core vs branch) in the seed data and the progression input
- [ ] Task: Test — red tests: both branches unlock after the core; a linear course without branch data does not change
- [ ] Task: Implement — `packages/domain/src/sales/progression.ts`, the seed, and the dashboard labels (EN/TH messages)
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S8: Role paths in one course' (Protocol in workflow.md)

## Phase S9: Mastery bindings follow the new course
_Story ref: spec.md#story-s9-mastery-bindings-follow-the-new-course_

- [ ] Task: Contract — confirm with `sales_mastery_consumer_20260810` which binding fields change (module slug, lesson order, rubric refs)
- [ ] Task: Test — red run of the sales-knowledge tests against the new seed
- [ ] Task: Implement — regenerate the binding release with `packages/sales-knowledge/src/generator.ts`; change only the files the existing contract requires
- [ ] Task: Generate docs and doctor
- [ ] Task: Measure - User Manual Verification 'Phase S9: Mastery bindings follow the new course' (Protocol in workflow.md)

## Phase S10: Release the new curriculum
_Story ref: spec.md#story-s10-release-the-new-curriculum_

- [ ] Task: PR claims review of the drafted lessons; fix each finding
- [ ] Task: Daniel checks all Thai text
- [ ] Task: Daniel completes `curriculum-approval.json` and puts its SHA-256 in Secret Manager (existing process)
- [ ] Task: Run `seed:production-curriculum` and `verify:production-curriculum`; deploy through the existing Sales release path
- [ ] Task: Update `measure/deployment-status.md`, `measure/tracks.md`, and close the predecessor rows that this track replaces
- [ ] Task: Measure - User Manual Verification 'Phase S10: Release the new curriculum' (Protocol in workflow.md)
