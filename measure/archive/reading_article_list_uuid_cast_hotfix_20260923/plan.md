# Plan: Reading Article List UUID Cast Hotfix

Track ID: `reading_article_list_uuid_cast_hotfix_20260923`

## Tasks

- [x] Task 1: Cast `articles.id` to text in the `userActivity` join in `server/controllers/article-controller.ts`.
  - Fix: `eq(userActivity.targetId, sql`${articles.id}::text`)`.
  - Verified: SQL shape runs clean against local Postgres; `tsc --noEmit` shows no new errors in the file; no existing tests cover the controller.
- [x] Task 2: Live-verify the student read page renders article cards (signed in as `demo-student-b1`, `/en/student/read?genre=Horror` renders "Article 11: Horror Sample", no 404). Owner manual verification S5.1 on 2026-09-23.
