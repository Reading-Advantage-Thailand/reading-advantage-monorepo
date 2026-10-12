# Plan: QR code path for printed books (/b/<book>/<n>)

Track: `primary_parity_qr_path_20261011`. Branch: a lane branch from `primary-parity-integration`.
Tell the monorepo session before any write to `primary-parity-integration`. The feature freeze of
the set applies. Run one heavy job at a time (tsc, a test suite, a build, or a browser), never two.
Every task follows the TDD order of `measure/workflow.md` (red, green, refactor, commit, git note).
One commit for each task. The subject ends with `(track_id: primary_parity_qr_path_20261011)`, has a lower-case start, and the header is 100 characters or less.
Start after `primary_parity_class_books_20261011` loads the catalogue. The route reads the catalogue.

## Phase D: Design (RPG skin) [checkpoint: bceb181e5]

- [x] Task: Design the landing and the case pages
    - [x] Read `docs/primary-rpg-skin.md` and `components/rpg/{scene,chrome}.tsx`
    - [x] Draw the landing (book name, lesson title, two choices), the unknown book, the number out of range, the lesson not ready, no class for the book, wrong account, and retry pages
    - [x] Save static mocks in `measure/tracks/primary_parity_qr_path_20261011/design/` (no app code) (`design.md`, `mock-source.tsx.txt`)
- [x] Task: Captures and the owner's look check - look check pending (owner, async)
    - [x] Capture each state at 375 px and 1280 px, day and night (44 PNG files outside the repository; paths in `design/captures.md`)
    - [x] Record the owner's answer in `design/look-check.md`; record the answers to Member Questions 1 to 4
    - Member Question defaults used (spec defaults): Q1 `TUTOR_LESSON_URL_TEMPLATE`, choice 2 only with the setting; Q2 reading code to the lesson flow, writing code to the article page; Q3 two choices always, school first, no cookie; Q4 "This lesson is not ready yet. Ask your teacher." Look check pending (owner, async).
- [x] Task: Measure - User Manual Verification 'Phase D: Design (RPG skin)' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual steps: open the 44 PNG files of `design/captures.md`; check the landing at 375 px (two choices, 48 px or more, day and night); check each case page text; answer the three look-check questions in `design/look-check.md`.

## Phase S5: Prove the printed URL without a locale [checkpoint: a20826199]
_Story ref: spec.md#story-s5_

- [x] Task: Write the proxy tests (red, or green if the proxy already does the job)
    - [x] Extend `apps/primary-advantage/lib/__tests__/default-locale.test.ts`: `/b/o3-2/5` and `/b/o3-2/5/writing` redirect once to a locale path with the path and query kept; the locale path gives no redirect; the five book keys match the `config.matcher`; a signed-out reader gets no sign-in redirect
- [x] Task: Fix the proxy only if a test fails (no test failed; proxy.ts unchanged)
    - [x] `apps/primary-advantage/proxy.ts`: change the smallest part; do not add `/b` to `protectedRoutes` (the page owns the landing)
- [x] Task: Measure - User Manual Verification 'Phase S5: Prove the printed URL without a locale' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual steps: on a running build, open `/b/o3-2/5` signed out. Check one redirect to `/th/b/o3-2/5`, with no sign-in page.

## Phase S1: Return to the same lesson after sign-in [checkpoint: 39d38dbbb]
_Story ref: spec.md#story-s1_

- [x] Task: Define the return path contract
    - [x] In `lib/safe-callback-path.ts` add `bookCallbackPath(value)`: after `safeCallbackPath`, accept only `/^\/b\/[a-z0-9-]+\/[1-9]\d*(\/writing)?$/`
    - [x] Make `studentCallbackPath` also accept a book path (F-7); keep staff on `safeCallbackPath`
    - Added `lib/book-link/signin-href.ts` (`bookSignInHref`): one builder that S2 and S3 reuse.
- [x] Task: Write the tests (red)
    - [x] `lib/__tests__/safe-callback-path.test.ts`: accepted `/th/b/o3-2/5` and `/b/o3-2/5/writing`; refused `//x`, `https://x`, `/b/../teacher`, `/b/o3-2/5/other`, `/b/o3-2/0`, a backslash
    - [x] `components/__tests__/staff-signin-form.test.tsx`: sign-in and the forced password change both go to the callback book path
    - [x] A student test per method (`code-sign-in`, `card-sign-in`, `password-sign-in`): the callback book path wins over the student home
    - [x] `app/[locale]/b/[book]/[n]/__tests__/page.test.tsx`: a signed-out reader gets the callback in the sign-in link
- [x] Task: Implement (green)
    - [x] `lib/safe-callback-path.ts` and `components/student-login/use-student-home.ts`
    - [x] The signed-out branch of the page passes `callbackUrl=/<locale>/b/<book>/<n>[/writing]` (the form `proxy.ts:70` uses)
- [x] Task: Docs and doctor
    - [x] Skipped: graph.db read only (orchestrator rule).
    - [x] JSDoc on every changed export; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S1: Return to the same lesson after sign-in' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual steps: on a running build, open `/b/o3-2/5` signed out. The page goes to sign-in with `callbackUrl=/th/b/o3-2/5`.
    - Sign in as a teacher and as a student (code, card, password). Each lands on the lesson of the book, not on the home page.
    - Open `/th/auth/signin?callbackUrl=//evil.example`. After sign-in the user lands on the normal home page.
    - Note: the `/b/...` lesson link for a student without a callback stays unchanged.

## Phase S4: A clear page for every case that is not the normal one [checkpoint: e8199ba52]
_Story ref: spec.md#story-s4_

- [x] Task: Define the lookup contract
    - Note: the lookup is `resolveBookLink`; the case decision (role, class, log) is `lib/book-link/open-book-link.ts` (`openBookLink`). S3 `/writing` calls it with `writing: true`; no second copy.
    - [x] New `packages/domain/src/primary-books/book-link.ts` and `book-link-contracts.ts`: `resolveBookLink({ db, bookKey, number })` returns a Zod-typed union `ok | unpublished | no_lesson (book name, lesson count) | unknown_book`. Keep `resolveBookLesson` as it is
    - [x] Export from `packages/domain/src/primary-books/index.ts`
- [x] Task: Write the tests (red)
    - [x] `packages/domain/src/primary-books/__tests__/book-link.test.ts` (mock DB helper): each of the four results; a number of 0, -1, 1.5, and 999
    - [x] Page tests: one test for each case of spec S4, including SYSTEM with no `schoolId`, INTERN, and a database error; the logger call with its event name and no user name; no `notFound()` for a lookup case
    - [x] Key-parity test for the new namespace in the five locale files (reuse the parity test pattern of the app; check its file at the start of the phase)
- [x] Task: Implement (green)
    - [x] Domain functions above; `app/[locale]/b/[book]/[n]/page.tsx` uses them and renders the case components of Phase D
    - [x] New `components/book-link/*` (RPG skin) for the case pages; keys under a new `BookLink` namespace in `messages/{en,th,cn,tw,vi}.json` (Thai text from the owner)
    - Thai text: written by the helper; owner check pending. cn, tw, and vi hold English, as in the current file practice.
    - Member Question defaults used: Q4 "This lesson is not ready yet. Ask your teacher." (the others are not in S4).
    - [x] Log with `lib/observability/logger.ts` (`book_link.unknown_book`, `.no_lesson`, `.unpublished`, `.no_class`, `.wrong_role`, `.lookup_failed`)
- [x] Task: Docs and doctor
    - [x] JSDoc; skipped: graph.db read only (orchestrator rule); `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S4: A clear page for every case that is not the normal one' (Protocol in workflow.md) - look check pending (owner, async)
    - Captures (32 PNG, 8 states, 375 px and 1280 px, day and night): `~/Desktop/primary-parity-progress/captures/qr_path/phaseS4/`.
    - Manual steps: on a running build open `/th/b/zz/1` and `/th/b/o3-2/999` as a student. Each shows a clear page, not a 404, and the HTTP status is not 5xx.
    - Open a lesson with no article as a student: the page says "not ready". As a teacher with no class that has the book: the page says "no class".
    - Check the language menu on each page and the Thai text (owner check pending).

## Phase S2: Signed-out landing for Primary and Tutor readers [checkpoint: 67e4823d3]
_Story ref: spec.md#story-s2_

- [x] Task: Define the Tutor URL builder
    - [x] New `lib/book-link/tutor-url.ts`: fills `{book}` and `{n}` of `TUTOR_LESSON_URL_TEMPLATE` from a validated key and number only; returns null when the setting is empty or the template is not `https`; the app has no env schema, so the name is in `.env.example` only
- [x] Task: Write the tests (red)
    - [x] `lib/book-link/__tests__/tutor-url.test.ts`: fill, empty setting, `http` template, an injected book value
    - [x] Page tests: signed out shows the landing with two choices; no setting shows one choice; signed in skips the landing
- [x] Task: Implement (green)
    - [x] `components/book-link/book-landing.tsx` (RPG skin) and its use in the page; the school choice links to sign-in with the callback of S1
- [x] Task: Docs and doctor
    - [x] JSDoc; skipped: graph.db read only (orchestrator rule); `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S2: Signed-out landing for Primary and Tutor readers' (Protocol in workflow.md) - look check pending (owner, async)
    - Captures (landing, school only, writing; 375 px and 1280 px; day and night; 12 PNG): `~/Desktop/primary-parity-progress/captures/qr_path/phaseS2/`.
    - Manual steps: on a running build open `/th/b/o3-2/5` signed out. The landing shows the book name, the lesson line, and the school choice. With `TUTOR_LESSON_URL_TEMPLATE` set, a second Tutor choice shows below it.
    - Select the school choice: sign-in opens with `callbackUrl=/th/b/o3-2/5`. Open `/th/b/o3-2/5/writing` after S3: the callback keeps `/writing`. Check the Thai text (owner check pending).
    - Sign in, then open the link again: no landing, straight to the target.
- Member Question default used: Q1 and Q3 (spec defaults): the second choice shows only with the setting; school first; no cookie.
- Note: the signed-out landing replaces the S1 sign-in redirect in `openBookLink` (outcome type `landing`). The landing shows for an unpublished lesson too (it shows no article data).
- [~] Task: Set the Tutor URL template at the cutover (orchestrator or owner step)
    - The real Tutor URL template is not known in this run. Until the owner sets it, the landing shows one choice.
    - Exact env line for the Primary service: `TUTOR_LESSON_URL_TEMPLATE=https://<tutor host and path with {book} and {n}>` (for example `https://liff.line.me/<id>/b/{book}/{n}`). The template must start with `https://`. Only `{book}` and `{n}` are filled.

## Phase S3: Writing QR code target [checkpoint: 95acef17e]
_Story ref: spec.md#story-s3_

- [x] Task: Write the tests (red)
    - [x] New `app/[locale]/b/[book]/[n]/writing/__tests__/page.test.tsx`: student to `/student/read/<articleId>`; teacher to the lesson page; signed out shows the landing with the `/writing` callback; not ready and no class give the S4 pages
    - [x] New `[...rest]/__tests__/page.test.tsx` for the unknown address; one more signed-out proxy case in `lib/__tests__/default-locale.test.ts`
- [x] Task: Implement (green)
    - [x] New `app/[locale]/b/[book]/[n]/writing/page.tsx`; both pages call `components/book-link/render-book-link.tsx` (`renderBookLink`), which calls `openBookLink`; no copy of the logic
    - [x] An address `/b/<book>/<n>/<other>` gives the "unknown address" page: new catch segment `[n]/[...rest]/page.tsx` (logs `book_link.unknown_address`)
- [x] Task: Measure - User Manual Verification 'Phase S3: Writing QR code target' (Protocol in workflow.md) - look check pending (owner, async)
    - Captures (8 PNG, 2 states, 375 px and 1280 px, day and night): `~/Desktop/primary-parity-progress/captures/qr_path/phaseS3/`.
    - Manual steps: on a running build open `/th/b/o3-2/5/writing` signed out: the landing says "Writing task"; sign in as a student: the writing page of the article opens.
    - As a teacher: the lesson page opens. Open `/th/b/o3-2/5/other`: the unknown-address page shows, not a 404.

## Phase S6: Check one /b/ URL in the go/no-go script
_Story ref: spec.md#story-s6_

- [ ] Task: Add the block to `scripts/primary-parity/cutover-check.mjs`
    - [ ] Checks of spec S6: signed-out landing, student sign-in with the class code, lesson flow, the writing code, `/b/zz/1`, `/b/o3-2/999`
    - [ ] Use the tracked path of the script from `primary_parity_acceptance_20261011`
- [ ] Task: Write the text for the command sheet and §10
    - [ ] In `measure/tracks/primary_parity_qr_path_20261011/runbook-changes.md`: the new C13 agent step and owner step, and the §10 item for `docs/deployment/primary-cutover-migration-spec.md`
    - [ ] Tell `primary_parity_rehearsal3_20261011` that the file is ready
- [ ] Task: Measure - User Manual Verification 'Phase S6: Check one /b/ URL in the go/no-go script' (Protocol in workflow.md)

## Phase A: Acceptance

- [ ] Task: Write the behavior contract
    - [ ] Fill `docs/runbooks/primary-behavior-contract-template.md` for this track (legacy: printed old QR codes; target: this spec) in `measure/tracks/primary_parity_qr_path_20261011/behavior-contract.md`
- [ ] Task: Write `acceptance-pairs.json` (kit FR-7)
    - [ ] Pairs A1 to A5 of the spec table, with roles `PUBLIC`, `STUDENT`, `TEACHER`; `steps` modules for the sign-in; `legacyPath` is the old `/student/read/{map:article:<id>}` path
- [ ] Task: Run the kit of `primary_parity_acceptance_20261011`
    - [ ] `scripts/primary-parity/capture.ts` for each app, then `report.ts`; sign in a demo student and a demo teacher; use the catalogue loaded by `primary_parity_class_books_20261011`
- [ ] Task: Captures at 375 px and 1280 px, day and night, for the owner look check
- [ ] Task: Write `measure/tracks/primary_parity_qr_path_20261011/acceptance.md` from the runbook template (kit FR-10), with the owner look check
- [ ] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md)
