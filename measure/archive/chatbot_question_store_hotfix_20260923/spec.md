# Specification: Chatbot Question Store Hotfix

Track ID: `chatbot_question_store_hotfix_20260923`. Type: bug. App: `apps/reading-advantage`.

## Overview

The floating chatbot could not send any message on the article read page.
Two faults compounded:

1. `mcQuestion.results.map(...)` threw when the question store's `mcQuestion`
   was missing, so no fetch ever fired.
2. After the first fault was fixed, the send payload carried
   `blacklistedQuestions: [null, null]`. The SA/LAQ entries were `undefined`,
   and `JSON.stringify` turns array `undefined` into `null`. The API schema
   `z.array(z.string())` rejected the payload with 400.

The store state is poisoned on articles without questions: the question cards
write malformed values into the question store. That root cause is recorded in
`measure/tech-debt.md`; this track fixes the chatbot only. Found by owner
manual verification S5.5 on 2026-09-23.

## Functional Requirements

- FR-1: The chatbot tolerates a missing `mcQuestion` state.
- FR-2: The chatbot sends only non-empty strings in `blacklistedQuestions`.
- FR-3: A bot reply renders for a normal question on an article without quiz questions.

## Acceptance Criteria

- AC-1: `tsc --noEmit` reports no errors for `chatbot-floating-button.tsx`.
- AC-2: The existing broken-ux suites pass (`broken-ux-fixes.test.ts`, `broken-ux-behavior.test.tsx`).
- AC-3: Live on `/en/student/read/[articleId]`, a chatbot send returns a rendered bot reply.

## Out of Scope

- Root-cause fix in the question cards or question store.
- The empty-bot-bubble behavior on non-OK API responses (filed as tech-debt).
