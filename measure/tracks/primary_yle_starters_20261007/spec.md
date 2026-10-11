# Spec: Primary YLE-format Starters Tasks

Track `primary_yle_starters_20261007` | Type: feature | Spec mode: story | Created 2026-10-07 |
Start: after the deploy on 2026-10-11; nothing deploys in the freeze; the migration ships in the
additive window of 2026-11-09 or later.

Internal document: it names Cambridge YLE task formats. Student, parent, and teacher copy never
names Cambridge, YLE, Starters, Movers, or Flyers (program rule; PR plan section 4).

## Overview

**Sprint goal:** Primary children at Pre-A1 (levels 1-3) practice the five Starters reading and
writing task formats after a story and in a level bank, and a tutor or teacher can give them a
locked test form; the server scores every answer with an exact key, and every answer gives
mastery evidence.

Sources: `measure/primary-yle-task-models.md` (catalog, owner decisions 1-11) and
the PR plan `advantage-pr/12-operations/level-tests-and-certificates-plan.md` (phase P2). Workbooks
writes all items (package part `yle`, level bank book folders, a separate secure export) and
makes all their pictures (owner, 2026-10-07); Forge makes no YLE pictures.

The five task models of this track:

| Model | Starters part | Child action | Evidence surface |
|---|---|---|---|
| `RW-tick-cross` | 1 | Look at a picture and a sentence; choose tick or cross | `mcq` |
| `RW-yes-no` | 2 | Look at one scene; answer yes or no for each sentence | `mcq` |
| `RW-spell` | 3 | Look at a picture; build the word from its mixed letters | `saq` |
| `RW-box-cloze` | 4 | Read a short text; put a word from a picture word box in each gap | `mcq` |
| `RW-picture-qa` | 5 | Look at a three-picture story; write a one-word answer to each question | `saq` |

## Stories

### Story S1: Task item contract
**As a** content pipeline (Workbooks converter and monorepo importer)
**I want** one Zod contract for task items, with a JSON Schema copy
**So that** both sides validate the same item shape before an item reaches a child

**Acceptance Criteria:**
- Given an item of each of the five models, When it is parsed, Then the contract accepts it with its model id, level, pool (`story`, `bank`, or `secure`), Workbooks item id, example flag, rubric, Thai rubric line, stem, options, picture references, answer key, and objective short ids.
- Given an item whose content does not fit its model (for example a `RW-spell` item with no letters, or a `RW-box-cloze` gap with no key), When it is parsed, Then the contract rejects it and names the item id and the field.
- Given an answer key in the converter's expanded form (accepted strings per gap and `maxWords`), When it is parsed, Then the contract keeps the strings exactly as written.
- Given a picture reference, When it is parsed, Then it is one of: `{ kind: "story", position }` (a picture of the item's own article: `hero`, `inline-para-2`, or `inline-para-3`) or `{ kind: "picture", id }` (an id in a Workbooks picture list, for example `w-starters-apple`); a `secure` item may not use `kind: "story"`, and its ids use the `sec-` prefix of the private list.
- Given the contract, When the JSON Schema export runs, Then it writes a schema file that Workbooks can use in its converter.

**Estimate:** M
**Priority:** Must

### Story S2: Import the Workbooks exports
**As a** content admin
**I want** an import command for the practice export and, separately, for the secure export
**So that** approved items enter the database tagged and ready, and secure items never touch a repository

**Acceptance Criteria:**
- Given the practice export (story `yle` parts and level bank folders), When the import runs, Then it stores each approved item with its objective tags and reports counts per model, level, and pool.
- Given the same export, When the import runs a second time, Then nothing changes (idempotent by Workbooks item id), and an item removed from the export is retired, not deleted, if answers exist for it.
- Given a story item whose article is not in the database (legacy id not mapped), When the import runs, Then it reports the item and skips it.
- Given the secure export, When the import runs with a path or private source outside the repository, Then it stores the items with pool `secure`; no secure item, key, or picture is written to any file in the repository.
- Given a picture reference that resolves to nothing, When the import runs, Then it reports the item and stores it as not approved.

**Estimate:** M
**Priority:** Must

### Story S3: Exact-key matcher
**As a** child who writes an answer
**I want** the same answer rule as the exam
**So that** my correct spelling counts and a wrong spelling does not

**Acceptance Criteria:**
- Given accepted strings `["park", "the park"]` and `maxWords` 3, When the child writes " The park. ", Then the answer is correct (case, extra spaces, and one final full stop are ignored; curly apostrophes count as straight ones).
- Given the same key, When the child writes "prak", Then the answer is wrong.
- Given `maxWords` 1, When the child writes two words, Then the answer is wrong.
- Given a key, When the matcher runs, Then it uses only the accepted strings in the key and adds no variants (the converter adds British spellings).

**Estimate:** S
**Priority:** Must

### Story S4: Choice screens (tick or cross, yes or no, picture word box)
**As a** Pre-A1 child
**I want** to answer by tapping
**So that** I can show what I read without writing

**Acceptance Criteria:**
- Given a `RW-tick-cross` item, When the child taps tick or cross, Then the server scores the answer and the screen shows the result in practice mode.
- Given a `RW-yes-no` set, When the child answers each sentence about the one scene, Then each sentence is one scored answer.
- Given a `RW-box-cloze` text, When the child puts a box word in each gap, Then each gap is one scored answer, and a box word can be used once only.
- Given a phone 360 px wide, When any of these screens opens, Then a word picture shows at most 200 CSS px wide and a scene at most 400 CSS px wide, with alt text, and the page does not scroll sideways.
- Given the example item of a part, When the part opens, Then the example shows filled in and cannot be answered.

**Estimate:** M
**Priority:** Must

### Story S5: Written screens (spelling, picture-story answers)
**As a** Pre-A1 child
**I want** to build or write short words
**So that** I practice spelling as in the exam

**Acceptance Criteria:**
- Given a `RW-spell` item, When the child taps the mixed letter tiles, Then the tiles form the word, a tap on a placed tile returns it, and the finished word is scored by the matcher.
- Given a `RW-picture-qa` item, When the child types an answer, Then the matcher scores it with `maxWords` 1.
- Given a three-picture story, When the screen opens on a phone, Then the three pictures and the question are visible without sideways scrolling.

**Estimate:** M
**Priority:** Must

### Story S6: After-reading practice in a story lesson
**As a** child in a Pre-A1 lesson
**I want** an exam-style practice step after the story
**So that** I meet the test formats with words I already know

**Acceptance Criteria:**
- Given a lesson whose package has an approved `yle` part, When the child reaches period 4, Then a practice step appears after Language Questions and before Lesson Reflection.
- Given a lesson with no `yle` part, When the child opens the lesson, Then no practice step appears and the step numbers of other lessons do not change.
- Given the practice step, When it shows a part, Then the English rubric and the Thai rubric line show above the items.
- Given a teacher, When the teacher opens the lesson preview, Then the practice items show, and no `secure` item shows anywhere.
- Given the child finishes the step, When progress is saved, Then the step is `done` in the lesson steps table.

**Estimate:** M
**Priority:** Must

### Story S7: Level bank practice sets
**As a** child at the end of a Pre-A1 book
**I want** practice sets in the test formats that are not tied to one story
**So that** I can prepare for the level test

**Acceptance Criteria:**
- Given approved level bank items for Pre-A1, When a child opens the practice list, Then the sets show by part, and each set runs on the S4 and S5 screens.
- Given a practice set, When the child finishes it, Then the screen shows the score per part and the answers marked right or wrong.
- Given the practice list and every practice query, When they run, Then they never return an item of pool `secure`.

**Estimate:** M
**Priority:** Should

### Story S8: Secure test sittings
**As a** tutor or teacher
**I want** to start a locked test form for a child and see only the per-skill result
**So that** the certificate result shows the child's English and not a memory of the items

**Acceptance Criteria:**
- Given a tutor or teacher with the right role and a child in their class, When they start a sitting with a secure form, Then the server creates the sitting and the child sees the form in English only, with no Thai line, no hints, and no result per item.
- Given any request that is not part of an open sitting for that child, When it asks for a secure item, Then the server refuses it.
- Given a secure item, When the client receives it, Then the payload has no answer key, and the server scores each answer.
- Given a secure picture, When the client shows it, Then it loads through a short signed URL from private storage.
- Given a finished sitting, When the tutor, teacher, child, or parent views the result, Then it shows the score per part and the reading and writing total, and never the item text or the answers.
- Given a sitting that is interrupted, When the child comes back before it expires, Then it resumes at the next unanswered item.

**Estimate:** L
**Priority:** Must

### Story S9: Evidence from task answers
**As a** mastery graph
**I want** each scored answer to give evidence for the item's objectives
**So that** practice and test answers move the child's objective state

**Acceptance Criteria:**
- Given a scored answer on a choice model, When the evidence job runs, Then it writes evidence with the `mcq` row of `primary-evidence.v1`; a written model uses the `saq` row.
- Given an example item, When it is shown, Then no evidence is written.
- Given an answer in a secure sitting, When evidence is written, Then the mode is `independent`, and the evidence row keeps the item id and the objective but no item text.
- Given the same answer processed twice, When the job runs again, Then no second evidence row appears (the existing idempotency rule).

**Estimate:** S
**Priority:** Must

## Non-Functional Requirements

1. **Rights:** formats and short rubric lines only; no Cambridge items, texts, pictures, or audio.
2. **Public repositories:** the monorepo is public. No secure item, key, or picture is committed,
   seeded, logged, or put in a test fixture. Test fixtures use made-up items.
3. **Server scoring:** the server scores every answer in every pool, so that no client decides a
   result (tech debt "endpoints trust client-derived XP").
4. **Tenancy:** content tables are EXEMPT (global catalogue); answer and sitting tables are FLAT
   (`schoolId`). Every new table is classified in `tenant-registry.ts`.
5. **Migrations:** additive only, no enum `ADD VALUE` (lessons-learned); text columns with Zod
   checks instead of new pg enums.
6. **Copy:** American spelling in rubric lines and stems; no exam names in any copy.
7. **Layout:** every screen works at 360 px width.
8. **Docs:** JSDoc on every export; tests in the same change (AGENTS.md).

## Acceptance Criteria (track)

1. All nine stories meet their criteria, with tests for the contract, the importer, the matcher,
   the secure-pool refusal, and the evidence mapping.
2. A grep of the repository finds no secure item id, key, or picture path.
3. The practice export of at least one Pre-A1 lesson and one Pre-A1 level bank set imports and
   runs end to end on a local database; a made-up secure form runs a full sitting.
4. `pnpm turbo run test`, `lint`, `check-types`, and `build` pass for the touched packages.
5. The owner checks the screens on a phone before the merge.

## Dependencies

- Workbooks: the export shape (agreed in principle 2026-10-07), the first approved `yle` parts, and
  the secure export.
- The owner: a private home for the secure forms (Workbooks recommends a new private repository).
- Workbooks: the picture lists (agreed 2026-10-07: one public list for practice, one private list for
  secure items; entries `id`, `kind` word | scene | story-strip, `word`, `listLevel`, `altEn`, `altTh`,
  `path`, `width`, `height`, `version`, `approval`). Word pictures 768 x 768, scenes 1200 x 900, WebP.
- PR plan phase P1 (test specification) for the composition of the secure forms.
- The tags backfill after the ETL rerun, for the article ids of story items.

## Out of Scope

- The Movers and Flyers models, listening, and speaking (later tracks and PR phases P4 and P5).
- The certificate PDF, its checking page, and the Tutor Advantage embed (PR phases P8a and P8t).
- The item analysis and Angoff scripts (PR phase P7).
- The grammar graph track (D12) and the knowledge state track T3 (D8).
- The pictures and the items themselves (Workbooks).
