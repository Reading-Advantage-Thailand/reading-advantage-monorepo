# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Architecture & Design

- (2026-05-02, shared_backend_api) Domain layer must not depend on `@trpc/server`. Use standard `Error` in domain and map to `TRPCError` in routers. This keeps domain testable without tRPC context.
- (2026-05-02, shared_backend_api) Every workspace package that uses `.js` extensions in TypeScript imports must build to `dist/` and export `dist/` in `package.json`. Next.js `transpilePackages` does not reliably resolve `.js` → `.ts` for ESM workspace packages.

## Recurring Gotchas

- (2026-05-02, shared_backend_api) `AuthProvider` calling `refreshSession` on mount creates a race condition in tests. Any test rendering `useRequireAuth` must pre-seed tokens AND mock both the `auth.refresh` and `auth.session` fetch calls.
- (2026-05-02, shared_backend_api) `useRequireAuth` throws during render when `!isLoading && !isAuthenticated`. Tests must either ensure auth is established before the hook renders, or handle the throw via `expect().toThrow()` in a separate test.
- (2026-05-02, shared_backend_api) `tsup` bundles can accidentally pull React hooks into the main barrel (`dist/index.js`). Server components importing `cn` from that barrel will fail. Keep hooks in a separate subpath export (`./hooks`).

## Patterns That Worked Well

- (2026-05-02, shared_backend_api) Extracting business logic from tRPC routers into domain functions (`createAssignment`, `recordActivity`, etc.) made permission checks and tenant scoping testable in isolation.
- (2026-05-02, shared_backend_api) Using `insert(...).onConflictDoUpdate(...)` with a `uniqueIndex` on `(userId, lessonId)` provided a clean upsert pattern for `lessonProgress` without manual read-then-write.
- (2026-05-02, shared_backend_api) Adding database-level unique constraints (`classroomStudents`, `studentAssignments`, `accounts`, `verificationTokens`) prevents duplicate data at the source.

## Testing & Mocking

- (2026-05-02, review_remediation) Drizzle query-builder mocks must return **thenable objects**, not plain functions. `db.select().from().where()` returns an object that is awaited directly. If `.where()` returns a function object, `await` will not call it — it will return the function itself. Use `Object.assign(Promise.resolve(value), { limit: ..., innerJoin: ... })` for chain mocks.
- (2026-05-02, review_remediation) Cross-tenant authorization checks must be tested explicitly. `assertCan()` only checks role permissions; it does NOT verify school/class ownership. Every domain function that queries by caller-supplied ID needs an ownership guard and a corresponding cross-tenant test.

## Planning Improvements

- (2026-05-02, shared_backend_api) Fixing package exports and build outputs took ~30 min but unblocked all three apps. Always verify that workspace packages with ESM `.js` imports have proper `dist/` exports before trying to debug Next.js module resolution.
- (2026-05-02, review_remediation) When adding DB constraints in Drizzle schema, always generate a migration (`drizzle-kit generate`) in the same track. Schema-only constraints don't protect production data until the migration runs.
