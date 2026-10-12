# Plan review — primary_parity_school_management_20261011

## Phase D: Design (review of `git diff dda0af73e..HEAD`)

Scope: documents only (behavior contract, reference SQL, design index, spec defaults, plan marks). No code, no test, no locale key changed.
Plan compliance: done. Critical: none. High: none.

Medium:

- M1. Seat usage has a shared owner. `packages/domain/src/licenses/usage.ts` comes from lane A (admin dashboard). Phase S4 must merge integration first and reuse it. If the file is missing at that time, build it as the admin dashboard FR-7 says.
- M2. The `licenses` table has two end dates (`expires_at`, `expiry_date`). The contract and SQL use `expiry_date` (the column that the school profile card reads). Phase S4 must confirm that `usage.ts` uses the same column.
- M3. The rehearsal copy has a school with 417 students and no license. The view shows "No active license" for it (design default). Acceptance AC-4 must pick a school with an active license.

Low:

- L1. The `licenses.school_id` column is nullable in the copy; the view reads licenses of the session school only.
- L2. Design clips: the "Choose file" label wraps at 375 px; a pinned `Panel` pin clips at a dialog edge (see `design/captures.md`).
- L3. Reference SQL L3 joins `classrooms` on `school_id`; a student in a class of another school would show no class name. This is the wanted behavior.

Shortcuts and lessons for the orchestrator: none for the shared files. The harness of the admin dashboard design is reusable: copy, change `ROOT`, and write new `page.tsx` and `render.tsx`.
