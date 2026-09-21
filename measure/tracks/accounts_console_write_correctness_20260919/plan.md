# Plan

## Phase 1: Console Write Correctness

- [x] (445578083) Task: Hold one idempotency key per form in a `useRef` and clear it after a success. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:13-15`
- [x] (445578083) Task: Add a `pendingId` state and disable the control while its request runs. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:141-142`
- [x] (9cb9bed) Task: Refetch the employee before building the role array. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:136-140`
- [x] (e83800044) Task: Add a `readJson` guard around `response.json()`. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:23-24`
- [x] (977333786) Task: Call `refresh()` after a credential reset and after a session revocation. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:135-175`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3007) with Docker Postgres `company_identity`; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S1 in the 2026-09-22 verification run (20 checks, all passed). Two non-blocking findings filed in `measure/tech-debt.md` (same-tick role-toggle race; dev-only React eval/CSP console warning). Confirmed by explicit product-owner yes on 2026-09-22.
