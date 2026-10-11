# Specification: Science Advantage Relaunch

**Track ID:** `science_advantage_relaunch_20261006`
**Type:** feature (classic FR list)
**Status:** proposed — D1 and D2 approved by Daniel on 2026-10-06; D3 to D12 open (see `measure/subject-programs-open-decisions.md`). No code changes before the open items are approved.

## Overview

Rebuild Science Advantage as a program of the shared K-12 platform so that a primary school can buy it with Primary Advantage for the 2027 school year. The product is a printed workbook (14 lessons) and its digital twin. Every article, question, vocabulary item, and activity carries Mastery Advantage graph tags. The build is demo-ready in early February 2027 and live for schools in May 2027. The pattern must be reusable for Math Advantage and Zhongwen Advantage.

Source review: [`review.md`](./review.md). Decisions: [`decisions.md`](./decisions.md). Strategy: `advantage-pr/08-strategy/product-strategy-2026-2027.md` v1.4.

## Assumptions (until Daniel decides)

D1 (program of the shared platform) and D2 (one database) are decided. The plan assumes the recommendations for the 12-step science lesson shape (D3), Thai B.E. 2560 indicators (D4), bilingual Thai-first (D5), P3 and P4 (D6), two books (D7), demo 2027-02-08 (D8), shadow mode plus FSRS at launch (D9), salvage then delete (D10), Cloud Run (D11), Chibi Quest skin (D12). It also assumes that the Primary cutover passes by 2026-10-20; see the contingency in `plan.md`.

## The second-subject pattern (reusable for Math and Zhongwen)

A subject program consists of six parts. Each part has one owner.

| Part | Artifact | Owner |
|---|---|---|
| 1. Lesson shape | Steps and fields in `Workbooks/dashboard/lib/workbook-schema.ts` under a `program` discriminator | workbooks session |
| 2. Knowledge graph | `mastery-advantage/<subject>/<subject>-knowledge-space.json` and a `@reading-advantage/<subject>-knowledge` package with the domain adapter, built on the `packages/domain/src/primary-mastery/*` pattern (objective key, contracts, backfill, evidence policy, evidence recorder) | the subject track (the graphs session owns only the English graph and the Primary evidence pipeline) |
| 3. Content | Graph-first authored lessons, exported as workbook JSON, imported into the canonical store with `program` set | workbooks session (author), Science track (import) |
| 4. Program in the platform | `program` dimension on books, lessons, licenses, and evidence; program-aware navigation and lesson player | Science track |
| 5. Engagement | Play Kit cartridges fed by the program's tagged word lists; avatar and quest rewards shared | Science track with forge |
| 6. Deployment | Hostname and brand config for the program; one container image | Science track with monorepo session |

Math and Zhongwen repeat parts 1 to 6 with their own graph, shape, and content. Parts 4 to 6 are built once here and reused.

## Functional Requirements

### FR-1 Program dimension in the canonical store
- Add `program` to books, lessons, class-book assignments, licenses, and mastery evidence provenance. Values are the five product lines, lower case: `primary`, `reading`, `science`, `math`, `zhongwen` (the same enum as Tutor Advantage T6; existing Primary rows default to `primary`, Reading rows to `reading`). Additive migration only.
- A school license names its programs. The student home lists only licensed programs.
- Tutor Advantage series records gain the same dimension. Tutor Advantage is a separate repo built by Daniel's developer; the PR side supplies the spec. This track supplies the contract text for that spec and builds nothing in Tutor.

### FR-2 Science lesson content model
- Science lessons use the 12-step shape (D3) as their fixed contract. Each step has a printed form and a digital form.
- Tables: science article, vocabulary items, investigation (materials, safety notes, procedure steps, data table template), questions (closed and open), reflection prompts. All rows carry graph node IDs and the graph version.
- Content follows the Primary production rules (Daniel's standing decisions): Claude makes every lesson asset in the Workbooks repo (article, questions, workbook items, Thai, pictures, audio). The app has no generator of its own. The order is a bank first, then the print subset. The Workbooks injector writes the content to the database; this track extends that injector for the science shape instead of building a new pipeline. The injector is idempotent by `(program, book, lesson_number)`.
- Pictures: meta/muse-image through the OpenRouter Image API, in the printed picture-book style. Characters stay race-unmarked: prompts describe hair and clothes, never skin or ethnicity.
- Audio: mmx speech with the standard Thai voices.
- Game names stay in English, also in Thai copy and Thai voice-over.
- Salvage: the 132 seed lessons and 536 questions are re-shaped into the importer format by script, then edited by the workbooks session.

### FR-3 Science lesson player
- One screen per step with the same progress bar and step gating as the Primary lesson player.
- Digital-only phases may be added around printed steps (vocabulary flashcards, a vocabulary game, a data-table game). No printed step is removed or reordered.
- Block renderers ported from `apps/science-advantage/components/features/lesson/blocks`.
- Open-response steps (Record Data, Explain, Apply, Reflection) store the student's text or drawing and show the teacher a rubric view. No automatic grading at launch.
- Bilingual display: Thai-first with English vocabulary; per-school English-first switch (D5).

### FR-4 Mastery Advantage integration
- Tag: every content row references nodes in `science-knowledge-space.json`. The importer rejects untagged articles, questions, and vocabulary items.
- Shadow: a `science-evidence.v1` policy as data on the Primary pattern (`packages/domain/src/primary-mastery/evidence-policy.ts`, version `primary-evidence.v1`: confidence per surface, teacher-led confidence, hint step-down, skip rules) and a durable job `science.mastery.evidence` that writes mastery rows off the request path through `commitMasteryEvidence()` with the Science graph version. No new evidence code; new policy rows and a resolver from science rows to node IDs. A nightly report lists evidence counts per node and per class.
- FSRS: science vocabulary enters the existing flashcard review flow with the science node IDs.
- Adaptive (off at launch): outer-fringe recommendation behind a flag.

### FR-5 Engagement parity
- The student home, lesson screens, and games use the RPG chrome, scene, HUD, and avatar from Primary.
- At least five Play Kit cartridges run with science word lists (vocabulary match, spelling, cloze, sorting, ordering).
- Science lesson completions award reward pieces and count toward Class Quest.
- Science backdrops and item icons come from advantage-forge only (owner rule, 2026-10-06).

### FR-6 Teacher views
- Class progress grid per book and step (reuse the Primary class-book grid).
- Science analytics per lesson and per node (port from `packages/domain/src/curriculum` and `quiz` queries).
- Intervention alerts per class re-pointed at graph nodes (port from `packages/domain/src/interventions`).
- Answer keys and the 12-step teacher guide per lesson, printed and on screen.

### FR-7 Deployment and health
- Science is served by the platform container under its own hostname and brand tokens.
- `pnpm turbo run check-types`, `lint`, and `test` pass for the platform app with the program enabled.
- The legacy app `apps/science-advantage` is tagged and deleted after the demo (D10). Its repo-inspection tests go with it.

### FR-8 Demo and print milestones
- Demo build on 2027-02-08 with: one full P4 lesson in the player, the student home with science quests, two games with science words, the teacher grid, and a printed sample lesson booklet.
- Final print order for P3 Book 1 and P4 Book 1 by 2027-03-26.

## Non-Functional Requirements

- No change to shared packages, the lockfile, or deploy config before the Primary cutover is accepted (Oct 11; last date Oct 20). Additive migrations only until the freeze lifts.
- Every query is tenant-scoped through `createTenantDB`; new tables are classified in `tenant-registry.ts`.
- Business logic lives in `packages/domain` modules with Zod contracts and tests. Route handlers and server actions stay thin.
- AI calls go through `@reading-advantage/ai`. Storage goes through `@reading-advantage/storage`.
- No new cryptographic hashing (repo policy).
- No user-facing text names a launch date.

## Non-Goals

- No adaptive recommendation at launch (D9).
- No P5 and P6 content in this track.
- No separate Science mobile app.
- No new authentication method.
- No ElvGames or other licensed pixel assets.
- No Reedy. Reedy Preview is an English speaking coach in Primary Advantage. Science does not use it unless Daniel asks.
- No native-speaker Thai review step. Daniel checks all Thai himself; the plan budgets his hours.

## Acceptance Criteria

1. A student in a school licensed for English and Science sees both programs on one home screen with one avatar.
2. A P4 science lesson runs through all 12 steps in the player and matches the printed page order.
3. Every article, question, and vocabulary item in both books has at least one Science graph node ID; the importer rejects untagged rows.
4. A quiz submission writes a mastery evidence commit with the Science graph version; the nightly report shows it.
5. Science vocabulary appears in the FSRS flashcard queue.
6. Five Play Kit cartridges run with science word lists and award reward pieces.
7. The teacher class grid shows science book progress per student and per step.
8. The demo checklist in FR-8 passes on 2027-02-08.
9. `apps/science-advantage` is deleted; the tag `science-advantage-legacy-20261006` exists.
10. Type check, lint, and tests pass in CI for the platform app.
