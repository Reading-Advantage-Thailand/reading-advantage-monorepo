# Plan: Staff student view (Preview mode)

Paths are relative to `apps/primary-advantage` unless they start with `packages/` or `measure/`.
Each task follows the TDD order of `measure/workflow.md`: write the failing test, make it pass,
refactor, then commit. Tests use Vitest (`vitest.config.ts`; DOM tests add
`// @vitest-environment jsdom`). Domain tests use `packages/domain/src/__tests__/mock-db.ts`.
Do not run a 25-student check on this machine (shared decision of 2026-10-05).

## Phase 0: Design

- [x] Task: Design the Preview banner and the preview states in the RPG skin
    - [x] Mock the banner (`Banner` from `components/rpg/chrome.tsx`) with "Exit preview", in day and night, at 375 px and 1280 px
    - [x] Mock the preview states of home, avatar picker, shop, history, reports, sentences, vocabulary, Class Quest, Reedy, and a game end screen
    - [x] Write the copy keys (en first) and the "Preview: not saved" note; check that the banner does not look like the Reedy "Preview" label
    - [x] Save the mocks and captures in `measure/tracks/primary_parity_staff_student_view_20261011/design/` (mock source and `captures.md` there; the 48 PNG files are outside the repository, paths in `design/captures.md`)
- [x] Task: Fill the behavior contract before the build
    - [x] Copy `docs/runbooks/primary-behavior-contract-template.md` (kit FR-11) to `measure/tracks/primary_parity_staff_student_view_20261011/behavior-contract.md` and fill its seven sections (STU-01, the write-path inventory, and the AC-7 change of the security track)
    - [x] Write `measure/tracks/primary_parity_staff_student_view_20261011/acceptance-pairs.json` with the pairs of the spec acceptance criteria (kit FR-7)
- [x] Task: Owner look check of the design and of the SYSTEM school rule (spec D8); record the answers in `design/decisions.md` — look check pending (owner, async). Default used: the D8 rule of the spec (decisions P0-1 to P0-8).
- [x] Task: Measure - User Manual Verification 'Phase 0: Design' (Protocol in workflow.md) — look check pending (owner, async)
    - Manual steps: (1) Open the 48 PNG files in `~/Desktop/primary-parity-progress/captures/staff_student_view/phase0-design/`. (2) Check `banner-375-*` and `banner-1280-*`: the blue banner differs from the brown PREVIEW plank. (3) Check each state at both widths in day and night. (4) Read `design/decisions.md` and answer P0-1 (SYSTEM school rule). Answers come back to `design/decisions.md`, `spec.md`, and `plan.md`.

## Phase S1: Staff open the student pages
_Story ref: spec.md#story-s1_

- [ ] Task: Contract for the student view mode
    - [ ] `lib/student-view.ts`: `StudentViewMode` (`"student" | "preview"`), a Zod schema, and `studentViewModeFor(role)` built on `isStaffRole` (`lib/permissions.ts:276`); JSDoc
- [ ] Task: Tests for access and the menu
    - [ ] `lib/__tests__/student-view.test.ts`: STUDENT gives `student`; TEACHER, ADMIN, SYSTEM give `preview`; INTERN and an unknown role give no mode
    - [ ] Update `lib/__tests__/route-policies.test.ts` and `lib/__tests__/route-policies.contract.test.ts`: `/student` admits STUDENT, TEACHER, ADMIN, SYSTEM; INTERN gets `/unauthorized` (this replaces AC-7 of `primary_authorization_hardening_20260912` for page access)
    - [ ] `components/nav/__tests__/user-account-nav.test.tsx`: staff see "Student view" to `/student/home`; students keep their item
    - [ ] Test for the settings back link: staff go to the role home (`roleDefaultRedirects`)
- [ ] Task: Implement access, the provider, the banner, and the menu item
    - [ ] `lib/route-policies.ts:17`: add TEACHER, ADMIN, SYSTEM to `/student`
    - [ ] `app/[locale]/(student)/student/layout.tsx`: keep `assertLayoutRole`; derive the mode; wrap the children in `StudentViewProvider`; render the banner for `preview`
    - [ ] `components/student/student-view-provider.tsx` (provider and `useStudentView()`), `components/student/preview-banner.tsx`
    - [ ] `components/nav/user-account-nav.tsx:106-112`: the "Student view" item for staff
    - [ ] `app/[locale]/(student)/settings/user-profile/page.tsx:45-47`: role-aware back link
    - [ ] `messages/{en,th,cn,tw,vi}.json`: banner, menu, and back link keys
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S1: Staff open the student pages' (Protocol in workflow.md)

## Phase S2: Nothing saves in Preview mode
_Story ref: spec.md#story-s2_

- [ ] Task: Contract for the write guard
    - [ ] `lib/student-view.ts`: `assertStudentWriter(user)`, `PreviewWriteError`, the action result `{ status: "preview" }`, and the route response helper (403, code `PREVIEW_READ_ONLY`); the refusal logs one info line with `lib/observability/logger.ts`
    - [ ] Primary domain permission: register a STUDENT-only permission for student-record writes in the Primary domain permission module (`packages/domain/src/primary-avatar/`, `packages/domain/src/primary-quest/`; check the registration pattern of `packages/domain/src/gamification/permissions.ts`)
- [ ] Task: Tests for every write path (one table-driven test per layer)
    - [ ] `actions/__tests__/preview-write-guard.test.ts`: `finishQuiz`, `retakeQuiz`, `updateUserActivity`, `fetchArticleActivity`, `saveFlashcard`, `saveArticleToFlashcard`, `reviewCard`, `deleteFlashcardCard`, `setAvatarProfileAction`; TEACHER, ADMIN, SYSTEM get `{ status: "preview" }` and the DB mock records no insert, update, or delete; STUDENT saves
    - [ ] `app/api/__tests__/preview-write-guard.test.ts`: `lessons/[articleId]` POST, `assignments/[id]`, `v1/apk/complete`, `v1/apk/rpg` PATCH, `v1/apk/challenges/runs`, `v1/avatar` GET (no starter set), `v1/avatar/purchase`, `v1/avatar/loadout`, `v1/quest/heartbeat`, `voice/sessions` and its two sub-routes, the four `flashcard/decks/[deckId]/*` game routes, `flashcard/cards/[cardId]/review`, `articles/questions/[articleId]` POST; staff get 403 `PREVIEW_READ_ONLY` and no write
    - [ ] `packages/domain/src/__tests__/primary-student-record-permission.test.ts`: `setAvatarProfile`, `purchaseAvatarItem`, `setLoadout`, `ensureStarterSet`, `awardPowerUps`, and the quest heartbeat refuse TEACHER, ADMIN, SYSTEM; STUDENT passes (mock DB)
    - [ ] `lib/__tests__/preview-guard-coverage.test.ts`: every non-GET handler under the student API folders calls `assertStudentWriter`; a counterexample fixture without the call is detected
- [ ] Task: Implement the server guards
    - [ ] Call `assertStudentWriter` at the start of each action in `actions/question.ts`, `actions/user.ts`, `actions/article.ts`, `actions/flashcard.ts`, `actions/avatar.ts`
    - [ ] Call it at the start of each route in the inventory (spec, "Write paths that student pages reach today")
    - [ ] Add the domain permission check to `packages/domain/src/primary-avatar/avatar.ts`, `packages/domain/src/primary-avatar/shop.ts`, `packages/domain/src/primary-quest/goals.ts`, `packages/domain/src/primary-quest/battle.ts`; rebuild the domain `dist/` before the app tests
- [ ] Task: Tests for the client layer
    - [ ] `components/articles/questions/__tests__/preview-quiz.test.tsx`: in preview, MCQ, SAQ, and LAQ show the result and "Preview: not saved", and `finishQuiz` is not called
    - [ ] `components/lesson/__tests__/preview-lesson.test.tsx`: in preview, the lesson progress bar and the five lesson games call no write path
    - [ ] `components/articles/__tests__/preview-article.test.tsx`: in preview, `fetchArticleActivity` and `saveFlashcard` are not called
- [ ] Task: Implement the client layer and the page-load skips
    - [ ] Read `useStudentView()` in `components/articles/questions/mc-question-content.tsx`, `written-question-content.tsx`, `components/lesson/task/lesson-task-saq.tsx`, the five lesson game components, `components/lesson/lesson-progress-bar.tsx`, `components/articles/article-content.tsx`, `components/articles/word-list.tsx`, the flashcard game and manage tab
    - [ ] Skip the page-load writes in preview: `student/home/page.tsx:105` (`awardPowerUps`), `getAvatarState` callers, `student/read/[articleId]/page.tsx:126-128`
    - [ ] Wrap the lesson rehearsal page in `StudentViewProvider` with `preview`, and correct its hint copy
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S2: Nothing saves in Preview mode' (Protocol in workflow.md)

## Phase S3: Pages that need a student record show a preview state
_Story ref: spec.md#story-s3_

- [ ] Task: Contract for the preview page models
    - [ ] `lib/student-view.ts`: `previewHomeModel(user)` and the empty-state props, typed from the existing page props (no sample student data)
    - [ ] Practice route contract: a Zod output for the sample word set (same shape as `parsePracticeInput`)
- [ ] Task: Tests for the preview pages
    - [ ] `app/[locale]/(student)/student/home/__tests__/preview-home.test.tsx`: staff render the default hero, zero XP and coins, the school leaderboard, and empty notices; `getStudentHome` is not called
    - [ ] Tests for avatar, shop, history, reports, sentences, vocabulary, quest battle, and Reedy in preview: no error page, no row of the staff member, write buttons off
    - [ ] `app/api/v1/apk/__tests__/practice-preview.test.ts`: staff get the sample word set from published article vocabulary; students keep their saved words
- [ ] Task: Implement the preview pages
    - [ ] `student/home/page.tsx`, `student/avatar/page.tsx`, `student/avatar/shop/page.tsx`, `student/history/page.tsx` and `components/student/history-list.tsx`, `student/reports/page.tsx`, `student/sentences/page.tsx`, `student/vocabulary/page.tsx`, `student/quest/battle/page.tsx`, `student/reedy/page.tsx`
    - [ ] `app/api/v1/apk/practice/route.ts`: the sample word set for staff (read only)
    - [ ] `student/games/apk/[cartridgeId]/page.tsx` and `student/games/story/page.tsx`: `save={false}` in preview
    - [ ] Copy keys in `messages/{en,th,cn,tw,vi}.json`
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S3: Pages that need a student record show a preview state' (Protocol in workflow.md)

## Phase S4: Class books and lessons in preview
_Story ref: spec.md#story-s4_

- [ ] Task: Contract for the preview class book
    - [ ] `packages/domain/src/primary-books/class-books.ts`: a read `getPreviewBook({ db, user, classBookId })` built on `managedClassBook` (line 91), with a Zod output (book, lessons, all open, no progress); JSDoc
    - [ ] A read that lists the class books that the staff member manages, for the home notices
- [ ] Task: Tests for the preview class book
    - [ ] `packages/domain/src/__tests__/primary-preview-book.test.ts`: a teacher who manages the book reads it; another teacher, another school, and a student get the existing errors (mock DB)
    - [ ] `app/[locale]/(student)/student/books/[classBookId]/__tests__/preview-book.test.tsx`: staff see every lesson open and no progress; an unknown book gives 404
- [ ] Task: Implement the preview class book
    - [ ] `student/books/[classBookId]/page.tsx`: use `getPreviewBook` in preview
    - [ ] `student/home/page.tsx`: the managed class books in the preview notices
    - [ ] Check the lesson links to student pages (`components/lesson/lesson-card.tsx:65`, `task-lesson-summary.tsx:117`, `lesson-progress-bar.tsx:450`) open in preview
    - [ ] Coordinate with `primary_parity_class_books_20261011` (TCH-01, TCH-02), which also changes the class book pages; merge its changes first if it is complete
- [ ] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [ ] Task: Measure - User Manual Verification 'Phase S4: Class books and lessons in preview' (Protocol in workflow.md)

## Phase A: Acceptance

- [ ] Task: Run the kit of `primary_parity_acceptance_20261011` (`scripts/primary-parity/capture.ts` for each app, then `report.ts`) with `acceptance-pairs.json`; sign in a teacher, an admin, a SYSTEM user, and a student; record the database counts before and after for AC-2 and AC-5
- [ ] Task: Captures at 375 px and 1280 px, day and night, for the owner look check (AC-6)
- [ ] Task: Add the block of this track to `scripts/primary-parity/cutover-check.mjs` (kit FR-13) for rehearsal 3
- [ ] Task: Write `measure/tracks/primary_parity_staff_student_view_20261011/acceptance.md` from the runbook template (kit FR-10), with the owner look check
- [ ] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md)
