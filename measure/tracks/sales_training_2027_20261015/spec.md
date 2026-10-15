# Specification: Sales Advantage 2027 training — roleplay scoring repair and curriculum rebuild

> **Track ID:** `sales_training_2027_20261015`
> **Type:** feature (Story S1 is a bug fix)
> **Created:** 2026-10-15
> **Owner:** Daniel Bo
> **Agreed with:** the PR session (advantage-pr), 2026-10-15
> **Worktree:** `~/Desktop/rama-worktrees/sales-training`, branch `sales/training-2027` from `origin/master` `0a29d574e`

## Overview

**Sprint goal:** Sales Advantage scores roleplay recordings in Thai and English, and it
teaches the 2027 products and the sales strategy for each product to tutors, the
founders, distributor reps, and a staff sales hire.

## Background (facts on 2026-10-15)

### Roleplay scoring does not work in production

1. The OpenRouter adapter (`packages/ai/src/providers/openrouter.ts`) calls
   `createOpenAI(...)(model)`. In `@ai-sdk/openai` 2.0.108 that is the Responses request
   format, which accepts only image and PDF file parts. Every audio file (WebM and MP3)
   fails with `'file part media type audio/webm' functionality not supported` before a
   model gets it.
2. The `@ai-sdk/openai` chat converter accepts only WAV and MP3, and
   `@ai-sdk/openai-compatible` 1.0.41 accepts no audio. The browser recorder sends
   `audio/webm`.
3. The free main model (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`) did not hear
   the audio through the chat format ("the audio recording was not provided"), and its free
   provider returned 502 capacity errors.
4. The backup speech-to-text model (`nvidia/parakeet-tdt-0.6b-v3`) needs
   `/api/v1/audio/transcriptions`, not chat. On that endpoint it changes Thai speech into
   Latin-letter nonsense.
5. The production logs show 0 requests to `/api/roleplay-attempts` in 120 days.

### Thai audio test (synthetic voice clips, chat format, 1 run for each clip)

Scores use the rule of Story S1 (weighted mean, a pass needs each criterion at its passing score).

| Model | Thai strong | Thai weak | English strong | English weak | Cost for each score | Time |
|---|---|---|---|---|---|---|
| `qwen/qwen3.8-omni-flash` | 88 pass | 5 fail | 90 pass | 6 fail | $0.0015–0.0029 | 39–79 s |
| `google/gemini-2.5-flash-lite` | 90 pass | 63 fail | 92 pass | 63 fail | ≤ $0.0010 | 11–16 s |
| `xiaomi/mimo-v2.6-flash` | 95 pass | 45 fail | 98 pass | 0 fail | $0.0003 | 21–32 s |

- Qwen found the Thai guarantee ("รับประกันค่ะ") and the false urgency. MiMo did not find the guarantee.
- The model's own totals passed weak attempts (MiMo: 80 for criteria 0, 75, 45, 60). The code must calculate the total.
- Qwen and Gemini 2.5 Flash Lite accept `input_audio` with the format `webm`. MiMo does not hear WebM.
- **Owner decision (2026-10-15):** Qwen 3.8 Omni Flash is the main scorer, and Gemini 2.5 Flash Lite is the backup.

### The curriculum is out of date

- `apps/sales-advantage/curriculum/release-candidate.json` pins advantage-pr `8dd7817`
  (2026-07-13). All 11 source documents changed after that commit.
- The "9-Product Suite" lesson disagrees with the canonical strategy
  (`advantage-pr/08-strategy/product-strategy-2026-2027.md` v1.8): Tutor and CodeCamp are
  live, Math and Zhongwen have no public date, and Managed Service is "2027 only if 1–2 more
  schools sign".
- Modules 4–6 sell Reading Advantage to schools. No school uses Reading Advantage today.
- The course has no Tutor Advantage content. Tutor Advantage is the main business focus
  (break-even: 10 tutors and 300 students by May 2027).
- These seed lines have no source: "Director Pim at PSP school", "80% of reps lose the
  deal", and "implementation lead within 48 hours".

### Owner decisions (2026-10-15, through the PR session)

1. **Trainees:** tutors; Daniel and Phikul; distributor reps; a new staff sales hire (the role does not exist yet).
2. **School pilot shape:** one grade level, one semester. Paid or free stays open (Q-SV-05). Teach no free period and no discount.
3. **School prices:** App-Only ~1,000 ฿ and Blended Learning ~1,500 ฿ for each student each year. Founding Schools (~900 ฿) is removed. Managed Service is not sold.
4. **Tutor recruitment:** talk openly about the commission scale (unilevel, progressive rates from 40% to about 71.4%, differential commission on the tutors you bring in). An earnings example must match the payout rules; PR checks it under Q-SV-16 first.
5. **Placement:** book levels 1–4 only. The result is a program and a book level. Children: Primary Advantage Origins 1, Origins 2, Origins 3.1/3.2, Quest 4 (Pre-A1 to A1). Secondary students: Reading Advantage Origins 1, Origins 2, Origins 3.1/3.2, Quest 4 (A1 to A2). Parent-facing words use CEFR names only. If the book is not printed, offer the nearest printed book below the level. No closing lines for B1 and above.
6. **Tutor accounts:** a new CONTRACTOR company role, not EMPLOYEE. This is separate monorepo work after the Primary cutover (out of scope here).
7. **Thai roleplays:** each Tutor roleplay has Thai text and an English version.

## Stories

### Story S1: Roleplay scoring works in Thai and English
**As a** trainee
**I want** each recorded roleplay, in Thai or English, to get a correct score and feedback
**So that** I can practise and pass the roleplay lessons

**Acceptance Criteria:**
- Given a WebM recording from the browser, When the trainee submits it, Then the OpenRouter adapter sends it as `input_audio` with the format `webm` through the chat completions request format, and a model scores it.
- Given the main model (`qwen/qwen3.8-omni-flash`) fails, When the evaluator runs, Then it sends the same audio to the backup model (`google/gemini-2.5-flash-lite`), and no speech-to-text step runs.
- Given a model evaluation, When the app saves it, Then the overall score is the weighted mean of the rubric criteria, and the attempt passes only when each criterion meets its `passingScore`. A criterion that the model did not score counts as 0.
- Given a deployed no-traffic candidate, When the owner records one Thai and one English roleplay in a real browser, Then each recording gets a score, feedback, and a transcript excerpt in its language.
- Given both models fail, When the evaluator runs, Then the route returns the existing `EVALUATION_FAILED` error, and the logs name both model errors.

**Estimate:** M
**Priority:** Must

### Story S2: The curriculum uses the new PR source set
**As a** curriculum reviewer
**I want** the release candidate to pin the new advantage-pr commit and document list
**So that** each lesson statement traces to the current canonical sources

**Acceptance Criteria:**
- Given the PR source-set commit, When the candidate is generated, Then `release-candidate.json` names that commit and the new document list, and candidate generation passes.
- Given the PR source set, When it is pinned, Then it includes `09-sales-enablement/sales-training-scope-2027.md`, the Tutor family-sales playbook, the LINE trial script v1.4, the recruitment kit v1.2, and the updated demo scripts and rep onboarding.

**Estimate:** S
**Priority:** Must

### Story S3: General selling modules are correct
**As a** trainee
**I want** the discovery, value, and objection modules to teach only sourced and approved content
**So that** I do not repeat invented facts to a buyer

**Acceptance Criteria:**
- Given the seed, When it is searched, Then it has no "Director Pim", no "PSP school", no "80% of reps", and no "48 hours" promise.
- Given a lesson about pilots, When it states a pilot shape, Then it says "one grade level, one semester" and gives no length in days, no free period, and no discount.
- Given each statistic or promise in modules 1–3, When it is checked, Then it traces to a pinned source document or a cited sales book.

**Estimate:** M
**Priority:** Must

### Story S4: Product knowledge matches strategy v1.8
**As a** trainee
**I want** one product lesson about the catalogue, the two channels, the tiers, and the launch states
**So that** I never sell a product or a date that does not exist

**Acceptance Criteria:**
- Given the product module, When it describes products, Then it uses the strategy v1.8 states: Primary Advantage live at one school, Tutor Advantage live, CodeCamp Advantage live, Reading Advantage with no school users, Science/Math/Zhongwen Advantage as coming programs with no date, Storytime and STEM with no date.
- Given the tier lesson, When it states prices, Then it gives App-Only ~1,000 ฿, Blended Learning ~1,500 ฿, Tutor Advantage from 3,000 ฿ for each class package, and Managed Service as "not sold today; it launches in 2027 only if 1–2 more schools sign".
- Given the claims lesson, When it gives outcome language, Then it uses only the approved forms of the outcome-claims policy, CEFR names only, and no GSE, Pearson, or YLE names.
- Given a book name, When a lesson uses it, Then it carries the product name ("Primary Advantage Origins 2", never "Origins 2").

**Estimate:** M
**Priority:** Must

### Story S5: Tutor family sale (Thai first, with English)
**As a** tutor
**I want** to practise the parent conversation from the LINE placement trial to the first class package
**So that** I can sell the right book to each family

**Acceptance Criteria:**
- Given a placement result, When the lesson maps it, Then it gives the program and book level 1–4, and the nearest printed book below the level when the book is not printed.
- Given the books on sale, When the lesson lists them, Then it names Primary Advantage Origins 2, Primary Advantage Origins 3.1, and Reading Advantage Origins 2, plus Primary Advantage Origins 3.2 and Quest 4 from about 2026-11-08.
- Given a Tutor roleplay, When a trainee opens it, Then the scenario text is in Thai first with the English version below, and the trainee can record in either language.
- Given the Reedy statement, When a lesson mentions Reedy, Then it says that Reedy voice practice is live in Tutor Advantage for students with an active class package, on completed lessons, and that Read Along with Reedy is not available.
- Given a child above A2, When the lessons are searched, Then they have no closing line for B1 and above.
- Given the renewal lesson, When a package ends, Then the roleplay practises the "next book" conversation.

**Estimate:** L
**Priority:** Must

### Story S6: Tutor recruitment
**As a** tutor who brings in other tutors
**I want** to explain the teaching role and the commission scale correctly
**So that** new tutors join with accurate expectations

**Acceptance Criteria:**
- Given the recruitment lesson, When it explains pay, Then it states the unilevel scale, the progressive rates from 40% to about 71.4%, and the differential commission, as the PR source states them.
- Given an earnings example, When it is in a lesson, Then it is the example that PR checked against the payout rules under Q-SV-16; without that check, the lesson has no earnings example.
- Given the recruitment roleplay, When it is scored, Then the rubric fails an invented earnings figure.

**Estimate:** M
**Priority:** Should

### Story S7: School sale with Primary Advantage and Blended Learning
**As a** founder, distributor rep, or staff sales hire
**I want** to practise the school sale for the 2027 school year
**So that** I can offer Primary Advantage with Blended Learning to primary schools

**Acceptance Criteria:**
- Given the school modules, When they name the product, Then they sell Primary Advantage with Blended Learning, not Reading Advantage.
- Given the method lessons, When they teach the sale, Then they keep SPIN discovery, the Challenger teach, the objection pattern, the 15-, 45-, and 90-minute demo flows, and the Total Cost of English frame with App-Only and Blended Learning prices only.
- Given a feature in a lesson, When it is described, Then it ships in production today.
- Given Boonyathat, When a lesson mentions the school, Then it is a reference only with written consent (Q-SE-03).

**Estimate:** L
**Priority:** Must

### Story S8: Role paths in one course
**As a** trainee
**I want** to finish the shared core and then only the branch for my sales channel
**So that** a tutor does not have to finish school-sales modules, and a school seller does not have to finish tutor modules

**Acceptance Criteria:**
- Given the core modules (S3, S4) are complete, When the trainee opens the course, Then both the Family branch (S5, S6) and the School branch (S7) are unlocked.
- Given a branch module, When its prerequisite is checked, Then the prerequisite is the core, not the previous branch.
- Given the existing linear courses, When no branch data exists, Then the current line-by-line unlocking does not change.

**Estimate:** M
**Priority:** Should

### Story S9: Mastery bindings follow the new course
**As a** maintainer
**I want** the packaged Sales Mastery bindings regenerated for the new course
**So that** the packaged artifacts and their tests stay valid and the open Mastery track works from the new course

**Acceptance Criteria:**
- Given the new seed, When the bindings are regenerated with the existing generator in `packages/sales-knowledge`, Then the binding release names each new module slug and lesson order, and the sales-knowledge tests pass.
- Given the regeneration, When files change, Then only the binding data, graph data, and evidence files that the existing contract requires change (hashing policy: no new or wider hashes).

**Estimate:** M
**Priority:** Must

### Story S10: Release the new curriculum
**As the** owner
**I want** to approve the new curriculum and see it live
**So that** trainees use the correct course

**Acceptance Criteria:**
- Given the drafted lessons, When PR has done its claims review and Daniel has checked all Thai, Then Daniel signs `curriculum-approval.json` and puts its SHA-256 in Secret Manager, as the existing release process requires.
- Given the approval, When `seed:production-curriculum` runs, Then it seeds the new course, and `verify:production-curriculum` passes.
- Given the deployed release, When the owner does the manual check, Then the owner confirms the branches, one Thai roleplay, one English roleplay, and one quiz.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- **Cost:** a scored attempt costs less than $0.01 at the 2026-10-15 OpenRouter prices.
- **Time:** the roleplay route allows at least 180 seconds; the Cloud Run request timeout stays at its 300-second default or higher.
- **Provider neutrality:** model IDs come only from environment values; provider-specific request code stays in `packages/ai`.
- **Claims:** each product, price, date, and outcome statement in a lesson traces to a pinned source document.
- **Thai:** Daniel checks all Thai text before the approval.
- **Code standards:** JSDoc on each exported symbol; tests ship with each code change; `tsc`, eslint, and the affected package tests pass.
- **Machine load:** each heavy job runs under `~/Desktop/primary-parity-progress/heavy.lock` with `nice`; tell the Monorepo session first.

## Start Gate

- **S1** starts now. It is a bug fix, so it is allowed under the feature freeze.
- **S2–S10** start when (a) the PR source-set commit exists and (b) the feature freeze ends after the Primary deployment.

## Work Split

- **PR session:** the source set; Thai and English text and success criteria for each Tutor roleplay; the Q-SV-16 check; a claims review of the drafted lessons.
- **This track (monorepo):** lesson drafts in the seed from the PR sources; rubric rows from the PR success criteria (3–5 criteria, weights sum to 1, passingScore 90 for the claims criterion); app and scorer changes; tests; release.
- **Daniel:** checks all Thai; signs the approval record; does the manual checks.

## Out of Scope

- The CONTRACTOR company role and tutor account creation (separate monorepo work after the cutover; tutors cannot sign in until it ships).
- Locale columns for lesson content (bilingual text goes in the same field, Thai first).
- The Sales chat empty-bubble defect (`measure/tech-debt.md`, 2026-09-22).
- Mastery runtime wiring and evidence projection (owned by `sales_mastery_consumer_20260810`).
- Sales training for Reading Advantage schools, CodeCamp, Storytime, STEM, and Managed Service.
- CRM, licensing, invoice, or commission data in Sales Advantage.
