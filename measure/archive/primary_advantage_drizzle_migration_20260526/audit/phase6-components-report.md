# Phase 6 Closeout Report: Component/UI Migration (FR-3)

> **Track:** `primary_advantage_drizzle_migration_20260526`
> **Phase:** 6 — Component/UI Migration (FR-3)
> **Migration:** Prisma → Drizzle (type-only)
> **Status:** Green

## Summary

This phase migrates 5 component files in `apps/primary-advantage/components/` that
imported Prisma types to Drizzle-inferred types. The migration is **type-only**:
no runtime Prisma query API calls remained in these components (all data fetching
goes through the server-action / API-route layer migrated in Phases 3-5).

| Aspect | Value |
|--------|-------|
| Files migrated | 5 |
| Prisma type patterns found | 3 distinct: `Prisma.$Enums` (unused), `Prisma.AssignmentStatus` (enum value+type), `Prisma.ActivityType` (enum value), `Prisma.License` (model type) |
| Strategy | Type-only: replace `@prisma/client` imports with Drizzle `pgEnum`/`InferSelectModel<typeof table>` and local typed constants |
| Net Prisma imports removed | 5 (`@prisma/client` × 5 files → 0) |
| Net Drizzle type patterns added | 5 files (`@reading-advantage/db` imports + `InferSelectModel` where applicable) |
| Files that import `@/lib/prisma` | 0 (was 0 at Red baseline) |
| Files now importing `@reading-advantage/db` | 5 |
| Live proof `grep -r "from \"@prisma/client\"" apps/primary-advantage/components/ \| wc -l` | **0** |

### Prisma Type Patterns Encountered

1. **`Prisma.$Enums`** — used as a namespace import only; the symbol was never referenced in `mc-question-card.tsx`. Removed entirely. The Drizzle `activityType` pgEnum replaces the parallel use of `ActivityType` from `@/types/enum` (which was itself a TS enum mirroring the Prisma enum).

2. **`Prisma.AssignmentStatus`** — used as both runtime value (`AssignmentStatus.COMPLETED` comparisons) and TypeScript type (`status: AssignmentStatus`). Replaced with a locally-typed `const AssignmentStatus = { ... } as const satisfies Record<...>` plus a `StudentAssignmentRow = InferSelectModel<typeof assignmentStudents>` row type. The wire format (`"NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"`) is preserved verbatim.

3. **`Prisma.ActivityType`** — used as runtime value (`ActivityType.ARTICLE_READ`, `ActivityType.MC_QUESTION`). Replaced with the Drizzle `activityType` pgEnum (aliased `as ActivityType` so call sites are unchanged). The pgEnum exposes values as string-literal keys (`activityType.MC_QUESTION === "MC_QUESTION"`), which is structurally identical to the local TS enum.

4. **`Prisma.License`** — used as a TypeScript type (`type LicenseWithSchool = License & { School?: ... }`). Replaced with `type License = InferSelectModel<typeof licenses>` derived from the Drizzle `licenses` table. The shape matches the wire format returned by `/api/licenses` (all `licenses` columns + optional `School: { id, name } | null`).

## mc-question-card

**File:** `apps/primary-advantage/components/articles/questions/mc-question-card.tsx`

**Prisma patterns found:**
- `import { $Enums } from "@prisma/client";` — imported but never referenced.

**Migration:**
- Removed the unused `$Enums` import.
- Replaced `import { ActivityType } from "@/types/enum";` with `import { activityType as ActivityType } from "@reading-advantage/db";` so `ActivityType.MC_QUESTION` now resolves to the Drizzle `activityType` pgEnum (aliased to keep call sites unchanged).

**Call-site impact:** None. `ActivityType.MC_QUESTION` continues to be the string literal `"MC_QUESTION"`. The downstream `getQuestionsByArticleId(articleId, ActivityType.MC_QUESTION)` and `<RetakeButton type={ActivityType.MC_QUESTION} />` are unchanged.

## student-assignment-table

**File:** `apps/primary-advantage/components/student-assignment-table.tsx`

**Prisma patterns found:**
- `import { AssignmentStatus } from "@prisma/client";` — used as both runtime enum (`AssignmentStatus.COMPLETED`, `AssignmentStatus.NOT_STARTED`, `AssignmentStatus.IN_PROGRESS` for `switch` and `!==` comparisons) and as a TypeScript type (`status: AssignmentStatus`).

**Migration:**
- Removed the `@prisma/client` import.
- Added:
  - `import type { InferSelectModel } from "drizzle-orm";`
  - `import { assignmentStudents } from "@reading-advantage/db";`
- Added a local `AssignmentStatus` const that mirrors the Prisma enum values and a `AssignmentStatusValue` string-literal union type:
  ```ts
  type AssignmentStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  const AssignmentStatus = {
    NOT_STARTED: "NOT_STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
  } as const satisfies Record<AssignmentStatusValue, AssignmentStatusValue>;
  ```
- Added a row-type alias `type StudentAssignmentRow = InferSelectModel<typeof assignmentStudents>;` (not currently consumed in JSX, but establishes the Drizzle-inferred row shape for future refactors).

**Why a local const instead of a new pgEnum?** The Drizzle `studentAssignments.status` column is plain `text` (no pgEnum in the schema). The wire format already uses string literals `"NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"`, so a typed const preserves both type and runtime semantics without introducing schema churn. If/when a `pgEnum` is added in a future phase, only this file's local const needs to be deleted.

**Call-site impact:** None. All `AssignmentStatus.COMPLETED` etc. references resolve identically. The local `Assignment` and `AssignmentStudent` interfaces already define `status: AssignmentStatus` — that now refers to the local union type, which has the same three values.

## edit-license-form

**File:** `apps/primary-advantage/components/system/edit-license-form.tsx`

**Prisma patterns found:**
- `import { License } from "@prisma/client";` — used as a TypeScript type (`type LicenseWithSchool = License & { School?: ... }`).

**Migration:**
- Removed the `@prisma/client` import.
- Added:
  - `import type { InferSelectModel } from "drizzle-orm";`
  - `import { licenses } from "@reading-advantage/db";`
- Replaced the imported `License` with `type License = InferSelectModel<typeof licenses>;` so the `LicenseWithSchool` extension type now references the Drizzle-inferred row shape.

**Call-site impact:** None. The `license: LicenseWithSchool` prop, the `useForm` `defaultValues` field references (`license.name`, `license.maxUsers`, `license.startDate`, `license.expiryDate`, `license.status`, `license.schoolId`, `license.subscription`), and the `toLowerCase` cast on `license.subscription` all continue to work — the Drizzle-inferred shape includes every column that the API returns. (The local `License` interface in `types/index.d.ts` is a different shape used by other call sites; no name collision because the local type is `License` and the `types/index.d.ts` one is also `License` but used in a different file.)

**Note on name collision:** `apps/primary-advantage/types/index.d.ts` already defines a `License` interface with a different shape (`school_name`, `subscription_level`, `amount`, `active_users`, `email`). That `License` is not imported by this component (this component imports only `@/types` and `@/types/enum` — neither re-exports `License`), so the local `type License = InferSelectModel<typeof licenses>` does not collide.

## license-table

**File:** `apps/primary-advantage/components/system/license-table.tsx`

**Prisma patterns found:**
- `import { License } from "@prisma/client";` — used as a TypeScript type (`type LicenseWithSchool = License & { School?: ... }`).

**Migration:**
- Removed the `@prisma/client` import.
- Added:
  - `import type { InferSelectModel } from "drizzle-orm";`
  - `import { licenses } from "@reading-advantage/db";`
- Replaced the imported `License` with `type License = InferSelectModel<typeof licenses>;` (same pattern as `edit-license-form.tsx`).

**Call-site impact:** None. All column accesses (`row.getValue("name")`, `row.getValue("maxUsers")`, `row.getValue("subscription")`, `row.getValue("status")`, `row.getValue("expiryDate")`, `payment.key`, `payment.id`, `payment.name`, `row.original.School.name`) continue to work — the Drizzle-inferred `licenses` row includes every column the API returns.

## user-reading-chart

**File:** `apps/primary-advantage/components/dashboard/user-reading-chart.tsx`

**Prisma patterns found:**
- `import { ActivityType } from "@prisma/client";` — used as runtime enum value (`item.activityType === ActivityType.ARTICLE_READ`).

**Migration:**
- Removed the `@prisma/client` import.
- Replaced with `import { activityType as ActivityType } from "@reading-advantage/db";` (same Drizzle pgEnum aliased pattern as `mc-question-card.tsx`).

**Call-site impact:** None. `item.activityType === ActivityType.ARTICLE_READ` continues to compare against the string literal `"ARTICLE_READ"`. The `UserActivityLog[]` data is consumed from props (already shaped by upstream server-side Drizzle queries); no schema coupling is broken.

## Drizzle Type Patterns Used

The following Drizzle-inferred type patterns appear across the migrated files:

- **`InferSelectModel<typeof table>`** — primary row-type derivation pattern. Used in:
  - `student-assignment-table.tsx`: `type StudentAssignmentRow = InferSelectModel<typeof assignmentStudents>;`
  - `edit-license-form.tsx`: `type License = InferSelectModel<typeof licenses>;`
  - `license-table.tsx`: `type License = InferSelectModel<typeof licenses>;`

- **Drizzle pgEnum (typed string-literal keys)** — runtime enum replacement. Used in:
  - `mc-question-card.tsx`: `import { activityType as ActivityType } from "@reading-advantage/db";` (replaces `Prisma.ActivityType` and `ActivityType` from `@/types/enum`).
  - `user-reading-chart.tsx`: `import { activityType as ActivityType } from "@reading-advantage/db";` (same pattern).

- **Table value imports from `@reading-advantage/db`** — every migrated file imports a pgTable value (`assignmentStudents`, `licenses`, `activityType`) to drive `InferSelectModel` or as a pgEnum. This establishes the "table-as-source-of-truth" pattern that replaces Prisma's `import { License } from "@prisma/client"`.

- **Local typed const with `as const satisfies Record<...>`** — used in `student-assignment-table.tsx` to replace `Prisma.AssignmentStatus` where the Drizzle column is `text` (not a pgEnum). Preserves both runtime values and TypeScript type narrowing.

- **Drizzle helpers re-exported from `@reading-advantage/db`** — not directly used in these components, but available via the package's barrel export (`export * from "drizzle-orm"`). No component needed raw `eq`/`and`/etc. helpers since data is fetched via API routes / server actions.

## Deferred Items

**None.** All 5 target component files were migrated in this phase. No component was left with an unresolvable Prisma type.

**Future cleanup opportunities (out of scope for this phase):**

1. `types/index.d.ts` still has `import { Prisma } from "@prisma/client"` for `Prisma.JsonValue`. This is tracked for **Phase 7** (Utils & Types Migration).
2. The local `License` interface in `types/index.d.ts` (different shape, see edit-license-form note) is not affected by this phase.
3. If/when a `pgEnum("assignment_status", ...)` is added to `packages/db/src/schema/`, the local `AssignmentStatus` const in `student-assignment-table.tsx` can be deleted in favor of the Drizzle enum value.
