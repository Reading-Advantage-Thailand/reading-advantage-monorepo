# Implementation Plan: Reading QA — Article Detail 400

Track ID: `reading_qa_article_detail_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Red

- [x] Task: Write failing unit tests for the nullable-field fallback
  - [x] Create a Jest test file for `getArticleForReader`. Follow the app's existing test conventions (`__test__/`, `__tests__/`).
  - [x] Mock the DB layer with Jest mocks. Do not use real Postgres.
  - [x] Test A: a row with null `type` and null `imageDescription` returns `ok: true`, `type: "Article"`, `image_description: ""`.
  - [x] Test B: a row with null `title` returns `ok: false` with status 400.
  - [x] Run the new tests. Confirm Test A fails against the current source (Red). Record the failure.

## Phase 2: Green

- [x] Task: Relax the guard and add fallbacks in `server/services/article-service.ts`
  - [x] Remove `!article.type` and `!article.imageDescription` from the required-fields condition (FR-1, FR-2).
  - [x] Remove the `type` and `image_description` entries from the invalids map (FR-3).
  - [x] Map `type: article.type ?? "Article"` and `image_description: article.imageDescription ?? ""` in the `FormattedArticle` construction.
  - [x] Run the new tests until green.
  - [x] Run the app Jest suite and `check-types`. Record the results.

## Phase 3: Live verification, commit, and closeout

- [x] Task: Verify against the running dev server
  - [x] Log in as `demo-student-b1` (password `demo123`) on `http://localhost:3100`.
  - [x] Request `GET /api/v1/articles/{seeded uuid}` with the session cookie. Confirm HTTP 200 and article content.
  - [x] Record the transcript in the task note.
- [x] Task: Commit and record
  - [x] Commit subject: `fix(reading): allow null type and imageDescription (track_id: reading_qa_article_detail_20260918)`. Deviation: the originally drafted 120-char subject exceeded the commitlint header-max-length of 100, so a 97-char equivalent was used.
  - [x] Attach the task summary with `git notes add` on the commit.
  - [x] Mark all tasks `[x]` with the commit SHA (7 chars) in this plan: `10c74f1`.

## Owner Manual Verification — PASSED 2026-09-23

Environment: local dev server (port 3000) with Docker Postgres reading_advantage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence: S5.21: /en/student/read/<articleId> renders the full article (Article 25 sample), no HTTP 400. Confirmed by explicit product-owner yes on 2026-09-23.
