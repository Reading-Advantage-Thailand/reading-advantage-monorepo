# GitHub App Setup Guide

This document describes how to configure the GitHub App integration for automatic PR review in CodeCamp Advantage.

## Prerequisites

- Organization owner access to the `Reading-Advantage-Thailand` GitHub organization
- A GitHub App registered under the organization

## Registering a GitHub App

1. Go to **Settings → Developer settings → GitHub Apps** in the `Reading-Advantage-Thailand` org
2. Click **New GitHub App**
3. Fill in the app name (e.g., `Reading Advantage Codecamp Reviewer`)
4. Set **Homepage URL** to `https://codecamp.reading-advantage.com`
5. Set **Webhook URL** to `https://codecamp.reading-advantage.com/webhooks/github/pr`
6. Generate a **Webhook secret** and save it securely
7. Under **Permissions → Repository permissions**, enable:
   - **Contents**: Read-only
   - **Pull requests**: Read and write
   - **Issues**: Read-only
8. Under **Subscribe to events**, select **Pull request**
9. Create the app and note the **App ID**
10. Generate and download a **private key** (`.pem` file)

## Installing the App

1. From the GitHub App settings page, click **Install App**
2. Select the `Reading-Advantage-Thailand` organization
3. Choose **All repositories** or select only the exercise and portfolio repos:
   - All `codecamp-exercise-*` repos (15 repos)
   - `codecamp-portfolio-website`
   - `codecamp-learning-dashboard`
   - `codecamp-progress-tracker`
4. Click **Install**
5. Note the **Installation ID** from the URL or API

## Environment Variables

Add the following to `apps/codecamp-advantage/.env.local` (and to your deployment environment):

```env
# GitHub App (for PR review webhooks)
GITHUB_APP_ID="<your-app-id>"
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET="<your-webhook-secret>"
GITHUB_INSTALLATION_ID="<your-installation-id>"

# LLM provider (for automated code review)
OPENROUTER_API_KEY="<your-openrouter-key>"
```

> **Note:** The private key must include literal `\n` characters or be base64-encoded depending on your deployment platform. For local development, you can paste the key with actual newlines wrapped in quotes.

## Webhook Verification

The webhook endpoint is at `POST /webhooks/github/pr`. It:

1. Verifies the `x-hub-signature-256` header using `GITHUB_WEBHOOK_SECRET`
2. Validates the payload against a Zod schema
3. Creates or updates a `codecamp_pr_reviews` record
4. Triggers an async LLM review pipeline

### Testing the Webhook Locally

Use the test suite:

```bash
pnpm turbo run test --filter=@reading-advantage/webhooks
```

Or send a test event with curl:

```bash
SECRET="your-webhook-secret"
PAYLOAD='{"action":"opened","pull_request":{"html_url":"https://github.com/Reading-Advantage-Thailand/codecamp-exercise-git-github/pull/1","head":{"ref":"feature","sha":"abc123"},"base":{"ref":"main","repo":{"full_name":"Reading-Advantage-Thailand/codecamp-exercise-git-github","html_url":"https://github.com/Reading-Advantage-Thailand/codecamp-exercise-git-github"}},"user":{"login":"intern1"}}}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

curl -X POST http://localhost:3000/webhooks/github/pr \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -H "x-hub-signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

## Reference Implementation

The webhook handler lives in `packages/webhooks/src/github.ts`.
The GitHub API client lives in `packages/webhooks/src/github-client.ts`.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `Invalid signature` | Wrong webhook secret | Verify `GITHUB_WEBHOOK_SECRET` matches GitHub App settings |
| `No matching exercise repo` | Repo URL not in DB | Run seed or `linkExerciseRepo` mutation to register the repo |
| `No matching codecamp user` | GitHub username not linked | Ensure intern account has matching GitHub username in profile |
| LLM review not posting | Missing `OPENROUTER_API_KEY` | Set the API key; the pipeline will return a mock review if missing |
| `Failed to get installation token` | Wrong `GITHUB_INSTALLATION_ID` | Verify the installation ID from the GitHub App install page |
