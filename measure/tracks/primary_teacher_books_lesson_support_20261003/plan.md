# Plan — Class Books and Teacher Lesson Support

Owner lane: D (data and server), lane E (teacher UI, after lane C ships the shell).

## Phase 0: Discovery (3 h) — done 2026-10-05, see [discovery.md](discovery.md)
- [x] Find existing series/book/lesson tables in `packages/db` and what Primary already stores — none for books; `lesson_records` holds the 14 app phases per user and article
- [x] Read `Workbooks/content/primary/README.md`, the lesson-package schema, and the teacher manual compiler
- [x] Confirm the question-bank counts (10/5/5), the QR URL pattern (`/b/<book>/<n>`, keys `o2`, `o3-1`, `o3-2`, `q4`), and the lesson-12 insert for Origins 3.1 (`e12.json`, injected)
- [x] Write the data model (additive) and review it against the Tutor read test — seven `primary_` tables, no change to the four Tutor-read tables; new article rows only for packages without a mapped legacy article
- Lane D+E runs in worktree `~/Desktop/rama-worktrees/lane-de` (branch `primary/lane-de-teacher-books`, from integration `3e4543100`). The Phase 2 teacher UI needs Lane C Phase 3 (`TeacherPageHeader`, `ClassBookSlot`), which is on `primary/lane-c-ux-rework` and not merged yet; this lane merges that branch in before Phase 2.

## Phase 1: Catalogue and import — done 2026-10-05
- [x] Migration for new tables — `fef53ecf1`: seven `primary_` tables, migration 0065, sentinel probe `0065_primary_class_books`, primary cloudbuild `--required-migration 0065_primary_class_books` (repo edit only, no deploy). Applied to the local `primary_advantage` database (66 migrations). Postgres truncates one FK constraint name (`primary_student_lesson_steps_class_book_id_primary_class_books_id_fk`, 69 chars) to 63 chars; a notice, no conflict.
- [x] Importer from the lesson-package JSON, idempotent, with a dry-run report — `b97feed21`: `packages/domain/src/primary-books/` (`import.ts`, `mapping.ts`, `guides.ts`, `step-map.ts`, `package-schema.ts`), CLIs `pnpm --filter @reading-advantage/domain import-lesson-packages [--dry-run] <folder|file>` and `import-lesson-guides --workbooks <path> [--dry-run]`. 23 tests. The importer runs through `createTenantDB(db, {schoolId: null}).unscoped(...)` so the FR-6 tenant-coverage test passes.
- [x] Import Origins 2, Origins 3.1, Origins 3.2, Quest 4 — local result: 2 series, 4 books, 56 lessons, 26 guide rows (13 en, 13 th). Origins 2, 3.1, and 3.2 packages carry legacy article ids, and the local `primary_legacy_id_map` is empty, so all 42 are `unmapped` (lesson rows without `article_id`). Quest 4 is draft: 14 `catalogue-only` rows. No new article rows were written. On the cutover database, the ETL fills the map and the same command links them.
- [ ] Tutor read test after import — not run: `tutor-read-check` needs `--target` and `--reference` URLs and no legacy reference database is available on this machine. Migration 0065 only creates tables, so the four Tutor-read tables and the `tutor_compat` views are unchanged. Run it on the cutover rehearsal.

## Phase 2: Class books and pacing (tests first)
- [x] Domain use-cases (in `@reading-advantage/domain`, not the app): assign, pointer, taught — `1e89de53e`: `class-books.ts` with `assignClassBook`, `listClassBooks`, `setCurrentLesson`, `markLessonTaught`, `markStepDone`, `getClassBookPacing`, `getStudentClassBooks`; permissions reuse `class:update` (manage) and `class:read`; owner or co-teacher of the class in the user's school. 21 tests.
- [x] Teacher UI: assign book, pacing view — `68f29dcaf` (after the merge of `primary/lane-c-ux-rework`, `cbceff9f6`): the class page fills the Lane C `ClassBookSlot` with `ClassBooksCard` (books, pointer, taught count, lesson plan link, assign form); `/teacher/class-roster/[classroomId]/books/[classBookId]` is the lesson plan (next step and period, 13 step toggles, make current, mark taught). Server actions in `actions/class-books.ts`. Step titles are English in every locale (the Thai step titles live in `primary_lesson_guides`; Phase 4 wires them). The teacher dashboard slot still shows the placeholder.
- [x] Student home and book view show assigned lessons — `68f29dcaf` + `d6e310069` (`listCatalogueBooks`, `getStudentBook`): the home shows one card per class book with the current lesson; the read link opens when workbook step 3 is marked done (or in independent mode); `/student/books/[classBookId]` lists every lesson, links taught and earlier lessons (read ahead), and the current lesson once step 3 is open.
- Verification: domain 24 class-book tests; app 1138 tests pass (182 files). `userModel.activity.behavior.test.ts` hit its 10 s `beforeAll` timeout once under full-suite load and passes alone in 9 s. tsc and eslint clean for app and domain. No browser run yet (memory).

## Phase 3: Progress
- [ ] Step-level progress write path and the client hooks in the lesson flow
- [ ] Class grid, student drill-down, CSV
- [ ] Fidelity signals

## Phase 4: Lesson support
- [ ] Guide content import (en, th) and the guide page
- [ ] Overlay and rehearsal page
- [ ] Projector mode and answer keys
- [ ] Game links per period; teaching demos for the games Tutor already demos
- [ ] Manual and first-time how-to

## Phase 5: Verify
- [ ] Teacher walk-through in a browser on a seeded class (agent with vision)
- [ ] Compare each guide step with the Workbooks source (separate reviewer agent)
- [ ] Workbook-first lock behavior tests (TL on, IND off)
