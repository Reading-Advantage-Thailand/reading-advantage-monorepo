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
| 2026-04-29 | monorepo-scaffold | Shared ESLint flat config doesn't resolve plugins across pnpm workspace boundaries | Medium | **Resolved** | Restructured shared config with composable `baseConfig`/`plugins`/`ignores` exports. advantage-games migrated to shared config. |
| 2026-04-29 | monorepo-scaffold | Tailwind shared config is v3-style, apps use v4 CSS-based config | Low | **Resolved** | All 5 apps on Tailwind v4 CSS-based config. Shared config `packages/config/tailwind` provides v4 CSS, not v3 JS. |
| 2026-04-29 | monorepo-scaffold | react-konva peer dependency warning (wants react 19.2.0, app has 19.1.0) | Low | Open | Doesn't block builds. Consider upgrading React to 19.2.x across the monorepo. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage Tailwind v3 (app) vs v4 (monorepo shared config) | High | **Resolved** | All 5 apps migrated to Tailwind v4. No `tailwind.config.js` files remain. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled to pass build. Pre-existing TS and lint errors should be fixed incrementally. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: 128 lint warnings, 26 failed test suites (37 tests) | Medium | Open | Pre-existing from original repo. Baselines documented: 0 lint errors, 128 warnings; 50/76 suites pass, 457/494 tests pass. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: Firebase Auth migration to shared auth package | High | **Resolved** | Resolved by unified_auth track: removing Firebase entirely, moving to username/password. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: Firestore → Drizzle migration incomplete | Medium | **Resolved** | Firestore server code removed. 7 files use no-op stub for compilation. firebase/firebase-admin/firebase-mock removed from deps. Prisma→Drizzle migration still pending (separate track). |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: zustand v4 vs v5 in monorepo | Medium | Open | App uses zustand v4, advantage-games uses v5. Align when reading-advantage is ready for v5 migration. |
| 2026-05-01 | migrate-reading-advantage | reading-advantage: ESLint v8 vs v9 in monorepo | Medium | Open | App uses `.eslintrc.json` (legacy v8). Monorepo shared config uses flat config v9. Keep local config until ESLint migration. |
| 2026-05-02 | migrate-reading-advantage | reading-advantage: two i18n libraries (next-intl + next-international) | Low | **Resolved** | Removed `next-international` from reading-advantage. Rewrote locale provider and locale-switcher to use `next-intl` APIs only. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled. Pre-existing TS errors and 49 lint errors. Fix incrementally. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: 49 lint errors, 74 warnings (pre-existing) | Medium | Open | Errors: `react/no-unescaped-entities`, `react-hooks/rules-of-hooks`. Warnings: missing deps in useEffect. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: no test suite | Medium | Open | Zero tests. Consider adding Vitest for new code. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: NextAuth v5 beta | Medium | **Resolved** | Resolved by unified_auth track: removing NextAuth entirely, moving to username/password. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: Prisma schema separate from reading-advantage | Medium | Open | Two separate Prisma schemas. Future: unify or document boundary. |
| 2026-05-01 | migrate-primary-advantage | primary-advantage: missing `base64-js` dependency | Low | Open | Was missing from package.json; added during migration. |
| 2026-05-01 | migrate-www | www: `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` | Medium | Open | Temporarily enabled. Pre-existing TS errors. Fix incrementally. |
| 2026-05-01 | migrate-www | www: 2 Vitite test suite failures (transform errors) | Low | Open | Vite transform errors in 2 suites. 403/403 individual tests pass. Likely pre-existing. |
| 2026-05-01 | migrate-www | www: `next-international` vs `next-intl` across apps | Medium | **Resolved** | www migrated to `next-intl`. All apps now use `next-intl` only. |
| 2026-05-01 | migrate-www | www: revideo dependencies in devDependencies | Low | Open | `@revideo/*` packages are heavy dev deps. Verify they're still needed. |
| 2026-05-02 | shared_backend_api | Workspace packages with `.js` ESM imports export raw TS source | High | **Resolved** | Built all packages (`api`, `auth`, `auth-client`, `db`, `domain`, `types`) to `dist/` and updated `exports` to point to built output. Prevents Next.js transpilation failures. |
| 2026-05-02 | shared_backend_api | `packages/utils` hooks bundled into main barrel | Medium | **Resolved** | Removed `useLocalStorage` and `useMediaQuery` re-exports from `src/index.ts`. Hooks still available via `@reading-advantage/utils/hooks` subpath. Fixes server-component build errors. |
| 2026-05-02 | shared_backend_api | `reading-advantage/lib/session.ts` orphaned `try/catch` block | High | **Resolved** | Removed duplicate orphaned code at end of file introduced during Phase 2 auth migration. |
| 2026-05-02 | review_remediation | `studentAnswers.questionId` polymorphic reference without FK | Medium | Open | `questionId` references either `multipleChoiceQuestions.id` or `shortAnswerQuestions.id`. Single FK impossible. Integrity enforced at app layer. Documented in schema. |
| 2026-05-02 | review_remediation | `lessonProgress.lessonId` is text while `lessons.id` is UUID | Low | Open | Historical mismatch. `lessonId` may reference external lesson identifiers. Document if intentional or migrate. |
| 2026-05-02 | review_remediation | NextAuth vs tRPC auth dual system in reading-advantage | Medium | **Resolved** | Resolved by unified_auth track: moving to simple username/password DB sessions. |
| 2026-05-02 | unified_auth | science-advantage auth still uses Prisma (not Drizzle) | Medium | **Resolved** | Auth route handlers replaced with shared ones. Google OAuth rewritten to Drizzle. Local auth modules (session, server, constants) rewritten to use shared auth internally. Manual verification pending. |
| 2026-05-02 | unified_auth | reading-advantage build requires prisma generate | Medium | Open | Build fails at static generation phase if Prisma client not generated. `prisma generate` must run before build. Pre-existing infrastructure issue. |
| 2026-05-02 | unified_auth | Drizzle migration not generated for unified auth schema | Medium | **Resolved** | Generated 0003_slow_firebrand.sql — drops refresh_tokens/verification_tokens, adds SYSTEM role, restructures users/accounts/sessions for unified auth. SQL written manually (drizzle-kit 0.31 requires TTY for column-conflict prompts). Applied to dev DB. |
| 2026-05-02 | shared_config | No visual regression tests for Tailwind v4 migration | Low | Open | All 5 apps migrated to v4 but no screenshot-based regression tests. Deferred from shared_config_consolidation. |
| 2026-05-02 | shared_config | @reading-advantage/ui has few shared components | Low | **Resolved** | 15 components exported (Button, Card, Dialog, Input, Tabs, Label, Badge, Separator, Skeleton, Avatar, Alert, AlertDialog, Progress, Checkbox, Tooltip). Apps still use local copies — migration to shared imports deferred. |
| 2026-05-02 | i18n_migration | configs/locale-config.ts still used by 5 files | Low | Open | Assumed removable after next-intl migration but still imported by i18n.ts, routing.ts, locale-switcher, and 2 question cards. |
| 2026-05-02 | i18n_migration | No shared i18n types across apps | Low | Open | Each app defines its own Locale type. @reading-advantage/config should export shared Locale and message shape. Deferred from shared_config_consolidation. |
| 2026-05-03 | firestore_drizzle | 7 files use Firestore no-op stub | Medium | Open | validator-controller, deleteStories, audio generators, oauth2 route, stories-assistant-controller. Each needs Prisma rewrite or deletion. Build passes (stub is no-op). |
| 2026-05-03 | firestore_drizzle | reading-advantage controllers still use Prisma not Drizzle | High | **Deferred** | user-controller, license-controller, generator-controller all use `prisma.*`. Deferred to future "Prisma→Drizzle Schema Alignment" track — Drizzle schema diverges significantly from Prisma (missing License, Story, Chapter tables; different column structures for activity/xp). |
| 2026-05-03 | science_auth | science-advantage manual auth verification pending | Medium | Open | Login, session, logout, impersonate, and Google OAuth flows need manual browser verification after shared auth migration. |
| 2026-05-03 | science_auth | science-advantage non-auth Prisma still in use | Medium | Open | Curriculum, lessons, gamification, classes still use `prisma.*` directly. Auth tables migrated to Drizzle; non-auth deferred. |
