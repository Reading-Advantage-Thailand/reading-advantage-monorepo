# Plan review: primary_parity_qr_path_20261011

## Phase D review (diff 7fda8544e..HEAD)

Scope: docs, a mock source (`.txt`), and `plan.md`. No app code. Plan compliance: all Phase D tasks done.
Security, tests, JSDoc, logger, and locale parity do not apply (no code).

Findings:

- Low: the mock uses a text stand-in for the language menu. S2 and S4 must use `LocaleSwitcher` as `auth/layout.tsx` does.
- Low: the mock uses `data-book-link`, `data-landing`, and `data-case` attributes. Keep them in the ported markup for the S6 check.
- Low: the quest-giver idle strip is a Forge asset that already ships (`/rpg/kit/npc/quest-giver-idle-strip.png`). Use it through `Sprite`.
- Note: a harness run showed the page font as the system font (next/font does not load in the harness).
- Note: during the phase the worktree had uncommitted changes in `teacher/class-roster/[classroomId]/page.tsx` and its test. They are not from this phase. They stay out of the checkpoint.

## Phase S1 review (helper, 2026-10-12)

- Plan compliance: all S1 tasks done. The graph update was skipped: graph.db read only (orchestrator rule).
- Security: the callback accepts `/b/<book>/<n>[/writing]` only. Tests refuse `//x`, `https://x`, `/b/../teacher`, `/b/o3-2/5/other`, `/b/o3-2/0`, a backslash, `%2F%2Fx`, and `/b/%2e%2e/teacher`. Staff keep `safeCallbackPath`.
- Low: staff `safeCallbackPath` is broader than the book rule by design. The proxy checks roles on each page.
- Low: the card sign-in page (`/auth/card`) keeps `callbackUrl` only when the card link has it. A printed card has no callback today.
- Note for S2 and S3: use `bookSignInHref` in `lib/book-link/signin-href.ts`. It takes `writing: true` for S3.
