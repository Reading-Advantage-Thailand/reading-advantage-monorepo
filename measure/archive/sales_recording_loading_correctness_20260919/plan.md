# Plan

## Phase 1: Recording Loading Correctness

- [x] (86d2583a8) Task: Select the recording type with `MediaRecorder.isTypeSupported`. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:56`
- [x] (9297803ed) Task: Separate the device error from the permission error in `startRecording`. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:72-75`
- [x] (2019e81cb) Task: Revoke every blob URL in `reset()` and on unmount. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:63,113-120`
- [x] (916b60623) Task: Stop the recorder and every microphone track on unmount. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:89-90`
- [x] (7e5a0a449) Task: Move `retentionDays` to the server. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:92`, `app/api/roleplay-attempts/route.ts:144-162`
- [x] (4418adb6b) Task: Report a failed audio upload to the user. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `app/api/roleplay-attempts/route.ts:194-205,251`
- [x] (dce524539) Task: Add `isLoading` and `error` branches to the admin curriculum page. Source: `docs/sales-advantage-ux-refactor-plan.md` §5; Issues: `app/[locale]/admin/curriculum/page.tsx:20`, `app/[locale]/admin/page.tsx:45-56`
- [x] (da248745d) Task: Add `onError` and a pending state to the approve, quiz, and lesson completion mutations. Source: `docs/sales-advantage-ux-refactor-plan.md` §4 and §5; Issues: `app/[locale]/admin/curriculum/page.tsx:21-25,109`, `components/quiz-component.tsx:38-40`, `app/[locale]/lesson/[id]/page.tsx:36-45`
- [x] (12c6f685b) Task: Add an `AbortController` to the chat request. Source: `docs/sales-advantage-ux-refactor-plan.md` §4; Issues: `components/chat-tutor.tsx:44-66`
- [x] (eb8105c36) Task: Add one `error.tsx` and one `not-found.tsx`. Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `app/layout.tsx:8-14`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3005) with Docker Postgres reading_advantage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S4 in the 2026-09-22 verification run (14 checks, all passed). Locale behavior verified live (th → Thai chat response in UI; en → English). Local setup gaps fixed during the session (sales .env.local pointed at an empty sales_advantage DB; COMPANY_AUTH_* vars added; chat model free tier discontinued upstream — switched to a working free model). One Low finding filed in tech-debt: AI stream failure surfaces as an empty assistant bubble. Confirmed by explicit product-owner yes on 2026-09-22.
