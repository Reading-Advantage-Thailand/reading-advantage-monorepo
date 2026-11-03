# Pilot report: accounting app coverage

Scope: `apps/accounting`. Base commit: `01f2acfe8`. Branch: `pilot/cloud-accounting-app-coverage`.
This work changes test files only. It changes no source file, `package.json`, or lockfile.

## Coverage

Coverage counts `app/**/*.{ts,tsx}`, `proxy.ts`, and `scripts/**/*.ts`. It excludes test files.

| Metric | Before | After |
|---|---|---|
| Lines | 89.75% (631/703) | 98.00% (689/703) |
| Branches | 85.66% (502/586) | 93.85% (550/586) |
| Statements | 89.55% (669/747) | 97.59% (729/747) |
| Functions | 90.07% (118/131) | 96.18% (126/131) |

| Source file | Lines before → after | Branches before → after |
|---|---|---|
| `app/lib/submissions.ts` | 41.37 → 100 | 50.00 → 100 |
| `app/lib/auth.ts` | 62.96 → 100 | 75.00 → 100 |
| `app/_components/pending-submissions-list.tsx` | 84.81 → 97.46 | 88.13 → 98.30 |
| `app/api/submissions/route.ts` | 91.58 → 99.06 | 79.77 → 95.50 |
| `app/api/submissions/[id]/reject/route.ts` | 90.00 → 100 | 83.33 → 100 |
| `app/api/submissions/[id]/approve/route.ts` | 93.75 → 100 | 90.00 → 100 |
| `app/_components/new-submission-form.tsx` | 91.75 → 100 | 81.41 → 90.26 |
| `app/api/auth/callback/route.ts` | 93.33 → 100 | 100 → 100 |
| `app/lib/format-minor-amount.ts` | 100 → 100 | 83.33 → 91.66 |
| `app/lib/private-evidence-storage.ts` | 100 → 100 | 76.92 → 80.76 |

## Tests added per file

The tests add 141 cases (271 → 412).

| Test file | Cases | What the cases check |
|---|---|---|
| `app/lib/__tests__/format-minor-amount.test.ts` | 10 | Minor-unit display, JPY and KWD exponents, negatives, amounts above 2^53, bad input. |
| `app/lib/__tests__/derived-rate.test.ts` | +6 | Half-up rounding below .005, zero rate, amounts above 2^53, leading zeros, bad currency. |
| `app/lib/__tests__/submissions-adapter.test.ts` | 18 | Repository wiring, one repository per process, argument forwarding, field-error grouping, error pass-through. |
| `app/lib/__tests__/auth-guard.test.ts` | 11 | Guard 401 and 503 paths, error-name-only logging, page redirect to `/login`. |
| `app/api/submissions/route.branches.test.ts` | 28 | Idempotency key checks, non-multipart body, evidence checks, forbidden cleanup, retry conflict, byte comparison, log fields. |
| `app/api/submissions/[id]/decision-routes.branches.test.ts` | 11 | Approve and reject param forms, malformed JSON, non-string reason, unknown error rethrow. |
| `app/lib/__tests__/private-evidence-scope.test.ts` | 10 | Cross-company and malformed references refused, legacy delete refused, upload round trip. |
| `app/api/auth/callback/route.branches.test.ts` | 11 | No-role revocation, revocation failure, origin fallback, cookie lifetime, secure flag, exchange failure. |
| `app/_components/pending-submissions-list.errors.test.tsx` | 20 | Approve and reject error messages, network failure, reason check, cancel, export link, role gating. |
| `app/_components/new-submission-form.errors.test.tsx` | 16 | Amount preview and rounding display, 401/403/5xx messages, network failure, field-error filtering. |

## Defects

The tests found no real defect. No test uses `it.fails`.

Observation, not a defect: `app/api/submissions/route.ts:338-343` deletes the upload and rethrows a domain `forbidden` error, so the caller gets a 500 response, not a 403. A test now pins this behavior.

## Environment note

Before the build, 23 of 38 test files failed to load (exit 1). Workspace packages export `dist/` files, and the fresh install builds none. Building the dependencies fixed this. The build output is not committed.

## Commands

| Command | Exit | Result |
|---|---|---|
| `git fetch --unshallow` | 0 | Full history. |
| `pnpm install --frozen-lockfile` | 0 | `@vitest/coverage-v8` 4.1.8 already present; nothing extra installed. |
| `vitest run --coverage.enabled …` (before build) | 1 | 23 files failed, 15 passed; 2 tests failed, 114 passed. |
| `./node_modules/.bin/turbo run build --filter=accounting^...` | 0 | 10 packages built. |
| `../../node_modules/.bin/vitest run --coverage.enabled …` (before) | 0 | 38 files, 271 tests passed. |
| `../../node_modules/.bin/vitest run --coverage.enabled …` (after) | 0 | 47 files, 412 tests passed. |
| `../../node_modules/.bin/tsc --noEmit` (in `apps/accounting`) | 0 | No type errors. |
| `../../node_modules/.bin/eslint <new test files>` | 0 | No lint errors. |

The full coverage command, run from `apps/accounting`:

```
../../node_modules/.bin/vitest run --coverage.enabled --coverage.provider=v8 \
  --coverage.reporter=text --coverage.reporter=json-summary \
  --coverage.include='app/**/*.{ts,tsx}' --coverage.include='proxy.ts' \
  --coverage.include='scripts/**/*.ts' \
  --coverage.exclude='**/*.test.*' --coverage.exclude='**/__tests__/**'
```

No test needs a database, a secret, or a network call.
