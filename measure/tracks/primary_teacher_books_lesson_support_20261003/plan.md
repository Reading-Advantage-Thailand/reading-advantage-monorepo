# Plan — Class Books and Teacher Lesson Support

Owner lane: D (data and server), lane E (teacher UI, after lane C ships the shell).

## Phase 0: Discovery (3 h)
- [ ] Find existing series/book/lesson tables in `packages/db` and what Primary already stores
- [ ] Read `Workbooks/content/primary/README.md`, the lesson-package schema, and the teacher manual compiler
- [ ] Confirm the question-bank counts, the QR URL pattern, and the lesson-12 insert for Origins 3.1
- [ ] Write the data model (additive) and review it against the Tutor read test

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
