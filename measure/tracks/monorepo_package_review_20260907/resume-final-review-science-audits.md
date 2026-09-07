# Science audit and launcher review

## Result

The High audit finding is resolved.
The corrected assertions use independent historical evidence or explicit current requirements.
No unresolved finding remains in this bounded review.

## Historical evidence verification

The review inspected the recorded Git revisions and their contents.
The revisions describe the inventory, static audit, classification, closeout, and seed relocation work.

The inventory revision contains 27 routes, 22 scripts, 92 tests, and 335 source files.
It contains 52 production dependencies and 19 development dependencies.
The assertions preserve the documented differences from the original inventory claims.
The route inventory check verifies every historical route path.

The classification revision contains all five required finding identifiers.
The closeout revision contains the archive directory and omits the source directory.
The static audit revision contains 13 documented domain entrypoints and satisfies the restored minimum of eight.
The recorded reports contain the graph gap, provider imports, database imports, and console evidence used by Phase 2.

The graph route test again checks complete current coverage.
The replacement graph scope check independently requires specific current auth, AI, and instrumentation files.

The seed test enumerates the historical JSON files independently with `git ls-tree`.
It requires 53 files and compares their content hash multiset with the recorded snapshot.
The separate path check validates each recorded path against its historical blob.
An independent review check confirmed that all 53 content hashes match.
The correction preserves the existing hash contract and adds no hash scope.

## Launcher review

The installed TypeScript, ESLint, and Next.js commands match the current Science package scripts.
The replacements retain exit-status checks and bounded subprocess timeouts.
Phase 8 invokes the installed Turbo executable with the real Science dependency build.
It preserves the inherited environment through loose environment mode.
Phase 13 retains the existing bounded unit test selection.
The broad `apps/**` CI path includes Science changes.
No additional launcher regression appeared in this source review.

## Verification limits

The review compared the changed Science audit and CI gate files against HEAD.
It inspected the Science package scripts and app instructions.
It independently checked historical counts, finding identifiers, archive paths, documented entrypoints, report statements, and relocated file contents.
The scoped whitespace check passed.

The implementation agent reported 144 passing focused audit tests before the final seed correction.
The implementation agent reported 23 passing seed tests after that correction.
The review ran no graph scan, build, lint process, type check, or full test suite.
The parent owns the remaining full workspace verification.

## Phase 3 and default setup follow-up

The Phase 3 historical evidence change is accepted.
Revision `af410883c13598023df5132cb0a1611f7d65450d` contains the original manual inspection annotations.
An independent check verified all 78 tracked sample paths and line positions at that revision.

The two ephemeral exceptions are narrowly bounded by finding identifier, exact path, and line one.
The recorded graph finding contains the quoted empty-graph output.
The recorded log finding explicitly identifies the two untracked log files.
Neither file appears in the revision's Git tree.
These assertions preserve recorded evidence; they do not reconstruct the unavailable files.
No fabricated historical file or self-comparison appeared in the changed tests.

The initial combined setup exposed a browser-global error in the two Node observability acceptance files.
The correction guards `matchMedia` and `scrollIntoView` initialization with a browser-environment check.
A light Node-context execution confirmed that the corrected setup completes without browser globals.
The correction preserves the integration database URL.

The two model-variable deletions already belonged to the unit setup.
Loading that setup in the default configuration gives component and unit tests the same model defaults.
The recommendation fallback test supplies its own explicit model configuration.
The deletions do not remove the database environment or skip an integration test.
No additional actionable setup issue appeared in this review.

The reviewer ran no heavy test suite or database operation for this follow-up.
The parent owns final default-suite verification.

## Sales Knowledge import boundary review

The Vitest externalization repair is accepted.
All three Science configurations externalize only the compiled Sales Knowledge package directory.
They preserve Node's file URLs for the package's evidence loader.
They do not replace the loader, mock the evidence, or bypass release validation.

The package build copies the evidence files into its declared `dist` output.
Its binding module loads and validates those files during import.
The Domain entrypoint reaches that module through Sales Mastery.
The new regression imports the actual Domain entrypoint and checks its exported tenant function.
An invalid evidence path therefore still fails before the assertion.

The dependency already belongs to Domain's package graph.
The repair changes the test loader boundary without changing production source or the release contract.
The scoped whitespace check passed.
The parent reported successful default-configuration imports across the DSAR pair and the new regression.
That run had 13 passing tests and one unrelated audit-row fixture failure.
The reviewer ran no heavy tests.
No new finding appeared in this source review.

## Latest historical and fixture review

The reviewed changes are accepted without new findings.
Phase 10 checks the existing reopened status and the exact rejection marker.
The metadata already exists at HEAD, so the test does not manufacture acceptance evidence.
It preserves the rejected closeout instead of claiming that archival succeeded.

Phase 0 now reads the discovery plan at `e5c77751fb9fffcc450b40949afc51bd172226a3`.
That historical plan explicitly records the blocked git-clean check.
The earlier directory-existence replacement is absent from the final diff.
The reviewer independently read the historical plan and confirmed the exact statement.

Phase 6 reads package data at `17beedb9187a9ee5aa727e02595bd3bba7435383`.
That revision directly precedes the original Phase 6 test commit, `dd1dbefad`.
The historical package contains 56 caret ranges and satisfies the retained minimum of 51.
The test retains independent Git evidence for the documented dependency deviation.

The environment schema adds optional observability fields and the established service default.
The Sentry fields accept empty values and expose them as undefined.
The session fixture follows the current transaction and tokenHash schema.
It retains UUID, separation, length, and hexadecimal assertions against the actual shared session implementation.

The three student analytics and progress fixtures retain their existing behavioral assertions.
Their UUID identifiers, school fields, and deletion order satisfy the current database schema.
The username prefixes preserve cleanup selection after the UUID conversion.
The owner reported 20 passing tests for these three files.
The reviewer used source and Git checks without heavy tests.

## Remaining Science failure classification

The final batch reported 59 failures across ten files.
The reviewed groups have concrete fixture defects.
This review does not identify a required production change for those groups.

The four student profile and assignment suites use non-UUID student identifiers.
Their routes require UUID identifiers or the `me` alias before domain authorization.
Valid UUID fixtures restore the intended authorization checks without relaxing path validation.

The update-mastery fixture creates a student without `schoolId`.
Its attempt rows already use the test school.
TenantDB correctly rejects the null tenant before the intended attempt checks.
The fixture must use the same school for its student and rows.

The student-classes mock expects the obsolete string argument.
The route passes the secured context containing the database, user, tenant, and input.
The failed assertion also makes the formatter traverse TenantDB's guarded query property.
Assertions should check context fields without traversing that property.

The class-detail ordering assertion already receives the expected order.
Its exact object comparison omits the current `titleThai: null` field.
The fixture expectation must retain ordering and include that field.

The badge fixtures omit the gamification profile required for badge creation.
The implementation returns no awards when that profile lacks a valid school.
The existing streak helper creates a valid profile, which explains the passing streak cases.
Badge-award fixtures need a default profile with the test school.
The missing-profile and tenant checks must remain unchanged.

The reviewer sent these bounded findings directly to the Science owner.
The reviewer ran no tests and changed no source files.

## Six fixture repairs reviewed

The six fixture repairs are accepted.
Recommendations and update-mastery now assign the test school to their users, including unauthorized outsiders.
The tests retain their authorization, attempt-state, completion, and cache assertions.
The malformed JSON assertion now checks the existing structured 400 response exactly.

Roster uses valid UUID users and retains its permission, enrollment removal, and no-op assertions.
Its missing-student assertion checks the current structured validation response.
Cleanup still selects fixture users through the existing prefix, now stored in usernames.
The profile cleanup uses those selected users without expanding its scope.

Badges now seeds the required school-scoped profile and retains every badge assertion.
Class detail retains ascending-order assertions and includes the current nullable Thai title.
Its stable teacher constant fixes the helper's inaccessible local variable without changing the authenticated identity.

Student-classes verifies the secured service context fields directly.
The current permission table explicitly permits teachers to read their own student-class data.
The teacher expectation therefore follows the established contract.
The unauthenticated rejection and student response assertions remain.

The scoped whitespace check passed.
The reviewer changed no production source and ran no tests.

## Final UUID fixtures and JSON validation

The four UUID fixture repairs are accepted without new findings.
Assignments, achievements, gamification-profile, and mastery-profile retain their behavioral assertions.
The fixtures preserve distinct users, roles, enrollment relationships, ordering, pagination, profile creation, and response fields.
Each authenticated fixture user belongs to the existing test school.
User cleanup selects the original fixture prefixes through usernames instead of UUID identifiers.
The repair removes the shared school deletion and does not expand other cleanup operations.

The update-mastery source repair returns a structured 400 response for malformed JSON after authentication.
It validates a cloned request and preserves the original request for the domain operation.
It also preserves the separate clone used for failure recording.
The domain already parses JSON before its feature flag check.
The new guard therefore corrects error classification without bypassing domain authorization or tenant checks.
The regression submits malformed JSON and checks the exact status and response details.
Other exceptions retain the existing error handling.

The scoped whitespace check passed.
The parent owns the active database test batch.
The reviewer ran no tests and changed no source files.
