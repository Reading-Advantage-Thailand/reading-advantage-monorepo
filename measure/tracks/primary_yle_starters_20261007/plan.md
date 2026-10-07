# Plan: Primary YLE-format Starters Tasks

Track `primary_yle_starters_20261007`. Spec: [spec.md](./spec.md). Start after the deploy on
2026-10-11; work on a lane branch; nothing deploys in the freeze; the migration ships in the
additive window of 2026-11-09 or later.

Order: S1 → S3 → S2 → S9 → S4 → S5 → S6 → S7 → S8. The contract and the matcher come first,
because Workbooks needs the JSON Schema to build its converter, and every screen needs the matcher.

Graph note: `build-graph callers` found no rows for the touched exports (the lane-h graph indexes
the main checkout paths), so the blast-radius lines below come from grep.

## Phase S1: Task item contract
_Story ref: spec.md#story-s1-task-item-contract_

- [ ] Task: Contract & Schema Definition
    - [ ] Add `packages/domain/src/primary-tasks/contracts.ts`: `taskModelSchema` (the five ids), `taskPoolSchema` (`story`, `bank`, `secure`), `pictureRefSchema` (story image, Workbooks path), `answerKeySchema` (accepted strings per gap, `maxWords`), and one item schema per model in a discriminated union on `taskModel`
    - [ ] Refine: a `secure` item may not use a story image; every gap has a key; `RW-spell` letters are a permutation of the key
- [ ] Task: Test
    - [ ] Valid and invalid fixture per model (made-up items only), with the error path naming the item id and the field
- [ ] Task: Implement
    - [ ] Export the schemas and inferred types from the module index
    - [ ] Add a script that writes the JSON Schema (`z.toJSONSchema`) to `packages/domain/schemas/primary-task-item.schema.json`
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc on every export; `build-graph update` for the new files; send the schema path to Workbooks
- [ ] Task: Measure - User Manual Verification 'Phase S1: Task item contract' (Protocol in workflow.md)

## Phase S3: Exact-key matcher
_Story ref: spec.md#story-s3-exact-key-matcher_

- [ ] Task: Contract & Schema Definition
    - [ ] `matchAnswer(key, response)` signature and result type (`correct`, `normalized`) in `primary-tasks/matcher.ts`
- [ ] Task: Test
    - [ ] The four spec cases, plus curly apostrophes, empty input, and digits as written in the key
- [ ] Task: Implement
    - [ ] Normalize case, inner spaces, one final full stop, and apostrophes; compare with the key strings only; count words for `maxWords`
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc with an `@example`
- [ ] Task: Measure - User Manual Verification 'Phase S3: Exact-key matcher' (Protocol in workflow.md)

## Phase S2: Import the Workbooks exports
_Story ref: spec.md#story-s2-import-the-workbooks-exports_
_Blast radius: new tables only; `packages/domain/src/tenant-registry.ts` gains entries (checked by `tenant-coverage.test.ts`)._

- [ ] Task: Contract & Schema Definition
    - [ ] Drizzle tables in `packages/db/src/schema/primary-tasks.ts`: `primary_task_items` (EXEMPT; Workbooks id unique, model, level, pool, article id nullable, set key, example, content jsonb, key jsonb in its own column, approved, retired), `primary_task_item_objectives` (EXEMPT), `primary_task_answers` (FLAT), `primary_test_sittings` (FLAT)
    - [ ] Generate the additive migration; review it; classify the four tables in the tenant registry
    - [ ] Import report contract (counts per model, level, pool; skipped items with reasons)
- [ ] Task: Test
    - [ ] Import twice is idempotent; a removed item with answers is retired; an unmapped article is skipped and reported; an unresolved picture leaves the item unapproved; mock DB per `__tests__/mock-db.ts`
    - [ ] A guard test: no file under the repository contains a secure fixture marker from the secure import test
- [ ] Task: Implement
    - [ ] `importTaskItems({ db, exportData, pool })` in the domain module; CLI `pnpm import-primary-tasks <path> [--secure] [--dry-run]` in packages/domain (DIRECT_DATABASE_URL), reading the path given, never a repository path for `--secure`
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`; run `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S2: Import the Workbooks exports' (Protocol in workflow.md)

## Phase S9: Evidence from task answers
_Story ref: spec.md#story-s9-evidence-from-task-answers_
_Blast radius: `packages/domain/src/primary-mastery/` (evidence-policy.ts, evidence-sources.ts, record-evidence.ts, evidence-contracts.ts, index.ts, and the policy test)._

- [ ] Task: Contract & Schema Definition
    - [ ] A task-answer source in `evidence-sources.ts` that maps choice models to the `mcq` row and written models to the `saq` row of `primary-evidence.v1` (no policy version change)
- [ ] Task: Test
    - [ ] Choice and written answers map to the right rows; example items give no evidence; secure answers are `independent` and keep no item text; replay is idempotent
- [ ] Task: Implement
    - [ ] Enqueue the evidence job from the answer path; load objectives from `primary_task_item_objectives`
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`
- [ ] Task: Measure - User Manual Verification 'Phase S9: Evidence from task answers' (Protocol in workflow.md)

## Phase S4: Choice screens (tick or cross, yes or no, picture word box)
_Story ref: spec.md#story-s4-choice-screens-tick-or-cross-yes-or-no-picture-word-box_

- [ ] Task: Contract & Schema Definition
    - [ ] Client payload schema per model with no key field; answer request and result schemas; the picture resolver contract (story image, Workbooks path, signed URL for secure)
- [ ] Task: Test
    - [ ] Server scoring per model; a word-box word used once only; the example is not answerable; component tests at 360 px for layout
- [ ] Task: Implement
    - [ ] Domain functions `getTaskSet` and `submitTaskAnswer` with `assertCan` and TenantDB; thin route handlers; three components under `apps/primary-advantage/components/tasks/`
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`; phone captures for the owner
- [ ] Task: Measure - User Manual Verification 'Phase S4: Choice screens' (Protocol in workflow.md)

## Phase S5: Written screens (spelling, picture-story answers)
_Story ref: spec.md#story-s5-written-screens-spelling-picture-story-answers_

- [ ] Task: Contract & Schema Definition
    - [ ] Tile state and text answer request shapes (reuse the S4 answer schema)
- [ ] Task: Test
    - [ ] Tile placement and return; one-word scoring through the matcher; three-picture layout at 360 px
- [ ] Task: Implement
    - [ ] Two components; reuse `submitTaskAnswer`
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; phone captures for the owner
- [ ] Task: Measure - User Manual Verification 'Phase S5: Written screens' (Protocol in workflow.md)

## Phase S6: After-reading practice in a story lesson
_Story ref: spec.md#story-s6-after-reading-practice-in-a-story-lesson_
_Blast radius: `packages/domain/src/primary-books/step-map.ts` and its users (guides.ts, progress.ts, lesson-support.ts, class-books.ts, index.ts, mapping.test.ts; the teacher class-book page and `class-book-pacing-controls.tsx` with its test)._

- [ ] Task: Contract & Schema Definition
    - [ ] Add the practice step as a new app step number that shows between steps 13 and 14 only when the lesson has approved `story` items; existing step numbers do not change
- [ ] Task: Test
    - [ ] Lessons without items keep their steps; the step appears and saves `done`; teacher preview shows practice items and no secure item; pacing controls still count steps right
- [ ] Task: Implement
    - [ ] Step map and lesson task component; Thai rubric line from the item
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`
- [ ] Task: Measure - User Manual Verification 'Phase S6: After-reading practice in a story lesson' (Protocol in workflow.md)

## Phase S7: Level bank practice sets
_Story ref: spec.md#story-s7-level-bank-practice-sets_

- [ ] Task: Contract & Schema Definition
    - [ ] Practice list query contract that filters pool `bank` only
- [ ] Task: Test
    - [ ] No query of the practice list returns a `secure` item (a seeded made-up secure item in the mock DB)
- [ ] Task: Implement
    - [ ] Practice list page and set runner on the S4 and S5 screens, with a score per part
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; phone captures for the owner
- [ ] Task: Measure - User Manual Verification 'Phase S7: Level bank practice sets' (Protocol in workflow.md)

## Phase S8: Secure test sittings
_Story ref: spec.md#story-s8-secure-test-sittings_

- [ ] Task: Contract & Schema Definition
    - [ ] Sitting contracts: start (tutor or teacher role, child in class), next item, answer, finish, resume, expiry; result contract with the score per part and the total, no item content
    - [ ] Permission `primary:test-sitting:start` in the permissions module
    - [ ] Signed URL path through the storage adapter (`storage.getSignedUrl`) for secure pictures
- [ ] Task: Test
    - [ ] Secure items are refused outside an open sitting of that child; payloads carry no key; results carry no item text; resume and expiry; a cross-tenant start is refused
- [ ] Task: Implement
    - [ ] Domain functions and thin routes; test-mode screens (English only, no hints, no per-item result); result view for tutor, teacher, child, and parent
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`; run `measure/doctor.sh`; a repository grep for secure ids, keys, and paths finds none
- [ ] Task: Measure - User Manual Verification 'Phase S8: Secure test sittings' (Protocol in workflow.md)
