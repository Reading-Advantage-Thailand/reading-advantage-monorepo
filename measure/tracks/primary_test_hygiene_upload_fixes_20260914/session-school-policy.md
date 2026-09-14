# Session-School Policy for Upload Writes

Track: `primary_test_hygiene_upload_fixes_20260914` (spec FR-2, plan Tasks 3 and 7).
All file paths are relative to `apps/primary-advantage/`.

## Policy

The verified session is the sole `schoolId` source for every upload write.

1. Route handlers must derive the stamped `schoolId` from the session user. The
   session user is the `getCurrentUser()` result, read as `authUser.schoolId`.
2. Handlers must never stamp rows from the stored user row
   (`currentUser.schoolId`). The stored row can lag the session after a school
   change.
3. The stored row may still supply non-school values, such as the user id for
   audit columns.
4. SYSTEM sessions carry no school. Their imports stamp `schoolId: null` by
   design.

## Stamping sites

These sites stamp rows with `currentUser.schoolId` today. `currentUser` comes
from the uploader's stored user row, loaded at `app/api/upload/csv/route.ts:78`
and `app/api/upload/classes/route.ts:195`.

| Site | Stamped write |
|------|---------------|
| `app/api/upload/csv/route.ts:301` | `users` rows for the batch inserts at lines 342 and 355 |
| `app/api/upload/csv/route.ts:445` | `classrooms` row for the insert at line 443 |
| `app/api/upload/classes/route.ts:573` | `users` rows for the batch inserts at lines 765 and 782 |
| `app/api/upload/classes/route.ts:687` | `classrooms` rows for the insert at line 985 |
| `app/api/upload/classes/route.ts:759` | Batch rows carry `userData.schoolId`; the value originates at line 573 |

## Why scope and stamp diverge

Both routes already scope writes from the session school:

- `app/api/upload/csv/route.ts:65` builds the tenant from `authUser.schoolId`.
- `app/api/upload/classes/route.ts:182` builds the tenant from
  `authUser.schoolId`.
- `app/api/upload/csv/route.ts:75` and `app/api/upload/classes/route.ts:192`
  pick the write handle from the session school.

A stale session makes the scope and the stamped value disagree. The scope uses
the session school. The stamp uses the stored row school.

## Non-write consumers

- `app/api/upload/csv/route.ts:88-94` and
  `app/api/upload/classes/route.ts:206-212` stitch the `schoolInfo` response
  field from the stored row school.
- These reads build a response field, not a row stamp. They sit outside this
  policy.

## Cleanup route audit

`app/api/upload/csv/cleanup/route.ts` does not share the pattern. It performs
no database write and stamps no row with a `schoolId`. It only deletes
temporary files. FR-2.3 needs no change there.

## Fail-closed behavior (must be preserved)

- `app/api/upload/csv/route.ts:96-106` rejects non-SYSTEM uploads when the
  stored user row has no school. The route returns status 400 with
  "School association required".
- `app/api/upload/classes/route.ts:214-224` applies the same rejection.
- FR-2.2 requirement: a session without school context keeps its current
  rejection status after the Task 7 change.
- The TenantDB contract adds a second guard. FLAT operations throw
  `TenantScopeError` when the tenant school is null
  (`packages/domain/src/db-contract.ts`, `requireTenantForFlat`).
