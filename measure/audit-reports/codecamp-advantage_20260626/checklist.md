# CodeCamp Advantage — Production-Readiness Checklist

- Track: `codecamp_advantage_review_20260626`
- Derived from the 11 line-review batches. Read-only; **no remediation performed or claimed**. Acceptance/closeout **PENDING**.
- Status legend: **PASS** (confirmed good) · **AT-RISK** (defect/gap found) · **FAIL** (confirmed broken as written) · **UNVERIFIED** (needs live/runtime confirmation).
- Every row cites source batch finding ID(s).

## Core runtime correctness

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 1 | Codecamp domain reads/writes succeed against real DB | **FAIL** (as written) / **UNVERIFIED** (live) | B10-001, B09-001, B08-001 | REFERENTIAL tables accessed via TenantDB without `unscoped()`; confirmed against compiled build + unit suite, not live app |
| 2 | Webhook PR-review pipeline functional end-to-end | **FAIL** (as written) | B10-001 | First domain call throws `TenantScopeError` → HTTP 500 per real event |
| 3 | AI chat streaming works end-to-end | **AT-RISK / UNVERIFIED** | B00-001, B04-019 | Protocol mismatch + no SSE buffering; only non-stream fallback confirmed-plausible |
| 4 | Quiz scoring / progression server-authoritative | **AT-RISK** | B00-028, B09-019/023, B07-031 | Threshold 70 vs UI 80; sticky-complete but score overwritten; exact-string grading |
| 5 | Module/lesson progression gating enforced server-side | **AT-RISK / UNVERIFIED** | B00-024, B09-007, B04-016 | Lock is client-side; prereq logic order-fragile; deep-link bypass possible |

## Authentication & authorization

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 6 | Admin routes enforce role server-side (not just UI) | **PASS (server) / AT-RISK (defense-in-depth)** | B07-028, B07-006, B00-013, B01-041 | `adminProcedure`/`assertCan` exist; UI gating is presentation only |
| 7 | tRPC procedures all declare `.output()` schemas | **AT-RISK** | B07-026, B09-051 | `updateInternGithubUsername`, `markTheoryLessonComplete` omit output schema |
| 8 | System/webhook completion authorizes the real caller | **FAIL** | B09-014 | `completeApprovedPrReviewLesson` forges UserContext, bypasses auth |
| 9 | Password policy enforced server-side | **AT-RISK** | B00-020, B08-030 | Length only at Zod boundary; domain bypassable; client check minimal |
| 10 | Intern creation works under any admin tenant | **AT-RISK** | B08-003 | FLAT insert `schoolId:null` throws for non-null-school admin |
| 11 | Tenant isolation enforced | **AT-RISK / UNVERIFIED** | B07-030, CR-1 | All codecamp tables REFERENTIAL; isolation in domain query code only |

## GitHub / webhook integration

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 12 | Webhook signature verification | **PASS** | B10-011, B09-060 | HMAC-SHA256 + timingSafeEqual, fail-closed |
| 13 | Webhook replay protection active for real deliveries | **FAIL** | B10-003 | GitHub sends no timestamp header/field → check never runs |
| 14 | Webhook idempotency / dedup | **FAIL** | B07-039 | No UNIQUE(delivery_id), no ON CONFLICT |
| 15 | Webhook ACK within GitHub ~10s timeout | **AT-RISK** | B10-002, B04-006 | Synchronous LLM review blocks ACK |
| 16 | Credential-missing fails closed | **FAIL** | B10-007 | Fabricates mock diff → can auto-complete lesson |
| 17 | GitHub token scoped per installation | **FAIL** | B09-040 | Single cached token leaks across installations |
| 18 | Single GitHub App adapter | **AT-RISK** | B09-049 | Two divergent implementations |
| 19 | Uniqueness constraints present at table creation | **AT-RISK** | B07-034, B07-038 | pr_url/repo_url backfilled in 0010; deploy can halt on dups |

## AI integration

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 20 | AI access via internal adapter (no provider SDK in domain/server) | **PASS** | B07-017, B09-027 | `getAIClient()` + `aiClientToGenerateReview` |
| 21 | App layer avoids configuring provider/baseURL | **AT-RISK** | B00-003/004 | Chat route wires OpenRouter baseURL/model + module-load client |
| 22 | Prompt-injection / cost controls | **AT-RISK** | B09-028, B07-025 | Prompt-only mitigation; diff bounded at router (50k) but output unbounded |
| 23 | Rate limiter durable across replicas | **FAIL** | B00-002, B04-023 | In-memory Map per instance |

## Deploy / infrastructure

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 24 | Cloud Run ingress minimal | **AT-RISK** | B01-017 | Public + redundant `allUsers` binding |
| 25 | `NEXT_PUBLIC_*` correctly build-time injected | **UNVERIFIED** | B01-021 | Set as runtime env; may be wrong in client bundle |
| 26 | Dockerfile layer caching / `.dockerignore` / pnpm pin | **AT-RISK** | B00-044/045/046 | Full source copy before install; confirm `.dockerignore`; pnpm 8.15.8 vs root |
| 27 | Security headers (CSP/HSTS/XFO/etc.) | **PASS (with refinements)** | B06-022, B06-019/020 | Strong baseline; CSP allows unsafe-inline/eval; single CORS origin |
| 28 | `phase` column constrained to A–D | **FAIL** | B07-036 | Free text default 'A' |
| 29 | Enum migration safety (`ALTER TYPE`) | **AT-RISK** | B07-042 | Txn/irreversibility hazard on older PG |
| 30 | Health/readiness probes | **AT-RISK** | B10-012, B10-013 | Liveness only; no readiness/DB probe; no graceful shutdown |

## Observability

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 31 | Structured logging on errors | **PASS (partial)** | B04-028, B08-027 | proxy/api structured; github-issues uses `console.warn` |
| 32 | Audit logging for security-sensitive events | **AT-RISK / UNVERIFIED** | B00-011, B09-054 | Reset-password handler unseen; webhook outcome enum lacks "processed" |
| 33 | Client error boundary reaches server logs | **AT-RISK** | B01-004 | Client `console.error` not captured by Cloud Logging |

## Testing & CI

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 34 | Tests catch tenant-scope regressions | **FAIL** | B08-002/033, B09-002 | Codecamp tables EXEMPT under Vitest |
| 35 | Unit run does not hit live production | **FAIL** | B03-001/002 | Prod-smoke matched by default glob |
| 36 | Mutation/E2E probes structurally exercise mutations | **FAIL** | B03-041 | phase-4 trpcPost sends no body |
| 37 | Launch gates consistent with go/no-go state | **FAIL** | B03-030, B03-004 | Phase-13 gate green while `overall:no-go` |
| 38 | GitHub driver behavior covered | **AT-RISK** | B09-037, B09-057 | Driver parse/filter/token-cache untested; crypto.sign mocked |
| 39 | Domain `assertCan` / scoping covered | **AT-RISK** | B07-020, CR-2 | Router tests mock domain; scoping masked |

## Documented launch posture

| # | Item | Status | Source IDs | Note |
|---|------|--------|-----------|------|
| 40 | `report-summary.json` overall decision | **no-go (2 open P0)** | B03-004/030, B04-004 | `B-AI-001` live AI tutor unverified; `B-GH-001` PR-review E2E unverified |
| 41 | Prod runbook executed at least once | **UNVERIFIED** | B02-010 | "Last verified: pending first run" |

## Overall

- **Not production-ready as reviewed.** At least 12 FAIL rows (several Critical/High) and numerous AT-RISK/UNVERIFIED items remain.
- The Critical tenant-scoping defect (rows 1–2, 34) is the gating item; it must be confirmed against the deployed artifact and resolved before any acceptance.
- This checklist is **input to** the acceptance phase; it does **not** constitute acceptance or sign-off. Acceptance/closeout **PENDING**.
