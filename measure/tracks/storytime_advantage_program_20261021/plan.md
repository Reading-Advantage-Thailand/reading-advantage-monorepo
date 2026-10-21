# Implementation Plan: Storytime Advantage Program

> **Track ID:** `storytime_advantage_program_20261021`
> **Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md) · **Decisions:** [decisions.md](./decisions.md) · **Sources:** [sources.md](./sources.md)
> **MVP:** Option B (design §11): Levels 1 and 2 in print, songs and books by QR, benchmarks, training, one school. The app, Levels 3 and 4, and the catch-up module follow.
> **Milestones:** relative months until Daniel sets dates (S13 recommends authoring from March 2027). No public date.
> **Depends on:** Daniel's decisions S1 to S14; Workbooks for authoring and print; Forge for the Chibi Sprouts pack; the Science Phase 1 contract task for the program enum; the Primary read-along player for the QR page.
> **Rule:** tests first for backend code; contract before logic; one commit per task with `(track_id: storytime_advantage_program_20261021)`. Content tasks commit in the Workbooks repo and are marked here.

| Phase | Month | Scope |
|---|---|---|
| 0 Decisions and alignment | 0 to 1 | S1 to S14; peer requests; the phoneme audio test plan |
| 1 Phonics graph and package | 1 | Graph v0, lexicon, functions, package, level map |
| 2 Content model and tooling | 1 to 2 | Package shape, manual template, strip generator, decodable gate |
| 3 Level 2 week 1 | 2 | The first full week package; Daniel's check; the style is fixed once |
| 4 Forge brief and assets | 2 to 6 | Cast, places, gestures, cartridge art, scene set |
| 5 Level 2 authoring | 3 to 6 | Weeks 1 to 32, benchmarks, home cards, the QR page |
| 6 Level 1 authoring | 4 to 7 | Weeks 1 to 32, the listening kit |
| 7 Print, training, videos | 6 to 7 | Proofs, print order, training day 2, 14 routine videos |
| 8 First school | 8 | Anuban 2 and 3 start; eight fidelity weeks; benchmarks |
| 9 App MVP (post-MVP) | 9 to 12 | Contracts, evidence, items, cartridges, teacher views, hosting |
| 10 Levels 3 and 4, catch-up (post-MVP) | 13 to 18 | Authoring, the Primary catch-up module |

## Phase 0: Decisions and alignment — read-only

- [ ] Task: Daniel resolves S1 to S14 in `decisions.md`; record the answers and the dates.
- [ ] Task: Ask the Science track (through Monorepo) to add `storytime` to `programSchema` in its Phase 1 contract task; Tutor T6 gains `STORYTIME` through the PR spec addendum (S8).
- [ ] Task: Send Forge a heads-up: a Chibi Sprouts pack is coming in month 2 (cast at age 5, 28 places, 24 gestures, three cartridge sets, kindergarten scenes); no action yet.
- [ ] Task: Send Workbooks the `storytime-week` package shape request and the manual template request (design §6.6, §3.1); agree the four headings and the three variant lines.
- [ ] Task: After S12, ask PR to carry the hand-off sentence into the product files, the battle card, and the matrix; keep "planned, no date".
- [ ] Task: Write the phoneme audio test plan (44 sounds, two raters, pass mark 40) for month 2 (S5).
- [ ] Task: Confirm the Thai F1.1 Gr1 to Gr3 indicator wording against the OBEC original and file it with the standard node sources.

## Phase 1: Phonics graph and package

- [ ] Task: Node id patterns and metadata schema for `english.phonics.*` (design §5.1); the standard node `english.phonics.standard.storytime-v1` with its sources; tests.
- [ ] Task: Phonemic awareness taxonomy, 12 modules and 41 skills, including the Thai-contrast module (design §5.2); tests.
- [ ] Task: Letter, phoneme, GPC, pattern, and tricky-word nodes for all four levels (design §5.3); tests.
- [ ] Task: Edges: logical `prerequisite_for`, `supports` and `equivalent_to` to the GSE Young Learner nodes from the Graph list, `aligned_to_standard` to the standard node; the shared validation gate passes; tests.
- [ ] Task: Graph session review of graph v0; record the findings and fix.
- [ ] Task: Lexicon of about 2,000 words with grapheme parses, built by script from the Starters list, the Reading A-Z word lists, and the Jolly word bank, then hand-checked; tests on 50 parses.
- [ ] Task: `wordWall()` and `decodability()` pure functions with tests (design §5.6); the decodable gate at 0.90 and zero untaught words.
- [ ] Task: `packages/phonics-knowledge` from the `science-knowledge` pattern: domain adapter, objective key with `P`, `S`, `W` short ids; tests.
- [ ] Task: Level map `storytime/storytime-levels.csv` and `mastery-advantage/storytime/README.md` updated from the placeholder; tests.

## Phase 2: Content model and tooling

- [ ] Task: The 128-week sequence from `gen_sequence.py` as data in the Workbooks content plan for Storytime; a test that every week's element has its prerequisites in earlier weeks.
- [ ] Task: Workbooks package shape `storytime-week` and `meta.program = "storytime"` in `schema.ts` (Workbooks session); Zod contracts for the week package: scripts, strips, books, song, cards, check, home card, tags; tests.
- [ ] Task: Injector extension keyed by `(program, level, week)`, idempotent, rejects untagged rows and decodables that fail the gate; tests with a fixture week.
- [ ] Task: Teacher manual template for Storytime in the manual generator: the opening routine, the five scripts with four headings and the Easier, Harder, Group lines, the dated review strips; a build from the fixture week.
- [ ] Task: Review strip generator from the sequence and the expanding schedule (design §4), capped at 18 cards; tests.
- [ ] Task: Student book template: the weekly spread, the Friday check page, the book map, the perforated home card; a build from the fixture week.

## Phase 3: Level 2 week 1

- [ ] Task: Author Level 2 week 1 (element n; frame "Hello, I am ___."; Names and greetings): the five scripts, the decodable, the read-along, the song lyric and style brief, the choreography sheet, the strips, the check, the home card (Workbooks session).
- [ ] Task: Produce the week 1 song, video, and karaoke cut through the mmx pipelines; record the time and cost per song.
- [ ] Task: Run the phoneme audio test; decide S5; set up the phoneme bank.
- [ ] Task: Daniel's Thai check of week 1; the style decisions recorded as the Storytime production rules in Workbooks.
- [ ] Task: Import week 1; the gate passes; the teacher book and student book build.

## Phase 4: Forge brief and assets

- [ ] Task: Forge brief: the Chibi Sprouts cast at age 5 from the Chibi Quest cast, 28 places on one picture map, the 24 gesture poses, three cartridge art sets, the kindergarten scene set; the owner rule (Forge assets only, no weapons).
- [ ] Task: Receive and check the pack through the Forge sync runbook; captures for Daniel's look check.

## Phase 5: Level 2 authoring

- [ ] Task: Weeks 2 to 8 authored, produced, checked, and imported; the block-1 benchmark pack (letter-sound, phonemic awareness Form A).
- [ ] Task: Weeks 9 to 16; the mid-year benchmark pack (phonemic awareness Form B, nonsense words, high-frequency words, the speaking assessment script and rubric).
- [ ] Task: Weeks 17 to 24; the week-24 benchmark pack.
- [ ] Task: Weeks 25 to 32; the end-of-level profile pack; the reading record sheets and the placement probe.
- [ ] Task: The QR page: song and read-along of a week in the Primary read-along player without a login (Monorepo session); tests.
- [ ] Task: The parent report PDF template (Thai, one page) from benchmark and reading-record data; a build from fixture data.
- [ ] Task: Level 2 card kit files: sound and symbol cards, picture cards, letter cards, tricky-word cards, word-family cards, workmats, the classroom language card.

## Phase 6: Level 1 authoring

- [ ] Task: Weeks 1 to 16: the listening and phonemic awareness lessons, the letter songs, the read-alongs, the five Level 1 scripts per week; the week-8 and week-16 packs.
- [ ] Task: Weeks 17 to 32; the alphabet frieze; name-writing pages from week 20; the end-of-level pack.
- [ ] Task: Stop rule check at month 6: if Level 1 is not half authored, the MVP is Option A and Level 1 follows the first school.

## Phase 7: Print, training, videos

- [ ] Task: Print proofs of the Level 1 and Level 2 student books, teacher books, card kits, and the class sets of decodables and read-alongs; Daniel's approval; print order (Workbooks session).
- [ ] Task: Training day 2 for Storytime added to the 2-day training; the Storytime fidelity checklist on the observation forms (PR and Workbooks sessions).
- [ ] Task: The 14 routine videos with Thai voice-over (design §8).
- [ ] Task: Browser and print look check of every page type on a live review page.

## Phase 8: First school

- [ ] Task: First-school plan with PR: Anuban 2 and 3 start, the kit delivered, the teachers trained.
- [ ] Task: Eight weekly fidelity visits; the week-8 benchmarks recorded; the fix list.
- [ ] Task: Retro entry in `lessons-learned.md`; the MVP acceptance criteria checked.

## Phase 9: App MVP (post-MVP; needs the owner's go)

- [ ] Task: Contracts: `programSchema` has `storytime`; `objectiveSkillSchema`, `shortIdSchema`, `evidence-policy.ts`, and `record-evidence.ts` gain Phonics, Speaking, and Writing (the two files Monorepo named); tests.
- [ ] Task: Evidence policy `storytime-evidence.v1` as data on the Primary row shape (design §10.5); the durable job `storytime.mastery.evidence` on the Primary job pattern; tests with the in-memory adapter.
- [ ] Task: Three item types (hear-and-tap, blend-and-tap, tap-the-tricky-word) with the phoneme bank; sound-first interface rules; QR login; tests.
- [ ] Task: Three cartridges with the `grapheme` input mode (Sound Garden, Word Builder, Tricky Trail) in `packages/game-cartridges`; reward pieces; tests.
- [ ] Task: Chibi Sprouts shell: the map, stars and seeds, the pet, the class garden, the grow-up badge at hand-off; the Forge pack wired; tests.
- [ ] Task: Teacher views: class grid per week, the Friday hot list, reading-record and benchmark entry, the parent report; tests.
- [ ] Task: FSRS deck per child over sounds and tricky words; the hot list printed on the strips; tests.
- [ ] Task: Hosting under the storytime hostname with amber brand tokens; tenant registry; smoke test.

## Phase 10: Levels 3 and 4, and the catch-up module (post-MVP)

- [ ] Task: Level 3 weeks 1 to 32 with the five Thai-specific weeks and the Level 3 benchmark packs.
- [ ] Task: Level 4 weeks 1 to 32 with the eleven exit-profile weeks, the bridge weeks on an Origins 1 text, and the end-of-program profile.
- [ ] Task: The Primary catch-up module: 16 compressed scripts, the teacher booklet, placement by the probe, hosted in Primary with the `phonics-catch-up` tag (design §7.8); tests.
- [ ] Task: Print Levels 3 and 4; retro entry.

## Daniel's review load

| Item | Per level | MVP (Levels 1 and 2) |
|---|---|---|
| Thai in the teacher book and home cards | about 10 h | 20 h |
| Benchmark and song checks | about 5 h | 10 h |
| Decisions, captures, the print proof | — | about 5 h |
| **Total** | | **about 35 h over months 1 to 7, under 2 h a week** |

## Task count

Estimated top-level tasks: 58.
