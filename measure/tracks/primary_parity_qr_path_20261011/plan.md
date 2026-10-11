# Plan: QR code path for printed books (/b/<book>/<n>)

Track: `primary_parity_qr_path_20261011`. Branch: a lane branch from `primary-parity-integration`.
Tell the monorepo session before any write to `primary-parity-integration`. The feature freeze of
the set applies. Run one heavy job at a time (tsc, a test suite, a build, or a browser), never two.
Every task follows the TDD order of `measure/workflow.md` (red, green, refactor, commit, git note).
One commit for each task. The subject ends with `(track_id: primary_parity_qr_path_20261011)`, has a lower-case start, and the header is 100 characters or less.
Start after `primary_parity_class_books_20261011` loads the catalogue. The route reads the catalogue.

## Phase D: Design (RPG skin)

- [ ] Task: Design the landing and the case pages
    - [ ] Read `docs/primary-rpg-skin.md` and `components/rpg/{scene,chrome}.tsx`
    - [ ] Draw the landing (book name, lesson title, two choices), the unknown book, the number out of range, the lesson not ready, no class for the book, wrong account, and retry pages
    - [ ] Save static mocks in `measure/tracks/primary_parity_qr_path_20261011/design/` (no app code)
- [ ] Task: Captures and the owner's look check
    - [ ] Capture each state at 375 px and 1280 px, day and night, into `design/`
    - [ ] Record the owner's answer in `design/look-check.md`; record the answers to Member Questions 1 to 4
- [ ] Task: Measure - User Manual Verification 'Phase D: Design (RPG skin)' (Protocol in workflow.md)

## Phase S5: Prove the printed URL without a locale
_Story ref: spec.md#story-s5_

- [ ] Task: Write the proxy tests (red, or green if the proxy already does the job)
    - [ ] Extend `apps/primary-advantage/lib/__tests__/default-locale.test.ts`: `/b/o3-2/5` and `/b/o3-2/5/writing` redirect once to a locale path with the path and query kept; the locale path gives no redirect; the five book keys match the `config.matcher`; a signed-out reader gets no sign-in redirect
- [ ] Task: Fix the proxy only if a test fails
    - [ ] `apps/primary-advantage/proxy.ts`: change the smallest part; do not add `/b` to `protectedRoutes` (the page owns the landing)
- [ ] Task: Measure - User Manual Verification 'Phase S5: Prove the printed URL without a locale' (Protocol in workflow.md)

## Phase S1: Return to the same lesson after sign-in
_Story ref: spec.md#story-s1_

- [ ] Task: Define the return path contract
    - [ ] In `lib/safe-callback-path.ts` add `bookCallbackPath(value)`: after `safeCallbackPath`, accept only `/^\/b\/[a-z0-9-]+\/[1-9]\d*(\/writing)?$/`
    - [ ] Make `studentCallbackPath` also accept a book path (F-7); keep staff on `safeCallbackPath`
- [ ] Task: Write the tests (red)
    - [ ] `lib/__tests__/safe-callback-path.test.ts`: accepted `/th/b/o3-2/5` and `/b/o3-2/5/writing`; refused `//x`, `https://x`, `/b/../teacher`, `/b/o3-2/5/other`, `/b/o3-2/0`, a backslash
    - [ ] `components/__tests__/staff-signin-form.test.tsx`: sign-in and the forced password change both go to the callback book path
    - [ ] A student test per method (`code-sign-in`, `card-sign-in`, `password-sign-in`): the callback book path wins over the student home
    - [ ] `app/[locale]/b/[book]/[n]/__tests__/page.test.tsx`: a signed-out reader gets the callback in the sign-in link
- [ ] Task: Implement (green)
    - [ ] `lib/safe-callback-path.ts` and `components/student-login/use-student-home.ts`
    - [ ] The signed-out branch of the page passes `callbackUrl=/<locale>/b/<book>/<n>[/writing]` (the form `proxy.ts:70` uses)
- [ ] Task: Docs and doctor
    - [ ] JSDoc on every changed export; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S1: Return to the same lesson after sign-in' (Protocol in workflow.md)

## Phase S4: A clear page for every case that is not the normal one
_Story ref: spec.md#story-s4_

- [ ] Task: Define the lookup contract
    - [ ] New `packages/domain/src/primary-books/book-link.ts` and `book-link-contracts.ts`: `resolveBookLink({ db, bookKey, number })` returns a Zod-typed union `ok | unpublished | no_lesson (book name, lesson count) | unknown_book`. Keep `resolveBookLesson` as it is
    - [ ] Export from `packages/domain/src/primary-books/index.ts`
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-books/__tests__/book-link.test.ts` (mock DB helper): each of the four results; a number of 0, -1, 1.5, and 999
    - [ ] Page tests: one test for each case of spec S4, including SYSTEM with no `schoolId`, INTERN, and a database error; the logger call with its event name and no user name; no `notFound()` for a lookup case
    - [ ] Key-parity test for the new namespace in the five locale files (reuse the parity test pattern of the app; check its file at the start of the phase)
- [ ] Task: Implement (green)
    - [ ] Domain functions above; `app/[locale]/b/[book]/[n]/page.tsx` uses them and renders the case components of Phase D
    - [ ] New `components/book-link/*` (RPG skin) for the case pages; keys under a new `BookLink` namespace in `messages/{en,th,cn,tw,vi}.json` (Thai text from the owner)
    - [ ] Log with `lib/observability/logger.ts` (`book_link.unknown_book`, `.no_lesson`, `.unpublished`, `.no_class`, `.wrong_role`, `.lookup_failed`)
- [ ] Task: Docs and doctor
    - [ ] JSDoc; graph update; `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S4: A clear page for every case that is not the normal one' (Protocol in workflow.md)

## Phase S2: Signed-out landing for Primary and Tutor readers
_Story ref: spec.md#story-s2_

- [ ] Task: Define the Tutor URL builder
    - [ ] New `lib/book-link/tutor-url.ts`: fills `{book}` and `{n}` of `TUTOR_LESSON_URL_TEMPLATE` from a validated key and number only; returns null when the setting is empty or the template is not `https`; add the name to the env schema and `.env.example` if the app has them
- [ ] Task: Write the tests (red)
    - [ ] `lib/book-link/__tests__/tutor-url.test.ts`: fill, empty setting, `http` template, an injected book value
    - [ ] Page tests: signed out shows the landing with two choices; no setting shows one choice; signed in skips the landing
- [ ] Task: Implement (green)
    - [ ] `components/book-link/book-landing.tsx` (RPG skin) and its use in the page; the school choice links to sign-in with the callback of S1
- [ ] Task: Docs and doctor
    - [ ] JSDoc; graph update; `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S2: Signed-out landing for Primary and Tutor readers' (Protocol in workflow.md)

## Phase S3: Writing QR code target
_Story ref: spec.md#story-s3_

- [ ] Task: Write the tests (red)
    - [ ] New `app/[locale]/b/[book]/[n]/writing/__tests__/page.test.tsx`: student to `/student/read/<articleId>`; teacher to the lesson page; signed out shows the landing with the `/writing` callback; not ready and no class give the S4 pages
- [ ] Task: Implement (green)
    - [ ] New `app/[locale]/b/[book]/[n]/writing/page.tsx`; share one function with the reading page for the lookup and the cases (no copy of the logic)
    - [ ] An address `/b/<book>/<n>/<other>` gives the "unknown address" page of S4 (a catch segment or the existing catch-all, whichever the test shows works)
- [ ] Task: Measure - User Manual Verification 'Phase S3: Writing QR code target' (Protocol in workflow.md)

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
