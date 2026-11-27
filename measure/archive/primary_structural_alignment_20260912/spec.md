# Specification: Primary Structural Alignment

Track ID: `primary_structural_alignment_20260912`. Type: chore (structural refactor). App: `apps/primary-advantage`.

## Overview

The 2026-09-12 Primary UX audit found a long tail of structural problems: 33 API routes import `@reading-advantage/db` directly, client `useEffect` fetches sit under server pages, the app has almost no error boundaries, and accessibility coverage is near zero on the legacy surface. Evidence: `docs/primary-advantage-ux-refactor-plan.md` sections 2.6 and 6.2. This track is optional. Run it after `primary_component_deduplication_20260912`. No new dependencies.

Track `primary_authorization_hardening_20260912` already closed the write-path holes. This track migrates the remaining routes onto the domain layer so the same class of defect cannot return.

## Functional Requirements

### FR-1: Migrate the 33 API routes onto TenantDB

43 files under `app/`, `components/`, and `actions/` import `@reading-advantage/db` directly: 33 API routes, 1 page, 6 server actions, and 3 components. Only 10 call sites use `createTenantDB` from `@reading-advantage/domain`, and all 10 sit in the newer `app/api/v1/apk/*`, `app/api/host-proof/*`, and `lib/apk/*` code.

Migrate the 33 API routes off the direct `@reading-advantage/db` import and onto `createTenantDB` and `assertCan`. Start with any remaining user, assignment, and search routes that Track 1 touched at the handler layer.

Do not rewrite the 72 API routes wholesale in one change. Route by route. Each migrated route keeps its URL and response shape.

### FR-2: Move four `useEffect` data fetches to their server pages

Move the four `useEffect` data fetches named in the audit to their server pages and pass props. The existing `Suspense` skeletons then cover real data.

### FR-3: Add error boundaries

Only three error and loading boundaries exist, all under `student/read`. There is no `global-error.tsx` and no route-group `error.tsx`. A throw on a teacher or admin page replaces the whole shell with the Next.js default.

Add one `error.tsx` per route group and one `global-error.tsx`. The existing `student/read` boundary always reports "404 Article Not Found", even for a database failure. Give it a generic error state with a retry.

### FR-4: Accessibility pass

Baseline: 12 `aria-label` uses, 7 `role="alert"` uses, and 0 `aria-live` uses across 149 client components. All 7 `role="alert"` uses sit in new APK and host-proof code. The legacy surface has none.

- Make the 22 clickable elements real buttons or links. They include the history table rows, the classroom selector card, the article showcase cards, the flashcard faces, and three lesson collection panels.
- Give the icon-only buttons an `aria-label`. Ten live candidates exist; two more sit in dead files that Track 5 deletes.
- Put the `AudioButton` `onClick` on a real `<button>` with an accessible name. Today the handler sits on the SVG.
- Add `role="alert"` to `components/form-error.tsx` and `components/ui/form.tsx` `FormMessage`. `form-error.tsx` reaches only the three auth form files.
- Add `aria-live` to the game result panels.
- Add a keyboard path to the two sentence-ordering games. They currently use a `draggable` `div` with drag handlers only. The word-ordering variants already use real `<button>` elements; copy that pattern.

### FR-5: Remaining i18n and locale-loss fixes

- Replace hardcoded English in the licence forms, the school form, the games catalogue, the APK surface, and the footer. `components/index/footer.tsx` has no `useTranslations` call.
- Four pages call `redirect("/auth/signin")` from `next/navigation` with no locale. Four files import `Link` from `next/link`. Two sign-in forms set `window.location.href`. Use the i18n `Link` and `useRouter`.
- Only 2 of 51 pages export `metadata`. Add per-page `metadata` to marketing and auth pages.
- `student-rpg-catalog-panel.tsx:380-381` hardcodes the button labels "Read Thai" and "Listen to English". The labels are wrong for Vietnamese and Chinese users. Translate both.
- `user-account-nav.tsx:159` sets `window.location.href = "/"` on logout. Use the i18n router so the locale prefix survives.
- `teacher/dashboard/page.tsx` renders `<div>TeacherDashboard</div>` and imports `currentUser` without using it. Render the dashboard or redirect it, and remove the dead import.

Footer content defects (year, phone, empty href, `/pricing`, address, spelling) belong to `primary_broken_ux_fixes_20260912`. Do not redo them here.

### FR-6: Render `ProgressBar` with real XP, or delete it

`components/shared/app-layout.tsx:4,19,32` imports `ProgressBar` and declares `disableProgressBar`, but the JSX renders neither. `app-layout.tsx:64` passes hardcoded `xp: 0, level: 0, cefrLevel: ""` to `UserAccountNav`.

`components/progress-bar-xp.tsx:12` uses `LEVELS_XP.find(level => level.min <= currentXP)`, which returns the first entry for any positive XP, so the target is always 4999.

Render `ProgressBar` with real XP and fix the level lookup, or delete the dead import and the unused component.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Application code must not bypass the domain layer per AGENTS.md. Every migrated query is scoped by `schoolId`.
- NFR-3: Run `build-graph update ./graph.db <files>` after structural edits.
- NFR-4: Do not share code with `reading-advantage`. The two applications have diverged too far for a cheap merge.

## Acceptance Criteria

- AC-1: The 33 named API routes import `createTenantDB` and `assertCan`. A new direct `@reading-advantage/db` import in `app/api` fails a static test, except the APK and host-proof files that already use TenantDB.
- AC-2: The four listed pages render server-fetched data. No matching client fetch fires on load.
- AC-3: A throw on a teacher or admin page renders the route-group `error.tsx` with a retry, not the Next.js default white page.
- AC-4: The 22 clickable elements and the icon-only buttons are keyboard-reachable. `AudioButton` is a real button. Form errors expose `role="alert"`. Game results expose `aria-live`.
- AC-5: The two sentence-ordering games have a click or arrow-key path.
- AC-6: `pnpm turbo run test --filter=primary-advantage`, `check-types`, and `build` pass, except the known pre-existing APK failure.

## Out of Scope

- Framework upgrades. The version policy forbids them.
- Rewriting the 72 API routes wholesale. Track 1 already touched the routes it named; this track owns the rest, one route at a time.
- The failing APK test in `components/apk/__tests__/StudentCartridgeHost.test.tsx`.
- The stale `@reading-advantage/game-cartridges` build that blocks `turbo run check-types`.
- Sharing code between `primary-advantage` and `reading-advantage`.
- Write-path authorization already closed in Track 1. Do not reopen those handlers except to finish the TenantDB migration.
