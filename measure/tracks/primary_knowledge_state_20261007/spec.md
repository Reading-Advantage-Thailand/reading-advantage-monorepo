# Spec: Primary Knowledge State (T3 of the Primary Mastery Graph Program)

Track `primary_knowledge_state_20261007` | Type: feature | Spec mode: story | Created 2026-10-07 |
Owner decision D8 (2026-10-07): write the spec and plan now; build after the freeze, in a
migration window the owner picks (2026-11-09 or 2026-12-14); shadow mode first.

The program table names this track `primary_knowledge_state_20261006`; it gets the creation date.

## Overview

**Sprint goal:** For every Primary student, the engine computes the knowledge state and the outer
fringe after each evidence commit, logs what it would recommend and whether the student looks
ready for the level test, and shows this only on an internal admin page (shadow mode).

Sources: `measure/primary-mastery-graph-program.md` sections 2.1, 4.1, 4.5, and 7 (T3 row; all
ten program decisions approved 2026-10-06), and the PR plan
`advantage-pr/12-operations/level-tests-and-certificates-plan.md` (phase P6, readiness from mastery).

Existing engine pieces, reused and not rewritten: `buildKstState`
(`packages/knowledge-space-core/src/srs-bridge.ts`), `planRecommendedNext`
(`packages/knowledge-space-practice/src/planner/recommended-next.ts`), the projections in
`packages/knowledge-space-practice/src/projections/`, the mastery tables (`mastery_cards`,
`mastery_evidence`, `mastery_states`), and the Primary flashcard store (`flashcard_decks`,
`flashcard_cards` of VOCABULARY decks, with their FSRS fields) as the one FSRS store for words
(program decision 3; correction of 2026-10-07: no Primary code writes `user_word_records`, the
reader saves words through `actions/flashcard.ts` into the flashcard tables).

## Stories

### Story S1: Graph slice
**As a** knowledge state engine
**I want** a pinned slice of the English graphs as a data package
**So that** every state is computed against a known graph release

**Acceptance Criteria:**
- Given the pinned graph release (`GRAPH_RELEASE` in `primary-mastery/objective-key.ts`), When the slice loads, Then it holds the young-learner Reading and Listening objectives of GSE 10-70, their prerequisite edges, and the Starters, Movers, and Flyers vocabulary nodes.
- Given a node domain that the slice does not know yet (for example the grammar nodes of decision D12), When a later release adds it, Then the loader accepts it by configuration, without a code change in the state function.
- Given the slice, When it loads twice in one process, Then the second load uses the cached copy.

**Estimate:** M
**Priority:** Must

### Story S2: Student knowledge state
**As a** later view or recommender (T4, T5, the level test readiness)
**I want** `getStudentKnowledgeState({ db, user, tenant, studentId })`
**So that** every consumer reads one state from one function

**Acceptance Criteria:**
- Given a student with objective cards, evidence, and vocabulary flashcards, When the function runs, Then it returns the state of each objective (`mastered`, `inProgress`, `notStarted`), the confidence, and the outer fringe from `buildKstState`.
- Given a user of another school, When the function runs, Then it refuses the request (TenantDB and `assertCan`).
- Given the same inputs, When the function runs twice, Then it returns the same state (no write on the read path).

**Estimate:** M
**Priority:** Must

### Story S3: Cold start
**As a** new student with no evidence
**I want** a starting state from my level
**So that** the engine does not treat me as a beginner in every objective

**Acceptance Criteria:**
- Given a student with no evidence at Primary level N, When the state is computed, Then the objectives below the GSE range of level N are `inProgress` with low confidence, and none is `mastered` (program section 4.5).
- Given a student with no level, When the state is computed, Then every objective is `notStarted`.

**Estimate:** S
**Priority:** Must

### Story S4: Shadow log
**As a** product owner who calibrates the engine
**I want** a log row after each evidence commit with the state change and the recommendation that the engine would show
**So that** we can check the engine on real data before any student sees it

**Acceptance Criteria:**
- Given an evidence job that commits for a student, When it finishes, Then a follow-up job computes the state and `planRecommendedNext` and writes one shadow log row (student, school, trigger, objectives changed, would-recommend list, policy and graph versions).
- Given the shadow mode, When any student, teacher, or parent screen renders, Then nothing on it changes.
- Given a replay of the same evidence job, When the follow-up runs, Then no second log row appears for the same trigger.
- Given the job, When it runs, Then it runs on the worker and never on a request path.

**Estimate:** M
**Priority:** Must

### Story S5: Level test readiness signal
**As a** tutor or teacher (later) and the PR plan phase P6
**I want** a readiness value per band (Pre-A1, A1, A2) for each student
**So that** mastery evidence can show when a child is ready for the level test

**Acceptance Criteria:**
- Given a student's state, When readiness is computed, Then it returns, per band, the share of the band's objectives that are mastered or near mastery, the share of the band's word list in review, and a ready flag by a threshold kept as data.
- Given shadow mode, When readiness is computed, Then it goes into the shadow log only and no screen shows it.
- Given a band with no tagged evidence yet, When readiness is computed, Then it reports "no evidence" and not "not ready".

**Estimate:** S
**Priority:** Should

### Story S6: Projections for the later views
**As a** the T5 views track
**I want** the state mapped through `projectStudentVisualization` and `projectTeacherVisualization`
**So that** T5 builds screens on a tested data shape

**Acceptance Criteria:**
- Given a state, When the student projection runs, Then it returns the buckets mastered, ready, nearly ready, blocked, review due, and recommended next.
- Given a class, When the teacher projection runs, Then it returns the heatmap counts per objective and state for the class's students only.

**Estimate:** S
**Priority:** Should

### Story S7: Internal admin view
**As a** system admin
**I want** one internal page with a student's shadow state, fringe, last log rows, and readiness
**So that** I can calibrate the confidence values with real data

**Acceptance Criteria:**
- Given a SYSTEM user, When the page opens for a student, Then it shows the state per objective, the fringe, the last 20 shadow log rows, and the readiness per band.
- Given any other role, When the page is requested, Then the server refuses it.
- Given a secure test item in the evidence, When the page shows evidence, Then it shows the objective and never the item text (YLE track rule).

**Estimate:** M
**Priority:** Should

## Non-Functional Requirements

1. **Shadow mode:** no student, teacher, or parent screen changes in this track.
2. **Migrations:** additive only (one new FLAT table for the shadow log); no enum `ADD VALUE`.
3. **Load:** state computation for one student finishes in under 500 ms on the local machine with
   the full slice; the jobs respect the one-heavy-job rule of this machine.
4. **Tenancy:** every read and write is scoped by `schoolId`; the new table is classified.
5. **Docs:** JSDoc on every export; tests in the same change.

## Acceptance Criteria (track)

1. All seven stories meet their criteria, with tests.
2. On a clone of the ETL target with the tags backfill and `evidence:backfill --apply` done, the
   shadow job runs for every student with evidence, and the report gives the counts per state and
   the mean computation time.
3. `pnpm turbo run test`, `lint`, `check-types`, and `build` pass for the touched packages.
4. The owner checks the admin page before the merge.

## Dependencies

- T2 merged into integration (done, 146e46261).
- The shared worker registers the `primary.mastery.evidence` handler (open since T2); the shadow
  follow-up job needs the same worker.
- The ETL rerun on `primary_legacy_20261007` into `primary_etl_20261007`, then the tags backfill and
  the evidence backfill, for the verification data.
- A migration window after the freeze, chosen by the owner.

## Out of Scope

- Recommendations shown to students (T4) and the student, teacher, and parent views (T5).
- Grammar nodes (D12 grammar track) and Speaking and Writing objectives; S1 only makes the slice
  ready to accept new domains.
- Evidence from YLE task answers (YLE track story S9).
- Changes to the confidence values of `primary-evidence.v1`.
