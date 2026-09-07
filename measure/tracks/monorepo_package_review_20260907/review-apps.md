# App review

The review confirmed six defects across five apps. It inspected all eleven apps through selected source and test paths.
This review is a targeted evaluation, not an exhaustive audit of every route.
The reviewer preserved the existing changes and made no application edits.

## Findings

### A1 — High: Anonymous callers can operate the Primary debug endpoint

- Evidence: `apps/primary-advantage/app/api/debug/init-roles/route.ts:6` and `:50`.
- The POST handler creates global roles without authentication. The GET handler returns sample user identifiers and email addresses without authentication.
- `apps/primary-advantage/proxy.ts:116` excludes API routes. The proxy supplies no additional protection.
- Scenario: An anonymous caller requests `/api/debug/init-roles` and obtains details from arbitrary users.
- Minimum fix: Disable the debug endpoint outside development. Require an authorized administrator before every database operation during development.
- Regression tests: Verify production denial, anonymous denial, student denial, and zero database calls for denied requests.

### A2 — High: Primary exposes license keys across schools

- Evidence: `apps/primary-advantage/app/api/debug/school/route.ts:48` through `:61`.
- The handler requires a session but selects all licenses without a school predicate. Its response includes every license key.
- Scenario: A student from one school obtains license keys from another school through `/api/debug/school`.
- Minimum fix: Disable this debug endpoint outside development. Require administrator authorization and remove the global license query.
- Regression tests: Verify production denial and student denial. Verify that an allowed response excludes another school's licenses.

### A3 — High: Codecamp tutor uses the wrong authentication adapter

- Evidence: `apps/codecamp-advantage/app/api/tutor/intervention/route.ts:51` through `:54`.
- The route always reads `session_token` through `getAuthToken`. It then uses the legacy database session adapter.
- Company mode defaults on in `apps/codecamp-advantage/lib/auth-mode.ts:13`.
- Company sessions use `__Host-ra_codecamp_session`, as defined in `apps/codecamp-advantage/lib/company-oidc.ts:10`.
- Scenario: A valid company user submits a tutor request and receives 401. A valid legacy session still reaches this route in company mode.
- Minimum fix: Reuse the mode selection and principal resolution in `apps/codecamp-advantage/app/api/trpc/[trpc]/route.ts`.
- Regression tests: Verify company authentication, revoked company sessions, legacy rejection in company mode, and explicit legacy mode.
- The existing tutor tests mock the legacy adapter. Their five passing tests do not verify the company boundary.

### A4 — High: Reading retains an anonymous account creation route

- Evidence: `apps/reading-advantage/app/api/auth/signup/route.ts:9` through `:37`.
- The route creates users and credentials without authentication or school assignment. It accepts any nonempty password, including one character.
- The signup page tells users to contact their teacher. The shared registration handler requires a teacher or administrator.
- Supporting paths: `apps/reading-advantage/app/[locale]/(auth)/auth/signup/page.tsx` and `packages/api/src/routes/auth/register.ts`.
- `apps/reading-advantage/middleware.ts` excludes API routes.
- Scenario: An anonymous caller bypasses teacher registration through `/api/auth/signup` and creates a credential with a one-character password.
- Minimum fix: Disable the obsolete signup writer or delegate it to the existing registration handler.
- Regression tests: Verify anonymous denial and zero writes. Verify the existing authorized registration path still works.

### A5 — Medium: Accounting exports active spreadsheet formulas

- Evidence: `apps/accounting/app/api/submissions/export/route.ts:96` through `:97`.
- The CSV encoder only escapes delimiters and quotes. It leaves formula prefixes active in payee and category cells.
- `packages/backend/src/modules/accounting/contracts.ts:21` accepts a payee such as `=1+1`.
- Scenario: A staff submission contains that payee. After approval, an accountant opens the export and the spreadsheet evaluates the cell.
- Minimum fix: Neutralize formula prefixes in exported text cells before CSV escaping. Preserve numeric amount cells and stored text.
- Regression tests: Cover `=`, `+`, `-`, and `@` prefixes, leading whitespace, embedded quotes, and unchanged numeric amounts.
- The existing export suite passes ten tests. It covers roles, dates, status filters, and amounts, but omits formula cells.

### A6 — Medium: Sales accepts malformed multipart values

- Evidence: `apps/sales-advantage/app/api/roleplay-attempts/route.ts:50` through `:55`, and `:132` through `:139`.
- Type assertions do not validate multipart values. A string audio field reaches `audioFile.arrayBuffer()` and produces a 500 response.
- `parseInt` accepts malformed values such as `30days` and truncates fractional retention values.
- Scenario: A caller sends text as audio with otherwise valid fields. The route reports an evaluation failure instead of an input error.
- Minimum fix: Validate scalar strings and the File instance before reading audio. Require complete integer values for duration and retention.
- Regression tests: Cover text audio, a file-valued scenario identifier, fractional values, and suffixed integers. Verify rejection before provider calls.
- The existing audio suite passes five tests. It omits these malformed multipart cases.

## Coverage

All paths below are repository-relative.

| App | Inspected paths and checks | Result |
| --- | --- | --- |
| accounting | `app/lib/auth.ts`; `app/api/submissions/route.ts`; `app/api/submissions/export/route.ts`; sibling export tests; backend accounting contracts. Checked session failure responses, actor scope, evidence cleanup, CSV encoding, and filters. | A5 |
| accounts | `lib/server/http.ts`; `app/api/session/login/route.ts`; `app/api/admin/employees/route.ts`; sibling employee tests. Checked origin validation, cookie properties, kernel evidence, and error mapping. | No additional confirmed finding in the inspected paths. |
| activity-vinext-fixture | `app/page.tsx`; `app/layout.tsx`; `package.json`. Checked static activity validation and the fixed tutorial callback. The fixture has no server authentication or mutation path. | No confirmed finding. No test script exists. |
| advantage-games | `src/lib/games/api/completeRoute.ts`; sibling adversarial tests; Shadow Gate completion adapter; `src/components/apk/AuthenticatedCartridgeHost.tsx`. Checked malformed completion input, server XP calculation, mock scope, cartridge lookup, and error text validation. | No additional confirmed finding in the inspected paths. |
| codecamp-advantage | Tutor intervention route and tests; `lib/auth-mode.ts`; `lib/company-oidc.ts`; session and tRPC routes; shared token extraction. Checked company mode, tenant construction, action schemas, fallback generation, and error responses. | A3 |
| marketing | Settings and video projects routes; `app/lib/auth.ts`; `app/__tests__/phase-w3-settings-auth.test.ts`. Checked permission guards, secret masking, malformed JSON, project predicates, and sanitized errors. | No additional confirmed finding in the inspected paths. |
| primary-advantage | Three debug routes; `proxy.ts`; host-proof completion route and tests. Checked API exclusion, authentication, global queries, completion flag, tenant requirement, and JSON errors. | A1 and A2 |
| reading-advantage | Signup, register, login, and host-proof completion routes; signup page; middleware; session and password utilities; sensitive auth tests. Checked registration authority, validation, session resolution, and completion tenant mapping. | A4 |
| sales-advantage | Roleplay attempt route and audio boundary tests. Checked principal resolution, rate limits, multipart validation, consent, retention, storage cleanup, and sanitized failures. | A6 |
| science-advantage | Class join and impersonation routes; `lib/auth/session.ts`; route contract tests. Checked shared delegation, tenant derivation, malformed input, authorization errors, and conflict responses. | No additional confirmed finding in the inspected paths. |
| www-reading-advantage | `src/lib/blog.ts`; locale tests; blog pagination component and tests. Checked safe slugs, locale fallback, missing files, content validation, and pagination links. | No confirmed finding in the inspected paths. Content comes from repository files. |

## Verification and limits

The reviewer ran focused tests with one worker per command and at most two concurrent commands.

| App | Command after `pnpm exec vitest run` | Result |
| --- | --- | --- |
| accounting | `app/api/submissions/export/route.test.ts --maxWorkers=1 --no-file-parallelism` | 10 passed |
| sales-advantage | `app/api/roleplay-attempts/__tests__/audio-upload-boundary.test.ts --maxWorkers=1 --no-file-parallelism` | 5 passed |
| codecamp-advantage | `app/api/tutor/intervention/route.test.ts --maxWorkers=1 --no-file-parallelism` | 5 passed |
| science-advantage | `--config vitest.unit.config.ts lib/__tests__/route-contract-correctness.test.ts --maxWorkers=1 --no-file-parallelism` | 7 passed |
| www-reading-advantage | `src/lib/blog-locale.test.ts src/components/blog/blog-pagination.test.tsx --maxWorkers=1 --no-file-parallelism` | 12 passed |

The reviewer did not run database integration tests, full builds, full lint, or browser tests.
The existing graph returned no callers for `getAuthToken` or `accountingSubmissionInputSchema`.
The reviewer verified relevant connections against current source and did not modify the graph.
The Science documentation scanner completed successfully.

The checkout contains extensive existing changes, including game hosts, host-proof routes, authentication start routes, and Science tests.
None of the six finding locations appeared modified in the reviewed Git status output.
The reviewer did not revert, commit, or deploy any changes.
