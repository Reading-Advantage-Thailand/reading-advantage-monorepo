# CodeCamp Advantage — Consolidated Findings

- Track: `codecamp_advantage_review_20260626`
- Deduplicated, severity-ranked synthesis of all 11 batch reports (2,401 lines, 209 files).
- Read-only review. **No source code was edited and no remediation was performed or is claimed.** Acceptance/closeout **PENDING**.
- Every finding cites its **source batch ID(s)** → anchors live in `line-review/cc-batch-NN.md`.
- Findings are separated into **§1 Live runtime/code** and **§2 Curriculum/docs/test-fixture**. Positive confirmations are in **§3**.

Severity legend: Critical / High / Medium / Low / Info (unified across batches; see `00-inventory.md`).

---

# §1 — LIVE RUNTIME / CODE FINDINGS

## CRITICAL

### CR-1 — Codecamp domain functions access REFERENTIAL tables through TenantDB → `TenantScopeError` at runtime
- **Source IDs:** `F-CC-B10-001`, `F-CC-B09-001` (+ `-003/-006/-013/-020/-025`), `F-CC-B08-001`.
- **Where:** `pr-reviews.ts`, `exercises.ts`, `lessons.ts`, `modules.ts`, `quizzes.ts`, `progress.ts` (`getUserDashboard` chat query), `chat.ts` reads, `intern-accounts.ts` (`listInterns`/`getInternProgress`). Callers pass real `ctx.tenantDb` (`packages/api/src/context.ts:71`, `routers/codecamp.ts`).
- **Effect:** All codecamp tables are `REFERENTIAL` (`tenant-registry.ts:184-193`); `createTenantDB` throws on select/insert/update against them. Functions that omit `unscoped(...)` throw at runtime. Webhook PR-review pipeline returns HTTP 500 for every real event; module/lesson browse, quiz submit, PR-review CRUD, dashboard recent-conversations all implicated.
- **Evidence:** Empirically reproduced against compiled `dist/` and via domain unit suite (`63 failed / 27 passed`, all `TenantScopeError`). Sibling functions (`review-exercise.ts:118`, `chat.ts:16`, `progress.ts:20`, `modules.ts:154`) correctly use `unscoped()`, confirming inconsistent omission.
- **Caveat:** Confirmed against compiled build + unit suite, **not** a live Postgres/app. Owning track must confirm against deployed artifact before treating as release blocker.

### CR-2 — Tenant-scope enforcement is untestable in current suites (false-green)
- **Source IDs:** `F-CC-B08-002`, `F-CC-B08-033`, `F-CC-B09-002`.
- **Where:** `packages/domain/src/__tests__/vitest.setup.ts` globally mocks `tenant-registry`; codecamp tables classify `EXEMPT` under Vitest but `REFERENTIAL` in the compiled build.
- **Effect:** Every codecamp domain test exercises the non-scoped path; the suite cannot regression-guard the single most security-sensitive property (multi-tenant isolation) and masks CR-1.

> CR-1 and CR-2 are listed Critical because the defect is production-fatal as written and the test layer is structurally blind to it. Live-runtime confirmation is the gating verification.

## HIGH

### H-1 — AI chat streaming protocol mismatch breaks live streaming end-to-end
- **Source IDs:** `F-CC-B00-001`; related `F-CC-B04-019` (no cross-chunk SSE buffering).
- `route.ts` `toDataStreamResponse()` is aliased to `toTextStreamResponse()` → raw `text/plain`; client hook expects `text/event-stream`/`0:`-prefixed lines → falls to `res.json()` on a stream → throws → generic error UI. Only the no-API-key non-streaming fallback works. **Verify at runtime.**

### H-2 — Synchronous LLM review inside webhook request path vs GitHub ~10s timeout
- **Source IDs:** `F-CC-B10-002`, `F-CC-B04-006`.
- `await runReview()` blocks the ACK on token+diff+LLM+DB+comment. Timeout → GitHub redelivers → duplicate reviews/comments/completions. AGENTS "Jobs and Workers" violation.

### H-3 — `fetchPrDiff` fabricates a mock diff when no token → can auto-complete lessons
- **Source IDs:** `F-CC-B10-007`, `F-CC-B09-058`.
- Missing installation token → fake diff → LLM "review" → `passed:true` → `completeApprovedPrReviewLesson` marks lesson completed @ score 100 on a fabricated diff. Fails open.

### H-4 — `completeApprovedPrReviewLesson` forges a UserContext and bypasses authorization
- **Source ID:** `F-CC-B09-014`.
- Synthesizes `{id:review.userId, role:"INTERN", schoolId:null}` and runs `assertCan` against the fabricated principal, not the real admin caller. Impersonation primitive in domain code.

### H-5 — GitHub installation token cache leaks across installations
- **Source ID:** `F-CC-B09-040`; doc mismatch `F-CC-B09-032`.
- `integrations/github` REST driver caches a single token regardless of `installationId`; multi-org install returns wrong-scoped token → cross-installation data exposure.

### H-6 — No UNIQUE on `delivery_id`; webhook dedup is best-effort → idempotency gap
- **Source ID:** `F-CC-B07-039`.
- Nullable `text`, no `ON CONFLICT`. GitHub retries → duplicate processing/rows. AGENTS idempotency requirement unmet.

### H-7 — Uniqueness constraints backfilled in 0010; migration can halt on duplicates
- **Source IDs:** `F-CC-B07-034`, `F-CC-B07-038`.
- `pr_url`/`repo_url` UNIQUE omitted from 0007, added in 0010; `CREATE UNIQUE INDEX IF NOT EXISTS` errors on pre-existing duplicates → deploy can stop mid-migration. App-level checks are race-prone.

### H-8 — Admin/role authorization is client-side at the UI layer (must-verify server)
- **Source IDs:** `F-CC-B00-013`, `F-CC-B01-041`, `F-CC-B01-063`.
- Admin pages/links gate on `user.role==="ADMIN"` client-side only. Server enforcement DOES exist in tRPC `adminProcedure`/`isAdmin` and domain `assertCan` (confirmed `F-CC-B07-028`, `F-CC-B07-006`), but proxy/router tests mock the domain (H-? test gaps). Net: enforcement present, defense-in-depth depends on every procedure declaring guards + output schemas.

### H-9 — `mapDomainError` classifies HTTP status by exact message string
- **Source ID:** `F-CC-B07-023`; related `F-CC-B08-020`, `F-CC-B08-049`.
- NOT_FOUND/BAD_REQUEST depend on string equality vs ~15 hardcoded messages; a domain reword silently downgrades a 400/404 to 500. Typed error classes exist (`errors.ts`) but are unused at throw sites.

### H-10 — Public Cloud Run service with redundant `allUsers` IAM binding
- **Source ID:** `F-CC-B01-017`.
- `--allow-unauthenticated` **plus** explicit `allUsers`→`roles/run.invoker`; secret-bearing service fully public. Confirm app-layer auth/signature; remove redundant binding.

### H-11 — `createInternAccount` FLAT insert with explicit `schoolId:null` throws under school-scoped admin
- **Source ID:** `F-CC-B08-003`; non-transactional checks `F-CC-B08-029`.
- Works only when acting admin's `schoolId` is null (undocumented coupling). FLAT proxy raises `TenantScopeError` for a non-null tenant.

## MEDIUM (live runtime — consolidated)

- **M-1 — In-memory rate limiter not multi-replica safe.** `F-CC-B00-002`, `F-CC-B04-023` (effective limit = 30 × instances; resets on cold start; AI cost/abuse control).
- **M-2 — AI provider configured in app layer / module-load client.** `F-CC-B00-003`, `F-CC-B00-004` (adapter-bypass; possibly-undefined key at import).
- **M-3 — PR-URL global uniqueness enables enumeration/denial.** `F-CC-B09-015` (one review row per PR URL across all users; asymmetric with per-user read scoping).
- **M-4 — Prompt-injection mitigation prompt-only; diff/output unbounded.** `F-CC-B09-028`; unescaped LLM Markdown to PR `F-CC-B10-005`.
- **M-5 — `phase` is free-text default `'A'`, not A–D constrained.** `F-CC-B07-036` (DB permits values outside the API enum → silent dashboard mis-grouping).
- **M-6 — `ALTER TYPE role ADD VALUE` transaction/irreversibility hazard.** `F-CC-B07-042`.
- **M-7 — Core curriculum/progress tables have no `school_id` (REFERENTIAL).** `F-CC-B07-030` (isolation concentrated in domain query code).
- **M-8 — `score` defaults 0 NOT NULL; "completed" sticky but score overwritten on re-submit.** `F-CC-B07-031`, `F-CC-B09-019` (recorded score may not match completion event; aggregations must filter by status).
- **M-9 — `checkModulePrerequisite` order-fragile / single-prior gating.** `F-CC-B09-007`, `F-CC-B04-016` (non-contiguous/duplicate `order`, `order<=1` assumption; deep-link bypass since lock is client-side `F-CC-B00-024`).
- **M-10 — Quiz grading exact-string equality.** `F-CC-B09-023` (case/whitespace/index-vs-text convention unenforced).
- **M-11 — Permission table duplicated / broad grants / generic admin key.** `F-CC-B09-010`, `F-CC-B09-011`, `F-CC-B09-012`.
- **M-12 — Domain outputs not validated against contracts; some procedures lack `.output()`.** `F-CC-B09-051`, `F-CC-B07-026` (data-leak/contract-drift surface).
- **M-13 — Replay/timestamp protection inert for real GitHub deliveries.** `F-CC-B10-003`.
- **M-14 — `practiceIssues` hardcodes org/repo, no error mapping.** `F-CC-B07-024`.
- **M-15 — GitHub App client duplicated across packages.** `F-CC-B09-049`.
- **M-16 — Empty-string installation ID → malformed request not clear error.** `F-CC-B09-041`.
- **M-17 — Seed `onConflict` keys lessons on `type` → module can stay under-seeded.** `F-CC-B08-013`; backfill order collisions `F-CC-B08-017`.
- **M-18 — github-issues swallows all errors → auth/config failure looks like "no issues".** `F-CC-B08-026`/`-027`.
- **M-19 — Lesson content not Zod-validated before render.** `F-CC-B01-047` (downgraded; data server-side).
- **M-20 — Root layout has no `<html>/<body>`; Tailwind v4 token mapping unverified.** `F-CC-B01-008`, `F-CC-B01-006` (verify at runtime).
- **M-21 — SSR base URL hardcoded `http://localhost:PORT`.** `F-CC-B01-049`.
- **M-22 — `getReviewByPrUrl`/repo-URL matching brittle (no normalize-on-write).** `F-CC-B08-024`, `F-CC-B09-016`, `F-CC-B09-029`.
- **M-23 — `dashboard-content` dynamically imported `ssr:false`.** `F-CC-B00-042` (client-only main page; first-paint/SEO).
- **M-24 — Admin initial `githubUsername` never syncs after async load.** `F-CC-B00-017` (risk of overwrite-to-empty on save).
- **M-25 — review-history linear 4-step model misrepresents needs_changes rework loop.** `F-CC-B01-052`.

## LOW / INFO (live runtime — representative; full list in batch reports)
- Quiz "submitted" success UI even on failing score, no retry; 70 vs 80 threshold split. `F-CC-B00-028/-029`.
- Assistant chat turns never persisted (`handleComplete` stub). `F-CC-B00-030`.
- Silent `catch{}` blocks in chat stream; no telemetry. `F-CC-B04-020`.
- Admin-path regex hardcodes `(th|en)` locale set → bypass if a locale is added. `F-CC-B04-012`, `F-CC-B07-007`.
- Logout via full `window.location.reload()`. `F-CC-B00-022`, `F-CC-B01-040`.
- Login error surfaces raw backend message (user-enumeration risk). `F-CC-B01-042`.
- Hand-rolled JWT/base64url; `token` vs `Bearer` header inconsistency. `F-CC-B09-042/-043`.
- Composite index gaps on progress/ordering. `F-CC-B07-033`.
- PR-review/user cascade-delete erases audit trail. `F-CC-B07-035`.
- `payload_json` raw retention/PII. `F-CC-B07-040`, `F-CC-B08-005`.
- `--passWithNoTests` + narrow vitest `include` globs (`components/**`,`lib/**`) → app/route tests invisible. `F-CC-B07-002`, `F-CC-B07-016`.
- E2E/playwright default baseURL = production. `F-CC-B07-004`.

---

# §2 — CURRICULUM / DOCS / TEST-FIXTURE FINDINGS

> These are **teaching / artifact** risks, not assertions that the shipped app contains the defect.

## HIGH (curriculum)
- **C-H-1 — Curriculum teaches bcrypt vs AGENTS Argon2id mandate.** `F-CC-B06-001` (real repo uses `@node-rs/argon2`; cost factor 10 taught).
- **C-H-2 — Curriculum teaches AI SDK v4 APIs; app ships v5.** `F-CC-B06-002`, `F-CC-B05-003` (`maxTokens`/`toDataStreamResponse`/`useChat({api,body})` won't compile against installed SDK).
- **C-H-3 — Auth middleware example trusts cookie presence, injects `x-user-id` with no verification.** `F-CC-B05-002` (forgeable-header / unauthenticated-trust antipattern).
- **C-H-4 — Private-key/secret handling guidance puts RSA key + API key in `.env.local` with no Secret-Manager/no-commit warning.** `F-CC-B02-002`.

## HIGH (test/artifact false-assurance)
- **C-H-5 — Prod-smoke suites hit live production by default under `pnpm test`.** `F-CC-B03-001` (matched by default vitest glob; real auth-failure/webhook POSTs from CI).
- **C-H-6 — Network-unreachable failures indistinguishable from real contract gaps.** `F-CC-B03-002`.
- **C-H-7 — Phase-13 "P0 launch gate" passes while documented decision is `no-go`.** `F-CC-B03-030`.
- **C-H-8 — phase-4 `trpcPost` sends no body → all mutation probes structurally broken.** `F-CC-B03-041`.
- **C-H-9 — phase-7 launch-gate `!notFound.status === 404` precedence bug; 404 check is dead.** `F-CC-B03-053`.
- **C-H-10 — `chat-locale` test re-implements `buildSystemPrompt` instead of importing it (drift).** `F-CC-B02-034`.
- **C-H-11 — `report-summary.json` vs phase-9 test prose contradict on replay protection.** `F-CC-B04-001`.
- **C-H-12 — Phase-8.5 follow-up-track gate will FAIL — required track is archived, gate scans only `measure/tracks/`.** `F-CC-B04-002`.

## MEDIUM (curriculum/docs)
- pnpm 8.15.8 vs repo 11.8.0 taught + quizzed. `F-CC-B05-004`.
- Pacing guide Module 4 vs 5 "JavaScript Fundamentals" contradiction. `F-CC-B02-005`.
- Docs disagree on app name / permission set (omits `metadata:read`) / mock-review fallback. `F-CC-B02-001/-003/-004`.
- `useApi` exhaustive-deps violation taught. `F-CC-B05-006`.
- Zod `issue.path[0].toString()` crash pattern taught in reusable hook. `F-CC-B05-007`.
- Wildcard `Access-Control-Allow-Origin:*` on API routes taught alongside cookie auth. `F-CC-B05-008`.
- `innerHTML` unescaped interpolation (XSS) taught as normal rendering. `F-CC-B05-009`.
- bcrypt cost + plaintext session token at rest + no rotation. `F-CC-B06-004`.
- `getSession`/`updateProgress` examples drop tenant scoping. `F-CC-B06-005/-007`.
- RBAC "inherits" arrays that don't inherit; in-memory rate limiter taught as prod hardening. `F-CC-B06-006/-008`.
- Thai mistranslation "การออกกำลังกาย" (workout) for fork exercise; EN/TH dashboard copy divergence. `F-CC-B06-009/-010`.
- Hardcoded installation ID `132752129` + inline prod `DATABASE_URL` in runbook. `F-CC-B02-009/-011`.
- prod-smoke false-assurance probes: concurrent-quiz tests error path; chat rate-limit "isolation" tests nothing; indentation-coupled seed regex oracles; `Blocker.phaseId` referenced but undefined; CWD-fragile cloudbuild read; `Date`-diff "no stale data". `F-CC-B03-020/-021/-026/-031/-032/-035/-054`, `F-CC-B04-003`.

## LOW / INFO (curriculum/docs/test)
- Aggregate version-table drift across ~20 unit docs. `F-CC-B05-010`, `F-CC-B08-009`.
- Conventional-commit teaching omits mandatory track-id. `F-CC-B05-012`.
- PR→LLM-review loop never specifies branch protection / merge authority. `F-CC-B05-013`.
- Over-specified exact-string i18n assertions; brittle Tailwind-class substring tests. `F-CC-B02-041`, `F-CC-B04-026`.
- Process/bookkeeping tests pinned in package suites (git notes, archived plan.md, comment prose). `F-CC-B10-021/-024/-025/-026`.
- Curriculum/brief fidelity mismatch documented not resolved (Unit 11 placement). `F-CC-B08-045`.

---

# §3 — POSITIVE CONFIRMATIONS (Info)

- AI access routed through `@reading-advantage/ai` adapter at the server seam; well tested. `F-CC-B07-017`, `F-CC-B09-027`.
- GitHub access through `@reading-advantage/integrations-github` adapter (no direct Octokit/fetch in domain). `F-CC-B08-028`.
- HMAC signature verify + `parsePrUrl` SSRF guard sound; strong signature/replay boundary tests. `F-CC-B10-011`, `F-CC-B09-060`.
- Monotonic progress upsert prevents completion downgrade; pinned by tests. `F-CC-B08` positives, `F-CC-B09-026`.
- `next.config.ts` strong security headers (HSTS preload, XFO DENY, frame-ancestors none, no-store /api, scoped connect-src). `F-CC-B06-022`.
- Curriculum strong on Zod-at-boundaries, discriminated unions, Route Handler validation. `F-CC-B05-018/-019`.
- Curriculum-integrity invariants (18 modules / 85 lessons / unique slugs / answer-in-options / public schema strips answer key). `F-CC-B07-045`, `F-CC-B08-044`, `F-CC-B09-053`.
- Tenant+user-keyed dashboard cache; output-shape stripping tested. `F-CC-B07-029`, `F-CC-B07-022`.
- Seed/backfill safe defaults (direct connection, dry-run, `isMain` guard). `F-CC-B08-016/-019`.
- i18n key parity 188/188 clean. `F-CC-B06-021`.
- Dockerfile non-root user, standalone output, telemetry disabled; good secret hygiene (`.env*`/`*.pem` ignored). `F-CC-B00-047/-049/-051`.

---

## Cross-batch deduplication notes

| Underlying defect | Consolidated as | Contributing batch IDs |
|-------------------|-----------------|------------------------|
| REFERENTIAL/TenantDB throw | CR-1 | B08-001, B09-001/003/006/013/020/025, B10-001 |
| Tests can't see scoping defect | CR-2 | B08-002/033, B09-002, B10-015/018/023 |
| Synchronous webhook review | H-2 | B10-002, B04-006 |
| In-memory rate limiter | M-1 | B00-002, B04-023, B06-008 (curriculum echo) |
| Client-only admin gating | H-8 | B00-013, B01-041/063, B07-006 (server side confirmed) |
| AI SDK v4 vs v5 | C-H-2 | B05-003, B06-002 |
| Locale-prompt test divergence | C-H-10 | B02-034, B03-010 |
| Hardcoded locale admin regex | LOW | B04-012, B07-007 |
| Repo-URL match brittleness | M-22 | B08-024, B09-016/029 |
| payload_json retention | LOW | B07-040, B08-005 |
