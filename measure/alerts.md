# Alert Policies

> Alert policies for Reading Advantage production services are configured
> out-of-band in the GCP project via Cloud Console / `gcloud`. This file
> documents the policies so the repo has a single source of truth for
> what is monitored and how on-call responds.
>
> Per Phase 8 plan (`codecamp_qa_prod_20260517`), alert-policy artifacts
> are informational — the P1 launch gate does not depend on them.

## Cloud Run — codecamp-advantage

| Policy | Condition | Threshold | Channel |
|--------|-----------|-----------|---------|
| High error rate | `httpResponse.code >= 500` ratio > 1% over 5 min | 1% / 5 min | GCP Cloud Console email |
| High latency | `request.latencies` p95 > 5 s over 5 min | 5 s p95 / 5 min | GCP Cloud Console email |
| Container startup failure | `container/startup_latencies` timeout | 1 failure | GCP Cloud Console email |

## Cloud SQL — reading-advantage

| Policy | Condition | Threshold | Channel |
|--------|-----------|-----------|---------|
| Connection exhaustion | `database/postgresql/num_backends` > 80% of max | 80% / 5 min | GCP Cloud Console email |
| Disk usage | `database/disk/bytes_used` > 80% capacity | 80% / 5 min | GCP Cloud Console email |

## Notes

- All alerts route to the GCP project owner email notification channel.
- Alert policies are managed via GCP Cloud Console; no Terraform or
  `gcloud monitoring` CLI scripts are committed to this repo.
- To add or modify alerts, use [Cloud Monitoring > Alerting](https://console.cloud.google.com/monitoring/alerting).
