# Plan: Observability Stack — Sentry + Request Context + Tracing

> TDD-first. Each FR writes failing tests before the implementation. The 5 largest `route.ts` files are migrated in Phase 5; the remaining 42 `console.*` sites are batched in Phase 6.

## Phase 0: Setup

> Mid-Red evidence: Phase 0 is coordination + surface-mapping. Per `test-strategy.md` §2 the
> testing pyramid starts at Phase 1; there is no functional behavior in Phase 0 to pin a Red
> contract against. Marked complete with evidence below rather than a false Red. See
> `test-strategy.md` for the binding Phase 1–9 contract pipeline.
>
> **Worktree hygiene at MID start:** unrelated dirty paths preserved (commit `7cf38840`
> touched only the two track files; `pnpm-lock.yaml` was unstaged from a prior unmerged
> index state but its on-disk content is byte-identical — hash `abf8aebe31071d1b0384ee0e95c85fa0`
> pre and post; `git ls-files --unmerged` is now empty so future commits are unblocked).

- [x] Task: Read `lib/observability/logger.ts` and `lib/observability/metrics.ts`; understand the current surface. [track_id: observability_stack_20260603] [7cf3884]
  - Evidence: `apps/science-advantage/lib/observability/logger.ts:1-37` — current shape is a `LogPayload = Record<string, unknown>` sink that emits to `console.{info,warn,error}` with a `'[observability]'` prefix; no request-context reading, no JSON serialization of the full line. `apps/science-advantage/lib/observability/metrics.ts:1-32` — uses `console.info('[metrics]', {...})` with the same console-sink pattern; the 1 `console.*` site to migrate in Phase 8c is `lib/observability/metrics.ts:15`. Tests in Phase 4 will replace these sinks; current behavior is the Red baseline.
- [x] Task: Coordinate with Track 4 (Audit Log) — the audit event will be enriched with the request context automatically once `runWithRequestContext` is in place. [track_id: observability_stack_20260603] [7cf3884]
  - Evidence: `test-strategy.md` §4 (Cross-Phase Edge Cases & Dependencies) — Track 4 coupling captured as a shared fixture note (Phase 4 tests re-run the async-leakage assertion once the logger reads the store). `test-strategy.md` §6 (Phase 9) — Sentry throw-in-route + OTel generateObject-span are the FR-1/FR-5 live gates that also exercise the audit-event enrichment path. No code coupling required in Phase 0.
- [x] Task: Coordinate with Track 5 (AI Adapter) — the OTel span wrapping for `generateObject` lands in `packages/ai/src/providers/openai.ts` (or `google.ts`), not in `lib/ai/`. If Track 5 has completed, the wrapping is in the new client; if not, wrap in `lib/ai/recommendation-service.ts` for now and migrate later. [track_id: observability_stack_20260603] [7cf3884]
  - Evidence: `test-strategy.md` §1 (Build-Graph Findings That Shape This Strategy) — `build-graph search generateObject` confirms call sites in `packages/ai/*` and `packages/domain/codecamp/review-exercise.ts`; Phase 6 must stay inside `apps/science-advantage/lib/ai/recommendation-service.ts` (or Track-5's OpenAI provider) and **not** alter `packages/ai` signatures. Track 5 (`ai_adapter_package_20260603`) is **archived** per `measure/tracks.md:100`, so Phase 6 wraps inside the new `packages/ai` provider; if that boundary proves too tight during Phase 6, the fallback is `apps/science-advantage/lib/ai/recommendation-service.ts` per the original task wording.

## Phase 1: Sentry Installation + Configuration

> Mid-Red evidence (this phase): the Phase 1 contract test
> `apps/science-advantage/lib/observability/__tests__/sentry-config.contract.test.ts`
> is intentionally red at MID handoff. It mocks `@sentry/nextjs`, imports
> `sentry.client.config.ts` and `sentry.server.config.ts`, and asserts
> `Sentry.init` was called once with the FR-1 shape. Both source files are
> missing, so the import fails (the expected Red). The Green/closeout gate is
> the same command exiting 0; the live-behavior throw-in-route gate is owned
> by Phase 9 per `test-strategy.md` §6 (Phase 1 notes) and §7.
>
> **Targeted Red command actually executed at MID** (run on 2026-06-19,
> rootless-podman host cannot reach `localhost:5432` so the default
> `vitest.config.ts` integration globalSetup hangs on `drizzle-kit migrate`;
> the hermetic `vitest.unit.config.ts` is the app-AGENTS-canonical
> DB-free subset per `apps/science-advantage/AGENTS.md` Testing Guidelines,
> so the unit config is the bounded Red proof here):
>
> ```
> pnpm --filter science-advantage exec vitest run \
>   --config vitest.unit.config.ts \
>   lib/observability/__tests__/sentry-config.contract.test.ts
> ```
>
> **Result:** exit 1 — `Test Files 1 failed (1) | Tests 2 failed (2)`.
> Both failures are `Error: Cannot find module '/sentry.{client,server}.config'`,
> i.e. the FR-1 implementation files are missing — the **expected Red**.
> Live-behavior throw-in-route gate remains Phase 9 (test-strategy.md §6).
>
> Canonical command from `test-strategy.md` §7 (`pnpm --filter science-advantage
> exec vitest run lib/observability/__tests__/sentry-config.contract.test.ts`,
> no `--config` flag) is unchanged in the strategy doc; the unit-config variant
> here is a host-environment substitution, not a strategy change. When the
> Postgres port is reachable again (rootless podman forwarding fix), the
> canonical command should be re-run for the Green gate and recorded under
> Phase 9 acceptance.

- [~] Task: Add `@sentry/nextjs` to `apps/science-advantage/package.json` `dependencies`.
- [~] Task: `pnpm install` from monorepo root; verify install.
- [~] Task: Create `apps/science-advantage/sentry.client.config.ts` with the Sentry init (FR-1).
- [~] Task: Create `apps/science-advantage/sentry.server.config.ts` similarly.
- [~] Task: Add `SENTRY_DSN` to `.env.example` with a comment.
- [~] Task: Build: `pnpm turbo run build --filter=science-advantage`; confirm Sentry is wired.

## Phase 2: OpenTelemetry Installation + Configuration

- [ ] Task: Add `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions` to `apps/science-advantage/package.json`.
- [ ] Task: `pnpm install`; verify install.
- [ ] Task: Create `apps/science-advantage/instrumentation.ts` with the `register()` entry point.
- [ ] Task: Create `apps/science-advantage/instrumentation.node.ts` that registers the NodeSDK with the OTLP exporter (or console exporter if `OTEL_EXPORTER_OTLP_ENDPOINT` is unset).
- [ ] Task: Add `OTEL_EXPORTER_OTLP_ENDPOINT` (optional) and `OTEL_SERVICE_NAME` to `.env.example`.
- [ ] Task: Build; confirm the instrumentation file is picked up by Next.js.

## Phase 3: `AsyncLocalStorage<RequestContext>`

- [ ] Task: Create `lib/observability/context.ts` with `RequestContext` interface, `AsyncLocalStorage<RequestContext>`, `getRequestContext`, `runWithRequestContext` (FR-3).
- [ ] Task: Write failing tests:
  - `runWithRequestContext(ctx, () => getRequestContext())` returns `ctx`.
  - `getRequestContext()` outside `runWithRequestContext` returns `undefined`.
  - Nested `runWithRequestContext` calls return the inner context.
  - `runWithRequestContext` does not leak context to sibling async work.
- [ ] Task: Implement. Confirm.

## Phase 4: Logger Auto-Attaches Context

- [ ] Task: Update `lib/observability/logger.ts` per FR-4. The `log()` function reads `getRequestContext()` and includes `requestId`/`userId`/`route`/`method`/`latencyMs` in the log line.
- [ ] Task: Write failing tests:
  - `logger.info('test', {})` outside a `runWithRequestContext` emits a line without `requestId`/`userId`.
  - `runWithRequestContext(ctx, () => logger.info('test', {}))` emits a line with `requestId: ctx.requestId`, `latencyMs: ...` (non-zero, < 1000ms).
  - The log line is valid JSON.
- [ ] Task: Implement. Confirm.

## Phase 5: Migrate 5 Largest `route.ts` Files

For each of the 5 files:
- [ ] Task: Wrap the top-level handler in `runWithRequestContext({ requestId: ulid(), route: req.url, method: req.method, startedAt: Date.now() }, async () => { ... })`. The `userId` is set after `requireAuth` returns.
- [ ] Task: Replace each `console.error` catch block with `logger.error(event, { error, ...otherContext })`.
- [ ] Task: Replace each `console.log` / `console.info` with `logger.info` / `logger.warn`.
- [ ] Task: Write a test that calls the route handler; capture the log line; assert `requestId`/`route`/`method`/`latencyMs` are present and the log line is valid JSON.
- [ ] Task: Run the existing test suite; confirm green.

Files (in priority order):
- [ ] `app/api/ai/update-mastery/route.ts` (624 lines)
- [ ] `app/api/lessons/[lessonSlug]/quiz/route.ts` (519 lines)
- [ ] `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (412 lines)
- [ ] `app/api/ai/recommendations/route.ts` (400 lines)
- [ ] `app/api/classes/[classId]/assignments/route.ts` (364 lines)

## Phase 6: Wrap `generateObject` Calls in OTel Spans

- [ ] Task: In `lib/ai/recommendation-service.ts` (or the refactored `packages/ai/src/providers/openai.ts` if Track 5 has completed), wrap `generateObject` in `tracer.startActiveSpan('ai.generateObject', ...)`.
- [ ] Task: Add `span.setAttribute('ai.model', ...)` and `span.setAttribute('ai.schema', ...)`.
- [ ] Task: Wrap the try/catch: `span.recordException(err); span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })`.
- [ ] Task: Replace the ad-hoc `traceId` field in `recommendation-service.ts:97, 126, 144, 153` with `trace.getSpan(context.active())?.spanContext().traceId`.
- [ ] Task: Write a test: call `generateObject`; assert a span is created with the right attributes; assert the `traceId` matches the span context.
- [ ] Task: Confirm.

## Phase 7: ESLint `no-console` Rule

- [ ] Task: Update `apps/science-advantage/eslint.config.mjs` to add `no-console: ['error', { allow: ['error', 'warn'] }]`.
- [ ] Task: Exclude `lib/observability/logger.ts` (the sink) and `**/*.test.ts`/`__tests__/`.
- [ ] Task: Run `pnpm turbo run lint --filter=science-advantage`; the 42 remaining `console.log`/`console.info` sites fail the lint.
- [ ] Task: Document the rule in `eslint.config.mjs` comments.

## Phase 8: Replace Remaining 42 `console.*` Sites

For each site (Phase 8a–8e):

### Phase 8a: 25 in `app/` (other route handlers)
- [ ] Task: For each non-test `console.log/error/warn/info` in `app/api/**/route.ts` (other than the 5 in Phase 5): replace with `logger.*`.
- [ ] Task: Add a `runWithRequestContext` wrapper at the top of each handler (if not already wrapped by Phase 5).

### Phase 8b: 30 in `components/` (client-side)
- [ ] Task: Create `components/client-logger.ts` with a `clientLogger` that uses `console.*` in dev (`process.env.NODE_ENV === 'development'`) and no-ops in prod. Optionally sends to Sentry's browser SDK in prod.
- [ ] Task: For each `console.*` in `components/`, replace with `clientLogger.*`.
- [ ] Task: Special handling for `console.log("[Telemetry] ...")` in `intervention-alerts-widget.tsx` — the maintainer decides whether to keep as a real telemetry shim (behind a feature flag) or replace with `clientLogger.debug`.

### Phase 8c: 8 in `lib/`
- [ ] Task: For each `console.*` in `lib/` (other than the logger sink): replace with `logger.*`.
- [ ] Task: The 3 in `lib/observability/logger.ts` are the sink itself — keep.
- [ ] Task: The 2 in `lib/schemas/lesson-content.schema.ts` are JSDoc examples — keep.
- [ ] Task: The 1 in `lib/observability/metrics.ts` — replace with `logger.info` (the metrics sink upgrades to a no-op if Sentry is wired).
- [ ] Task: The 1 in `lib/utils/clipboard.ts` — replace.
- [ ] Task: The 1 in `lib/analytics.ts:18` — replace.

### Phase 8d: 3 in `proxy.ts`
- [ ] Task: Replace `console.error` in `proxy.ts:25, 55, 72, 102` with `logger.error`.

### Phase 8e: Grep gate
- [ ] Task: `rg "console\.(log|info)" apps/science-advantage/{app,lib,components}/ proxy.ts` returns 0 hits (modulo the logger sink + JSDoc examples).
- [ ] Task: `rg "console\.(error|warn)" apps/science-advantage/{app,lib,components}/ proxy.ts` returns only the logger sink.

## Phase 9: Final Acceptance

- [ ] Task: Sentry test: write a route handler that throws; assert Sentry's mock `captureException` is called with the right error.
- [ ] Task: OTel test: write a route handler that calls `generateObject`; assert a span is created with the right attributes.
- [ ] Task: `pnpm turbo run test --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run lint --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run build --filter=science-advantage` exits 0.
- [ ] Task: Grep gate: 0 `console.log`/`console.info` in production code.

## Phase 10: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-902, F-903, F-904, F-905, F-906 `Resolved`.
- [ ] Task: Add a lessons-learned entry: "AsyncLocalStorage + Sentry + OTel is the right observability stack; the alternative (pino + Datadog + per-app exporters) is more work for less value."
- [ ] Task: Move track to `measure/archive/observability_stack_20260603/` and update `measure/tracks.md`.
