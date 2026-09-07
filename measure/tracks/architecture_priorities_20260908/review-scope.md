# Astra review decisions

Three Astra low agents reviewed the priorities independently.

## Verification

A dedicated Turbo verification task will depend on the real Science build.
It will reuse the build result and retain all existing output assertions.
The runtime and verification configurations must cover the previous test set without overlap.
Stricter lint checks remain unchanged.
A follow-up Astra review confirmed ten identical TypeScript runs across seven gate files.
The verification script will run the existing typecheck command once and capture its output.
Compiler failure will print diagnostics and prevent the gate tests from starting.
Standalone typecheck commands will retain their existing behavior.

## Imports

Eight Science production files can use existing Domain subpaths.
Nine integration tests use the same unnecessary root import.
No new package exports are necessary.
The intentional root compatibility test remains.

## Authentication

Three applications contain identical cookie readers.
The existing auth package will own the shared reader.
Application wrappers preserve existing callers.
Mode selection remains local because the applications use different accepted values and defaults.
The review found no shared domain operation that needs extraction within this scope.

## Environment

The baseline is commit db9a9f2b4cb5ae970a799a07d47eb28381e28798 with unrelated working changes.
The baseline status and diff are saved under /tmp/architecture-priorities-baseline*.
The configured Science document scanner is absent; direct Measure documents provide context.
The existing graph supports structural review and will receive an incremental update.

## Existing reconciliation contract

The architecture check rejects the candidate record because its source snapshot is stale.
The documented V2 contract includes the final tracked analyzer inputs.
The new cookie helper enters that existing input set.
The refresh will preserve the existing hash algorithms and coverage rules.
It will preserve candidate status, empty reviews, V1 policy, and approved baselines.
Actual analyzer findings require comparison before any digest update.
The implementation will use the existing computation functions.
