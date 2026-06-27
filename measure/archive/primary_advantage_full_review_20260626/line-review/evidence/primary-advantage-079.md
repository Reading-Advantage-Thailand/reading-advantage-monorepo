# Line Review Evidence: primary-advantage-079

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-079
Files assigned: 10
Lines assigned: 825

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/i18n/request.ts | 1-16 | reviewed | 0 |
| apps/primary-advantage/i18n/routing.ts | 1-9 | reviewed | 0 |
| apps/primary-advantage/lib/__tests__/utils.test.ts | 1-198 | reviewed | 0 |
| apps/primary-advantage/lib/calculateLevel.ts | 1-52 | reviewed | 1 |
| apps/primary-advantage/lib/events.ts | 1-33 | reviewed | 1 |
| apps/primary-advantage/lib/fsrs-service.ts | 1-197 | reviewed | 1 |
| apps/primary-advantage/lib/get-query-client.ts | 1-25 | reviewed | 0 |
| apps/primary-advantage/lib/permissions.ts | 1-232 | reviewed | 2 |
| apps/primary-advantage/lib/session.ts | 1-21 | reviewed | 0 |
| apps/primary-advantage/lib/storage-config.ts | 1-42 | reviewed | 1 |

## Findings

### LR-079-001 — `calculateLevel.ts` is an entirely dead/commented-out module

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/lib/calculateLevel.ts:1-52`
- Evidence: Every line of the file is commented out, including the import of `text-readability` (line 1), the `IReadability` interface (lines 3-6), the `levels` array (lines 8-27), the `calculateLevel` function body (lines 29-50), and the `export { calculateLevel }` (line 52). A repo-wide search confirms no other file imports `lib/calculateLevel` — the only match for the symbol is this file itself. The module exports nothing and is unreachable dead code carried over from the Reading Advantage code lineage.
- Impact: Dead file inflates the surface area auditors and agents must read, and the commented import references `text-readability`, a dependency whose presence/absence is now ambiguous. No runtime impact, but it obscures the true CEFR/level logic, which actually lives in `lib/utils.ts` (`calculateLevelAndCefrLevel`, exercised by the batch's test file).
- Recommendation: Delete the file in a dedicated cleanup track, or restore it with a real implementation if the readability-based leveling is still intended.

### LR-079-002 — `events.ts` calls the Vercel Analytics SDK directly and carries shadcn-doc boilerplate event names

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/lib/events.ts:1` and `apps/primary-advantage/lib/events.ts:28-32`
- Evidence: Line 1 imports `va from "@vercel/analytics"` and `trackEvent` (lines 28-32) calls `va.track(...)` directly. Root `AGENTS.md` Provider Neutrality Rule explicitly lists analytics among the capabilities that must sit behind an internal adapter ("Application → Backend Module → Internal Interface → Provider Adapter → Provider"), but this util binds straight to the provider SDK. Additionally the `eventSchema` enum (lines 5-19) is almost entirely shadcn registry/documentation events (`copy_npm_command`, `copy_usage_import_code`, `copy_primitive_code`, `copy_chart_code`, `copy_chart_theme`, `copy_chart_data`, `enable_lift_mode`, …); only `set_layout` is actually emitted (confirmed: the sole caller is `components/site-config.tsx:21-22`). This is copied scaffolding from the shadcn/ui site, inherited from Reading Advantage rather than written for a primary-student reading product.
- Impact: Direct SDK coupling violates the provider-neutrality guardrail and would require touching call sites if analytics is swapped. The unused enum members are misleading dead contract surface.
- Recommendation: Route analytics through a shared analytics adapter and prune the event enum to the events this app actually emits.

### LR-079-003 — `fsrs-service.processReview` returns an untyped `any` review log

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/lib/fsrs-service.ts:155` and `apps/primary-advantage/lib/fsrs-service.ts:161`
- Evidence: `processReview` is declared to return `{ updatedCard: Partial<FlashcardCard>; reviewLog: any }` (line 155) and assigns `reviewLog: result.log` (line 161). `ts-fsrs` exports the `RecordLogItem`/`ReviewLog` types (the `RecordLog` and `RecordLogItem` types are already imported on lines 8-9), so the `any` is avoidable. Root `AGENTS.md` requires runtime validation/typed contracts at boundaries; this is a leaked `any` on a function whose output feeds persistence in `actions/flashcard.ts`.
- Impact: Loss of type safety on the review-log payload that callers persist; downstream consumers get no compile-time guarantees about the log shape.
- Recommendation: Type `reviewLog` as the `ts-fsrs` `ReviewLog` type and remove the `any`.

### LR-079-004 — `permissions.ts` permission model expects a relational user shape the session never provides

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/lib/permissions.ts:84-95` and `apps/primary-advantage/lib/permissions.ts:113-130`
- Evidence: `UserForPermissions` (lines 84-95) models a user with `roles: Array<{ role: { name } }>` and `SchoolAdmins: Array<{ id; schoolId }>`. `hasPermission` derives `userRoles` from `user.roles` (line 114) and `isSchoolAdmin` from `user.SchoolAdmins?.length` (line 115), and `SCHOOL_ADMIN_ACCESS` (lines 52-55) plus every `schoolAdminAllowed: true` branch (lines 117-120) depend on `SchoolAdmins` being populated. But the migrated Drizzle session user returned by `validateSession` (`packages/auth/src/session.ts:166-198`) exposes only a flat `role: string` (plus id/username/name/schoolId/xp/level/cefrLevel) — there is no `roles` relation and no `SchoolAdmins` relation. The client hook `hooks/use-permissions.ts:17` feeds exactly this session user into these functions, so `isSchoolAdmin` is always `false`, `userRoles` is always `[]`, and `SCHOOL_ADMIN_ACCESS` can never be granted. The interface is a leftover of the pre-migration Prisma/NextAuth relational shape.
- Impact: School-admin gating in the nav/UI is silently dead — school admins are treated as having no school-admin permission, and any future security decision built on this util would mis-evaluate. This is a concrete fork-divergence introduced by the shared auth/session migration not being reflected here.
- Recommendation: Reconcile `UserForPermissions` with the shared session contract (derive school-admin status from the authoritative source), and add tests proving school-admin grants resolve correctly.

### LR-079-005 — `canAccessRoute` fails open for unmatched routes

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/lib/permissions.ts:209-231`
- Evidence: `canAccessRoute` only checks the four hardcoded prefixes in `routePermissions` (lines 216-221) and returns `true` for any route that matches no prefix (line 231: "Default to allowing access if no specific permission required"). This is a fail-open default copied from the Reading Advantage permission utility. Root `AGENTS.md` warns against hiding role checks in UI-only code and against permissive tenant/role defaults; while this helper is UI nav gating (not the server authorization boundary), a fail-open default is fragile if it is ever reused for an access decision.
- Impact: New protected route prefixes are accessible until someone remembers to register them here; the default-allow posture is the opposite of safe-by-default.
- Recommendation: Default to deny (or require an explicit allowlist) for unknown routes, and keep real authorization on the server, not in this UI helper.

### LR-079-006 — `storage-config` bypasses the storage adapter and emits unsigned public GCS URLs for student content

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/lib/storage-config.ts:6-20` and `apps/primary-advantage/lib/storage-config.ts:28-41`
- Evidence: `getStorageUrl` (lines 16-20) concatenates `https://storage.googleapis.com/<bucket>/<path>` directly, and `getArticleImageUrl`/`getAudioUrl` (lines 28-41) build public object URLs with no signing or access control. Root `AGENTS.md` Storage section requires going through an internal adapter (`storage.get()` / `storage.getSignedUrl()`) and forbids direct provider URL construction. These helpers are widely consumed (e.g. `actions/flashcard.ts`, multiple `app/api/flashcard/...` routes, `components/articles/*`), so the bypass is pervasive. Because the URLs are unsigned, any article image/audio is retrievable by anyone who guesses/obtains the predictable `images/<articleId>_<n>.png` path — a privacy concern given this is a primary-student (minors) product.
- Impact: Provider lock-in to Google Cloud Storage and public, guessable URLs for primary-student-facing media. If the bucket is or becomes public, content is enumerable without authorization; if private, these URLs simply break — either way the adapter contract is violated.
- Recommendation: Move object access behind the shared storage adapter and serve student media via short-lived signed URLs; treat predictable public object paths as a child-data exposure risk to remediate.

## No-Finding Notes

- `apps/primary-advantage/i18n/request.ts`: Standard next-intl `getRequestConfig`; validates the requested locale against `routing.locales` via `hasLocale` and falls back to `routing.defaultLocale`, then lazy-imports `../messages/${locale}.json`. Locale is constrained to the routing allowlist before the dynamic import, so the import path is not attacker-controlled. Reviewed line-by-line; no findings.
- `apps/primary-advantage/i18n/routing.ts`: `defineRouting` with `locales: ["en","th","vi","cn","tw"]` and `defaultLocale: "en"`. The non-IETF `cn`/`tw` codes are internally consistent with `convertLocaleFull` in `lib/utils.ts` (verified by the batch's test file lines 170-176), so no contract mismatch. Reviewed line-by-line; no findings.
- `apps/primary-advantage/lib/__tests__/utils.test.ts`: Vitest suite covering `cleanGenre`, `sanitizeTranslationKey`, `generateSecureCode`, `generateRandomClassCode`, `calculateLevelAndCefrLevel`, `convertCefrLevel`, `convertLocaleFull`, and `generateLicenseKey`. Assertions are deterministic where the function is deterministic and structural (length/regex/uniqueness) for the random generators, which is the correct approach. Imports resolve to `../utils`. Reviewed line-by-line; no findings.
- `apps/primary-advantage/lib/get-query-client.ts`: Canonical TanStack Query SSR helper — fresh `QueryClient` per request on the server (`isServer`) and a browser singleton otherwise, with `staleTime: 60s`. Comments are in Thai but accurate. Reviewed line-by-line; no findings.
- `apps/primary-advantage/lib/session.ts`: Reads `SESSION_COOKIE_NAME` cookie, returns `null` when absent, and delegates to the shared `validateSession(db, token)` adapter — correctly uses the `@reading-advantage/auth` contract rather than reimplementing session logic. `currentRole` safely null-coalesces. This is the correct adapter-backed pattern. Reviewed line-by-line; no findings.
