# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or summarize resolved items when they no longer need to influence near-term planning.
>
> **Severity:** `Critical` | `High` | `Medium` | `Low`
> **Status:** `Open` | `Resolved`

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-04-29 | monorepo-scaffold | advantage-games TypeScript errors (Difficulty type mismatches) | Medium | Open | `ignoreBuildErrors: true` in next.config.ts as temporary workaround. ~15 files use `"medium"` where `Difficulty` expects `"normal"`. |
| 2026-04-29 | monorepo-scaffold | advantage-games ESLint 6236 warnings | Low | Open | Pre-existing code has many `prefer-const`, `no-undef`, and `no-explicit-any` warnings. Original app had 71 warnings. Shared config is stricter. |
| 2026-04-29 | monorepo-scaffold | Shared ESLint flat config doesn't resolve plugins across pnpm workspace boundaries | Medium | Open | `@reading-advantage/config/eslint` works for packages but app uses local flat config importing plugins directly. |
| 2026-04-29 | monorepo-scaffold | Tailwind shared config is v3-style, apps use v4 CSS-based config | Low | Open | `packages/config/tailwind/tailwind.config.ts` uses v3 API. Apps using v4 need `@theme inline` in CSS. Consider migrating shared config to v4 CSS or providing both. |
| 2026-04-29 | monorepo-scaffold | react-konva peer dependency warning (wants react 19.2.0, app has 19.1.0) | Low | Open | Doesn't block builds. Consider upgrading React to 19.2.x across the monorepo. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage Tailwind v3 (app) vs v4 (monorepo shared config) | High | Open | App uses `tailwind.config.js` v3 + `tailwindcss-animate`. Can't consume shared v4 CSS config. Migrate to v4 in dedicated track. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled to pass build. Pre-existing TS and lint errors should be fixed incrementally. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: 128 lint warnings, 26 failed test suites (37 tests) | Medium | Open | Pre-existing from original repo. Baselines documented: 0 lint errors, 128 warnings; 50/76 suites pass, 457/494 tests pass. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: Firebase Auth migration to shared auth package | High | Open | Active Firebase Auth usage (sign-in fallback, token verification bridge). Must stay until all users migrated to Prisma auth. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: Firestore → Prisma migration incomplete | High | Open | 12 Firestore collections still active. Hybrid state: users/articles partially migrated, licenses/classrooms/stories/flashcards still on Firestore. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: zustand v4 vs v5 in monorepo | Medium | Open | App uses zustand v4, advantage-games uses v5. Align when reading-advantage is ready for v5 migration. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: ESLint v8 vs v9 in monorepo | Medium | Open | App uses `.eslintrc.json` (legacy v8). Monorepo shared config uses flat config v9. Keep local config until ESLint migration. |
| 2026-05-02 | migrate-reading-advantage | reading-advantage: two i18n libraries (next-intl + next-international) | Low | **Resolved** | Removed `next-international` from reading-advantage. Rewrote locale provider and locale-switcher to use `next-intl` APIs only. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled. Pre-existing TS errors and 49 lint errors. Fix incrementally. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: 49 lint errors, 74 warnings (pre-existing) | Medium | Open | Errors: `react/no-unescaped-entities`, `react-hooks/rules-of-hooks`. Warnings: missing deps in useEffect. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: no test suite | Medium | Open | Zero tests. Consider adding Vitest for new code. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: NextAuth v5 beta | Medium | Open | Uses `next-auth ^5.0.0-beta.29`. Upgrade to stable when available. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: Prisma schema separate from reading-advantage | Medium | Open | Two separate Prisma schemas. Future: unify or document boundary. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: missing `base64-js` dependency | Low | Open | Was missing from package.json; added during migration. |
| 2026-05-01 | migrate-www | www: `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled. Pre-existing TS errors. Fix incrementally. |
| 2026-05-01 | migrate-www | www: 2 Vitite test suite failures (transform errors) | Low | Open | Vite transform errors in 2 suites. 403/403 individual tests pass. Likely pre-existing. |
| 2026-05-01 | migrate-www | www: `next-international` vs `next-intl` across apps | Medium | Open | www uses `next-international`, reading/primary use `next-intl`. Consider unifying. |
| 2026-05-01 | migrate-www | www: revideo dependencies in devDependencies | Low | Open | `@revideo/*` packages are heavy dev deps. Verify they're still needed. |
| 2026-05-02 | shared_backend_api | Workspace packages with `.js` ESM imports export raw TS source | High | **Resolved** | Built all packages (`api`, `auth`, `auth-client`, `db`, `domain`, `types`) to `dist/` and updated `exports` to point to built output. Prevents Next.js transpilation failures. |
| 2026-05-02 | shared_backend_api | `packages/utils` hooks bundled into main barrel | Medium | **Resolved** | Removed `useLocalStorage` and `useMediaQuery` re-exports from `src/index.ts`. Hooks still available via `@reading-advantage/utils/hooks` subpath. Fixes server-component build errors. |
| 2026-05-02 | shared_backend_api | `reading-advantage/lib/session.ts` orphaned `try/catch` block | High | **Resolved** | Removed duplicate orphaned code at end of file introduced during Phase 2 auth migration. |
| 2026-05-02 | review_remediation | `studentAnswers.questionId` polymorphic reference without FK | Medium | Open | `questionId` references either `multipleChoiceQuestions.id` or `shortAnswerQuestions.id`. Single FK impossible. Integrity enforced at app layer. Documented in schema. |
| 2026-05-02 | review_remediation | `lessonProgress.lessonId` is text while `lessons.id` is UUID | Low | Open | Historical mismatch. `lessonId` may reference external lesson identifiers. Document if intentional or migrate. |
| 2026-05-02 | review_remediation | NextAuth vs tRPC auth dual system in reading-advantage | Medium | Open | `getCurrentUser()` tries NextAuth first, then tRPC token. Decide which survives and remove fallback. |
