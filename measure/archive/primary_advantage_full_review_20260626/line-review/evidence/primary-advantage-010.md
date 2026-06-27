# Line Review Evidence: primary-advantage-010

Reviewer: measure-jr-green/primary-advantage-010
Files assigned: 10
Lines assigned: 713

Batch scope: `apps/primary-advantage/app/[locale]/system/licenses/**`,
`apps/primary-advantage/app/[locale]/system/schools/**`,
`apps/primary-advantage/app/[locale]/system/test/**`. All system-administration
and developer test pages of the `/system` route. Cross-referenced
`apps/primary-advantage/AGENTS.md` (Drizzle-only, no Prisma, multi-tenant via
`users.schoolId`) and the matched API routes (`app/api/licenses/route.ts`,
`app/api/schools/route.ts`) for role/auth evidence.

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx` | 1-415 | reviewed | 7 |
| `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/page.tsx` | 1-32 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/system/licenses/page.tsx` | 1-14 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/system/schools/page.tsx` | 1-15 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/system/test/article-test-genarate.tsx` | 1-54 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/system/test/audio-test-word.tsx` | 1-45 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/system/test/audio-test.tsx` | 1-47 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/system/test/generate-images.tsx` | 1-38 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/system/test/page.tsx` | 1-41 | reviewed | 3 |
| `apps/primary-advantage/app/[locale]/system/test/roles-management.tsx` | 1-12 | reviewed | 1 |

## Findings

### LR-primary-advantage-010-001 — License form mutates server response with `any[]` school state and unchecked `school.licenses.length`

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:89,146`
- Evidence: Line 89 declares `useState<any[]>([])`. The fetch on line 144 returns `schoolsWithIncludes` from `app/api/schools/route.ts:117-121`, which always populates `licenses: licensesBySchoolId.get(s.id) || []`. Line 146 then narrows the filter with `data.filter((school: any) => !school.licenses.length)`. The `school` parameter is widened to `any` despite a fully typed API response; if the server is later changed to omit `licenses` (the route comment at line 113-116 acknowledges `_count` is `0` placeholder), this filter throws on `undefined.length`. The Drizzle migration in `apps/primary-advantage/AGENTS.md:21-54` requires `InferSelectModel<typeof schools>` propagation end-to-end, and `any[]` silently defeats that.
- Impact: A server-side shape change silently breaks the create-license school dropdown, leaving the admin with no school option and the form submitting `schoolId: null` (line 105). Multi-tenant drift also propagates: `licenses.schoolId` joins (line 96-105 of `/api/schools/route.ts`) assume the nested shape, and removing it without updating the form yields an empty list.
- Recommendation: Type the local state as `InferSelectModel<typeof schools> & { licenses: Array<{ ... }> }`, derive from a shared Zod schema, and assert `Array.isArray(school.licenses)` before reading `.length`.

### LR-primary-advantage-010-002 — Create-license POST has no auth header, CSRF token, or client-side role check

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:96-107`
- Evidence: Lines 96-107 issue `fetch("/api/licenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(...) })`. There is no `Authorization` header, no `credentials: "include"` override, no CSRF token in the body, and no `schoolId` server-side derivation (line 105 accepts `data.schoolId || null` directly from the form). The component is `"use client"` (line 1) and never calls `currentUser()` / `requireRole()` before posting. The server route `app/api/licenses/route.ts` (referenced by line 24, 99, 187) is the only place role enforcement happens, so the form silently relies on it; if the route is bypassed by a refactor (or if a future route handler forgets the check), the form will still submit.
- Impact: License creation is a destructive billing action (creates a `licenses` row plus a key shown to the admin at line 128). Without a client-side role gate or CSRF token, a logged-in non-system user with a CSRF-vulnerable browser could submit the form. The Reading Advantage equivalent renders the page inside a role-gated layout, but the primary-advantage form does not even check `currentUser.role` before issuing the request.
- Recommendation: Either (a) convert this into a Server Action wrapped in `requireRole("SYSTEM")` from `@/lib/session`, or (b) read the current session via a `useSession()` hook and short-circuit render if not `SYSTEM`. Add a CSRF token derived from the session and include it in the POST body.

### LR-primary-advantage-010-003 — Double `<FormControl>` nesting inside `Select` wrappers

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:182-202,216-230,269-283,371-385`
- Evidence: The `schoolId` Select (lines 182-202) wraps `<SelectTrigger>` inside `<FormControl>` (line 186) which is itself inside another `<FormControl>` (line 181). Same double-wrap in the `subscriptionType` (lines 220, 225), `status` (lines 273, 278), and `expiryDays` (lines 371, 376) Selects. The shadcn/ui `Select` component already renders its own trigger; the outer `FormControl` is the one meant to be inside `FormItem`, but here there are two nested controls in the JSX tree.
- Impact: React-hook-form's `FormField` still works, but the double `FormControl` adds an extra `<Slot>` / `div` and can trigger `aria-describedby` duplication warnings in some React versions. More importantly, the outer `FormControl` is the one returned by the `FormItem` context, while the inner `FormControl` is a child component — there is no functional purpose for the inner one.
- Recommendation: Remove the outer `<FormControl>` (line 181 for `schoolId`, line 220 for `subscriptionType`, line 273 for `status`, line 371 for `expiryDays`) and let the inner `<FormControl>` directly wrap `<SelectTrigger>`. Match the pattern used in `components/auth/student-signin-form.tsx` (referenced in batch 027).

### LR-primary-advantage-010-004 — Description field defined in Zod schema but rendered FormField is fully commented out

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:47-52,291-311`
- Evidence: Lines 47-52 add `description: z.string().max(500).optional()` to `FormSchema`. Lines 291-311 contain the matching `FormField` block, but every line is inside a `{/* ... */}` comment (line 291 opens, line 311 closes). The `form.reset` on lines 116-124 also resets `description: ""`, so the schema and runtime state know about the field, but the user can never enter a value. The toast on line 128 even shows the license name, never the description.
- Impact: The schema accepts a description but the UI discards it; a future code path that submits `description` to the server (line 102 spreads `...data`) will silently send `""` (or `undefined`). The `/api/licenses` route (referenced by line 24, 99, 187) probably stores the description, so the data round-trip is broken.
- Recommendation: Either delete the `description` field from the schema (lines 47-52) and the `form.reset` value, or restore the `FormField` JSX (lines 291-311) so users can enter a description.

### LR-primary-advantage-010-005 — form.reset post-submit sets `subscriptionType: "basic"` but defaultValues on mount does not set it

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:79-86,116-124`
- Evidence: `defaultValues` (lines 79-86) declares `name`, `description`, `maxUsers`, `startDate`, `status`, `schoolId` but omits `subscriptionType`. The schema (line 70) requires it. After a successful submit, `form.reset` (lines 116-124) does include `subscriptionType: "basic"`. The `useForm` hook (line 77) is typed `z.infer<typeof FormSchema>`, so on first render `subscriptionType` is `undefined`, which then triggers `react-hook-form` to leave the `Select` placeholder unselected until the user clicks.
- Impact: On initial page load, the "Subscription Type" Select displays the placeholder text (line 222) instead of "Basic", and the `defaultValue={field.value}` (line 218) is `undefined`. If the user submits without explicitly selecting a value, Zod fails validation with `required_error: "Please select a subscription type."` (line 71). The bug only manifests on first load; after a successful submit-and-reset, the field is correctly set.
- Recommendation: Add `subscriptionType: "basic"` to the initial `defaultValues` (around line 86) so the Select renders with a chosen value on first load.

### LR-primary-advantage-010-006 — Schools fetch effect swallows non-OK responses and silently keeps empty state

- Severity: Low
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:142-150`
- Evidence: `useEffect` (lines 142-150) calls `fetch("/api/schools")` and immediately `await response.json()` (line 145) without checking `response.ok`. If the user is not a system admin, `/api/schools/route.ts:80-87` returns HTTP 403 with a JSON body `{ error: "Forbidden..." }` — the code then runs `data.filter((school: any) => ...)` on that error object. `school.licenses` is `undefined`, so `.length` throws on line 146, the effect silently fails (React swallows it), and `schools` stays `[]`. The Select renders only the placeholder (line 188) and the admin cannot proceed.
- Impact: For a non-system-admin user who somehow reaches this route (the page is mounted behind the `/system` layout only, but the form itself has no guard), there is no toast, no error message, and the form's submit call (line 96) then sends `schoolId: null` to `/api/licenses`. The user never learns why the dropdown is empty.
- Recommendation: Check `response.ok` on line 145, throw on failure, and surface a `toast.error` from a `try/catch` around the filter. Alternatively, render the form only after a `currentUser.role === "SYSTEM"` check.

### LR-primary-advantage-010-007 — `useState<any[]>` for schools widens the public surface used to drive license creation

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:89,143,146,195`
- Evidence: `const [schools, setSchools] = useState<any[]>([])` (line 89) and `const fetchSchools = async () => { ... setSchools(schools); }` (line 147). The map on lines 195-199 then reads `school.id` and `school.name` from `any`. The Drizzle migration guide in `apps/primary-advantage/AGENTS.md:43-54` prescribes `InferSelectModel<typeof schools>` for typed rows; this file widens back to `any` immediately at the storage boundary.
- Impact: When `/api/schools/route.ts:117-121` adds new fields (e.g., a real `_count` replacing the placeholder at line 119), TypeScript will not catch a typo at the call site. A future rename of `school.name` to `school.displayName` silently breaks the dropdown, and ESLint `no-explicit-any` cannot flag it because the source annotation is already `any[]`.
- Recommendation: Define `type SchoolOption = InferSelectModel<typeof schools> & { licenses: Array<{ name: string; status: string }> }` and use `useState<SchoolOption[]>([])` on line 89.

### LR-primary-advantage-010-008 — `SchoolsPage` renders no school list, only a header and a "Create" dialog trigger

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/schools/page.tsx:1-15`
- Evidence: `SchoolsPage` returns a `<div>` (line 8) containing `<Header heading="Schools" text="Manage schools in the system">` (line 9) with `<CreateSchoolDialog />` as a child (line 10) and a `<Separator />` (line 12). There is no `<SchoolsTable />`, no list of existing schools, no edit/delete actions. The `apps/primary-advantage/components/system/` directory contains `license-table.tsx` and `edit-license-form.tsx` (verified by `ls`), but no `schools-table.tsx`. The component `create-school-dialog.tsx` only opens a creation modal — there is no place to view or edit existing schools.
- Impact: A system admin landing on `/en/system/schools` sees a header, a "Create School" button, and an empty page. They cannot list, search, edit, or delete existing schools. To list schools they must call `/api/schools` directly. The Reading Advantage equivalent (`apps/reading-advantage/app/[locale]/system/schools/page.tsx`, not in this batch) renders a table; the primary-advantage variant regresses by removing the list view.
- Recommendation: Render `<SchoolsTable schools={...} />` after the `<Separator />` on line 12, where the server component fetches `db.select().from(schools)` and passes rows down. Add a `schools-table.tsx` component under `apps/primary-advantage/components/system/` mirroring `license-table.tsx`.

### LR-primary-advantage-010-009 — `RolesManagement` page renders only a Header and a Separator, no role-management UI

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/test/roles-management.tsx:1-12`
- Evidence: The component (lines 5-11) returns `<div><Header heading="Roles Management" text="Manage roles for users" /><Separator className="my-4" /></div>`. There is no form, no list, no fetch, no edit. The matching API routes for role management (`app/api/auth/impersonate/route.ts`, `app/api/debug/init-roles/route.ts`) are not invoked from this page. The page is also nested under `app/[locale]/system/test/roles-management.tsx`, meaning it is served from `/en/system/test/roles-management`, a route whose layout (`app/[locale]/system/layout.tsx`) does no role gating of its own.
- Impact: A system admin clicking a "Roles Management" link from `/system/test` sees a blank page. There is no way to assign roles to users from the UI; the only role-management path is `app/api/debug/init-roles/route.ts` (a debug endpoint). This is a fork-specific regression — the equivalent Reading Advantage page lists and edits user roles.
- Recommendation: Render a `<UserRolesTable />` component fetching `db.select().from(userRoles)` (or equivalent) with a role-edit dialog. Add an explicit `requireRole("SYSTEM")` check at the top of the server component, or convert the page to a Server Action that enforces the check.

### LR-primary-advantage-010-010 — `/system/test/page.tsx` mixes Server Actions inside a Server Component `onClick` handler

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/test/page.tsx:12-41`
- Evidence: `TestFunctionality` (line 12) is declared `export default async function` (a Server Component). Lines 18-26 render `<Button onClick={async () => { "use server"; const result = await testConnection(); console.log(result); }}>Test Storage</Button>`. Lines 29-36 do the same with `await deleteAllArticles()`. In Next.js 15+/16 App Router, Server Actions cannot be invoked from a Server Component `onClick` — `onClick` is a client-side event and the Server Action directive only works inside a Client Component or as a `form action`. The page also passes `<UploadTest />` and `<GenerateImages />` (lines 37-38) which are themselves `"use client"` (verified in batch files).
- Impact: The "Test Storage" and "Delete All Articles" buttons render but clicking them does nothing — the inline arrow function is a client closure on a Server Component, so React strips the handler. `deleteAllArticles` (defined in `actions/test.ts:55-104`) silently never runs; the destructive "Delete All Articles" button is a no-op that the admin may rely on. This is a fork-specific regression because the Reading Advantage `/system/test` page (different file) uses Client Components for these buttons.
- Recommendation: Move the two destructive buttons into a Client Component (`"use client"`) and import `testConnection` and `deleteAllArticles` as Server Actions. Alternative: wrap each button in a `<form action={serverAction}>` and remove the `onClick`.

### LR-primary-advantage-010-011 — `article-test-genarate.tsx` indexes `result[0].error` without null guard; debug log left in handler

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/test/article-test-genarate.tsx:13-32`
- Evidence: Line 16 reads `result[0].error` directly, where `result` is the return value of `generateArticle(amount)`. `actions/article.ts:25-28` returns `await generateAllArticle(amountPerGenre)` which is defined in `server/controllers/articleController` (outside this batch) and may return an empty array. Line 26 has `console.log("generate new")` — a debug log left in the production handler.
- Impact: If the controller returns `[]` (no articles generated), `result[0]` is `undefined` and `result[0].error` throws `TypeError: Cannot read properties of undefined (reading 'error')`. The toast does not render and the admin sees a console error. The `console.log` line is harmless but pollutes the admin's console.
- Recommendation: Guard with `if (!result?.[0]?.error) { toast.success(...); } else { toast.error(result[0].error); }`. Remove the `console.log("generate new")` on line 26.

### LR-primary-advantage-010-012 — All three test buttons (audio-test, audio-test-word, generate-images) have unlabeled inputs

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/system/test/audio-test-word.tsx:33-37, audio-test.tsx:35-39, generate-images.tsx:14-20`
- Evidence: All three Client Components render `<Input type="text" value={articleId} onChange={...} />` without `<label htmlFor>`, `aria-label`, `id`, or visible placeholder text. `audio-test.tsx:35-39` and `audio-test-word.tsx:33-37` have neither a label nor a placeholder. `generate-images.tsx:14-20` has `id="articleId"` and `placeholder="Enter article ID"` (line 19) but no `<label>` for that id.
- Impact: These are internal admin tools, not primary-student-facing, so the accessibility risk is moderate. Still, screen readers announce the input as "Edit text" with no context, and admin users relying on keyboard navigation have no hint about what to type. This is an intentional divergence that needs documentation: Reading Advantage uses labelled inputs in the equivalent admin tools.
- Recommendation: Add `<label htmlFor="articleId">Article ID</label>` (or `aria-label="Article ID"`) above each Input, or wrap them in a `<FieldGroup>` with visible labels.

### LR-primary-advantage-010-013 — `audio-test.tsx` and `audio-test-word.tsx` silently drop error details from server actions

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/system/test/audio-test.tsx:14-26, audio-test-word.tsx:14-24`
- Evidence: Both files follow the same pattern: `generateAudios(articleId).then((res) => { if (res.success) { toast.success("Audio generated successfully"); } else { toast.error("Failed to generate audio"); } })`. `actions/test.ts:14-28` (`generateAudios`) and `actions/test.ts:30-41` (`generateWordAudios`) return `{ success: true }` on success or `{ error: true }` on failure — no error message string. The component toast on line 22 (`audio-test.tsx`) and line 21 (`audio-test-word.tsx`) hardcodes "Failed to generate audio" regardless of the underlying error.
- Impact: A system admin clicking "Generate Audio" sees the same toast for every kind of failure (missing article, quota exceeded, audio-generator exception). They cannot triage without opening the server console. The audio-generator (`server/utils/genaretors/audio-generator.ts`, verified by `ls`) may throw specific messages that are useful for debugging.
- Recommendation: Change the server action return type to `{ success: true } | { error: true; message: string }` and surface the message in the toast (e.g., `toast.error(res.message || "Failed to generate audio")`).

### LR-primary-advantage-010-014 — `test/page.tsx` has dead commented-out `FlashcardGame` import block

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/system/test/page.tsx:8-9`
- Evidence: Lines 8-9 are commented-out imports for `FlashcardGame` and `FlashcardType`. The comments are JSX-style `//` so they don't show up as TypeScript errors, but the same comments appear in `audio-test.tsx:9-10` (verified by reading the file). This is leftover from a flashcard-game testing surface that was never wired up.
- Impact: Bundle weight is unaffected (the imports are commented out), but the dead comments confuse future maintainers who expect the test page to exercise flashcards. The component `components/flashcards/flashcard-game.tsx` exists (verified in batch 031) but is not tested from `/system/test`.
- Recommendation: Either remove the comments or add `<FlashcardGame />` to the rendered grid on line 14 as an additional test card.

### LR-primary-advantage-010-015 — `generate-images.tsx` validates `articleId` only via empty-string truthiness, no client-side Zod

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/system/test/generate-images.tsx:9-38`
- Evidence: `const [articleId, setArticleId] = useState("")` (line 10) and the click handler on lines 23-32 calls `await generateImages(articleId)` unconditionally. `actions/test.ts:106-132` then does `db.select(...).where(eq(articles.id, articleId)).limit(1)`, returning `article === undefined`, then calls `generateImage({ imageDesc: article?.imageDescription as string[] as string, ... })`. The server tolerates `undefined` by passing `undefined` through.
- Impact: Submitting with an empty `articleId` produces a meaningless image-generator call that will throw inside `image-generator.ts` (referenced via `actions/test.ts:12`), and the toast surfaces the failure but not the root cause. The user is left guessing whether they typed the wrong id or hit a backend bug.
- Recommendation: Add a `disabled={!articleId.trim()}` prop on the Generate Images button (line 22), or call `toast.error("Please enter an article ID")` before invoking the action. This is an intentional divergence from the audio test variants, which accept any string; documenting it is enough.

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/page.tsx`: reviewed line-by-line; thin Server Component that composes `Header`, `Separator`, `Link`/`Button` (Back to Licenses), and `CreateLicenseForm`. No auth check, but the page is mounted behind `/system` layout whose role gate is the next layer up. No DB calls, no dead imports, no inline logic.
- `apps/primary-advantage/app/[locale]/system/licenses/page.tsx`: reviewed line-by-line; trivial Server Component that renders `Header`, `Separator`, and `LicenseTable` from `@/components/system/license-table`. The actual table and edit flows live in the imported component (verified by `ls components/system/`).
- `apps/primary-advantage/app/[locale]/system/test/audio-test-word.tsx`: reviewed line-by-line for the unlabeled-input finding (LR-010-012) and error-dropping finding (LR-010-013). Other lines are scaffold/imports consistent with the audio-test.tsx sibling file.
- `apps/primary-advantage/app/[locale]/system/test/audio-test.tsx`: reviewed line-by-line; two commented imports on lines 9-10 (LR-010-014 mirrors from this file). No additional findings beyond the labelled-input and error-dropping patterns already recorded.
