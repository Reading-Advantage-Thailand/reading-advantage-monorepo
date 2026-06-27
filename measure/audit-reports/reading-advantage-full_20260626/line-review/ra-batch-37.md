# Line-by-Line Review: Reading Advantage — Batch 37

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-37`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / SQL / static-asset / privacy / security

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-37` were read in full. The batch
covers:

- 7 prompt / taxonomy JSON files in `apps/reading-advantage/data/` (CEFR level
  prompts, level evaluation, chatbot prompts, combined MC/SA/LA prompts,
  type-genre, writing feedback).
- 2 prompt TS files (`prompt-chatbot.ts`, `prompt-level-test-chat.ts`).
- 1 mark-down rubric (`new-level-evaluation-prompts.md`).
- 1 HTML workbook template (`workbook_template.html`).
- 2 empty `.jpg` placeholders (0 bytes each, tracked in git).
- 7 SQL migration files in `apps/reading-advantage/db-migrations/legacy-matviews/`
  (3 forward migrations, 2 rollbacks, 1 simple variant, 1 base migration).

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/data/cefr-level-prompts.json` | 1–84 |
| 2 | `apps/reading-advantage/data/images/temp.jpg` | 0 bytes (empty) |
| 3 | `apps/reading-advantage/data/new-level-evaluation-prompts.json` | 1–26 |
| 4 | `apps/reading-advantage/data/new-level-evaluation-prompts.md` | 1–81 |
| 5 | `apps/reading-advantage/data/prompt-chatbot.ts` | 1–11 |
| 6 | `apps/reading-advantage/data/prompt-level-test-chat.ts` | 1–131 |
| 7 | `apps/reading-advantage/data/prompts-combined-LA.json` | 1–66 |
| 8 | `apps/reading-advantage/data/prompts-combined-MC.json` | 1–66 |
| 9 | `apps/reading-advantage/data/prompts-combined-SA.json` | 1–66 |
| 10 | `apps/reading-advantage/data/tmp/temp.jpg` | 0 bytes (empty) |
| 11 | `apps/reading-advantage/data/type-genre.json` | 1–434 |
| 12 | `apps/reading-advantage/data/workbook-template/workbook_template.html` | 1–1876 |
| 13 | `apps/reading-advantage/data/writing-feedback.md` | 1–115 |
| 14 | `apps/reading-advantage/db-migrations/legacy-matviews/20251009000001_add_dashboard_materialized_views/migration.sql` | 1–309 |
| 15 | `apps/reading-advantage/db-migrations/legacy-matviews/20251015000000_enhance_velocity_matviews/migration.sql` | 1–221 |
| 16 | `apps/reading-advantage/db-migrations/legacy-matviews/20251015000000_enhance_velocity_matviews/rollback.sql` | 1–52 |
| 17 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022000000_enhance_assignment_funnel_analytics/migration.sql` | 1–243 |
| 18 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022000000_enhance_assignment_funnel_analytics/rollback.sql` | 1–41 |
| 19 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration.sql` | 1–299 |
| 20 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration_simple.sql` | 1–42 |

**Total lines reviewed:** 4,163 (plus 2 empty binary files).
**No file was partially reviewed.**

---

## Executive Summary

This batch is split between (a) AI prompt templates that drive the
article-generation / question-generation / level-assessment / chatbot
features, and (b) the legacy materialized-view migrations whose SQL is
applied via `psql -f` outside the Drizzle pipeline (per
`db-migrations/legacy-matviews/README.md`).

The most severe issues found are:

1. **`prompt-chatbot.ts` is interpolated raw into the model system message
   in `assistant-controller.ts` and `stories-assistant-controller.ts`
   alongside un-escaped user-supplied `passage`, `summary`, `title`,
   `image_description`, and `blacklistedQuestions` JSON arrays.** This is a
   prompt-injection sink; adversarial passages can hijack the model's
   behaviour or leak the surrounding system prompt. The same pattern
   occurs for `prompt-level-test-chat.ts` in `level-test-controller.ts`.
2. **All four SQL migrations reference `sa.status` (`'NOT_STARTED'`,
   `'IN_PROGRESS'`, `'COMPLETED'`) on `student_assignments`.** The
   current Drizzle schema (`packages/db/src/schema/content.ts:77-94`)
   defines `status: text("status")` but **no application code populates
   it**; controllers write to the legacy Prisma `completed: boolean`
   field. Combined with the related finding that the migrations query
   `lr.phase1..phase14`, `lr.created_at`, `lr.article_id`, etc., from
   tables that still exist in Prisma's quoted `"createdAt"` shape —
   while the new Drizzle definitions emit `created_at` (unquoted) — the
   matviews will be empty or wrong if applied against a fresh Drizzle
   database.
3. **`workbook_template.html` line 9 imports Google Fonts
   (`fonts.googleapis.com`) and line 1301 references the third-party
   QR service `api.qrserver.com` directly via `<img src="...">` with
   no `integrity` / `referrerpolicy` / `crossorigin`.** Both leak the
   client IP and request metadata to Google and qrserver; the
   `article_url` (which can be a per-user deep link) is sent to
   qrserver on every render. There is also no fallback if those
   services are blocked.
4. **The two `data/*/temp.jpg` files are tracked empty (0 bytes) in
   git** — one in `data/images/` and one in `data/tmp/`. They have no
   references anywhere in `apps/reading-advantage` (grep across `.ts`,
   `.tsx`, `.js`, `.json`, `.md` returns zero hits), so they are dead
   artifacts, not stubs that an asset pipeline can fill.
5. **`cefr-level-prompts.json` carries `"modelId": "gpt-4o"` on every
   entry, but `article-generator.ts` and `stories-chapters-generator.ts`
   never read `levelConfig.modelId`** — they hard-code
   `google(googleProPrewiew)`. The field is dead metadata and the data
   file's claim of "gpt-4o" is misleading.
6. **`evaluate-rating-generator.ts:35-39` reads
   `data/cefr-level-evaluation-prompts.json` but the file in this batch
   is `new-level-evaluation-prompts.json` (no `cefr-level-evaluation`).
   Same author subsequently references `data/new-level-evaluation-prompts.md`
   on line 42 — i.e. the .md is read but the .json is the active prompt.**
   The mismatch is consistent with the `evaluate-rating-generator.ts`
   failing in any environment where the rename was not back-ported.
7. **`mv_alignment_metrics` (`migration.sql:12-290`) persists
   `u.email` and `u.name` into the materialized view and ships them
   to any school-scoped dashboard query.** The view is `UNION ALL`'d
   across three scopes, so student PII (email + display name) leaks
   into the school/class dashboards without a clear documented
   retention policy. Combined with the lack of `school_id` filter on
   many service-side consumers, this is a privacy concern.
8. **`mv_assignment_funnel` joins `student_assignments` on
   `assignment_id` but excludes `classroom_id` from the join path.**
   This is intentional in places but the predicate
   `c.school_id` (line 50) and `c.classroom_name` (line 90) are exposed
   to the assignment-level row. If a teacher query path filters by
   `school_id` only (which it does, per
   `server/services/metrics/assignment-prediction-service.ts`), the
   student-level `display_name`/`email` columns from other matviews
   are joined through `user_id`/`student_id` — there is no internal
   authorization on this path.
9. **No file in this batch has an associated test.** Grep for
   `*.test.{ts,tsx}` referencing any of these files returns zero hits.
   The prompt templates have no JSON-schema validation, the workbook
   template has no visual regression test, and the SQL migrations
   have no `pgTAP` / migration test.

No tests were found for any of these 20 files.

---

## Findings

### Critical / High

#### H-01 — `promptChatBot` and `promptLevelTestChat` interpolated raw into system prompt with un-escaped user content
- **Files:**
  - `apps/reading-advantage/data/prompt-chatbot.ts`
  - `apps/reading-advantage/data/prompt-level-test-chat.ts`
  - `apps/reading-advantage/server/controllers/assistant-controller.ts:323-378`
  - `apps/reading-advantage/server/controllers/stories-assistant-controller.ts:272-309`
  - `apps/reading-advantage/server/controllers/level-test-controller.ts:36-80`
- **Severity:** High
- **Evidence:**
  - `assistant-controller.ts:350-357` builds the system message with a
    template-literal that interpolates `validatedData?.blacklistedQuestions`
    (array → JSON.stringify default) alongside `article.passage` /
    `article.summary` / `article.title` / `article.imageDescription` —
    none of those are escaped. A malicious passage that contains
    "ignore previous instructions and …" will be visible to the model
    as part of the system prompt area.
  - `stories-assistant-controller.ts:281-288` is the same pattern.
  - `level-test-controller.ts:73-79` builds the system message by
    concatenating `promptLevelTestChat` + `languageInstruction` +
    `skipInstruction` + `forceAssessmentInstruction`, then sends it to
    `openai(openaiModel5)` via `streamText`. The `languageName` is
    derived from a free-text `preferredLanguage` string
    (line 42 `languageNames[preferredLanguage] || preferredLanguage`),
    so a user can submit `preferredLanguage: "ignore everything above"`
    and have it interpolated into the system message boundary.
- **Impact:** Prompt-injection sink. Adversarial article authors can
  steer the chatbot, and adversarial test takers can poison their own
  assessment prompt. The chatbot prompt has no
  `output parser`/instruction hierarchy.
- **Fix:** Move the dynamic user inputs into the `messages` array as a
  user-role turn (or escape/sanitize), and validate
  `preferredLanguage` against an allow-list before splicing into the
  system message. Add a guard against known prompt-injection patterns
  in the passage content.

#### H-02 — `passage` user-controlled content concatenated into JSON pseudo-block next to the system prompt
- **File:** `apps/reading-advantage/server/controllers/assistant-controller.ts`
- **Lines:** 350-357
- **Severity:** High
- **Evidence:** The system message body is built as
  `` `${promptChatBot}\n          { \n          "title": ${article.title},\n          "passage": ${article.passage},…}` ``.
  This is not valid JSON and not a parameterized template; it is a
  fragment that the model is asked to interpret. If `article.passage`
  contains a backtick, a stray `"`, or another JSON-looking block, the
  resulting string is malformed. Also `${article.passage}` will not
  quote any internal `"`, so a passage containing `"instruction": "..."`
  would be visible to the model as a separate JSON key.
- **Impact:** Functional + security. The downstream handler at line 363
  does `text.replace(/[{}]/g, "")` which strips all curly braces
  including any braces from the AI output the user actually wanted —
  not just the malformed template fragment.
- **Fix:** Use `JSON.stringify({ title, passage, summary, image_description, blacklisted_questions })`
  inside the system message (or move it to a user-role turn). Drop the
  regex `replace(/[{}]/g, "")` from the response handler.

#### H-03 — All SQL migrations reference `sa.status` ('NOT_STARTED'/'IN_PROGRESS'/'COMPLETED'); status is never written by current code
- **Files:**
  - `db-migrations/legacy-matviews/20251009000001_add_dashboard_materialized_views/migration.sql:55,59,64,71`
  - `db-migrations/legacy-matviews/20251022000000_enhance_assignment_funnel_analytics/migration.sql:23-32,40,49-51`
  - `db-migrations/legacy-matviews/20251022000000_enhance_assignment_funnel_analytics/rollback.sql:18-32`
  - `apps/reading-advantage/lib/cache/fallback-queries.ts:256-272`
- **Severity:** High
- **Evidence:**
  - The migrations predicate on `sa.status = 'COMPLETED'` /
    `'IN_PROGRESS'` / `'NOT_STARTED'`.
  - `packages/db/src/schema/content.ts:77-94` defines
    `studentAssignments` with both `completed: boolean("completed")` and
    `status: text("status")` (line 86), but searches in the
    application code show no writer for `status` (only `completed` is
    ever updated, see `lib/cache/fallback-queries.ts` for read paths
    and the controllers for write paths).
  - The Drizzle migration that introduced `student_assignments`
    (`packages/db/drizzle/`) does not backfill `status` either, so a
    fresh Drizzle-managed database will have every row's `status` set
    to `NULL`; `sa.status = 'COMPLETED'` will always be false and the
    matviews will compute 0% completion rates.
- **Impact:** Matview refresh will produce 0s for every completion,
  overdue, and ETA metric. The school dashboards will display "0%
  completion" until the application backfills `status` — but no such
  backfill exists.
- **Fix:** Either (a) add a backfill that derives `status` from
  `started_at`/`completed_at` (`started_at IS NULL → NOT_STARTED`,
  `started_at IS NOT NULL AND completed_at IS NULL → IN_PROGRESS`,
  `completed_at IS NOT NULL → COMPLETED`), or (b) rewrite the matviews
  to read from `completed: boolean` and `started_at`/`completed_at`
  directly.

#### H-04 — `mv_alignment_metrics` persists student `email` + `name` PII into a school-scope UNION ALL view
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration.sql`
- **Lines:** 14-17, 65-67, 153-154, 290
- **Severity:** High
- **Evidence:**
  - Line 16: `u.email` is selected from `users` into the
    `student_reading_data` CTE.
  - Line 17: `u.name AS display_name` is also selected.
  - Lines 65-67: both fields are projected into the
    `scope_type = 'student'` arm of the `UNION ALL`.
  - The class-level arm (lines 162-164) sets both to NULL — fine.
  - The school-level arm (lines 245-246) also sets both to NULL — fine.
  - But the `student` rows are reachable from a school-scoped query
    because `scope_type = 'student'` rows share the unique index
    `(scope_id, scope_type)` (line 293) where `scope_id` is `user_id`,
    and any consumer that joins on `user_id` (e.g.
    `server/services/metrics/genre-engagement-service.ts`) will get the
    full PII row.
- **Impact:** PII (email, display name) is materialized in a view whose
  retention is not documented and whose refresh path runs in production
  (per `system-controller.ts:252-269` refresh loop). Any teacher query
  path that joins to the view's student rows inherits the PII; there
  is no row-level security in the migration.
- **Fix:** Drop `email` and `display_name` from the projected columns,
  or hash `email` with a per-school salt, or move PII to a separate
  EXEMPT view accessed only via explicit authorization. Add a
  retention/TTL comment.

#### H-05 — `workbook_template.html` line 9 imports Google Fonts; line 1301 pulls QR images from `api.qrserver.com`; both leak the client IP and `article_url` to third parties
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 9, 1301
- **Severity:** High
- **Evidence:**
  - Line 9: `@import url('https://fonts.googleapis.com/css2?family=Merriweather…');`
    — every render of the workbook leaks the IP address, user-agent,
    and `Referer` (the deep link) to Google.
  - Line 1301:
    `<img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data={{article_url}}" alt="QR Code" width="72" height="72" style="display: block;">`
    — the rendered `article_url` is a per-user link like
    `https://app.reading-advantage.com/th/student/stories/{id}/{n}` or
    `https://app.reading-advantage.com/th/student/read/{id}`
    (`export-workbook/route.ts:393-395`). The qrserver gets the URL in
    clear text on every render.
  - There is no `integrity`, `crossorigin`, or `referrerpolicy` on
    either external resource. There is no fallback if Google Fonts /
    qrserver are unreachable.
- **Impact:** Privacy (deep-link leak to Google + qrserver), reliability
  (no offline fallback), and potential GDPR/PIPEDA scope concern
  depending on jurisdiction.
- **Fix:** Self-host fonts (bundle `.woff2` files), and generate QR
  codes server-side using a library (e.g. `qrcode`) and serve them from
  the same origin or storage adapter. Add CSP `font-src` and
  `img-src` allow-lists in any Next.js layout that consumes this
  template.

#### H-06 — `mv_alignment_metrics` reads `assignment_override->>'ra_level'` but `assignments.alignment_override` is not in the Drizzle schema
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration.sql`
- **Lines:** 5, 29-36
- **Severity:** High
- **Evidence:**
  - Line 5: `ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "alignment_override" JSONB;`
    — this migration *adds* the column.
  - Lines 29-36 use
    `COALESCE((asg.alignment_override->>'ra_level')::int, a.ra_level)`.
  - `packages/db/src/schema/content.ts:57-75` defines `assignments`
    **without** an `alignment_override` column. The Drizzle migration
    generator will not emit it, and any `INSERT`/`UPDATE` through the
    application cannot persist the override.
  - `migration_simple.sql:4` adds the same column with the same name,
    so both files compete for the same DDL.
- **Impact:** Drizzle-managed environments (Drizzle migrator only) will
  never get the `alignment_override` column and the matview will fall
  back to `a.ra_level` for every row. The migration is silently
  ineffective in the Drizzle pipeline.
- **Fix:** Add `alignmentOverride: jsonb("alignment_override")` to
  `assignments` in `packages/db/src/schema/content.ts` and generate a
  Drizzle migration so the column exists in both pipelines.

#### H-07 — Migrations query `lr.phase1..phase14` with `(json->>'elapsedTime')::int` on every row; `(phase1)::json` cast may be wrong for the current schema
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251009000001_add_dashboard_materialized_views/migration.sql`
- **Lines:** 150-181, 202-216, 239-253
- **Severity:** High
- **Evidence:**
  - The migration casts `lr.phase1::json->>'elapsedTime'` (treating
    `phase1` as JSON).
  - Drizzle schema (`packages/db/src/schema/stories.ts:151-164`)
    defines `phase1: jsonb("phase1")` — but the default value passed to
    `.default({ status: 2, elapsedTime: 0 })` is a JS object, which
    Drizzle will coerce. The column type is `jsonb`, so the cast
    `phase1::json` is fine.
  - However, the column is typed `jsonb`, so the cast `::json` will
    work in Postgres (jsonb castable to json). The bigger concern is
    silent failure: `(lr.phase14::json->>'status')::int = 2` (line 139)
    will error out if `phase14->>'status'` is `'2'` (text) vs `2`
    (number) inconsistently — Drizzle may serialize JS numbers as
    JSON numbers in `jsonb`, so `phase14->>'status'` returns the
    number-as-string `"2"`, and the cast `(...)::int` succeeds. Fine
    for now, but brittle if phase defaults are ever changed to text.
- **Impact:** No immediate failure, but a brittle contract. Future
  phase payload shape changes (e.g. moving `status` to a boolean) will
  silently zero out the matviews.
- **Fix:** Document the JSON contract on `lesson_records.phaseN` in
  the schema and add a `CHECK` constraint or a generated column that
  exposes `phaseN_elapsed_time_ms integer GENERATED ALWAYS AS ((phaseN->>'elapsedTime')::int) STORED`.

#### H-08 — `assistant-controller.ts:475` and `stories-assistant-controller.ts:303` strip `{}` from AI output, not just template fragments
- **Files:**
  - `apps/reading-advantage/server/controllers/assistant-controller.ts:363,475`
  - `apps/reading-advantage/server/controllers/stories-assistant-controller.ts:299-303`
- **Severity:** High
- **Evidence:**
  - The controller builds a malformed JSON block as part of the system
    prompt (see H-02), then does `text.replace(/[{}]/g, "").trim()`
    on the model's response. This strips every `{` and `}` from the
    output, regardless of whether it came from the bot or was a
    genuine bracket in the user's requested content (e.g. JSON-formatted
    flashcards, lesson plans).
  - In `stories-assistant-controller.ts`, the filter at line 299-302
    also drops empty strings and the literal strings `"{"`/`"}"`, but
    only after `for await`, so streaming chunks that are individual
    characters get filtered out and the message may be empty.
- **Impact:** User-visible content loss; chatbot answers about JSON
  structures are corrupted. Combined with H-01, this makes the
  injection surface even larger (an attacker can inject a `{`
  that breaks the bot reply).
- **Fix:** Drop the regex strip entirely. If the system message is
  built correctly, no stripping is needed.

#### H-09 — Matview SQL embeds `c.classroom_name` and `u.name` into JSONB samples; sample JSON leaks PII across school boundaries
- **Files:**
  - `db-migrations/legacy-matviews/20251009000001_add_dashboard_materialized_views/migration.sql:6,7,94`
  - `db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration.sql:24,108,111,112,131`
- **Severity:** High
- **Evidence:** `JSONB_AGG(...)` of article samples includes `read_at`,
  `assignment_id`, `genre` — and on the student arm of the UNION ALL,
  the sample is grouped by `user_id` and projected back to the
  service. A teacher querying class-level metrics receives student
  `display_name` and `email` via the JSONB samples as well as the
  flat columns.
- **Impact:** Cross-school data leak potential. The matview is
  populated globally; any controller that runs
  `SELECT * FROM mv_alignment_metrics WHERE school_id = $1` and joins
  through `scope_type` will leak student PII across the join if the
  WHERE clause is wrong (and the join is on `scope_id` which is the
  `user_id` for the student arm).
- **Fix:** Add a `WHERE u.school_id = $1` predicate at consumption
  time, or split the student arm into a separate view with its own
  authorization scope.

#### H-10 — `workbook_template.html` lines 1301-1302 build a QR code using an un-escaped `{{article_url}}` template variable
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 1301-1302
- **Severity:** High
- **Evidence:** The template variable `{{article_url}}` is substituted
  by the export-workbook route. There is no escape: a `passage` /
  `article_id` containing `&` or `#` would produce a malformed URL
  inside the QR image request. If `article_url` is ever empty or
  `undefined` (e.g. for a chapter where the route at
  `export-workbook/route.ts:393-395` builds a per-user URL but the
  `WorkbookJSON.article_url?` is optional), the QR image request is
  `?size=72x72&data=`, which qrserver returns as a 4xx with no
  fallback.
- **Impact:** Functional (broken QR on missing URL) + privacy
  (qrserver sees every generated URL — see H-05).
- **Fix:** Default to a stable article URL even for chapters, escape
  the URL, and generate the QR server-side.

#### H-11 — `evaluate-rating-generator.ts:35-39` reads `cefr-level-evaluation-prompts.json` (does not exist)
- **File:** `apps/reading-advantage/server/utils/generators/evaluate-rating-generator.ts`
- **Lines:** 35-39, 41-44
- **Severity:** High
- **Evidence:**
  - Line 38: `path.join(process.cwd(), "data", "cefr-level-evaluation-prompts.json")`
  - The file in the batch at `apps/reading-advantage/data/`
    is named `new-level-evaluation-prompts.json` and
    `new-level-evaluation-prompts.md`, not
    `cefr-level-evaluation-prompts.json`.
  - The file `apps/reading-advantage/data/cefr-level-evaluation-prompts.json`
    *does* exist (different prompt set, shorter, output is
    `1.00-5.00`), but the prompt used at runtime is the `new-level-…`
    files (the .md is read into `systemPrompt` but the comment on
    line 77 shows `system: prompt.find(...)?.systemPrompt` is actually
    used — i.e. the .json lookup is the active path).
  - Inconsistent: the .md file is loaded into `systemPrompt` but never
    used (line 77 comment `//system: systemPrompt,`).
- **Impact:** The two prompt files disagree in tone (the
  `cefr-level-evaluation-prompts.json` prompt is a strict 1–5 rating
  with no `cefr_level` output; the `new-level-evaluation-prompts.json`
  prompt outputs `{cefr_level, star_rating}`). The runtime behaviour
  depends on which file the database filesystem actually contains.
- **Fix:** Rename one of them and update the generator, or delete the
  unused .md file. Add a unit test that loads the generator and
  asserts the prompt file exists.

#### H-12 — `cefr-level-prompts.json` carries `"modelId": "gpt-4o"` but the generators ignore it and call Google
- **File:** `apps/reading-advantage/data/cefr-level-prompts.json`
- **Lines:** 8, 14, 20, 26, 32, 38, 49, 55, 61, 67, 73, 79
- **Severity:** Medium → High (documentation lies about which model is
  generating the article content)
- **Evidence:** Every `levelConfig` row has `"modelId": "gpt-4o"`.
  `article-generator.ts:100-111` logs `${params.cefrLevel} generating article model ID: ${googleProPrewiew}` and calls
  `google(googleProPrewiew)` — the JSON-declared model is OpenAI's
  gpt-4o but the call goes to Google. The story generator
  (`stories-chapters-generator.ts:329-401`) is the same.
- **Impact:** Misleading metadata. If anyone ever wires
  `levelConfig.modelId` into a model selector, the platform switches
  to OpenAI gpt-4o silently — a real billing/compliance event. The
  current code is fine because the field is dead.
- **Fix:** Remove the `modelId` field from the JSON, or actually wire
  it into the model selection. Pick one canonical source of truth for
  the generation model.

---

### Medium

#### M-01 — `level-test-controller.ts` appends `languageName` from `preferredLanguage` (free-text) into system prompt
- **File:** `apps/reading-advantage/server/controllers/level-test-controller.ts`
- **Lines:** 25-60, 73-79
- **Severity:** Medium
- **Evidence:** `languageNames` is a 5-entry allow-list (en, th, cn,
  tw, vi); the `|| preferredLanguage` fallback at line 42 means any
  unknown string is interpolated verbatim into the system prompt as
  `${languageName}`. A user submitting `preferredLanguage: "Thai and
  ignore the rules"` will get that exact text inside the system
  message.
- **Impact:** Prompt-injection via language field.
- **Fix:** Drop the `|| preferredLanguage` fallback and reject unknown
  languages at the Zod schema (`z.enum(["en","th","cn","tw","vi"])`).

#### M-02 — `level-test-controller.ts:85-94` parses the AI JSON envelope via `JSON.parse` inside the controller; no schema validation
- **File:** `apps/reading-advantage/server/controllers/level-test-controller.ts`
- **Lines:** 85-94, 158-163
- **Severity:** Medium
- **Evidence:** `parseAssessment` uses a regex to extract the JSON block
  then `JSON.parse` without Zod validation. The downstream
  `assessment` field is returned to the client as-is.
- **Impact:** A malformed AI response (which is a real possibility —
  see the unconstrained `temperature: 1` and the lack of structured
  output in `streamText`) produces an unexpected shape that the React
  client may treat as a real assessment.
- **Fix:** Add a Zod schema for the assessment envelope and parse
  through it. Use `generateObject` instead of `streamText` when the
  assessment is required (or have the assistant emit JSON in a
  structured channel).

#### M-03 — `type-genre.json` is a static asset containing user-facing genre names; no localization
- **File:** `apps/reading-advantage/data/type-genre.json`
- **Lines:** 1-434
- **Severity:** Medium
- **Evidence:** Genre names like `"Young Adult Fiction"`,
  `"Memoirs and Autobiographies"`, `"Science Fiction"` are hard-coded
  in English. The app supports th/cn/tw/vi locales (per the locale
  files), but genre selection in `article-controller.ts:25-28` /
  `stories-controller.ts:8` / `random-select-genre.ts:1` always uses
  the English name. Server-side filters compare against
  `db.stories.genre` which is also English.
- **Impact:** Non-English users see English genre labels. The genre
  random selection ignores locale.
- **Fix:** Add a localized variant per locale, or move the genre
  taxonomy into the database with a translation table.

#### M-04 — `workbook_template.html` uses emoji-only section icons (lines 1232, 1254, etc.) and QR section relies on third-party font
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 1232, 1254, 1296, 1319, 1555, 1674, 1681, 1705, 1796, 1828, 1862
- **Severity:** Medium
- **Evidence:** Emoji characters are used as section markers
  (⏱ ⭐ 📋 🌐 ✍️ 💡 🏠) and as an emoji-scale in the reflection box
  (line 1753-1771). The template uses `font-family: 'Open Sans', sans-serif;`
  with no fallback for emojis on systems where the colour emoji font
  is missing. On a CI-rendered PDF (e.g. Playwright `page.pdf()`)
  emojis may render as `□` (tofu) and break the visual contract.
- **Impact:** Visual regression risk when the workbook is auto-PDF'd.
- **Fix:** Bundle a Noto Color Emoji webfont or replace the emoji
  section markers with SVG icons.

#### M-05 — `workbook_template.html` has no escaping for user-supplied variables; XSS risk if the HTML is ever served to a browser without server-side rendering
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 1270, 1312, 1339, 1406, 1551, 1676, 1842, 1866, and all `{{…}}` interpolations
- **Severity:** Medium
- **Evidence:** The template uses `{{variable}}` Handlebars-style
  substitutions. If a value contains `<` or `>`, the rendered HTML is
  malformed. The current producer (`export-workbook/route.ts:381-411`
  plus `workbook-data-mapper.ts`) does not escape. `article.title`,
  `vocab[].word`, `vocab[].definition`, `article.paragraphs[].text`
  all flow from the database into the template un-escaped.
- **Impact:** Static-asset risk. If the route ever serves the HTML
  directly via `Content-Type: text/html`, an admin-supplied title
  with `<script>` will execute. Today the route returns JSON, but
  the template's filename `workbook_template.html` invites that
  future use.
- **Fix:** Either (a) escape every `{{…}}` substitution, or (b) name
  the file `workbook_template.hbs` and use a server-side template
  engine that escapes by default.

#### M-06 — `prompt-level-test-chat.ts` line 70-71 says "After exactly 6-8 exchanges (back and forth messages), you MUST automatically provide the final assessment." — conflict with `forceAssessment` boolean in the controller
- **Files:**
  - `apps/reading-advantage/data/prompt-level-test-chat.ts:84,88,127`
  - `apps/reading-advantage/server/controllers/level-test-controller.ts:68-71`
- **Severity:** Medium
- **Evidence:** The prompt says "do NOT wait for the user to ask"; the
  controller builds a `forceAssessmentInstruction` that says
  "Please provide your assessment now based on the responses you have
  received so far". Both messages coexist in the system prompt at line
  74-79; the model is being asked to choose.
- **Impact:** Inconsistent assessment timing across conversations.
- **Fix:** Document which takes precedence (force or auto-6-8) and
  emit only one instruction at a time.

#### M-07 — `prompt-chatbot.ts` line 1-10 has un-escaped backslash-art for contraction (`\'s`)
- **File:** `apps/reading-advantage/data/prompt-chatbot.ts`
- **Lines:** 3, 7
- **Severity:** Low → Medium (cosmetic but may surface in some renderers)
- **Evidence:** The prompt contains `user\'s question` (with a literal
  backslash). When this string is concatenated with article fields in
  `assistant-controller.ts:350-357`, the resulting string has stray
  backslashes visible to the model. Harmless but suggests the prompt
  was edited without re-flow.
- **Impact:** Cosmetic.
- **Fix:** Remove the `\` before `'`.

#### M-08 — `workbook-template/workbook_template.html` includes a `parent/guardian signature` line (line 1819) and is intended for print
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 1818-1821
- **Severity:** Medium (privacy/PII risk if ever saved as a PDF and
  uploaded)
- **Evidence:** The template includes a writable
  `Parent/Guardian signature` line. There is no comment about
  retention policy. If a student scans/photos the printed workbook
  and uploads it, the signature is PII of an unrelated adult.
- **Impact:** Privacy by design.
- **Fix:** Add a retention notice or move the signature to a separate
  offline-only sheet.

#### M-09 — All matview refresh operations use `REFRESH MATERIALIZED VIEW ${viewName}` with `sql.raw()` interpolation
- **Files:**
  - `apps/reading-advantage/server/controllers/system-controller.ts:455,477`
- **Severity:** Medium
- **Evidence:** The view name comes from a hard-coded
  `MATERIALIZED_VIEWS` const, so the injection risk is low. However,
  the pattern is unsafe for code review and any future caller that
  passes a user-controlled view name will inherit the issue.
- **Impact:** Style/lint, possible future bug.
- **Fix:** Validate `viewName` against the const at runtime, or use a
  parameterized query.

#### M-10 — `mv_class_assignment_funnel` and `mv_school_assignment_funnel` (migration.sql:152-243) project `total_students`, `completed_count`, `overdue_count`, `avg_score` aggregated across the classroom
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000000_enhance_assignment_funnel_analytics/migration.sql`
- **Lines:** 152-243
- **Severity:** Medium
- **Evidence:** The rollup re-aggregates from `mv_assignment_funnel`
  which already filters by classroom. `AVG(avg_score) FILTER (WHERE avg_score IS NOT NULL)`
  is the average of averages — biased toward small classes. There is
  no `COUNT(*)` / weighted-average fallback.
- **Impact:** Misleading class-level score metric.
- **Fix:** Use `SUM(score * n) / SUM(n)` weighted average.

#### M-11 — `migration.sql` (20251022000001) has 9 lines of `EXTRACT(EPOCH …) / 24 / 3600` style date math, no idempotency guard on the `ALTER TABLE`
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration.sql`
- **Lines:** 5, 134-136
- **Severity:** Medium
- **Evidence:** Line 5 uses `ADD COLUMN IF NOT EXISTS` (good) but
  line 8 uses `DROP MATERIALIZED VIEW IF EXISTS mv_cefr_ra_alignment`
  (good). However, the *new* `mv_alignment_metrics` is created
  without checking whether it was created by a prior run; the
  `migration_simple.sql` variant is a competing DDL — if both run in
  sequence, the second `DROP MATERIALIZED VIEW IF EXISTS mv_alignment_metrics`
  (line 8 of `migration_simple.sql`) destroys the real view created by
  `migration.sql` and replaces it with a placeholder.
- **Impact:** Running both files (e.g. as a maintenance worker) breaks
  the alignment metrics permanently until the real migration is rerun.
- **Fix:** Either delete `migration_simple.sql` (it appears to be a
  scratch/test file from "minimal version for testing" per its line 1)
  or rename it `scratch-do-not-run.sql` so it isn't accidentally
  picked up.

---

### Low

#### L-01 — Two empty `data/images/temp.jpg` and `data/tmp/temp.jpg` are committed to git (0 bytes each)
- **Files:**
  - `apps/reading-advantage/data/images/temp.jpg`
  - `apps/reading-advantage/data/tmp/temp.jpg`
- **Severity:** Low
- **Evidence:**
  - Both files are 0 bytes (`ls -la` and `file` both confirm `empty`).
  - Both are tracked by git (`git ls-files` returns both paths).
  - `git log` shows a single commit `60bc7c2d feat: migrate reading-advantage into monorepo`
    added them; not gitignored.
  - Zero references in the codebase (`grep -rE "(images|tmp)/temp\.jpg"`
    returns no hits across `.ts`/`.tsx`/`.js`/`.json`/`.md`).
- **Impact:** Static-asset cruft. Future grep will turn up these paths
  as dead references. Any pipeline that globs `data/**/*.jpg` will see
  empty files.
- **Fix:** `git rm --cached` both, add `**/temp.jpg` to `.gitignore`,
  or replace with a README explaining the placeholder convention.

#### L-02 — `prompt-chatbot.ts` has no `@param` JSDoc
- **File:** `apps/reading-advantage/data/prompt-chatbot.ts`
- **Lines:** 1-11
- **Severity:** Low
- **Evidence:** The exported `promptChatBot: string` has no JSDoc.
  Same for `promptLevelTestChat` in `prompt-level-test-chat.ts:131`.
- **Fix:** Add JSDoc per AGENTS.md "Documentation Standards".

#### L-03 — `prompt-level-test-chat.ts` has no Zod contract; the assistant output is not schema-validated downstream
- **Files:**
  - `apps/reading-advantage/data/prompt-level-test-chat.ts:93-104`
  - `apps/reading-advantage/server/controllers/level-test-controller.ts:158-163`
- **Severity:** Low
- **Evidence:** The prompt asks for a JSON block shaped like
  `{ level, sublevel, xp, explanation, strengths, improvements, nextSteps }`,
  but the controller never validates that the model returned this
  shape. A model that omits `xp` or wraps `strengths` as a string
  will not be caught.
- **Fix:** Add a Zod schema and run the parsed envelope through it.

#### L-04 — `new-level-evaluation-prompts.json` and `.md` describe two different evaluation contracts
- **Files:**
  - `apps/reading-advantage/data/new-level-evaluation-prompts.json:1-26`
  - `apps/reading-advantage/data/new-level-evaluation-prompts.md:1-81`
- **Severity:** Low
- **Evidence:**
  - The JSON asks for `{ cefr_level, star_rating }`.
  - The MD rubric asks for the same plus a written explanation.
  - The Drizzle `evaluateRating` function returns
    `{ rating, cefr_level? }` (see `server/utils/generators/evaluate-rating-generator.ts:22-25`),
    so `star_rating` (the JSON contract) is misnamed as `rating` at the
    function boundary.
- **Fix:** Unify the contracts; rename `rating` to `star_rating` in
  the return type.

#### L-05 — `type-genre.json` is imported via a relative path in `random-select-genre.ts:1` and via `@/data/type-genre.json` in `article-controller.ts:25` and `stories-controller.ts:8`
- **Files:**
  - `apps/reading-advantage/server/controllers/article-controller.ts:25`
  - `apps/reading-advantage/server/controllers/stories-controller.ts:8`
  - `apps/reading-advantage/server/utils/generators/random-select-genre.ts:1`
- **Severity:** Low
- **Evidence:** Two import styles for the same JSON. The two
  controllers also normalize the field as both `Genres` (plural) and
  `Genres` (matching), with a `normalizeGenreDoc` helper that maps
  `doc.Name ?? doc.name`. The random-select module just uses
  `subgenres`/`name`.
- **Impact:** Inconsistent naming contract between producers and
  consumers.
- **Fix:** Centralize the loader in a `lib/data/type-genre.ts` module.

#### L-06 — `workbook_template.html` has no `<meta charset="utf-8">` is correct (line 5), but no `<meta name="viewport">` (line 6 sets `width=device-width`)
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 5-6
- **Severity:** Low
- **Evidence:** Viewport meta is present. The template is intended for
  print (`@media print` block at line 53). But there is no
  `og:`/social meta; if the URL is ever shared, the preview is
  blank. Also no `lang="en"` on `<html>` (line 2 sets `lang="en"`).
- **Impact:** Cosmetic.
- **Fix:** No action needed.

#### L-07 — `workbook_template.html` line 1819 contains a parent/guardian signature line; lines 1217 "Quest Series • Workbook 3" is hard-coded
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 1217, 1819
- **Severity:** Low
- **Evidence:** The template hard-codes "Quest Series • Workbook 3"
  as the workbook title. There is no `{{workbook_title}}` variable.
  If a teacher wants "Workbook 4" they have to edit the HTML.
- **Fix:** Replace the hard-coded text with a template variable.

#### L-08 — `db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration_simple.sql` is a "minimal version for testing" committed to production source
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/migration_simple.sql`
- **Lines:** 1
- **Severity:** Low
- **Evidence:** Line 1: `-- Simple enhanced alignment metrics migration (minimal version for testing)`.
  The file is a single-row stub view (`SELECT 'system' AS scope_id, ...`)
  and will silently replace the real `mv_alignment_metrics` if applied
  (see M-11).
- **Fix:** Move to `scratch/` or delete.

#### L-09 — `mv_student_velocity` and `mv_class_velocity` et al. are not registered in the TenantDB registry
- **Files:**
  - `packages/db/src/schema/analytics.ts`
  - `packages/domain/src/tenant-registry.ts`
- **Severity:** Low
- **Evidence:** The matviews are *not* Drizzle tables; they are
  materialized views in Postgres. TenantDB's `classifyTable` throws
  on unregistered tables, so no consumer could ever pass a matview
  through TenantDB. But the matviews are reached by
  `server/services/metrics/*.ts` using the raw `db, sql` import
  (not TenantDB), so they bypass the safety net entirely.
- **Impact:** Tenant scoping is enforced at the *service* layer
  (`WHERE school_id = $1`), not at the storage layer. A new consumer
  that joins `mv_*` without that filter will leak cross-school data.
- **Fix:** Add a runtime guard (lint rule or test) that all queries
  against `mv_*` include a `school_id` filter.

#### L-10 — `20251015000000_enhance_velocity_matviews/migration.sql` line 37 uses `LEAD(min_xp, 1, 243000) OVER (ORDER BY level)` — the fallback 243000 matches the highest level exactly
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251015000000_enhance_velocity_matviews/migration.sql`
- **Lines:** 36-44, 74
- **Severity:** Low
- **Evidence:** The CTE computes `max_xp` via `LEAD` with a default of
  `243000` (the level-18 threshold). For level 18, `xp_to_next_level`
  becomes `243000 - current_xp` which is negative once the student
  exceeds 18. There is no clamp.
- **Impact:** Level-18 students see negative XP-to-next-level on the
  velocity dashboard.
- **Fix:** Wrap `LEAD(min_xp, 1, NULL)` and `COALESCE(NULL, current_xp)` to
  return NULL (or 0) past level 18.

#### L-11 — `20251009000001_add_dashboard_materialized_views/migration.sql:301` uses `"UserActivity"` quoted CamelCase while the new Drizzle schema defines the table as `user_activity` (lowercase, unquoted)
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251009000001_add_dashboard_materialized_views/migration.sql`
- **Lines:** 301, 303, 304
- **Severity:** Medium → Low (depends on database state)
- **Evidence:** The migration joins `"UserActivity"` (quoted, capitalized).
  The Drizzle schema (`packages/db/src/schema/progress.ts:8`) defines
  `pgTable("user_activity", …)` (unquoted, lowercase). If the database
  was created by Prisma, the table exists as `"UserActivity"`. If it
  was created by Drizzle, it exists as `user_activity`. The matview
  will be empty in the latter case.
- **Fix:** Document which pipeline owns the table and align names. Add
  a migration smoke test that runs `REFRESH MATERIALIZED VIEW` and
  asserts `rowCount > 0`.

#### L-12 — `20251009000001_add_dashboard_materialized_views/migration.sql:139,144,146` use `(lr.phase14::json->>'status')::int = 2`
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251009000001_add_dashboard_materialized_views/migration.sql`
- **Lines:** 139, 144-146
- **Severity:** Low
- **Evidence:** Same as H-07 — cast `phase14->>'status'` to int. If
  `phase14.status` is ever changed to a string enum like
  `'COMPLETED'`, the comparison silently fails and every row is
  counted as `unknown` (since the `WHEN` chain doesn't match).
- **Fix:** Add a CHECK constraint on the JSON shape or a generated
  column.

#### L-13 — `data/type-genre.json` is 9,409 bytes of static taxonomy; not generated from any backend module
- **File:** `apps/reading-advantage/data/type-genre.json`
- **Lines:** 1-434
- **Severity:** Low
- **Evidence:** Three consumer call sites (`article-controller.ts:25`,
  `stories-controller.ts:8`, `random-select-genre.ts:1`) all import
  the JSON directly. There is no seed script, no migration that
  populates a `genres` table, and no `genre` enum.
- **Impact:** Drift risk if the file is edited; consumers must
  redeploy.
- **Fix:** Move to a database `genres` table or a workspace package
  with semantic versioning.

#### L-14 — `data/prompts-combined-{LA,MC,SA}.json` are all 66 lines but LA is 10 KB, MC is 17 KB, SA is 19 KB
- **Files:**
  - `apps/reading-advantage/data/prompts-combined-LA.json`
  - `apps/reading-advantage/data/prompts-combined-MC.json`
  - `apps/reading-advantage/data/prompts-combined-SA.json`
- **Severity:** Low
- **Evidence:** The three prompt files share the same top-level shape
  (fiction + nonfiction, each with A1..C2 levels). The structure is
  repeated 18 times per file.
- **Fix:** Consider a single `prompts-combined.json` with a `type` key
  per section.

#### L-15 — `workbook_template.html` line 36: `/* Dark background for screen to make the 'page' pop */`
- **File:** `apps/reading-advantage/data/workbook-template/workbook_template.html`
- **Lines:** 36
- **Severity:** Low
- **Evidence:** The CSS comment reveals intent (dark background for
  preview) but the surrounding `background: #555;` (line 35) shows on
  the printed page if `@media print` is ignored (e.g. print-to-PDF
  without applying `@page` rules). Some headless browsers do not
  honour `@page` rules.
- **Fix:** Add `html { background: #555; }` so the dark frame only
  appears around the page container.

#### L-16 — `evaluate-rating-generator.ts` always calls `google(googleModel)` despite the `modelId` field in the prompt data
- **File:** `apps/reading-advantage/server/utils/generators/evaluate-rating-generator.ts`
- **Lines:** 66-88
- **Severity:** Low
- **Evidence:** Line 67 hard-codes `model: google(googleModel)`. The
  commented-out OpenAI branch (lines 50-64) is dead code.
- **Fix:** Remove the commented-out branch.

#### L-17 — `assistant-controller.ts` line 350-357 builds a system message with `{}` characters that the model is meant to read as JSON; this is brittle
- **File:** `apps/reading-advantage/server/controllers/assistant-controller.ts`
- **Lines:** 350-357
- **Severity:** Low
- **Evidence:** See H-02.
- **Fix:** See H-02.

#### L-18 — `evaluate-rating-generator.ts:77` reads `prompt.find((p) => p.level === params.cefrLevel)?.systemPrompt` — undefined behaviour when `cefrLevel` is `'A0'` (not in the JSON)
- **File:** `apps/reading-advantage/server/utils/generators/evaluate-rating-generator.ts`
- **Lines:** 76
- **Severity:** Low
- **Evidence:** The JSON has only A1..C2 (no A0). If a caller passes
  `'A0'` (which `assistant-controller.ts:60` accepts in its input
  schema `z.enum(["A0","A1","A2","B1","B2","C1","C2"])`), `find`
  returns `undefined` and the model gets `system: undefined`.
- **Fix:** Validate `cefrLevel` against the prompt file's level keys,
  or add A0 to the JSON.

---

## Static Asset / Privacy Audit

| Item | File / Line | Concern |
|------|-------------|---------|
| Third-party font CDN | `workbook_template.html:9` | Privacy — leaks client IP + UA to Google Fonts on every render. |
| Third-party QR service | `workbook_template.html:1301` | Privacy — leaks per-user `article_url` to qrserver on every render. |
| Emoji rendering | `workbook_template.html:1232,1254,1319,1555,1674,1681,1705,1796,1828,1862,1753-1771` | Static-asset — no fallback emoji font bundled. |
| No template escaping | `workbook_template.html` (all `{{…}}`) | Security — if HTML is ever served via `Content-Type: text/html`, XSS via article title / passage text. |
| Empty JPG placeholders | `data/images/temp.jpg`, `data/tmp/temp.jpg` | Static-asset — 0-byte files tracked in git, no references. |
| Hard-coded `Workbook 3` | `workbook_template.html:1217` | Static-asset — not parameterized. |
| Parent/guardian signature | `workbook_template.html:1819` | Privacy — PII risk if scanned/uploaded. |

---

## SQL / Migration Audit

| Item | File / Line | Concern |
|------|-------------|---------|
| `sa.status` (string enum) | `20251009000001_add_dashboard_materialized_views/migration.sql:55,59,64,71`, `20251022000000_enhance_assignment_funnel_analytics/migration.sql:23-32,40,49-51` | Mismatch — `student_assignments.status` is never written by current code; matview metrics will be zero. |
| `"UserActivity"` quoted CamelCase | `20251009000001_add_dashboard_materialized_views/migration.sql:301,303,304` | Schema/migration mismatch — Drizzle defines `user_activity` (unquoted). |
| `assignments.alignment_override` | `20251022000001_enhance_alignment_metrics/migration.sql:5,29-36` | Drizzle schema does not include this column. |
| `phase1..phase14::json->>'elapsedTime'` | every matview | Brittle contract; no CHECK constraint. |
| `LEAD(min_xp, 1, 243000)` | `20251015000000_enhance_velocity_matviews/migration.sql:37` | Level-18 students get negative XP-to-next. |
| Competing DDL files | `20251022000001_enhance_alignment_metrics/migration.sql` + `migration_simple.sql` | The "minimal version for testing" file can destroy the real view if both are applied. |
| Matviews not in TenantDB registry | `packages/domain/src/tenant-registry.ts` | Tenant scoping is enforced at the service layer, not the storage layer. |

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Partial | `evaluate-rating-generator.ts:93-95` throws `"failed to evaluate rating"` with no underlying error context. `level-test-controller.ts:166-175` swallows `ZodError` after `console.error`. |
| A2 | Bypass of domain/contracts layer | Yes | `prompt-chatbot.ts` and `prompt-level-test-chat.ts` are read directly into the system prompt of `generateText`/`streamText` instead of via a `command()` wrapper. No Zod input schema on `languageName`, `preferredLanguage`, or `passage`. |
| A3 | Magic numbers without enum | Yes | `evaluate-rating-generator.ts:86-87` uses `seed: Math.floor(Math.random() * 1000), temperature: 1` as bare numbers. `article-generator.ts:109` same. |
| A4 | Vacuous-pass on nothing-done | Partial | `evaluate-rating-generator.ts:77` returns `undefined` when the level key isn't found — caller cannot distinguish "no rating yet" from "rating generated but 0". |
| A5 | False-claim text vs test reality | Yes | `cefr-level-prompts.json` declares `"modelId": "gpt-4o"` but the generator calls Google. |
| A6 | Provider-specific hardcoded URLs | Yes | `workbook_template.html:9,1301` use Google Fonts + qrserver. `workbook-data-mapper.ts:83` uses `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/...`. |
| A7 | Magic numbers without enum | Yes | `level-test-controller.ts:18-19` uses `default(0)` / `default(false)` on `skipCount` / `forceAssessment`. `prompt-level-test-chat.ts:108-112` uses bare 0-15 / 16-30 / … XP ranges. |
| A8 | Hard-coded PII in test data | No | (No test fixtures in this batch.) |

---

## Test / Coverage Observations

1. **No tests cover any of the 20 files.** Grep for `*.test.{ts,tsx}`
   referencing any path in this batch returns zero hits. No `__tests__`
   folder anywhere under `apps/reading-advantage/data/` or
   `apps/reading-advantage/db-migrations/`.
2. **Behaviour worth testing (representative, not exhaustive):**
   - `prompt-chatbot.ts`: ensures `promptChatBot` is a non-empty string,
     contains the blacklisted-question response template.
   - `prompt-level-test-chat.ts`: ensures `promptLevelTestChat` includes
     the JSON envelope contract, the 6-8-exchange auto-completion
     instruction, and the level-XP score ranges.
   - `type-genre.json`: validates every `subgenres` entry is a
     non-empty string; every entry has a unique `name` (case-insensitive);
     `fiction`/`nonfiction` keys exist.
   - `workbook_template.html`: parse with a HTML parser, ensure every
     `{{variable}}` matches a key in the `WorkbookJSON` interface, and
     that no `<script>` tags exist (privacy: print-only template).
   - `20251009000001_…/migration.sql`: applies against a real Postgres
     test instance and asserts `mv_student_velocity`, `mv_assignment_funnel`,
     `mv_srs_health`, `mv_genre_engagement`, `mv_activity_heatmap`,
     `mv_cefr_ra_alignment`, `mv_daily_activity_rollups` are created
     with non-zero row counts and that `school_id` indexes exist.
   - `20251015000000_…/migration.sql`: same; also assert
     `xp_to_next_level >= 0` for all rows.
   - `20251022000001_…/migration.sql`: assert `mv_alignment_metrics`
     has rows for all three scopes (student/classroom/school) once
     seeded.
3. **No test execution was attempted.** No tests exist for these
   files; node modules were not installed.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.
The two empty `temp.jpg` files are noted as 0 bytes; no meaningful
content to review.

---

## Recommendations (focused, no broad refactor)

1. Stop interpolating `promptChatBot` / `promptLevelTestChat` raw into
   the system prompt. Move user inputs (passage, summary, title,
   blacklistedQuestions, preferredLanguage) into a user-role turn or
   a parameterized template (H-01, H-02, M-01).
2. Drop the `text.replace(/[{}]/g, "")` post-processing in
   `assistant-controller.ts` and `stories-assistant-controller.ts`
   (H-08).
3. Either rename `data/new-level-evaluation-prompts.json` back to
   `cefr-level-evaluation-prompts.json` or update
   `evaluate-rating-generator.ts:35-39` to read the new name. Delete
   the dead `.md` read or wire it up (H-11, L-04, L-16).
4. Add `assignments.alignmentOverride: jsonb("alignment_override")`
   to `packages/db/src/schema/content.ts` and emit a Drizzle
   migration so the column exists in both pipelines (H-06).
5. Decide on the ownership of `student_assignments.status` and
   either (a) backfill it from `started_at`/`completed_at`, or (b)
   rewrite the matviews to read from `completed: boolean` and the
   timestamp columns directly (H-03).
6. Self-host the Google Fonts and replace the qrserver QR generator
   with a server-side `qrcode` library. Add a CSP allow-list
   (H-05, H-10, M-05).
7. Drop `email` and `display_name` from `mv_alignment_metrics` or
   hash them (H-04, H-09).
8. Delete or rename `migration_simple.sql` to `scratch-do-not-run.sql`
   (L-08, M-11).
9. Remove the dead `modelId: "gpt-4o"` field from `cefr-level-prompts.json`
   or wire it into the model selector (H-12).
10. Add a smoke test that runs `REFRESH MATERIALIZED VIEW
    mv_student_velocity` and asserts rowCount > 0 against a fresh
    Drizzle-managed database (H-03, L-11).
11. `git rm --cached` the two empty `temp.jpg` placeholders and add
    `**/temp.jpg` to `.gitignore` (L-01).
12. Add a Zod schema for the assessment envelope in
    `level-test-controller.ts` and run the parsed JSON through it
    before returning to the client (M-02, L-03).
13. Replace the hard-coded "Quest Series • Workbook 3" in
    `workbook_template.html:1217` with a template variable (L-07).
14. Add a CHECK constraint on `lesson_records.phaseN` JSON shape or
    a generated `phaseN_elapsed_time_ms` column to remove the brittle
    `(phaseN::json->>'elapsedTime')::int` cast (H-07, L-12).

---

## End of file review for batch 37.

MEASURE_AGENT_RESULT