# Specification: Codecamp Mastery Evidence Projection

## Overview

**Sprint goal:** Codecamp produces trustworthy learner evidence and projects it
into the shared Mastery Advantage knowledge space for every module, not only for
Unit 20.

The knowledge-space integration is already built and it is good. The graph
`codecamp.core` version 1.2.0 holds 57 nodes and 149 edges, synced from the
`mastery-advantage` repository. `curriculum-bindings.json` maps 209 activities
across all 19 published modules to graph objectives.

The runtime uses about 8 percent of it. Only the 16 pull-request bindings reach
any runtime code, and mastery is written for exactly one module.

The reason is not neglect. The other 193 bindings describe evidence that cannot
be trusted today:

- 88 `lesson-view` bindings come from a self-declared completion button.
- 85 `quiz-response` bindings come from quizzes that reveal the answers and allow
  unlimited unrecorded retakes.
- 16 `exercise-check` bindings come from submissions that the server discards.

Projecting that would corrupt the shared mastery model for every product. So
this track fixes the evidence first, then opens the projection.

## Evidence

| Fact | Location |
|---|---|
| The bindings cover all 19 modules and 209 activities | `packages/codecamp-knowledge/src/data/curriculum-bindings.json` |
| Only repository bindings reach runtime code | `packages/domain/src/codecamp/review-exercise.ts:297` |
| Mastery projection returns early for every module except the APK unit | `packages/domain/src/codecamp/pr-reviews.ts:236` |
| The trusted projection function has no production caller | `packages/domain/src/codecamp/pr-review-attempts.ts:221` |
| Exercise submissions are discarded | `packages/domain/src/codecamp/exercises.ts:26` |
| Theory completion is a self-declared click | `packages/domain/src/codecamp/quizzes.ts:41` |
| Quiz attempts are not recorded | `packages/domain/src/codecamp/quizzes.ts:33` |
| Module gating uses list order, not graph prerequisites | `apps/codecamp-advantage/lib/module-utils.ts:16` |
| Mastery cards are written and never read in Codecamp | `packages/domain/src/codecamp/pr-reviews.ts:246` |
| The bindings were generated from a dirty source and have drifted | `curriculum-bindings.json` provenance: `sourceDirty: true`, `sourceDigest 5d302b12…`; the file digest today is `273dbe47…` |
| The verification commands exist and no CI job runs them | `packages/codecamp-knowledge/package.json:32,35`; `.github/workflows/` |

## Stories

### Story S1: The bindings match the curriculum, and CI proves it
**As a** curriculum owner
**I want** the graph bindings regenerated against the current curriculum and verified in CI
**So that** the mapping cannot drift silently again

**Acceptance Criteria:**
- Given the current curriculum source, When I run the binding generator, Then the output records a clean digest and `sourceDirty: false`.
- Given the seed now holds 20 modules, When the bindings are regenerated, Then `curriculumVersion` names the true module and lesson counts.
- Given a pull request that edits the curriculum source without regenerating, When CI runs, Then `bindings:verify-source` fails the build.
- Given a pull request that edits nothing relevant, When CI runs, Then the verification adds under one minute to the job.

**Estimate:** M
**Priority:** Must

### Story S2: Exercise submissions are stored and answered
**As an** intern
**I want** my exercise submission stored and given real feedback
**So that** my work is not thrown away

**Acceptance Criteria:**
- Given I submit exercise code, When the server responds, Then my code is persisted with the exercise, the lesson, and a timestamp.
- Given I submit exercise code, When the server responds, Then the feedback states whether the attempt passed and why.
- Given I submit twice, When I open the exercise again, Then I see my previous attempts.
- Given the grader is unavailable, When I submit, Then my code is still stored and the response says the review is pending.

**Estimate:** L
**Priority:** Must

### Story S3: Quiz attempts are recorded and the answers stay hidden
**As a** curriculum owner
**I want** each quiz attempt recorded and the answer key withheld until the attempt budget is spent
**So that** a quiz score means something

**Acceptance Criteria:**
- Given I submit a quiz, When the server grades it, Then one attempt row is written with the answers, the score, and the attempt number.
- Given I fail an attempt and attempts remain, When I see the result, Then I see which questions were wrong but not the correct answers.
- Given I spend the last attempt, When I see the result, Then I see the correct answers and the explanations.
- Given I reload the page mid-quiz, When the page restores, Then my attempt count is unchanged and correct.

**Estimate:** M
**Priority:** Must

### Story S4: Theory completion is earned
**As a** curriculum owner
**I want** a theory lesson to close on a checkpoint rather than a button
**So that** progress and module locks mean something

**Acceptance Criteria:**
- Given a theory lesson, When I reach the end, Then I answer one checkpoint question drawn from the lesson.
- Given I answer the checkpoint correctly, When the server records it, Then the lesson is marked complete.
- Given I answer incorrectly, When the server records it, Then the lesson stays in progress and I may retry with a hint.
- Given a lesson that has no authored checkpoint yet, When I reach the end, Then the current button remains, and the lesson is listed in the authoring backlog.

**Estimate:** L
**Priority:** Must

### Story S5: Assessed lesson evidence reaches the knowledge space
**As a** curriculum owner
**I want** quiz and exercise evidence projected to Mastery through the existing bindings
**So that** the shared graph reflects what Codecamp learners actually know

**Acceptance Criteria:**
- Given a graded quiz attempt, When it settles, Then the server projects `quiz-response` evidence for the bound objectives.
- Given a graded exercise attempt, When it settles, Then the server projects `exercise-check` evidence for the bound objectives.
- Given a `lesson-view` binding, When a lesson is completed, Then no mastery evidence is projected, because exposure carries weight zero.
- Given a projection failure, When it happens, Then the outbox row records the failure and the learner path is unaffected.
- Given the same attempt is projected twice, When the second projection runs, Then the receipt is `replayed` and no duplicate evidence is written.

**Estimate:** L
**Priority:** Must

### Story S6: Approved pull requests project for every module
**As an** intern in any module
**I want** my approved pull request to count toward mastery
**So that** independent practice is credited outside Unit 20

**Acceptance Criteria:**
- Given an approved pull request in any module with a repository binding, When an administrator approves it with passing deterministic checks, Then `projectVerifiedPrObjectiveToMastery` runs for its bound objectives.
- Given a pull request with failing or missing deterministic checks, When an administrator approves it, Then no mastery evidence is written and the reason is recorded.
- Given the APK unit, When a pull request is approved, Then its behavior and its spaced follow-up schedule are unchanged.
- Given advisory model evidence, When it is stored, Then it never becomes mastery evidence.

**Estimate:** M
**Priority:** Must

### Story S7: Due mastery cards reach the learner
**As an** intern
**I want** to see the practice the schedule says is due
**So that** the spaced repetition schedule has a purpose

**Acceptance Criteria:**
- Given due mastery cards, When I open the dashboard, Then I see a review section listing what is due.
- Given no due cards, When I open the dashboard, Then the section is absent rather than empty.
- Given I complete a due review, When it settles, Then the card is rescheduled through the existing engine.

**Estimate:** M
**Priority:** Should

### Story S8: Module gating uses graph prerequisites
**As a** curriculum owner
**I want** module locks derived from graph prerequisite edges
**So that** the lock reflects knowledge, not list order

**Acceptance Criteria:**
- Given a module whose prerequisite objectives are not held, When I open the dashboard, Then the module is locked and names the missing prerequisite.
- Given the prerequisite objectives are held, When I open the dashboard, Then the module is unlocked regardless of list order.
- Given the graph has no prerequisite edge for a module, When I open the dashboard, Then the current order rule applies as a fallback.

**Estimate:** L
**Priority:** Could

## Non-Functional Requirements

- No mastery evidence may originate from a self-declared completion.
- Every projection is idempotent, keyed as the existing activity path is keyed.
- A projection failure must never block the learner path.
- The Codecamp mastery tenant stays `CODECAMP_MASTERY_SCHOOL_ID`.
- New tables follow the migration ledger rules in
  `packages/db/drizzle/MIGRATION_LEDGER.md`, including `when` monotonicity.
- Real-database smoke coverage is required for every new table, because
  mock-database tests have passed while constraints failed.

## Acceptance Criteria

- `bindings:verify-source` and `graph:verify-source` run in CI and pass.
- A quiz attempt and an exercise attempt in a Phase A module both produce
  mastery evidence rows under the Codecamp tenant.
- An approved pull request in a non-APK module produces mastery evidence.
- No mastery evidence exists whose source is a theory completion click.
- Browser acceptance: complete one full module end to end as an intern, then
  show the resulting objective evidence in the administrator surface.

## Out of Scope

- Translating the curriculum into Thai.
- Changing the graph itself. The authority stays the `mastery-advantage`
  repository, and this track only consumes and verifies it.
- Rewriting the curriculum content out of the TypeScript seed literal.
