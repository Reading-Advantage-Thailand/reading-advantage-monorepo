# Sales Production Continuation Evidence - 2026-07-19

## Outcome

Sales Advantage is serving company SSO on
`https://sales.reading-advantage.com` from revision
`sales-advantage-00005-yas` at 100% traffic. The verified compatibility
rollback `sales-advantage-00004-jed` remains Ready, tagged
`legacy-rollback`, and receives 0% traffic.

## Immutable release chain

- Original release build: `f5063222-76bd-4b73-a151-3f7994827e09`.
- Original release commit: `597241dedf712ea6a2350346fefa0459f3e1d23c`.
- Approved image digest:
  `sha256:ab7ca4d4429cad3d81a28fe9b9f85e03c78cb62f2e075142152982e0f7415ce3`.
- Commit-bound Cloud SQL backup: `1784467579292`.
- Repair-manifest SHA-256:
  `6329c846ac119a0af9fa43747879b042c211b4b79e5ad8a98822940fd29b5980`.
- Continuation implementation: `2a24a654`; metadata-permission correction:
  `2c96be943b647f7f1df5cb6b452f9fcce0041056`.
- Corrected source archive: 1,429 manifest entries plus the generated
  manifest, 1,430 uploaded files, no symlinks.
- Continuation source-manifest SHA-256:
  `3476aaecdc26de67f3b22d8374ddbad69f16c5fe139639d806e82212c06a42bc`.
- Successful continuation build:
  `342cdc52-871c-4f08-bef0-7ebf38290557`, 15/15 steps successful.

## Safe failure and correction

The first continuation attempt, build
`082c7cc7-458a-4a6f-9f1e-e0178cfd5d9d`, stopped in
`collect-original-release-evidence` because the build identity could access the
pinned secret payload but could not inspect Secret Manager version metadata.
Only source validation completed; all mutation, candidate, traffic, repair, and
promotion steps remained queued. Traffic stayed on `sales-advantage-00003-v4d`,
the repair receipt was absent, and no candidate was created.

The correction removed only the redundant `gcloud secrets versions describe`
metadata lookup. The release still pins
`SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST/versions/1`, and verifies the exact
payload digest before both read-only preflight and repair. It did not add a
broader Secret Manager role. The package-configured focused release suite passed
27/27 tests; Sales typecheck, changed-file lint, YAML parsing, Node syntax, and
`git diff --check` passed. An independent read-only review returned GO.

## Production verification

- Curriculum verification passed with 6 modules, 27 lessons, 8 rubrics,
  8 scenarios, and 14 quiz questions. The deterministic graph digest is
  `ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717`.
- Candidate `sales-advantage-00005-yas` passed company-mode verification at
  0% traffic before repair and again after repair.
- Traffic moved to the verified compatibility rollback before the atomic
  source-role repair. The exact receipt probe passed and protected compatibility
  access was reverified before promotion.
- The promoted custom domain returned
  `{"status":"alive","service":"sales-advantage"}` from `/api/health` and
  company-mode database/Accounts readiness from `/api/ready`.
- Domain mapping conditions `Ready`, `CertificateProvisioned`, and
  `DomainRoutable` were all true.
- Independent database inspection found the exact repair receipt, one Sales
  principal mapping, the intended target source role, and zero leftover runtime
  or rollback probes.
- Cloud Logging returned no error-severity entries for
  `sales-advantage-00005-yas` from build start through final verification.

## Rollback

The retained verified rollback command is:

```bash
gcloud run services update-traffic sales-advantage \
  --region=asia-southeast1 \
  --to-revisions=sales-advantage-00004-jed=100
```

The historical `sales-advantage-00003-v4d` revision must not be used after the
source-role repair because it predates the split company/compatibility database
credential contract.

## Remaining scope

The full browser-level ordinary-rep journey, audio evaluation, streaming chat,
rate-limit, and final human curriculum-quality checks remain open. Track
archival therefore remains open even though the reviewed production cutover is
complete.
