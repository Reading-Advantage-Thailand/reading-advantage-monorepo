# Implementation Plan: Zhongwen Advantage Program

> **Track ID:** `zhongwen_advantage_program_20261006`
> **Spec:** [spec.md](./spec.md) · **Decisions:** [decisions.md](./decisions.md) · **Pattern:** `../science_advantage_relaunch_20261006/spec.md`
> **Path:** May 2027 (Daniel's decision, 2026-10-06; the deferred path is withdrawn).
> **Milestones:** reviewers named 2026-12-18 · graph v0 2027-02-05 · lesson 1 authored 2027-02-01 · book 2027-03-19 · **demo 2027-03-29** · print order 2027-04-09 · in hand about 2027-05-07 · schools live 2027-05-17
> **Depends on:** Science P1, P3, P4, P6; the contracted Chinese speakers (Z8).
> **Lane:** a `zhongwen` lane worktree from 2027-01-04 (capacity check X1).
> **Rule:** tests first for backend code; contract before logic; one commit per task with `(track_id: zhongwen_advantage_program_20261006)`.

| Phase | Dates |
|---|---|
| 0 Decisions | 2026-10-07 to 2026-10-31 (reviewers named by 2026-12-18) |
| 1 Graph and package | 2027-01-11 to 2027-02-05 |
| 2 Content model and injector | 2027-01-25 to 2027-02-19 |
| 3 Script layer and FSRS | 2027-02-08 to 2027-03-12 |
| 4 Engagement and teacher views | 2027-03-01 to 2027-03-19 |
| 5 Demo | 2027-03-29 |
| 6 Print and launch | print by 2027-04-09; live 2027-05-17 |

## Phase 0: Decisions and alignment — read-only

- [x] Task: Daniel resolves Z1 to Z9; record in `OPEN-QUESTIONS.md` Q-WB-10 (PR session). — approved 2026-10-06; the PR session records them (strategy v1.6 §3.3, Q-WB-10).
- [ ] Task: Verify the YCT level word lists and the Thai Ministry of Education Chinese framework against their sources; file them under `mastery-advantage/zhongwen/sources/`.
- [ ] Task: Daniel names the contracted Chinese speakers and signs the contract by 2026-12-18 (Z8); the workbooks session gets their review turnaround (target three working days per lesson). Stop rule: if not named by 2026-12-18, the Zhongwen print moves to the March break and the app ships in May with the digital lessons only.
- [ ] Task: Agree the script fields (`hanzi`, `pinyin`, `thai`) and the character-writing item with the workbooks session.

## Phase 1: Zhongwen graph and package

- [ ] Task: Node ID pattern and metadata schema (`zhongwen.yct.<level>.vocab.<word>`, `zhongwen.char.<char>`, `zhongwen.grammar.<pattern>`, `zhongwen.reading.<level>.<cando>`); tests.
- [ ] Task: Graph v0 — YCT 1 vocabulary and characters with radical prerequisite edges; validation gate passes.
- [ ] Task: `packages/zhongwen-knowledge` from the `science-knowledge` pattern; tests.
- [ ] Task: Level map CSV (YCT to app levels, HSK 3.0 band metadata); tests.

## Phase 2: Content model and injector

- [ ] Task: Zod contracts for the script layer on article paragraphs, vocabulary, sentences, and questions; node IDs and graph version; tests.
- [ ] Task: Additive migration — Zhongwen content tables (or script columns on the shared lesson tables, decided with the Science content model) with `program = zhongwen`; tenant registry; tests.
- [ ] Task: Extend the Workbooks injector for the script fields; rejects untagged rows and rows without a Chinese review flag; tests.
- [ ] Task: Import lesson 1; gate passes.

## Phase 3: Script layer and FSRS

- [ ] Task: Script layer in the Primary lesson player — pinyin toggle, tone audio per sentence, Thai gloss on tap; component tests.
- [ ] Task: Character writing item with stroke order inside Vocabulary Practice; tests.
- [ ] Task: Character and vocabulary cards in the FSRS flashcard flow; tests.
- [ ] Task: Evidence policy `zhongwen-evidence.v1` as data on the Primary pattern (`packages/domain/src/primary-mastery/evidence-policy.ts`, `primary-evidence.v1`): one row per surface (comprehension item, character writing, flashcard, game, tone listening) with confidence, teacher-led confidence, hint step-down, skip rules, and `countsTowardMastered`; pure rating function; tests from the Primary fixtures.
- [ ] Task: Durable job `zhongwen.mastery.evidence` on the Primary job pattern (writes mastery rows off the request path, replay-safe on the `activity:<submissionId>` idempotency key); resolver port from zhongwen quiz, flashcard, and game rows to node IDs; tests with the in-memory adapter.
- [ ] Task: Tone audio pipeline — one Mandarin voice through the speech adapter, one file per sentence, stored through `@reading-advantage/storage`, checked by the contracted Chinese speakers; tests.

## Phase 4: Engagement and teacher views

- [ ] Task: Three Play Kit cartridges with character and word lists; reward pieces and Class Quest; tests.
- [ ] Task: Chinatown and temple backdrops and icons from the forge pack; tests.
- [ ] Task: Class grid per book and step; character coverage per class; tests.
- [ ] Task: Browser captures for Daniel's review.

## Phase 5: Demo

- [ ] Task: Import Book 1 complete (authored 2027-03-19); gate passes; Chinese review recorded for all 14 lessons.
- [ ] Task: Demo checklist on a Cloud Run preview under the zhongwen hostname; demo; fix list.

## Phase 6: Print and launch

- [ ] Task: Final print order (workbooks session); confirm the in-hand date.
- [ ] Task: Fix list; tablet pass.
- [ ] Task: Production deploy; shadow mode on; FSRS on; adaptive off.
- [ ] Task: First-week evidence review; retro entry.

## Thai review load (Daniel) and Chinese review load (contracted, Z8)

| Reviewer | Per lesson | Book of 14 |
|---|---|---|
| Daniel (Thai instructions and glosses) | 45 min | about 10 h |
| Contracted Chinese speakers (characters, pinyin, tones, audio) | 60 min | about 14 h |

## Task count

Estimated top-level tasks: 28.
