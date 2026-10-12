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

## Phase S4 review (helper, 2026-10-12, diff 72469836c..HEAD)

- Plan compliance: all S4 tasks done. The graph update was skipped: graph.db read only (orchestrator rule).
- Security: the domain lookup uses `createTenantDB(..., { schoolId: null }).unscoped(reason)` on the global catalogue only. The case pages show the book name and the lesson count only. Zod `bookLinkResultSchema` types the result. A number that is not plain digits is NaN, and a number above 10000 does not reach the query (no integer overflow error).
- Logger: events `book_link.unknown_book`, `.no_lesson`, `.unpublished`, `.no_class`, `.wrong_role` (with `reason`), and `.lookup_failed` use `lib/observability/logger.ts`. Payload has the book, the number, and the role. No user name.
- Behavior change: a teacher whose `findTeacherClassBook` call fails now sees the retry page. Before, the page swallowed the error and went to the class list.
- Behavior change: a signed-out reader on an unknown book or number sees a case page. Before, the page gave `notFound()`.
- Locale parity: `BookLink` has the same keys in `en`, `th`, `cn`, `tw`, and `vi` (a test checks it). Thai is a helper draft. cn, tw, and vi hold English.
- Low: `unknown-address` has its keys and its view, but no code path gives it yet. S3 must use it for `/b/<book>/<n>/<other>`.
- Low: `homeOf` sends ADMIN and SYSTEM to `/`, and the proxy sends them to the role home. S2 and S3 reuse `openBookLink`.
- Low: the language menu icon button is 36 px (the shared `LocaleSwitcher`, as on the sign-in screens). Each content button is 48 px or more.
- Low: the harness has no real font and shows the language menu closed.
- Lesson: a capture showed that the retry page used the default bubble word. A test now covers the bubble of each case.
- S2 note: the landing must use `BookLinkFrame` (exported from `components/book-link/book-link-case.tsx`) and keep `data-landing`. The `signed out` branch of `openBookLink` returns a redirect now; S2 changes that branch to a landing outcome.
