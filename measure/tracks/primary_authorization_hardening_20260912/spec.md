# Specification: Primary Authorization Hardening

Track ID: `primary_authorization_hardening_20260912`. Type: bug. App: `apps/primary-advantage`.

## Overview

The 2026-09-12 Primary UX audit found that authorization is absent from the write path. This defect class did not appear in the `reading-advantage` audit, and it outranks every user-experience defect. Evidence: `docs/primary-advantage-ux-refactor-plan.md` section 2. This track closes privilege escalation, unauthenticated routes, unguarded server actions, client-authoritative XP, and cross-tenant reads. No new dependencies. Nothing else in this program ships until this track lands.

## Functional Requirements

### FR-1: Gate `PATCH /api/users/[id]`

`app/api/users/[id]/route.ts` lines 14-17 reject only an anonymous caller. Lines 41-45 hash and set the target's password. Lines 57-74 delete the target's role rows and insert the requested role. The handler also writes `xp`, `level`, and `cefrLevel` from the body.

Require `ADMIN` or `SYSTEM`. Validate the body with Zod. Scope the target by `schoolId`. Refuse a self-role change. A student must not promote their own account to `SYSTEM` or change another user's password.

### FR-2: Authorize the five unauthenticated API routes

| Route | Defect |
|---|---|
| `app/api/articles/generate/route.ts` | No authentication. `amountPerGenre` is unbounded. One request starts bulk AI generation. |
| `app/api/assistant/lesson-chatbot/route.ts` | No authentication. The route is a free LLM proxy after body-shape validation. |
| `app/api/upload/csv/cleanup/route.ts` | No authentication. `DELETE` joins attacker-supplied `fileName` onto the temp directory and calls `unlink`. |
| `app/api/users/activitylog/[id]/route.ts` | No authentication. The route discards body fields and returns success after the controller throws. |
| `app/api/articles/route.ts` | No authentication. The article catalogue is public. |

Add an authorization check to each route. Bound `amountPerGenre` with Zod. Reject any `fileName` that is not a plain basename.

Do not treat `/api/students`, `/api/teachers`, `/api/classroom`, `/api/schools`, or `/api/licenses` as unguarded. Their controllers already enforce roles. A route-level search misreports them.

### FR-3: Authorize or delete the unguarded server actions

Ten exported server actions run with no caller check. A server action is a browser-callable POST endpoint. Its identifier reaches the client bundle when a client component imports it.

- `actions/test.ts`: `deleteAllArticles`, `deleteArticleFile`, `generateAudios`, `generateWordAudios`, `uploadArticleImages`, `generateImages`.
- `actions/article.ts`: `generateArticle`, `generateArticleNew`, `getDeleteArticleById`, `fetchArticleActivity`.

`deleteAllArticles()` at `actions/test.ts:63` deletes every article row and every associated storage file. Five client components under `app/[locale]/system/test/` import from this module. The proxy gates the `/system` page, but a caller can invoke any action identifier from any reachable route.

Add a role check to the first line of each action, or delete `actions/test.ts` and the `/system/test` page if the tooling is no longer needed.

Leave `signUpAction`, `signInAction`, and `fetchStudentsByClassCode` unauthenticated. Those are correct by design.

### FR-4: Move XP authority to the server

`actions/user.ts` `updateUserActivity(articleId, type, xpEarned, timer, data)` takes `xpEarned` from the caller and writes it to `xpLogs` and `users.xp`. Lines 55 and 82-97 also set `users.level` and `users.cefrLevel` from that value.

Remove the `xpEarned` parameter. Derive the award on the server from `ActivityType` and the `UserXpEarned` table. `app/api/v1/apk/complete/route.ts` already does this through `recordGameCompletion`. Use it as the model.

Five lesson games pass a client constant. `components/lesson/games/lesson-vocabulary-flashcard-card.tsx:263` passes `20` while `types/enum.ts:87` defines `VOCABULARY_FLASHCARDS = 15`. Server derivation also closes that disagreement.

### FR-5: Stop cross-tenant reads

- `app/[locale]/teacher/student-progress/[id]/page.tsx:27` passes the raw URL parameter to `fetchUserActivity`. `server/controllers/userController.ts:38` checks only that a user is signed in. The model selects by id with no `schoolId` filter.
- `app/api/users/[id]/article-records/route.ts:17` and `.../reminder-reread/route.ts:17` apply a role check, not an ownership or school check.
- `app/api/users/search/route.ts:31` filters on name or email and excludes only the caller. There is no `schoolId` filter.
- `server/models/assignmentModel.ts:273` selects an assignment by id alone, with its article and question rows.

Add ownership and `schoolId` checks to each of the four reads. A teacher must not read another school's student progress, name, email, XP history, or CEFR level.

### FR-6: Restore the unauthorized page and the 404 layout

`proxy.ts:97` redirects a role-denied user to `/${locale}/unauthorized`. No such route exists. Create `app/[locale]/unauthorized/page.tsx`.

`app/[locale]/[...not-found]/layout.tsx:15` redirects an anonymous visitor to sign-in. Remove that redirect so a wrong URL shows a 404 page.

### FR-7: Restrict `/student` and derive protected routes from the role enum

`proxy.ts:11` admits teacher, admin, and system to `/student`. Restrict `/student` to `["student"]`.

`proxy.ts:13,17` names a role `"user"` that the role enum does not contain. `INTERN`, `SALES_REP`, and `SALES_ADMIN` appear in no list.

Derive `protectedRoutes` from the role enum. Add a test that fails when a role has no policy.

Do not redo the casing work in `primary_proxy_role_normalization_20260728`. That track already normalizes session role keys. This track extends the role lists and adds the missing-role test.

### FR-8: Add a role assertion in each of the five layouts

All five layouts forward nav configs to `AppLayout`, which checks only that a user exists. One `matcher` edit currently removes every guard at once. Add a role assertion in each layout as defence in depth.

Do not add `api` to the proxy `matcher`. Route-level and action-level checks are the write-path fix. Running the intl proxy on API routes is out of scope.

## Non-Functional Requirements

- NFR-1: No new dependencies. Reuse `currentUser`, existing role checks, Zod, `UserXpEarned`, and `recordGameCompletion`.
- NFR-2: Do not migrate the 33 remaining direct `@reading-advantage/db` imports. Track `primary_structural_alignment_20260912` owns that long tail.
- NFR-3: All existing tests still pass: `pnpm turbo run test --filter=primary-advantage`.
- NFR-4: A test covers each write-path case in FR-1 through FR-5.

## Acceptance Criteria

- AC-1: A student account cannot change its own role, another user's password, or any user's XP through `PATCH /api/users/[id]`.
- AC-2: Each route in FR-2 returns 401 without a session and 403 without the required role.
- AC-3: `deleteAllArticles` and the other named actions reject a student caller, or the `actions/test.ts` module and `/system/test` page are deleted.
- AC-4: `updateUserActivity` has no `xpEarned` parameter. The server derives the award. A client-supplied XP value is ignored if one still arrives.
- AC-5: A teacher cannot read another school's student progress, user search results, or assignment rows.
- AC-6: A role-denied user lands on `/${locale}/unauthorized`. A wrong URL shows a 404 page, not a sign-in redirect.
- AC-7: `/student` admits only the student role. Every role in the enum has a proxy policy.
- AC-8: `pnpm turbo run test --filter=primary-advantage` passes, except the known pre-existing APK failure.

## Out of Scope

- Domain-layer migration of the 33 remaining direct `@reading-advantage/db` imports. Track `primary_structural_alignment_20260912` owns that.
- UX, audio, loading, and deduplication fixes. Tracks 2-5 own those.
- Adding `api` to the proxy matcher.
- The failing APK test in `components/apk/__tests__/StudentCartridgeHost.test.tsx`.
- Prisma artifact cleanup and hardcoded-secret removal. Wave 4 already owns those (`M7`, `M9`).
