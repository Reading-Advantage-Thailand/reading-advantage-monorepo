# Specification: Reading Article List UUID Cast Hotfix

Track ID: `reading_article_list_uuid_cast_hotfix_20260923`. Type: bug. App: `apps/reading-advantage`.

## Overview

The student read page article list is empty for signed-in students.
`getSearchArticles` in `server/controllers/article-controller.ts` joins
`eq(userActivity.targetId, articles.id)`. The column `user_activity.target_id`
is `text` and `articles.id` is `uuid`. Postgres rejects the query with
`operator does not exist: text = uuid` (42883). The Prisma-to-Drizzle migration
in commit `edf87e4cf` (2026-05-23) introduced the defect. Found by owner manual
verification S5.1 on 2026-09-23.

## Functional Requirements

- FR-1: The join must compare `user_activity.target_id` against `articles.id::text`.
- FR-2: No other query behavior changes.

## Acceptance Criteria

- AC-1: The join SQL runs against the local `reading_advantage` database without error.
- AC-2: The student read page renders article cards for a signed-in student, with and without a genre filter.

## Out of Scope

- Schema changes to `user_activity.target_id`.
- Other controllers. An audit found no other column-to-column join between `userActivity.targetId` and a uuid column.
