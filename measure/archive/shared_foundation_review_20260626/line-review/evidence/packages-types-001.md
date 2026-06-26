# Line Review Evidence: packages-types-001

Reviewer: Measure Review C (UX and API end-to-end contract)
Files assigned: 6
Lines assigned: 805

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/types/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/types/package.json | 1-28 | reviewed | 0 |
| packages/types/src/codecamp.ts | 1-406 | reviewed | 2 |
| packages/types/src/contracts/class.ts | 1-82 | reviewed | 0 |
| packages/types/src/index.ts | 1-277 | reviewed | 1 |
| packages/types/tsconfig.json | 1-9 | reviewed | 0 |

## Findings

### LR-packages-types-001-001 — Inconsistent role enum across schemas

- Severity: Medium
- File: `packages/types/src/index.ts:9` and `packages/types/src/index.ts:228`
- Evidence: `userResponseSchema` (line 9) defines `role` as `z.enum(["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM"])` (5 values). `sessionResponseSchema` (line 228) defines `role` as `z.enum(["INTERN", "STUDENT", "USER", "TEACHER", "ADMIN", "SYSTEM", "SALES_REP", "SALES_ADMIN"])` (8 values). The session schema includes `"USER"`, `"SALES_REP"`, and `"SALES_ADMIN"` which are absent from `userResponseSchema`.
- Impact: A valid session with role `"SALES_REP"` or `"SALES_ADMIN"` cannot be passed through `userResponseSchema` without runtime validation failure. Downstream consumers that rely on `UserResponse.role` will reject roles that the session layer legitimately issues. This creates a contract mismatch between the auth layer and the user-response layer.
- Recommendation: Align the role enum across both schemas to the superset used in `sessionResponseSchema`, or define a shared `RoleEnum` constant and reference it in both schemas.

### LR-packages-types-001-002 — Loose string types for phase and status in codecamp schemas

- Severity: Low
- File: `packages/types/src/codecamp.ts:11-12`
- Evidence: `moduleResponseSchema` defines `phase: z.string()` and `status: z.string()`. These accept any arbitrary string value, whereas the codecamp domain uses a constrained set of phases (e.g., `z.enum(["A", "B", "C", "D"])` on line 326) and statuses. The `internAccountResponseSchema` (line 369) similarly uses `role: z.string()` rather than a constrained enum.
- Impact: Runtime validation does not reject invalid phase/status/role values. Consumers must manually validate these strings downstream, increasing the surface for invalid data propagation.
- Recommendation: Replace `z.string()` with `z.enum([...])` for `phase`, `status`, and `role` fields where the set of valid values is known and fixed.

### LR-packages-types-001-003 — Two divergent createClassSchema definitions

- Severity: Low
- File: `packages/types/src/index.ts:21` and `packages/types/src/contracts/class.ts:35`
- Evidence: `index.ts:21` defines `createClassSchema` with only `{ name: z.string().min(1).max(100) }`. `contracts/class.ts:35` defines a different `createClassSchema` with `{ name, gradeLevel, standardsAlignment }`. The latter is re-exported as `scienceCreateClassSchema` (line 269).
- Impact: The two schemas serve different products (reading-advantage vs. science-advantage) but share the same export name within the package. This is handled by the aliasing on re-export, but internal imports of `createClassSchema` from the barrel `index.ts` resolve to the simpler schema, which could confuse consumers expecting the richer science version.
- Recommendation: No immediate action required — the aliasing pattern is intentional. Document the distinction in JSDoc or move reading-advantage-specific schemas into a `contracts/reading.ts` module for symmetry.

## No-Finding Notes

- `packages/types/eslint.config.mjs`: reviewed line-by-line; no findings.
- `packages/types/package.json`: reviewed line-by-line; no findings. Exports map correctly references `./dist/index.d.ts` and `./dist/contracts/class.d.ts`. Dependencies are minimal and appropriate.
- `packages/types/src/contracts/class.ts`: reviewed line-by-line; no findings. Join code validation uses a well-defined charset excluding ambiguous characters (I, O, 0, 1). Form schema correctly uses `z.coerce` for numeric field coercion.
- `packages/types/tsconfig.json`: reviewed line-by-line; no findings. Correctly extends base config with appropriate outDir/rootDir.
