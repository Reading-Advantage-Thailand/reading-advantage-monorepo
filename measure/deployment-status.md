# Deployment Status — GCP Cloud Run

> **Verified 2026-07-18** via `gcloud` (account `bodangren@gmail.com`). Timestamps and revisions go stale — **re-run the commands at the bottom; don't trust the dates blind.**

## The one-line answer

The monorepo (`bodangren/reading-advantage-monorepo`) is **not** the deploy source for most legacy live apps. Those services are fed by the **original standalone `Reading-Advantage-Thailand/*` GitHub repos** via Cloud Build triggers. Codecamp and Marketing are verified manual monorepo Cloud Build deployments; they do not yet have repository triggers.

## Per-app deployment map

| Monorepo app | Deploy config in monorepo | Live on Cloud Run? | GCP project / service | Last deploy | **Deploy source** |
|---|---|---|---|---|---|
| **www-reading-advantage** | Dockerfile + cloudbuild + **GitHub CD workflow** (`cd-www-reading-advantage.yml`) | ✅ yes | `www-reading-advantage` / `www-reading-advantage` (rev 00192) | 2026-06-17 | **Monorepo GH Actions CD** (30 ok / 10 fail of last 40) — **failing since ~2026-06-18**. A standalone Cloud Build trigger also exists, so provenance is dual. |
| **reading-advantage** | Dockerfile + cloudbuild, **no CD** | ✅ yes | `reading-advantage` / `reading-advantage-web` | 2026-06-25 | **Standalone repo** `Reading-Advantage-Thailand/reading-advantage` — Cloud Build triggers `Main` + `deploy-test`, filename `web/cloudbuild.yaml`. |
| **primary-advantage** | Dockerfile + cloudbuild, no CD | ✅ yes | `primary-advantage` / `primary-advantage-app` | 2026-05-30 | **Standalone repo** `Reading-Advantage-Thailand/primary-advantage` — Cloud Build trigger `primary-advantege-prod`. |
| **codecamp-advantage** | Dockerfile + cloudbuild, no CD | ✅ yes | `codecamp-advantage` / `codecamp-advantage` (rev 00017) | 2026-06-11 | **Manual `gcloud builds submit`** — no trigger in any region; every build has an empty `buildTriggerId`; builds run in the `global` region. See tech-debt 2026-05-18. |
| **science-advantage** | none | ❌ Cloud Run API not enabled on the project | never | — | Not deployed. |
| **advantage-games** | none | ❌ | never | — | Not deployed. |
| **marketing** | vinext Dockerfile + cloudbuild, no CD | ✅ yes | `reading-advantage` / `marketing` (rev `00002-xxb`) | 2026-07-18 | **Manual monorepo `gcloud builds submit`**, build `7a6597f5-5a51-406e-98c5-5e264b8358bf`; `https://marketing.reading-advantage.com` is live with managed HTTPS. |
| **sales-advantage** | none | ❌ | never | — | Not deployed. |

## Deploy-source taxonomy

- **Standalone-repo Cloud Build triggers:** `reading-advantage`, `primary-advantage` (+ a parallel trigger for `www-reading-advantage`).
- **Monorepo GitHub Actions CD:** `www-reading-advantage` only — **currently broken** (fails at the Cloud Build submit step since ~2026-06-18; live rev is therefore stale).
- **Manual `gcloud` only:** `codecamp-advantage`, `marketing`.
- **Not deployed at all:** `advantage-games`, `sales-advantage`, `science-advantage`.

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
