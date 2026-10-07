# Primary Mastery Graph Program: the student graph in practice and gameplay, and recommendations in independent mode

Version: 0.3
Date: 2026-10-06
Status: The owner approved the ten decisions in section 8 on 2026-10-06. Track T1 (`primary_objective_tags_20261006`) is implemented on branch `primary/lane-h-objective-tags` and merged into `primary-parity-integration` the same day. Track T2 (`primary_mastery_evidence_20261006`) is created on 2026-10-06; T3 to T5 wait for T2.
Owner: Daniel Bo
Strategy source: `advantage-pr/08-strategy/product-strategy-2026-2027.md` section 4
(tag, then shadow mode in semester 2 2026, then adaptive in May 2027; approved 2026-09-30).
Engine source: `~/Desktop/mastery-advantage/SPECIFICATION.md` (`kst-srs.v3.2`).
Semester-2 context: `chibi-quest-primary-program.md` and `primary-tutor-parity-program.md`
on `primary/lane-f-reedy-preview`.

## 1. Goal

Two outcomes for Primary Advantage:

1. Every student has a knowledge state (a graph of GSE objectives and vocabulary nodes).
   Questions, flashcard reviews, practice games, and expeditions update it.
2. In independent mode, the graph recommends the next article and the next activity.
   In teacher-led mode, the graph records evidence and changes nothing.

Both outcomes follow the approved path: tag the content first, run shadow mode in
semester 2 (evidence flows, nothing adapts), and switch on recommendations in May 2027.

## 2. What exists today (verified 2026-10-06)

### 2.1 Engine and persistence (in the monorepo)

| Piece | Where | Use in this program |
|---|---|---|
| SRS to KST bridge and fringe | `packages/knowledge-space-core/src/srs-bridge.ts` (`buildKstState`) | Builds the student state and the outer fringe from cards and evidence |
| Planner | `packages/knowledge-space-practice/src/planner/recommended-next.ts` (`planRecommendedNext`) | Ranks ready objectives with review-load gating |
| Projections | `packages/knowledge-space-practice/src/projections/` (`projectStudentVisualization`, `projectTeacherVisualization`, `projectActivityMap`) | Student map buckets (mastered, ready, nearly ready, blocked, review due, recommended next) |
| Mastery service | `packages/domain/src/mastery/` (`commitMasteryEvidence`, Drizzle adapter) | The one write path for learner evidence |
| Mastery tables | `packages/db/src/schema/mastery.ts` (`masteryCards`, `masteryReviews`, `masteryEvidence`, state, placement) | Already tenant-scoped by `schoolId`; used by Codecamp and Sales |
| Activity projection | `packages/domain/src/activity/activity-mastery-projection.ts` (`buildActivityMasteryCommand`) | Turns one `practice.v1` submission into an idempotent mastery commit |
| Runtime governance | `packages/mastery-runtime-compat/runtime-manifest.json` | Any contract or graph major change updates it first |

### 2.2 Graphs and level maps (in `~/Desktop/mastery-advantage/english/`)

| Data | Size | Note |
|---|---|---|
| `gse-knowledge-space.json` | 2,172 nodes; 427 Reading, 370 Listening, 848 Speaking, 516 Writing skills | `reviewStatus: draft`; prerequisite edges come from GSE score distance |
| `cefr-vocabulary/cefr-vocabulary-knowledge-space.json` | 3,752 lexical nodes (YLE Starters, Movers, Flyers, A2 Key, B1 Preliminary) | No prerequisite edges; SRS-primary domain |
| `gse-to-primary-advantage.csv` | GSE 10-70 to Primary levels 1-14 | Cold-start seed and map regions |

### 2.3 Tags in the content (in `~/Desktop/Workbooks`)

| Fact | Evidence |
|---|---|
| Every lesson package carries `tags.targetObjectives`, `tags.supportingObjectives`, `glossedNodes`, `recycledNodes` | `dashboard/lib/lesson-package/schema.ts` (`TagsSchema`) |
| Every bank question (MCQ, SAQ, LAQ) carries `objectives: string[]` | 250 packages, 5,000 questions, 5,000 with objectives (count on 2026-10-06) |
| Objective short IDs map to GSE nodes | `docs/content-plans/data/a0-objective-key.json` (52 objectives: 24 Reading, 28 Listening) and `a1-objective-key.json` (86 objectives: 48 Reading, 38 Listening) |
| 79 distinct target objectives are in use across the 250 packages | Coverage gaps are listed in `a0-tagging-2026-09-30.json` (`uncovered_objectives`, `weak_objectives`) |
| 222 packages carry `glossedNodes` (vocabulary node ids such as `english.vocabulary.skill.kitten.noun`); 41 carry `recycledNodes`; the 28 printed-book packages (Origins 2, Origins 3.1, E12) have none | Vocabulary nodes are tagged for the new books, not for the printed ones |
| Each printed-book package records the legacy database IDs of its article and questions | `db.legacy.articleId`, `db.legacy.mcq[...]` |

### 2.4 Tags in the monorepo

- The monorepo importer (`packages/domain/src/primary-books/mapping.ts`, `toLessonPackageJson`)
  keeps `tags` and the bank with per-question `objectives` inside `primary_book_lessons.package`
  (jsonb).
- The question tables (`multiple_choice_questions`, `short_answer_questions`,
  `long_answer_questions`) have no objective column. `student_answers` records one row per
  question with `isCorrect` and `score`.
- Articles carry `cefrLevel` only.

### 2.5 Evidence surfaces in Primary

| Surface | Today | Per-item evidence |
|---|---|---|
| Comprehension questions (lesson step and the read page) | `student_answers` rows | Yes, per question |
| Flashcard review | `userWordRecords` (`packages/db/src/schema/progress.ts`) holds full FSRS fields (stability, difficulty, due, state, reps, lapses); `actions/flashcard.ts` uses `ts-fsrs` with four ratings; `card_reviews` keeps the rating history | Yes, per word |
| Practice games (28 cartridges) | Take a `PracticeInput` (vocabulary, sentences) from any source; Primary passes the saved flashcards in FSRS due order with the record ids as item ids | `storyGameEvidence` items carry `itemId`, `attempts`, `correctFirstTry`, `solved`; only the run summary (`accuracy`, `correctAnswers`) lands in `game_completions` today |
| Expedition (Monster Encounters) | Takes one `StoryInput`; wave 2 of the Chibi Quest program ports it | Same evidence shape; `itemId` round-trips unchanged |
| Workbook practice (cloze, matching, order words, order sentences) | `cloze_test_games` and activity logs | Partial |
| Reedy | Scores only, no transcript | None for the graph |
| Class Quest | Goal kinds: reading-days, accuracy, streak, lesson-steps | Reads completions; writes none |

Class books have `mode = teacher_led | independent`
(`packages/db/src/schema/primary-books.ts`). In teacher-led mode the app unlocks a step
only after the teacher marks it. In independent mode all 14 steps are open.

## 3. Peer answers (2026-10-06)

- **reading-advantage-monorepo-e5** (RPG skin, lane-f): no overlap with questions,
  flashcards, completions, or quest logic. Story evidence persistence is not verified.
  Base a semester-2 track on `primary/lane-f-reedy-preview`. The merge order lane-f, then
  `primary-parity-integration`, then `master` is a proposal, not an owner decision.
- **advantage-forge-c0**: practice games accept a `PracticeInput` from any source, so due
  SRS items need no new entry point. Monster Encounters takes one story only. Item schemas
  are strict, but `itemId` comes back unchanged, so objective and node ids can be keyed by
  `itemId` on the server. Only the final result reaches the host (per-run evidence).
  `game-contracts` is monorepo-owned; Forge mirrors it. Nothing pending changes the contracts.
- **workbooks** (session in `~/Desktop/Workbooks`, owner of the lesson packages and the legacy
  injector): confirmed the tags are lost on import and that no monorepo table links content to
  objectives. It builds an export, `content/primary/tags.json`, with one entry per package:
  key, level, legacy article and question ids when injected, objectives as short id and GSE
  node id with role, vocabulary nodes with role, and the objectives per question. It proposes
  no legacy database change before the cutover. Workbooks files are edited by that session
  only; send it the change.
- **advantage-pr-19**: the tag, shadow, adaptive path is committed and approved. No document
  defines which surfaces emit evidence in shadow mode, and no document has a teacher-led rule
  beyond "nothing adapts". Nobody is drafting Q-UX-01, 02, 05, 06; proposals are welcome.
  Constraints: A2 ceiling (levels 1-9), the printed books are the contract, external copy says
  CEFR only. The RPG skin (`docs/primary-rpg-skin.md` on lane-f) already decides parts of
  Q-UX-06.

## 4. Design: how practice and gameplay adjust the graph

### 4.1 Mode rule (proposed resolution of Q-UX-05 and the shadow-mode definition)

| Mode | Evidence | Adaptation |
|---|---|---|
| Teacher-led lesson (class book, `teacher_led`) | Recorded at every step, with teacher-support confidence | None. The 13 steps, the question set, and the order stay fixed. No recommendation appears inside a lesson. |
| Independent (independent class book, the read page, flashcards, practice games, expedition, home) | Recorded | Shadow in semester 2: recommendations are computed and logged, not shown. Shown from May 2027. |
| Reading Mode (the article page in both modes) | None | None. No prompt, no pop-up, no question on the article page. |

Shadow mode means: every surface in the table emits evidence, the engine computes the
state and the recommendation after each event, and a log row records what it would have
shown. The student sees the same screens. An internal admin page shows the shadow state for
calibration.

### 4.2 Evidence matrix (proposed resolution of Q-UX-01)

One rule set, applied per item:

| Surface | Objective source | Rating | Confidence | Counts toward mastered |
|---|---|---|---|---|
| MCQ, independent | The question's `objectives` | First try correct: Good. Wrong: Again. | 0.8 | Yes (direct variant) |
| MCQ, teacher-led | Same | Same | 0.5 | Yes, at the lower weight |
| SAQ (rubric score exists) | The question's `objectives` | Score ratio: 1.0 Good, 0.5-0.9 Hard, under 0.5 Again | 0.7 | Yes |
| LAQ | The question's `objectives` | Practice only | 0.0 | No |
| Flashcard review | Vocabulary node of the word (lemma and part of speech) | The student's rating passes through | 0.7 | Vocabulary domain only |
| Practice game item | Vocabulary node by `itemId` (word record id) | First try correct: Good. Solved after retry: Hard. Unsolved: Again. | 0.4 | No (game evidence never completes mastery alone) |
| Expedition item | Word, fill, sentence items: vocabulary nodes by glossary. Question items: the question's `objectives`. | Same as games | 0.4 | No |
| Cloze, matching, order words, order sentences | The lesson's `supportingObjectives` | Correct ratio | 0.3 | No |
| Reedy | None | None | - | No |

Rules that hold on every surface:

- A single correct answer never sets `mastered`. The v3.2 thresholds and the minimum
  evidence count apply.
- A hint, a reveal, or an open translation panel before the answer lowers the confidence
  by one step (0.8 to 0.5, 0.5 to 0.3).
- A blank answer, or an answer in under two seconds, is low information. It records no
  evidence.
- Listening objectives on a question (for example `L19.2`) count when the article audio
  played during the step. Otherwise the listening tag is skipped for that item.
- The Class Quest reads completions and evidence. It never writes evidence.

### 4.3 Tags: the join between content and graph (the "tag" step)

Additive tables, `primary_` prefix, classified in `tenant-registry.ts`:

| Table | Columns | Filled by |
|---|---|---|
| `primary_objective_key` | `shortId`, `nodeId`, `gse`, `skill`, `graphRelease` | A data package in the monorepo that copies `a0-objective-key.json` and `a1-objective-key.json` |
| `primary_question_objectives` | `questionId`, `questionType`, `objectiveShortId`, `graphRelease` | The lesson importer on every import; a one-time backfill script for the printed books that reads each Workbooks package and joins by `db.legacy` ids through `primary_legacy_id_map` |
| `primary_article_objectives` | `articleId`, `objectiveShortId`, `role` (`target` or `supporting`), `graphRelease` | The importer and the same backfill |
| `primary_word_nodes` | `articleId`, `word`, `pos`, `nodeId`, `role` (`glossed` or `recycled`) | The importer and the backfill from the `glossedNodes` and `recycledNodes` of each package. The 28 printed-book packages have none: Workbooks tags them, or a lemma matcher fills them. Off-list words get no node and stay personal cards. |

The source for the backfill is the Workbooks export `content/primary/tags.json` (one
entry per package, built by the workbooks session), joined to the monorepo rows through
`primary_legacy_id_map`. The "tag-only pass on the printed books" in the October break is
this export plus this backfill. It is not manual work. Online articles that have
no package (the legacy levels 1-4) stay untagged until the banks replace them. An untagged
article emits vocabulary evidence only.

### 4.4 Evidence pipeline

One domain function, `recordPrimaryEvidence`, in a new module
`packages/domain/src/primary-mastery/`:

1. Input: one source event (a `student_answers` row, a `card_reviews` row, or a
   `game_completions` row with its per-item evidence).
2. Resolve the objectives or nodes for each item from the tag tables.
3. Build one `practice.v1` envelope per objective (reuse `buildActivityMasteryCommand`), with
   `variantKey` in `mcq`, `saq`, `flashcard`, `game:<gameId>`, `expedition`.
4. Commit through `commitMasteryEvidence` with idempotency key `<sourceTable>:<rowId>:<itemId>`.
5. Run as a job (`packages/db/src/schema/jobs.ts`), not on the request path. A game run with
   up to 200 items is one job.

Two changes outside the new module:

- `recordGameCompletion` stores the `storyGameEvidence` items in `game_completions.metadata`
  (jsonb exists; no schema change).
- The question step and the flashcard action enqueue the job after their existing write.

Decision 3 in section 8 keeps `userWordRecords` as the one FSRS store for vocabulary. The
bridge reads vocabulary proficiency from it. `masteryCards` holds GSE objective cards only.
This avoids two schedulers for the same word.

### 4.5 Reading the graph

`getStudentKnowledgeState({ db, user })`:

1. Load the student's `masteryCards` and evidence, and the vocabulary proficiency from
   `userWordRecords`.
2. Load the graph slice: young-learner Reading and Listening objectives within GSE 10-70,
   plus the vocabulary nodes of the Starters, Movers, and Flyers lists.
3. Call `buildKstState`. Return the state map and the outer fringe.
4. Cold start: a student with no evidence gets objectives below the level's GSE range as
   `inProgress` with low confidence, never `mastered` (integration plan section 4.1).

Projections for the screens: `projectStudentVisualization` for the world-map region markers
and the "ready next" list, `projectTeacherVisualization` for the class view,
`projectParentVisualization` for the report.

## 5. Design: how the graph recommends in independent mode

### 5.1 Article recommendation (proposed resolution of Q-UX-02)

Inputs: the outer fringe, the objectives with cards due, the due vocabulary set, the
student's level, the class-book pointer, and the last ten articles read.

Candidate set: tagged articles at level `L-1` to `L+1`, in the student's independent books
and the online banks, under the A2 ceiling. A lesson of a teacher-led book is never a
candidate before the class pointer reaches it.

Score per article:

```
score = w1 * |targetObjectives ∩ ready|
      + w2 * |supportingObjectives ∩ reviewDue|
      + w3 * |articleWords ∩ dueWords|
      - w4 * recentlyRead
```

The planner (`planRecommendedNext`) orders the ready objectives first; the score then maps
objectives to articles (`projectActivityMap` treats an article as the activity of its target
objectives). The home screen shows three choices, each with one reason sentence in Thai and
English ("This story practices: ..."). The student can always browse instead.

Fallbacks: a student with no evidence gets the level-based choice of today. An untagged
article is recommended on vocabulary overlap only.

### 5.2 Activity recommendation after an article

The order is fixed: read, then the questions. After the questions the engine picks one next
activity:

| Condition | Recommendation |
|---|---|
| Five or more words due | Flashcard review (the training yard) |
| Words due and a practice game available | One practice game, with `PracticeInput` built from the due set (10 words, 8 sentences) |
| The article has a story package | The expedition |
| A supporting objective is nearly ready | Cloze or matching on that article |

The engine logs its choice in shadow mode and shows it from May 2027.

### 5.3 Interruption and stopping rules

- No prompt on the article page in either mode.
- In semester 2 the question set and its order stay as the bank defines them.
- From May 2027, independent mode may add at most one extra check question after a wrong
  answer, and only when the objective has fewer than three evidence rows.
- No screen is locked because the knowledge state is uncertain.

### 5.4 Gameplay specifics

- Practice games already read the saved words in FSRS due order. That host path is the
  right surface; the change is on the server: map each `itemId` to its node on completion.
- The expedition's story item ids map through the glossary (`primary_word_nodes`) and the
  question ids map through `primary_question_objectives`.
- No `game-contracts` change is required in semester 2. An optional `tags` field on items
  is deferred; if wanted later, change `game-contracts` first and tell the Forge session.
- The world map keeps `users.level` for the region. The region marker for "ready next" and
  "review due" is page chrome (pin and banner exist in `rpg.css`), no new Forge asset.

### 5.5 Teacher-led mode: what the graph gives the teacher

The lesson does not change. The class view (later, with `projectTeacherVisualization`) shows
class readiness for the next lesson's target objectives and the objectives most due for
review. It is a teaching aid, not an adaptation.

## 6. Design: views for students and teachers

No app renders the graph projections today. `projectStudentVisualization`,
`projectTeacherVisualization`, and `projectParentVisualization` exist in
`packages/knowledge-space-practice` with no consumer. The views below are new screens that
consume those projections. UI components read the projection payloads only, never the raw
graph file (the projection module states this rule).

Rules for every view (strategy section 5, the RPG skin rules, and the outcome-claims policy):

- Show a small local region, never the full graph. Thousands of nodes overwhelm a child and
  imply a precision the draft graph does not have.
- Student copy uses child language in Thai and English. Objective titles are rewritten;
  the GSE id stays internal. Milestones show CEFR names only.
- Five states and five words: mastered, learning now, ready next, due for review, locked.
  The same five words appear on every screen for students, teachers, and parents.
- No ranking of students on any shared screen. The teacher view ranks objectives, not
  children.
- Evidence counts and confidence are visible to the teacher, not to the student.
- In shadow mode the student views show the knowledge state as it is. They show no
  recommendation until May 2027 (section 4.1).

### 6.1 Student views

| View | Place in the RPG skin | Content | Projection |
|---|---|---|---|
| Map region card (home and the Me tab) | guild-hall, inn | The student's region on the world map with three counters: mastered, learning now, ready next. One tap opens the skill page. | `projectStudentVisualization` buckets, counted |
| Skill page ("My skills") | observatory (reports) | The local region: the objectives of the student's level and one level each side, grouped by CEFR land. Each objective is a card with its state word and a child-language title. A "due for review" row at the top when cards are due. Tap a card: what it means, one example from a story read, and the stories that practice it. | `projectStudentVisualization` plus `projectActivityMap` for the story list |
| What changed (after an activity) | the result screen of questions, games, and the expedition | One line per objective that moved state, in the five words. At most three lines. No line when nothing moved. | The state diff before and after the commit (T2 records both revisions) |
| Why this story (May 2027) | the home choice set | One reason sentence per recommended story: the ready objective or the due words it practices. | The recommendation log row |

The skill page replaces the node-count view of a knowledge map with a card list. A map
drawing with edges is optional and comes later, if at all.

### 6.2 Teacher views

| View | Where | Content | Projection |
|---|---|---|---|
| Class skill heatmap | `teacher/reports` (class tab) | Rows are the objectives of the class book's current and next two lessons plus the level's objectives. Columns are the five states. A cell shows the count of students. Tap a cell: the student names in that state. | `projectTeacherVisualization.heatmap` |
| Next lesson readiness | `teacher/my-classes/<class>` and the lesson guide (D+E track) | For the next lesson's target objectives: how many students are ready, how many lack a prerequisite, and which prerequisite. One sentence of teaching advice per gap ("Review X before step 2"). | `heatmap`, `prerequisiteGaps`, `bottleneckNodes` |
| Review-due list | `teacher/dashboard` (help list) | The objectives and words most due across the class, so the bell-ringer game can target them. | `reviewDue` counts per objective |
| Student skill profile | `teacher/student-progress/<id>` | The same local region as the student's skill page, plus the evidence count, the confidence, the last evidence date, and the source (question, flashcard, game) per objective. | `projectStudentVisualization` and the evidence rows |
| Parent report line | the existing student report export | One can-do summary, one next focus, and the progress trend, in Thai. | `projectParentVisualization` |

The teacher views use the existing report permissions (`REPORT_PERMISSIONS`) and the class
scope of `getClassAnalytics`. Every query is tenant-scoped.

### 6.3 Data the views need

- The knowledge state per student (`getStudentKnowledgeState`, T3), cached per student
  with a timestamp and refreshed by the evidence job.
- Child-language objective titles in Thai and English: one data file per objective short
  id, authored once in the Workbooks repo beside the objective keys and imported with them
  (T1 carries the columns `titleEn`, `titleTh`, `exampleEn`).
- A class readiness summary per objective, computed on read from the cached student
  states. A class of 40 students over about 140 objectives is a small join.
- The state diff per commit for "what changed": T2 stores the state revision before and
  after in `masteryReviews` (already in the schema as `stateBeforeJson` and
  `stateAfterJson`).

## 7. Proposed tracks (semester 2 order)

| Order | Track | Content | Depends on | Size |
|---|---|---|---|---|
| T1 | `primary_objective_tags_20261006` | The four tag tables, the objective-key data package, the importer change, the printed-book backfill script, a coverage report | None. Data and importer only; safe to start now. | M |
| T2 | `primary_mastery_evidence_20261006` | `recordPrimaryEvidence`, the three source adapters, story evidence in `game_completions.metadata`, the job, the confidence table, tenant classification, tests | T1; the cutover decision D4 for the game surfaces | L |
| T3 | `primary_knowledge_state_20261007` (created 2026-10-07) | `getStudentKnowledgeState`, cold-start seed, projections, the shadow recommendation log, the internal admin view | T2 | M |
| T4 | `primary_independent_recommendations_20261006` | Article and activity recommendation on the home and read pages behind a flag (shadow until May 2027), `PracticeInput` from the due set, reason copy in en and th | T3 | L |
| T5 | `primary_progress_views_20261006` | Student views: map region card, skill page, "what changed"; teacher views: class skill heatmap, next lesson readiness, review-due list, student skill profile; parent report line; child-language objective titles | T3; the map region card also needs `primary_expedition_loop_20261005` | L |

Rules for every track: schema additive with the `primary_` prefix; the Tutor read test
stays green; business logic in `packages/domain`; tests first; one heavy job on the machine
at a time; base branch `primary/lane-f-reedy-preview` until the owner confirms the merge
order.

## 8. Decisions for the owner

1. **Mode rule.** Teacher-led mode records evidence only. Independent mode adapts from May
   2027. Approve or change.
2. **Evidence matrix.** Approve the confidence values in section 4.2 as starting values.
   Shadow-mode data tunes them.
3. **Vocabulary scheduler.** Keep `userWordRecords` as the one FSRS store (recommended), or
   mirror words into `masteryCards`.
4. **Backfill.** Tag the printed books by script from the Workbooks packages through the
   legacy ids. Legacy online articles stay untagged until the banks replace them.
5. **Recommendation boundary.** Levels `L-1` to `L+1`, never ahead of the class pointer in a
   teacher-led book, three choices plus browse.
6. **Start.** T1 may start now. T2 waits for the cutover decision D4 on games.
7. **Names.** Thai and English names for "Ready next" and the skill map (student copy says
   CEFR only, never GSE or YLE).
8. **Open questions.** After approval, the advantage-pr session records the resolutions of
   Q-UX-01, Q-UX-02, and Q-UX-05 from sections 4.2, 5.1, and 5.3.
9. **Views.** Approve the view set in section 6 and its order: the teacher heatmap and the
   student skill page first, then the readiness and "what changed" views. Confirm that
   student views show the state in shadow mode (section 6, last rule) or stay hidden until
   May 2027.
10. **Titles.** Who writes the child-language objective titles in Thai and English: the
    Workbooks authors beside the objective keys (recommended), or the monorepo track.

## 9. Risks

- The GSE graph is `draft` and its edges are heuristic. Readiness is approximate until
  shadow data calibrates it.
- 79 distinct target objectives are in use out of 138 in the keys. Some objectives will
  have no article. The coverage report in T1 lists them for the Workbooks authors.
- The 28 printed-book packages have no vocabulary node tags. Either Workbooks tags them or
  a lemma matcher fills them; matcher output needs a sample check.
- The backfill depends on the cutover copying the legacy question ids into
  `primary_legacy_id_map`.
- Listening tags on reading questions need the audio-played signal. Without it, listening
  evidence is skipped.
