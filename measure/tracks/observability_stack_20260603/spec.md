# Specification: Observability Stack — Sentry + Request Context + Tracing

## Overview

Replace `lib/observability/logger.ts` (a console-sink wrapper) with a structured-logging stack that auto-attaches `requestId`, `userId`, `latencyMs` to every log line via `AsyncLocalStorage<RequestContext>`. Add `@sentry/nextjs` for error reporting and `@opentelemetry/sdk-node` + `@opentelemetry/exporter-trace-otlp-http` for distributed tracing. Wire Sentry + OTel into `instrumentation.ts` (Next.js convention). Wrap `generateObject` calls in real OTel spans; replace the ad-hoc `traceId` field with `trace.getSpan(context.active())?.spanContext().traceId`. Migrate the 67 `console.log/error/warn/info` hits to the structured logger (with an ESLint rule to prevent regression). Fulfills AGENTS.md §9.1 (structured logs with `requestId`/`userId`/`operation`/`latencyMs`), §9.2 (no `console.*` in production), §9.3 (error reporting), and §9.6 (request tracing).

## Problem

Audited 2026-06-03. Findings F-902 (Medium) + F-903 (Medium) + F-904 (Medium) + F-905 (Medium) + F-906 (Low):

### F-902 — 67 `console.log/error/warn/info` hits in production code
- 25 in `app/`, 30 in `components/`, 8 in `lib/`, 3 in `proxy.ts`. 4 of the 30 client-side are `console.log("[Telemetry] ...")` in `components/features/teacher/intervention-alerts-widget.tsx` that ship to production.

### F-903 — No Sentry / OpenTelemetry / equivalent error reporter; no `instrumentation.ts`
- 0 `Sentry`/`@sentry/*`/`opentelemetry`/`@opentelemetry/*` packages or code references. 6 archived-doc mentions only.
- No `instrumentation.ts` at the app root.

### F-904 — Structured logger does not auto-propagate `requestId` / `userId` / `latencyMs`; 5 largest `route.ts` files emit zero structured logs
- `lib/observability/logger.ts:1-37` does not auto-attach request context.
- 5 largest route.ts files: `app/api/ai/update-mastery/route.ts` (624, does emit `logger.*` but no `requestId`/`latencyMs`); `app/api/lessons/[lessonSlug]/quiz/route.ts` (519, zero); `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (412, zero); `app/api/ai/recommendations/route.ts` (400, no context); `app/api/classes/[classId]/assignments/route.ts` (364, zero).
- No `AsyncLocalStorage` usage.

### F-905 — No request tracing; `traceId` field is not a real OTel span
- 0 `trace(`/`span(`/`opentelemetry` matches. 4 `traceId` references in `lib/ai/recommendation-service.ts:97, 126, 144, 153` are an opaque payload field, never tied to an HTTP request header.

### F-906 — `lib/observability/logger.ts` is a console-sink wrapper (no pino / winston / OTel exporter)
- 0 `pino`/`winston`/`bunyan` packages.

## Why

- AGENTS.md §9 has mandated structured logging, error reporting, and tracing since the monorepo was scaffolded. This track is the implementation.
- 67 `console.*` calls in production code is a real maintainability + operability issue: a client error report cannot be correlated to a server log line; SLO dashboards cannot be built.
- Track 4 (Audit Log) benefits from the same `withRequestContext` plumbing — the audit event is enriched with the request context automatically.

## Functional Requirements

### FR-1: Sentry Installation + Configuration

- Add `@sentry/nextjs` to `apps/science-advantage/package.json` `dependencies`.
- Create `apps/science-advantage/sentry.client.config.ts`:
  ```ts
  import * as Sentry from '@sentry/nextjs';
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
  ```
- Create `apps/science-advantage/sentry.server.config.ts`: same with `tracesSampleRate: 0.05` (lower for server; Sentry's recommended default).
- Wire DSN via `SENTRY_DSN` env (already referenced in archived `docs/archive/onboarding/environment.md:73`).
- Add `SENTRY_DSN` to `.env.example` (with comment: "required in production; omit in development").

### FR-2: OpenTelemetry Installation + Configuration

- Add `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions` to `dependencies`.
- Create `apps/science-advantage/instrumentation.ts` (Next.js convention):
  ```ts
  export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./instrumentation.node.ts');
    }
  }
  ```
- `instrumentation.node.ts` registers an OTLP exporter + resource attributes (`service.name: science-advantage`, `service.version: <git-sha>`).
- For local dev, fall back to a console exporter (no OTLP collector required).
- For production, set `OTEL_EXPORTER_OTLP_ENDPOINT` env to the collector URL.

### FR-3: `AsyncLocalStorage<RequestContext>`

Create `lib/observability/context.ts`:

```ts
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  route: string;
  method: string;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined;
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T;
```

- `runWithRequestContext` populates the context for the duration of `fn`; nested calls inherit.
- The Next.js middleware (`proxy.ts`) or a top-level wrapper in each route handler calls `runWithRequestContext({ requestId: ulid(), ... }, () => { ... })`.

### FR-4: Logger Auto-Attaches Context

Update `lib/observability/logger.ts`:

```ts
import { getRequestContext } from './context';

export function log(level: 'info' | 'warn' | 'error', event: string, payload: Record<string, unknown>) {
  const ctx = getRequestContext();
  const line = {
    event,
    level,
    timestamp: new Date().toISOString(),
    ...(ctx ? {
      requestId: ctx.requestId,
      userId: ctx.userId,
      route: ctx.route,
      method: ctx.method,
      latencyMs: Date.now() - ctx.startedAt,
    } : {}),
    ...payload,
  };
  if (level === 'error') console.error(JSON.stringify(line));
  else if (level === 'warn') console.warn(JSON.stringify(line));
  else console.info(JSON.stringify(line));
}

export const logger = {
  info: (event: string, payload?: Record<string, unknown>) => log('info', event, payload ?? {}),
  warn: (event: string, payload?: Record<string, unknown>) => log('warn', event, payload ?? {}),
  error: (event: string, payload?: Record<string, unknown>) => log('error', event, payload ?? {}),
};
```

- Write tests: `logger.info('test', {})` outside a `runWithRequestContext` emits a line without `requestId`; inside, it emits the line with `requestId`/`userId`/`latencyMs`.
- Optional: upgrade to `pino` for performance (the interface is forward-compatible). Defer to a follow-up track.

### FR-5: Wrap `generateObject` Calls in OTel Spans

- In `lib/ai/recommendation-service.ts` (or the refactored `packages/ai/src/providers/openai.ts` from Track 5):
  ```ts
  import { trace } from '@opentelemetry/api';
  const tracer = trace.getTracer('science-advantage');
  return tracer.startActiveSpan('ai.generateObject', async (span) => {
    span.setAttribute('ai.model', input.model ?? 'default');
    span.setAttribute('ai.schema', input.schema.description ?? 'unknown');
    try {
      const result = await generateObject(input);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  });
  ```
- Replace the ad-hoc `traceId` field in `recommendation-service.ts:97, 126, 144, 153` with `trace.getSpan(context.active())?.spanContext().traceId`.

### FR-6: Migrate 5 Largest `route.ts` Files

- `app/api/ai/update-mastery/route.ts` (624 lines) — wrap the top-level handler in `runWithRequestContext`; replace `console.error` catch blocks with `logger.error`.
- `app/api/lessons/[lessonSlug]/quiz/route.ts` (519 lines) — same.
- `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (412 lines) — same.
- `app/api/ai/recommendations/route.ts` (400 lines) — same.
- `app/api/classes/[classId]/assignments/route.ts` (364 lines) — same.

For each:
- Wrap the handler in `runWithRequestContext` (1-line change at the top of the function).
- Replace `console.error` with `logger.error`.
- Replace `console.log` with `logger.info`.
- Add a test asserting the log line includes `requestId`/`userId`/`latencyMs`.

### FR-7: ESLint Rule to Prevent `console.*` Regression

- Add `no-console` ESLint rule: `error` for `console.log`/`console.info`; `warn` for `console.warn`; allow `console.error` (last-resort fallback; Sentry captures before this).
- Exclude test files and `lib/observability/logger.ts` (the console sink itself).
- Document in `eslint.config.mjs`.

### FR-8: Replace Remaining 42 `console.*` Sites

For the remaining 42 (out of 67) `console.*` sites that are NOT in the 5 largest route.ts files (already handled by FR-6):

- 25 in `app/` (other route handlers) — replace with `logger.{info,warn,error}`.
- 30 in `components/` (client-side) — replace with a `clientLogger` that no-ops in production but logs in dev. (Or send to Sentry's browser SDK once Sentry is configured for the client.)
- 8 in `lib/` — replace with `logger.*`. The 3 in `lib/observability/logger.ts` are the sink itself; the 4 in `lib/observability/metrics.ts` / `lib/utils/clipboard.ts` / `lib/schemas/lesson-content.schema.ts` (JSDoc) / `lib/analytics.ts` are replaced.
- 3 in `proxy.ts` — replace with `logger.error`.

## Non-Functional Requirements

- **Zero `console.log` / `console.info` in production code** (modulo test files + `lib/observability/logger.ts`). ESLint rule enforces.
- **All structured logs include `requestId`/`userId` (if known)/`route`/`method`/`latencyMs`** when emitted from inside a `runWithRequestContext` block.
- **All `generateObject` calls wrapped in OTel spans** with `ai.model` + `ai.schema` attributes.
- **Sentry captures unhandled errors** in route handlers (verified by a test that throws in a route handler and asserts Sentry receives the error).
- **Lint + type-check + build** green for `apps/science-advantage` and the affected packages.

## Acceptance Criteria

1. `@sentry/nextjs` installed; `sentry.client.config.ts` and `sentry.server.config.ts` exist; DSN wired.
2. `@opentelemetry/api` + `@opentelemetry/sdk-node` + `@opentelemetry/exporter-trace-otlp-http` installed; `instrumentation.ts` registers the SDK.
3. `lib/observability/context.ts` with `AsyncLocalStorage<RequestContext>` exists; `runWithRequestContext` works.
4. `lib/observability/logger.ts` auto-attaches `requestId`/`userId`/`route`/`method`/`latencyMs` when in a `runWithRequestContext` block.
5. 5 largest `route.ts` files wrapped in `runWithRequestContext`; catch blocks use `logger.error`.
6. `generateObject` calls wrapped in OTel spans; `traceId` field is the real OTel span context.
7. ESLint `no-console` rule added; 0 `console.log`/`console.info` in production code.
8. 67 `console.*` sites reduced to 0 in `apps/science-advantage/{app,lib,components}/` and `proxy.ts` (modulo test files + the logger sink).
9. Sentry test: throw in a route handler; assert Sentry receives the error.
10. OTel test: call `generateObject`; assert a span is created with the right attributes.
11. `pnpm turbo run test --filter=science-advantage` exits 0.
12. `pnpm turbo run build --filter=science-advantage` exits 0.

## Out of Scope

- Upgrading `lib/observability/logger.ts` to `pino` (forward-compatible; defer to a follow-up).
- Real-time Sentry alerts / dashboards — out of scope; this track wires the SDK only.
- Log shipping to a centralized log store (e.g. Datadog, GCP Logging) — depends on the deployment platform; out of scope.
- Per-app observability policies (e.g. science-advantage traces 5% of requests, primary-advantage 10%) — out of scope; per-app config in `sentry.*.config.ts` is sufficient.
- Migrating reading-advantage, primary-advantage, www-reading-advantage, codecamp-advantage, advantage-games to the same observability stack — separate per-app tracks.

## Constraints & Risks

- **Risk: Sentry's `SENTRY_DSN` is a secret; deployment configs must not leak it.** Mitigation: read from env; document in `.env.example`; CI sets the value.
- **Risk: OTel's `OTEL_EXPORTER_OTLP_ENDPOINT` requires an OTLP collector; local dev has none.** Mitigation: the `instrumentation.node.ts` falls back to a console exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset.
- **Risk: 67 `console.*` sites is a lot of churn; some may be intentional (e.g. the 4 `console.log("[Telemetry] ...")` in `intervention-alerts-widget.tsx` may be a real client telemetry shim).** Mitigation: the maintainer decides; either replace with `clientLogger` (which no-ops in prod) or move behind a feature flag.
- **Risk: `AsyncLocalStorage` may have edge cases with Next.js's edge runtime.** Mitigation: `AsyncLocalStorage` works in the Node.js runtime (which the science app uses post-`proxy_admin_guard_hardening_20260526`).

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 9 (F-901, F-902, F-903, F-904, F-905, F-906)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 9
- `lib/observability/logger.ts:1-37` (the file to upgrade)
- `lib/observability/metrics.ts:15` (the metrics sink to upgrade)
- `proxy.ts:25, 55, 72, 102` (the 3 `console.error` sites in proxy)
- AGENTS.md §9.1, §9.2, §9.3, §9.4, §9.5, §9.6
- `docs/prd/requirements.md:NFR9` (audit logging requirement; Track 4 covers)
