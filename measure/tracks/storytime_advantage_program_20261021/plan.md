# Implementation Plan: Storytime Advantage Program

> **Track ID:** `storytime_advantage_program_20261021`
> **Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md) · **Decisions:** [decisions.md](./decisions.md) · **Sources:** [sources.md](./sources.md) · **Forge brief:** [forge-brief.md](./forge-brief.md) · **QR page:** [qr-page-spec.md](./qr-page-spec.md)
> **Release 1 (Daniel, S13 and S17, 2026-10-22):** 2026-12-01. Level 2 (Anuban 3) weeks 1 to 8 complete in print and by QR, plus the sales pack. CEO Phikul made Storytime the next sales priority. No public date on www.
> **After release 1:** Level 2 complete by 2027-02-15; Level 1 complete by 2027-04-15; printed before the May 2027 term; the app, Levels 3 and 4, and the catch-up module follow.
> **Depends on:** Workbooks (package v1, authoring, print); Forge (the Chibi Sprouts release-1 pack by 2026-11-15); Monorepo (the QR page by 2026-11-20); PR (the sales pack); Daniel (Thai checks within two working days; the music key; the print proof).
> **Rule:** tests first for backend code; contract before logic; one commit per task with `(track_id: storytime_advantage_program_20261021)`. Content tasks commit in the Workbooks repo and are marked here. Tell Monorepo before each commit to the integration branch.

| Phase | Dates | Scope |
|---|---|---|
| 0 Decisions and alignment | 2026-10-21 to 2026-10-29 | S1 to S19 answered; peers briefed; music source; phoneme test plan |
| 1 Phonics graph and package | 2026-10-22 to 2026-11-07 | Graph v0, lexicon, decodability, package, level map; Graph review |
| 2 Content model and tooling | 2026-10-22 to 2026-11-05 | Package v1, manual template, strips, student book template |
| 3 Level 2 week 1 | 2026-10-23 to 2026-10-31 | The first full week; Daniel's check; the style fixed once |
| 4 Forge release-1 pack | 2026-10-22 to 2026-11-15 | Age-5 base, cast of 5, 24 poses, 8 scenes, props |
| 5 Level 2 weeks 2 to 8 | 2026-10-29 to 2026-11-22 | Authoring, songs and videos, benchmark 1, card kit, home cards, the QR page |
| 6 Print, sales pack, release | 2026-11-21 to 2026-12-01 | Proofs, print order, sales pack, release 1 |
| 7 Level 2 weeks 9 to 32 | 2026-12-01 to 2027-02-15 | Authoring, benchmarks, Level 2 print |
| 8 Level 1 | 2027-01-11 to 2027-04-15 | The listening kit, 32 weeks, Level 1 print |
| 9 Training and first school | 2027-03-01 to 2027-07-09 | Training day 2, 14 videos, first school from May 2027, eight fidelity weeks |
| 10 App MVP (post-release; owner's go) | after 2027-04 | Contracts, evidence, items, cartridges, teacher views, hosting |
| 11 Levels 3 and 4, catch-up | 2027-05 onward | Authoring, the Primary catch-up module |

Stop rule for release 1: if Daniel has not approved week 1 by 2026-11-05, release 1 ships weeks 1 to 4 in print on 2026-12-01 and weeks 5 to 8 in January 2027. If no music source passes Daniel's rating by 2026-11-07, release 1 songs ship as lyric sheets with karaoke video over the spoken-word track (mmx speech) and sung versions follow.

## Phase 0: Decisions and alignment

- [x] Task: Daniel resolves S1 to S14 — answered on the live approval page 2026-10-22 04:25; recorded in `decisions.md` (80df85c9a). S13 changed to the 2026-12-01 release.
- [x] Task: Daniel resolves S15 to S19 (band names, music source, release scope, Forge priority, covers) — approved 2026-10-22 04:38.
- [x] Task: Peers briefed: PR (S12 edits, sales pack), Monorepo (QR page, `storytime` enum in its own change), Graph (review in November), Workbooks (package v1, week 1), Forge (brief v1, d70d52718).
- [x] Task: Forge brief v1 with the cast of 5, 24 named gestures, scenes and props for weeks 1 to 8, output formats (PNG sequences 1024 px, 12 fps, 24-frame loops, straight alpha), Workbooks edits the videos.
- [x] Task: QR page spec draft for Monorepo (`qr-page-spec.md`); Monorepo reviews.
- [~] Task: Music source (S16, S20): MiniMax-Music3 Space test rated "really good" by Daniel 2026-10-22; Lyria 3 Pro works through Vertex AI (global location) from Thailand, one 78 s song on the page (G1); the Gemini API path is location-blocked; rented-GPU batch estimate USD 25 to 46 for the program. Choice recorded when Daniel answers S20 and G1.
- [~] Task: Phoneme audio test (S5): mmx speech run 2026-10-22, Daniel rejected 44 of 45; Google Cloud TTS IPA set on the page for rating; the human bank decision is S22.
- [ ] Task: Confirm the Thai F1.1 Gr1 to Gr3 indicator wording against the OBEC original and file it with the standard node sources.

## Phase 1: Phonics graph and package (2026-10-22 to 2026-11-07)

- [x] Task (v1 2026-10-22, Graph passed): Node id patterns and metadata schema for `english.phonics.*` (design §5.1); the standard node `english.phonics.standard.storytime-v1` with its sources; tests.
- [x] Task (v1): Phonemic awareness taxonomy, 12 modules and 45 skills, including the Thai-contrast module (design §5.2); tests.
- [x] Task (v1): Letter, phoneme, GPC, pattern, and tricky-word nodes for all four levels (design §5.3); tests.
- [x] Task (v1, 0 errors alone and merged): Edges: logical `prerequisite_for`, `supports` and `equivalent_to` to the GSE Young Learner nodes from the Graph list, `aligned_to_standard` to the standard node; the shared validation gate passes; tests. Target: v0 by 2026-11-03.
- [x] Task: Graph session review: v0 reviewed and v1 re-checked 2026-10-22, items 1, 2, 4, 5, 6, 7, 9 pass; commit waits for S21 (Reading A-Z numbers in the public repo).
- [ ] Task: Lexicon of about 2,000 words with grapheme parses, built by script from the Starters list, the Reading A-Z word lists, and the Jolly word bank, then hand-checked; tests on 50 parses. Level 2 subset first, by 2026-10-28, for the week 1 gate.
- [ ] Task: `wordWall()` and `decodability()` pure functions with tests (design §5.6); the decodable gate at 0.90 and zero untaught words; by 2026-10-28.
- [ ] Task: `packages/phonics-knowledge` from the `science-knowledge` pattern: domain adapter, objective key with `P`, `S`, `W` short ids; tests.
- [x] Task (v1, written by the build): Level map `storytime/storytime-levels.csv` with the band names Seed, Sprout, Leaf, Bud, Flower (S15) and `mastery-advantage/storytime/README.md` updated from the placeholder; tests.

## Phase 2: Content model and tooling (2026-10-22 to 2026-11-05)

- [x] Task: Workbooks package `storytime-week` v1 in `dashboard/lib/storytime/` (Workbooks master 6fe46cc, 2026-10-22) (schema.ts, checks.ts, manual.ts, i18n.ts), `meta.program = "storytime"`, injector key `(program, level, week)`, files `content/storytime/l<level>/w<nn>.json`, URL key `st<level>/<week>` (Workbooks session, started 2026-10-22); the checks list from design §3 and §6.
- [ ] Task: The 128-week sequence from `gen_sequence.py` as data in the Workbooks content plan; a test that every week's element has its prerequisites in earlier weeks.
- [ ] Task: Teacher manual compiler for Storytime on the Primary print wrapper: the week header page, one day per page, the opening routine, the strip of the day, the moved steps, the four headings and the three variant lines; Storytime labels in their own i18n file; Daniel checks the Thai labels.
- [ ] Task: Review strip generator from the sequence and the expanding schedule (design §4), capped at 18 cards; tests.
- [ ] Task: Student book template: the weekly spread, the Friday check page, the book map, the perforated home card; a build from the week 1 package.
- [ ] Task: Song video compositor in Workbooks (ffmpeg overlay or Remotion): reads the lines, the line and word times, one picture per line, the Sprout gesture sequences on the scene background; the karaoke cut with word highlighting; a build from week 1.

## Phase 3: Level 2 week 1 (2026-10-23 to 2026-10-31)

- [~] Task: Author Level 2 week 1 (element n; frame "Hello, I am ___."; Names and greetings): the five scripts, the decodable, the read-along, the song lyric with a gesture and a picture per line, the strips, the check, the home card (Workbooks session) — draft delivered 2026-10-22 (Workbooks 4ad4b32, w01.json, EN and TH teacher book drafts); Storytime review in progress; Thai pass next.
- [ ] Task: Storytime review of week 1 against the graph and the decodability gate; the cut list of props to Forge.
- [ ] Task: Week 1 pictures, book audio at 0.75 and 1.0 with word times, and the song audio from the chosen source; record the time and cost per week.
- [ ] Task: Daniel's Thai check of week 1 by 2026-10-31; the style decisions recorded as the Storytime production rules in Workbooks.
- [ ] Task: Import week 1; the checks pass; the teacher book and student book build; captures on a live review page.

## Phase 4: Forge release-1 pack (2026-10-22 to 2026-11-15)

- [~] Task: Forge track for Chibi Sprouts release 1 on brief v1 (Forge session; started after S18): the age-5 base, the cast of 5 (sprout-adventurer, sprout-wizard, sprout-druid, sprout-knight, sprout-pip), the 24 gesture loops plus idle, Pip's six clips, 8 scene backgrounds, the 15 new and 19 reused props.
- [ ] Task: Receive and check the pack through the Forge sync runbook (Monorepo runs the sync); delivery notes carry the baseline row and centre column as numbers; captures for Daniel's look check.

## Phase 5: Level 2 weeks 2 to 8 (2026-10-29 to 2026-11-22)

- [ ] Task: Weeks 2 to 4 authored, reviewed, checked by Daniel, and imported by 2026-11-08.
- [ ] Task: Weeks 5 to 7 authored, reviewed, checked by Daniel, and imported by 2026-11-15.
- [ ] Task: Week 8 review week: the medley, the re-reads, the reading record sheets, benchmark 1 (letter-sound and phonemic awareness Form A) with script, forms, and pass marks; by 2026-11-18.
- [ ] Task: The 8 song videos and karaoke cuts composited from the Forge pack; Daniel's look check; by 2026-11-22.
- [ ] Task: The QR page `/st<level>/<week>` in Primary without a login, with `storytime` in `programSchema` in the same change (Monorepo session, `qr-page-spec.md`); tests; by 2026-11-20.
- [ ] Task: The weeks 1 to 8 card kit files: sound and symbol cards, picture cards, letter cards, tricky-word cards, workmats, the classroom language card; the class reader sets with the Seed and Sprout band labels.
- [ ] Task: The home cards for weeks 1 to 8 with the QR codes to the live page; the parent line in Thai checked.

## Phase 6: Print, sales pack, release (2026-11-21 to 2026-12-01)

- [ ] Task: Print proofs of the Level 2 unit 1 student book, teacher book, card kit, and class sets; Daniel's approval by 2026-11-24; print order by 2026-11-25 (Workbooks session).
- [ ] Task: Sales pack with PR: battle card, sample pages, the week 1 song video as the demo video, the hand-off statement (S12); by 2026-11-28.
- [ ] Task: Browser and print look check of every page type on a live review page.
- [ ] Task: Release 1 on 2026-12-01: the printed unit in hand or at the printer with the date confirmed, the QR page live, the sales pack sent; retro entry in `lessons-learned.md`.

## Phase 7: Level 2 weeks 9 to 32 (2026-12-01 to 2027-02-15)

- [ ] Task: Weeks 9 to 16; the mid-year benchmark pack (phonemic awareness Form B, nonsense words, high-frequency words, the speaking assessment script and rubric).
- [ ] Task: Weeks 17 to 24; the week-24 benchmark pack.
- [ ] Task: Weeks 25 to 32; the end-of-level profile pack; the placement probe.
- [ ] Task: The parent report PDF template (Thai, one page) from benchmark and reading-record data.
- [ ] Task: Level 2 full print proof and print order for the May 2027 term.

## Phase 8: Level 1 (2027-01-11 to 2027-04-15)

- [ ] Task: Weeks 1 to 16: the listening and phonemic awareness lessons, the letter songs, the read-alongs, the five Level 1 scripts per week; the week-8 and week-16 packs.
- [ ] Task: Weeks 17 to 32; the alphabet frieze; name-writing pages from week 20; the end-of-level pack.
- [ ] Task: Level 1 print proof and print order for the May 2027 term.

## Phase 9: Training and first school (2027-03-01 to 2027-07-09)

- [ ] Task: Training day 2 for Storytime added to the 2-day training; the Storytime fidelity checklist on the observation forms (PR and Workbooks sessions).
- [ ] Task: The 14 routine videos with Thai voice-over (design §8).
- [ ] Task: First-school plan with PR: Anuban 2 and 3 start in May 2027, the kit delivered, the teachers trained.
- [ ] Task: Eight weekly fidelity visits; the week-8 benchmarks recorded; the fix list; retro entry; the MVP acceptance criteria checked.

## Phase 10: App MVP (post-release; needs the owner's go)

- [ ] Task: Contracts: `objectiveSkillSchema`, `shortIdSchema`, `evidence-policy.ts`, and `record-evidence.ts` gain Phonics, Speaking, and Writing (the two files Monorepo named); tests.
- [ ] Task: Evidence policy `storytime-evidence.v1` as data on the Primary row shape (design §10.5); the durable job `storytime.mastery.evidence` on the Primary job pattern; tests with the in-memory adapter.
- [ ] Task: Three item types (hear-and-tap, blend-and-tap, tap-the-tricky-word) with the phoneme bank; sound-first interface rules; QR login; tests.
- [ ] Task: Three cartridges with the `grapheme` input mode (Sound Garden, Word Builder, Tricky Trail) in `packages/game-cartridges`; reward pieces; tests.
- [ ] Task: Chibi Sprouts shell: the map, stars and seeds, the pet, the class garden, the grow-up badge at hand-off; the full cast (Cleric, Archer, Rogue) and the 28 places from Forge; tests.
- [ ] Task: Teacher views: class grid per week, the Friday hot list, reading-record and benchmark entry, the parent report; tests.
- [ ] Task: FSRS deck per child over sounds and tricky words; the hot list printed on the strips; tests.
- [ ] Task: Hosting under the storytime hostname with amber brand tokens; tenant registry; smoke test.

## Phase 11: Levels 3 and 4, and the catch-up module (2027-05 onward)

- [ ] Task: Level 3 weeks 1 to 32 with the five Thai-specific weeks and the Level 3 benchmark packs.
- [ ] Task: Level 4 weeks 1 to 32 with the eleven exit-profile weeks, the bridge weeks on an Origins 1 text, and the end-of-program profile.
- [ ] Task: The Primary catch-up module: 16 compressed scripts, the teacher booklet, placement by the probe, hosted in Primary with the `phonics-catch-up` tag (design §7.8); tests.
- [ ] Task: Print Levels 3 and 4; retro entry.

## Daniel's review load to release 1

| Item | Hours | When |
|---|---|---|
| Week 1 Thai check and style decisions | 3 | by 2026-10-31 |
| Weeks 2 to 8 Thai checks (about 1.5 h a week) | 11 | 2026-11-01 to 2026-11-18 |
| Music test rating, phoneme audio rating | 2 | by 2026-10-29 |
| Forge look check, song video look check | 2 | 2026-11-10 to 2026-11-22 |
| Print proof | 3 | by 2026-11-24 |
| **Total** | **about 21 h over six weeks** | |

## Task count

Estimated top-level tasks: 68.
