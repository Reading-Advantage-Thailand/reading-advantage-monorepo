# @reading-advantage/integrations-github

GitHub App REST client for the Reading Advantage monorepo.

## Usage

```ts
import { getGitHubClient } from "@reading-advantage/integrations-github";

const github = getGitHubClient();

// List practice issues (excluding pull requests)
const issues = await github.getPracticeIssues("owner", "repo", {
  state: "open",
  perPage: 20,
});

// Get installation token for a repo
const token = await github.getInstallationTokenForRepo("owner", "repo");

// List repos accessible by the installation
const repos = await github.listRepositoriesForInstallation("12345");
```

## Configuration

Set these environment variables:

| Env Var | Required | Description |
|---------|----------|-------------|
| `GITHUB_APP_ID` | Yes | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | GitHub App private key (PEM format) |
| `GITHUB_INSTALLATION_ID` | No | Default installation ID (single-org) |

`GITHUB_APP_PRIVATE_KEY` is also accepted as an alias for `GITHUB_PRIVATE_KEY`.

## Auth Flow

The client uses GitHub App authentication:

1. Signs a JWT with the App ID and private key (RS256)
2. Exchanges the JWT for an installation access token
3. Caches the token until near expiry (refreshes 60s before)
4. Uses the installation token for all API calls

## Testing

Tests use `vitest` with mock factories. No real GitHub API calls are made.

```bash
pnpm --filter @reading-advantage/integrations-github test
```
