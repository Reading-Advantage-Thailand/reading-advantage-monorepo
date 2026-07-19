# Deployment Status — GCP Cloud Run

> **Verified 2026-07-19** via `gcloud` (account `bodangren@gmail.com`). Timestamps and revisions go stale — **re-run the commands at the bottom; don't trust the dates blind.**

## The one-line answer

The monorepo (`bodangren/reading-advantage-monorepo`) is **not** the deploy source for most legacy live apps. Those services are fed by the **original standalone `Reading-Advantage-Thailand/*` GitHub repos** via Cloud Build triggers. Codecamp, Accounts, Marketing, and Sales are verified manual monorepo Cloud Build deployments; they do not yet have repository triggers.

## Per-app deployment map

| Monorepo app | Deploy config in monorepo | Live on Cloud Run? | GCP project / service | Last deploy | **Deploy source** |
|---|---|---|---|---|---|
| **www-reading-advantage** | Dockerfile + cloudbuild + **GitHub CD workflow** (`cd-www-reading-advantage.yml`) | ✅ yes | `www-reading-advantage` / `www-reading-advantage` (rev 00192) | 2026-06-17 | **Monorepo GH Actions CD** (30 ok / 10 fail of last 40) — **failing since ~2026-06-18**. A standalone Cloud Build trigger also exists, so provenance is dual. |
| **reading-advantage** | Dockerfile + cloudbuild, **no CD** | ✅ yes | `reading-advantage` / `reading-advantage-web` | 2026-06-25 | **Standalone repo** `Reading-Advantage-Thailand/reading-advantage` — Cloud Build triggers `Main` + `deploy-test`, filename `web/cloudbuild.yaml`. |
| **primary-advantage** | Dockerfile + cloudbuild, no CD | ✅ yes | `primary-advantage` / `primary-advantage-app` | 2026-05-30 | **Standalone repo** `Reading-Advantage-Thailand/primary-advantage` — Cloud Build trigger `primary-advantege-prod`. |
| **codecamp-advantage** | Dockerfile + cloudbuild, no CD | ✅ yes | `codecamp-advantage` / `codecamp-advantage` (rev 00017) | 2026-06-11 | **Manual `gcloud builds submit`** — no trigger in any region; every build has an empty `buildTriggerId`; builds run in the `global` region. See tech-debt 2026-05-18. |
| **science-advantage** | none | ❌ Cloud Run API not enabled on the project | never | — | Not deployed. |
| **advantage-games** | none | ❌ | never | — | Not deployed. |
| **accounts** | Dockerfile + cloudbuild, no CD | ✅ yes | `reading-advantage` / `accounts` (rev `00007-hxs`) | 2026-07-19 | **Manual monorepo `gcloud builds submit`**, build `de19ada8-775e-45b0-99ce-d3896adf8a78`, digest `sha256:7e851f0c3663c7bfafd94bc434106f875ec3222ea928a000c698400601b1bc27`; `https://accounts.reading-advantage.com` is live with managed HTTPS. |
| **marketing** | vinext Dockerfile + cloudbuild, no CD | ✅ yes | `reading-advantage` / `marketing` (rev `00013-jil`) | 2026-07-19 | **Manual staged monorepo release**, exact-source build `08fd00a1-de86-4f8f-b65d-632832279fa2` at `a7fc3fbb6476eb30f95c4f1bd5757d2d7708ba29`, digest `sha256:df12a3aa962cf861a2332ffab766588330456fc7b1a3e4e84e67e87a69e5b2d6`; all 15 release steps passed, the exact candidate was promoted to 100%, and custom-domain, health, readiness, mapping, and rollback evidence were verified. |
| **sales-advantage** | Next.js standalone Dockerfile + cloudbuild, no CD | ✅ yes | `reading-advantage` / `sales-advantage` (rev `00005-yas`) | 2026-07-19 | **Manual staged monorepo release**, continuation build `342cdc52-871c-4f08-bef0-7ebf38290557` at `2c96be943b647f7f1df5cb6b452f9fcce0041056`, digest `sha256:ab7ca4d4429cad3d81a28fe9b9f85e03c78cb62f2e075142152982e0f7415ce3`; all 15 continuation steps passed, company SSO is at 100%, and verified rollback `00004-jed` is retained at 0%. |


## 2026-07-19 completion checkpoint

- Accounts serves revision `accounts-00007-hxs` at 100%. Shell, health,
  readiness, OIDC discovery, and JWKS return 200; the current source has 32
  active Accounts tests passing, one opt-in database test skipped by default,
  clean type checks, and a successful production build. One isolated zero-second
  logout request returned 503 at 2026-07-19 01:51:22Z without an application
  exception; a subsequent Kimi WebBridge logout completed with HTTP 200 and the
  current revision remained healthy.
- Marketing serves revision `marketing-00013-jil` at 100%. Exact-source build
  `08fd00a1-de86-4f8f-b65d-632832279fa2` passed all 15 release steps. Shell, database
  health, and Accounts readiness return 200; the current source has 301 tests
  passing, clean type checks, and a successful vinext production build. The
  production browser journey created and reloaded a six-scene project, and an
  ordinary Marketing member was denied administrator settings operations. The
  final revision had no ERROR/5xx log entries in the audited window.
- Sales serves company-SSO revision `sales-advantage-00005-yas` at 100%.
  Continuation build `342cdc52-871c-4f08-bef0-7ebf38290557` passed all 15
  steps using the exact approved image, backup, repair manifest, and source
  archive. Health, company-mode readiness, custom-domain mapping, repair
  receipt, mapping/role state, probe cleanup, retained compatibility rollback,
  and clean error logs were independently verified. Exact evidence is recorded
  in the Sales go-live track.

## Deploy-source taxonomy

- **Standalone-repo Cloud Build triggers:** `reading-advantage`, `primary-advantage` (+ a parallel trigger for `www-reading-advantage`).
- **Monorepo GitHub Actions CD:** `www-reading-advantage` only — **currently broken** (fails at the Cloud Build submit step since ~2026-06-18; live rev is therefore stale).
- **Manual `gcloud` only:** `codecamp-advantage`, `accounts`, `marketing`, `sales-advantage`.
- **Not deployed at all:** `advantage-games`, `science-advantage`.

## Not part of this monorepo (but live in GCP)

The `reading-advantage` project also runs a separate microservice fleet that is **not** in the monorepo's `apps/`: `admin-console`, `identity-service`, `learning-service`, `finance-mlm-service`, `student-liff`, `tutor-pwa`. Looks like a newer/parallel architecture; flagged here so a deploy audit doesn't mistake them for monorepo apps. (`tutor-pwa` relates to the separate `tutor-advantage` project.)

## Re-verify (read-only)

```bash
# Cloud Run services per project
for p in www-reading-advantage reading-advantage primary-advantage codecamp-advantage; do
  echo "== $p =="; gcloud run services list --project="$p" --platform=managed 2>&1 | head -20
done

# Who deploys it: Cloud Build triggers (trigger = standalone-repo CI; none = manual)
for p in reading-advantage primary-advantage codecamp-advantage www-reading-advantage; do
  echo "== $p =="
  gcloud builds triggers list --project="$p" --region=asia-southeast1 \
    --format="table(name, github.owner, github.name, filename)" 2>&1 | head
done

# codecamp manual proof: empty buildTriggerId = manual `gcloud builds submit`
gcloud builds list --project=codecamp-advantage --limit=6 \
  --format="table(createTime, status, buildTriggerId)"

# Monorepo www CD health (the only monorepo→GCP path)
gh run list --workflow=cd-www-reading-advantage.yml -L 40 --json conclusion -q '.[].conclusion' | sort | uniq -c
```
