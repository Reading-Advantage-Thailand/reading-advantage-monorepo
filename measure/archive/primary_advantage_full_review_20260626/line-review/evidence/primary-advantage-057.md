# Line Review Evidence: primary-advantage-057

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-057
Files assigned: 2
Lines assigned: 802

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/teacher/assignments.tsx` | 1-522 | reviewed | 4 |
| `apps/primary-advantage/components/teacher/class-code-generator.tsx` | 1-280 | reviewed | 2 |

## Findings

### LR-057-001 — Fragile pathname parsing extracts classroomId from URL segments

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/assignments.tsx:318-319`
- Evidence: `const pathSegments = pathname.split("/"); const currentClassroomId = pathSegments[3];` — the classroomId is hardcoded to index 3 of the pathname. Any route structure change (e.g. adding a locale prefix segment, nesting deeper) silently breaks classroom auto-selection.
- Impact: If the route structure changes, the teacher assignments page silently fails to pre-select the classroom, requiring manual selection. This pattern likely exists in the Reading Advantage fork too.
- Recommendation: Extract classroomId from route params via `useParams()` or a typed route helper instead of manual string splitting.

### LR-057-002 — useDebounce hook defined inside component body

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/assignments.tsx:101-115`
- Evidence: The `useDebounce` function is defined inside the `Assignments` component at lines 101–115. This means a new function is created on every render. React hooks defined inline like this are technically fine (React reconciles by call order) but it is an anti-pattern that prevents reuse and creates unnecessary closures.
- Impact: Minor performance cost per render; code organization issue. Same pattern likely copied from Reading Advantage.
- Recommendation: Extract `useDebounce` to `hooks/use-debounce.ts`.

### LR-057-003 — fetchClassrooms missing error handling and response validation

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/assignments.tsx:330-335`
- Evidence: `async function fetchClassrooms() { const res = await fetch("/api/classroom"); const data = await res.json(); setClassrooms(data.classrooms); }` — no `response.ok` check, no try/catch, no validation that `data.classrooms` exists. If the API returns an error or unexpected shape, `setClassrooms(undefined)` will be called, and the classroom selector will break silently.
- Impact: Network errors or API failures cause a broken classroom dropdown with no user feedback. The teacher cannot select a classroom and therefore cannot see assignments.
- Recommendation: Add response.ok check, try/catch, and a fallback to empty array: `setClassrooms(data.classrooms ?? [])`.

### LR-057-004 — Double fetch on initial load when URL contains classroomId

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/assignments.tsx:305-336`
- Evidence: Two useEffects fire on mount. The first (lines 305–310) watches `selectedClassroom` and `debouncedSearchQuery`. The second (lines 312–336) fetches classrooms, then sets `selectedClassroom` and calls `fetchAssignments`. After the second effect sets `selectedClassroom`, the first effect fires again with the same value, causing a redundant `fetchAssignments` call.
- Impact: On initial load with a classroomId in the URL, two identical assignment API requests are made. Wastes bandwidth and may cause a brief UI flicker.
- Recommendation: Consolidate initialization into a single useEffect, or guard the first effect against firing during initial load.

### LR-057-005 — Hardcoded Tailwind color class in code generator instructions box

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/teacher/class-code-generator.tsx:227-228`
- Evidence: `className="rounded-lg bg-blue-50 p-4"` and `className="mb-2 font-medium text-blue-900"` and `className="space-y-1 text-sm text-blue-800"` — hardcoded blue palette rather than using theme CSS variables (`bg-primary/10`, `text-primary`, etc.).
- Impact: The instructions box will not respond to theme changes (light/dark mode). In dark mode, blue-50 background and blue-900 text will likely have poor contrast.
- Recommendation: Replace hardcoded blue classes with theme-aware alternatives or add dark mode variants.

### LR-057-006 — No backend adapter pattern for API calls

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/teacher/class-code-generator.tsx:51-59`
- Evidence: Both files call backend endpoints directly via `fetch()`. `assignments.tsx` calls `/api/teachers/assignments` and `/api/classroom`; `class-code-generator.tsx` calls `/api/classroom/${classroomId}/generate-code`. Per AGENTS.md, business logic should go through backend modules, but these are client components that must use fetch. The issue is that the API routes themselves may contain business logic rather than delegating to domain functions — this is a documentation concern for the route handler review, not a finding in these component files.
- Impact: The component files themselves are appropriate thin client code. The concern is architectural and should be verified when reviewing the corresponding API route files.
- Recommendation: Note for API route review batches — verify that `/api/teachers/assignments` and `/api/classroom/[id]/generate-code` delegate to backend/domain functions rather than containing inline business logic.

## No-Finding Notes

- `apps/primary-advantage/components/teacher/assignments.tsx`: Lines 1–44 (imports), 45–77 (type definitions), 79–96 (state initialization), 117–194 (column definitions), 196–213 (table configuration), 215–268 (fetchAssignments), 270–303 (handlers), 338–521 (JSX render) — all reviewed line-by-line. Types are well-defined. Column defs are standard tanstack/react-table. JSX uses i18n consistently. Pagination UI is complete. No auth bypass, no tenant scope leak, no direct DB access from client.
- `apps/primary-advantage/components/teacher/class-code-generator.tsx`: Lines 1–21 (imports), 22–46 (props and state), 48–112 (handlers), 114–160 (utility functions), 162–280 (JSX render) — all reviewed line-by-line. Clipboard API usage is appropriate. i18n used consistently. No secrets exposed. No direct DB or auth bypass.
