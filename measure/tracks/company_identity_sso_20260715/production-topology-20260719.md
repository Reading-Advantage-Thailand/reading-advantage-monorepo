# Production Topology — 2026-07-19

This is the final observed topology for the Phase S7 participants. The source of
truth for the release inventory is [`production-rollout-20260718.md`](./production-rollout-20260718.md),
with deployment provenance and re-verification commands in
[`../../deployment-status.md`](../../deployment-status.md).

## Serving applications

| App | Cloud Run project / service | Region | Image digest | Runtime service account | Public domain | Traffic | Observed revision |
|---|---|---|---|---|---|---:|---|
| Accounts | `reading-advantage / accounts` | `asia-southeast1` | `sha256:7e851f0c3663c7bfafd94bc434106f875ec3222ea928a000c698400601b1bc27` | `accounts-cloud-run@reading-advantage.iam.gserviceaccount.com` | `https://accounts.reading-advantage.com` | 100% | `accounts-00007-hxs` |
| Marketing | `reading-advantage / marketing` | `asia-southeast1` | `sha256:df12a3aa962cf861a2332ffab766588330456fc7b1a3e4e84e67e87a69e5b2d6` | `marketing-cloud-run@reading-advantage.iam.gserviceaccount.com` | `https://marketing.reading-advantage.com` | 100% | `marketing-00013-jil` |
| Sales | `reading-advantage / sales-advantage` | `asia-southeast1` | `sha256:ab7ca4d4429cad3d81a28fe9b9f85e03c78cb62f2e075142152982e0f7415ce3` | `sales-cloud-run@reading-advantage.iam.gserviceaccount.com` | `https://sales.reading-advantage.com` | 100% | `sales-advantage-00005-yas` |

All three production services use the shared Cloud SQL instance
`reading-advantage:asia-southeast1:cloud-sql`. Their domain mappings were
observed with `Ready=True`, `CertificateProvisioned=True`, and
`DomainRoutable=True`, with CNAME target `ghs.googlehosted.com.`.

## Codecamp cutover topology

| App | Project / service | Region | Candidate image | Runtime service account | Domain | Candidate traffic | Observed rollback anchor |
|---|---|---|---|---|---|---:|---|
| Codecamp | `codecamp-advantage / codecamp-advantage` | `asia-southeast1` | `asia-southeast1-docker.pkg.dev/$PROJECT_ID/codecamp/codecamp-advantage:$BUILD_ID` | `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com` | `https://codecamp.reading-advantage.com` | 0% (not deployed) | `codecamp-advantage-00019-682`, `sha256:995d86e1aadbad8fe93ce93fbe0e7ac3afbc5ec804b63e147011982738d1dffb` |

The candidate is pinned by `apps/codecamp-advantage/cloudbuild.yaml` to the
`sso-candidate` tag and `CODECAMP_AUTH_MODE=company`; no candidate revision or
domain-condition result is claimed because the required cross-project secret
grant is still pending. The domain mapping remains owned by
`codecamp-advantage`; rollback changes revision traffic only.

## Rollback references

Sales has the verified no-traffic compatibility revision
`sales-advantage-00004-jed`. The Codecamp pre-SSO anchor above is retained for
the pre-repair rollback path. See the runbook at
`apps/codecamp-advantage/docs/codecamp-sso-cutover-runbook-20260719.md` before
any Codecamp traffic change.
