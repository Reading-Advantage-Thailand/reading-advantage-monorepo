# Phase 3 Marketing Green Role Log

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: `Phase 3: i18n Completeness and Typed Locale Access`
- Groups: A and C
- Immutable phase base: `b0d8bd7e29327a431952db7d06aa2c010f6547ba`
- Role base: `b0d8bd7e29327a431952db7d06aa2c010f6547ba`
- Red commit: `86f0611cf418632d5767a588d8fe15a4272973b1`
- Green source commit: `1ac4e1b3ed80db90f7797bf68aefce04ad6b2768`

The Red commit is within `phase_base_sha..HEAD` before Green implementation.
The committed Red test was not changed.
Group B remains accepted at `ee2d7c238`.

## Scope

The Green change uses typed locale messages for the reviewed CTA and Sheet copy.
It provides English, Thai, and Chinese messages.
It corrects only the reviewed Thai typo forms in the two allowed page locale files.

New locale files:

- `apps/www-reading-advantage/src/locales/components/blog.ts`
- `apps/www-reading-advantage/src/locales/components/ui.ts`

## Verification

- PASS: `CI=true pnpm vitest run apps/www-reading-advantage/src/__tests__/phase-3-i18n.red.test.ts --maxWorkers=1` — 3 tests passed.
- PASS: Phase 2 regression command — 5 tests passed.
- PASS: Targeted ESLint exited 0.
- PASS: Scoped Prettier and `git diff --check` passed.
- BLOCKED: Direct www typecheck reports unrelated Science Advantage locale-key errors.
- BLOCKED: Turbo www typecheck retried registry access after a DNS failure.
- NOT RUN: The build gate was not run in this Green role.

No browser verification was run.
