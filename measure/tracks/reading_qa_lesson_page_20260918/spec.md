# Specification: Reading QA — Lesson Page Code Defects

Track ID: `reading_qa_lesson_page_20260918`. Type: bug. App: `apps/reading-advantage`.

## Overview

Owner manual verification on 2026-09-18 rejected the lesson page. The article detail endpoint returns 200 (track `reading_qa_article_detail_20260918`), but the page shows no image, no audio, no translation, and no questions. The browser reports about 11 issues and over 10 console errors. This track fixes the code defects. Track `reading_qa_lesson_seed_20260918` fixes the data.

## Evidence (dev log, user session 2026-09-18)

```
GET /api/v1/articles/{id}/questions/mcq  500 in 15.9s
GET /api/v1/articles/{id}/questions/sa   500 in 16.2s
GET /api/v1/articles/{id}/questions/laq  500 in 16.5s
POST /api/v1/assistant/translate/{id}   404 in 9.2s
POST /api/v1/users/{userId}/activitylog 400
MISSING_MESSAGE: selectType.types.* — 240 occurrences in the log
```

## Functional Requirements

### FR-1: Questions endpoints must not 500

Diagnose `getMCQuestions`, `getSAQuestions`, and `getLAQuestions` in `server/controllers/question-controller.ts` (thin routes at `app/api/v1/articles/[article_id]/questions/{mcq,sa,laq}/route.ts`). When an article has no question rows, return HTTP 200 with an empty list. Report the 500 root cause in the plan.

### FR-2: Translate endpoint must serve stored translations

`POST /api/v1/assistant/translate/{article_id}` returned 404 after 9.2 s. Diagnose `translate` in `server/controllers/translation-controller.ts`. When the article already stores `translatedPassage`, return it. When it is missing, return a defined "not available" response the client can render. Keep the AI generation path for configured environments.

### FR-3: Activity log must accept the lesson page payload

The lesson page still posts a payload the activity log rejects with 400. Diagnose the exact payload from the dev log and the client read flow. Fix the root cause in the server contract or the client payload.

### FR-4: Add the missing `selectType.types.*` i18n keys

`/en/student/read` leaks raw keys: Article, Art, Novel Excerpt, Essay, Biography, Report, Fiction, Short Story, Non-Fiction, and the rest the component uses. Read `components/select.tsx` for the exact set. Add every key to the `en`, `th`, `vi`, `cn`, and `tw` catalogs.

### FR-5: Graceful states for missing content

- No `image_description`: render a placeholder visual. No broken image request.
- No `audio_url`: hide or disable the audio player with a label.
- No translation: render a "not available" state. No error.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Minimal edits at the diagnosed points.
- NFR-3: Jest tests mock the DB layer.

## Acceptance Criteria

- AC-1: `GET /api/v1/articles/{id}/questions/{mcq,sa,laq}` returns 200 with `[]` for an article without questions.
- AC-2: `POST /api/v1/assistant/translate/{id}` returns 200 with the stored translation, or a defined unavailable response.
- AC-3: The read page and lesson page render zero raw i18n keys.
- AC-4: A browser check on `/en/student/read` and the article detail page shows no console errors from these endpoints.
- AC-5: Unit tests cover each fixed defect.

## Out of Scope

- Seeding lesson content. Track `reading_qa_lesson_seed_20260918` owns that.
- The nuqs adapter crashes on `/en/teacher/passages` and `/en/student/stories`.
- The games page 500s and the materialized views.
