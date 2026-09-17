# Specification: Reading QA — Article Detail 400

Track ID: `reading_qa_article_detail_20260918`. Type: bug. App: `apps/reading-advantage`.

## Overview

Browser QA on 2026-09-16 found the article detail endpoint broken. Every `GET /api/v1/articles/{uuid}` returns HTTP 400 with message "Article fields are not correct". No student can open any article. The reading flow stops after list selection. Evidence: `/tmp/opencode/qa-reports/student-flows.md` test B4.

## Root Cause

`getArticleForReader` in `server/services/article-service.ts` (lines 80-113) rejects rows with null `type` or null `imageDescription`. The Drizzle schema defines both columns as nullable (`packages/db/src/schema/content.ts` lines 18 and 24). Seeded articles store null for both fields. The article list endpoint serves these rows without a guard. Only the detail guard fails them.

## Functional Requirements

### FR-1: Accept null `type`

`getArticleForReader` must accept a row with null `type`. The returned `FormattedArticle.type` must carry the fallback string `"Article"`.

### FR-2: Accept null `imageDescription`

`getArticleForReader` must accept a row with null `imageDescription`. The returned `FormattedArticle.image_description` must carry the empty string.

### FR-3: Keep the guard for the remaining fields

The 400 result must stay for missing `title`, `passage`, `id`, `cefrLevel`, `raLevel`, `genre`, `subGenre`, `summary`, `createdAt`, and `rating`. Keep their invalids entries.

### FR-4: Fix the service only

The API route and the server page share this service. Make no caller changes.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Minimal edit inside the guard and the mapping. No refactors.
- NFR-3: Mock the DB layer in unit tests. Use the app Jest setup.

## Acceptance Criteria

- AC-1: A unit test proves a row with null `type` and null `imageDescription` returns `ok: true`, `type: "Article"`, `image_description: ""`.
- AC-2: A unit test proves a row with null `title` still returns the 400 result.
- AC-3: A live check proves `GET /api/v1/articles/{seeded uuid}` with a student session returns HTTP 200.

## Out of Scope

- The missing `selectType.types.*` i18n keys on the read page. That is a P1 item.
- Seed data changes.
- The article list endpoint and its join fix.
