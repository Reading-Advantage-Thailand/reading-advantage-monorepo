# Line Review — ra-batch-14

**Batch:** ra-batch-14
**Track:** reading_advantage_full_review_20260626
**Baseline SHA:** d348666be047b929d02c747120c32d2ea0fc53fc
**Files:** 20 (metrics API v1 routes + passage + stories question routes)
**Diff from baseline:** None — all 20 files are unchanged since baseline.
**Review mode:** Line-by-line static review

---

## Scope

This batch covers three route groups:
1. **Metrics API v1** (12 routes): `assignments`, `cache`, `dashboard-summary`, `genres`, `health`, `metrics/` (root), `srs/actions`, `srs/refresh`, `srs/`, `stream`, `system`, `velocity`
2. **Passage API v1** (2 routes): `passage/`, `passage/[articleId]/`
3. **Stories Question API v1** (6 routes): `laq/`, `laq/[questionNumber]/`, `laq/[questionNumber]/feedback/`, `laq/[questionNumber]/getxp/`, `mcq/`, `mcq/[questionNumber]/`

---

## Global Patterns Observed

### P1: Three Competing Auth Patterns

The 20 files use **three different authentication approaches**:

| Pattern | Used by | Mechanism |
|---------|---------|-----------|
| Edge router + `protect` | assignments, dashboard-summary, genres, metrics root, velocity, system, passage/*, stories/* | `router.use(protect)` middleware |
| Direct `getCurrentUser()` + manual role check | srs/actions, srs/refresh, srs/route | `getCurrentUser()` + `includes()` |
| `requireRole` guard from middleware/guards | cache, health | `requireRole([Role.SYSTEM])` |

**Finding (F1, MEDIUM):** Auth pattern inconsistency means different error shapes for the same logical outcome (unauthorized/forbidden). The edge-router `protect` pattern returns whatever the protect controller returns (format depends on implementation). The manual `getCurrentUser()` pattern returns `{ message: "Unauthorized..." }` with status 401. The `requireRole` pattern returns whatever `requireRole` returns (typically a NextResponse). Clients cannot rely on a consistent error contract across metrics sub-endpoints.

### P2: `as any` Cast on Every Router Handler Registration

Every `createEdgeRouter`-based route file uses `router.get(handler) as any` or `router.post(handler) as any` to suppress type mismatches between the handler signature and what `next-connect` expects.

**Finding (F2, LOW):** This is a systemic type-safety gap. The `as any` cast defeats TypeScript's ability to verify that handlers match the expected `req`/`res`/`next` signature. It's consistent across the codebase so not individually fixable here, but noted for tracking.

### P3: Orphaned Export Handlers

Several route files export HTTP method handlers (GET, POST) that are not registered on the router, meaning they run the middleware chain but will never reach the actual handler logic.

**Affected files:**

- `passage/[articleId]/route.ts`: Only `DELETE` is registered. The exported `GET` and `POST` run `logRequest` + `protect` middleware but no handler. A GET/POST to this endpoint would return a 500 (`"Expected a NextResponse from router.run"`).
- `stories/[storyId]/[chapterNumber]/question/laq/[questionNumber]/route.ts`: Only `POST` (answerStoryLAQuestion) is registered. The exported `GET` runs middleware but has no handler.
- `stories/[storyId]/[chapterNumber]/question/laq/[questionNumber]/feedback/route.ts`: Only `POST` is registered. The exported `GET` runs middleware but has no handler.
- `stories/[storyId]/[chapterNumber]/question/laq/[questionNumber]/getxp/route.ts`: Only `POST` is registered. The exported `GET` runs middleware but has no handler.
- `stories/[storyId]/[chapterNumber]/question/laq/route.ts`: Only `GET` (getStoryLAQuestion) is registered. The exported `POST` runs middleware but has no handler.
- `stories/[storyId]/[chapterNumber]/question/mcq/[questionNumber]/route.ts`: Only `POST` (answerStoryMCQuestion) is registered. The exported `GET` runs middleware but has no handler.
- `stories/[storyId]/[chapterNumber]/question/mcq/route.ts`: `GET` and `DELETE` are registered. No orphaned exports.

**Finding (F3, MEDIUM):** Unregistered HTTP method handlers result in 500 errors instead of proper 405 Method Not Allowed responses. Clients making unsupported HTTP requests get a cryptic error instead of a standards-compliant response.

---

## File-by-File Review

### 1. `metrics/assignments/route.ts`

**Structure:** Edge router pattern. `logRequest` + `protect` middleware. Single `GET` handler delegates to `getAssignmentMetrics` controller.

**Issues:**
- Line 18: `router.get(getAssignmentMetrics) as any` — type cast (F2).
- No local error handling; relies entirely on controller and protect middleware.

**Verdict:** OK. Thin route file, delegates properly.

---

### 2. `metrics/cache/route.ts`

**Structure:** Direct handler with `requireRole` guard. `POST` only.

**Issues:**
- Line 28: `requireRole([Role.SYSTEM])(req)` — requires SYSTEM role for cache invalidation. Correct for admin-only operation.
- Line 34: `await req.json()` — no try/catch around JSON parse. If body is malformed JSON, the outer catch will handle it, but the error message will be `"Internal server error"` with a JSON parse error — not a helpful 400 response.
  - **Finding (F4, LOW):** Missing explicit 400 for malformed request body. The catch block (line 71) returns 500 for all errors including JSON parse failures.
- Line 42: `getMetricsCacheStats().size` — the return value of `getMetricsCacheStats()` is used to compute `affected`. If `clearMetricsCache()` works but `getMetricsCacheStats()` returns stale data, the count may be wrong. Not a bug per se, but a semantic note.
- Line 72: `console.error` with `String(error)` — leaks error details in production logs but the response only returns the string representation, not a stack trace. Acceptable.

**Verdict:** Minor issue (F4). No blocking concerns.

---

### 3. `metrics/dashboard-summary/route.ts`

**Structure:** Edge router pattern. Identical to assignments/route.ts in structure. Delegates to `getDashboardSummary` controller.

**Issues:**
- Line 18: `as any` cast (F2).

**Verdict:** OK. Thin route file.

---

### 4. `metrics/genres/route.ts`

**Structure:** Edge router pattern. Identical to assignments/route.ts. Delegates to `getGenreMetrics`.

**Issues:**
- Line 18: `as any` cast (F2).

**Verdict:** OK. Thin route file.

---

### 5. `metrics/health/route.ts`

**Structure:** Direct handler with `requireRole` guard. `GET` only.

**Issues:**
- Line 21: `requireRole([Role.SYSTEM, Role.ADMIN])` — accepts SYSTEM or ADMIN. Correct for health endpoint.
- Line 26-29: `Promise.all([Promise.resolve(getMetricsCacheStats()), checkMatviewsHealth()])` — `getMetricsCacheStats()` is synchronous (wrapped in `Promise.resolve`). Fine but the `Promise.all` is slightly misleading.
- Line 11: `export const dynamic = 'force-dynamic'` — correct for a health check that should never be cached.

**Verdict:** OK. Clean health endpoint.

---

### 6. `metrics/route.ts` (root aggregate)

**Structure:** Edge router with complex inline handler. This is the most complex file in the batch.

**Issues:**
- **Finding (F5, HIGH):** Lines 27-129 — This aggregate endpoint makes **self-referencing HTTP calls** to its own sub-endpoints (`/api/v1/metrics/activity`, `/api/v1/metrics/genres`, etc.) using `fetch()`. This is a significant architectural concern:
  - **Fragile coupling:** If any sub-endpoint changes its response shape, this aggregate silently breaks.
  - **Performance:** Sequential fetching with 100ms delays between calls (line 111) makes this endpoint extremely slow (600ms+ for 6 endpoints).
  - **Auth forwarding:** Lines 40-43 forward `Authorization` and `Cookie` headers, but the comment says "internal API calls." If the server is not configured to accept its own requests, this can fail.
  - **Connection pool pressure:** The endpoint tries to mitigate this with sequential fetching, but the fundamental pattern is problematic.

- **Finding (F6, MEDIUM):** Lines 12-18 — `ensureOptimizationSystems()` is a module-level singleton initialization. The `optimizationInitialized` flag works in a single-process server but is unreliable in serverless/multi-instance deployments. Each cold start would re-run `initializeDbOptimization()`.

- **Finding (F7, LOW):** Line 97 — When a non-optional endpoint fails, the error is pushed as `{ [endpoint]: { error: String(error) } }` (line 105) rather than propagating. This means partial failures are swallowed and the response includes mixed data + error objects. The client has no reliable way to know the aggregate is partial.

- Line 33: `dateRange` defaults to `"30d"` — not validated against allowed values.

**Verdict:** F5 is the most significant finding. The self-referencing fetch pattern should be replaced with direct function calls to the controllers.

---

### 7. `metrics/srs/actions/route.ts`

**Structure:** Direct handler with manual auth + role check. Both `POST` and `GET` exported.

**Issues:**
- **Finding (F8, MEDIUM):** Lines 6, 16, 35 — The role check uses `STAFF_ROLES = ["TEACHER", "ADMIN", "SYSTEM"]` and checks with `includes()`. This is a different auth pattern than the edge-router `protect` used by peer endpoints. The `includes()` comparison casts `user.role` as `typeof STAFF_ROLES[number]` which is a union type — this works at runtime but the `as` cast on line 16 is fragile if `SessionUser.role` is ever changed to a different type.
- Line 23: `req.session = { user }` — mutates the request object to inject session. This is a workaround for the controller expecting `req.session.user` rather than getting the user from the session directly.

**Verdict:** Functionally correct but fragile auth pattern (F8).

---

### 8. `metrics/srs/refresh/route.ts`

**Structure:** Direct handler. `POST` only. Manual auth.

**Issues:**
- **Finding (F9, LOW):** Line 6 — `ADMIN_ROLES = ["ADMIN", "SYSTEM"]` — narrower than the peer `srs/actions` which allows TEACHER. This is intentional (refresh is admin-only), but the naming is inconsistent: `ADMIN_ROLES` vs `STAFF_ROLES`. Minor readability issue.
- Line 23: Same `req.session = { user }` mutation as srs/actions (F8).

**Verdict:** OK. Consistent with its narrower scope.

---

### 9. `metrics/srs/route.ts`

**Structure:** Direct handler. Both `GET` and `POST` exported. Manual auth.

**Issues:**
- Same `STAFF_ROLES` / `getCurrentUser` pattern as srs/actions (F8).
- Line 23, 42: `req.session = { user }` mutation (F8).
- GET handler returns `getSRSHealthMetrics`, POST handler returns `refreshSRSHealthViews` — correct HTTP semantics.

**Verdict:** OK.

---

### 10. `metrics/stream/route.ts`

**Structure:** SSE endpoint using `ReadableStream`. Direct handler, no auth.

**Issues:**
- **Finding (F10, HIGH):** **No authentication.** The `GET` handler (line 67) has no auth check whatsoever. Any unauthenticated client can connect to `/api/v1/metrics/stream` and receive real-time metrics updates including cache statistics. This is a data exposure issue — cache stats and metrics update events should be restricted to authorized users.

- **Finding (F11, MEDIUM):** Lines 19-48 — `SimpleMetricsEmitter` is an in-memory singleton. In serverless deployments (Vercel, Cloud Run with multiple instances), each instance maintains its own listener list. SSE events emitted on one instance won't reach listeners connected to other instances. This makes the SSE endpoint unreliable in multi-instance deployments.

- **Finding (F12, LOW):** Line 52 — `export const runtime = 'nodejs'` forces Node.js runtime, which is correct for SSE (Edge runtime has limitations with long-lived connections). But this conflicts with the rest of the metrics routes which run on Edge by default.

- Line 89: `getMetricsCacheStats()` is called in the initial connection message — exposes cache internals to unauthenticated clients (F10).

- Line 112: `req.signal.addEventListener('abort', ...)` — correct cleanup pattern for SSE connections.

**Verdict:** F10 is a security finding. The endpoint must require authentication.

---

### 11. `metrics/system/route.ts`

**Structure:** Edge router with complex inline handler. Uses both `protect` middleware AND `requireRole` guard (double auth).

**Issues:**
- **Finding (F13, MEDIUM):** Lines 110-111 + 117 — Double auth: `router.use(protect)` AND `await requireRole([Role.SYSTEM, Role.ADMIN])(req)`. The `protect` middleware ensures the user is authenticated. Then `requireRole` checks the role. This is redundant but not harmful — however, if `protect` returns a non-NextResponse on failure (e.g., throws), the `requireRole` check never runs. This is fragile coupling between two auth systems.

- **Finding (F14, MEDIUM):** Lines 125-131 — Calls `getActivityMetrics(req)` and `getAssignmentMetrics(req)` which are controller functions that return `NextResponse` objects. Then calls `.json()` on them (lines 130-131). This means the route handler is deserializing response objects from other controllers — if those controllers change their response format (e.g., wrap data in a `{ data: ... }` envelope), this endpoint breaks silently.

- **Finding (F15, LOW):** Lines 20-52 — `getRecentActivities()` and `calculateSystemHealth()` contain business logic (DB queries, health checks) directly in the route file. Per AGENTS.md, business logic should live in backend modules, not route handlers. These functions should be in a controller or domain module.

- Line 61: `db.execute(sql`SELECT 1`)` — raw SQL for DB health check. Functional but could use the DB adapter.
- Line 83: `const uptime = '99.9%'` — hardcoded uptime value. Not real.
- Line 80: Error rate logic: `totalActivities > 1000 ? 'Low' : totalActivities > 0 ? 'Low' : 'Unknown'` — both >1000 and >0 return 'Low', making the ternary pointless.

**Verdict:** F14 is the most actionable concern. F15 violates the architecture guidelines.

---

### 12. `metrics/velocity/route.ts`

**Structure:** Edge router pattern. Single `GET` handler.

**Issues:**
- Line 18: `as any` cast (F2).

**Verdict:** OK. Thin route file.

---

### 13. `passage/[articleId]/route.ts`

**Structure:** Edge router with context adapter (`adaptContext`).

**Issues:**
- **Finding (F16, MEDIUM):** Lines 35-60 — Three exported handlers (`GET`, `POST`, `DELETE`) but only `DELETE` is registered on the router. The `GET` and `POST` exports run middleware but have no handler. A GET or POST to `/api/v1/passage/[articleId]` will execute `logRequest` + `protect` and then throw `"Expected a NextResponse from router.run"` — resulting in a 500 error instead of a 405 Method Not Allowed.

- Lines 28-33: `adaptContext()` correctly transforms `articleId` → `article_id` for the controller. Good adapter pattern.

- The router is only configured with `router.delete(deleteArticle)` — no GET or POST handlers.

**Verdict:** F16 is the primary concern. Should either register handlers or remove the orphaned exports.

---

### 14. `passage/route.ts`

**Structure:** Edge router pattern.

**Issues:**
- Line 18: Commented-out handler: `// router.get(getArticleWithParams) as any;`. Dead code.
- Line 19: `router.get(getArticles) as any` — active handler, with `as any` cast (F2).
- Line 19: The route only has GET. No POST/PUT/DELETE registered.

**Verdict:** Minor (commented-out code). Otherwise OK.

---

### 15. `stories/.../laq/[questionNumber]/feedback/route.ts`

**Structure:** Edge router. Only `POST` registered.

**Issues:**
- **Finding (F17, LOW):** Line 21 — Exported `GET` handler runs the router with only a POST handler registered. Same orphaned handler pattern as F3. A GET request would 500.

- Lines 17-18: `logRequest` + `protect` middleware — correct.

**Verdict:** Orphaned GET export (F17, part of F3 pattern).

---

### 16. `stories/.../laq/[questionNumber]/getxp/route.ts`

**Structure:** Identical structure to feedback/route.ts.

**Issues:**
- Orphaned GET export (same as F17).

**Verdict:** Same orphaned handler pattern.

---

### 17. `stories/.../laq/[questionNumber]/route.ts`

**Structure:** Edge router. Only `POST` (answerStoryLAQuestion) registered.

**Issues:**
- Orphaned GET export (same as F17).

**Verdict:** Same orphaned handler pattern.

---

### 18. `stories/.../laq/route.ts`

**Structure:** Edge router. Only `GET` (getStoryLAQuestion) registered.

**Issues:**
- **Finding (F18, LOW):** Line 30 — Exported `POST` handler runs the router with only a GET handler registered. Reverse orphaned pattern — POST requests would 500.

**Verdict:** Reverse orphaned handler pattern.

---

### 19. `stories/.../mcq/[questionNumber]/route.ts`

**Structure:** Edge router. Only `POST` (answerStoryMCQuestion) registered.

**Issues:**
- Orphaned GET export (same as F17).

**Verdict:** Same orphaned handler pattern.

---

### 20. `stories/.../mcq/route.ts`

**Structure:** Edge router. `GET` (getStoryMCQuestions) and `DELETE` (retakeStoryMCQuestion) registered.

**Issues:**
- Lines 34-42: Commented-out `POST` handler export. Dead code.
- No orphaned handler issues — only the registered methods are exported.

**Verdict:** Minor (commented-out code). Otherwise OK.

---

## Summary of Findings

| ID | Severity | File(s) | Description |
|----|----------|---------|-------------|
| F1 | MEDIUM | All metrics routes | Three competing auth patterns create inconsistent error contracts |
| F2 | LOW | All edge-router routes | `as any` cast defeats TypeScript on every handler registration |
| F3 | MEDIUM | passage/[articleId], stories/* (6 files) | Orphaned HTTP method exports run middleware but have no handler, producing 500 instead of 405 |
| F4 | LOW | metrics/cache | Missing explicit 400 for malformed JSON body |
| F5 | HIGH | metrics/route.ts | Aggregate endpoint makes self-referencing HTTP fetch calls to own sub-endpoints |
| F6 | MEDIUM | metrics/route.ts | Module-level singleton initialization unreliable in serverless/multi-instance |
| F7 | LOW | metrics/route.ts | Partial aggregate failures silently swallowed |
| F8 | MEDIUM | srs/actions, srs/refresh, srs/route | Manual auth + `req.session` mutation diverges from edge-router `protect` pattern |
| F9 | LOW | srs/refresh | Naming inconsistency (ADMIN_ROLES vs STAFF_ROLES) |
| F10 | HIGH | metrics/stream | No authentication — unauthenticated clients can access SSE metrics stream |
| F11 | MEDIUM | metrics/stream | In-memory emitter unreliable in multi-instance deployments |
| F12 | LOW | metrics/stream | `runtime = 'nodejs'` conflicts with edge-default peer routes |
| F13 | MEDIUM | metrics/system | Double auth (protect + requireRole) — fragile coupling |
| F14 | MEDIUM | metrics/system | Deserializes Response objects from other controllers — fragile contract coupling |
| F15 | LOW | metrics/system | Business logic (DB queries, health checks) in route file instead of domain module |
| F16 | MEDIUM | passage/[articleId] | Only DELETE registered; GET/POST orphaned (F3 pattern) |
| F17 | LOW | stories/* (6 files) | Part of F3 orphaned handler pattern |
| F18 | LOW | stories/laq/route.ts | Reverse orphaned pattern — POST exported but only GET registered |

**Findings by severity:** HIGH: 2, MEDIUM: 7, LOW: 9

**Blocking concerns:** F5 (self-referencing fetch) and F10 (no auth on SSE) are the most significant findings. F10 is a security concern. F5 is an architectural fragility concern.

**Pattern concerns:** F3 (orphaned handlers) affects 7 files and should be addressed as a batch fix — either register the handler or remove the orphaned export.

---

## Metrics Route Contract Map

```
GET  /api/v1/metrics              → aggregate (self-fetches sub-endpoints)
GET  /api/v1/metrics/assignments  → getAssignmentMetrics (edge-router)
GET  /api/v1/metrics/cache        → POST only — cache invalidation (requireRole SYSTEM)
GET  /api/v1/metrics/dashboard-summary → getDashboardSummary (edge-router)
GET  /api/v1/metrics/genres       → getGenreMetrics (edge-router)
GET  /api/v1/metrics/health       → health check (requireRole SYSTEM|ADMIN)
GET  /api/v1/metrics/srs          → getSRSHealthMetrics (manual auth)
POST /api/v1/metrics/srs          → refreshSRSHealthViews (manual auth)
POST /api/v1/metrics/srs/actions  → executeQuickAction (manual auth, STAFF)
GET  /api/v1/metrics/srs/actions  → getAvailableQuickActions (manual auth, STAFF)
POST /api/v1/metrics/srs/refresh  → refreshSRSHealthViews (manual auth, ADMIN)
GET  /api/v1/metrics/stream       → SSE (NO AUTH)
GET  /api/v1/metrics/system       → system dashboard (edge-router + requireRole)
GET  /api/v1/metrics/velocity     → getVelocityMetrics (edge-router)
```

**Inconsistency note:** `/metrics/srs` POST and `/metrics/srs/refresh` POST both call `refreshSRSHealthViews`. The refresh endpoint requires ADMIN role while the base srs POST requires only STAFF. This means a TEACHER can trigger a refresh via `POST /metrics/srs` but not via `POST /metrics/srs/refresh` — the same operation with different auth gates on different paths.
