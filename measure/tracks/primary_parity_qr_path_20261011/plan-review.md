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

## Phase S2 review (helper, 2026-10-12, diff 580c89a61..HEAD)

- Plan compliance: all S2 tasks done. The graph update was skipped: graph.db read only (orchestrator rule). The app has no env schema, so `TUTOR_LESSON_URL_TEMPLATE` is in `.env.example` only.
- Security: `tutorLessonUrl` fills `{book}` and `{n}` from a key that matches `/^[a-z0-9-]+$/` and a whole number of 1 or more, and encodes both. A template that is not `https` gives null. The landing shows the book name and the lesson title only. The sign-in link uses `bookSignInHref` (S1 callback).
- Behavior change: a signed-out reader never gets a sign-in redirect from `/b/` now. The reader gets the landing, also for an unpublished lesson (the landing shows no article data).
- Behavior: no Tutor setting gives one choice (school). The choice is gold; Tutor is wood and second.
- Locale parity: 9 new `BookLink` keys in `en`, `th`, `cn`, `tw`, and `vi` (the parity test checks them). Thai is a helper draft (owner check pending). cn, tw, and vi hold English.
- Low: the Tutor host is not checked against a list. The owner sets the template, so it is trusted config.
- Low: the capture harness reports `small-buttons=1`. It is the 36 px language menu icon (as in S4). Both choices are 48 px or more.
- Owner step: set `TUTOR_LESSON_URL_TEMPLATE` at the cutover (see `plan.md`, Phase S2).
- S3 note: `/writing` calls `openBookLink({ ..., writing: true })` and renders `BookLanding` for the `landing` outcome, as the reading page does (`app/[locale]/b/[book]/[n]/page.tsx`).

## Phase S3 review (helper, 2026-10-12)
- No Critical or High finding. No new input path: the lookup, role check, and class check stay in `openBookLink`.
- Low: the catch segment `[n]/[...rest]` shows the unknown-address page for every reader, with the home link "/" (the view fixes it). It does not read the session.
- Low: `/b/<book>` with no number is not covered by this phase (the locale catch-all handles it).
- Low: no new message keys in this phase; the five locale files stay in parity.

## Phase S6 review (helper, 2026-10-12, diff 47beedaa3..HEAD)

- Plan compliance: all S6 tasks done. The browser run stays open (batch run, orchestrator).
- Security: the block prints no password, class code, or name. It uses the open class code in memory only. The judges see paths, status codes, and page text only. No app code changed.
- Tests: `qr-path-checks.test.mjs` (7 tests). The kit suite has 87 tests. `node --check` passes. The browser flow has no run yet.
- Medium: the block reuses `first.code` and the open class of the sign-in section. With `CLASS_BOOK_CHECK=off` the book is not assigned and checks 4 and 5 can fail. The README says it.
- Low: the sign-in picks the first name in the list. The demo class lists the same name five times, so any name works.
- Low: the script now prints `STOP <name>` for each failed check at the end. This changes the output for all blocks.
- Low: the case checks accept 4xx status. Spec S6 says "not 5xx".
- Low: the Tutor choice is not checked. The template is an owner setting that may be empty.
- Note: the command sheet file is in the rehearsal 3 track. This phase gave the proposed text only (`runbook-changes.md`).

## Phase A review (helper, 2026-10-12, diff 4bcb09d81..HEAD)

- Plan compliance: behavior contract, pair list (9 pairs), steps module, data checks, and `acceptance.md` are written. The kit run and the captures stay `[ ]` (batch capture, orchestrator).
- Tests: kit suite `vitest run --root scripts/primary-parity` gives 7 files, 87 tests, all pass. `PairList` parses the pair list (9 pairs). No app code changed in this phase.
- Security: no name, password, or class code in any file. The pair list holds only the legacy article id of a printed code.
- Deviation: the plan said `legacyPath` is `/student/read/{map:article:<id>}`. The kit gives the legacy app the raw legacy id for a `{map:}` placeholder (correction 2026-10-13), so `legacyPath` holds the raw id. The new path needs no placeholder.
- Deviation: the kit schema needs a locale at the start of each path. The unprefixed printed URL (A4) is a curl check in `acceptance.md`.
- Medium: the sign-in from the landing is not a pair (the capture signs in by role before the page). The browser check block "QR path" covers it. Pair QR-A1b shows only the move to the sign-in page.
- Medium: pair QR-A3 needs Origins 3.2 assigned to the demo class. Run the class book browser check first.
- Low: the legacy app has no `/writing` route, so no legacy pair for the writing code shows a page. QR-A2 shows the legacy not-found page.
- Low: the migration id-map column is `table_name` (SQL check 3). Check 3 expects a row for the printed article.
- Lesson for the shared files: a pair list for a signed-out then signed-in flow needs two pairs (PUBLIC and role). The kit signs in before the page opens.

## Review fixes (helper, 2026-10-12)

- High, fixed (bf74dfaf6): `safeCallbackPath` now runs the `//`, backslash, and control-character checks on the raw value, the percent-decoded value, and both after the locale strip. It refuses a value that still starts with a locale after the strip (`/th/en//evil.com`) and a value that does not decode. Tests: the seven listed values plus four more. The staff form falls back to the normal home for `/th//evil.com` and `/th/%2F%2Fevil.com`.
- Callers of `safeCallbackPath`: `teacher-signin-form.tsx` (direct), `bookCallbackPath`, and `studentCallbackPath` (both in `safe-callback-path.ts`). The only outside caller of those is `components/student-login/use-student-home.ts` (via `studentCallbackPath`). All are now safe.
- Low, fixed (3fd281f80): the logged `book` (open-book-link and the unknown-address page) and `n` (page) are cut to 64 characters.
- Low, fixed (3fd281f80): `retryHref` uses `encodeURIComponent` for the book and the number.
- Medium, checked, no change: the target pages `/student/lesson/<articleId>?type=article` and `/student/read/<articleId>` need a signed-in user only. They load the article by id and do not check the class books. The legacy app at bfea121 did the same: `getArticleById` used `findUnique({ where: { id } })` with no class check, and the lesson page had no check. Open access is legacy behavior; no change.
