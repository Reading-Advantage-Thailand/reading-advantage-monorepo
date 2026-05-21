# Implementation Plan: CodeCamp Advantage — Production QA/QC Testing

## Phase 1: Infrastructure & Deployment Verification (P0)

Verify the production deployment is healthy and accessible.

- [ ] Task: DNS & SSL
  - [ ] `https://codecamp.reading-advantage.com` resolves correctly
  - [ ] SSL certificate is valid (not self-signed, not expired)
  - [ ] HTTP → HTTPS redirect works
  - [ ] HSTS header is present
  - [ ] No mixed content warnings in browser dev tools
- [ ] Task: Cloud Run health
  - [ ] Root URL returns 200
  - [ ] `/api/auth/session` returns 200 (unauthenticated)
  - [ ] Response headers include `X-Cloud-Trace-Context`
  - [ ] No 502/503 errors on cold start
  - [ ] Cold start time is acceptable (< 5 seconds)
- [ ] Task: Security headers
  - [ ] `Content-Security-Policy` header is present and valid
  - [ ] `X-Frame-Options` is set to `DENY` or `SAMEORIGIN`
  - [ ] `X-Content-Type-Options` is `nosniff`
  - [ ] `Referrer-Policy` is set
  - [ ] CORS headers are correct for API routes
- [ ] Task: Container & build verification
  - [ ] Cloud Build trigger completed successfully
  - [ ] Artifact Registry has latest image
  - [ ] Cloud Run revision matches latest commit
  - [ ] No build warnings or errors in Cloud Build logs

## Phase 2: Production Database & Configuration (P0)

Verify Cloud SQL connectivity and data integrity.

- [ ] Task: Database connectivity
  - [ ] App can read from Cloud SQL (dashboard loads)
  - [ ] App can write to Cloud SQL (login updates lastActiveAt)
  - [ ] No connection pool exhaustion errors
  - [ ] Query response times are acceptable (< 500ms for dashboard)
- [ ] Task: Secret Manager
  - [ ] `DATABASE_URL` is sourced from Secret Manager, not hardcoded
  - [ ] `AUTH_SECRET` is sourced from Secret Manager
  - [ ] `OPENROUTER_API_KEY` is sourced from Secret Manager
  - [ ] `GITHUB_WEBHOOK_SECRET` is sourced from Secret Manager
  - [ ] `GITHUB_PRIVATE_KEY` is sourced from Secret Manager
  - [ ] Secrets are not exposed in environment variables or logs
- [ ] Task: Data integrity
  - [ ] Curriculum data matches local seed (18 modules, 85 lessons)
  - [ ] User accounts exist and are functional
  - [ ] Progress data is queryable
  - [ ] No schema drift between local and production

## Phase 3: Authentication & Authorization (P0)

Test auth in production environment.

- [ ] Task: Login flow
  - [ ] Login with valid INTERN credentials → session created
  - [ ] Login with valid ADMIN credentials → session created
  - [ ] Login with invalid credentials → 401, no session
  - [ ] Session cookie is `HttpOnly`, `Secure`, `SameSite`
  - [ ] Session persists across page reloads
  - [ ] Logout clears cookie and redirects
- [ ] Task: Role enforcement
  - [ ] INTERN cannot access `/admin` → 403
  - [ ] ADMIN can access `/admin`
  - [ ] Unauthenticated user redirected to login
  - [ ] tRPC endpoints reject unauthorized requests

## Phase 4: Full Feature Parity (P0)

Run the same critical paths as local QA to catch environment-specific regressions.

- [ ] Task: Dashboard
  - [ ] Loads with correct progress stats
  - [ ] Module locking works correctly
  - [ ] Phase grouping renders correctly
  - [ ] PR review badges display correctly
- [ ] Task: Module & Lesson pages
  - [ ] Module detail page loads with lesson list
  - [ ] Theory lessons render correctly
  - [ ] Exercise lessons accept submissions
  - [ ] Quiz lessons score correctly (>=70% marks completed)
  - [ ] Progress updates after quiz submission
- [ ] Task: Admin panel
  - [ ] Admin dashboard loads with cohort stats
  - [ ] Intern table renders correctly
  - [ ] Create intern form works
  - [ ] Intern detail page shows progress breakdown
- [ ] Task: Internationalization
  - [ ] TH → EN locale switch works
  - [ ] All translated content renders correctly
  - [ ] Thai font loads correctly

## Phase 5: Real External Integrations (P0)

Test integrations that use live external services.

- [ ] Task: OpenRouter AI Tutor (Live)
  - [ ] Chat message returns real AI response (not fallback mock)
  - [ ] Streaming works over HTTPS
  - [ ] Thai input → Thai response
  - [ ] English input → English response
  - [ ] Rate limiting works (30 req/min)
  - [ ] Message persistence saves to Cloud SQL
  - [ ] Context grounding references lesson content
- [ ] Task: GitHub App Webhook (Live)
  - [ ] Webhook delivery to `https://codecamp.reading-advantage.com/webhooks/github/pr` succeeds
  - [ ] Signature verification passes
  - [ ] PR `opened` event creates `codecamp_pr_reviews` row
  - [ ] PR `synchronize` event updates existing row
  - [ ] LLM review is generated and posted to PR
  - [ ] Review status updates correctly (`pending` → `approved`/`needs_changes`)
  - [ ] Unmapped repo / unknown user → ignored gracefully
- [ ] Task: GitHub PR Review End-to-End
  - [ ] Create a real test PR in a configured exercise repo
  - [ ] Webhook fires and app receives it
  - [ ] App fetches PR diff from GitHub API
  - [ ] LLM generates review summary
  - [ ] Review comment is posted to the PR
  - [ ] Review appears in app's ReviewHistory component
  - [ ] Review status badge updates in dashboard/module page

## Phase 6: Performance & Latency (P1)

Test real-world performance over network.

- [ ] Task: Page load times
  - [ ] Dashboard loads in < 3 seconds (cold)
  - [ ] Dashboard loads in < 1 second (warm)
  - [ ] Module page loads in < 2 seconds
  - [ ] Lesson page loads in < 2 seconds
  - [ ] Admin page loads in < 3 seconds
- [ ] Task: API response times
  - [ ] `codecamp.dashboard` tRPC query < 500ms
  - [ ] `codecamp.moduleBySlug` tRPC query < 300ms
  - [ ] `codecamp.lesson` tRPC query < 300ms
  - [ ] `codecamp.submitQuiz` tRPC mutation < 500ms
  - [ ] Chat API response < 5 seconds (first token)
- [ ] Task: Asset loading
  - [ ] Thai font loads correctly (no 404)
  - [ ] Icons and images load correctly
  - [ ] No large unoptimized assets blocking render
  - [ ] JS bundle size is reasonable (< 500KB gzipped main)
- [ ] Task: Mobile network simulation
  - [ ] Dashboard usable on Slow 3G
  - [ ] Quiz submission works on Slow 3G
  - [ ] Chat streaming works on Fast 4G
  - [ ] No timeout errors on slow connections

## Phase 7: Caching & CDN Behavior (P1)

Test cache headers, CDN, and cache invalidation.

- [ ] Task: Static assets
  - [ ] JS/CSS files have long cache headers
  - [ ] Images have appropriate cache headers
  - [ ] Font files have appropriate cache headers
- [ ] Task: Dynamic content
  - [ ] tRPC responses are not incorrectly cached
  - [ ] Authenticated pages are not cached by CDN
  - [ ] Cache invalidation works on new deployment
  - [ ] No stale data shown after deployment update
- [ ] Task: Next.js caching
  - [ ] Static pages have `s-maxage` or `stale-while-revalidate`
  - [ ] Data cache invalidates correctly
  - [ ] No cached error pages served after fix deployment

## Phase 8: Logging, Monitoring & Error Reporting (P1)

Verify observability in production.

- [ ] Task: Cloud Logging
  - [ ] Application logs appear in Cloud Logging
  - [ ] Error logs have stack traces
  - [ ] tRPC error logs include procedure name and input
  - [ ] Request logs include latency and status code
- [ ] Task: Error handling
  - [ ] 404 errors return proper Next.js error page
  - [ ] 500 errors return proper error page (not stack trace)
  - [ ] tRPC errors return sanitized messages to client
  - [ ] Database connection errors are logged and recovered
- [ ] Task: Alerts (if configured)
  - [ ] High error rate triggers alert
  - [ ] High latency triggers alert
  - [ ] Database connection issues trigger alert

## Phase 9: GitHub Webhook Specifics (P1)

Test webhook behavior in production environment.

- [ ] Task: Webhook delivery
  - [ ] GitHub webhook settings show successful deliveries
  - [ ] No failed deliveries in GitHub webhook history
  - [ ] Payload is correctly parsed
  - [ ] Response time is < 10 seconds (GitHub timeout)
- [ ] Task: Webhook security
  - [ ] Invalid signature returns 401
  - [ ] Missing signature returns 401
  - [ ] Replay attacks prevented (timestamp check if implemented)
- [ ] Task: Webhook resilience
  - [ ] App handles webhook during cold start
  - [ ] App handles concurrent webhook deliveries
  - [ ] Failed webhook processing is logged

## Phase 10: Edge Cases & Production-Specific Scenarios (P2)

Test scenarios unique to or more likely in production.

- [ ] Task: Concurrent users
  - [ ] Multiple users login simultaneously → no session conflicts
  - [ ] Multiple users submit quizzes simultaneously → no race conditions
  - [ ] Multiple users chat simultaneously → rate limits isolated per user
- [ ] Task: Long-running sessions
  - [ ] Session remains valid for expected duration
  - [ ] Session refresh works correctly
  - [ ] No "session expired" errors during normal use
- [ ] Task: Data volume
  - [ ] Large chat history loads without timeout
  - [ ] Many PR reviews render without performance degradation
  - [ ] Admin intern table with many rows renders correctly
- [ ] Task: Deployment during use
  - [ ] Zero-downtime deployment (no 503 during rollout)
  - [ ] In-flight requests complete during deployment
  - [ ] New revision takes traffic correctly

## Phase 11: Cross-Browser & Device Testing (P2)

Test across different clients.

- [ ] Task: Desktop browsers
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
- [ ] Task: Mobile browsers
  - [ ] Chrome on Android
  - [ ] Safari on iOS
  - [ ] Samsung Internet
- [ ] Task: Device sizes
  - [ ] iPhone SE (375px)
  - [ ] iPad (768px)
  - [ ] Desktop (1440px)
  - [ ] Large desktop (1920px)

## Phase 12: Regression Against Local QA (P0)

Compare production results to local QA and flag discrepancies.

- [ ] Task: Feature parity check
  - [ ] All P0 local QA tests pass in production
  - [ ] All P1 local QA tests pass in production
  - [ ] No production-only failures in P0/P1 areas
- [ ] Task: Known local issues
  - [ ] Any local QA bugs are verified fixed or still present in production
  - [ ] No new bugs introduced in production
- [ ] Task: Data consistency
  - [ ] Production data matches expected seed state
  - [ ] No data corruption during migration
  - [ ] User progress data is accurate

## Phase 13: Production Readiness Report (P0)

Document findings and sign off on production readiness.

- [ ] Task: Compile results
  - [ ] Count P0 passes / fails in production
  - [ ] Count P1 passes / fails in production
  - [ ] Count P2 passes / fails in production
  - [ ] Document all production-only issues
  - [ ] Document performance metrics
  - [ ] Document integration test results
- [ ] Task: Blocker assessment
  - [ ] Identify any P0 failures that must be fixed before public launch
  - [ ] Identify any P1 failures that should be fixed before public launch
  - [ ] Create follow-up tickets for each blocker
- [ ] Task: Sign-off
  - [ ] Product owner review of QA report
  - [ ] Engineering lead review of blockers
  - [ ] Go / no-go decision documented
  - [ ] Track status updated to complete or deferred

---

**Priority Legend:**
- **P0 (Critical)**: Must pass before public launch. Core functionality, auth, data integrity, deployment health.
- **P1 (High)**: Should pass before public launch. Performance, integrations, monitoring.
- **P2 (Medium)**: Nice to have. Edge cases, cross-browser, polish.
- **P3 (Low)**: Minor issues, cosmetic, documentation.

**Production-Specific Focus Areas:**
1. **Infrastructure**: DNS, SSL, Cloud Run, cold starts
2. **Integrations**: Real OpenRouter, real GitHub App, live webhooks
3. **Security**: Headers, CORS, secrets management
4. **Performance**: Network latency, asset loading, mobile networks
5. **Observability**: Logging, error reporting, monitoring
