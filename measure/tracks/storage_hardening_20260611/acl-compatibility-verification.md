# ACL Compatibility Verification

Date: 2026-07-18

## Result

Accepted for FR-2 only. Private and default uploads no longer send an object
ACL. Public ACL behavior remains an explicit `public: true` opt-in for storage
providers that support legacy object ACLs.

The change was required by a live Sales deployment smoke check against a GCS
bucket with uniform bucket-level access and public access prevention. Before
the fix, GCS rejected a private upload because the adapter sent a legacy
`private` ACL. After the fix, the same provider-neutral adapter completed the
full private object lifecycle.

## Evidence

- Red: focused S3 driver suite failed exactly `2` ACL assertions: explicit
  private and default upload both carried an ACL.
- Green: storage package suite passed `4` files and `17` tests.
- TypeScript check: exit `0`.
- ESLint: exit `0` with `3` pre-existing unused-import warnings.
- Live GCS S3-interoperability smoke: private put and head passed, signed-read
  URL generation passed, delete passed, and the final absence check passed.
- The smoke object was deleted during the successful check.

## Scope

This checkpoint completes only Plan Tasks 4 and 8 plus the related
`PutOptions.public` documentation line. Signed-upload URLs, narrowed existence
errors, URL encoding, configuration diagnostics, and broad app adoption remain
open in the active storage-hardening track.
