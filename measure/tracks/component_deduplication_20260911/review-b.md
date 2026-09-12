# Independent Review B: Reading Component Deduplication

- Track: `component_deduplication_20260911`
- App: `apps/reading-advantage`
- Review date: 2026-09-12
- Reviewer: Review B (independent of `plan-review.md`)
- Scope: current working-tree source of the listed quiz, matching, and rating
  files. This review ignores unrelated APK dirty files. This review made no
  source edit and no commit.

Review A (`plan-review.md`) gave STOP. The High finding was that story quizzes
ran the article completion check. Review A also asked to hide the vocabulary
matching hero images. This review checks those two repairs and Finding 2.

The High repair and the hero-image repair exist in the working tree. They are
not in a commit. Finding 2 is open.

## Requested checks

| Check | Result | Evidence |
| --- | --- | --- |
| 1. Article completion check is guarded with `!isStory` on MC, SA, and LAQ cards | Pass | `mc-question-card.tsx:214`, `sa-question-card.tsx:135`, `laq-question-card.tsx:144` |
| 2. Vocabulary matching passes `showHeroImages={false}` | Pass | `tabs-vocabulary.tsx:57`; `matching.tsx:49`, `:120`, `:262` |
| 3. Finding 2 (chapter rating still four sequential fetches) | Open | `rating-popup.tsx:76`, `:153`, `:173`, `:184`, `:214` |

### Check 1

The stories page still passes `page="article"` to the MC card and the SA card
(`stories/[storyId]/[chapterNumber]/page.tsx:72` and `:82`). The LAQ card takes
`variant="story"` and no `page` (`:93`). Each card now skips the article
completion hook when `isStory` is true.

- MC: `state === QuestionState.COMPLETED && page === "article" && !isStory`
- SA: `state === QuestionState.COMPLETED && page === "article" && !isStory`
- LAQ: `state === QuestionState.COMPLETED && !isStory`

The MC card still runs `checkStoryCompletion` when `isStory` is true
(`mc-question-card.tsx:228`). That path is the story path. It is not the
article path that Review A blocked.

### Check 2

`matching.tsx` declares `showHeroImages?: boolean` and defaults it to `true`.
The ninja image and the knight image render only when `showHeroImages` is true
and `correctMatches.length !== 10`. The vocabulary tab passes
`showHeroImages={false}`. The sentence tab at `components/tabs.tsx:69` passes
no prop, so it keeps the images. Both call sites now match the old views.

### Check 3

The chapter submit path still waits for four fetches in sequence, then it
calls `router.refresh()`. The article path still uses `submitRating` and local
state. FR-8 stays partly implemented. This finding does not block the phase.

## Findings

### 1. Medium — FR-8 chapter path still fires four sequential fetches (Review A Finding 2, open)

Evidence: `apps/reading-advantage/components/rating-popup.tsx:76`, `:153`,
`:173`, `:184`, `:214`.

The merge repairs the article refetch. The chapter path keeps the old chain:

1. GET `/api/v1/users/<id>/activitylog` on mount (`ratedFetch`)
2. POST ChapterRating
3. PUT `/api/v1/stories/<storyId>/<chapterId>`
4. POST ChapterRead

The browser then runs `router.refresh()`. A student who rates a chapter waits
for four serial round-trips and a route refresh. The wait matches the deleted
`chapter-rating-popup.tsx`. The spec item stays open.

### 2. Medium — The new story completion test does not reach COMPLETED

Evidence: `apps/reading-advantage/__test__/quiz-cards-progress.test.tsx:187-206`
and `:54-79`.

The new test renders the story variant with `page="article"`. It starts the
quiz. It answers the first option. The mock payload has five questions and
`state: 1` (INCOMPLETE). One answer cannot set `QuestionState.COMPLETED`. The
article completion effect runs only when `state === QuestionState.COMPLETED`.
The assertion `expect(checkArticleCompletion).not.toHaveBeenCalled()` stays
true when the `!isStory` guard is absent.

The production guard is correct. The test does not prove the guard. SA and LAQ
have no behavior test for the skip.

### 3. Low — The SA completion effect omits `isStory` from its dependency array

Evidence: `apps/reading-advantage/components/questions/sa-question-card.tsx:135-146`.
The effect reads `isStory`. The array is
`[state, userId, articleId, page, checkAndNotifyCompletion]`. The MC effect at
`mc-question-card.tsx:225` has the same gap. The LAQ effect lists `isStory`
(`laq-question-card.tsx:155`). `variant` does not change on a mounted card, so
the current call sites stay safe.

### Residual Review A findings (not re-opened as new defects)

These Review A items remain in the current tree. This review does not raise
their severity.

- Finding 4 (Medium): no Red-only test commit
- Finding 5 (Medium): most new tests are source-text assertions
- Finding 6 (Low): story quiz writes sessionStorage that no code reads
- Finding 7 (Low): article quiz no longer refreshes the route after completion
- Finding 8 (Low): rating toast uses a locally computed XP value
- Finding 9 (Low): one MC submit path hardcodes the article endpoint
- Finding 10 (Low): SA and LAQ use a conditional dependency array
- Finding 11 (Low): merged rating popup keeps a dead `disabled` prop
- Finding 12 (Low): GCS image URLs stay hardcoded

Review A Finding 1 is closed in the working tree. Review A Finding 3 is closed
in the working tree.

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 | Implemented | `components/stories-chapter-question/` is absent. The three cards take `storageKey` / `endpointBase` from `variant`. All three import `QuestionState` from `../models/questions-model`. The article completion check is now skipped for stories. |
| FR-2 | Implemented | `lib/use-quiz-progress.ts` owns quiz sessionStorage. The MC card has no `sessionStorage.` write and no `setTimeout` / `router.refresh` hack. |
| FR-3 | Implemented | One matching component with `fetchWords`. Vocabulary matching hides hero images. Sentence matching keeps them. |
| FR-4 | Implemented | `enroll-classes.tsx` has `mode`. `unenroll-classes.tsx` is absent. Line 173 calls `row.toggleSelected()`. |
| FR-5 | Implemented | `article-records-table.tsx` has `variant`. `reminder-reread-table.tsx` is absent. |
| FR-6 | Implemented | `classroom-student-table.tsx` serves the admin report and the teacher roster. |
| FR-7 | Implemented | `word-list.tsx` has `dataSource`. `stories-word-list.tsx` is absent. |
| FR-8 | Partly implemented | Shared `Dialog` and article local state are done. The chapter fetch chain stays. See Finding 1. |
| FR-9 | Implemented | `lib/translate-sentence.ts` is the one helper. |
| FR-10 | Implemented | `isAtLeastTeacher`, GCS audio URL, `CopyKeyButton`, and the teacher table shell exist. |
| FR-11 | Implemented | The listed dead files are absent, with the recorded `system-articles.tsx` keep. |
| NFR-1 | Implemented | No new dependency. Merged components use no lodash import. |
| NFR-2 | Met for the two Review A breaches | Story quizzes no longer run the article completion check. Vocabulary matching no longer shows the sentence hero images. |
| NFR-3 | Implemented | `graph.db` updates landed in the track range. |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 | Pass | `components/stories-chapter-question/` does not exist. The stories chapter page imports the shared cards. |
| AC-2 | Pass | One `useQuizProgress` hook owns quiz sessionStorage. No repair block and no timing hack remain in the three cards. |
| AC-3 | Pass | One matching component, one enroll component, one history table, one classroom-student table, one word-list dialog, and one rating popup exist. |
| AC-4 | Pass in substance | One helper exists. One forward `cn` to `zh-CN` map exists in `lib/translate-sentence.ts`. |
| AC-5 | Partly verified | FR-11 files are deleted. The full build gate cannot run cleanly on this dirty tree. |
| AC-6 | Pass for the requested suites | The command below reports 3 suites passed, 44 tests passed. |

## Plan Accuracy

- Phase 1 through Phase 3 stay marked complete. Phase 4 stays open.
- `metadata.json` still reads `"status": "new"` and `"actual_tasks": null`.
- The High repair and the hero-image repair are working-tree edits. They are
  not recorded in `plan.md`.

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest --testPathPatterns='quiz-cards-progress|component-dedup' --no-coverage
```

Output:

```
PASS __test__/component-dedup-part-b.test.ts
PASS __test__/component-dedup-static.test.ts
PASS __test__/quiz-cards-progress.test.tsx

Test Suites: 3 passed, 3 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        4.207 s
Ran all test suites matching quiz-cards-progress|component-dedup.
```

A first run from the repository root failed to parse TypeScript. That failure
is the root Jest config. It is not a product defect. The command above, from
`apps/reading-advantage`, is the valid run.

## Verdict

CONTINUE. No High finding remains in the current working tree.

Review A Finding 1 is closed: MC, SA, and LAQ skip the article completion check
when `isStory` is true. Review A Finding 3 is closed: vocabulary matching
passes `showHeroImages={false}`.

Finding 2 stays open at Medium. Close it before the track closes. Strengthen
the story completion test so the card reaches `COMPLETED` before the assertion.
Add the same assertion for SA and LAQ.
