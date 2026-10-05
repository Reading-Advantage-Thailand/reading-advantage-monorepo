# Plan — Class Books and Teacher Lesson Support

Owner lane: D (data and server), lane E (teacher UI, after lane C ships the shell).

## Phase 0: Discovery (3 h) — done 2026-10-05, see [discovery.md](discovery.md)
- [x] Find existing series/book/lesson tables in `packages/db` and what Primary already stores — none for books; `lesson_records` holds the 14 app phases per user and article
- [x] Read `Workbooks/content/primary/README.md`, the lesson-package schema, and the teacher manual compiler
- [x] Confirm the question-bank counts (10/5/5), the QR URL pattern (`/b/<book>/<n>`, keys `o2`, `o3-1`, `o3-2`, `q4`), and the lesson-12 insert for Origins 3.1 (`e12.json`, injected)
- [x] Write the data model (additive) and review it against the Tutor read test — seven `primary_` tables, no change to the four Tutor-read tables; new article rows only for packages without a mapped legacy article
- Lane D+E runs in worktree `~/Desktop/rama-worktrees/lane-de` (branch `primary/lane-de-teacher-books`, from integration `3e4543100`). The Phase 2 teacher UI needs Lane C Phase 3 (`TeacherPageHeader`, `ClassBookSlot`), which is on `primary/lane-c-ux-rework` and not merged yet; this lane merges that branch in before Phase 2.

## Phase 1: Catalogue and import
- [ ] Migration for new tables
- [ ] Importer from the lesson-package JSON, idempotent, with a dry-run report
- [ ] Import Origins 2, Origins 3.1, Origins 3.2, Quest 4
- [ ] Tutor read test after import

## Phase 2: Class books and pacing (tests first)
- [ ] Domain use-cases (in `@reading-advantage/domain`, not the app): assign, pointer, taught
- [ ] Teacher UI: assign book, pacing view
- [ ] Student home and book view show assigned lessons

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
