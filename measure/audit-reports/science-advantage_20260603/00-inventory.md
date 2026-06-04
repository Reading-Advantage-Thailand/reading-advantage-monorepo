# Science-Advantage Audit — Inventory

Generated: 2026-06-03

> **Phase 1 output.** Baseline structural shape of `apps/science-advantage/`. Phase 2 section-audit subagents should consume this file before running their own greps.
>
> The existing `graph.db` was 16 hours old at scan time (<24h threshold) and was reused; a rescan was skipped.

---

## Source: `apps/science-advantage/`

| Metric | Count |
|--------|-------|
| Total source files (excl. `node_modules/`, `.next/`, `.turbo/`, `playwright-report/`, `.vite-temp/`, `.opencode/`, `.claude/`, `.codex/`, `.github/`) | 767 |
| Total `.ts` / `.tsx` source files | 330 |
| `app/**/route.ts` | 27 |
| `app/**/actions.ts` | 0 |
| `app/**/page.tsx` | 22 |
| `app/**/layout.tsx` | 6 |
| `app/**/middleware.ts` | 0 |
| `app/api/**/route.ts` | 27 (all `route.ts` are under `app/api/`) |
| Test files (incl. `__tests__/`, `__test__/`) | 88 |
| ↳ under `app/` | 22 (all `*.integration.test.ts` next to their route) |
| ↳ under `components/` | 16 (in `__tests__/` subdirs, mostly `lesson` + `gamification`) |
| ↳ under `lib/` | 39 (incl. `lib/__tests__/proxy.*.test.ts`) |
| ↳ under `scripts/` | 2 |
| ↳ under `tests/` | 9 (a separate `tests/` tree co-exists with the `__tests__/` colocated pattern) |
| `prisma/schema.prisma` | **0** (Prisma fully removed; only legacy `data/`, `seed-data/`, `seed-functions/`, `__tests__/` subdirs remain) |
| `lib/` files | 70+ (see full list below) |
| `components/` files | ~120 (shadcn-style `components/ui/` + `components/features/*`) |
| `app/feature-group` route groups | 7 — `(admin)`, `(auth)`, `(dashboard)`, `(student)`, `(system)`, `(teacher)`, root `app/` |
| Top-level files in app (excl. dirs) | 27 (see "Top-level files" below) |

> ⚠️ Structural shape differs from the AGENTS.md monorepo norm: there is **no `src/`** directory. All code lives directly under `apps/science-advantage/{app,lib,components,hooks,contexts,data,docs,scripts,tests,prisma,public,i18n,e2e,measure}`. AGENTS.md's recommended `packages/backend/modules/<module>/` layout does not exist. Domain-style code lives in `lib/services/{classes,mastery}/` and `lib/ai/`.

---

## `app/**/route.ts` files (full list, with line counts)

Total: 27 files, 5,767 lines.

| # | Path | Lines |
|---|------|------:|
| 1 | `app/api/ai/recommendations/route.ts` | 400 |
| 2 | `app/api/ai/update-mastery/route.ts` | 624 |
| 3 | `app/api/auth/impersonate/route.ts` | 6 |
| 4 | `app/api/auth/login/route.ts` | 6 |
| 5 | `app/api/auth/logout/route.ts` | 6 |
| 6 | `app/api/auth/session/route.ts` | 6 |
| 7 | `app/api/classes/[classId]/analytics/overview/route.ts` | 176 |
| 8 | `app/api/classes/[classId]/assignments/route.ts` | 364 |
| 9 | `app/api/classes/[classId]/curriculum/route.ts` | 172 |
| 10 | `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` | 412 |
| 11 | `app/api/classes/[classId]/roster/route.ts` | 169 |
| 12 | `app/api/classes/[classId]/route.ts` | 221 |
| 13 | `app/api/classes/join/route.ts` | 169 |
| 14 | `app/api/classes/route.ts` | 287 |
| 15 | `app/api/lessons/[lessonSlug]/quiz/route.ts` | 519 |
| 16 | `app/api/lessons/[lessonSlug]/route.ts` | 159 |
| 17 | `app/api/student/classes/route.ts` | 42 |
| 18 | `app/api/students/me/gamification/route.ts` | 118 |
| 19 | `app/api/students/[studentId]/achievements/route.ts` | 69 |
| 20 | `app/api/students/[studentId]/assignments/route.ts` | 109 |
| 21 | `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` | 337 |
| 22 | `app/api/students/[studentId]/gamification-profile/route.ts` | 123 |
| 23 | `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` | 304 |
| 24 | `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` | 147 |
| 25 | `app/api/students/[studentId]/mastery-profile/route.ts` | 325 |
| 26 | `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` | 287 |
| 27 | `app/api/teachers/dashboard/route.ts` | 210 |

> Note: `app/api/auth/{impersonate,login,logout,session}/route.ts` are stub files at 6 lines each — they are placeholders, not the real auth surface (auth lives in `proxy.ts` + `lib/auth/`).

---

## `app/**/actions.ts` files (full list)

**None.** The app does not use the Server Actions `actions.ts` file convention; all server-side mutations go through `route.ts` handlers or `lib/auth/server.ts`. This is **N/A** for §7.2 of the checklist (rule is satisfied vacuously) but means the §3.1 / §2.4 findings about thin handlers will land hardest on the 27 `route.ts` files.

---

## `app/**/page.tsx` files (full list, 22 files)

```
app/(admin)/admin/page.tsx
app/(admin)/students/page.tsx
app/(admin)/teachers/page.tsx
app/(auth)/signin/page.tsx
app/(dashboard)/teacher/classes/[classId]/students/[studentId]/lessons/[lessonId]/page.tsx
app/(student)/assignments/page.tsx
app/(student)/settings/page.tsx
app/(student)/student/classes/[classId]/lessons/[lessonSlug]/page.tsx
app/(student)/student/classes/[classId]/page.tsx
app/(student)/student/page.tsx
app/(student)/student/profile/page.tsx
app/(system)/schools/page.tsx
app/(system)/system/page.tsx
app/(teacher)/teacher/classes/[classId]/analytics/lessons/[lessonId]/page.tsx
app/(teacher)/teacher/classes/[classId]/analytics/page.tsx
app/(teacher)/teacher/classes/[classId]/lessons/[slug]/page.tsx
app/(teacher)/teacher/classes/[classId]/page.tsx
app/(teacher)/teacher/classes/[classId]/roster/page.tsx
app/(teacher)/teacher/classes/[classId]/students/[studentId]/page.tsx
app/(teacher)/teacher/classes/page.tsx
app/(teacher)/teacher/page.tsx
app/page.tsx  (root marketing/landing — 29,915 bytes)
```

> Pre-existing known issue (pilot F-003): `app/(student)/assignments/page.tsx` is a hardcoded stub.

---

## `lib/` files (full list, 70 files)

```
lib/ai/image-generator.test.ts
lib/ai/image-generator.ts
lib/ai/mastery-calculator.ts
lib/ai/prompts/recommendation.ts
lib/ai/recommendation-context.integration.test.ts
lib/ai/recommendation-context.ts
lib/ai/recommendation-service.ts
lib/ai/rules-engine.ts
lib/ai/types.ts
lib/analytics.ts
lib/api-helpers.test.ts
lib/api-helpers.ts
lib/auth/constants.test.ts
lib/auth/constants.ts
lib/auth/index.ts
lib/auth/password.test.ts
lib/auth/rate-limit.test.ts
lib/auth/server.integration.test.ts
lib/auth/server.ts
lib/auth/session-id-separation.test.ts
lib/auth/session.integration.test.ts
lib/auth/session.ts
lib/auth/types.ts
lib/bilingual.ts
lib/config/ai-images.ts
lib/config/ai.ts
lib/config/features.ts
lib/content-parsers.test.ts
lib/content-parsers.ts
lib/enums.ts
lib/env.test.ts
lib/env.ts
lib/forms/from-zod.ts
lib/gamification/badges.constants.ts
lib/gamification/badges.integration.test.ts
lib/gamification/badges.ts
lib/gamification/streak.integration.test.ts
lib/gamification/streak.test.ts
lib/gamification/streak.ts
lib/gamification/xp.constants.ts
lib/gamification/xp.integration.test.ts
lib/gamification/xp.test.ts
lib/gamification/xp.ts
lib/grade4-normalization.ts
lib/interventions/cache.ts
lib/interventions/config.ts
lib/interventions/detect-alerts.test.ts
lib/interventions/detect-alerts.ts
lib/observability/logger.ts
lib/observability/metrics.ts
lib/platform/cache-adapter.test.ts
lib/platform/cache-adapter.ts
lib/platform/integration.test.ts
lib/platform/rate-limit-store.ts
lib/platform/redis-client.ts
lib/platform/session-cleanup.ts
lib/quiz/scoring.test.ts
lib/quiz/scoring.ts
lib/schemas/lesson-content.schema.ts
lib/schemas/lesson-slug.schema.ts
lib/schemas/seed-validation.ts
lib/schemas/__tests__/content-migration.test.ts
lib/schemas/__tests__/curriculum-identifiers.integration.test.ts
lib/schemas/__tests__/curriculum-identifiers.test.ts
lib/schemas/__tests__/lesson-content.schema.test.ts
lib/schemas/validate-json.ts
lib/security-headers.test.ts
lib/services/classes/get-class-detail.integration.test.ts
lib/services/classes/get-class-detail.ts
lib/services/classes/get-student-classes.integration.test.ts
lib/services/classes/get-student-classes.ts
lib/services/mastery/mastery-worker.integration.test.ts
lib/services/mastery/mastery-worker.ts
lib/services/mastery/standard-mastery.integration.test.ts
lib/services/mastery/standard-mastery.ts
lib/test/resolve-test-database-url.test.ts
lib/test/resolve-test-database-url.ts
lib/test/run-drizzle-migrate.test.ts
lib/test/run-drizzle-migrate.ts
lib/__tests__/proxy.integration.test.ts
lib/__tests__/proxy-role.test.ts
lib/utils/class-format.test.ts
lib/utils/class-format.ts
lib/utils/clipboard.test.ts
lib/utils/clipboard.ts
lib/utils/date.test.ts
lib/utils/date.ts
lib/utils/generateJoinCode.integration.test.ts
lib/utils/generateJoinCode.ts
lib/utils/join-code-format.ts
lib/utils.ts
lib/validations/class.test.ts
lib/validations/class.ts
lib/validations/student-classes.test.ts
lib/validations/student-classes.ts
```

> `lib/services/{classes,mastery}/` is the closest thing to a domain layer (3 modules). It does **not** follow the AGENTS.md `packages/backend/modules/<module>/{schema,contracts,queries,mutations,actions,permissions,errors,index}.ts` layout, and lives inside the app rather than in `packages/*`.

---

## `components/` files (full list, ~120 files)

Tree: `components/ui/*` (shadcn primitives, 24 files) + `components/features/*` (feature widgets, ~96 files).

```
components/mode-toggle.tsx
components/theme-provider.tsx
components/ui/accordion.tsx, alert-dialog.tsx, alert.tsx, avatar.tsx, badge.tsx,
          button.tsx, card.tsx, checkbox.tsx, collapsible.tsx, dropdown-menu.tsx,
          form.tsx, input.tsx, label.tsx, progress.tsx, radio-group.tsx,
          select.tsx, skeleton.tsx, table.tsx, tooltip.tsx   (24 shadcn primitives)
components/features/admin/admin-nav.tsx
components/features/auth/dev-impersonation-panel.tsx
components/features/auth/signin-container.tsx
components/features/auth/signin-form.tsx
components/features/auth/user-menu.tsx
components/features/classes/class-card-skeleton.tsx
components/features/classes/class-card.tsx
components/features/classes/create-class-form.tsx
components/features/gamification/{badge-unlock-animation,confetti-celebration,level-up-animation}.tsx
components/features/gamification/__tests__/  (3 tests)
components/features/lesson/blocks/{image,materials,procedure,quiz,reading-passage,review,text,vocabulary}-block.tsx
components/features/lesson/blocks/index.ts
components/features/lesson/{display-preference-selector,image-gallery,index,lesson-player,vocabulary-flashcards}.tsx
components/features/lesson/__tests__/  (11 tests)
components/features/student/{ai-recommendation-card,continue-learning-card,gamification-dashboard-card,
                             join-class-form,lesson-viewer,quiz-player,student-assignments-card,
                             student-class-card-skeleton,student-class-card,student-classes-section,
                             student-curriculum-view,student-nav,student-progress-card}.tsx
components/features/student/mastery-profile/{mastery-profile-hero,mastery-profile-skeleton,
                                              mastery-progress-display,mastery-strands-list,
                                              student-badges-section,student-mastery-profile}.tsx
components/features/student/quiz-questions/{fill-in-blank,multiple-choice,multiple-select,
                                            true-false,vocabulary-match}-question.tsx + types.ts
components/features/student/__tests__/  (2 tests)
components/features/system/system-nav.tsx
components/features/teacher/analytics/{class-analytics-overview,lesson-detail-analytics,
                                       student-detail-analytics,student-lesson-detail-analytics}.tsx
components/features/teacher/{assign-button,class-progress-card,intervention-alerts-widget,
                             recent-completions-feed,students-need-attention-card,
                             teacher-dashboard-classes,teacher-nav}.tsx
components/features/teacher/class-detail/{class-detail-header,class-intervention-summary,class-roster,
                                         class-snapshot-panel,class-tabs,curriculum-accordion,
                                         curriculum-with-data,join-code-panel}.tsx
components/features/teacher/intervention-alerts-widget.test.tsx
```

> 4 component `__tests__/` directories in `components/features/{gamification,lesson,student}/` (and 1 colocated `.test.tsx` for `teacher/`).

---

## `prisma/` files (full list)

```
prisma/
├── data/
│   └── content/grade-4/
│       ├── lessons/  (10 .json files: g4-animal-adaptations, ecosystems, food-chains, …)
│       ├── questions/ (10 .json files)
│       ├── README.md
│       └── standards-mapping.json
├── seed-data/
│   ├── curriculum-units/  (thai-grade-3.json, thai-grade-4.json)
│   ├── lessons/           (10 thai-g3-*.json, 6 thai-g4-*.json)
│   ├── questions/         (12 .json files)
│   ├── standards/         (thai-grade-3.json, thai-grade-4.json)
│   └── README.md
├── seed-functions/
│   └── update-seed-files.ts
└── __tests__/             (empty)
```

> **No `schema.prisma`.** No `migrations/` directory. Prisma is genuinely removed; the `prisma/` directory is now a legacy seed-data bucket. Per protocol §2.8, the directory's existence is still a finding (recommend renaming to `seed-data/` at the app root and deleting `prisma/` entirely).

---

## `scripts/` files (full list, 18 `.ts` + 2 `.test.ts`)

```
scripts/backfill-mastery.ts
scripts/backfill-thai-titles.ts
scripts/convert-md-to-structured.ts
scripts/create-test-users.ts
scripts/dev-interventions.ts
scripts/migrate-lesson-content.ts
scripts/migrate-seed-data.ts
scripts/optimize-images.ts
scripts/seed-activity-data.ts
scripts/seed-demo-users.ts
scripts/seed.ts
scripts/seed/seed-activity-data.ts
scripts/seed/seed-curriculum-units.ts
scripts/seed/seed-demo-data.ts
scripts/seed/seed-lessons.ts
scripts/seed/seed-questions.ts
scripts/seed/seed-standards.ts
scripts/seed/validate-json.ts
scripts/test-curriculum-endpoint.ts
scripts/validate-content.ts
scripts/__tests__/migrate-lesson-content.test.ts
scripts/__tests__/validate-images.test.ts
scripts/fixtures/golden-lesson.md
scripts/MANUAL_TEST_INTERVENTION_WIDGET.md
scripts/test-student-curriculum-ui.md
```

> 6 scripts live in a nested `scripts/seed/` subdir (an in-package convention not mentioned in AGENTS.md). `.md` files in `scripts/` are not test artifacts but operator notes.

---

## Other top-level directories (not audited separately)

| Dir | Purpose (from `ls`) |
|-----|---------------------|
| `app/` | Next.js App Router (route groups, api, pages, layouts) |
| `components/` | UI primitives + feature widgets |
| `contexts/` | `display-preference-context.tsx`, `language-context.tsx` |
| `data/content/` | `grade-4/` lessons (10 JSON) + questions (10 JSON) |
| `docs/` | `archive/`, `changes/`, `content-templates/`, `prd/`, `project-brief/`, `specs/`, `sprint/`, `testing/` |
| `e2e/` | `smoke.spec.ts` (Playwright smoke test) |
| `hooks/` | `use-mobile.ts` |
| `i18n/` | `ai-recommendation.en.json`, `ai-recommendation.th.json` |
| `lib/` | See above |
| `measure/` | App-local `tracks/` and `archive/`, `code_styleguides/` |
| `prisma/` | Legacy seed-data (see above) |
| `public/` | `home_page/`, `images/` |
| `scripts/` | See above |
| `tests/` | Cross-cutting integration tests (9 files) |

---

## `package.json` dependencies (production, 48)

```json
{
  "name": "science-advantage",
  "version": "0.1.0",
  "private": true,
  "type": "module"
}
```

| Package | Version | Note |
|---------|---------|------|
| `@ai-sdk/google` | ^2.0.36 | AI SDK — provider SDK (see §1.3 concern) |
| `@ai-sdk/openai` | ^2.0.68 | AI SDK — provider SDK (see §1.3 concern) |
| `@dnd-kit/{core,modifiers,sortable,utilities}` | 6.3.1 / 9.0.0 / 10.0.0 / 3.2.2 | |
| `@hookform/resolvers` | ^5.2.2 | |
| `@radix-ui/react-*` | (15 packages) | |
| `@tabler/icons-react` | ^3.31.0 | |
| `@reading-advantage/api` | workspace:* | |
| `@reading-advantage/auth` | workspace:* | |
| `@reading-advantage/auth-client` | workspace:* | |
| `@reading-advantage/db` | workspace:* | |
| `@reading-advantage/domain` | workspace:* | |
| `@reading-advantage/ui` | workspace:* | |
| `@reading-advantage/utils` | workspace:* | |
| `@tanstack/react-table` | ^8.21.2 | |
| `ai` | ^5.0.95 | Vercel AI SDK — see §1.3 concern |
| **`bcryptjs`** | **^3.0.2** | **⚠️ Auth password hashing in app code (see §4.4)** |
| `class-variance-authority` | ^0.7.1 | |
| `clsx` | ^2.1.1 | |
| **`drizzle-orm`** | **^0.44.0** | **⚠️ Direct DB driver in app (should live behind `@reading-advantage/db` — see §2.3)** |
| `lucide-react` | ^0.483.0 | |
| `next` | 16.0.0 | |
| `next-themes` | ^0.4.6 | |
| `react` | 19.2.0 | |
| `react-dom` | 19.2.0 | |
| `react-hook-form` | ^7.65.0 | |
| `react-markdown` | ^10.1.0 | |
| `recharts` | ^2.15.1 | |
| `remark-gfm` | ^4.0.1 | |
| `sharp` | ^0.34.5 | |
| `sonner` | ^2.0.1 | |
| `tailwind-merge` | ^3.0.2 | |
| `tw-animate-css` | ^1.2.4 | |
| `vaul` | ^1.1.2 | |
| **`zod`** | **^3.25.76** | **⚠️ Should be shared via `packages/*` per §2.3** |

> ⚠️ `prisma` / `@prisma/client` are **not** in deps — confirms Prisma is fully removed. This is a partial pass for §5.5.
> ⚠️ `bcryptjs` is a direct app-level dependency — likely bypasses `@reading-advantage/auth` adapter (§4.4 violation).
> ⚠️ `drizzle-orm` and `zod` are direct app deps — should be wrapped by `packages/db` and `packages/types` per §2.3.

---

## `package.json` dependencies (dev, 21)

| Package | Version | Note |
|---------|---------|------|
| `@playwright/test` | ^1.59.1 | E2E |
| `@tailwindcss/postcss` | ^4 | |
| `@testing-library/jest-dom` | ^6.9.1 | Used in component tests |
| `@testing-library/react` | ^16.3.0 | |
| `@testing-library/user-event` | ^14.6.1 | |
| `@types/bcryptjs` | ^2.4.6 | **⚠️ needed because `bcryptjs` is in app code (§4.4)** |
| `@types/node` | ^20.17.25 | |
| `@types/react` | 19.2.2 | |
| `@types/react-dom` | 19.2.2 | |
| `@vitest/coverage-v8` | ^3.2.4 | |
| `@vitest/ui` | ^3.2.4 | |
| `baseline-browser-mapping` | ^2.8.32 | |
| `eslint` | ^9.38.0 | |
| `eslint-config-next` | 16.0.0 | |
| `jsdom` | ^27.2.0 | |
| `prettier` | ^3.6.2 | |
| `tailwindcss` | ^4 | |
| `tsx` | ^4.19.3 | |
| `typescript` | ^5.8.2 | |
| `vitest` | ^3.2.4 | |

> `overrides`: `@types/react` → 19.2.2, `@types/react-dom` → 19.2.2 (forces consistent React 19 types across the workspace).

---

## `next.config.ts` (full content, 54 lines)

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@reading-advantage/api',
    '@reading-advantage/auth',
    '@reading-advantage/auth-client',
    '@reading-advantage/db',
    '@reading-advantage/domain',
    '@reading-advantage/types',
    '@reading-advantage/ui',
    '@reading-advantage/utils',
  ],
  typescript: {
    // Retained post-Prisma-removal (track prisma_drizzle_science_controllers_20260505).
    // Prisma is gone; remaining tsc blockers are pre-existing and out of scope:
    //   - ~333 testing-library matcher narrowing (toBeInTheDocument et al.) in *.test.tsx
    //   - ~21 toHaveTextContent assertions, same root cause
    //   - INTERN role widening in lib/auth/session.ts (2)
    //   - Missing sibling modules lib/auth/{password,rate-limit}.test.ts (2)
    //   - ProcessEnv narrowing in vitest.integration.{global-setup,setup}.ts + lib/test/resolve-test-database-url.ts (3)
    //   - Duplicate next@16 type identities: RequestInit / CurriculumUnitSummary (~4)
    //   - Misc: user-menu string|null, beforeEach import, xp.test comparison, mastery-profile overload (4)
    // See measure/tech-debt.md `auth_strategy_review`.
    ignoreBuildErrors: true,        // ⚠️ §10.7 violation
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

> `ignoreBuildErrors: true` is **explicitly retained** with a comment listing ~370 known tsc errors. This is a §10.7 finding (High — pre-existing, but still blocks type-safety guarantee).

---

## `proxy.ts` (full content, 116 lines)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthError, SESSION_COOKIE_NAME, getSession, requireRole, type Role } from '@reading-advantage/auth';
import { db } from '@reading-advantage/db';

const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';

const ROLE_GATES: Array<{ prefix: string; role: Role }> = [
  { prefix: '/admin', role: 'ADMIN' },
  { prefix: '/system', role: 'ADMIN' },
  { prefix: '/teacher', role: 'TEACHER' },
  { prefix: '/student', role: 'STUDENT' },
];

function matchGate(pathname: string) { /* … */ }
function redirect(request: NextRequest, target: string, search?: Record<string, string>) { /* … */ }
function clearSessionCookie(response: NextResponse): NextResponse { /* … */ }

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (pathname === '/signin') { /* … */ }
  if (pathname === '/dashboard') { /* … */ }

  const gate = matchGate(pathname);
  if (!gate) return NextResponse.next();

  if (DEV_AUTH_ENABLED && !sessionToken) return NextResponse.next();
  if (!sessionToken) return redirect(request, '/signin');

  try {
    await requireRole(db, sessionToken, gate.role);
    return NextResponse.next();
  } catch (err) {
    if (err instanceof AuthError && err.code === 'FORBIDDEN') {
      return redirect(request, '/dashboard', { error: 'forbidden' });
    }
    if (err instanceof AuthError && err.code === 'UNAUTHORIZED') {
      return clearSessionCookie(redirect(request, '/signin'));
    }
    console.error('[proxy] session check failed', err);   // ⚠️ §9.2 console.error
    return redirect(request, '/signin', { error: 'session_check_failed' });
  }
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*', '/system/:path*', '/dashboard', '/signin'],
};
```

> `proxy.ts` already calls `requireRole` from `@reading-advantage/auth` (not cookie-presence checks) — §4.8 is **PASS** post-pilot F-004. The remaining concern is two `console.error(...)` calls in the catch blocks (§9.2 Low).

---

## `tsconfig.json` (full content, 54 lines)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "lib/generated",
    "app/api/students/[studentId]/classes/[classId]/analytics/route.integration.test.ts",
    "app/api/students/[studentId]/lessons/[lessonId]/analytics/route.integration.test.ts",
    "tests/api/class-analytics-overview.integration.test.ts",
    "tests/api/class-detail.test.ts",
    "tests/api/classes-join.test.ts",
    "tests/api/classes.test.ts",
    "tests/api/lesson-analytics.integration.test.ts",
    "tests/api/student-classes.test.ts",
    "tests/lib/get-student-classes.test.ts",
    "tests/lib/test-utils.ts",
    "tests/schema.test.ts",
    "tests/seed-activity.integration.test.ts"
  ]
}
```

> ⚠️ Several files in the `exclude` block do not exist on disk (e.g. `tests/api/class-detail.test.ts`, `tests/api/classes.test.ts`, `tests/lib/get-student-classes.test.ts`, `tests/lib/test-utils.ts`, `tests/schema.test.ts`). The `exclude` list is **stale** — likely left over from a pre-`pnpm --filter` test split. (`tsconfig.tsbuildinfo` and `tsconfig.pilot.tsbuildinfo` are present in the directory but gitignored.)
> `strict: true` is set (good for §10.7 partial), but `ignoreBuildErrors: true` in `next.config.ts` defeats it.

---

## Test framework

| Item | Status |
|------|--------|
| **Vitest** | ✅ yes — **4 configs**: `vitest.config.ts` (default; runs all tests, DB-capable), `vitest.unit.config.ts` (DB-free; `jsdom`), `vitest.integration.config.ts` (`node`, `globalSetup: vitest.integration.global-setup.ts`), `vitest.scripts.config.ts` (DB-free; `scripts/**/*.test.{ts,tsx}` only) |
| **Jest** | ❌ no |
| **Playwright** | ✅ yes — `playwright.config.ts` (1 spec: `e2e/smoke.spec.ts`) |
| `ignoreBuildErrors` (`next.config.ts`) | ⚠️ **yes** — `true`, with a ~370-error known list (see §10.7) |
| `ignoreDuringBuilds` (eslint) | ❌ no `ignoreDuringBuilds` flag present in `eslint.config.mjs` (file exists, not shown here) |

---

## CI workflows

### `apps/science-advantage/.github/workflows/ci.yml` (app-local, full content)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  checks:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions: { contents: read }
    env:
      DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/ci?schema=public
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ci-secret
      DEV_AUTH_ENABLED: 'false'
      NEXT_TELEMETRY_DISABLED: '1'
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

> ⚠️ **Drift findings**:
> 1. Uses `npm` + `package-lock.json` cache, but the monorepo is `pnpm`-based (no `package-lock.json` is committed at the app level — `git ls-files` would have to be re-checked by the §12 subagent; `.gitignore` is npm-aware too).
> 2. **No `test` step** — CI doesn't run `vitest`. Combined with `ignoreBuildErrors: true`, type-safety and test regressions aren't gated.
> 3. Env vars `NEXTAUTH_URL` / `NEXTAUTH_SECRET` are referenced but **not in `.env.example`** (drift).
> 4. The root monorepo `ci.yml` (`.github/workflows/ci.yml`) does run `pnpm test`, but only on push to `master` and PR to `master` (no path filter for `apps/science-advantage/**`).

### `.github/workflows/ci.yml` (monorepo root)

- Triggers: push to `master`, PR to `master`.
- Steps: `pnpm install --frozen-lockfile` → `pnpm config-drift` → `pnpm build` → `pnpm lint` → `pnpm test`.
- **No path filter** — runs against the whole monorepo, including `apps/science-advantage/`. (Note: there is no `science-advantage` or `apps/science` token in this file; it's a generic monorepo build.)

### `.github/workflows/cd-www-reading-advantage.yml`

- Targets `www-reading-advantage` only. **Does not touch science-advantage.**

---

## Top-level files in `apps/science-advantage/`

```
AGENTS.md                              ← app-local AGENTS.md (covers most of §11.5)
CLAUDE.md                              ← 11 bytes (essentially empty)
DESIGN.md                              ← design notes
GEMINI.md                              ← 8.6 KB — Gemini-related AI guidance
README.md                              ←
RETROSPECTIVE.md                       ← post-mortem doc
TEST_SUMMARY.md                        ← testing notes
TODO.md                                ← open TODOs
components.json                        ← shadcn config
eslint.config.mjs                      ← ESLint flat config
gemini_design_update.log               ← stray log file (unusual)
next-env.d.ts                          ← Next.js auto-generated
next.config.ts                         ← see above
package.json                           ← see above
playwright.config.ts                   ←
postcss.config.mjs                     ←
proxy.ts                               ← see above
test-analysis-report.md                ← analysis report
tsconfig.json                          ← see above
tsconfig.pilot.tsbuildinfo             ← gitignored
tsconfig.tsbuildinfo                   ← gitignored
vercel.json                            ← Vercel deployment config
visual_refresh_track.log               ← stray log file
vitest.config.ts                       ← see above
vitest.integration.config.ts           ←
vitest.integration.global-setup.ts     ← Drizzle migrate globalSetup
vitest.integration.setup.ts            ←
vitest.scripts.config.ts               ←
vitest.unit.config.ts                  ←
vitest.unit.setup.ts                   ←
.env.example                           ← see "Env vars" below
.env.local                             ← ⚠️ exists on disk, gitignored, NOT committed (git status confirms untracked)
.gitignore                             ← covers .env* except .env.example and .env.test
.prettierignore
.prettierrc
```

### `.env.example` (49 lines) — env vars expected at boot

| Var | Purpose | Validated by Zod? |
|-----|---------|-------------------|
| `DATABASE_URL` | Pooled (PgBouncer) connection | likely `lib/env.ts` |
| `DIRECT_DATABASE_URL` | Direct connection (drizzle-kit, seeds, LISTEN) | likely `lib/env.ts` |
| `DATABASE_POOL_MAX` | optional, default 3 | |
| `REDIS_URL` | Redis cache | |
| `OPENAI_API_KEY` | AI provider | |
| `GEMINI_API_KEY` | AI provider | |
| `AI_RECOMMENDER_MODEL` | default `gpt-5-mini` | |
| `AI_RECOMMENDER_MODEL_SECONDARY` | default `gemini-2.5-flash` | |
| `AI_RECOMMENDER_TIMEOUT_MS` | default 10000 | |
| `AI_RECOMMENDER_CACHE_TTL_SECONDS` | default 900 | |
| `AI_RECOMMENDER_HASH_SECRET` | required | |
| `AI_RECOMMENDER_MAX_REQUESTS_PER_MIN` | default 3 | |
| `AI_IMAGE_PRIMARY_MODEL` | default `google/gemini-3-pro-image` | |
| `AI_IMAGE_FALLBACK_MODELS` | default `openai/dall-e-3` | |
| `GOOGLE_CLOUD_PROJECT_ID` | GCS config | |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | GCS config | |
| `GOOGLE_CLOUD_KEY_FILE` | GCS service-account JSON path | |
| `NODE_ENV` | | |
| `DEV_AUTH_ENABLED` | dev impersonation toggle | |
| `NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION` | feature flag | |
| `NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED` | feature flag | |

> `lib/env.ts` exists — §6.3 should verify it Zod-validates **all** of the above and fails fast on missing required vars. The local CI workflow references `NEXTAUTH_URL` / `NEXTAUTH_SECRET` (NextAuth-era remnants) which are **not** in `.env.example` — drift.

---

## Notes — surprising / structural findings

1. **No `src/` directory.** Code lives at the app root. This is consistent with the app's own `AGENTS.md` description ("`app/`, `components/`, `lib/`, `prisma/`") but **diverges** from the monorepo `AGENTS.md` "monorepo structure" target. The `paths: { "@/*": ["./*"] }` in `tsconfig.json` reflects the flat-root convention.

2. **No `src/lib` pattern.** Shared code is at `lib/`, not `src/lib/`. Library-of-modules: `lib/{ai,auth,config,forms,gamification,interventions,observability,platform,quiz,schemas,services,test,utils,validations,__tests__}/*.ts` (15 subdirs + root `lib/*.ts`).

3. **Prisma is fully removed, but `prisma/` dir remains.** No `schema.prisma`, no `migrations/`, no `prisma` / `@prisma/client` in `package.json`. The `prisma/` dir is a legacy seed-data bucket (`data/`, `seed-data/`, `seed-functions/`, `__tests__/`). Per protocol §2.8, this is a Medium finding — should be moved to `scripts/seed-data/` and the `prisma/` dir deleted.

4. **No Server Actions (`actions.ts`).** All mutations go through `app/api/**/route.ts` handlers. Protocol §7.2 is N/A here, but §7.1 (thinness of route handlers) is the high-leverage finding to investigate.

5. **4 auth route handlers are 6-line stubs** (`app/api/auth/{impersonate,login,logout,session}/route.ts`). The real auth surface is `proxy.ts` (gating) + `lib/auth/server.ts` + `@reading-advantage/auth`. These stubs are suspicious — verify whether they are legacy/dead code or are referenced from anywhere (e.g. tests, scripts).

6. **`bcryptjs` is in production dependencies** at the app level. AGENTS.md §4.4 says password hashing must use Argon2id in `packages/auth`. §4.4 is a probable Critical/High finding.

7. **`drizzle-orm` and `zod` are direct app dependencies.** Should be wrapped by `@reading-advantage/db` and `@reading-advantage/types` per §2.3. Possible High finding.

8. **`@ai-sdk/google`, `@ai-sdk/openai`, `ai` are direct app dependencies.** `lib/ai/` exists as a partial adapter layer (9 files including `prompts/recommendation.ts`, `mastery-calculator.ts`, `rules-engine.ts`), but the SDK packages are still imported in `lib/ai/*.ts` itself. §1.3 is a probable High finding.

9. **No `middleware.ts` — only `proxy.ts`.** `proxy.ts` is fully featured (role gates, dev impersonation, session cleanup) and uses `requireRole` from `@reading-advantage/auth`. §4.8 is **PASS** post-pilot F-004.

10. **`ignoreBuildErrors: true` is explicitly retained** with a comment listing ~370 known tsc errors (testing-library matcher narrowing, INTERN role widening, etc.). §10.7 is a known and tracked finding (see `measure/tech-debt.md` `auth_strategy_review`).

11. **`tsconfig.json` `exclude` is stale** — references 12 test files that no longer exist on disk. Will be flagged by §10.7 / §12.4 auditors.

12. **Duplicate CI workflow.** `apps/science-advantage/.github/workflows/ci.yml` exists alongside the monorepo `.github/workflows/ci.yml`. The app-local one uses `npm` + `package-lock.json` (the app root has no `package-lock.json` committed at the app level), runs only `lint` + `build` (no `test`), and references env vars (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`) not in `.env.example`. Drift finding for §12.4 / §12.1.

13. **Local test DB**: `science_advantage_test` (Postgres) provisioned via Drizzle migrations in `vitest.integration.global-setup.ts`. The `prisma db push` workflow is explicitly forbidden (per app's `AGENTS.md`).

14. **Test files use 3 different patterns:** colocated `*.test.ts` (e.g. `lib/api-helpers.test.ts`); colocated `*.integration.test.ts` next to route handlers (22 files under `app/api/`); and `__tests__/` subdirs (`lib/__tests__/`, `lib/schemas/__tests__/`, `components/features/{gamification,lesson,student}/__tests__/`, `scripts/__tests__/`, `prisma/__tests__/`). A separate cross-cutting `tests/` tree also exists (9 files: `tests/api/`, `tests/lib/`, `tests/seed-activity.integration.test.ts`). AGENTS.md §10.2 expects one convention; this mixed layout is a §10.2 partial finding.

15. **`prisma/__tests__/` exists but is empty.** Dead directory.

16. **Stray log files in the app root:** `gemini_design_update.log`, `visual_refresh_track.log`, `tsconfig.{pilot,}.tsbuildinfo` (gitignored but visible). Likely a §12.2 finding.

17. **Pilot (2026-05-26) baseline status** (from `measure/agents-md-audit-protocol.md`):
    - F-001: 27 `route.ts` files import `db` directly. (Confirmed by inventory — 27 route handlers exist.)
    - F-002: ~360 tsc errors / 386 lines, 4 lint errors / 6 warnings. (`ignoreBuildErrors: true` is the mitigation.)
    - F-003: `/assignments` page is a hardcoded stub. (Confirmed by inventory.)
    - F-004: `proxy.ts` admin guard was cookie-only. (**Already fixed** — current `proxy.ts` uses `requireRole`.)

18. **App-specific AGENTS.md deviations worth flagging in §11.5:** the app's `AGENTS.md` references `npm` and NextAuth in some places (e.g. mentions `next-auth` config, `npx prisma ...`) that drift from the monorepo pnpm + Drizzle + adapter-auth reality.

---

## Quick pointers for the 13 section-audit subagents

| Section | Start with |
|---------|-----------|
| §1 Provider Neutrality | `grep -rE "from ['\"]@aws-sdk\|@google-cloud\|openai\|@anthropic-ai\|@google/generative-ai\|firebase\|resend\|sendgrid\|nodemailer\|minio" apps/science-advantage/ --include='*.ts' --include='*.tsx' -l` |
| §2 Package Boundaries | `grep -nE "^import .* from ['\"](@/lib/db\|@reading-advantage/db)" apps/science-advantage/app/api/**/route.ts`; check 27 files |
| §3 Backend-as-Code | `ls apps/science-advantage/lib/services/` (only `classes/` and `mastery/`); cross-check against `packages/domain/src/` |
| §4 Auth | `grep -rnE "bcrypt\|next-auth\|@auth/\|firebase/auth\|getServerSession\|cookies\(\)\|headers\(\)" apps/science-advantage/lib/auth/ apps/science-advantage/proxy.ts` |
| §5 Database | `grep -rnE "prisma\|@prisma/client" apps/science-advantage/`; check `schoolId` predicate coverage in 27 route.ts files |
| §6 Validation | `grep -rnE "JSON\.parse\(\|req\.json\(\)\|formData\(\)" apps/science-advantage/app/api apps/science-advantage/lib -l`; cross-check `lib/env.ts` Zod schema |
| §7 Transport | Spot-check 5 of the 27 route.ts files (suggest the 5 largest: `update-mastery/route.ts`, `lessons/.../quiz/route.ts`, `lessons/.../analytics/route.ts`, `assignments/route.ts`, `recommendations/route.ts`) |
| §8 Storage/AI/Workers | `grep -rnE "@google-cloud/storage\|@aws-sdk\|ai/\|generateText\|generateObject" apps/science-advantage/lib/ai/`; check for `await ...` long-running calls in `app/api/**/route.ts` |
| §9 Observability | `grep -rnE "console\.(log\|error\|warn)" apps/science-advantage/app apps/science-advantage/lib apps/science-advantage/proxy.ts` |
| §10 Testing | `pnpm turbo run test --filter=science-advantage` and `pnpm turbo run check-types --filter=science-advantage`; confirm `ignoreBuildErrors: true` in `next.config.ts` |
| §11 Documentation | Spot-check 10 exported functions across `lib/{auth,ai,services,observability,platform}/` for JSDoc presence |
| §12 Monorepo Hygiene | `pnpm turbo run {build,lint,check-types,test} --filter=science-advantage`; verify pinned versions in `package.json` and `pnpm-lock.yaml` (NOT `package-lock.json`); check `git log --oneline -20` for Conventional Commits |
| §13 Workflow | `cat measure/tech-debt.md`; check `.opencode/`, `.claude/`, `AGENTS.md`, `TODO.md` for track references; `cat .gitignore` to confirm `.env*` patterns |
