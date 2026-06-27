# Line Review Evidence: primary-advantage-054

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-054
Files assigned: 3
Lines assigned: 1007

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/system/edit-license-form.tsx` | 1-430 | reviewed | 3 |
| `apps/primary-advantage/components/system/license-table.tsx` | 1-485 | reviewed | 3 |
| `apps/primary-advantage/components/teacher/assign-button.tsx` | 1-92 | reviewed | 2 |

## Findings

### LR-primary-advantage-054-001 — License edit posts via `fetch` to a route handler instead of a Server Action

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/system/edit-license-form.tsx:128-170`
- Evidence: `onSubmit` (line 128) issues `await fetch(\`/api/licenses/${license.id}\`, { method: "PUT", ... })` on lines 133-144, hand-serializes the body (lines 138-143), and parses `await response.json()` on lines 147/151. The backing handler is `apps/primary-advantage/app/api/licenses/[id]/route.ts:69-170`. The root `AGENTS.md` "Route Handlers vs API Services" / "Backend Function Pattern" sections direct UI-driven App Router mutations through Server Actions (CSRF protection, revalidation, server-only invocation) rather than a `"use client"` component (line 1) calling a JSON route handler. This is the same fork-wide transport pattern already flagged in `LR-primary-advantage-009-001`, so it is a fork-specific regression, not an isolated mistake.
- Impact: Duplicates transport surface (fetch + JSON contract) for a mutation that should run as a Server Action; forfeits built-in CSRF/revalidation, and couples the client to the route's ad-hoc error shape (`errorData.error`, line 148). Brittle to any change in the handler's response envelope.
- Recommendation: Introduce a colocated Server Action (e.g. `apps/primary-advantage/actions/update-license.ts`) that reuses the same validation/update logic and call it from `onSubmit`. Keep the route handler for external clients during migration, but retire it for the UI.

### LR-primary-advantage-054-002 — School fetch effect uses untyped `any[]` state and a stale/empty dependency array

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/system/edit-license-form.tsx:99,172-189`
- Evidence: `useState<any[]>([])` on line 99 erases all typing for the school list, defeating the Drizzle-inferred typing the rest of the file adopts (`InferSelectModel<typeof licenses>`, line 46). The `useEffect` (lines 172-189) reads `license.schoolId` inside its filter (line 180) but declares an empty dependency array (line 189), so it never re-runs if `license` changes and trips `react-hooks/exhaustive-deps`. The school filter `(school: any) => !school.licenses.length || school.id === license.schoolId` (lines 178-181) also depends on the `/api/schools` route returning a `licenses` array (`app/api/schools/route.ts:120`), an implicit contract not expressed by any shared type.
- Impact: Untyped `any[]` hides shape drift if the `/api/schools` payload changes (the route stitches `_count`/`licenses` placeholders at lines 117-121). The empty deps array makes the dialog's school list stale across re-renders with a different `license` prop, which can show the wrong "current school" exception in the dropdown.
- Recommendation: Type the state from a shared school-summary type, add `license.schoolId` (or `license`) to the dependency array, and validate the `/api/schools` payload with a Zod schema at the boundary.

### LR-primary-advantage-054-003 — License edit form lets role `ADMIN` reassign `schoolId` across tenants with no tenant scoping

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/system/edit-license-form.tsx:81,142,238-274`
- Evidence: The form exposes a free School `<Select>` (lines 238-274) whose chosen `schoolId` is sent verbatim in the PUT body (line 142, schema line 81 `schoolId: z.string().optional()`). The backing `PUT /api/licenses/[id]` authorizes both `ADMIN` and `SYSTEM` (`app/api/licenses/[id]/route.ts:80-82`) and writes `schoolId` directly (`route.ts:119`) with no check that the actor administers either the source or target school. The school list is sourced from `GET /api/schools`, which is `SYSTEM`-only (`app/api/schools/route.ts:80-86`), so for an `ADMIN` the dropdown will be empty — yet the PUT contract still accepts any `schoolId` the client supplies. The root `AGENTS.md` multi-tenancy rule requires every tenant-bound mutation to verify the actor's access to the tenant and to never trust frontend tenant IDs. This license-admin surface was inherited from Reading Advantage's global-license model, so the missing per-tenant authorization is a shared root cause rather than a fork-only defect.
- Impact: An `ADMIN` (not just `SYSTEM`) can reassign a license to an arbitrary `schoolId`, moving seat entitlements between tenants. Because the school list is empty for `ADMIN` the UI hides the capability, but the JSON contract remains exploitable, which is exactly the "do not trust frontend tenant IDs" failure mode.
- Recommendation: Align the authorization on the license CRUD endpoints (restrict `schoolId` mutation to `SYSTEM`, or scope `ADMIN` to their own `school`), and validate that the target `schoolId` is within the actor's tenant before persisting. Mirror the fix in the Reading Advantage source so the shared flow stays consistent.

### LR-primary-advantage-054-004 — Local `licenses` state shadows the imported Drizzle `licenses` table symbol

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/system/license-table.tsx:48,76,93`
- Evidence: Line 48 imports the Drizzle table `import { licenses } from "@reading-advantage/db";`, used at line 76 for `type License = InferSelectModel<typeof licenses>`. Inside the component, line 93 declares `const [licenses, setLicenses] = React.useState<LicenseWithSchool[]>([])`, shadowing the imported table identifier for the entire component body. This shadowing was introduced when the file gained the Drizzle table import during `primary_advantage_drizzle_migration_20260526`; the same identifier now means two different things at module vs component scope.
- Impact: The shadowing is a latent foot-gun: any in-component reference intended for the table type/value would silently resolve to the React state array, and future edits that move type usage into the component would break confusingly. It also defeats `build-graph`/linters that track symbol usage.
- Recommendation: Alias the imported table (e.g. `import { licenses as licensesTable } from "@reading-advantage/db"`) or rename the state to `licenseRows`, so the table symbol and the component state are unambiguous.

### LR-primary-advantage-054-005 — `fetchLicenses` logic is duplicated inline inside the edit `onSuccess` callback

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/system/license-table.tsx:105-122,284-298`
- Evidence: The mount effect defines a `fetchLicenses` closure (lines 105-122) that GETs `/api/licenses` and calls `setLicenses(data)`. The `EditLicenseForm` `onSuccess` handler re-implements the identical closure verbatim (lines 284-298), including the same try/catch/finally and `console.error("Failed to fetch licenses:", error)` string. The delete path (lines 347-375) instead mutates state locally, so refresh behavior is inconsistent across actions.
- Impact: Two copies of the same fetch routine drift independently; a future change to pagination/filtering or the licenses contract must be applied in two places, and the inconsistent refresh strategy (refetch on edit, local filter on delete) makes the table state harder to reason about.
- Recommendation: Hoist a single `fetchLicenses` (or a `useLicenses` hook) and reuse it from the effect, the edit-success handler, and the delete handler.

### LR-primary-advantage-054-006 — "Copy License" copies the raw license key even though the key column is intentionally hidden

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/system/license-table.tsx:142-148,236-241`
- Evidence: The "License Key" column is commented out (lines 142-148) — an intentional choice to keep raw keys off the visible table. However the row action menu still offers "Copy License" which calls `copyToClipboardWithMeta(payment.key)` (lines 236-241), placing the raw `key` onto the clipboard. The two decisions contradict: the key is hidden visually but freely copyable, and there is no comment explaining the intended exposure boundary.
- Impact: For a primary-student platform the license key is a sensitive provisioning secret; hiding it from the table while leaving a one-click clipboard copy is an undocumented exposure decision that a reviewer cannot tell is deliberate. Clipboard contents can leak to other apps/extensions.
- Recommendation: Document the intended exposure policy (key hidden, copy allowed for admins) in code, and gate/copy through a deliberate confirm step, or remove the copy action if keys are meant to stay hidden. Confirm parity with the Reading Advantage source's handling.

### LR-primary-advantage-054-007 — Assignment success toast is hardcoded English, bypassing the component's own i18n

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/assign-button.tsx:37-42`
- Evidence: The component wires next-intl translations (`useTranslations("Assignment")` and `useTranslations("Components")`, lines 28-29) and uses them for the title, description, and every button label (lines 53, 61-62, 76, 82, 85). But `onSave` (lines 37-42) shows `toast.success("Assignment saved successfully!", { richColors: true })` with a hardcoded English string. The user-facing confirmation is therefore untranslated while the surrounding dialog is localized.
- Impact: Primary-student/teacher locales (this app uses next-intl with multiple locales) will see a mixed-language UI on the success path — the dialog localizes but the confirmation does not. For a primary-education product serving non-English classrooms this is an adaptation/accessibility gap, not just cosmetic.
- Recommendation: Replace the literal with a translation key (e.g. `t("savedToast")` or `tComponents("...")`) and add the string to the message catalogs for all supported locales.

### LR-primary-advantage-054-008 — `article` prop typed by a lowercase, non-exported interface that shadows domain naming

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assign-button.tsx:18-24`
- Evidence: Lines 18-22 declare `interface article { title: string; summary: string; id: string }` with a lowercase type name, then line 24 types the prop as `{ article }: { article: article }`, where the value name and type name are the same lowercase token. This diverges from the TypeScript convention (PascalCase types) used elsewhere in the fork and provides only an ad-hoc local shape instead of reusing a shared article type from `@reading-advantage/db`/types.
- Impact: The lowercase interface and value/type name collision hurt readability and `build-graph` symbol resolution, and the bespoke `{ title, summary, id }` shape will silently diverge from the canonical article type if the schema changes.
- Recommendation: Rename to `Article`-style PascalCase (or reuse a shared `ArticleSummary` type) and derive the prop shape from the canonical schema type.

## No-Finding Notes

- None — all three assigned files have at least one finding above; every line (1-430, 1-485, 1-92) was read in full.
