# Plan

## Phase 1: Console Write Correctness

- [x] (445578083) Task: Hold one idempotency key per form in a `useRef` and clear it after a success. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:13-15`
- [x] (445578083) Task: Add a `pendingId` state and disable the control while its request runs. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:141-142`
- [x] (9cb9bed88) Task: Refetch the employee before building the role array. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:136-140`
- [x] (e83800044) Task: Add a `readJson` guard around `response.json()`. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:23-24`
- [ ] Task: Call `refresh()` after a credential reset and after a session revocation. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:135-175`
