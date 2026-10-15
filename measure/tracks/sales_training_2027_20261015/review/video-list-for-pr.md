# Training video list for PR

**Status:** Draft v2 for Daniel and PR, 2026-10-16 (PR corrections: the N7 gate, the N5 fact,
the voices). Nothing on this list is ordered until Daniel
approves it.
**Lessons:** `apps/sales-advantage/scripts/static-seed.ts` at `048090037` (7 modules, 44 lessons,
19 roleplay scenarios).
**Rules that apply to every video:** spec.md S11 (screenshot rules 1–9), the claims list (spec.md,
"Claims criterion"), and the PR media README v0.5 (format, voices, YouTube links).

## 1. Videos that exist (T6.3, advantage-pr `1b5ceb5`)

| ID | File | Lesson | YouTube | Open item |
|---|---|---|---|---|
| V1 | `one-catalogue-two-channels-{th,en}` (1:56, 2:33) | M4.1 One Catalogue, Two Channels | — | Daniel uploads it; PR sends the link |
| V2 | `family-sale-flow-{th,en}` (1:48, 2:04) | M5.1 What the Parent Buys and the Five-Step Family Sale | th, en | — |
| V3 | `commission-scale-{th,en}` (2:22, 3:01) | M6.2 The Commission Scale | th, en | — |
| V4 | `school-sale-overview-{th,en}` (2:47, 3:19) | M7.1 The 2027 School Sale | th, en | — |

The 2027 course needs only V1 from PR now: its YouTube link.

## 2. New videos (proposal)

**Formats** (all from PR's `source/videos/make.py`: frames, mmx voice, jingle):
- **Explainer:** slides and one voice.
- **Model conversation:** two voices (seller and buyer) with the spoken lines on screen. It shows
  a strong answer before the trainee records the roleplay. The lines must pass the claims
  criterion.
- **App tour:** screenshots from the PR sets with the S11 crops, and one voice.

**Priority:** Must = the course has a known gap without it; Should = clear value; Could = optional.
Each video is in Thai and English (Thai first for the Family branch), 1–3 minutes.

### Before the course

| ID | Title | Lessons | Format | Priority | Gate |
|---|---|---|---|---|---|
| N1 | How a roleplay is scored | M1.4 (first roleplay); link from each roleplay | App tour (Sales Advantage recorder: mic check, consent line, submit, criteria, claims criterion, retry) | Should | After the S1 deploy: the screens must show the new scorer. Sales Advantage screens do not exist in PR yet |

### Core: M1–M4 (all trainees)

| ID | Title | Lessons | Format | Priority | Gate |
|---|---|---|---|---|---|
| N2 | Discovery, not a pitch | M1.1–M1.3, M1.4 roleplay | Model conversation: the same parent chat two times, first as a pitch, then with SPIN questions, a mirror, a label, and silence | Should | — |
| N3 | Value without a promise | M2.1, M2.2 | Explainer: feature → benefit → outcome, with the approved evidence forms and no outcome promise | Could | — |
| N4 | The objection pattern | M3.1, M3.2, M3.3 roleplay | Model conversation: "We tried something like this and it failed" with the isolation question, the reverse, and the three questions; then "change the start, not the price" | Should | — |
| N5 | Honest claims: say this, not that | M4.2, every roleplay | Explainer: the 9 claims items, each with a "do not say" line and the approved line (for example "Origins 2" → "Primary Advantage Origins 2"; "AI tutor" → "a local tutor teaches"; "Science opens in January" → "a coming program with no date") | **Must** | — |
| N6 | The Tutor Advantage app for a family | M4.1, M5.1 | App tour: student-mobile 02, 03, 04, 18, 22, 24, 17 (crop rows 0–1211), 12 (the S4 and S5 rows of `screenshot-lesson-list.md`) | Should | Dev-build screens: a fact that expires. Say that Read Along with Reedy is not available |

### Family branch: M5–M6 (tutors)

| ID | Title | Lessons | Format | Priority | Gate |
|---|---|---|---|---|---|
| N7 | The placement trial with the printed books | M5.2 | Explainer: setup (2 minutes), the 10-minute reading, the result (program and book level), with the `placement-to-book-map` infographic. No app screen (rule 8) | **Must** | Q-SE-12 (1): Daniel confirms the interim printed-book method |
| N8 | The parent conversation and the close | M5.3, R1 | Model conversation in Thai: discovery, the class in two sentences, then the three close steps after the trial (result 30 s, book 1 min, bridge to the class package 1 min) | **Must** | — |
| N9 | Parent objections and the next book | M5.3, M5.4, R2, R3, R4, R5 | Model conversation, 4 short parts: "too expensive" (no discount), "already at a tutor school" (respect), "which book next?" (no date), "can you guarantee?" (no promise) | Should | — |
| N10 | A week as a Tutor Advantage tutor | M6.1 | App tour: tutor-mobile 02, 19 (crop rows 0–1470), 22 (crop rows 0–1450), 09 (the S6 rows of `screenshot-lesson-list.md`); what is ready and what is not; how a new tutor starts | Should | Dev-build screens: a fact that expires |
| N11 | Recruitment questions without an income promise | M6.3, RR1, RR2, RR3 | Model conversation: "Is this a pyramid scheme?", "How much will I earn?" (a formula example, labeled), "I am not a teacher"; the compliance notes | **Must** | — |

### School branch: M7 (school sellers)

| ID | Title | Lessons | Format | Priority | Gate |
|---|---|---|---|---|---|
| N12 | The 15-minute Primary Advantage demo | M7.2, the 15-minute discovery call and 30-minute demo roleplays | App tour: the Primary Advantage screens (`rpg-skin-2026-10-06`) of features that are live in production | **Must** for the School branch | After the Primary cutover, and only for features that are live that day (rule 9) |
| N13 | Blended Learning in a Thai classroom | M7.1 | Explainer: how a Thai teacher runs the lesson with the program; the Big 4 classroom-fidelity protocol | Should | After the Primary cutover |
| N14 | The 8 school objections | M7.3 | Explainer with each objection and its approved answer | Should | — |
| N15 | The Total-Cost-of-English frame | M7.4, the price-conversation close roleplay | Model conversation with a director: the frame with App-Only ~1,000 ฿ and Blended Learning ~1,500 ฿ for each student each year | Should | Prices are facts that expire |
| N16 | The end-of-semester review | M7.5 | Explainer: the pilot data, the proposal, the timing as a fact | Could | Needs real pilot data, or a labeled example |

## 3. Summary

- **Must (5 videos):** N5, N7 (after Q-SE-12), N8, N11, and N12 (after the cutover); also the V1
  YouTube link.
- **Should (9):** N1, N2, N4, N6, N9, N10, N13, N14, N15.
- **Could (2):** N3, N16.
- 16 new videos in all. Without the 4 gated videos (N1, N7, N12, N13): 12 videos, 24 files (TH
  and EN).

## 4. Questions for Daniel

1. Which of the new videos do you approve (all, Must only, or a list)?
2. YouTube visibility: the six uploads are public. N8–N11 teach internal sales and recruitment
   answers. Public, or unlisted? Fact for N5: it shows the "do not say" lines on screen, with
   "Pearson", "GSE", and "YLE". AGENTS.md: these names never appear in external material, and a
   public video is external material.

Voices (PR voice standard, not a question): Thai seller `Thai_Optimistic_girl`, Thai buyer
`Thai_female_1_sample1`; PR picks the English buyer voice from mmx.
