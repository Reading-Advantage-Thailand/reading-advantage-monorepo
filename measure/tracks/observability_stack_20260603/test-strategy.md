# Test Strategy: Observability Stack — Sentry + Request Context + Tracing

Scope: `apps/science-advantage` only. Runner: **Vitest** (`pnpm --filter science-advantage test`); integration runner is `vitest.integration.config.ts`. Keep all new tests under `apps/science-advantage/lib/observability/__tests__/` or colocated `*.test.ts` next to route handlers. Out-of-app packages are unaffected.

## 1. Build-Graph Findings That Shape This Strategy

- `build-graph stats`: 332 files / 2288 nodes; `apps/science-advantage` is in `root` package (221 files), not split out as its own package. No cross-package symbol callers exist for the touched files.
- `build-graph search RequestContext|AsyncLocalStorage|instrumentation` → **0 hits**. Greenfield surface; tests can pin contracts without breaking callers.
- `build-graph search generateObject` → call sites only in `packages/ai/*` and `packages/domain/codecamp/review-exercise.ts`. Phase 6 must stay inside `apps/science-advantage/lib/ai/recommendation-service.ts` (or the Track-5 OpenAI provider) and **not** alter `packages/ai` signatures.
- `build-graph callers logger` → no graph-tracked callers (logger lives outside indexed package boundary). Blast radius is contained to the science-advantage app; cross-track risk only via Phase 0 coordination notes (Tracks 4 + 5).
- `console.*` audit confirms 67 sites concentrated in app/, components/, lib/, proxy.ts. ESLint rule + grep gate are the regression guards (Phase 7 + 8e).

## 2. Testing Pyramid Per Phase

| Phase | Unit | Integration / Route | Contract / Lint | Live-Behavior Proof |
|------:|:----:|:------:|:---:|:---:|
| 1 Sentry config | — | — | file-exists + import contract | build green |
| 2 OTel config | — | — | file-exists + register() returns | build green |
| 3 RequestContext | **heavy** | — | — | unit assertions |
| 4 Logger ctx | **heavy** | — | JSON-shape contract | unit assertions |
| 5 5 routes | — | **heavy** (route handler invocation) | — | captured log JSON |
| 6 OTel spans | unit (mock tracer) | one route-level | — | span attrs captured |
| 7 ESLint rule | — | — | **lint exit 0 + targeted lint exit ≠ 0 demo** | — |
| 8 Bulk migration | — | spot integration | grep gate | rg counts |
| 9 Acceptance | full vitest run | full integration | full lint | build green |

Rule: **every functional requirement gets at least one test that exercises real runtime behavior** — file-exists/import-shape tests are contract tests, never the only proof.

## 3. Shared Fixtures & Mocks

Place under `apps/science-advantage/lib/observability/__tests__/fixtures/`:

- `make-request-context.ts` → factory returning a deterministic `RequestContext` (fixed `requestId`, `startedAt = 1_700_000_000_000`, controllable `Date.now` via `vi.useFakeTimers`).
- `capture-logger.ts` → `vi.spyOn(console, 'info'|'warn'|'error')` helpers + `parseLogLine(call)` that JSON-parses the captured arg and returns the structured object. Asserts shape: `{event, level, timestamp, requestId?, userId?, route?, method?, latencyMs?}`.
- `mock-tracer.ts` → `InMemorySpanExporter` from `@opentelemetry/sdk-trace-base` registered via a test-only `BasicTracerProvider`. Returns recorded spans with `name`, `attributes`, `status`, `events` for assertions. Do **not** mock `@opentelemetry/api` directly — wire a real provider so `trace.getSpan(context.active())` returns a real context.
- `mock-sentry.ts` → `vi.mock('@sentry/nextjs', () => ({ init: vi.fn(), captureException: vi.fn(), ... }))`.
- `route-invoker.ts` → calls a Next.js route handler with a synthetic `Request`/`NextRequest` and returns `{ response, capturedLogs, capturedSpans }`. Wraps the call in a fresh `runWithRequestContext` to mimic proxy/middleware behavior.

The same `capture-logger` + `mock-tracer` fixtures must back Phases 4, 5, 6, and 9 — no per-phase reinvention.

## 4. Cross-Phase Edge Cases & Dependencies

- **Async leakage (FR-3):** Phase 3 must include a test that fires two parallel `runWithRequestContext` calls (`Promise.all([runWith(ctxA, ...), runWith(ctxB, ...)])`) and asserts neither leaks into the other. Re-run this assertion in Phase 4 once the logger reads the store.
- **`latencyMs` clock control:** Phase 4 tests must use `vi.useFakeTimers()` + `vi.setSystemTime(ctx.startedAt + N)` so `latencyMs` is deterministic, not a flaky `< 1000ms` bound.
- **Edge runtime:** `AsyncLocalStorage` is Node-only. Add a unit test that imports `lib/observability/context.ts` and asserts `process.versions.node` path is exercised; document an explicit non-goal for the Edge runtime.
- **Phase 5 ↔ Phase 6 ordering:** The OTel `traceId` swap in `recommendation-service.ts` depends on the OTel SDK from Phase 2 being registered in tests. The shared `mock-tracer` fixture must be importable in `recommendation-service.test.ts` *before* Phase 6 begins.
- **Phase 7 ↔ Phase 8 ordering:** Adding `no-console` *before* the bulk migration completes will turn the lint gate red. The plan correctly orders 7 → 8; tests must not assert lint=0 until Phase 8e closes.
- **Phase 8b client logger:** `clientLogger` is browser-only — test with `@vitest/environment jsdom` (or per-file `// @vitest-environment jsdom`) and assert dev-vs-prod behavior by toggling `process.env.NODE_ENV` via `vi.stubEnv`.
- **Track 4 / Track 5 coupling:** if Track 5 has shipped, Phase 6 tests live with the AI provider; if not, they live in `lib/ai/__tests__/recommendation-service.test.ts`. Strategy stays the same — the provider boundary moves, the assertions don’t.

## 5. Architecture Guardrails

- **No `any` for telemetry payloads.** `LogPayload = Record<string, unknown>` and span attributes typed by OTel’s `AttributeValue`.
- **Logger sink is the only `console.*` allowed** in `lib/observability/logger.ts`. ESLint exclusion limited to that one file.
- **No direct provider SDK imports outside the adapter:** routes/components import `logger`, `runWithRequestContext`, `clientLogger` only — never `@sentry/nextjs` or `@opentelemetry/api`. Add a Phase-9 grep gate: `rg "from '@sentry/nextjs'" apps/science-advantage/{app,lib,components}/` returns only `sentry.*.config.ts` and `instrumentation*.ts`.
- **`runWithRequestContext` is the sole writer to the ALS store** — no `storage.run`/`storage.enterWith` outside `context.ts`. Enforce by export shape (do not export `storage`).
- **JSON line shape is a contract.** Every emitted log line must round-trip `JSON.parse`; tested in Phase 4 and re-asserted in Phase 5.

## 6. Per-Phase Test Approach Notes

- **Phase 1 (Sentry):** Contract test that imports `sentry.client.config.ts` and `sentry.server.config.ts` and asserts `Sentry.init` was called once with `dsn`/`tracesSampleRate`/`environment`. Use `mock-sentry`. **Not a live-behavior proof — pair with the Phase 9 throw-in-route test.**
- **Phase 2 (OTel):** Import `instrumentation.ts`; assert `register()` is an async function. Add an integration test that calls `register()` under `NEXT_RUNTIME=nodejs` and asserts a `BasicTracerProvider` is registered with the expected resource attributes. Console-exporter fallback covered by setting `OTEL_EXPORTER_OTLP_ENDPOINT=''`.
- **Phase 3 (RequestContext):** Pure unit — already enumerated in plan (round-trip, undefined-outside, nested, async non-leak).
- **Phase 4 (Logger):** Spy on `console.info/warn/error`; assert the captured arg parses to JSON with expected keys; assert ctx-less call omits `requestId`; assert ctx-wrapped call includes `requestId/route/method/latencyMs` with deterministic values.
- **Phase 5 (5 routes):** Per-route test that invokes the handler via `route-invoker`, captures logs, asserts at least one log line has the full ctx payload. Each route test must also assert the response status is unchanged from pre-migration (regression guard for the wrap).
- **Phase 6 (OTel spans):** With `InMemorySpanExporter`, call the wrapped `generateObject`; assert one span with `name='ai.generateObject'`, `attributes['ai.model']`, `attributes['ai.schema']`, status=OK on happy path; status=ERROR + recorded exception on throw path. Assert the ad-hoc `traceId` field equals `span.spanContext().traceId`.
- **Phase 7 (ESLint):** Pin two micro-fixtures under `apps/science-advantage/lib/observability/__tests__/fixtures/eslint/`: `bad.ts` containing `console.log('x')` and `good.ts` using `logger.info`. Test runs `pnpm exec eslint <fixture>` and asserts exit codes (≠0 for bad, 0 for good). This is the command-construction proof for the lint gate.
- **Phase 8 (bulk migration):** Use `rg --count-matches` in a vitest test that asserts `console.(log|info)` count is 0 across `app/`, `lib/`, `components/`, `proxy.ts` (excluding the logger sink + `*.test.ts` + JSDoc fixtures in `lesson-content.schema.ts`). For 8b, jsdom-environment unit test of `clientLogger` dev/prod branching.
- **Phase 9 (Acceptance):** End-to-end Sentry test (throw in a synthetic route → assert `captureException` mock called); end-to-end OTel test (call recommendation-service path → assert span recorded). All three turbo gates green.

## 7. Live-Proof Plan (Targeted Red → Green/Closeout)

| Phase | Targeted Red command (must fail before code) | Green / closeout gate (must pass) | Live-behavior proof? |
|------:|:--|:--|:--:|
| 1 | `pnpm --filter science-advantage exec vitest run lib/observability/__tests__/sentry-config.contract.test.ts` | same command exits 0 | contract only — Phase 9 throw-test is the live proof |
| 2 | `pnpm --filter science-advantage exec vitest run lib/observability/__tests__/instrumentation.contract.test.ts` | same command exits 0 + `pnpm turbo run build --filter=science-advantage` exits 0 | live (real `register()` invocation) |
| 3 | `pnpm --filter science-advantage exec vitest run lib/observability/__tests__/context.test.ts` | same exits 0 | live |
| 4 | `pnpm --filter science-advantage exec vitest run lib/observability/__tests__/logger.test.ts` | same exits 0 | live (JSON parsed from captured console call) |
| 5 | `pnpm --filter science-advantage exec vitest run app/api/ai/update-mastery/route.test.ts app/api/lessons/\[lessonSlug\]/quiz/route.test.ts app/api/classes/\[classId\]/lessons/\[lessonId\]/analytics/route.test.ts app/api/ai/recommendations/route.test.ts app/api/classes/\[classId\]/assignments/route.test.ts` | same exits 0 | live |
| 6 | `pnpm --filter science-advantage exec vitest run lib/ai/__tests__/recommendation-service.otel.test.ts` | same exits 0 | live (real OTel SDK + InMemorySpanExporter) |
| 7 | `pnpm --filter science-advantage exec vitest run lib/observability/__tests__/eslint-no-console.test.ts` (asserts eslint exits ≠0 on `bad.ts`, =0 on `good.ts`) | same exits 0 | command-construction proof — bounded to two fixture files, **never invokes full `pnpm lint`** so it cannot mask other lint failures |
| 8 | `pnpm --filter science-advantage exec vitest run lib/observability/__tests__/no-console-grep.test.ts` | same exits 0 + `pnpm turbo run lint --filter=science-advantage` exits 0 | live (rg counts) |
| 9 | full: `pnpm turbo run test --filter=science-advantage && pnpm turbo run lint --filter=science-advantage && pnpm turbo run build --filter=science-advantage` | all three exit 0 | live |

**Fake harnesses are forbidden for production gates.** The Phase 1 sentry contract test mocks `@sentry/nextjs` (pure plumbing) — it is explicitly *not* the gate for FR-1; Phase 9’s throw-in-route test is. Similarly, the Phase 7 eslint fixture test is bounded to two files so it cannot fall through into a passing full-suite run.

## 8. Intentionally-Red Test Files

- During Phases 1–8, every new `*.test.ts` written ahead of its implementation is intentionally red. Each must be **owned by a still-`[~]` task** in `plan.md` and committed in the same change as the failing implementation it points at.
- The aggregate `pnpm turbo run test --filter=science-advantage` runs in Phase 9 only. Earlier red files are excluded from CI by **not committing them outside an active in-progress task** — do **not** add `.skip` or path-ignore globs (which mask regressions). If a phase must land partial, mark its plan tasks `[~]` and gate Phase 9 acceptance on that task closing.
- The Phase 7 eslint fixture files (`fixtures/eslint/bad.ts`, `good.ts`) are **excluded from app linting** via `eslint.config.mjs` `ignores: ['lib/observability/__tests__/fixtures/eslint/**']` — they are test inputs, not production code, and including them in the global lint would create a permanent red.
