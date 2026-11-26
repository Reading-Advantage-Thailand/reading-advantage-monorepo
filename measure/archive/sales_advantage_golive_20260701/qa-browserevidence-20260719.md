# Sales browser QA evidence — 2026-07-19

Status: **blocked at company SSO**. The browser stack was available, but the
company credential did not reach a login wall. Per instruction, no blind retry
was made after the OIDC failure.

## Evidence

### 1. Public Sales entrypoint

- URL: `https://sales.reading-advantage.com/th`
- Action: Opened the Sales domain with Kimi WebBridge session `sales-qa`.
- Exact result: Page rendered `Sales Advantage`, Thai heading `เข้าสู่ระบบ`, and
  `Use your Reading Advantage company account to continue.` with login link.
- Screenshot: `qa-screenshots/01-oidc-session-invalid.png` (captured after the
  resulting OIDC error).

### 2. Company SSO handoff — blocker

- URL: `https://sales.reading-advantage.com/th` → Accounts OIDC authorize URL.
- Action: Clicked the rendered `เข้าสู่ระบบ` link once.
- Exact result: Accounts returned HTTP-level page content:
  `{"error":"SESSION_INVALID","message":"Sign-in is required."}`
  at `https://accounts.reading-advantage.com/api/oidc/authorize?...`.
- Screenshot: `qa-screenshots/01-oidc-session-invalid.png`.
- Finding: No Accounts credential form appeared, so the supplied
  `qa-sales-mrql5cuh` credential could not be entered. This is an OIDC/session
  failure requiring escalation, not a credential retry.

### 3. Production boundary smoke (unauthenticated)

- URL: `https://sales.reading-advantage.com/api/health`
- Action: `curl -i` GET.
- Exact response: `HTTP/2 200`; body
  `{"status":"alive","service":"sales-advantage"}`.

- URL: `https://sales.reading-advantage.com/api/ready`
- Action: `curl -i` GET.
- Exact response: `HTTP/2 200`; body has `status: ready`, `service:
  sales-advantage`, `mode: company`, `database: ready`, `accounts: ready`, and
  request ID `f5327edc-912e-49bd-99ea-a21c03a6cf10`.

- URL: `https://sales.reading-advantage.com/api/auth/session`
- Action: `curl -i` GET without a session.
- Exact response: `HTTP/2 200`; body `{"session":null}`.

- URL: `https://sales.reading-advantage.com/api/roleplay-attempts`
- Action: `curl -i -X POST` without a session.
- Exact response: `HTTP/2 401`; body `{"error":"Unauthorized"}`.

## Contract cross-checks (not browser-verified)

These checks document expected behavior only; authentication blocked execution.

- **Curriculum:** `curriculum-approval.md` records the approved six modules and
  27 reviewed lessons. Scenario-list, lesson, progress, and admin journeys were
  not reached.
- **Streaming chat:** `apps/sales-advantage/app/api/chat/route.ts` imports
  `getAIClient` from `@reading-advantage/ai`, calls `aiClient.streamText`, and
  uses company authentication. A live stream and provider/non-mock assertion
  were blocked by SSO.
- **Audio/evaluation:** `roleplay-attempts/route.ts` uses the AI and storage
  adapters, returns evaluation JSON on success, and enforces consent and media
  boundaries. Recording/upload, contracted evaluation, and persistence were
  blocked by SSO.
- **Rate limit:** `roleplay-attempts/route.ts` documents 10 submissions/hour and
  the exact expected response: HTTP 429, JSON error `ROLEPLAY_RATE_LIMITED`, and
  `Retry-After` header. Deliberate excess-session testing was blocked; no 429 is
  claimed.
- **Rollback:** The documented command was verified in
  `production-continuation-20260719.md` lines 70–75 and was **not executed**:
  `gcloud run services update-traffic sales-advantage --region=asia-southeast1
  --to-revisions=sales-advantage-00004-jed=100`.

## Feature outcome

### Verified

- Public Sales entrypoint renders.
- Production health and readiness return 200 in company mode.
- Unauthenticated protected API behavior returns the expected 401.
- Rollback command exists in release documentation and was not run.

### Blocked

- Dummy company SSO login (`qa-sales-mrql5cuh`); OIDC `SESSION_INVALID`.
- Ordinary-rep dashboard and 27-lesson scenario list.
- Audio recording/upload, contracted evaluator review, and progress persistence.
- Admin denial journey.
- Live company-mode streaming chat with AI adapter/no mock fallback.
- Deliberate rate-limit trigger and HTTP 429/`Retry-After` verification.
