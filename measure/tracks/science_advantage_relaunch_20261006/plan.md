# Implementation Plan: Science Advantage Relaunch

> **Track ID:** `science_advantage_relaunch_20261006`
> **Spec:** [spec.md](./spec.md) · **Review:** [review.md](./review.md) · **Decisions:** [decisions.md](./decisions.md)
> **Window:** 2026-10-07 to 2027-05-17 (Thai semester 1 start, about 2027-05-17)
> **Milestones:** decisions 2026-10-31 · graph v0 2026-11-27 · lesson 1 authored 2026-11-27 · program migration 2026-11-20 · **demo 2027-02-08** · print order 2027-03-26 · books in hand 2027-04-23 · schools live 2027-05-17
> **Lanes:** from 2027-01-04 the Science, Math, and Zhongwen work runs in three lane worktrees on one integration branch (capacity check X1).
> **Rule:** every task writes tests first for backend code. Contract (Zod) before logic. Commit per task with `(track_id: science_advantage_relaunch_20261006)`.

Phases overlap where owners differ. Dates are the plan; the Primary cutover and Daniel's decisions can move them.

---

## Phase 0: Decisions and alignment (2026-10-07 to 2026-10-31) — read-only

- [x] Task: Daniel resolves D1 to D11 in `decisions.md`; record the answers in `OPEN-QUESTIONS.md` Q-WB-10 (PR session). — approved 2026-10-06; the PR session records them (strategy v1.6 §3.3, Q-WB-10).
- [ ] Task: Agree the science lesson shape with the workbooks session; they add a `program` discriminator and the science fields to `workbook-schema.ts`.
- [ ] Task: Read the graph schema and release rules (`mastery-advantage/SPECIFICATION.md`, `MIGRATION-v3.md`) and the domain adapter pattern (`packages/domain/src/primary-mastery/objective-key.ts`, `contracts.ts`, `backfill.ts`, `evidence-policy.ts`, `record-evidence.ts`); fix the node ID pattern (`science.th2560.<strand>.<indicator>`, `science.skill.<process>`, `science.vocab.<word>`). This track owns the Science graph.
- [ ] Task: Obtain the P3 and P4 science indicators (IPST source, B.E. 2560 revision) and file them under `mastery-advantage/science/sources/`.
- [ ] Task: Agree the merge window and the additive migration rule with the monorepo session (after the cutover, after the freeze lifts).
- [ ] Task: Write the Tutor series `program` contract as an addendum for the PR session's Tutor spec (`tutor-advantage/docs/specs/2026-10-tutor-catalogue-and-platform-spec.md`); Daniel's developer builds it in the Tutor repo.
- [ ] Task: Request science backdrops and item icons from the forge session (lab, garden, pond, sky; beaker, magnifier, seed, magnet).
- [ ] Task: Tag the legacy app: `git tag science-advantage-legacy-20261006 0b93daeb2` (after Daniel approves D10).

## Phase 1: Program dimension and canonical store (2026-11-02 to 2026-11-27)

- [ ] Task: Contract — Zod `programSchema` (`primary | reading | science | math | zhongwen`, the Tutor T6 enum in lower case) in `packages/types`; tests.
- [ ] Task: Additive migration — `program` column (default `primary`; Reading rows backfilled to `reading`) on books, lessons, class-book assignments, licenses; index per `(school_id, program)`; tenant registry entries; tests.
- [ ] Task: License contract — a school license lists programs; `assertCan` checks for `program:read`; tests.
- [ ] Task: Mastery evidence provenance carries `program` and the graph ID; tests in `packages/domain/src/mastery`.
- [ ] Task: Platform app — program-aware student home: list licensed programs; English behavior unchanged when the flag is off; tests.

## Phase 2: Science graph package and tagging (2026-11-02 to 2026-12-18) — this track builds the graph

- [ ] Task: Create `packages/science-knowledge` from the `codecamp-knowledge` pattern: adapter, contracts, data loader, CLI validate; tests with `knowledge-space-core` validators.
- [ ] Task: Build graph v0 — P3 and P4 indicators, process-skill nodes, hand-defined prerequisite edges; validation gate passes (no cycles, no dangling edges, required alignments present).
- [ ] Task: Send the graph v0 node ID list to the graphs session (agreed 2026-10-06); they read it once against the English key conventions (`objective-key.ts` short ID and node ID rules) before the release is pinned. Apply their notes before Phase 2 ends.
- [ ] Task: Level map CSV: P3 and P4 indicators to app levels; tests.
- [ ] Task: Tagging report script: lists every content row without a node ID; exit code non-zero when any exist.
- [ ] Task: Build graph v1 (bilingual science vocabulary nodes); re-run the gate.

## Phase 3: Science content model and importer (2026-11-16 to 2026-12-23)

- [ ] Task: Contracts — Zod schemas for science article, vocabulary item, investigation (materials, safety, procedure steps, data table template), question (closed and open), reflection prompt, all with node IDs and graph version; tests.
- [ ] Task: Additive migration — science content tables in the canonical store with `program = science`; FLAT or REFERENTIAL classification; tests.
- [ ] Task: Extend the Workbooks injector for the science shape — reads a science workbook JSON, writes the canonical store, idempotent by `(program, book, lesson_number)`, rejects untagged rows; tests with a fixture book. No new pipeline.
- [ ] Task: Content production checklist for the workbooks session: bank first, then the print subset; pictures by meta/muse-image through OpenRouter in the picture-book style with race-unmarked prompts; audio by mmx with the standard Thai voices; game names in English in Thai copy.
- [ ] Task: Salvage script — re-shapes the 132 legacy seed lessons and 536 questions into the importer format with the new indicator codes (mapping table from the graphs session); report of rows that need hand editing; tests.
- [ ] Task: Hand the salvage output to the workbooks session for editing into P3 Book 1 and P4 Book 1.
- [ ] Task: Import lesson 1 of each book (authored 2026-11-27) and verify the tagging gate.

## Phase 4: Science lesson player (2026-11-30 to 2027-01-22)

- [ ] Task: Step contract — 12-step list as a typed constant shared by the player, the teacher guide, and the importer; tests that the order matches the workbook schema.
- [ ] Task: Port block renderers (text, vocabulary, reading passage, materials, procedure, image, quiz) from the legacy app into the platform app under the RPG chrome; component tests.
- [ ] Task: Step screens 1 to 4 (Before You Explore, Key Vocabulary, Read the Article, Collect Vocabulary) with progress and gating reused from the Primary lesson player; tests.
- [ ] Task: Step screens 5 and 6 (Investigate, Record Data) with the materials checklist, safety banner, one-step-at-a-time procedure, and a data table or drawing capture; tests.
- [ ] Task: Step screens 7 and 8 (Comprehension Check, Explain with claim-evidence-reasoning frames); open-response storage; tests.
- [ ] Task: Step screens 9 to 12 (Vocabulary Practice, Apply, Language Questions, Lesson Reflection); tests.
- [ ] Task: Bilingual display — Thai-first with English vocabulary; per-school English-first switch; tests.
- [ ] Task: Digital phases around the steps — vocabulary flashcards (FSRS) and one vocabulary game slot; tests.

## Phase 5: Shadow-mode evidence and FSRS (2026-12-14 to 2027-01-29) — after the lane-h evidence track merges (2026-12-11)

- [ ] Task: Evidence policy `science-evidence.v1` as data on the Primary pattern (`packages/domain/src/primary-mastery/evidence-policy.ts`, `primary-evidence.v1`): one row per surface (quiz item, open response, flashcard, game, investigation record) with confidence, teacher-led confidence, hint step-down, skip rules, and `countsTowardMastered`; pure rating function; tests from the Primary fixtures.
- [ ] Task: Durable job `science.mastery.evidence` on the Primary job pattern (writes mastery rows off the request path, replay-safe on the `activity:<submissionId>` idempotency key); resolver port from science quiz, flashcard, and game rows to node IDs; tests with the in-memory adapter.
- [ ] Task: Quiz submission, vocabulary review, and game completion enqueue the job; tests.
- [ ] Task: Science vocabulary decks enter the flashcard FSRS flow with node IDs; tests.
- [ ] Task: Nightly evidence report (counts per node, per class, per program) as a worker job; tests.
- [ ] Task: Outer-fringe recommendation behind a flag, default off; tests that the flag off changes nothing.

## Phase 6: Engagement parity (2027-01-04 to 2027-01-29)

- [ ] Task: Science word lists from the tagged vocabulary feed five Play Kit cartridges; host-proof bindings; tests.
- [ ] Task: Science lesson and game completions award reward pieces and count toward Class Quest; tests.
- [ ] Task: Science backdrops and item icons from the forge pack into `skin.json`; science scene on the student home for the science program; component tests.
- [ ] Task: Browser capture of the student home, one lesson step, one game, and the avatar screen for Daniel's review (owner rule: show captures before closing a visual lane).

## Phase 7: Teacher views (2027-01-11 to 2027-02-05)

- [ ] Task: Class-book grid shows science books and the 12 steps; tests.
- [ ] Task: Science lesson analytics per node (port `curriculum` and `quiz` queries); tests.
- [ ] Task: Intervention alerts re-pointed at graph nodes (port `interventions`); tests.
- [ ] Task: Teacher guide and answer key per lesson on screen; rubric view for open responses; tests.

## Phase 8: Demo build and sample print (2027-01-25 to 2027-02-08)

- [ ] Task: Import the complete P4 Book 1 (authored by 2027-01-29); tagging gate passes.
- [ ] Task: Demo checklist (spec FR-8) runs on a Cloud Run preview under the science hostname.
- [ ] Task: Printed sample lesson booklet from the workbooks session in hand by 2027-02-01.
- [ ] Task: Demo on 2027-02-08; record Daniel's fix list.

## Phase 9: Legacy removal and hardening (2027-02-09 to 2027-03-12)

- [ ] Task: Delete `apps/science-advantage`, its CI step `verify:science`, its turbo entry, and the `science_advantage` database from local setup docs; CI green.
- [ ] Task: Fix list from the demo.
- [ ] Task: Import P3 Book 1 (complete); tagging gate passes.
- [ ] Task: Load test with one class of 25 students on the rehearsal environment (not locally).
- [ ] Task: Accessibility and tablet pass on the lesson player.

## Phase 10: Print, pilot, and launch (2027-03-15 to 2027-05-17)

- [ ] Task: Final print order for P3 Book 1 and P4 Book 1 by 2027-03-26 (workbooks session); confirm in-hand date.
- [ ] Task: School onboarding — program licenses, class books, teacher training checklist for the 12 steps.
- [ ] Task: Production deploy under the science hostname; smoke test; shadow mode on; FSRS on; adaptive off.
- [ ] Task: First-week evidence review (nightly report) and a retro entry in `lessons-learned.md`.
- [ ] Task: Write the Math and Zhongwen reuse note: what each part of the second-subject pattern needs from them.

---

## Thai review load (Daniel checks all Thai himself)

No native-speaker review step exists. Daniel's hours per book of 14 lessons, estimated at 20 minutes per lesson for vocabulary-only Thai and 75 minutes per lesson for Thai-first instructions, article support, questions, and the teacher guide:

| Option | Per lesson | Per book | Two books (D6) |
|---|---|---|---|
| English-first, Thai vocabulary only | 20 min | about 5 h | about 10 h |
| Bilingual Thai-first (D5 recommendation) | 75 min | about 18 h | about 36 h |

The check falls between 2026-12-01 and 2027-01-29 (about 9 weeks), so Thai-first means about 4 hours per week for Daniel. The plan front-loads lesson 1 of each book (2026-11-27) so he can set the Thai style once and the rest follows it.

## Cutover contingency (if the Primary cutover has not passed by 2026-10-20)

Primary stays on the legacy build for semester 2 and the next window is the March 2027 break (strategy v1.4 §6). The Science build does not stop, but the dependencies change:

| Phase | Change |
|---|---|
| P1 program dimension | Lands in the monorepo build and its database only. The legacy production database is untouched. The canonical store for Science is the monorepo database from day one. |
| P2 to P7 | No change. All work is in the monorepo platform app, which the demo runs from a Cloud Run preview. |
| P8 demo | No change. A demo does not need the Primary production cutover. |
| P9 hardening | Add the March 2027 cutover rehearsal to the Science checklist, because Science goes live on the monorepo build. |
| P10 launch | Two paths. **Path A:** the March 2027 cutover passes; Science launches as a program of the platform as planned. **Path B:** the cutover fails again; Science launches as a standalone deployment of the same platform container with only the science program licensed and its own database. D1 makes Path B possible without a code fork. Schools then have two logins until the Primary cutover passes. |

## Blast radius (graph-aware note)

`graph.db` at the repo root is from this branch; it was not refreshed for this read-only track. Phase 1 touches `packages/db` schema and `packages/domain` licenses and mastery provenance, which Primary, Reading, and Tutor read. Run `build-graph callers` on `licenses` and `commitMasteryEvidence` before the Phase 1 migration task.

## Task count

Estimated top-level tasks: 62.
