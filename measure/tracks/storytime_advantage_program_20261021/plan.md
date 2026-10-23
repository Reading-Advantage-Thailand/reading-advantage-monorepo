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
- [x] Task: Music source (S16): Lyria 3 Pro through Vertex AI (global location), USD 0.08 a song, three candidates a slot; Daniel chose week 1 candidate 1 (backup 3) on 2026-10-22; karaoke by vocal separation. The MiniMax GPU batch (S20) is optional.
- [x] Task: Phoneme audio (S5, S22): mmx speech and Google Cloud TTS IPA rejected (2026-10-22); Daniel recorded the 45 sounds in Audacity (no noise removal; /b/, /f/, /th/ re-recorded); Storytime cut and normalised them (peak -3 dBFS, 5 ms fades, 44.1 kHz mono); Daniel approved all 45 on 2026-10-22 20:37. Bank = storytime-approval/phonemes/daniel/ (wav + mp3 + manifest.json); in Workbooks 9478e1f (content/storytime/phonemes/daniel/; package fields focus.element.audio, review sound card audio, opening.audio per sound game day, benchmark.oneToOne.soundAudio and blend[].audio; label rule in dashboard/lib/storytime/phonemes.ts; gate check phoneme-audio, 124 fields in weeks 1 to 8, 0 failed).
- [ ] Task: Confirm the Thai F1.1 Gr1 to Gr3 indicator wording against the OBEC original and file it with the standard node sources.

## Phase 1: Phonics graph and package (2026-10-22 to 2026-11-07)

- [x] Task (v1 2026-10-22, Graph passed): Node id patterns and metadata schema for `english.phonics.*` (design §5.1); the standard node `english.phonics.standard.storytime-v1` with its sources; tests.
- [x] Task (v1): Phonemic awareness taxonomy, 12 modules and 45 skills, including the Thai-contrast module (design §5.2); tests.
- [x] Task (v1): Letter, phoneme, GPC, pattern, and tricky-word nodes for all four levels (design §5.3); tests.
- [x] Task (v1, 0 errors alone and merged): Edges: logical `prerequisite_for`, `supports` and `equivalent_to` to the GSE Young Learner nodes from the Graph list, `aligned_to_standard` to the standard node; the shared validation gate passes; tests. Target: v0 by 2026-11-03.
- [x] Task: Graph session review: v0 reviewed and v1 re-checked 2026-10-22, items 1, 2, 4, 5, 6, 7, 9 pass; S21 approved 2026-10-22 (Reading A-Z numbers and citations stripped, order kept); committed mastery-advantage ceb728d; Graph checks the commit before the push.
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

- [x] Task: Author Level 2 week 1 (element n; frame "Hello, I am ___."; Names and greetings): the five scripts, the decodable, the read-along, the song lyric with a gesture and a picture per line, the strips, the check, the home card (Workbooks session) — delivered 2026-10-22 (Workbooks bb641c8 + 66abc7f, w01.json, EN and TH teacher book drafts with Thai proofread).
- [~] Task: Storytime review of week 1 against the graph and the decodability gate — 21 findings applied 2026-10-22 (Workbooks 539298a); Pip and the week 1 gesture list sent to Forge; the prop cut list after the lyric sheets of weeks 2 to 8.
- [~] Task: Week 1 pictures, book audio at 0.75 and 1.0 with word times, and the song audio from the chosen source; record the time and cost per week — song audio done 2026-10-22 (Lyria candidate 1, 78 s, USD 0.28 for three candidates; 15 line times by faster-whisper); karaoke cut, pictures, and book audio open.
- [x] Task: Daniel's Thai check of week 1 by 2026-10-31 — passed 2026-10-22 (23 pages, section I, no corrections); the style decisions are the Storytime production rules in Workbooks.
- [ ] Task: Import week 1; the checks pass; the teacher book and student book build; captures on a live review page.

## Phase 4: Forge release-1 pack (2026-10-22 to 2026-11-15)

- [~] Task: Forge track for Chibi Sprouts release 1 on brief v1 (Forge session; started after S18): the age-5 base, the cast of 5 (sprout-adventurer, sprout-wizard, sprout-druid, sprout-knight, sprout-pip), the 24 gesture loops plus idle, Pip's six clips, 8 scene backgrounds, the 15 new and 19 reused props.
- [x] Task: Week 1 render set first (Forge, 2026-10-22, recorded in Forge f9879c55): folder out/chibi-sprouts/r1/week1/; order = age-5 base and soft-edge render option, Pip, Nan, Pat, May, Sam, Mia, Ben, the Adventurer with 6 gestures and idle, the classroom and the rug, then the manifest with the foot point. Delivered 2026-10-23 (chibi-sprouts, 6 days early): manifest.json, 8 cast (front, three-quarter), 10 Adventurer gesture frames, classroom 1920x1080, rug; 1024x1200 canvas, 1080 px/m, foot point (512, 1184). Daniel passed the render look check F1 to F4 on 2026-10-23 04:51 (base and cast style approved). Test video with the Forge art: Workbooks 7213f4e (2026-10-23; song.mp4 85.4 s, song-phone.mp4, song-poster.jpg; one scale, Pip alone 236 px); Daniel 2026-10-23 04:55: F5 pass on the method but the static cut-outs do not engage and do not read as on the rug (F7); F8 fail, phone cut becomes portrait. S27 (animation model) open; weeks 2 to 7 and the read-along plan wait for S27.
- [ ] Task: Daniel answers S26 (cast of 13 against the S18 cap of 8) after the week 1 look check; Forge risks: the adults and Tom (other proportions) and the 30 props unless many reuse Forge assets.
- [ ] Task: Receive and check the pack through the Forge sync runbook (Monorepo runs the sync); delivery notes carry the baseline row and centre column as numbers; captures for Daniel's look check.

## Phase 5: Level 2 weeks 2 to 8 (2026-10-29 to 2026-11-22)

- [~] Task: Weeks 2 to 4 authored, reviewed, checked by Daniel, and imported by 2026-11-08 — authored with Thai and reviewed 2026-10-22 (Workbooks 3c8d3d7, da2f054, 80885fd; design [W2], [W4]); Daniel's Thai check passed 2026-10-22 (sections J, K, L, no corrections); the import open.
- [~] Task: Weeks 5 to 7 authored, reviewed, checked by Daniel, and imported by 2026-11-15 — authored with Thai and reviewed 2026-10-22 (Workbooks 76df7d8, a7e2c44, dd8f10a; design [W6]); Daniel's Thai check passed 2026-10-22 (sections M, N, O, no corrections); the import open.
- [~] Task: Week 8 review week: the medley, the re-reads, the reading record sheets, benchmark 1 (letter-sound and phonemic awareness Form A) with script, forms, and pass marks; by 2026-11-18 — design 3.5 [W8] written 2026-10-22; Workbooks review-week code fa42433, d86987f; content with Thai bc95eaa, reviewed; Daniel's Thai check passed 2026-10-22 (section P, no corrections); the import open.
- [ ] Task: The 8 song videos and karaoke cuts composited from the Forge pack; Daniel's look check; by 2026-11-22.
- [ ] Task: The QR page `/st<level>/<week>` in Primary without a login, with `storytime` in `programSchema` in the same change (Monorepo session, `qr-page-spec.md`); tests; by 2026-11-20. Monorepo 2026-10-23: the Primary deploy that this waited for is live (06:15, revision 00134-yoj, master 9c4c5ea45); an in-app help track runs first, then the QR page on its own branch from master; the storytime.reading-advantage.com domain mapping goes with it.
  Subtasks (Monorepo 2026-10-23, branch `primary/storytime-qr` in `~/Desktop/rama-worktrees/storytime-qr`):
  - [ ] Q1 `programSchema` in `packages/types` (primary, reading, science, math, zhongwen, storytime); test.
  - [ ] Q2 `lib/storytime/`: a Zod subset of the Workbooks `storytime-week` v1 contract (`dashboard/lib/storytime/schema.ts`: meta, books, song, home), the week index of the copied JSON files, the published check (one book of each kind), and the `?part=` check; tests. The app follows the Workbooks contract where the spec section 8 names differ: one audio file per book with `audio.sentences` (not audio per page), `home.line` and `home.activity` as `{ en, th }`, pictures as `image` objects.
  - [ ] Q3 The public page `app/[locale]/st/[level]/[week]/page.tsx` (notFound, noindex, own title) and the route test that `/st` is not protected.
  - [ ] Q4 `ReadAlongPlayer` `speeds` prop (default 0.75, 1, 1.25; the page passes 0.75, 1) and a `className` for a page with no bottom bar; tests.
  - [ ] Q5 The client page: three 64 px tiles with a speaker label, the book player (page turner, "read it to me", "my turn"), the decodable sounds page, the song (poster, video, karaoke lines with gestures), the home card; tests.
  - [ ] Q6 `Storytime` messages in five locales; vi in `i18n/public-fallback.ts` if English.
  - [ ] Q7 `proxy.ts` host rule for storytime.reading-advantage.com (only `/<locale>/st/...` and its assets; every other path goes to the primary host) and no install prompt on that host; tests.
  - [ ] Q8 Receiving step: a script that validates and copies the week JSON from Workbooks and lists the media for the bucket; a runbook (the bucket upload waits for Daniel's go).
  - [ ] Q9 Browser check (phone portrait and landscape, AC 1 to 9 with a published test week), PR look check, Daniel's look check; then the deploy and the domain mapping (Daniel's go).
  Content gaps found 2026-10-23 (Workbooks l2 w01 to w08): every week is `status: draft`; no book audio file and no page picture file yet; tile label audio does not exist (the page uses the speaker label only when a file exists, else the visible label).
- [ ] Task: The weeks 1 to 8 card kit files: sound and symbol cards, picture cards, letter cards, tricky-word cards, workmats, the classroom language card; the class reader sets with the Seed and Sprout band labels.
- [~] Task: The home cards for weeks 1 to 8 with the QR codes to the live page; the parent line in Thai checked — host https://storytime.reading-advantage.com (S23, Workbooks 8ad998c); บุตรหลาน in all weeks (S24, 041017a); Daniel's check of page 2 of each week open (page section X2).

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
| Weeks 2 to 8 Thai checks (about 1.5 h a week) | 11 | done 2026-10-22 (all eight weeks passed) |
| Music test rating, phoneme audio rating | 2 | by 2026-10-29 |
| Forge look check, song video look check | 2 | 2026-11-10 to 2026-11-22 |
| Print proof | 3 | by 2026-11-24 |
| **Total** | **about 21 h over six weeks** | |

## Task count

Estimated top-level tasks: 68.
