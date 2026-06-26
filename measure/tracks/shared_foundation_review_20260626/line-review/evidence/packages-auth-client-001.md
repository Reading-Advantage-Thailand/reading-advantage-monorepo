# Line Review Evidence: packages-auth-client-001

Reviewer: Measure Review B (security and data handling)
Files assigned: 10
Lines assigned: 946

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/auth-client/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/auth-client/package.json | 1-42 | reviewed | 0 |
| packages/auth-client/src/__tests__/auth-security-phase1-contracts.test.ts | 1-226 | reviewed | 0 |
| packages/auth-client/src/__tests__/hooks.test.tsx | 1-439 | reviewed | 0 |
| packages/auth-client/src/context.ts | 1-42 | reviewed | 0 |
| packages/auth-client/src/index.ts | 1-42 | reviewed | 0 |
| packages/auth-client/src/provider.tsx | 1-120 | reviewed | 1 |
| packages/auth-client/tsconfig.json | 1-10 | reviewed | 0 |
| packages/auth-client/tsup.config.ts | 1-13 | reviewed | 0 |
| packages/auth-client/vitest.config.ts | 1-9 | reviewed | 0 |

## Findings

### LR-packages-auth-client-001-001 — Login error message echoes server response verbatim (user enumeration)

- Severity: Medium
- File: `packages/auth-client/src/provider.tsx:71-72`
- Evidence: The `login` function's error path does:
  ```ts
  const err = await res.json().catch(() => ({ message: "Login failed" }));
  throw new Error(err.message ?? "Login failed");
  ```
  If the server's `/api/auth/login` endpoint returns distinguishing error messages for
  different failure modes (e.g., `"User not found"` vs `"Invalid password"`), the
  client propagates the distinction to the caller, which enables username enumeration.
  FR-4 of the auth security hardening track added a timing oracle defense on the
  server side, but the client remains an amplification point — a compromised or
  misconfigured server that leaks distinguishing messages would be echoed directly.
- Impact: Username enumeration through the client. Attackers can probe the login
  endpoint and read the error message to determine whether a username exists. The
  server-side defense (FR-4 timing oracle) mitigates this in the normal case, but
  defense-in-depth should also sanitize on the client.
- Recommendation: Replace the verbatim `err.message` propagation with a constant
  generic string (`"Invalid username or password"`) regardless of the server response.
  The server is responsible for returning a safe message; the client should not trust
  that it does. If distinguishing information is needed for debugging, log it to the
  console but never expose it through the thrown Error.

### A2 check (consent-blind publish gate)

Not applicable. The `packages/auth-client` package is a React client library providing
auth hooks and a context provider. It has no draft→published state transitions, no named
subjects, and no consent artifact workflow. No A2 findings.

### A6 check (registry overstatement)

Verified. The `measure/tracks.md` entry for auth-security hardening (line 387–390)
documents FR-12 through FR-16 as addressed. The adversarial tests in
`auth-security-phase1-contracts.test.ts` and `hooks.test.tsx` confirm:
- FR-13 (mount-session-check race): `authActionCompletedRef` guard present in
  `provider.tsx:23-24,77,106`
- FR-14 (logout failure): state cleared before server call, error thrown on failure
  `provider.tsx:89-102`
- FR-15 (state derivation): `isAuthenticated: !!sessionUser` derived from user, not
  session object `provider.tsx:41-42`
- FR-16 (register removal): `register` absent from `AuthActions` interface
  `context.ts:22-25`, absent from barrel `index.ts`
All four adversarial tests in the contract test file are green (they assert the
negative — that the old patterns no longer appear). No registry overstatement detected.

## No-Finding Notes

- `packages/auth-client/eslint.config.mjs`: reviewed line-by-line; no findings.
- `packages/auth-client/package.json`: reviewed line-by-line; no findings. Dependency
  manifest is clean — `zod` removed, `react` is peer+dev only, `@reading-advantage/types`
  is the sole runtime dependency.
- `packages/auth-client/tsconfig.json`: reviewed line-by-line; no findings. Extends
  shared base config, standard JSX configuration.
- `packages/auth-client/tsup.config.ts`: reviewed line-by-line; no findings. Build
  config correctly emits `"use client"` banner for RSC boundaries.
- `packages/auth-client/vitest.config.ts`: reviewed line-by-line; no findings. jsdom
  environment with globals enabled, standard test setup.
- `packages/auth-client/src/__tests__/auth-security-phase1-contracts.test.ts`: reviewed
  line-by-line; no findings. Static file-shape contract tests asserting FR-16 (register
  removal), package.json dependency hygiene, and `"use client"` directive preservation.
  All assertions are regex/JSON checks on file contents — no runtime side effects.
- `packages/auth-client/src/__tests__/hooks.test.tsx`: reviewed line-by-line; no findings.
  Comprehensive tests for useAuth, useSession, useRequireAuth hooks. Covers FR-13
  (mount-session-check race with deferred promise pattern), FR-14 (logout failure both
  ok:false and network error paths), and FR-15 (empty session object edge case). No
  security issues in the test code itself.
- `packages/auth-client/src/context.ts`: reviewed line-by-line; no security findings.
  AuthUser interface normalizes user data with proper nullable fields. AuthActions
  interface exposes only `login` and `logout` (no `register`). `useAuthContext` throws
  with a descriptive error when used outside `AuthProvider`. Role union includes all
  expected values. Note: the error message on line 39 says "useAuth" while the function
  is named `useAuthContext` — this is intentional because `useAuth` (in `index.ts`) is
  the public API that wraps this function.
- `packages/auth-client/src/index.ts`: reviewed line-by-line; no findings. Public API
  surface exports only `useAuth`, `useSession`, `useRequireAuth`, `AuthProvider`, and
  re-exported types. No `register` export. Clean barrel.
- `packages/auth-client/src/provider.tsx`: 1 finding (see above). The remaining code
  is well-structured: session check on mount with cancellation via cleanup function
  (line 58-60), `authActionCompletedRef` for race guard (FR-13), login/logout actions
  as stable `useCallback` references, defense-in-depth state clearing on logout (FR-14),
  user-derived `isAuthenticated` (FR-15). No hardcoded secrets, no direct provider SDK
  coupling, no unsafe DOM manipulation. CSRF protection is delegated to the server
  (SameSite cookies); the client makes same-origin fetch calls with default credential
  behavior.
