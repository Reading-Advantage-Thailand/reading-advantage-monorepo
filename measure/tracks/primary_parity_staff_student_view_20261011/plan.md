# Plan: Staff student view (Preview mode)

Paths are relative to `apps/primary-advantage` unless they start with `packages/` or `measure/`.
Each task follows the TDD order of `measure/workflow.md`: write the failing test, make it pass,
refactor, then commit. Tests use Vitest (`vitest.config.ts`; DOM tests add
`// @vitest-environment jsdom`). Domain tests use `packages/domain/src/__tests__/mock-db.ts`.
Do not run a 25-student check on this machine (shared decision of 2026-10-05).

## Phase 0: Design [checkpoint: 6f9e589f6]

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

## Phase S1: Staff open the student pages [checkpoint: 846295101]
_Story ref: spec.md#story-s1_

**MERGE GATE: do not merge the branch of this phase into integration before Phase S2 is done.**
After S1 alone, a staff member opens the student pages and every write path still saves on the
staff row (the guards come in S2). S1 makes the mode available to the S2 guards: the
`StudentViewProvider` (client) and `studentViewModeFor(role)` in `lib/student-view.ts` (server).
Until S3, some pages (home, avatar, Class Quest, class books) can show an error for staff.

- [x] Task: Contract for the student view mode
    - [ ] `lib/student-view.ts`: `StudentViewMode` (`"student" | "preview"`), a Zod schema, and `studentViewModeFor(role)` built on `isStaffRole` (`lib/permissions.ts:276`); JSDoc
- [x] Task: Tests for access and the menu
    - [ ] `lib/__tests__/student-view.test.ts`: STUDENT gives `student`; TEACHER, ADMIN, SYSTEM give `preview`; INTERN and an unknown role give no mode
    - [ ] Update `lib/__tests__/route-policies.test.ts` and `lib/__tests__/route-policies.contract.test.ts`: `/student` admits STUDENT, TEACHER, ADMIN, SYSTEM; INTERN gets `/unauthorized` (this replaces AC-7 of `primary_authorization_hardening_20260912` for page access)
    - [ ] `components/nav/__tests__/user-account-nav.test.tsx`: staff see "Student view" to `/student/home`; students keep their item
    - [ ] Test for the settings back link: staff go to the role home (`roleDefaultRedirects`)
- [x] Task: Implement access, the provider, the banner, and the menu item
    - [ ] `lib/route-policies.ts:17`: add TEACHER, ADMIN, SYSTEM to `/student`
    - [ ] `app/[locale]/(student)/student/layout.tsx`: keep `assertLayoutRole`; derive the mode; wrap the children in `StudentViewProvider`; render the banner for `preview`
    - [ ] `components/student/student-view-provider.tsx` (provider and `useStudentView()`), `components/student/preview-banner.tsx`
    - [ ] `components/nav/user-account-nav.tsx:106-112`: the "Student view" item for staff
    - [ ] `app/[locale]/(student)/settings/user-profile/page.tsx:45-47`: role-aware back link
    - [ ] `messages/{en,th,cn,tw,vi}.json`: banner, menu, and back link keys (namespace `StudentView`: `bannerTitle`, `bannerNote`, `exit`, `menuItem`, `notSaved`, `backHome`; Thai written by the helper, owner check pending)
- [x] Task: Generate docs (generate.sh ran; generated files restored, not committed; doctor.sh: one old failure A13, `agents_md_audit_science_advantage_20260603`, not from this track) and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S1: Staff open the student pages' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual steps: (1) Open the PNG files in `~/Desktop/primary-parity-progress/captures/staff_student_view/phaseS1/` (16 files, list in `design/captures-s1.md`). (2) Check the blue banner on home and read at 375 px and 1280 px, day and night: it shows over the scene and the Exit button is 48 px high. (3) Check that the account menu shows "Student view" first under Navigation. (4) In a build, sign in as a teacher: the menu item opens `/student/home` with the banner, and Exit preview goes to `/teacher/dashboard`. (5) Open `/settings/user-profile` as a teacher: the back link goes to the role home. (6) INTERN opens `/student/home` and gets `/unauthorized`. Do not save anything as staff before S2.

## Phase S2: Nothing saves in Preview mode [checkpoint: 16ae42559]
_Story ref: spec.md#story-s2_

Guard names (S2): `assertStudentWriter` (throws `PreviewWriteError`), `guardStudentAction` (returns
`{ status: "preview" }`), `guardStudentRoute` (403 `PREVIEW_READ_ONLY`), `isStudentWriter`,
`isPreviewResult`, all in `lib/student-view.ts`. Client: `usePreviewSave()` in
`components/student/student-view-provider.tsx`. Domain: `STUDENT_RECORD_WRITE`,
`assertStudentRecordWriter`, `canWriteStudentRecord` in `packages/domain/src/primary-avatar/permissions.ts`.

Student API folders that the coverage test scans (`lib/__tests__/preview-guard-coverage.test.ts`,
list `STUDENT_API_FOLDERS`, folders under `app/api`): `articles`, `assignments`, `assistant`, `flashcard`,
`lessons`, `users/activitylog`, `v1/apk`, `v1/avatar`, `v1/quest`, `voice`. A new write route in one of
them needs a guard call, or an entry with a reason in `EXEMPT` of the same test. The lesson games track
must add its lesson game completion route under one of these folders, or add its folder to the list.

- [x] Task: Contract for the write guard
    - [x] `lib/student-view.ts`: guard functions above; the refusal logs one info line `preview_write_refused` (operation and role only)
    - [x] Primary domain permission `primary:student-record:write` (STUDENT only), registered in `primary-avatar/permissions.ts`; the quest module imports it
- [x] Task: Tests for every write path
    - [x] `actions/__tests__/preview-write-guard.test.ts` (9 actions x TEACHER, ADMIN, SYSTEM, plus student)
    - [x] `app/api/__tests__/preview-write-guard.test.ts` (19 routes x 3 staff roles, plus student)
    - [x] `packages/domain/src/__tests__/primary-student-record-permission.test.ts`
    - [x] `lib/__tests__/preview-guard-coverage.test.ts` (with counterexample fixture)
- [x] Task: Implement the server guards (actions, routes, domain; domain `dist` rebuilt)
- [x] Task: Tests for the client layer
    - [x] `components/articles/questions/__tests__/preview-quiz.test.tsx` (MCQ, SAQ, LAQ)
    - [x] `components/lesson/__tests__/preview-lesson.test.tsx` (progress bar); the five lesson games have no render test (see `plan-review.md`, Medium)
    - [x] `components/articles/__tests__/preview-article.test.tsx`
- [x] Task: Implement the client layer and the page-load skips
    - [x] `usePreviewSave()` in quiz, article, lesson progress bar, five lesson games, flashcard games, lesson SAQ, matching game
    - [x] Page-load writes: home `awardPowerUps` skipped for staff; `getAvatarState` no longer writes for staff (domain); the read page keeps its STUDENT-only save, with a test for TEACHER, ADMIN, SYSTEM
    - [x] The rehearsal page runs inside `StudentViewProvider mode="preview"`; the hint copy says nothing is saved
- [x] Task: Generate docs and run doctor
- [x] Task: Measure - User Manual Verification 'Phase S2: Nothing saves in Preview mode' - look check pending (owner, async)
    - Manual steps: (1) Sign in as a teacher in a build and open `/student/read/<article>`; finish the MCQ: the score shows with "Preview: not saved". (2) Count the rows of `user_activity`, `xp_logs`, `article_activity_logs` and the `users.xp` value of the teacher before and after: they stay equal. (3) Open the lesson rehearsal page, move two steps: `lesson_progress` and `xp_logs` stay equal. (4) Sign in as a student and finish a quiz: XP rises as before. (5) With a teacher cookie, POST to `/api/v1/avatar/purchase`: 403 with `PREVIEW_READ_ONLY`.

## Phase S3: Pages that need a student record show a preview state [checkpoint: 9e0e3f2f3]
_Story ref: spec.md#story-s3_

- [x] Task: Contract for the preview page models
    - [x] `lib/student-view.ts`: `previewHomeModel()` (no parameter: it needs no user; deviation) and `previewHeroProfile()`, typed from the existing page props (no sample student data)
    - [x] Practice route contract: the sample word set uses the existing `practiceInputSchema` output of `buildPracticeInput`, with id `sample` (`listPrimarySamplePracticeInput` in the domain)
- [x] Task: Tests for the preview pages
    - [x] `app/[locale]/(student)/student/home/__tests__/preview-home.test.tsx`: staff render the default hero, zero XP and coins, the school leaderboard, and empty notices; `getStudentHome` is not called
    - [x] Tests for avatar, shop, history, reports, sentences, vocabulary, quest battle, and Reedy in preview: no error page, no row of the staff member, write buttons off
    - [x] `app/api/v1/apk/__tests__/practice-preview.test.ts`: staff get the sample word set from published article vocabulary; students keep their saved words
- [x] Task: Implement the preview pages
    - [x] `student/home/page.tsx`, `student/avatar/page.tsx`, `student/avatar/shop/page.tsx`, `student/history/page.tsx` and `components/student/history-list.tsx`, `student/reports/page.tsx`, `student/sentences/page.tsx`, `student/vocabulary/page.tsx`, `student/quest/battle/page.tsx`, `student/reedy/page.tsx`
    - [x] `app/api/v1/apk/practice/route.ts`: the sample word set for staff (read only)
    - [x] `student/games/apk/[cartridgeId]/page.tsx` and `student/games/story/page.tsx`: `save={false}` in preview
    - [x] Copy keys in `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S3: Pages that need a student record show a preview state' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual steps: (1) Sign in as a teacher in a build. Open `/student/home`: the hero banner art, "No streak yet", XP 0, four notices, and the school leaderboard show; no error page. (2) Open avatar: pick a hero and colors; "Save my avatar" is off with "Preview: not saved". (3) Open the shop: pieces show with prices; select one: the try-on works, Buy is off with the note. (4) Open history, reports, sentences, vocabulary: each shows one notice. (5) Open Class Quest battle and Reedy: the not-in-a-class and students-only notices. (6) Open a game and Word adventures: the game loads the sample words and posts no completion (check `xp_logs` stays equal). (7) Sign in as a SYSTEM user with no school: home shows no leaderboard. (8) Sign in as a student: all pages work as before.

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
