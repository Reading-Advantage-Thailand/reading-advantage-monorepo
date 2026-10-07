# Implementation Plan: Math Advantage Program

> **Track ID:** `math_advantage_program_20261006`
> **Spec:** [spec.md](./spec.md) · **Decisions:** [decisions.md](./decisions.md) · **Pattern:** `../science_advantage_relaunch_20261006/spec.md`
> **Window:** 2026-10-07 to 2027-05-17
> **Milestones:** decisions 2026-10-31 · graph v0 2026-12-18 · P4 lesson 1 authored 2027-01-08 · generators gate 2027-01-29 · P4 book 2027-02-19 · **demo 2027-03-08** · P3 book 2027-03-12 · print order 2027-04-02 · books in hand 2027-04-30 · schools live 2027-05-17
> **Lane:** a `math` lane worktree from 2027-01-04 (capacity check X1).
> **Depends on:** Science P1 (program dimension, 2026-11-27), Science P3 (injector, 2026-12-23), Science P4 (player shell, 2027-01-22), Science P6 (engagement, 2027-01-29)
> **Rule:** tests first for backend code; contract before logic; one commit per task with `(track_id: math_advantage_program_20261006)`.

## Phase 0: Decisions and alignment (2026-10-07 to 2026-10-31) — read-only

- [x] Task: Daniel resolves M1 to M9; record in `OPEN-QUESTIONS.md` Q-WB-10 (PR session). — approved 2026-10-06; the PR session records them (strategy v1.6 §3.3, Q-WB-10).
- [~] Task: Agree the math lesson shape fields with the workbooks session — fields sent 2026-10-06; due in the schema by 2026-11-27.
- [x] Task: Obtain the P3 and P4 indicators for the three strands — filed in `sources.md` 2026-10-06 (28 and 22 indicators); copy into `mastery-advantage/math/sources/` after the freeze lifts.

## Phase 1: Math graph and package (2026-12-01 to 2027-01-08)

- [ ] Task: Node ID pattern and metadata schema for Math (`math.th2560.<strand>.<indicator>`, `math.skill.<name>`, `math.vocab.<word>`); tests with `knowledge-space-core` validators.
- [ ] Task: Graph v0 — P3 and P4 indicators, skills, and hand-defined prerequisite edges (including P3 to P4 edges); validation gate passes.
- [ ] Task: `packages/math-knowledge` from the `science-knowledge` package (adapter, contracts, loader, CLI validate); tests.
- [ ] Task: Level map CSV (P3 and P4 skills to app levels); tests.
- [ ] Task: Graph v1 with bilingual math vocabulary nodes; gate passes.

## Phase 2: Generated practice (2026-12-07 to 2027-01-29)

- [ ] Task: Generator contract for primary math (seeded input, answer, grading rule, worked solution, node IDs) on top of `practice-core`; tests.
- [ ] Task: Six generators parametrized by grade range — addition and subtraction, multiplication and multi-digit multiplication, division with remainder, fractions (compare, add same denominator), measurement conversion, data table reading; each passes the `generator-qa` gate with a 50-seed sweep per grade.
- [ ] Task: Practice items run through `activity-runtime` (practice.v1 envelope) and render in `activity-react`; tests.
- [ ] Task: Number line, bar model, and place-value chart components; component tests.
- [ ] Task: Evidence policy `math-evidence.v1` as data on the Primary pattern (`packages/domain/src/primary-mastery/evidence-policy.ts`, `primary-evidence.v1`): one row per surface (generated practice item, printed check item, explanation, game, math-fact flashcard) with confidence, teacher-led confidence, hint step-down, skip rules, and `countsTowardMastered`; pure rating function; tests from the Primary fixtures.
- [ ] Task: Durable job `math.mastery.evidence` on the Primary job pattern (writes mastery rows off the request path, replay-safe on the `activity:<submissionId>` idempotency key); resolver port from math practice, check, and game rows to node IDs; tests with the in-memory adapter.

## Phase 3: Content model and injector (2027-01-04 to 2027-02-05)

- [ ] Task: Zod contracts for worked example, practice item (printed and generated), word problem, explanation prompt, challenge; node IDs and graph version; tests.
- [ ] Task: Additive migration — math content tables in the canonical store with `program = math`; tenant registry; tests.
- [ ] Task: Extend the Workbooks injector for the math shape; idempotent; rejects untagged rows; tests with a fixture lesson.
- [ ] Task: Import P4 lesson 1 (authored 2027-01-08); tagging gate passes.

## Phase 4: Math lesson player and teacher views (2027-01-11 to 2027-02-26)

- [ ] Task: 12-step constant shared by the player, the teacher guide, and the injector; tests.
- [ ] Task: Steps 1 to 4 (Warm-Up, Key Words, Learn, Try Together) in the Primary player shell with the Chibi Quest skin; tests.
- [ ] Task: Steps 5 to 8 (Practice with generated items, Read the Problem, Explain Your Thinking with open response, Check); tests.
- [ ] Task: Steps 9 to 12 (Play with a cartridge slot, Challenge, Language Questions, Reflection); tests.
- [ ] Task: Teacher class grid per book and step; skill heatmap; intervention alerts per skill; tests.
- [ ] Task: Teacher guide and answer key per lesson on screen; tests.

## Phase 5: Engagement (2027-02-01 to 2027-02-26)

- [ ] Task: Five Play Kit cartridges fed by math item lists; host-proof bindings; tests.
- [ ] Task: Lesson and game completions award reward pieces and count toward Class Quest; tests.
- [ ] Task: Math backdrops and item icons from the forge pack into `skin.json`; tests.
- [ ] Task: Math facts in the FSRS flashcard flow; tests.
- [ ] Task: Browser captures for Daniel's review (student home, one lesson step, practice, one game).

## Phase 6: Demo (2027-02-22 to 2027-03-08)

- [ ] Task: Import P4 Book 1 complete (authored 2027-02-19); gate passes. Apply the stop rule for P3 Book 1.
- [ ] Task: Demo checklist (spec FR-7) on a Cloud Run preview under the math hostname.
- [ ] Task: Demo on 2027-03-08; record the fix list.

## Phase 7: Hardening, print, and launch (2027-03-09 to 2027-05-17)

- [ ] Task: Fix list from the demo.
- [ ] Task: Import P3 Book 1 complete (authored 2027-03-12); gate passes.
- [ ] Task: Final print order for both books by 2027-04-02 (workbooks session); confirm the in-hand date.
- [ ] Task: Load test with one class on the rehearsal environment; tablet pass.
- [ ] Task: Production deploy under the math hostname; shadow mode on; FSRS on; adaptive off.
- [ ] Task: First-week evidence review; retro entry in `lessons-learned.md`.

## Thai review load (Daniel checks all Thai himself)

| Item | Per lesson | Book of 14 |
|---|---|---|
| Thai-first math lesson (M4) | 75 min | about 18 h per book, about 36 h for P3 and P4 |

The check falls between 2027-01-08 and 2027-03-12 (9 weeks): about 4 hours per week, inside Daniel's 10 to 20 hour budget with the Science and Primary checks. See the capacity note.

## Cutover contingency

Same as the Science track. Math is built in the monorepo platform. If the March 2027 cutover also fails, Math launches as a standalone deployment of the platform container with only the math program licensed.

## Task count

Estimated top-level tasks: 38.
