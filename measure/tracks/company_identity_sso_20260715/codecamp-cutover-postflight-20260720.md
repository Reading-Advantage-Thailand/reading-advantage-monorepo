# Codecamp SSO Cutover Postflight — 2026-07-20

## Production change record

- **IAM grants:** Added `roles/secretmanager.secretAccessor` on
  `projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET` to
  both `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com` and
  `148839308272@cloudbuild.gserviceaccount.com`.
- **Cloud Build:** `38c3f0c0-2b04-4bca-825d-93e9f83f2cf0`; completed in 5m51s
  with all 6/6 steps successful.
- **Candidate revision:** `codecamp-advantage-00020-hay`, image digest
  `sha256:980003665dc99810213d05468022dcd313ecda49d3ab695cfe6c4555645a0660`.
  The revision remains tagged `sso-candidate`.
- **Traffic:** `codecamp-advantage-00020-hay` is confirmed at 100% traffic.
  The legacy anchor `codecamp-advantage-00019-682` remains preserved.

## Public-domain verification

- `https://codecamp.reading-advantage.com/api/auth/mode` returned
  `{"mode":"company"}`.
- `https://codecamp.reading-advantage.com/api/auth/login` returned HTTP 409,
  correctly redirecting to `/api/auth/company/start`.
- Domain mapping conditions were all ready: `Ready=True`,
  `CertificateProvisioned=True`, and `DomainRoutable=True`.

## Migration preservation

The historical production rollout records **5 legacy accounts** preserved and
migrated with exact credential hashes, roles, stable local-principal mappings,
and immutable audit rows. Product ownership remained unchanged across 155
progress rows, 24 reviews, and 3 chats. See the migration section of
[`production-rollout-20260718.md`](./production-rollout-20260718.md), especially
the 2026-07-19 execution addendum.

## Legacy rollback commands

These commands are documented for an approved incident rollback only; they were
not executed during this postflight:

```bash
gcloud run services update-traffic codecamp-advantage \
  --region=asia-southeast1 \
  --to-revisions=codecamp-advantage-00019-682=100
```

To restore the shipped candidate after an approved rollback rehearsal:

```bash
gcloud run services update-traffic codecamp-advantage \
  --region=asia-southeast1 \
  --to-revisions=codecamp-advantage-00020-hay=100
```

No traffic reversal was performed, and the `sso-candidate` tag remains on
`codecamp-advantage-00020-hay`.
