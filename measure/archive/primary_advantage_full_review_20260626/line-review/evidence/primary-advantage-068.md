# Line Review Evidence: primary-advantage-068

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-068
Files assigned: 8
Lines assigned: 473

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/configs/admin-page-config.ts` | 1-116 | reviewed | 1 |
| `apps/primary-advantage/configs/index-page-config.ts` | 1-26 | reviewed | 0 |
| `apps/primary-advantage/configs/settings-page-config.ts` | 1-22 | reviewed | 0 |
| `apps/primary-advantage/configs/site-config.ts` | 1-34 | reviewed | 0 |
| `apps/primary-advantage/configs/student-page-config.ts` | 1-75 | reviewed | 0 |
| `apps/primary-advantage/configs/system-page-config.ts` | 1-48 | reviewed | 0 |
| `apps/primary-advantage/configs/teacher-page-config.ts` | 1-110 | reviewed | 0 |
| `apps/primary-advantage/contexts/question-context.tsx` | 1-42 | reviewed | 0 |

## Findings

### LR-068-001 — Commented-out permission property in admin sidebar config

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/configs/admin-page-config.ts:33`
- Evidence: Line 33 contains `// hideWhenNoPermission: true,` inside the dashboard sidebar item. This property is commented out on the top-level dashboard nav entry but is active on its child items (lines 46, 53). The inconsistency suggests the top-level item was intentionally left without this flag, but it is unclear whether this is a leftover from development or a deliberate decision.
- Impact: Low impact. The dashboard nav entry will always show even if the user lacks `ADMIN_ACCESS`, though its child items correctly hide when the user lacks permissions. The route-level auth guard likely prevents actual access anyway.
- Recommendation: Document the intentional omission or remove the commented-out line if it is dead code. No immediate security risk since route-level guards enforce access.

## No-Finding Notes

- `apps/primary-advantage/configs/index-page-config.ts`: reviewed line-by-line; no findings. Pure navigation config for public-facing pages (home, about, contact, authors). No permission checks needed for public routes.
- `apps/primary-advantage/configs/settings-page-config.ts`: reviewed line-by-line; no findings. Settings sidebar with two entries (userProfile, schoolProfile). Commented-out localization section (lines 15-20) is dead code but harmless.
- `apps/primary-advantage/configs/site-config.ts`: reviewed line-by-line; no findings. Site-wide metadata (name, description, URL, OG image, nav items). URL correctly points to `https://primary.reading-advantage.com`.
- `apps/primary-advantage/configs/student-page-config.ts`: reviewed line-by-line; no findings. Student sidebar nav with proper `requiredPermissions: ["STUDENT_ACCESS"]` on all entries. Commented-out stories section (lines 34-39) is dead code.
- `apps/primary-advantage/configs/system-page-config.ts`: reviewed line-by-line; no findings. System admin sidebar with dashboard, schools, and licenses. No `requiredPermissions` on nav entries, but system-level access is controlled at the route/page level, not in nav config. Commented-out testing section (lines 42-46) is dead code.
- `apps/primary-advantage/configs/teacher-page-config.ts`: reviewed line-by-line; no findings. Teacher sidebar with proper `requiredPermissions` throughout (`CLASS_MANAGEMENT`, `TEACHER_ACCESS`, `REPORTS_ACCESS`). Multiple commented-out sections (student progress, analytics, passages, Google Classroom) are dead code.
- `apps/primary-advantage/contexts/question-context.tsx`: reviewed line-by-line; no findings. React context providing a `timer`, `setPaused`, and `setTimer` for quiz functionality. The `setTimer` in the `useEffect` dependency array (line 35) is technically unnecessary since `setState` functions from `useState` are stable references, but including it is harmless and follows exhaustive-deps lint rules.
