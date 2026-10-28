# Primary book editions

Design note | A-30 | 2026-10-29 | Due: 2026-11-05 | Status: proposed defaults for Daniel and the PM

## Summary

Keep one `primary_books` row per edition, with a shared book identity.
Keep legacy IDs, printed links, assignments, and records unchanged.
Give every graph-first lesson a new article and new questions.
Change one default per book only after Daniel confirms that its stock is gone.
Keep existing classes on their assigned edition until their teacher confirms a change.

Daniel, 2026-10-29 05:10 ICT; source: the PM assignment:

> "Wait. All books need a graph-first rewrite, and we will need to develop a way to version the legacy Origins 2 and 3.1 books until they sell out, then cut over to the new versions in both tutor and primary."

## Sources

References describe repository evidence, not a live database inspection. `Workbooks/` means `/home/daniebo/Desktop/Workbooks/`.

| Ref | Verified fact and source |
|---|---|
| S1–S3 | Catalogue, assignments, and steps: `packages/db/src/schema/primary-books.ts:1-61,84-155`. Books have UUID IDs and unique keys; assignments carry `schoolId`. |
| S4–S6 | Catalogue upserts, book keys, and legacy fallbacks: `packages/domain/src/primary-books/import.ts:218-246`; `packages/domain/src/primary-books/mapping.ts:9-16,33-40`. Keys: `o1`, `o2`, `o3-1`, `o3-2`, `q4`. |
| S7–S8 | Reimports and unique ID maps: `packages/domain/src/primary-books/import.ts:73-99,132-165`; `packages/db/src/schema/primary.ts:243-258`; `packages/db/drizzle/0060_primary_legacy_id_map.sql:1-8`. |
| S9–S10 | Printed QR cuids and the Tutor Reading Origins 2 check: `docs/deployment/primary-cutover-migration-spec.md:11,70,171`. |
| S11–S12 | Tutor example `cmgqx8v6602p3t79btatvfjuw`: `docs/deployment/tutor-switch-brief.md:117-123` (uncommitted); published migration mapping: `measure/tracks/primary_legacy_data_migration_20261004/legacy-links-check-20261007.md:3-6`. |
| S13–S14 | The example has key `o2/1` and type `primary`: `Workbooks/content/primary/origins-2/l01.json:3-17`; `Workbooks/primary/origins-2-a0/project.json:1-6`. |
| S15–S17 | Compatibility IDs, five SQL strings, and four-view grants: `packages/db/drizzle/0061_tutor_compat_views.sql:7-60`; `packages/db/src/tutor-read-queries.ts:19-54`; `packages/db/scripts/tutor-reader-grants.sql:8-11,19-34`. |
| S18 | Tutor's connection switch targets 2026-11-03; audio depends on question position: `docs/deployment/tutor-switch-brief.md:3,26-28`. |
| S19–S21 | QR and Tutor URL contracts: `apps/primary-advantage/lib/book-link/open-book-link.ts:29-36,63-71`; `apps/primary-advantage/lib/book-link/tutor-url.ts:1-15`; `packages/domain/src/primary-books/book-link.ts:7-8,21-32`. |
| S22–S23 | Tenant classifications: `packages/domain/src/tenant-registry.ts:213-227,417-421`. Catalogue and tags are `EXEMPT`; class books and attempts are `FLAT`; steps are `REFERENTIAL`. |
| S24–S26 | Attempts, progress, flashcards, questions, and answers: `packages/db/src/schema/primary-lesson-attempts.ts:11-47`; `packages/db/src/schema/progress.ts:29-35,56-62,84-105`; `packages/db/src/schema/questions.ts:8-47,53-70`. |
| S27–S29 | Graph tags, contracts, and evidence IDs: `packages/db/src/schema/primary-mastery.ts:12-74`; `packages/domain/src/primary-mastery/contracts.ts:31-85,103-118`; `packages/domain/src/primary-mastery/evidence-contracts.ts:44-57`. |
| S30–S32 | Authoring, approved insert, and injector: `Workbooks/docs/content-plans/primary-origins-3.2-plan.md:53,107-116,141`; `Workbooks/docs/content-plans/primary-origins-3.1-errata-lesson-12.md:3,9-11,66-71`; `Workbooks/measure/tracks/primary_injector_20261001/plan.md:12-24`. |
| S33–S34 | Legacy level labels conflict with workbook labels: `docs/deployment/primary-cutover-migration-spec.md:93`; `Workbooks/primary/origins-3.1-a0/01-My New City Plane Trip _workbook.json:1-5`. |
| S35 | The company site lists three separate books on sale: `apps/www-reading-advantage/src/locales/pages/home.ts:23,77,301,525`. |
| S36 | The role list defines `SYSTEM`: `packages/auth/src/roles.ts:6`. |

## (a) Data model

### Scope and book identity

The scope includes Primary Advantage Origins 2, Primary Advantage Origins 3.1, and Reading Advantage Origins 2.
Reading Advantage Origins 2 is a distinct printed book on sale, not an alias of the Primary book [S35].
Reserve `ra-o2` and `ra-o2-e2` for its two editions.
Its lesson location and any shared content remain unverified.
Assumption: its lessons may live outside the Primary database, including in the Reading Advantage app.
The inspected sources identify no article manifest or Primary catalogue row for that separate book.

The verified Tutor example lives in migrated `articles`, through `primary_legacy_id_map`, and its Workbooks package names `o2/1` [S11–S14].
The importer maps `o2` to **Primary Advantage Origins 2** [S4–S5].
Finding: the cutover spec probably names that lesson incorrectly as Reading Advantage Origins 2 [S10–S14].
Keep the Reading book in scope as a separate family; create no rows until the manifest names its articles.

Use `primary_books.key` as the portable edition ID, not its database UUID.
Keep the existing `o2` and `o3-1` keys for legacy editions.
Use `o2-e2` and `o3-1-e2` for graph-first editions.
Use only `[a-z0-9-]`, within the existing 16-character limit [S21].

### Proposed additive fields

These proposed fields show final nullability; the rollout first adds nullable links.

| Table or column | Type | Nullable | Meaning and default |
|---|---|---|---|
| `primary_book_titles` | New global table | — | One logical book, across editions; register as `EXEMPT`. |
| `primary_book_titles.key` | text, primary key | No | Stable family slug; initially the legacy key. |
| `primary_book_titles.name` | text | No | Full product and book name, without an edition label. |
| `primary_book_titles.default_edition_key` | text, FK to `primary_books.key` | No | The single cut-over switch; initially the legacy edition. |
| `primary_books.book_key` | text, FK to `primary_book_titles.key` | No | Links each edition to its logical book. |
| `primary_books.edition_kind` | text, checked values | No | `legacy` or `graph-first`; backfill from an approved manifest. |
| `primary_class_books.archived_at` | timestamp | Yes | Null while the class uses this edition; archive only after an explicit teacher decision. |
| `primary_student_book_editions` | New tenant table | — | Optional binding for mixed-edition classes; register as `FLAT`. |
| `primary_student_book_editions.school_id` | uuid, FK to `schools.id` | No | Derive from the authenticated tenant. |
| `primary_student_book_editions.classroom_id` | uuid, FK to `classrooms.id` | No | The student's verified class. |
| `primary_student_book_editions.student_id` | text, FK to `users.id` | No | The student whose printed book differs. |
| `primary_student_book_editions.book_key` | text, FK to `primary_book_titles.key` | No | The logical book being selected. |
| `primary_student_book_editions.class_book_id` | uuid, FK to `primary_class_books.id` | No | The exact edition assignment, including its mode and lesson state. |
| `tutor_compat.book_editions` | New read-only global view | — | Edition and lesson manifest for Tutor; see section (d). |

Keep one binding per `(school_id, classroom_id, student_id, book_key)`.
Enforce default family membership with a composite foreign key to a unique `(key, book_key)` pair on `primary_books`.
Validate binding school, class membership, and book identity before every write and resolution.
Reuse `primary_book_lessons.book_id`, lesson numbers, approval, and packages for each edition [S1–S4].
Give new lesson keys the exact edition prefix, such as `o3-1-e2/12`.
Do not infer book identity or edition from `raLevel`; legacy Origins 3.1 labels are unreliable [S33–S34].

### Article identity and graph-first content

Default decision: share no article row between editions, even when text and questions match.
Article-level progress and tags cannot identify two separate editions reliably [S25–S29].
Give every graph-first lesson new article, question, and flashcard-content rows.
Keep every legacy map row unchanged; create no map row for new-edition content [S8, S15].
Keep existing mapped content and question order unchanged for legacy Tutor reads [S15, S18].

Here, graph-first means selecting objectives and vocabulary nodes before writing the lesson and question bank [S28, S30].
Require target and supporting objectives, question objectives, vocabulary roles, and graph releases in every new package [S27–S30].
Reject content changes to a published edition's lesson mapping or question IDs.
Allow idempotent imports of identical content; require a reviewed successor edition for changed published content.
Draft imports may change before publication, provided no assignment or learner record references them.

The build must replace the current destructive reimport behavior for published edition content [S7].
It must also separate replacement provenance from legacy lookup; `meta.replaces` currently selects the legacy article [S6].

## (b) Edition per class and student, and records

The proposed class picker groups editions under their book and labels them Legacy or Graph-first.
It preselects the book default but requires the teacher to confirm the printed edition.
Persist the exact `primary_books.id` in `primary_class_books.book_id`; never resolve it again through the current default [S2].

A student inherits the sole active class assignment for that book.
For a mixed-edition class, the teacher adds the second edition as another class book.
The teacher sets explicit student bindings for that book before students continue.
Multiple active assignments without a binding require a choice; the resolver must not guess.
A teacher may change a binding after confirming the student's printed edition; the previous records remain intact.
For an independent reader without a class, an exact printed link selects content without creating a class assignment.

Explicit printed links always select their edition, including legacy cuids and `/b/o2/<n>` [S9, S19–S21].
New prints use `/b/o2-e2/<n>` or `/b/o3-1-e2/<n>`, including the writing suffix.
A conflicting class assignment shows the edition difference; it never silently substitutes another edition or writes steps to that assignment.
Only an unbound catalogue choice uses the current book default.

Keep old articles, questions, assignments, attempts, answers, flashcards, activities, XP, and mastery evidence.
Never copy completion, scores, or answers to a rewritten lesson by lesson number.
Retain article-based history even when no class book exists; label an edition only when the mapping proves it [S24–S29].
Existing mastery evidence remains valid for its recorded objective and release; a new edition does not reset the student's graph.
New lessons contribute new evidence through the existing pipeline, without replaying old events [S27–S29].

Scope every tenant read and write by trusted `schoolId`; join referential records through their scoped owner [S22–S23].
Keep resolution and authorization in `packages/domain/src/primary-books`, with Zod contracts at every external boundary.
Keep pages and route handlers thin.

## (c) Cut-over switch

The only switch is `primary_book_titles.default_edition_key`, independently for each book.
Daniel says when a book is sold out.
Daniel names the user who sets the switch; that user must have the `SYSTEM` role [S36].
The named user sets the switch through the proposed SYSTEM-only catalogue control after Daniel's sold-out word.
Default operator: the person whom Daniel names.
Agents never change the production switch.
A teacher or school admin cannot change a global book default.
The backend validates the target edition and updates the pointer in one transaction.
Record Daniel's stock confirmation, actor, previous value, new value, and time through the existing audit mechanism.
Do not infer sold-out status from a date, lesson progress, or the historical stock count [S31].

Require approved lessons, valid articles, graph tags, media, and matching Tutor mappings before the switch.
Require both programs to acknowledge the same edition manifest before the named user sets the switch.
Keep the old default if any readiness check fails; do not set an automatic cut-over date.
Default mid-term rule: each legacy class finishes its assigned edition, even after stock reaches zero.
An explicit teacher transition creates a new class-book assignment and archives the old assignment only when its students finish.
Mixed classes keep both assignments active until all relevant students finish.

Rollback restores the previous default only; it does not remove new assignments or records.

## (d) Brief for the Tutor Advantage programmer

- No edition work blocks the database switch of 2026-11-03.
- Before the first graph-first article is published: `import_published_articles` reads every published article without an edition filter (`packages/db/src/tutor-read-queries.ts:53`). Tutor must first select lessons through `tutor_compat.book_editions`. Until then, the monorepo keeps new-edition articles unpublished (rollout step 11).

The Tutor database switch targets 2026-11-03, separately from the edition switch (`docs/deployment/tutor-switch-brief.md:3`).
Keep the four existing `tutor_compat` views and legacy reads unchanged (`packages/db/drizzle/0061_tutor_compat_views.sql:7-60`).
Keep cuids as opaque strings; also accept UUID strings for new articles.
Preserve question sequence and its audio association (`docs/deployment/tutor-switch-brief.md:26-28`).

The monorepo build will propose an additional global view, `tutor_compat.book_editions`, and its SELECT grant.
Its rows will expose `book_key`, `edition_key`, `edition_kind`, `default_edition_key`, `lesson_number`, `article_id`, and `available`.
`article_id` will use the cuid-or-UUID rule in `packages/db/drizzle/0061_tutor_compat_views.sql:9`.
`available` will require an approved lesson and a published article.
The view will expose catalogue data only, without classes, students, or tenant records.

Import lessons by `(edition_key, lesson_number)`, not title, level, or UUID identity across databases.
Replace the unfiltered published-article import for edition selection (`packages/db/src/tutor-read-queries.ts:50-54`).
Keep both editions available through exact identifiers; use `default_edition_key` only for new unbound choices.
Read the default at selection time; confirm the current value before creating a new binding.
Keep each Tutor class or student pinned to its selected edition and retain all existing lesson records.
Recognize `{book}` edition slugs and `{n}` lesson numbers (`apps/primary-advantage/lib/book-link/tutor-url.ts:4-14`).

Show an edition choice when an old Tutor record lacks a verified edition; never infer it from the article level.
Keep legacy classes unchanged at the stock switch unless their teacher confirms a transition.

Verify legacy and new lessons, question audio order, exact QR links, and record retention before acknowledging readiness.
Send results and the accepted manifest version to the PM; Daniel authorizes the production change.
The monorepo does not edit, deploy, or host Tutor Advantage.

## Alignment with Workbooks

The Workbooks content plan is due 2026-10-31; source: the PM assignment, not a verified repository milestone.
The PM sends this note to Workbooks; each repository changes only through its own owner.
Keep the previously sent defaults: edition rows, slug IDs, legacy keys, `-e2` keys, and unchanged legacy map rows.
The article-sharing decision now requires separate rows because article-keyed records must retain their edition meaning.
Workbooks supplies a manifest with book identity, edition slug, lesson number, package key, and approval state.
It also supplies graph releases, graph tags, print exports, and a legacy-to-new lesson crosswalk for reference only.

Use Git commit identity for the handoff; add no hashes.
Keep legacy packages separate from graph-first packages; never overwrite `o2/<n>` with `o2-e2/<n>` content.
Update both import paths before new imports; existing injectors support updates in place [S7, S32].
Do not send new packages through legacy-ID fallbacks, including `meta.replaces` [S6].
The approved Origins 3.1 lesson-12 insert remains an existing correction, not the complete graph-first edition [S31].

Verify which insert mapping is live before freezing the legacy manifest; preserve the old printed article URL in all cases.
Assumption: the October 31 plan includes the rewrite sequence, release criteria, and printed edition labels.

## Migration and rollout order

1. Obtain Daniel's review of these defaults through the PM.
2. Locate the Reading Advantage Origins 2 lessons through the Workbooks article manifest.
3. Create the build track and its Zod contracts before implementation.
4. Generate additive Drizzle migrations for the proposed fields and tables.
5. Add nullable book links before backfilling existing edition rows.
6. Backfill book identities and legacy defaults from the approved manifest.
7. Validate family membership before enforcing the final constraints.
8. Classify each new table in the tenant registry [S22–S23].
9. Add the edition view and its reader grant without changing the four legacy views.
10. Deploy edition-aware import and selection behavior in both programs after Daniel's authorization.
11. Keep new articles unpublished until both programs filter catalogue selection by edition.
12. Import and verify graph-first packages without changing legacy rows.
13. Publish ready editions for explicit selection while legacy remains the default.
14. Obtain Daniel's sold-out confirmation separately for each book.
15. Change that book's default after both programs acknowledge readiness.

This assignment changes only this note. The build track must run the tests below; this design assignment runs no tests.

## Tests for the build track

- Additive migration and rerun retain all existing keys, UUIDs, map rows, and legacy view results.
- Family constraints reject a default edition from another book.
- Slug validation accepts legacy and `-e2` keys and rejects invalid or oversized keys.
- The manifest keeps the distinct Reading book separate and names its source articles before row creation.
- New-edition imports allocate separate article and question IDs without legacy map rows.
- Replacement provenance cannot trigger legacy lookup or rewrite a mapped article.
- Reimport accepts identical content and rejects changes to published lesson or question identity.
- Class and student resolution select the printed edition before the global default.
- Mixed-class resolution requires bindings and retains separate steps for each class book.
- Tenant checks reject foreign schools, classes, students, and class-book bindings.
- A stock switch changes only new unbound selections and preserves mid-term assignments.
- Unauthorized, unready, and concurrent switch requests retain a valid default and create the required audit record.
- Legacy cuid links, edition QR links, writing links, and Tutor URL substitutions retain exact targets.
- The edition view preserves ID semantics and exposes no tenant records.
- Tutor imports retain lesson order, question audio order, and both edition identities.
- Old attempts, answers, flashcards, XP, progress, and mastery evidence survive publication, switch, and rollback.
- Origins 3.1 resolves by manifest, including lesson 12, regardless of legacy level labels.

## Open points

| Point | Owner | Default |
|---|---|---|
| Where do the Reading Advantage Origins 2 lessons live, and do they share content with Primary Advantage Origins 2? | Daniel, through the PM; Workbooks supplies the manifest | A separate book family; no rows until the manifest names its articles. |
| Which legacy catalogue rows and lesson-12 insert mapping are live? | Monorepo programmer; Daniel authorizes inspection | Verify read-only during the build; preserve all existing printed IDs. |
| Who operates the stock switch? | Daniel | The person whom Daniel names, with the `SYSTEM` role, after Daniel's sold-out word and both programs' readiness acknowledgments. Agents never operate it. |
| Must a legacy class change mid-term? | Daniel | No; the teacher confirms a later transition. |
| Can editions share an unchanged article? | Daniel; monorepo programmer | No; separate rows preserve edition-specific records and graph tags. |
| Can one class contain both printed editions? | Daniel; teachers | Yes, through separate class books and explicit student bindings. |
| What belongs in the October 31 content plan? | Workbooks owner; PM | Rewrite order, edition manifest, graph requirements, print labels, and acceptance criteria. |
| When does each edition become ready and sell out? | Workbooks owner; Tutor programmer; Daniel | No automatic date; Daniel confirms stock status after readiness. |
| Does Tutor need caching for the default pointer? | Tutor programmer | Read at selection time and confirm before binding; keep existing bindings unchanged. |

## Facts changed

- A-30 now has a proposed edition design; implementation and Daniel's approval remain pending.
- Reading Advantage Origins 2 is a distinct printed book on sale; its article manifest and lesson location remain unverified [S35].
- The Tutor example maps to Primary's `o2/1`; the cutover spec probably uses the wrong book name [S10–S14].
- Daniel names a SYSTEM user to operate the switch after his sold-out word; agents never operate the production switch.
- No live status, stock count, release date, price, database record, or deployment changed.
