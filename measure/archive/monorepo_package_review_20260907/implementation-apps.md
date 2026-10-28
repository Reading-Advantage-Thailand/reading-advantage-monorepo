# App finding implementation

## Result

The implementation resolves findings A1 through A6 in five apps.

### A1 and A2

The Primary role and school debug routes now return a stable 404 response.
The routes contain no database or session access.
Focused tests cover production, anonymous, and student requests.
The tests assert that the database mock receives no calls.

### A3

The Codecamp tutor route now selects the configured authentication mode.
Company mode reads only the Codecamp company cookie.
The route introspects the company session and resolves the existing product user.
Revoked sessions and introspection failures return a sanitized 401 response.
Explicit legacy mode retains the existing local session adapter.

### A4

The obsolete Reading signup route now returns a stable 410 response.
The route contains no account write path.
The existing registration route still exports the shared authorized registration handler.

### A5

The Accounting CSV export now prefixes risky text cells with an apostrophe.
The check covers formula prefixes after all leading whitespace.
CSV quoting still handles quotes and line breaks.
Numeric amount and rate cells retain their original numeric text.

### A6

The Sales multipart route now validates each entry before provider use.
The scenario identifier must be a nonempty string.
The audio entry must be a File.
Duration and retention values must contain complete positive decimal integers.
The existing bounds still apply after conversion.

## TDD evidence

The new Primary tests first returned 500 responses and attempted database or session access.
The new Codecamp tests first failed three company mode cases.
The new Accounting test first emitted active formula prefixes.
The new Sales tests first returned 500 or accepted malformed values.
The first Reading run reached a known ESM transform error before assertions.
Dependency isolation then let the retired route test run directly.

The final focused test results follow:

- Primary Advantage: 4 passed.
- Codecamp Advantage: 10 passed.
- Reading Advantage: 2 passed.
- Accounting: 11 passed.
- Sales Advantage: 8 passed.
- Total: 35 passed.

An independent reviewer repeated all 35 focused tests successfully.

## Static checks

Focused ESLint checks passed for every changed app file.
Accounting reported one existing unused helper warning and zero errors.
Codecamp, Sales, and Accounting app type checks passed.
Primary type checking reached the 120-second limit without output.
Reading type checking exhausted the Node 2 GB heap after about 113 seconds.
`git diff --check` passed for the app changes.

## Files

Application files:

- `apps/primary-advantage/app/api/debug/init-roles/route.ts`
- `apps/primary-advantage/app/api/debug/school/route.ts`
- `apps/codecamp-advantage/app/api/tutor/intervention/route.ts`
- `apps/reading-advantage/app/api/auth/signup/route.ts`
- `apps/accounting/app/api/submissions/export/route.ts`
- `apps/sales-advantage/app/api/roleplay-attempts/route.ts`

Test files:

- `apps/primary-advantage/app/api/debug/init-roles/__tests__/route.test.ts`
- `apps/primary-advantage/app/api/debug/school/__tests__/route.test.ts`
- `apps/codecamp-advantage/app/api/tutor/intervention/route.test.ts`
- `apps/reading-advantage/app/api/auth/signup/route.test.ts`
- `apps/reading-advantage/app/api/auth/register/route.test.ts`
- `apps/accounting/app/api/submissions/export/route.test.ts`
- `apps/sales-advantage/app/api/roleplay-attempts/__tests__/audio-upload-boundary.test.ts`

## Structural files

These files changed imports, exports, or exported signatures:

- `apps/primary-advantage/app/api/debug/init-roles/route.ts`
- `apps/primary-advantage/app/api/debug/school/route.ts`
- `apps/codecamp-advantage/app/api/tutor/intervention/route.ts`
- `apps/reading-advantage/app/api/auth/signup/route.ts`

The parent agent owns the shared graph update.
