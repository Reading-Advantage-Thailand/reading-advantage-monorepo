# Specification: Sales Advantage 2027 training — roleplay scoring repair and curriculum rebuild

> **Track ID:** `sales_training_2027_20261015`
> **Type:** feature (Story S1 is a bug fix)
> **Created:** 2026-10-15
> **Owner:** Daniel Bo
> **Agreed with:** the PR session (advantage-pr), 2026-10-15 — products, priorities, owner decisions, the story list, the branches, and the work split; PR added the "facts that expire" check (S4, S10), the founders as Family-branch testers (S5, S8), and Story S11 (supporting media)
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
- **Owner decision (2026-10-15, after the S5 live check):** the backup changes to Gemini 3.8 Flash with low reasoning effort. Gemini 2.5 Flash Lite invented transcripts (`scoring-check.md`).
- **Owner decision (2026-10-16, after the Thai-voice check):** Gemini 3.8 Flash is the main scorer and Qwen 3.8 Omni Flash is the backup; both calls ask for low reasoning effort. Qwen timed out at 120 s on most Thai-voice clips (`scoring-check.md`).

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
   - **Q-SV-16 result (PR, 2026-10-15),** from the tutor-advantage payout code (`commissionService.ts`, `settlementService.ts`); Daniel confirmed the production base rate 0.5:
     - Rate below 20,000 ฿ group volume (GV): 40% + GV / 200,000.
     - Rate from 20,000 ฿ GV: 0.5 × (1 − 0.3^(1 + log₅(GV / 20,000))) / 0.7. The rate is 50% at 20,000 ฿ GV, and its limit is about 71.4%.
     - The differential payout is the rate on your group volume minus what your recruits get.
     - A tutor with recruits but no own students gets no payout. An unverified tutor gets no payout.
     - The step table in the old recruitment kit (40/50/55/60/65%) is wrong.
     - Checked example: 10 own students at 3,000 ฿ in one month = 30,000 ฿ GV = 55.6% = about 16,700 ฿ (the old kit said 12,000 ฿).
5. **Placement:** book levels 1–4 only. The result is a program and a book level. Children: Primary Advantage Origins 1, Origins 2, Origins 3.1/3.2, Quest 4 (Pre-A1 to A1). Secondary students: Reading Advantage Origins 1, Origins 2, Origins 3.1/3.2, Quest 4 (A1 to A2). Parent-facing words use CEFR names only. If the book is not printed, offer the nearest printed book below the level. No closing lines for B1 and above.
6. **Tutor accounts:** a new CONTRACTOR company role, not EMPLOYEE. This is separate monorepo work after the Primary cutover (out of scope here). Until it ships, tutors cannot sign in, and Daniel and Phikul test the Family branch.
7. **Thai roleplays:** each Tutor roleplay has Thai text first and English text second. The English text is a second option for the trainee, not a backup.
8. **Supporting media (Daniel, 2026-10-15):** 4 videos (Thai voice-over, about 1–2 minutes), 4 infographics (Thai first, with an English version), and 4 decks (Thai and English). PR makes them in advantage-pr after the text source set (Story S11).

## Stories

### Story S1: Roleplay scoring works in Thai and English
**As a** trainee
**I want** each recorded roleplay, in Thai or English, to get a correct score and feedback
**So that** I can practise and pass the roleplay lessons

**Acceptance Criteria:**
- Given a WebM recording from the browser, When the trainee submits it, Then the OpenRouter adapter sends it as `input_audio` with the format `webm` through the chat completions request format, and a model scores it.
- Given the main model (`google/gemini-3.8-flash`, reasoning effort `low`) fails, When the evaluator runs, Then it sends the same audio to the backup model (`qwen/qwen3.8-omni-flash`), and no speech-to-text step runs.
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
- Given Daniel changes Thai text in a source document (HUMAN GATE, Q-SE-08), When PR sends a new hash, Then the candidate pins the new hash.

**Source pin (PR, 2026-10-15):** advantage-pr `master` commit
`e6f7cc22e447bcaab73c1248af54cc8b590c9c3a`. I checked that each document exists at that commit,
with the version on its line 3:

| Document | Version |
|---|---|
| `09-sales-enablement/sales-training-scope-2027.md` | 1.0 |
| `09-sales-enablement/tutor-family-sales-playbook.md` (roleplays R1–R5) | 1.0 |
| `09-sales-enablement/line-trial-facilitator-script.md` | 1.4 |
| `09-sales-enablement/facilitator-recruitment-kit.md` (roleplays RR1–RR3) | 1.2 |
| `09-sales-enablement/demo-scripts.md`, `demo-scripts-checklist.md` | 2.0 |
| `09-sales-enablement/distributor-rep-onboarding/` README 1.3, faq 1.2, objection-handling-guide 1.2, rep-certification-checklist 1.2, role-play-scenarios 1.2, weekly-touchpoint-tracker 1.1 | — |
| `09-sales-enablement/distributor-launch-kit.md` (Thai 1.3) | 2.0 |
| `09-sales-enablement/roi-calculator.md` | 1.6 |
| `09-sales-enablement/battle-cards/vs-tutor.md` | 1.2 |
| `09-sales-enablement/advantage-suite-at-a-glance.md` | 1.2 |
| `04-services/pricing.md` | 1.7 |
| `02-brand/messaging-house.md` | 1.2 |
| `06-research-and-evidence/outcome-claims-policy.md` | 1.1 |
| `15-business-applications/sales-advantage.md` | 0.2 |

**Pin update (PR, 2026-10-15):** advantage-pr `c211d1cab9bce0457c1c7ecb2ae6d7445583a305` (source fixes from the claims review, `11a8072`, and the screen and parent deck fixes). Changed pinned documents: `demo-scripts.md` and `demo-scripts-checklist.md` 2.1 (leave-behind: the school sale deck), `distributor-rep-onboarding/faq.md` 1.3 (Q9, Q10), `distributor-rep-onboarding/objection-handling-guide.md` 1.3 (Objection 2). The other 16 documents did not change. The release candidate names `c211d1c` (commit after `048090037`).

**Pin update (PR, 2026-10-16, tone pass):** advantage-pr `7ed5a4ba2d27132ee0c343625bd41987641cc4e9` (after `919d1c1`). Changed pinned documents since `c211d1c`: `facilitator-recruitment-kit.md` 1.3 (the objection "I am not a teacher" removed; one label for the commission example; §9 "Good practice"), `line-trial-facilitator-script.md` 1.5 and `tutor-family-sales-playbook.md` 1.1 ("a small class with a local teacher" in place of "a tutor who follows the lesson plan"). The other 17 documents did not change. Daniel's rule (2026-10-16): the claims rule is a gate, not a theme; lessons teach the strong positive answer (`review/tone-pass-proposal.md`, PR result: accept with changes).

**PR notes for the seed (2026-10-15):**
1. The 3 school-sale roleplays (`role-play-scenarios.md`, English) have checklist criteria. The seed turns each into 3–5 weighted criteria plus the claims criterion; PR checks them in the claims review.
2. The lessons must not settle these open items: Q-SV-05 (pilot paid or free), Q-PR-24 (no date for Science, Math, Zhongwen Advantage), Q-SE-12 (no placement trial tool), Q-SE-13 (the Tutor app shows ฿2,500 and the landing statistics; never show them).
3. The interim placement method (the nearest printed book, without a trial tool) waits for Daniel's confirmation (Q-SE-12). Lessons teach it as "until the tool exists".
4. Recruitment: a baht figure is allowed only as a labelled formula example; a promise of income fails.

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
- Given the product lesson, When it describes the books, Then it shows the placement-to-book map (program and book level 1–4) and the print status of each book.
- Given a fact that expires (the PR scope doc lists them: the Primary cutover, target 2026-10-17/18, last date 2026-10-20; Primary Advantage Origins 3.2 and Quest 4 on sale in Tutor Advantage at about 2026-11-08; Reedy Preview in Primary Advantage only after the cutover passes), When a lesson states it, Then the content test names it, so that S10 can check it again.

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
- Given an earnings example, When it is in a lesson, Then it is the example that PR checked under Q-SV-16 (10 own students at 3,000 ฿ in one month = 30,000 ฿ GV = 55.6% = about 16,700 ฿), or another example that PR checks the same way.
- Given the commission lesson, When it explains the rules, Then it states that a tutor with recruits but no own students gets no payout, and that an unverified tutor gets no payout. It never uses the old step table (40/50/55/60/65%).
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
- Given the CONTRACTOR role has not shipped, When the Family branch is tested, Then Daniel and Phikul test it with their own accounts.

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
- Given the "facts that expire" list in the PR scope doc, When the seed goes to production, Then each fact is checked against advantage-pr on that day, and each changed fact is corrected first.
- Given the Family branch is released, When it is announced to tutors, Then one tutor account with the CONTRACTOR role can sign in and open the Family branch. Before that, only the founders, distributor reps, and staff use the release.

**Estimate:** M
**Priority:** Must

### Story S11: Lessons show supporting media
**As a** trainee
**I want** a theory lesson to show the training videos, infographics, and decks
**So that** I learn the sale from the same material that I show to parents, tutors, and schools

**Facts (checked 2026-10-15):** theory lessons render Markdown with `react-markdown` 10,
`remark-gfm`, and `skipHtml` (`apps/sales-advantage/components/lesson-content.tsx`). A rendering
check of sample Markdown gave these results:
- PNG: `![alt](url)` shows an image today.
- PDF: `[text](url)` shows a link today, and the browser opens the PDF.
- MP4: not possible today. `![alt](file.mp4)` gives a broken image, and `skipHtml` removes raw `<video>` HTML.
- The app has no `public/` folder. Roleplay and quiz lessons do not render lesson Markdown.
- The parent info deck needs no public home now: the tutor downloads the PDF and sends the file in LINE (PR, 2026-10-15; PR asks Daniel about a www page later).
- PR makes each file to these rules: MP4 (H.264 and AAC, 720p or 1080p, about 25 MB or less); infographic PNG (1200–1600 px wide, 2 MB or less); decks as PDF, plus `.pptx` for the trainer deck and the school sale deck; lower-case ASCII names with hyphens; one file for each language; with each file, its language, Thai and English alt text, and its lesson.

**Acceptance Criteria:**
- Given an infographic or a deck, When it is published for the course, Then it is in the Sales storage bucket under `training-media/v<n>/<th|en>/<file>`, not in the repo (the monorepo is public).
- Given lesson Markdown with a `media:` key (`![alt](media:training-media/v1/th/family-sale-steps-th.png)`), When a signed-in trainee opens the lesson, Then the server changes the key to a signed URL through the storage adapter (`getSignedUrl`, 1 hour).
- Given a training video, When a lesson shows it, Then the lesson has a Markdown link to its YouTube page that opens in a new tab (Daniel, 2026-10-16); no MP4 file and no video player.
- Given a `.png` file in image syntax, When the lesson renders, Then it shows the image with its alt text. Given a `.pdf` link, When the trainee clicks it, Then the PDF opens in a new tab.
- Given a `media:` key, When `seed:production-curriculum` runs, Then the seed stops if the object does not exist in the bucket.
- Given a changed media file, When it replaces an approved file, Then it gets a new version folder, so an approved lesson never shows changed content (no hashes).
- Given a Tutor Advantage screenshot, When a lesson uses it, Then it obeys the screenshot rules below, and PR has checked the screenshot → lesson list.

**Tutor Advantage screenshot set (PR, 2026-10-15):** advantage-pr
`assets/screenshots/tutor-advantage/dev-2026-10-15/` (commit `9d3a3df`; the folder README has the
use rules). 195 PNG: student-mobile 59, tutor-desktop 45, tutor-mobile 45, admin-desktop 23,
admin-mobile 23. Phone captures are 780 px wide and desktop captures are 1440 px wide; many are
full-page. A dev build, captured 2026-10-15 with seed data only, Thai UI, English lesson content.
It is a fact that expires (PR scope doc §8). Rules:

1. Never use admin screens (internal only).
2. Screens with ฿2,500 (the code default; the approved price is "from 3,000 ฿"): crop the price or skip the screen (student-mobile 05–09 and 11; check the tutor class screens).
3. student-mobile/01-landing: never show the stats strip ("32 เล่ม", "448 บท", "1,150+ ชั่วโมงเรียน") or the hero line ("15 ขั้นตอน … A1-C1").
4. Do not zoom on the A0–B1 class filter, or on "Reading Advantage Level 1" or "Reading Advantage 2" without the series name.
5. Never use student-mobile/31-live-p08-ai-feedback (the AI check failed), 58-study ("กำลังพัฒนา"), or a not-found or unauthorized screen.
6. tutor-desktop/11-earnings and tutor-mobile/11-earnings (42.50% at ฿5,000 GV, 3% withholding tax; they match the payout code): recruitment lessons only.
7. A dev screen does not prove that a feature is live. Reedy voice practice (student-mobile/17) is live; Read Along with Reedy is not.
8. No placement trial screen exists: the LINE placement trial is not in the Tutor Advantage code (PR script v1.4; PR raises an open question for Daniel). A lesson shows no app screen for the trial.
9. The school sale (S7) uses no Tutor screens. It uses the Primary Advantage set `assets/screenshots/primary-advantage/rpg-skin-2026-10-06/` (Phases 2–5 accepted for public use), only for features that ship with the cutover.

**Infographics (PR, 2026-10-15):** advantage-pr `c93ab4d`, `assets/sales-training/2027/infographics/`, 8 PNG (1440 px wide, 1435–1859 px high, 0.2–0.3 MB): `placement-to-book-map-{th,en}` (S4, S5), `commission-scale-{th,en}` (S6), `family-sale-steps-{th,en}` (S5), `school-tiers-and-pilot-{th,en}` (S7). Captions and target lessons: `assets/sales-training/2027/README.md`. Do not upload an item before Daniel accepts its Thai.

**Decks (PR, 2026-10-15):** advantage-pr `1c80cb5`, `assets/sales-training/2027/decks/`, 16:9, Kanit and Sarabun embedded in the PDFs: `school-sale-deck-{th,en}` (PDF + PPTX, 13 slides, S7; a leave-behind PDF for schools), `tutor-recruitment-deck-{th,en}` (PDF, 14 slides, S6; never to parents), `parent-info-deck-{th,en}` (PDF, 7 slides, S5; the tutor sends it in LINE), `trainer-deck-{th,en}` (PDF + PPTX, 18 slides; internal only, for all lessons). Facts that expire and the rebuild source: `assets/sales-training/2027/README.md` v0.2 and `assets/sales-training/2027/source/decks/`. Do not upload a deck before Daniel accepts its Thai.

**Media list complete (PR, 2026-10-15):** advantage-pr `1b5ceb5`, `assets/sales-training/2027/`, README v0.4 (captions, sizes, and facts that expire for each file). 12 items in TH and EN. Each item waits for Daniel's acceptance and his Thai check before the upload.
- Changed in `1b5ceb5`: `school-sale-deck` slide 6 shows only Pre-A1, A1, and A2 with the S7 line "CEFR-aligned: the active program covers Pre-A1 to A2" (before: "Pre-A1 (A0) to B2 in 15 levels"). If an S7 lesson shows an image of slide 6, take the image again. Slide 13: no one-pager in the leave-behind.
- Videos, `videos/` (MP4 1920×1080, H.264 and AAC, 5.6–9.2 MB, internal training): `family-sale-flow-{th,en}` (1:48, 2:04; S5), `commission-scale-{th,en}` (2:22, 3:01; S6), `school-sale-overview-{th,en}` (2:47, 3:19; S7), `one-catalogue-two-channels-{th,en}` (1:56, 2:33; S4). The first 6 are also public on YouTube (Daniel's playlist `PLVb-AbiIbmlA`, the same files); `one-catalogue-two-channels` is not on YouTube yet.
- Video facts that expire: "from 3,000 baht" (family); school prices and procurement February–April 2027 (school); base rate 0.5 (commission); "until May 2027 the focus is Tutor Advantage" (catalogue). The videos give no print date and no hours for each class package (Q-SE-14).
- **Decision (Daniel, 2026-10-16, through PR):** the lessons use the YouTube links for the videos: "use the YouTube links in the lessons, That's why I uploaded them." Links (advantage-pr `08fdc5f`, README v0.5):
  - S5 family sale: th https://www.youtube.com/watch?v=-hFxfRmQ3wM, en https://www.youtube.com/watch?v=lvc979ref6M
  - S6 tutor recruitment: th https://www.youtube.com/watch?v=-d2WBnLCVOk, en https://www.youtube.com/watch?v=54fsgdoxzs8
  - S7 school sale: th https://www.youtube.com/watch?v=PH5D9niLoUg, en https://www.youtube.com/watch?v=o5HDBZBge-w
  - Playlist: https://www.youtube.com/playlist?list=PLVb-AbiIbmlA
  - S4 `one-catalogue-two-channels`: no link (not uploaded). The S4 video slot stays empty until PR sends the link.
  - **Visibility (Daniel, 2026-10-16):** "I have made all the videos unlisted." A lesson link still plays an unlisted video.
  - Decks and infographics keep the bucket rule, and each item waits for Daniel's acceptance and his Thai check.
- **New videos (PR, 2026-10-16):** N8 `parent-conversation-close` (`163a412`), N11
  `future-tutor-questions` (`0a64331`), N5 `the-words-we-use` (`2dd9e42`), thumbnails for all 7 videos
  (`6f99841`, `2dd9e42`). A model answer in a video must pass its own roleplay. The script checks, the
  scorer checks, and the fixes are in `review/video-checks.md`. Each video gets a lesson link when PR
  sends its YouTube link.
- **Hours for each class package (Q-SE-14, open):** the PR videos give no hours, so N9 has no price part
  (R2) until Daniel decides Q-SE-14 (22 or about 25 hours). The lessons and the R2 "Value facts"
  criterion use "about 25 hours" and "about 120 baht per hour"; change them if Q-SE-14 gives 22.

PR's starting list (I draft the full list after the text source set; PR checks it):
- S4: student-mobile 04-dashboard, 18-lesson-lobby, 22-live-p02-flashcards, 24-live-p03-read-article, 17-voice-practice; tutor-desktop 16-lesson-hub, 22-live-p01-launch.
- S5: student-mobile 02-login, 03-consent-gate, 10-payment-age-check, 12-schedule, 17-voice-practice, 51-progress.
- S6: tutor-desktop 11-earnings, 12-network, 02-dashboard, 09-schedule-week.

**Estimate:** M
**Priority:** Should

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
- **Owner decision (2026-10-15): draft now, ship later.** The S2–S7 lesson, roleplay, rubric, and content-test work starts now, only on the `sales/training-2027` branch: no merge, no deploy, no database work, and no heavy job in the cutover window. The S8 and S11 code changes, the S9 regeneration, and the S10 release wait for the end of the freeze.
- **S11** app code starts when the feature freeze ends. The media references go into the seed when PR delivers the files. If the files are late, S10 releases without them, and a later seed adds them.

## Dependencies

- **CONTRACTOR company role** (tutor accounts): separate monorepo work, owned by the Monorepo session (agreed 2026-10-15). It starts after the Primary cutover (last date 2026-10-20). It must ship before the Family branch is announced to tutors (S10). This track does not close until one tutor signs in with that role, or until Daniel moves that check to the CONTRACTOR track.

## Work Split

- **PR session:**
  - The source set, one commit for each phase (scope and pricing, Tutor family sale, Tutor recruitment, school sale, close). PR sends the hash of the last text commit.
  - For each Tutor roleplay: the Thai text first and the English text second; the scenario; 3–5 success criteria with suggested weights; the claims criterion with passingScore 90.
  - The Q-SV-16 check (done 2026-10-15) and a claims review of the drafted lessons before Daniel approves.
  - The S11 media files (videos, infographics, decks), after the text source set.
- **This track (monorepo):** lesson drafts in the seed from the PR sources; rubric rows from the PR success criteria (3–5 criteria, weights sum to 1); app and scorer changes; tests; release.
- **Daniel:** checks all Thai; signs the approval record; does the manual checks.

### Claims criterion (each Tutor and school roleplay)

The claims criterion has passingScore 90. It fails the attempt on any one of these:

1. A guarantee or an outcome promise.
2. False urgency.
3. A promise of Read Along with Reedy.
4. A book that is not printed, or any level above book level 4.
5. GSE, Pearson, or YLE words.
6. A book name without the product name.
7. An earnings figure in a family sale (commission talk belongs to recruitment only).
8. A Managed Service sale, or a date for Science, Math, or Zhongwen Advantage.
9. "Leading", "best", "#1", or a percentage with no source.

## Out of Scope

- The CONTRACTOR company role and tutor account creation (see Dependencies; tutors cannot sign in until it ships).
- Making the media files (PR does this in advantage-pr). Media in roleplay and quiz lessons.
- Locale columns for lesson content (bilingual text goes in the same field, Thai first).
- The Sales chat empty-bubble defect (`measure/tech-debt.md`, 2026-09-22).
- Mastery runtime wiring and evidence projection (owned by `sales_mastery_consumer_20260810`).
- Sales training for Reading Advantage schools, CodeCamp, Storytime, STEM, and Managed Service.
- CRM, licensing, invoice, or commission data in Sales Advantage.
