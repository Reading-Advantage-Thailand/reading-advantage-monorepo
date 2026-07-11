# Test Strategy: APK Advantage Games Arcade Host W2

## Principal risks

- Calling a mock route “production” while the app remains a static export.
- Trusting browser XP, identity, school, game ID, or extra metadata.
- Creating five copied pages instead of one cartridge host.
- Declaring auth complete with an unverified cookie or provider-specific library.
- Dropping Phaser input/canvas instances during navigation or leaking them after remount.
- Deleting legacy paths that still have callers or belong to concurrent work.

## Red-first layers

1. Dynamic-app source contracts: no static export and no forced-static APK completion.
2. Auth adapter contracts: shared username/password login, HttpOnly cookie, session lookup/logout, fail-closed redirect/error behavior.
3. Host contracts: exact five IDs, strict route parsing, input-mode selection, dual editions, one generic page, one canvas.
4. Completion contracts: strict Zod payload, origin/auth/tenant resolution, domain delegation, server XP, idempotency.
5. Catalog/loop contracts: production hrefs, deterministic next-game selection, replay/catalog/next actions, QC retained separately.
6. Browser acceptance: login → catalog → play → save → next on desktop, keyboard-only, and 390x844 touch.
7. Cutover guard: exact path/caller manifest before any deletion; unrelated dirty work excluded from staging.

## Required counterexamples

- Unknown/retired cartridge ID and mismatched input mode.
- Missing, expired, malformed, or wrong-role session; user with no school.
- Client-supplied XP/userId/schoolId, unknown fields, unsupported game, malformed JSON, and cross-origin POST.
- Repeated and concurrent idempotency keys.
- Route that imports raw DB business logic instead of the domain command.
- Two canvases after restart/navigation or retained keyboard handler after unmount.
- Narrow viewport overflow and touch target below 44px.
- Whole-file staging that captures concurrent Abyssal/Babel/R3F deletions.

## Acceptance commands

- Focused app Jest for auth, route, host, catalog, and loop logic.
- Focused domain game tests and coverage; DB tenant-coverage guard.
- Auth/API package tests for reused adapters when touched.
- Advantage Games lint, check-types, production build, and package-boundary guard.
- Playwright production arcade suite plus retained `/qc` regression suite.
- Build-graph update/caller probes for exported schemas/adapters.
- Measure doctor, mandatory change-quality review, final acceptance JSON, and closeout checker.
