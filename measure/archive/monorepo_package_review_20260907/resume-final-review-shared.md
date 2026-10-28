# Shared package final review

The Medium auth refresh finding is closed after source review of the repair and its two regression tests.
This review found no Critical or High finding in the assigned changes.

## Scope

The review covers Phase 2 of `monorepo_package_review_20260907`.
The comparison base is `291daf2f1a566cc14298602b6402ebff4dbd1081`.
The review also checked `/tmp/monorepo-resume-baseline.diff` to identify existing work.

The review inspected the four assigned implementation reports and the Measure workflow.
It inspected the SRS bridge, knowledge state engine, auth client, structured logging, Sales constructor, database sentinels, fixtures, and historical assertions.
It excluded the active Science, Reading, and quiz changes.

## Medium: failed refresh can leave initial authentication loading forever

Location: `packages/auth-client/src/provider.tsx:87` through line 93.

`refresh()` increments `authActionRef` before its request.
A rejected request, non-success response, or JSON parsing failure exits without clearing `isLoading`.
The increment also prevents the initial session request from applying its response.
The provider then remains in its initial loading state until another successful action occurs.

Reproduction:

1. Mount `AuthProvider` with a deferred first `/api/auth/session` response.
2. Call `useAuth().refresh()` before that response resolves.
3. Reject the refresh request with a network error.
4. Catch the returned refresh rejection.
5. Resolve the initial session request with a valid session response.
6. Observe that `isLoading` remains `true`.

The same sequence fails with an HTTP 500 refresh response or invalid refresh JSON.
The public refresh contract permits this sequence, although the current completion callers usually start after authentication.

Minimum repair:

- Add error handling around the refresh request and JSON parsing.
- Clear `isLoading` only when the failed refresh generation remains current.
- Preserve the current user and authentication fields.
- Rethrow the error so the caller can report the failure.
- Add a deferred-response regression for the sequence above.

The existing login catch block provides the required pattern.
Keep the signed-out check and generation comparisons unchanged.
Add an assertion that a failed older refresh cannot replace a later logout state.

## Confirmed protections

The logout action sets `signedOutRef` before its request and immediately clears local authentication.
Refresh returns before fetching when logout has started.
An earlier refresh response also fails the generation check after logout starts.
The existing tests cover refresh completion after logout and refresh invocation during pending logout.

The public Sales constructor rejects the removed direct Mastery mode.
The trusted-only tests retain constructor rejection and verified identity requirements.
The updated projection fixtures use the scoped verifier and factory.
Cross-organization reads return an empty result, while source-attempt and idempotency reuse remain rejected.
This review found no remaining assertion that accepts the public legacy constructor.

The SRS bridge uses minimum retention across reviewed variants.
Explicit zero repetitions prevent a timestamp from supplying review history.
The engine preserves `inProgress` for proficiency evidence without reviewed cards.
Cards without review history or proficiency evidence remain `untouched`.

The structured logging migrations preserve event names and available request context.
The adapter omits error messages and stacks, as the replaced route code did.

The database absence sentinels use parameterized catalog queries.
The fixture reset limits disabled triggers to named fixture tables and restores them in `finally`.
The reset continues to exclude both global successor registry tables.

The Auth historical assertion references an existing Git revision with the resolved registry row.
The review independently read that row from Git.
The current registry length assertion remains active.

The APK assertion checks contiguous receipt locators and exact catalog path membership.
The unchanged acceptance test still checks the accepted catalog artifact and release identity.
Receipt additions therefore do not silently accept the larger candidate release.

## Validation limits

This was a source review. It did not rerun package or workspace test suites.
The refresh finding follows the control flow; this review did not execute its regression sequence.
The implementation reports provide the recorded focused test results.
The root task owns final package suites, lint, type checks, and optional database execution.

The review inspected an older Domain failure log and did not treat it as the final package result.
The reported focused repairs require the root task's final verification.

Existing graph caller queries returned no callers for `createSalesMasteryProjection`, `buildKstState`, and `logStructuredError`.
The `AuthProvider` query returned ambiguous nodes.
These graph results do not prove complete caller coverage.
The review inspected source changes and test callers to supplement those results.
No full graph scan ran.

Historical v2 checks remain conditional on `RA_MATH_V2_ROOT`.
Their absence from a default run must remain visible in final verification results.

The data implementation report still describes preservation of the legacy Sales constructor.
The later trust report and current source supersede that statement.
The final task report should use the current trusted constructor behavior.

No production file, migration, accepted release, Git note, or commit changed during this review.

## Auth refresh follow-up

The refresh catch now clears loading only for the current action generation.
It preserves the current session fields and rethrows the error.
The new tests cover refresh failure during initial loading and an older refresh failure after logout.
The signed-out check and stale response checks remain intact.
The source repair closes the Medium finding. The root task owns execution of the updated test suite.
