# Accounting DNS Owner Action

## Current state

The Cloud Run mapping for `accounting.reading-advantage.com` exists and routes to service `accounting`.
The mapping remains `CertificatePending` and is not ready.
The existing DNS chain points `accounting.reading-advantage.com` to `www.reading-advantage.com` and then to Google.
Squarespace required an owner login, so the deploy operator could not update the record.

The mapping was created after candidate acceptance but before promotion.
This order lets the promotion script verify the canonical HTTPS origin after its guarded traffic shift.
The service remained IAM-gated, and no traffic moved during mapping creation.

## Required Squarespace record

- Host: `accounting`
- Type: `CNAME`
- Value: `ghs.googlehosted.com.`
- Domain: `reading-advantage.com`

Replace the current `accounting` CNAME target with this exact value.
Keep only one CNAME record for the `accounting` host.

After the change, wait until this command reports `Ready=True` and `CertificateProvisioned=True`:

`gcloud beta run domain-mappings describe --domain=accounting.reading-advantage.com --project=reading-advantage --region=asia-southeast1`

Do not run the promotion script before the canonical HTTPS endpoint is ready.
