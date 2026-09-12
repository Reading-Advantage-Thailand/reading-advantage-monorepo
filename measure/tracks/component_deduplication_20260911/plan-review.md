# Phase Code Review: Reading Component Deduplication

- Track: `component_deduplication_20260911`
- App: `apps/reading-advantage`
- Revision range: `7974ba3bd^..d614a73c7`
- Commit count: 20
- Review date: 2026-09-12
- Reviewer note: this review covers only the committed diff in the range above
  and the current state of the files that the range touched. The working tree
  holds uncommitted changes from the unrelated APK track. This review ignores
  those changes. This review made no source edit and no commit.

The track deletes about 6,800 lines and adds about 4,100 lines. It merges ten
component pairs and it extracts five shared helpers. The merges are careful.
The endpoints, the storage keys, the loading views, the error views, and the
completed views of the deleted forks all survive in the merged components. One
merge adds new behavior at a story call site. That addition breaks NFR-2.

## Findings

### 1. High — The merged quiz cards run the article completion check on story chapters

Evidence:

- `apps/reading-advantage/components/questions/mc-question-card.tsx:214`
- `apps/reading-advantage/components/questions/sa-question-card.tsx:135`
- `apps/reading-advantage/components/questions/laq-question-card.tsx:144`
- `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/[chapterNumber]/page.tsx:72`

The stories page passes `page="article"` to the MC card and to the SA card. The
guard in both cards tests `page === "article"`, not `!isStory`. The LAQ card has
no guard at all. Each card therefore calls `checkAndNotifyCompletion(userId,
articleId)` when a story chapter quiz completes, and `articleId` holds a story
id.

The deleted story forks made no such call. The command `git show
7974ba3bd^:apps/reading-advantage/components/stories-chapter-question/sa-question-card.tsx
| grep Completion` returns nothing. The MC card also keeps the correct story
check at `mc-question-card.tsx:228`, so two completion checks now run for one
story event.

Failure scenario: a student completes the three quizzes of one story chapter.
`lib/check-article-completion.ts` sends five GET requests for each card, so the
browser sends up to fifteen extra requests. Four of the five requests target
`/api/v1/articles/<storyId>/...` and answer 404, because
`server/controllers/question-controller.ts:215` returns "Article not found". The
fifth request reads the complete activity log of the student
(`/api/v1/users/<id>/activitylog`), so the student downloads that log three
extra times for each chapter. The requests write no data and they show no wrong
toast, but they add load to a student-facing path and they break NFR-2.

Fix: change the guard in the MC card and the SA card to `page === "article" &&
!isStory`, and add `!isStory` to the LAQ card guard.

### 2. Medium — FR-8 is partly implemented: the chapter path still fires four sequential fetches

Evidence: `apps/reading-advantage/components/rating-popup.tsx:76`, `:153`,
`:173`, `:184`.

The spec names two defects: the article popup refetches the whole article, and
the chapter popup fires four sequential fetches. The merge repairs the first
defect. The article path now calls the `submitRating` server action and it
updates `localAverageRating` and `localInitialRating` in place. The merge does
not repair the second defect. The chapter path keeps the same four sequential
fetches as the deleted `chapter-rating-popup.tsx` (lines 45, 71, 91, and 103 of
the old file), and it keeps `router.refresh()` at
`components/rating-popup.tsx:214`.

Failure scenario: a student rates a story chapter. The browser waits for four
serial round-trips and then for a full route refresh. The wait is the same as
before the track, so the spec item stays open.

### 3. Medium — The vocabulary matching tab gained two decorative images

Evidence: `apps/reading-advantage/components/matching.tsx:259-281`, and the
deleted `components/vocabulary/tab-matching-words.tsx` (no `Image` header in
the old render; the old file imported `Image` only for the winners graphic).

The merged component always renders the ninja image and the knight image while
`correctMatches.length !== 10`. The sentence matching fork rendered them. The
vocabulary matching fork did not. The merge gives no prop to hide them, so the
vocabulary tab at `components/vocabulary/tabs-vocabulary.tsx:49` now shows two
images that it never showed before. This is a visual change at a merged call
site, so it breaks NFR-2.

### 4. Medium — No commit contains only test files, so the Red phase is not visible

Evidence:

- `__test__/use-quiz-progress.test.tsx` and `lib/use-quiz-progress.ts` both land
  in `7974ba3bd`.
- `__test__/quiz-cards-progress.test.tsx` lands in `9824ff3bf` with the card
  rewrite.
- `__test__/translate-sentence.test.ts` lands in `a353ba7a9` with the helper.
- `__test__/enroll-classes-mode.test.tsx` lands in `daf721b66` with the merge.
- `__test__/word-list-data-source.test.tsx` lands in `fdd093147` with the merge.
- `__test__/rating-popup-local-state.test.tsx` lands in `d0e6e70ce` with the
  merge.
- `__test__/component-dedup-static.test.ts` lands in `348b14268` with the
  helpers.

`plan.md` Phase 2 claims "all Red first, then Green". The history does not show
that order. `measure/lessons-learned.md` states: "Red-phase commits must contain
ONLY the test file + Measure doc edits". The track does not follow that rule.

### 5. Medium — The new tests lean on structural source assertions

Evidence: `__test__/component-dedup-static.test.ts` (14 tests) and
`__test__/component-dedup-part-b.test.ts` (31 tests) hold 45 of the 67
assertions that this track added. Both files test file existence and source
text. The six behavior test files hold 22 assertions.

`measure/lessons-learned.md` (2026-06-24, `review_findings_remediation_20260624`)
names structural assertions such as `existsSync(file)` and source regular
expressions a "test gaming" smell, because they prove that the source looks
correct and not that the system behaves correctly.

The one deep behavior test, `__test__/quiz-cards-progress.test.tsx`, mocks both
completion hooks at lines 36-46. That mock is the reason the suite stays green
while finding 1 is present.

### 6. Low — The story quiz writes sessionStorage progress that no code reads

Evidence: `apps/reading-advantage/components/questions/mc-question-card.tsx:464`
gives `saveProgress` to `StoryMCQeustion` but gives no `loadProgress`. The
parent also calls `clear()` on every mount at line 113.

`StoryMCQeustion` writes `quiz_progress_<storyId>_<chapterNumber>` at line 1062
and line 1173. No code reads that key for the story variant. The writes are
dead. The student loses no answer, because the server owns the progress, but the
code says one thing and does another.

### 7. Low — The article quiz no longer refreshes the route after completion

Evidence: `apps/reading-advantage/components/questions/mc-question-card.tsx:748`
replaces the old `setTimeout(() => router.refresh(), 100)` with `clear()`.

The spec orders this removal, so the change is correct by the spec. The residual
risk stays: server-rendered values on the article page, such as an XP total in
the page shell, now update only at the next navigation. The owner should confirm
this during manual verification.

### 8. Low — The rating toast reports a locally computed XP value

Evidence: `apps/reading-advantage/components/rating-popup.tsx:112`. The
component computes `xpEarned` from `previousInitialRating` and it ignores
`result.xpEarned`. `actions/rating.ts:80` and `actions/rating.ts:104` return the
real value, which the server derives from `hasOldRating`.

Failure scenario: the client value and the server value disagree after a stale
`initialRating`. The student then reads a toast that names the wrong XP amount.

### 9. Low — One submit path keeps a hardcoded article endpoint

Evidence: `apps/reading-advantage/components/questions/mc-question-card.tsx:682`
posts to `/api/v1/articles/${articleId}/questions/mcq/${questionId}`. Every
sibling path uses `endpointBase`.

The code is correct today, because only the article branches render `MCQeustion`
(lines 487, 514, and 543 all sit inside branches that exclude the story variant). The hardcoded path is a
trap for the next editor who reuses this component for a second variant.

### 10. Low — Two effects use a conditional dependency array

Evidence: `apps/reading-advantage/components/questions/sa-question-card.tsx:112`
and `apps/reading-advantage/components/questions/laq-question-card.tsx:129` both
use `isStory ? [state, endpointBase] : [endpointBase]`.

React requires a constant array size between renders. The code is safe only
because `variant` never changes for a mounted card. A future call site that
switches `variant` in place will make React raise an error.

### 11. Low — The merged rating popup keeps a dead `disabled` prop

Evidence: `apps/reading-advantage/components/rating-popup.tsx:38`. ESLint reports
`'disabled' is assigned a value but never used`. Both deleted forks also ignored
the prop, so this is a pre-existing defect that the merge carried forward. The
merge was the moment to drop it.

### 12. Low — GCS image URLs stay hardcoded in ten places

Evidence: `components/article-card.tsx:55`,
`components/article-showcase-card.tsx:103`,
`components/stories-chapter-card.tsx:75`,
`components/stories-showcase-card.tsx:73`,
`components/teacher/print-article.tsx:202`,
`components/lesson/phases/phase1-introduction.tsx:59`,
`components/lesson/lesson-introduction.tsx:60`,
`components/admin/article-creation.tsx:1575`,
`app/[locale]/(student)/student/stories/[storyId]/page.tsx:108`,
`app/api/v1/articles/[article_id]/export-workbook/route.ts:391`.

FR-10 covers audio URLs only, and `lib/gcs-url.ts` serves audio. The image
template is a second duplication of the same bucket URL. Record it in
`measure/tech-debt.md`.

## Merge Behavior Audit

| Merge | Both call sites identical? | Evidence |
| --- | --- | --- |
| FR-1 stories quiz cards (`9824ff3`) | No | `storageKey` and `endpointBase` are correct. `mc-question-card.tsx:75-77` builds `quiz_progress_<storyId>_<chapter>` and `/api/v1/stories/<id>/<chapter>/question`, which match the deleted fork exactly (old lines 99-103, 160, 278, 512, 733). The SA and LAQ endpoints match too. The story answers post to the story endpoints, never to the article endpoints, because `StoryMCQeustion` uses `endpointBase` at line 1025 and the article-only `MCQeustion` renders only when `!isStory`. The story loading view, error view, completed view, and `handleCompleted` branches all match the fork. The one difference is the new article completion check — see finding 1. |
| FR-2 `useQuizProgress` (`lib/use-quiz-progress.ts`) | Yes | All three corruption-repair blocks are gone. The old card held them at lines 87-113, 135-145, and 649-680; the new card holds no direct `sessionStorage` call. Both `setTimeout` hacks are gone: the retake `setTimeout(..., 10)` and the `setTimeout(() => router.refresh(), 100)`. Removing the repair blocks cannot lose a student's answers. Each answer posts to the server first, and `server/controllers/question-controller.ts` and `server/controllers/stories-question-controller.ts:959-988` rebuild the progress array from the stored records on every GET. The card calls `clear()` at line 113 and then takes `resp.progress` from the server, so a refresh mid-quiz restores the answered questions from the server. |
| FR-3 matching games (`components/matching.tsx`) | No | The `fetchWords` prop, the `activityType` prop, the `xpEarned` prop, and the `showAudio` prop reproduce both forks. The audio button appears only when `showAudio` is true, and `tabs-vocabulary.tsx:56` passes `showAudio={false}`. The completion threshold, the shuffle, the shake animation, and the winners image all match. The two header images are new at the vocabulary call site — see finding 3. |
| FR-4 enroll and unenroll (`components/teacher/enroll-classes.tsx`) | Yes, with the ordered fix | The `mode` prop drives the scope, the PATCH path, the GET path, the column labels, and the button labels. `enroll-classes.tsx:173` now calls `row.toggleSelected()`. Both old files wrote `onClick={() => row.toggleSelected}`, which did nothing. The spec orders this fix, so the change is intended. |
| FR-5 history tables (`components/article-records-table.tsx`) | Yes | The `variant` prop selects the columns, the date field (`created_at` against `updated_at`), the banner colors, the pagination, and the empty message. The status is preserved, not hardcoded: `article-records-table.tsx:105-108` reads `row.getValue("status")` and maps it through `STATUS_MAP`. The page transforms derive the status from the record (`app/[locale]/(student)/student/history/page.tsx:36` and the teacher page line 89). Both transforms predate the track and neither hardcodes a value. |
| FR-6 classroom student table (`components/classroom-student-table.tsx`) | Yes | The `variant` prop serves the admin report (`components/admin/classroom-report.tsx:252`) and the teacher roster (`components/teacher/class-roster.tsx:190`). The mobile column visibility, the reset-progress callback, and the custom pagination all pass through props. |
| FR-7 word-list dialogs (`components/word-list.tsx`) | Yes | One shared audio element exists at line 454. Each row now calls `playSegment(word.startTime, word.endTime)` against that one element, so the dialog no longer builds one `AudioImg` for each row. The three response-shape branches are normalized once in `extractWordList` (lines 102-128) over the single `normalizeWordList` mapper. The lodash `filter` and `includes` imports are gone from both merged paths. No `console.log` of a payload remains. |
| FR-8 rating popups (`components/rating-popup.tsx`) | Partly | The hand-rolled modal is gone and the shared `Dialog` renders the popup (line 321). The article path updates state locally and no longer refetches the article. The chapter path still fires four sequential fetches — see finding 2. |
| FR-11 dead-code deletion (`a3bebd8`) | Yes | Each deleted file had zero importers at deletion time. `git grep -E 'from "(@/components/admin/dashboard-content\|\./dashboard-content)"' a3bebd80c^` returns nothing. The same command for `teacher/reports` returns nothing. `tab-flash-card.tsx` and `flash-card-vocabulary-practice-button.tsx` imported only each other, and the `Word` type moved first to `components/vocabulary/types.ts`. The deviation is correct: `git grep 'from "@/components/system-articles"' d614a73c7` returns two importers, `app/[locale]/(system)/system/handle-passages/page.tsx:5` and `app/[locale]/(teacher)/teacher/passages/page.tsx:4`. Retaining that file was the right call. |

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 | Implemented | `components/stories-chapter-question/` is absent. `components/questions/mc-question-card.tsx:75-77`, `sa-question-card.tsx:81-83`, `laq-question-card.tsx:97-99` hold the `storageKey` and `endpointBase` parameters. All three cards import `QuestionState` from `../models/questions-model`. See finding 1 for the added completion check. |
| FR-2 | Implemented | `lib/use-quiz-progress.ts` owns every read and write. `grep -n "sessionStorage\." components/questions/mc-question-card.tsx` returns no hit. No `setTimeout` and no `router.refresh` remain in the file. |
| FR-3 | Implemented | `components/matching.tsx:37-48` declares `fetchWords`. `components/vocabulary/tab-matching-words.tsx` is deleted. See finding 3 for the visual change. |
| FR-4 | Implemented | `components/teacher/enroll-classes.tsx:43-46` declares `mode`. `unenroll-classes.tsx` is deleted. Line 173 calls the function. |
| FR-5 | Implemented | `components/article-records-table.tsx:25` declares `variant`. `reminder-reread-table.tsx` is deleted. Line 105 reads the real status. |
| FR-6 | Implemented | `components/classroom-student-table.tsx:45` is used by the admin report and the teacher roster. |
| FR-7 | Implemented | `components/word-list.tsx:53` declares `dataSource`. `stories-word-list.tsx` is deleted. One audio element, one normalizer, no lodash. |
| FR-8 | Partly implemented | The article path and the `Dialog` replacement are done. The chapter fetch chain stays. See finding 2. |
| FR-9 | Implemented | `lib/translate-sentence.ts` holds one helper. Ten call sites import it: `article-summary.tsx`, `article-showcase-card.tsx`, `stories-chapter-summary.tsx`, `article-content.tsx`, `stories-chapter-list.tsx`, `stories-chapter-content.tsx`, `stories-summary.tsx`, `stories-showcase-card.tsx`, `lesson/lesson-sentence-preview.tsx`, `teacher/print-article.tsx`. |
| FR-10 | Implemented | `lib/roles.ts:6` holds one `isAtLeastTeacher`, used by three call sites. `lib/gcs-url.ts` holds the audio helper, used by 17 components. `components/teacher/teacher-data-table.tsx` is the shared table shell, used by five files. `components/copy-key-button.tsx` is used by three files. One teacher file, `components/teacher/assignment-page.tsx`, still calls `useReactTable` directly. See finding 12 for the image URLs. |
| FR-11 | Implemented | All six item groups are handled. `components/stories-select.tsx` no longer holds the stray `SelectStory;` statement. `read/page.tsx` and `stories/page.tsx` no longer take dead `params` and `searchParams`. `components/admin/reports.tsx` no longer sets `debugAll`. The `system-articles.tsx` deviation is correct. |
| NFR-1 | Implemented | No `package.json` changed in the range. No lodash import remains in the merged components. |
| NFR-2 | Not met | Findings 1 and 3 both change behavior at a merged call site. |
| NFR-3 | Implemented | `graph.db` is updated in `0685c66`, `4f1f62a`, and `d614a73`. |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 | Pass | `components/stories-chapter-question/` does not exist. `app/[locale]/(student)/student/stories/[storyId]/[chapterNumber]/page.tsx:9-11` imports the shared cards. `__test__/quiz-cards-progress.test.tsx` proves that the story variant calls `/api/v1/stories/story-1/2/question/mcq`. |
| AC-2 | Pass | One hook, `lib/use-quiz-progress.ts`, owns the quiz sessionStorage. No repair block and no timing hack remain in the three cards. |
| AC-3 | Pass | One matching component, one enroll component, one history table, one classroom-student table, one word-list dialog, and one rating popup exist. Each deleted partner file is absent. |
| AC-4 | Pass in substance, fail on the literal wording | One helper exists and every client call site imports it. One forward normalization exists, at `lib/translate-sentence.ts:19`. The literal command `grep -r "zh-CN"` returns about 35 hits, so the AC text is not literally true. The three reverse maps at `components/flashcards/deck-view.tsx:143`, `components/lesson/lesson-sentence-flashcard-game.tsx:390`, and `components/lesson/phases/phase6-sentence-collection.tsx:394` map an IETF tag back to an app locale key. That direction is the opposite of the FR-9 normalization, so those maps are a separate concern and not a FR-9 duplication. They are a small, real duplication of their own (three copies of the same five-entry map) and they belong in `measure/tech-debt.md`, not in this track. My conclusion: AC-4 is met. |
| AC-5 | Partly verified | Every FR-11 file is deleted. The build gate cannot run cleanly, because the working tree holds the unrelated APK track. `npx tsc --noEmit` reports zero errors outside the APK files, which is the strongest signal available now. The owner must rerun `pnpm turbo run build --filter=reading-advantage` on a clean tree. |
| AC-6 | Pass for this track | The 9 track suites pass, 64 of 64. `npx tsc --noEmit` reports zero errors outside the APK files. The full monorepo suite belongs to another agent. |

## Plan Accuracy

- The checked boxes match the code. Every Phase 1, Phase 2, and Phase 3 task that
  carries an `[x]` has a matching commit, and each cited commit exists and is an
  ancestor of `d614a73c7`.
- The recorded deviation is correct. `plan.md` records that
  `components/system-articles.tsx` was retained because it has two real
  importers. The file has exactly two importers today.
- The unchecked boxes are correctly unchecked. Phase 4 is not done:
  `docs/reading-advantage-ux-refactor-plan.md` still lists the Phase 3 items as
  open, and `measure/tech-debt.md` holds no FSRS manage-table row.
- Drift 1: `plan.md` Phase 1 cites `8d2434e` for the part A contract. The part A
  invariant file, `__test__/component-dedup-static.test.ts`, landed in `348b142`.
- Drift 2: `plan.md` Phase 2 cites `7974ba3` and `8d2434e` and claims "all Red
  first, then Green". Six of the eight test files landed in other commits, and
  no commit in the range contains only test files. See finding 4.
- Drift 3: `plan.md` Phase 3 assigns the FR-1 work to `9824ff3`. Commit
  `7974ba3` deleted the four story fork files, and `9824ff3` parameterized the
  shared cards. The range is therefore not bisectable: at `7974ba3` the stories
  page imports files that no longer exist. The end state is correct.
- Drift 4: `metadata.json` still reads `"status": "new"` and
  `"actual_tasks": null`, and `"deviation_notes"` is empty. The plan records the
  `system-articles.tsx` deviation, so the metadata and the plan disagree.

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest __test__/component-dedup-part-b.test.ts __test__/component-dedup-static.test.ts __test__/enroll-classes-mode.test.tsx __test__/quiz-cards-progress.test.tsx __test__/rating-popup-local-state.test.tsx __test__/translate-sentence.test.ts __test__/use-quiz-progress.test.tsx __test__/word-list-data-source.test.tsx __test__/matching-states.test.tsx
```

Output:

```
Test Suites: 9 passed, 9 total
Tests:       64 passed, 64 total
Snapshots:   0 total
Time:        16.098 s
```

Type check command and result:

```
cd apps/reading-advantage && npx tsc --noEmit -p tsconfig.json
```

The type check reports 18 errors. Every error is in a file of the uncommitted
APK track (`components/apk/*`, `app/.../games/apk/*`, `lib/apk/*`,
`app/[locale]/(teacher)/teacher/game-challenges/page.tsx`). Filtering those
paths leaves zero errors, so this track adds no type error.

Lint command and result:

```
cd apps/reading-advantage && npx eslint <15 changed files>
```

Output: `31 problems (0 errors, 31 warnings)`. The warnings are unused
parameters, unused catch bindings, `any` types, and two
`react-hooks/exhaustive-deps` notices. Most warnings predate the track. Findings
9, 10, and 11 name the three warnings that the merge should have cleared.

## Verdict

STOP. One High finding blocks this phase.

Blocking finding:

1. The merged quiz cards run the article completion check on story chapters
   (`components/questions/mc-question-card.tsx:214`,
   `components/questions/sa-question-card.tsx:135`,
   `components/questions/laq-question-card.tsx:144`). This breaks NFR-2, the
   track's central claim, at the highest-risk merge. The fix is one guard in
   each of the three files.

After that fix, please also address finding 3, because it is the second NFR-2
breach and it needs one prop. Findings 2, 4, 5, and 6 through 12 do not block
this phase, but the owner should schedule finding 2 (FR-8 is incomplete) before
the track closes.
