# Specification: CodeCamp Advantage — Local QA/QC Testing

## Overview

Execute a comprehensive local QA/QC test pass of `apps/codecamp-advantage` running against the local development environment. The goal is to verify every user-facing feature works correctly in the local environment, establish a regression baseline for the production QA track, and identify any code-level bugs before deployment.

This track is the local counterpart to `codecamp_qa_prod_20260517`. While the production track catches environment-specific problems, this track catches **code and data bugs**.

## Context

- **Local URL:** `http://localhost:3000`
- **Platform:** Next.js dev server
- **Database:** Local PostgreSQL via Docker
- **Container:** Docker Compose
- **Secrets:** `.env.local`
- **AI:** OpenRouter API (live key or fallback mock)
- **GitHub:** Test webhook delivery via local tunnel or ngrok

## Prerequisites

- [ ] Local PostgreSQL running (`pnpm db:start`)
- [ ] Database migrated and seeded
- [ ] Dev server running (`pnpm dev`)
- [ ] At least one ADMIN account in local database
- [ ] At least one INTERN account in local database
- [ ] `OPENROUTER_API_KEY` configured (or fallback mode accepted)
- [ ] `GITHUB_WEBHOOK_SECRET` configured for local testing

## Scope

### In Scope

- Authentication flows (login, logout, session, role enforcement)
- Dashboard rendering and data accuracy
- Module and lesson navigation
- Theory lesson rendering
- Exercise lesson submissions
- Quiz scoring (70% threshold) and progress updates
- Admin panel (intern management, cohort stats)
- Internationalization (TH/EN locale switching, Thai font)
- AI tutor chat (OpenRouter integration)
- GitHub webhook processing (PR review pipeline)
- Responsive design across breakpoints
- Error handling and edge cases

### Out of Scope

- Production infrastructure (DNS, SSL, Cloud Run, Cloud SQL)
- Performance benchmarking (covered by prod track)
- CDN/cache behavior (covered by prod track)
- Security header validation (covered by prod track)
- Cross-browser visual testing (covered by prod track)

## Acceptance Criteria

- [ ] All P0 (Critical) local test cases pass
- [ ] All P1 (High) local test cases pass
- [ ] P2 and P3 test cases are executed with findings documented
- [ ] Known local issues are documented with severity and status
- [ ] No regressions introduced during development
- [ ] Results are captured in a structured format for Phase 12 regression comparison
