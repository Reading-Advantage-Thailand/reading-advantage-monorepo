# Spec — Primary Mastery Evidence (T2 of the Primary Mastery Graph Program)

Track ID: `primary_mastery_evidence_20261006`
Type: feature
Program: [primary-mastery-graph-program](../../primary-mastery-graph-program.md) (track T2)
Branch: `primary/lane-h-objective-tags` continues as the lane for this track (worktree
`~/Desktop/rama-worktrees/lane-h`, on `primary-parity-integration`); T1 is merged there
(bcc0ddbdc, 5227d53b5).
Owner decisions (2026-10-06): the ten decisions in program section 8 are approved. For this
track: decision 1 (teacher-led mode records evidence only; independent mode adapts from May
2027), decision 2 (the confidence values in program section 4.2 are the starting values;
shadow-mode data tunes them), decision 3 (`userWordRecords` stays the one FSRS store for
vocabulary; `masteryCards` holds GSE objective cards only), decision 6 (T2 waits for the
game surfaces: the 3D games port merged into `primary-parity-integration` on 2026-10-06, so
the game adapter is no longer blocked; the question and flashcard adapters never were).
Created 2026-10-06 at the owner's request ("Create track T2") from the approved program;
no further questioning round, the program answers the spec questions.

## Context

T1 gives every tagged article, question, and glossary word its graph node
(`primary_article_objectives`, `primary_question_objectives`, `primary_article_word_nodes`;
read functions `getArticleObjectives`, `getQuestionObjectives`, `getArticleWordNodes`).
Nothing writes mastery evidence for a Primary student yet. The canonical evidence path
exists: `buildActivityMasteryCommand` (packages/domain/src/activity) builds one
`practice.v1` command per objective and `commitMasteryEvidence` (packages/domain/src/mastery)
persists it with an idempotency key, SRS card updates, and `masteryReviews` rows that carry
`stateBeforeJson` and `stateAfterJson`. The tables `masteryCards`, `masteryReviews`,
`masteryEvidence`, and `masteryCommits` are FLAT (school-scoped).

The three Primary sources today:

| Source | Row | What it holds | Gap |
|---|---|---|---|
| Question step | `userActivity` (written by `apps/primary-advantage/actions/question.ts`) | `targetId` = article id, `activityType`, `timer`, `details` jsonb with question text, the answer, `score`, `responses` | No question id, no first-try flag, no hint flag, no mode |
| Flashcard review | `cardReviews` + `userWordRecords` (FSRS, written by the review route and `actions/flashcard.ts`) | rating 1-4, time spent, the word record | No node; the word joins to `primary_article_word_nodes` by article and word |
| Game run | `gameCompletions` (`recordGameCompletion`, packages/domain/src/games/mutations.ts) | `metadata.learningEvidence` already accepts `storyGameEvidence` items (`game-contracts`), `itemId` round-trips | Nothing reads the items |

`userActivity`, `cardReviews`, and `userWordRecords` are REFERENTIAL (no `schoolId`;
scoped through `users.schoolId`). `durable_jobs` exists in `packages/db/src/schema/jobs.ts`.

Shadow mode (program 4.1): every surface emits evidence, nothing adapts, no screen changes.
This track is the "emit evidence" half. Reading the state (T3), recommending (T4), and the
views (T5) come after.

## Functional Requirements

- FR-1 (evidence policy as data): `packages/domain/src/primary-mastery/evidence-policy.ts`
  holds the matrix of program section 4.2 as a versioned constant with a Zod contract:
  per surface (`mcq`, `saq`, `laq`, `flashcard`, `game`, `expedition`, `cloze`, `matching`,
  `order-words`, `order-sentences`) the objective source, the rating rule, the confidence,
  and whether the evidence may count toward `mastered`. Rules: teacher-led MCQ 0.5 instead
  of 0.8; a hint, a reveal, or an open translation panel before the answer lowers the
  confidence one step (0.8 to 0.5, 0.5 to 0.3); a blank answer or an answer under two seconds
  records no evidence; a listening objective (`L` short id) is skipped when the step reports
  that the article audio did not play (`audioPlayed: false`; a row without the key, legacy or
  from a screen that does not track audio yet, keeps its evidence); LAQ and Reedy record
  nothing. A pure function
  `rateEvidence(surface, outcome, context)` returns the rating, the confidence, and
  `counts`, or a skip with its reason (`no-evidence`, `too-fast`, `blank`,
  `listening-without-audio`).
- FR-2 (source event contracts): Zod schemas for the three source events, each carrying the
  source table and row id for idempotency:
  `questionAnswerEvent` (userId, articleId, questionId, questionType, mode `teacher_led` |
  `independent`, correct or score ratio, firstTry, hintUsed, audioPlayed, answerMs),
  `flashcardReviewEvent` (userId, articleId, word, rating, timeSpentMs), and
  `gameCompletionEvent` (userId, gameId, articleId or null, items from `storyGameEvidence`:
  itemId, kind, outcome, attempts). Types infer from the schemas.
- FR-3 (`recordPrimaryEvidence`): one domain function `recordPrimaryEvidence({ db, tenant,
  event, persistence?, now? })` that resolves the objectives or nodes of the event through
  the T1 read functions (question objectives by question id; glossary nodes by article and
  word; game items by item id through `userWordRecords` to the word, then the article's
  word nodes; expedition question items by question id), applies FR-1, builds one
  `practice.v1` envelope per objective with `buildActivityMasteryCommand` (`variantKey` in
  `mcq`, `saq`, `flashcard`, `game:<gameId>`, `expedition`, `cloze`), and commits through
  `commitMasteryEvidence` with idempotency key `<sourceTable>:<rowId>:<itemId>:<objectiveId>`.
  Returns the receipts and a list of skipped items with a reason (`no-tag`, `no-evidence`,
  `listening-without-audio`, `unknown-item`). A replay returns the same receipts and writes
  nothing. The state before and after each commit lands in `masteryReviews`
  (`stateBeforeJson`, `stateAfterJson`) for the "what changed" view of T5.
- FR-4 (vocabulary rule, decision 3): a flashcard or game item that resolves to a vocabulary
  node records evidence against that node with the FR-1 confidence; the FSRS schedule stays
  in `userWordRecords` and this track never writes `userWordRecords` or creates a
  `masteryCards` row for a word. An off-list word (no node) is skipped with `no-tag`.
- FR-5 (the three source adapters and the job): the request paths enqueue, they never
  commit. (a) The question action records `questionId`, `questionType`, `mode`, `firstTry`,
  `hintUsed`, `audioPlayed` in `userActivity.details` (additive jsonb keys; the UI already
  knows them at submit time) and enqueues after its existing write. (b) The flashcard review
  route enqueues after the FSRS write. (c) `recordGameCompletion` enqueues when
  `metadata.learningEvidence` parses as `storyGameEvidence`. The job is one `durable_jobs`
  row of kind `primary.mastery.evidence` with payload `{ sourceTable, rowId }`; a handler
  `runPrimaryEvidenceJob({ db, job })` loads the row, builds the event, and calls FR-3. One
  game run (up to 200 items) is one job. Phase 0 confirms the durable job runner API; if no
  runner exists, the handler is a domain function `processPrimaryEvidenceJobs({ db, limit })`
  that a worker or cron loop calls, and the request path inserts the row directly.
- FR-6 (tenant scope): every write goes through TenantDB with the student's `schoolId`
  (`masteryCards`, `masteryReviews`, `masteryEvidence`, `masteryCommits`, `durable_jobs`
  tenant mode). Reads of the REFERENTIAL sources use `unscoped(reason)` and verify the row's
  `userId` belongs to `tenant.schoolId` through `users.schoolId` before any write. The T1
  link tables are global (EXEMPT) and need no scope.
- FR-5d (evidence is kept, owner rule 2026-10-06): a quiz row saved before this track (no
  `details.questions`) still yields evidence. The adapter matches each `responses[].question`
  text (MCQ) or `details.question` (SAQ) against the article's question rows with the tags
  backfill's text rule, takes `answer === isCorrect` as the MCQ outcome and `score / 5` as the
  SAQ ratio, records the row at the teacher-led confidence (mode unknown, conservative), and
  counts unmatched texts as skipped. A one-time script enqueues one job per existing quiz row,
  flashcard review, and story game run so the past replays through the same path; it is
  idempotent by row id and runs once after the cutover ETL.
- FR-7 (no adaptation, no UI): this track changes no screen and shows no recommendation. The
  Class Quest keeps reading completions; it never writes evidence. Teacher-led steps record
  evidence at the teacher-led confidence and nothing else changes in the lesson.
- FR-8 (evidence summary for calibration): `summarizePrimaryEvidence({ db, tenant, since })`
  returns counts per surface, per day, and per confidence step, plus the skipped reasons, so
  the T3 internal admin page and the shadow-mode tuning (decision 2) have data.

## Non-Functional Requirements

- No schema change is expected: `masteryReviews` already carries the state JSON columns and
  `durable_jobs` exists. A new column, if Phase 0 finds one necessary, is additive with the
  `primary_` prefix and ships as the next migration after `0070`.
- Idempotent by construction: the idempotency key is derived from the source row and item;
  a second run of a job writes nothing and returns the same receipts.
- Off the request path: the question, flashcard, and game writes add one job insert each
  and no mastery computation.
- One job handles up to 200 items in one transaction; larger runs are rejected with a
  structured error, not split.
- The Tutor read test stays green (no change to the tables Tutor reads).
- Tests use `createInMemoryMasteryPersistence` and the mock DB; no real Postgres in unit
  tests. The local run uses `primary_advantage_laneh`.

## Acceptance Criteria

1. `rateEvidence` returns the matrix values of program 4.2 for every surface and mode, lowers
   one step on a hint, and returns `null` for a blank answer, an answer under two seconds,
   an LAQ, and a listening objective without audio (unit tests, one per rule).
2. `recordPrimaryEvidence` on a sample MCQ event with two objectives commits two
   `practice.v1` commands with `variantKey: "mcq"`, confidence 0.8 in independent mode and
   0.5 in teacher-led mode, and a replay writes nothing (in-memory persistence test).
3. A flashcard event for a glossed word commits against its vocabulary node; an off-list
   word is skipped with `no-tag`; `userWordRecords` is untouched.
4. A game completion event with 20 `storyGameEvidence` items commits one command per
   resolved node at confidence 0.4 with `variantKey: "game:<gameId>"`.
5. The three request paths insert one `durable_jobs` row each (mock DB tests on the domain
   functions; the question action test asserts the new `details` keys).
6. Local run on `primary_advantage_laneh`: answer one MCQ of a tagged article through the
   action, run the job, and read one `masteryEvidence` row per objective with the right
   confidence; run the job again and the row count stays the same.
7. `summarizePrimaryEvidence` returns the counts for the local run.
8. `pnpm turbo run test` for `packages/domain` is green; `tsc` and `eslint` are clean; the
   tenant-coverage test passes with the new module.

## Out of Scope

- Reading the knowledge state, cold start, projections, the shadow recommendation log, the
  internal admin view (T3).
- Article and activity recommendation, `PracticeInput` from the due set (T4).
- Student, teacher, and parent views (T5).
- Any `game-contracts` change; the optional item `tags` field stays deferred.
- Mirroring words into `masteryCards` (decision 3 keeps `userWordRecords`).
- Adaptation inside a teacher-led lesson, extra check questions, prompts on the article page.
- Tuning the confidence values (decision 2: shadow data first).
