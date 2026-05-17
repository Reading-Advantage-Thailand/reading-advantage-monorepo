# Specification: CodeCamp Advantage — Production QA/QC Testing

## Overview

Execute a comprehensive manual QA/QC test pass of `apps/codecamp-advantage` on the **deployed production server**. The goal is to verify every user-facing feature works correctly in the production environment, identify production-only issues (infrastructure, networking, integrations, configuration), and validate that the deployment pipeline produced a working service.

This track is the production counterpart to `codecamp_qa_local_20260517`. While the local track catches code/data bugs, this track catches **environment-specific** problems.

## Context

- **Production URL:** `https://codecamp.reading-advantage.com`
- **Platform:** Google Cloud Run (`asia-southeast1`)
- **Database:** Cloud SQL PostgreSQL (`reading-advantage:asia-southeast1:cloud-sql`)
- **Container:** Docker image built via Cloud Build
- **Secrets:** Google Secret Manager
- **DNS:** Squarespace (`reading-advantage.com`)
- **CDN/Cache:** Cloud Run edge + Next.js cache headers
- **AI:** OpenRouter API (live, not fallback)
- **GitHub:** Live GitHub App with webhook delivery to production URL

## Prerequisites

- [ ] Production Cloud Run service is deployed and running
- [ ] DNS records are propagated (`codecamp.reading-advantage.com` resolves)
- [ ] SSL certificate is valid
- [ ] Database is migrated and seeded with curriculum data
- [ ] At least one ADMIN account exists in production database
- [ ] At least one INTERN account exists in production database
- [ ] `OPENROUTER_API_KEY` is configured in Secret Manager
- [ ] `GITHUB_WEBHOOK_SECRET` is configured in Secret Manager
- [ ] GitHub App webhook URL points to `https://codecamp.reading-advantage.com/webhooks/github/pr`

## Scope

### In Scope

- Infrastructure & deployment verification (HTTPS, DNS, SSL, headers)
- Cloud Run specific behavior (cold starts, scaling, timeouts)
- Production database connectivity and performance (Cloud SQL)
- Real external integrations (OpenRouter AI, GitHub App)
- Secret Manager configuration validation
- Production-specific security (CSP headers, CORS, HSTS)
- Performance & latency over real network
- CDN/cache behavior and cache invalidation
- Logging, monitoring, and error reporting in production
- Full feature parity validation against local QA results
- GitHub webhook end-to-end (open real PR, verify review)
- Email/notifications (if applicable)
- Mobile network performance (3G/4G simulation)

### Out of Scope

- Load/stress testing (beyond basic concurrent user checks)
- Security penetration testing
- Disaster recovery / backup testing
- Multi-region deployment testing
- Automated E2E test suite creation

## Acceptance Criteria

- [ ] All P0 (Critical) production test cases pass
- [ ] All P1 (High) production test cases pass
- [ ] P2 and P3 test cases are executed with findings documented
- [ ] Production-only issues are identified, logged, and ticketed
- [ ] No P0 regressions compared to local QA results
- [ ] A production readiness report is produced
- [ ] GitHub webhook delivers and processes real PR events successfully
- [ ] AI tutor responds with live OpenRouter integration (not fallback)
