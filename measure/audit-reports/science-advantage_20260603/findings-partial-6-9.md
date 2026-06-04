# Findings — Sections 6 & 9 (Validation & Observability)

> **App:** `apps/science-advantage/`
> **Audit date:** 2026-06-03
> **Source checklist:** `checklist-partial-6-9.md`
> **Convention:** F-6xx = §6 findings, F-9xx = §9 findings. Severity follows `measure/agents-md-audit-protocol.md` table.

## Summary table

| # | Severity | Rule | Title |
|---|----------|------|-------|
| F-601 | **High** | 6.1, 6.2 | 21 `route.ts` files skip Zod validation on request bodies; 4 use raw `request.json()` with ad-hoc `typeof` checks |
| F-602 | **Medium** | 6.3 | `lib/env.ts` Zod schema covers only 5/22+ env vars; many reads in `lib/ai/*` and `lib/config/*` bypass it |
| F-603 | Low | 6.4 | `createClassSchema` and `createClassFormSchema` are two distinct schemas (form pipes through server); no shared `packages/types` contracts package |
| F-604 | Low | 6.6 | Form schemas live in app (`@/lib/validations/class`) instead of the cross-cutting `packages/types` |
| F-901 | **High** | 9.4, 9.5 | No `auditLog` table in `packages/db/src/schema/`; no auth/permission/billing events written |
| F-902 | **Medium** | 9.2 | 67 `console.log/error/warn/info` hits in production code (≥10 threshold) |
| F-903 | **Medium** | 9.3 | No Sentry / OpenTelemetry / equivalent error reporter; no `instrumentation.ts` |
| F-904 | **Medium** | 9.1 | Structured logger exists but doesn't auto-propagate `requestId` / `userId` / `latencyMs`; 5 largest route.ts files emit zero structured logs |
| F-905 | **Medium** | 9.6 | No request tracing; only a `traceId` field on the AI recommendation context, not a real OTel span |
| F-906 | Low | 9.1 | `lib/observability/logger.ts` is a console-sink wrapper (no pino/winston/OTel exporter) |

---

## Section 6 findings

### F-601: 21 `route.ts` files skip Zod validation; 4 use raw `request.json()` with hand-rolled `typeof` checks
- **Rule:** 6.1, 6.2
- **Severity:** **High**
- **Evidence:**
  - **`request.json()` without Zod** (4 sites): `app/api/lessons/[lessonSlug]/quiz/route.ts:245–253` (manual `if (!attemptId \|\| !responses \|\| !Array.isArray(responses))`, then destructure); `app/api/classes/[classId]/assignments/route.ts:158–166` (`const { lessonId, dueAt } = body as { lessonId?: string; dueAt?: string }`); `app/api/classes/[classId]/assignments/route.ts:297–305` (same pattern, `assignmentId`); `app/api/classes/[classId]/roster/route.ts:113–121` (same pattern, `studentId`); `app/api/classes/[classId]/route.ts:111+` (manual field checks for PATCH/DELETE).
  - **No `request.json()` validation at all** (15+ routes that read query/path/header params without Zod): `app/api/lessons/[lessonSlug]/route.ts:28–158` (GET — no body, but path is not Zod-checked against the slug schema); `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts:15–146`; `app/api/lessons/[lessonSlug]/quiz/route.ts` GET handler; `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts`; `app/api/students/[studentId]/classes/[classId]/analytics/route.ts`; `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts`; `app/api/classes/[classId]/analytics/overview/route.ts`; `app/api/classes/[classId]/curriculum/route.ts`; `app/api/students/[studentId]/achievements/route.ts`; `app/api/students/[studentId]/gamification-profile/route.ts`; `app/api/students/me/gamification/route.ts`; `app/api/students/[studentId]/assignments/route.ts`; `app/api/students/[studentId]/mastery-profile/route.ts` (only the QUERY is validated, the `studentId` path param is not); `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` (query only); `app/api/teachers/dashboard/route.ts`; `app/api/student/classes/route.ts`.
  - **Routes that DO validate correctly (6/27):** `classes/join/route.ts:44`, `classes/route.ts:59`, `students/[studentId]/mastery-profile/route.ts:106` (query), `ai/update-mastery/route.ts:232`, `ai/recommendations/route.ts:302`, `teachers/classes/[classId]/intervention-alerts/route.ts:65` (query).
- **Impact:** Of the 4 unvalidated `request.json()` sites, **2 are write-side destructive handlers** (`classes/[classId]/assignments/route.ts` POST/DELETE — create/delete assignments for a class; `classes/[classId]/roster/route.ts` DELETE — remove a student from a class). Per the protocol, raw `JSON.parse(req.json())` in a security-sensitive handler is **High**; these are mutation handlers, not strictly auth/billing, so the average severity here is **High** (destructive) and **Medium** (read-side path-param checks).
- **Suggested fix track:** "science-advantage — Zod Boundary Hardening". Phase 1: add Zod schemas to `lib/validations/` for each missing route (reuse `lib/forms/from-zod` where possible). Phase 2: wrap each `route.ts` body parse in a `safeParse` first, returning `400 { error, details }` on failure. Phase 3: add a `lib/validations/api-helpers.ts` `parseBody(request, schema)` helper so future routes cannot omit the check. Phase 4: migrate the 4 hand-rolled `typeof` sites first as a high-impact sub-track.

### F-602: `lib/env.ts` Zod schema covers only 5 of 22+ declared env vars
- **Rule:** 6.3
- **Severity:** **Medium**
- **Evidence:**
  - `lib/env.ts:3–15` declares 5 fields: `DATABASE_URL`, `NODE_ENV`, `NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE`, `DEV_AUTH_ENABLED`, `REDIS_URL`. Defaults are lenient (e.g. `DATABASE_URL` defaults to `postgresql://localhost:5432/test` — a test-only URL silently used in production if env not set).
  - `.env.example` (49 lines, per `00-inventory.md`) declares 22+ vars; unvalidated ones include `DIRECT_DATABASE_URL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_RECOMMENDER_MODEL_PRIMARY`, `AI_RECOMMENDER_MODEL_SECONDARY`, `AI_RECOMMENDER_MODEL`, `AI_RECOMMENDER_TIMEOUT_MS`, `AI_RECOMMENDATION_TIMEOUT_MS`, `AI_RECOMMENDER_CACHE_TTL_SECONDS`, `AI_RECOMMENDER_HASH_SECRET`, `AI_RECOMMENDER_MAX_REQUESTS_PER_MIN`, `AI_IMAGE_PRIMARY_MODEL`, `AI_IMAGE_FALLBACK_MODELS`, `AI_IMAGE_MAX_WIDTH`, `AI_IMAGE_MAX_BYTES`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_KEY_FILE`, `NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION`, `NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED`.
  - **Direct unvalidated env reads in production code:**
    - `lib/ai/recommendation-service.ts:55–60` — `process.env.OPENAI_API_KEY` / `process.env.GEMINI_API_KEY` (guards on `?` truthiness, not validated).
    - `lib/ai/image-generator.ts:29–39` — assigns `process.env.GOOGLE_API_KEY` / `process.env.OPENAI_API_KEY` from `aiImageConfig.googleApiKey` / `openaiApiKey` (which itself came from raw env).
    - `lib/config/ai.ts:15–24` — 8 raw `process.env.AI_RECOMMENDER_*` reads.
    - `lib/config/ai-images.ts:14–20` — 6 raw `process.env.AI_IMAGE_*` / `GOOGLE_API_KEY` / `OPENAI_API_KEY` reads.
    - `lib/config/features.ts:2–4` — raw `process.env.NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION` and `process.env.NODE_ENV`.
    - `lib/analytics.ts:17` — raw `process.env.NODE_ENV` (redundant with `lib/env.ts`).
    - `lib/auth/session.ts:97` — raw `process.env.NODE_ENV` (redundant).
    - `proxy.ts:25` — `process.env.DEV_AUTH_ENABLED` (redundant with `lib/env.ts`).
  - `lib/env.test.ts` exists and tests the schema, but only for the 5 in-scope fields.
- **Impact:** Missing `OPENAI_API_KEY` / `GEMINI_API_KEY` causes silent runtime fallback in `lib/ai/recommendation-service.ts` (line 56/60 wrap in ternary), instead of failing boot. A misspelled `AI_RECOMMENDER_HASH_SECRET` is not caught until first request. The lenient default for `DATABASE_URL` is a real risk in production deploys.
- **Suggested fix track:** "science-advantage — Env Zod Coverage". Phase 1: extend `lib/env.ts` to cover the full `.env.example` surface. Phase 2: replace the `lib/config/ai.ts` and `lib/config/ai-images.ts` raw env reads with references to the validated `env` export. Phase 3: remove the redundant `process.env.NODE_ENV` reads in `lib/auth/session.ts`, `lib/analytics.ts`, `proxy.ts`. Phase 4: add `.refine` rules for `AI_RECOMMENDER_HASH_SECRET` (required, ≥32 chars) and `GOOGLE_CLOUD_KEY_FILE` (must exist if set).

### F-603: Two Zod schemas for the same domain (`createClassSchema` + `createClassFormSchema`) — no parallel hand-written type, but two sources of truth
- **Rule:** 6.4
- **Severity:** **Low**
- **Evidence:**
  - `lib/validations/class.ts:26–30, 38–42` — `createClassSchema` / `updateClassSchema` (server-side, number-typed `gradeLevel`).
  - `lib/validations/class.ts:50–58` — `createClassFormSchema` (form-side, uses `z.coerce.number().pipe(createClassSchema.shape.gradeLevel)`).
  - Both schemas' types are inferred (`CreateClassInput`, `CreateClassFormInput`) — no hand-written duplicates.
  - The form-schema pipes through the server-schema's field constraints, so the form cannot bypass a server validator by construction.
- **Impact:** Two schemas → two surfaces to update if a field is added. Mitigated by the `.pipe()` constraint, but the maintainer must remember to keep `createClassFormSchema.shape.gradeLevel` in sync with `createClassSchema.shape.gradeLevel` (and similar). Not currently broken.
- **Suggested fix track:** None required. Document in the module-level JSDoc and consider extracting a single shared "createClassInput" base schema with both server and form views (i.e. `z.string().pipe(...)` vs `z.coerce.number().pipe(...)`).

### F-604: Form schemas live in app-local `lib/validations/` instead of a cross-cutting `packages/types` (or `@reading-advantage/contracts`)
- **Rule:** 6.6
- **Severity:** **Low**
- **Evidence:**
  - `lib/validations/class.ts` (79 lines), `lib/validations/student-classes.ts` — app-local.
  - The `packages/types` package exists in the monorepo root (`measure/tech-stack.md` confirms it) but is not used by `apps/science-advantage/`.
  - `components/features/student/join-class-form.tsx:24–27` imports `joinClassSchema` from `@/lib/validations/class` directly. Same for `components/features/classes/create-class-form.tsx:28`.
  - Per `00-inventory.md` the dep `@reading-advantage/types` is in `transpilePackages` (`next.config.ts:444`) — present in the workspace, but not actually consumed.
- **Impact:** The form-schema and server-schema are colocated (good for the single-app case) but cannot be shared with `apps/reading-advantage/` or `apps/primary-advantage/` (per `00-inventory.md` those apps exist). Drift risk: adding a field to one app's schema doesn't propagate.
- **Suggested fix track:** "Cross-app Contracts Package". Move `lib/validations/{class,student-classes}.ts` and `lib/schemas/lesson-content.schema.ts` into `packages/types/src/contracts/` so all three apps share a single source. Out of scope for science-advantage alone; surface as a multi-app track.

---

## Section 9 findings

### F-901: No `auditLog` table in `packages/db/src/schema/`; no auth/permission/billing/destructive-action events written
- **Rule:** 9.4, 9.5
- **Severity:** **High**
- **Evidence:**
  - `rg -n 'auditLog\|audit_log'` over `packages/db/src/schema/` returns **0 matches**.
  - `rg -l 'audit' packages/db/src/` returns only `packages/db/src/__tests__/schema-parity.test.ts:1` (a comment referencing `audit.md` — a porting-decision doc, not a table).
  - `rg -n 'audit.*login\|audit.*logout\|audit.*password' apps/science-advantage/` returns **0 matches** (only doc/spec references; no code).
  - Real auth path: `proxy.ts` calls `requireRole(db, sessionToken, gate.role)` (`@reading-advantage/auth`) — the audit event would have to be written either inside `requireRole` (no — `packages/auth` is shared) or in a `proxy.ts` listener. Neither happens.
  - The 4 stub `app/api/auth/{impersonate,login,logout,session}/route.ts` files (6 lines each, per `00-inventory.md`) do not call any audit helper. They are placeholders; the real auth surface is in `proxy.ts` + `lib/auth/`.
  - `lib/auth/session.ts` / `lib/auth/server.ts` — no audit logging in either. Login, logout, password change (where implemented) all bypass audit.
  - `docs/archive/architecture/security-performance.md:262, 277` describes an aspirational `lib/audit.ts` and `prisma.auditLog.create({...})` from the Prisma era — neither exists in current code.
- **Impact:** **High** per severity guidance ("No audit log table = High (security)"). Compliance-relevant (the app's `docs/prd/requirements.md:NFR9` explicitly requires "comprehensive audit logging for all user actions and data access"). Without an audit log, security incidents cannot be triaged, GDPR/CCPA data-access requests cannot be answered, and SOC 2 / district procurement requirements fail.
- **Suggested fix track:** "science-advantage — Audit Log Foundation". Phase 1: add `auditLog` table to `packages/db/src/schema/` (id, actorId, actorRole, action, resourceType, resourceId, metadata jsonb, ipAddress, userAgent, createdAt). Phase 2: write a Drizzle migration; revoke `UPDATE` / `DELETE` grants in the migration (append-only enforcement). Phase 3: add `lib/observability/audit.ts` helper (`audit({ actor, action, resource, metadata })`). Phase 4: wire audit calls into `proxy.ts` (every `requireRole` outcome), `lib/auth/session.ts` (login / logout / password change), and the 4 destructive `route.ts` handlers (assignment create/delete, student remove from roster, class delete). Phase 5: add tests asserting the audit row is written.

### F-902: 67 `console.log/error/warn/info` in production code
- **Rule:** 9.2
- **Severity:** **Medium**
- **Evidence:** `rg -n 'console\.(log\|error\|warn\|info)' apps/science-advantage/{app,lib,components}/ proxy.ts` excluding `*.test.*` and `__tests__/` → **67 hits**.
  - **`app/` (25):** `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts:141`; `app/api/lessons/[lessonSlug]/quiz/route.ts:210, 513`; `app/api/lessons/[lessonSlug]/route.ts:152`; `app/api/teachers/dashboard/route.ts:51`; `app/api/students/[studentId]/assignments/route.ts:102`; `app/api/classes/[classId]/assignments/route.ts:120, 260, 357`; `app/api/classes/[classId]/roster/route.ts:89, 162`; `app/api/classes/join/route.ts:133`; `app/api/classes/route.ts:157, 281`; `app/api/classes/[classId]/route.ts:63, 154, 214`; `app/api/students/[studentId]/classes/[classId]/analytics/route.ts:331`; `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts:298`; `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts:406`; `app/api/classes/[classId]/analytics/overview/route.ts:170`; `app/api/classes/[classId]/curriculum/route.ts:166`; `app/api/student/classes/route.ts:35`; `app/(teacher)/teacher/classes/[classId]/lessons/[slug]/teacher-lesson-preview.tsx:74`; `app/(student)/student/classes/[classId]/lessons/[lessonSlug]/page.tsx:66`; `app/(teacher)/teacher/classes/[classId]/page.tsx:50`; `app/(teacher)/teacher/classes/[classId]/analytics/page.tsx:51`; `app/(teacher)/teacher/classes/[classId]/error.tsx:15`.
  - **`components/` (30):** `components/features/student/mastery-profile/student-badges-section.tsx:66`; `teacher-dashboard-classes.tsx:152`; `gamification-dashboard-card.tsx:104`; `lesson-player.tsx:50, 170, 226` (one in JSDoc); `lesson-viewer.tsx:118`; `intervention-alerts-widget.tsx:295, 301, 314, 320, 347, 360` (4 of these are `console.log("[Telemetry] ...")`); `recent-completions-feed.tsx:127`; `students-need-attention-card.tsx:98`; `class-progress-card.tsx:131`; `student-mastery-profile.tsx:124`; `image-gallery.tsx:282`; `analytics/student-lesson-detail-analytics.tsx:178`; `ai-recommendation-card.tsx:226`; `student-classes-section.tsx:77`; `analytics/class-analytics-overview.tsx:127`; `analytics/lesson-detail-analytics.tsx:182`; `analytics/student-detail-analytics.tsx:170`; `student-progress-card.tsx:58`; `join-class-form.tsx:99, 132`; `create-class-form.tsx:144`.
  - **`lib/` (8):** `lib/observability/logger.ts:14, 19, 23` (intentional — the logger's console sink); `lib/observability/metrics.ts:15`; `lib/analytics.ts:18`; `lib/utils/clipboard.ts:25`; `lib/schemas/lesson-content.schema.ts:301, 304` (JSDoc examples).
  - **`proxy.ts` (3):** lines 55, 72, 102 — all `console.error('[proxy] ...', err)`.
- **Impact:** **Medium** per severity guidance ("10+ console.log/error in production code = Medium"). Mixed: 25 of the 67 are `route.ts` catch blocks (acceptable as fallback, but should use `logger.error`), 30 are client-side `fetch()` errors (acceptable in dev, but the `console.log("[Telemetry] ...")` in `intervention-alerts-widget.tsx` ship to prod), 4 are in `lib/observability/*` (acceptable, by design), 3 are in `proxy.ts` (could be `logger.error`).
- **Suggested fix track:** "science-advantage — Console Cleanup". Phase 1: ESLint rule `no-console` with `allow: ['error', 'warn']` for the app; lint baseline. Phase 2: replace `console.error` in `proxy.ts` and `lib/utils/clipboard.ts` with `logger.error` (`lib/observability/logger.ts`). Phase 3: replace `console.error` in client components with a `clientLogger.error(...)` that no-ops in prod (or sends to Sentry once F-903 lands). Phase 4: decide on the `console.log("[Telemetry] ...")` in `intervention-alerts-widget.tsx` — either keep as a real client telemetry shim or move behind a feature flag.

### F-903: No Sentry / OpenTelemetry / equivalent error reporter; no `instrumentation.ts`
- **Rule:** 9.3
- **Severity:** **Medium**
- **Evidence:**
  - `rg -n 'Sentry|sentry|@sentry|opentelemetry|OTLP' apps/science-advantage/` returns 0 code matches; 6 matches in `docs/archive/*` only.
  - `ls apps/science-advantage/instrumentation.ts` — file does not exist.
  - `package.json` deps do not include `@sentry/nextjs`, `@sentry/node`, `@opentelemetry/api`, `@vercel/otel`, `@datadog/*`, or any APM client.
  - `lib/observability/logger.ts` writes to `console.{error,warn,info}` — no transport.
  - The `lib/observability/metrics.ts` file exists but only logs a JSON line to `console.info` — no metrics sink.
- **Impact:** Unhandled errors in route handlers are silently swallowed (the handler returns a 500 JSON response, but no upstream system is notified). `console.error` only writes to `stderr` of the Node process; in Vercel-style deploys that may be lost after the request ends. Production bugs discovered only via user reports.
- **Suggested fix track:** "science-advantage — Error Reporting". Phase 1: add `@sentry/nextjs` to `package.json`; create `sentry.client.config.ts` and `sentry.server.config.ts`; wire DSN via `SENTRY_DSN` env (already referenced in archived `docs/archive/onboarding/environment.md:73`). Phase 2: add `instrumentation.ts` registering Sentry on the server. Phase 3: replace `console.error` catch blocks (per F-902) with `Sentry.captureException(error, { tags: { route, method } })` + structured log. Phase 4: configure source maps.

### F-904: Structured logger does not auto-propagate `requestId` / `userId` / `latencyMs`; 5 largest `route.ts` files emit zero structured logs
- **Rule:** 9.1
- **Severity:** **Medium**
- **Evidence:**
  - `lib/observability/logger.ts:1–37` — `logger.info/warn/error(event, payload)` writes `{ event, level, timestamp, ...payload }`. No request context auto-bound.
  - The 5 largest route.ts files per `00-inventory.md`:
    - `app/api/ai/update-mastery/route.ts` (624 lines) — **does** emit `logger.*` calls (lines 265, 296, 476, 487, 526, 571, 582). But none of them include `requestId` or `latencyMs`.
    - `app/api/lessons/[lessonSlug]/quiz/route.ts` (519 lines) — **zero** `logger.*` calls; only `console.error` (lines 210, 513).
    - `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (412 lines) — **zero** `logger.*`; `console.error` at line 406.
    - `app/api/ai/recommendations/route.ts` (400 lines) — emits `logger.warn` (line 93) and `logger.error` (line 382); no request context.
    - `app/api/classes/[classId]/assignments/route.ts` (364 lines) — **zero** `logger.*`; only `console.error` (lines 120, 260, 357).
  - `rg -n 'requestId|latencyMs|operation' apps/science-advantage/ --include route.ts` → 0 matches.
  - No `withRequestContext(...)` / `pino-http` / `cls-hooked` middleware; no `AsyncLocalStorage` usage.
- **Impact:** Without `requestId`, correlating a client error report to a server log line is impossible (the closest is `traceId` in `lib/ai/recommendation-service.ts`, but that field is a context-only value never bound to the HTTP request). Without `latencyMs`, SLO dashboards cannot be built. The "structured logs" the §9.1 rule requires are present in form, but not in spirit.
- **Suggested fix track:** "science-advantage — Request Context & Structured Logging". Phase 1: introduce `AsyncLocalStorage<RequestContext>` in `lib/observability/context.ts`; populate from a new `withRequestContext` wrapper used in every `route.ts`. Phase 2: extend `lib/observability/logger.ts` to read from `AsyncLocalStorage` and auto-attach `requestId`, `userId`, `latencyMs`. Phase 3: migrate the 5 largest `route.ts` files' catch blocks from `console.error` to `logger.error`. Phase 4: add `pino` (drop-in upgrade path) once the interface stabilizes — see F-906.

### F-905: No request tracing; `traceId` field is not a real OTel span
- **Rule:** 9.6
- **Severity:** **Medium**
- **Evidence:**
  - `rg -n 'trace\(|span\(|opentelemetry' apps/science-advantage/` → 0 matches.
  - `rg -n 'traceId' apps/science-advantage/` → 4 matches, all in `lib/ai/recommendation-service.ts:97, 126, 144, 153` (a payload field passed to `logger.*` and into the AI prompt). The value is opaque — read off `context.traceId` and never tied to an HTTP request header (no `traceparent` parsing, no span exporter).
  - No `instrumentation.ts` registration with `@vercel/otel`, `@opentelemetry/sdk-node`, or any APM vendor.
  - No `cls-hooked` / `AsyncLocalStorage` plumbing the request lifecycle (separate from F-904 — F-905 is about distributed tracing, F-904 is about request-scoped logs).
- **Impact:** Cross-service traces (web → AI recommendation → OpenAI) cannot be assembled. Latency hotspots are invisible. The `traceId` field as it stands is a no-op label.
- **Suggested fix track:** "science-advantage — Distributed Tracing". Phase 1: add `@opentelemetry/api` + `@opentelemetry/sdk-node` + `@opentelemetry/exporter-trace-otlp-http`. Phase 2: create `instrumentation.ts` that registers an OTLP exporter. Phase 3: in `proxy.ts` (the central entry point) and inside `lib/ai/recommendation-service.ts` (the AI call site), wrap request handlers and `generateObject` calls in `trace.getTracer('science-advantage').startActiveSpan(...)`. Phase 4: replace the ad-hoc `traceId` context field with `trace.getSpan(context.active())?.spanContext().traceId`.

### F-906: `lib/observability/logger.ts` is a console-sink wrapper (no pino / winston / OTel exporter)
- **Rule:** 9.1 (sub-aspect)
- **Severity:** **Low**
- **Evidence:**
  - `lib/observability/logger.ts:13–23` — `console.error` / `console.warn` / `console.info` are the only transport.
  - `lib/observability/metrics.ts:15` — `console.info('[metrics]', { metric, value, tags, timestamp })`.
  - No `pino`, `winston`, `bunyan` package in `package.json` (`package.json:380–395` lists 48 production deps; none are logger libraries).
  - `package.json` does have `pino` style field names indirectly via `zod` (3.25) but not as a logger.
- **Impact:** Logs are not structured in the strict JSON-line sense (e.g. ECS-compatible), not batched, not sent to a centralized log store. Each line is a `console.error` whose envelope depends on the runtime (Vercel wraps in JSON; local dev doesn't). When APM/Sentry is added (F-903), the logger will need a new transport anyway.
- **Suggested fix track:** None on its own; will be subsumed by F-903 (error reporting) and F-905 (tracing) tracks. Recommend `pino` + `pino-pretty` (dev) as the upgrade; or, if APM is Sentry, use `@sentry/nextjs`'s built-in `consoleLoggingIntegration` instead.
