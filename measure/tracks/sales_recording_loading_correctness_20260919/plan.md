# Plan

## Phase 1: Recording Loading Correctness

- [x] (86d2583a8) Task: Select the recording type with `MediaRecorder.isTypeSupported`. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:56`
- [ ] Task: Separate the device error from the permission error in `startRecording`. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:72-75`
- [ ] Task: Revoke every blob URL in `reset()` and on unmount. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:63,113-120`
- [ ] Task: Stop the recorder and every microphone track on unmount. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:89-90`
- [ ] Task: Move `retentionDays` to the server. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:92`, `app/api/roleplay-attempts/route.ts:144-162`
- [ ] Task: Report a failed audio upload to the user. Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `app/api/roleplay-attempts/route.ts:194-205,251`
- [ ] Task: Add `isLoading` and `error` branches to the admin curriculum page. Source: `docs/sales-advantage-ux-refactor-plan.md` §5; Issues: `app/[locale]/admin/curriculum/page.tsx:20`, `app/[locale]/admin/page.tsx:45-56`
- [ ] Task: Add `onError` and a pending state to the approve, quiz, and lesson completion mutations. Source: `docs/sales-advantage-ux-refactor-plan.md` §4 and §5; Issues: `app/[locale]/admin/curriculum/page.tsx:21-25,109`, `components/quiz-component.tsx:38-40`, `app/[locale]/lesson/[id]/page.tsx:36-45`
- [ ] Task: Add an `AbortController` to the chat request. Source: `docs/sales-advantage-ux-refactor-plan.md` §4; Issues: `components/chat-tutor.tsx:44-66`
- [ ] Task: Add one `error.tsx` and one `not-found.tsx`. Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `app/layout.tsx:8-14`
