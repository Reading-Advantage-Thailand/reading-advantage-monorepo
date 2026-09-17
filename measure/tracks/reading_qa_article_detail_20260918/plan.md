# Implementation Plan: Reading QA — Article Detail 400

Track ID: `reading_qa_article_detail_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Red

- [ ] Task: Write failing unit tests for the nullable-field fallback
  - [ ] Create a Jest test file for `getArticleForReader`. Follow the app's existing test conventions (`__test__/`, `__tests__/`).
  - [ ] Mock the DB layer with Jest mocks. Do not use real Postgres.
  - [ ] Test A: a row with null `type` and null `imageDescription` returns `ok: true`, `type: "Article"`, `image_description: ""`.
  - [ ] Test B: a row with null `title` returns `ok: false` with status 400.
  - [ ] Run the new tests. Confirm Test A fails against the current source (Red). Record the failure.

## Phase 2: Green

- [ ] Task: Relax the guard and add fallbacks in `server/services/article-service.ts`
  - [ ] Remove `!article.type` and `!article.imageDescription` from the required-fields condition (FR-1, FR-2).
  - [ ] Remove the `type` and `image_description` entries from the invalids map (FR-3).
  - [ ] Map `type: article.type ?? "Article"` and `image_description: article.imageDescription ?? ""` in the `FormattedArticle` construction.
  - [ ] Run the new tests until green.
  - [ ] Run the app Jest suite and `check-types`. Record the results.

## Phase 3: Live verification, commit, and closeout

- [ ] Task: Verify against the running dev server
  - [ ] Log in as `demo-student-b1` (password `demo123`) on `http://localhost:3100`.
  - [ ] Request `GET /api/v1/articles/{seeded uuid}` with the session cookie. Confirm HTTP 200 and article content.
  - [ ] Record the transcript in the task note.
- [ ] Task: Commit and record
  - [ ] Commit subject: `fix(reading): accept nullable type and imageDescription in article detail (track_id: reading_qa_article_detail_20260918)`.
  - [ ] Attach the task summary with `git notes add` on the commit.
  - [ ] Mark all tasks `[x]` with the commit SHA (7 chars) in this plan.
