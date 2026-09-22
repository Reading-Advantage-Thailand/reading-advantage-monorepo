# Plan: Chatbot Question Store Hotfix

Track ID: `chatbot_question_store_hotfix_20260923`

## Tasks

- [x] Task 1: Optional-chain `mcQuestion?.results?.map(...) ?? []` in `handleSendMessage`.
  - Verified: tsc clean for the file; jest broken-ux suites 17/17 pass.
- [x] Task 2: Filter `blacklistedQuestions` to non-empty strings before send.
  - Verified: tsc clean; jest suites 17/17 pass.
- [x] Task 3: Live-verify on `/en/student/read/28ff5908-72a7-4f1c-b460-341230d6461e` as `demo-student-b1`: send "What is the main idea?", bot reply renders; close and reopen preserves history; bot messages have no `" : "` prefix. Owner manual verification S5.5 on 2026-09-23.
