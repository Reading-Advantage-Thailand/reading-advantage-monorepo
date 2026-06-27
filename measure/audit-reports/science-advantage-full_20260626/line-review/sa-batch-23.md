# Line Review: sa-batch-23

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-23 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns
- **File types**: Observability test fixtures (4), observability tests (6), observability production code (3), platform tests (3), platform production code (4)

---

## Files Reviewed

1. `apps/science-advantage/lib/observability/__tests__/fixtures/eslint/bad.ts`
2. `apps/science-advantage/lib/observability/__tests__/fixtures/eslint/good.ts`
3. `apps/science-advantage/lib/observability/__tests__/fixtures/make-request-context.ts`
4. `apps/science-advantage/lib/observability/__tests__/fixtures/mock-tracer.ts`
5. `apps/science-advantage/lib/observability/__tests__/instrumentation.contract.test.ts`
6. `apps/science-advantage/lib/observability/__tests__/live-otel-initialization.acceptance.test.ts`
7. `apps/science-advantage/lib/observability/__tests__/live-sentry-initialization.acceptance.test.ts`
8. `apps/science-advantage/lib/observability/__tests__/logger.adversarial.test.ts`
9. `apps/science-advantage/lib/observability/__tests__/logger.test.ts`
10. `apps/science-advantage/lib/observability/__tests__/no-console-grep.test.ts`
11. `apps/science-advantage/lib/observability/__tests__/phase-10-closeout.test.ts`
12. `apps/science-advantage/lib/observability/__tests__/sentry-config.contract.test.ts`
13. `apps/science-advantage/lib/observability/context.ts`
14. `apps/science-advantage/lib/observability/logger.ts`
15. `apps/science-advantage/lib/observability/metrics.ts`
16. `apps/science-advantage/lib/platform/cache-adapter.test.ts`
17. `apps/science-advantage/lib/platform/cache-adapter.ts`
18. `apps/science-advantage/lib/platform/integration.test.ts`
19. `apps/science-advantage/lib/platform/rate-limit-store.ts`
20. `apps/science-advantage/lib/platform/redis-client.ts`

---

## File-by-File Findings

### File 1: `fixtures/eslint/bad.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (test fixture) |
| **AGENTS.md compliance** | OK |
| **Test quality** | OK — minimal, single `console.log` as spec demands |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Single-line fixture intentionally uses `console.log('phase7-bad-fixture-console-log')`. Pattern matches the test-strategy.md §6 spec: one faithful proxy for legacy `console.log` sites. No issues. | OK | — |

---

### File 2: `fixtures/eslint/good.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (test fixture) |
| **AGENTS.md compliance** | OK |
| **Test quality** | OK — fixture intentionally uses undeclared `logger` to avoid importing real code |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | `logger.info(...)` — intentionally undeclared per test-strategy.md §8. Comment explains why ESLint's TS parser doesn't flag it. No issues. | OK | — |

---

### File 3: `fixtures/make-request-context.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (test fixture) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — deterministic factory, well-typed, JSDoc on all exports |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–65 | Clean shared fixture with full JSDoc. `MakeRequestContextOptions` is optional-every-field, the factory returns a complete `RequestContext`. Constant `FIXTURE_STARTED_AT_MS = 1_700_000_000_000` provides deterministic clock anchor. Pattern of shape-contract testing (no static dependency on implementation file) is a **golden-path example**. | OK | — |

---

### File 4: `fixtures/mock-tracer.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor concern — global OTel state mutation |
| **Security/tenancy** | N/A (test fixture) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good with one advisory note |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 74–80 | `trace.disable()` + `trace.setGlobalTracerProvider(provider)` mutates the OTel process-global singleton. If a test fails before `handle.shutdown()`, a stale provider leaks to subsequent tests. The JSDoc warns callers. Pattern is necessary because OTel doesn't offer a per-test API, but cross-test leak risk remains. | Low | F-SA-B23-001 |
| 94–96 | `shutdown()` calls `provider.shutdown()` but does NOT call `trace.disable()` to reset the global provider. Calling `trace.disable()` afterwards would restore the noop provider and prevent stale-state leakage. | Low | F-SA-B23-002 |

---

### File 5: `instrumentation.contract.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (contract test) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — mock-heavy by design per OTel constraints |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 116 | `INSTRUMENTATION_PATH = '../../instrumentation'` resolves relative to `lib/observability/__tests__/`. Correctly points to `apps/science-advantage/instrumentation.ts`. | OK | — |
| 118–146 | First `describe` block tests the `register()` export shape. Uses module-level env restore and `vi.resetModules()` in `afterEach`. Proper isolation. | OK | — |
| 149–222 | Second `describe` block tests live behavior under `NEXT_RUNTIME=nodejs`. Mocks OTel SDK constructors with call-recording spies. Tests both OTLP and console-exporter paths. | OK | — |
| 68–114 | All `vi.mock()` calls use `vi.hoisted()` for constructor spies — required for Vitest module-mocking correctness. Good pattern. | OK | — |

---

### File 6: `live-otel-initialization.acceptance.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor concern — global OTel provider not reset |
| **Security/tenancy** | N/A (acceptance test) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — live-path proof design |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 43–51 | `afterEach` attempts best-effort cleanup by calling `shutdown()` on the global tracer provider. Does NOT call `trace.disable()` to reset to noop. Subsequent tests in the file may inherit a partially-shutdown provider. Same root cause as F-SA-B23-002. | Low | F-SA-B23-003 |
| 88–98 | ProxyTracerProvider unwrapping logic — correctly navigates the OTel SDK proxy wrapper to assert the delegate is not the noop provider. Good defensive coding. | OK | — |
| 100–105 | Creates a real span and asserts non-zero `traceId`. Concrete live-path proof that `register()` wired a real tracer. | OK | — |

---

### File 7: `live-sentry-initialization.acceptance.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (acceptance test) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — artifact assertion + live-behavior pair |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 60–66 | Artifact-level assertion: reads `next.config.ts` source and checks for `withSentryConfig`. This is a string-containment grep on source text. Fragile to whitespace/formatting changes but appropriate for a gate that proves the config wrapper is applied. | Info | — |
| 68–83 | Client config import triggers mocked `Sentry.init`. Asserts `dsn`, `tracesSampleRate`, `NODE_ENV` passed correctly. | OK | — |
| 85–100 | Server config import, same pattern with `SENTRY_DSN` (private). Note: the `dsn` assertion expects `https://private@example.ingest.sentry.io/2`, sourced from `process.env.SENTRY_DSN` in the `beforeEach`. | OK | — |
| 55–58 | `afterEach` calls `vi.resetModules()`. Required because the mocked `@sentry/nextjs` module's `initMock` carries call history across tests within the same file. | OK | — |

---

### File 8: `logger.adversarial.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — thorough adversarial coverage |
| **Security/tenancy** | OK — payload spoofing regression guard verified |
| **AGENTS.md compliance** | OK |
| **Test quality** | Excellent — exemplary adversarial test suite |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 108–145 | Circular reference and BigInt serialization: verifies the logger does not throw. The `safeStringify` fallback in `logger.ts` (lines 15–27) handles this. Tests pin the no-throw contract correctly. | OK | — |
| 169–184 | Adversarial `requestId` with JSON-special characters (`"`, `\`, `\n`, tab, control char). Verifies round-trip through `JSON.parse`. | OK | — |
| 209–240 | Payload-key collision: verifies caller-supplied `requestId` and `userId` are overwritten by context values. **Security-relevant**: prevents log spoofing by untrusted payloads. Implemented in `logger.ts` line 37 (`...payload` spread before context field assignment). | OK | — |
| 260–274 | Payload immutability: verifies the logger does not mutate the caller's object. Correctly spreads into a new object internally. | OK | — |
| 300–322 | Console-method dispatch on the correct method — verifies `warn` goes to `console.warn` only, `error` to `console.error`, `info` to `console.info`. | OK | — |
| 342–349 | Single-argument call shape: asserts JSON string is the sole arg to `console.info`, not the legacy 2-arg `[observability]` pattern. | OK | — |
| 371–380 | Deterministic timestamp under `vi.useFakeTimers()`. | OK | — |
| 405–424 | Repeated emission within a single scope: all 5 lines carry same `requestId`. No context flip. | OK | — |
| 449–481 | Empty-string `userId` preserved; absent `userId` omitted. Edge case contract coverage. | OK | — |
| 112–115 | `beforeAll` imports logger module once per describe block. No `vi.resetModules()` in `afterEach` of first describe block. Since the module is imported dynamically and cached within the describe, this is correct — the import doesn't have side effects that accumulate. | OK | — |
| 87–106 | `findJsonLogString` is duplicated from `logger.test.ts` (same exact logic). No shared test utility extracted. Minor DRY violation but bounded to two files. | Info | F-SA-B23-004 |

---

### File 9: `logger.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — thorough contract coverage for FR-4 |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 140–188 | JSON line shape tests: `event`, `level`, `timestamp` in output. Payload keys survive. Context fields omitted outside scope. | OK | — |
| 190–301 | Inside-scope tests: `requestId`, `userId`, `route`, `method`, `latencyMs` attached. Per-level tests for `info`, `warn`, `error`. Deterministic `latencyMs` using fake timers per test-strategy.md §4. | OK | — |
| 303–358 | Async-leakage cross-check: concurrent `runWithRequestContext(A)` and `runWithRequestContext(B)` via `Promise.all`. Verifies no context cross-contamination. Uses `await Promise.resolve()` for yield points. | OK | — |
| 89–124 | `findJsonLogString` and `collectLogPayloads` helper functions — duplicated in `logger.adversarial.test.ts` (see F-SA-B23-004). | Info | — |
| 144–155 | One `beforeAll` + `beforeEach`/`afterEach` per describe block. Proper isolation. | OK | — |

---

### File 10: `no-console-grep.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Significant concern — silent pass when `rg` is unavailable |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Test quality** | Mixed — good grep-gate design, missing prerequisite check |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 146–175 | `runRg` calls `execFileSync('rg', ...)` and catches thrown errors. If `rg` is not installed (ENOENT), the catch block returns `{ status: 1, stdout: '' }`. Then `parseRgCount('')` returns `[]`, and the `toEqual([])` assertion **passes** — a false negative. The test silently passes without checking anything. | **High** | F-SA-B23-005 |
| 223–243 | Sanity check inverts the exclusion for `logger.ts` — proves the sink WOULD be matched. Good design pattern, but it suffers from the same silent-pass risk if `rg` is unavailable. | Medium | — |
| 289–306 | Proxy.ts assertion — same `runRg` helper, same silent-pass risk. | Medium | — |
| 129–143 | JSDoc claims "`rg --count-matches` exits 0 when matches are found and exits 1 when no matches are found" — this is incorrect for `--count-matches`. `rg --count-matches` with matches exits 0 AND outputs `file:count` lines. When no matches exist, it exits 0 (not 1) and outputs nothing. The exit code 1 occurs only on error (e.g., non-existent search root). The error-handling logic is correct by accident — it treats exit 0 and exit 1 both as valid results — but the comment is wrong. | Low | F-SA-B23-006 |
| 201–221 | Good: bounded assertion (single-file-pair), does not invoke `pnpm lint`, uses `--with-filename` to force stable output even for single-match results. | OK | — |

---

### File 11: `phase-10-closeout.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Medium concern — fragile CWD path resolution |
| **Security/tenancy** | N/A (closeout verification) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Acceptable for closeout gate |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 5 | `repoRoot = path.resolve(process.cwd(), '../..')` — depends on `process.cwd()` being `apps/science-advantage`. If the test runner's CWD is different (monorepo root, CI workspace), the path resolution breaks silently. Should use `fileURLToPath(import.meta.url)` and navigate relative to the test file's own location. | Medium | F-SA-B23-007 |
| 8–21 | Asserts F-902 through F-906 are marked "Resolved" in `tech-debt.md`. Validates against current file state — cannot confirm the resolution is correct, only that the marker exists. Appropriate for a closeout gate. | OK | — |
| 33–51 | Checks archive directory exists and track is removed from active `tracks.md`. Relies on `repoRoot` path — see F-SA-B23-007. | Medium | — |

---

### File 12: `sentry-config.contract.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — focused contract test |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 45–76 | Client config test: mocks `@sentry/nextjs`, asserts `Sentry.init` called with `dsn`, `tracesSampleRate=0.1`, `environment`. | OK | — |
| 78–108 | Server config test: same pattern with `tracesSampleRate=0.05`. | OK | — |
| 56–58, 89–91 | Per-describe `afterEach` restores env. `vi.resetModules()` is NOT called in `afterEach` — not needed because each describe imports a different path (client vs server), but if both describes ran in sequence without reset, the second `import()` may return the cached module from the first mock call. However, the `initMock` is shared across both describes, and `beforeEach` resets it. The call count assertions (`toHaveBeenCalledTimes(1)`) per-test are correct because the mock is reset per test. | OK | — |

---

### File 13: `context.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK — follows adapter-neutral pattern |
| **Architecture baseline** | Clean — minimal `AsyncLocalStorage` wrapper |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–9 | `AsyncLocalStorage` import and `RequestContext` interface. Clean, no unnecessary deps. | OK | — |
| 11 | Module-level `const storage = new AsyncLocalStorage<RequestContext>()`. Effectively a singleton. This is the canonical ALS pattern. | OK | — |
| 34–38 | `setRequestContextUserId` mutates the context object in-place. Telemetry-safe (ALS ensures per-async-context isolation). Mutating the stored object is acceptable because the ALS store reference is stable within the scope. | Info | — |
| All | No tenant/school field in `RequestContext`. The context carries `userId` but no `schoolId`. If observability needs to correlate logs by tenant, `schoolId` would need to be added. This is a feature gap, not a bug. | Info | F-SA-B23-008 |

---

### File 14: `logger.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK — context values overwrite payload |
| **AGENTS.md compliance** | OK — uses `console.*` only as the final sink (permitted by AGENTS.md) |
| **Architecture baseline** | Good — safe JSON serialization, clean emit pattern |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7–28 | `safeStringify` — JSON reviver handles BigInt, functions, symbols. Fallback catches circular references and emits a best-effort line with a `serializationError` marker. **Golden-path pattern** for safe JSON serialization. | OK | — |
| 30–63 | `emit()` — spreads payload first, then overwrites with context values. This is correct per the adversarial test requirement (F-SA-B23 adversarial coverage confirms context-wins semantics). | OK | — |
| 42–44 | `userId` only set when `ctx.userId !== undefined`. Empty string preserved, `undefined` omitted. Matches spec and adversarial test. | OK | — |
| 47 | `latencyMs = Date.now() - ctx.startedAt` — computed at emit time, not at context creation time. Correct. | OK | — |
| 50–62 | Console dispatch by level. Single JSON-string argument. | OK | — |

---

### File 15: `metrics.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Architecture baseline** | Thin wrapper over logger — acceptable |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | Import from `@/lib/observability/logger` uses path alias. Correct. | OK | — |
| 5–13 | `serializeTags` converts all tag values to strings via `String(value)`. This means boolean `false` becomes `"false"`, `undefined` becomes `"undefined"`. The type allows `undefined` in `MetricTags` values. If a tag value is `undefined`, `String(undefined)` produces `"undefined"` string, which is unexpected. The `MetricTags` type says `Record<string, string | number | boolean | undefined>` — undefined values should be filtered out, not stringified. | Low | F-SA-B23-009 |
| 15–23 | `log()` emits via `logger.info('metrics', ...)`. Tags serialized to strings. Timestamp included. | OK | — |
| 26–28 | `increment(metric, value = 1, tags?)` — default increment is 1. Correct. | OK | — |
| All | No multi-tenant scoping (no `schoolId` tag). If metrics need tenant-scoped aggregation, `schoolId` should be added to the metric tag set. See F-SA-B23-008. | Info | — |

---

### File 16: `cache-adapter.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | Minor — `as any` type assertions |
| **Test quality** | Good — available/unavailable split, TTL, pattern matching |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 49, 103, 182, 216 | `as any` type assertions on mock Redis objects. Acceptable for test mocks that satisfy an interface structurally. | Info | — |
| 6 | Imports `createCleanupTask` from `./session-cleanup` — tests `StaleSessionCleanup` in the cache-adapter test file. This is a cross-module test concern; correctly placed here because session cleanup is part of the platform's Redis lifecycle. | OK | — |
| 60–93 | Redis-available tests: get/set/delete/keys/TTL. Deterministic via `vi.setSystemTime(mockNow)`. | OK | — |
| 96–141 | Redis-unavailable tests: in-memory fallback store, TTL expiration in fallback, dual delete. | OK | — |
| 188–199 | Rate-limit store: 5 failures triggers block. Correct. | OK | — |
| 201–210 | `recordSuccess` resets count. Correct. | OK | — |
| 223–234 | Rate-limit fallback path when Redis is down. | OK | — |
| 238–346 | `StaleSessionCleanup` tests: batch processing, empty result, batch size limit (250 sessions, batch of 100 → 3 rounds), periodic scheduling start/stop. Comprehensive. | OK | — |

---

### File 17: `cache-adapter.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — logic correct |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Architecture baseline** | Good — clean adapter pattern with fallback |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 38–42 | `isFallbackEntry()` checks `entry.expiresAt < Date.now()` — it checks if an entry HAS EXPIRED. The method name is **misleading**: it says "is fallback entry" but actually checks TTL expiry. Should be named `isExpired()` or `isEntryExpired()`. | Medium | F-SA-B23-010 |
| 44–62 | `get()` — tries Redis, falls back to in-memory. Calls `isFallbackEntry` (misnamed, see F-SA-B23-010) to check expiry. | OK | — |
| 64–78 | `set()` — tries Redis, writes to fallback on failure. | OK | — |
| 80–92 | `delete()` — tries Redis (catch swallows error), then always deletes from fallback. | OK | — |
| 94–108 | `keys()` — tries Redis, falls back to filter on in-memory keys. Strips prefix from returned keys. | OK | — |
| All | No tenant-aware key prefixing. The `prefix` option is generic — the adapter doesn't know about `schoolId`. If cache keys need tenant isolation, callers must include tenant in the key or prefix. | Info | F-SA-B23-011 |

---

### File 18: `integration.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Medium concern — fragile source-text assertions |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Test quality** | Mixed — source-text checks are brittle |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 5–23 | Reads `lib/env.ts` via `fs.readFileSync` and checks for string containment of `REDIS_URL`. This is a **source-text inspection** — fragile to formatting, comments, and whitespace changes. Should test the runtime env schema export instead (e.g., `import { env } from '@/lib/env'` and check `'REDIS_URL' in env` or the zod schema). | Medium | F-SA-B23-012 |
| 76–87 | Sets `process.env.REDIS_URL` to `'redis://localhost:6379'`, then imports `recommendation-service`. Uses try/finally to restore env var. Good practice. However, this mutates the global env and imports a module that may have side effects (connections, logging). Should use `vi.stubEnv` for env isolation. | Low | F-SA-B23-013 |
| 82 | Imports `generateRecommendation` from `../ai/recommendation-service` — a real module import triggered by env mutation. If the service connects to a real Redis on import (e.g., via top-level client initialization), this would fail. Currently it doesn't, but the pattern is fragile. | Low | — |

---

### File 19: `rate-limit-store.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Architecture baseline** | Clean — hash-based rate limiting with fallback |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 128–130 | `reset()` is declared as a public method but is NOT part of the `RateLimitStore` interface (lines 1–5). Code calling through the interface type cannot call `reset()`. Direct consumers that know the concrete type can. This is a minor interface compliance gap — either add `reset` to the interface or make it a separate method on the concrete class only. | Low | F-SA-B23-014 |
| 67–77 | `checkLimit` catch block: when `fallbackEnabled` is `false` (default) and Redis errors, the function silently returns `true` (allow). Rate limiting is **gracefully degraded** — the system allows all requests until Redis recovers. This is intentional per design, but callers should be aware that a Redis outage silently disables rate limiting. | Info | — |
| 44–78 | `checkLimit` uses `this.now() === Date.now()` internally. The `now()` private method (line 40–42) is a trivial wrapper. Not using fake-timer-safe pattern (which would require the test to mock `Date.now`). However, this is production code and the method exists for potential future testing — acceptable. | OK | — |
| 36–38 | `buildKey(id) => 'ratelimit:${id}'` — no tenant prefix (no `schoolId`). Rate limits are per-id but not tenant-scoped at the key level. If the same user identifier exists across tenants, rate limits are shared. Acceptable for current architecture. | Info | — |

---

### File 20: `redis-client.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Significant concerns — stubs, non-shared fallback instances |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | Violation — provider SDK is unused but the adapter is incomplete |
| **Architecture baseline** | Incomplete — real Redis implementations are stubs |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 61–63 | `getRedisClient()` — when `connectionFailed || !env.REDIS_URL`, returns `createInMemoryClient()`. **Each call creates a new in-memory store**. Callers do not share cached state — data cached by one caller is invisible to another. This is a correctness bug for the in-memory fallback path. The in-memory return should be cached as a singleton (e.g., a module-level `const inMemoryFallback = createInMemoryClient()` that is reused). | **High** | F-SA-B23-015 |
| 91–97 | `createUpstashClient` and `createNodeRedisClient` both call `createInMemoryClient()`. The **real Redis provider integration was never implemented**. These are permanent stubs. No connection is established to any Redis instance regardless of `REDIS_URL` value. All cached data is lost on server restart. | **High** | F-SA-B23-016 |
| 49–54 | `expire` and `ttl` methods on `createInMemoryClient` are no-ops (expire) and constant `-1` (ttl). TTL tracking exists in the `set` method (line 29: `expiresAt: Date.now() + ttlMs`) and is checked in `get` (line 22–25), but the `expire` method (for Redis hash expiry) is a no-op. For hash operations (`hSet`), TTL is NOT tracked — hash entries never expire in in-memory mode. | Medium | F-SA-B23-017 |
| 1 | Import from `@/lib/env` — correct path alias. | OK | — |
| 100–103 | `resetRedisClient()` clears the cached client and resets `connectionFailed`. Exists for testing — correct. | OK | — |

---

## Cross-Cutting Observations

| Observation | Files Affected | Severity | ID |
|-------------|---------------|----------|-----|
| Duplicated `findJsonLogString` helper in `logger.test.ts` and `logger.adversarial.test.ts` — extract to a shared test utility. | 8, 9 | Info | F-SA-B23-004 |
| No `schoolId` in the `RequestContext` or metrics tags. If tenant-aware observability is needed, this is a gap. | 13, 15 | Info | F-SA-B23-008 |
| `redis-client.ts` in-memory fallback creates a new instance per call (not cached). Combined with stubbed real clients, the entire Redis platform layer is effectively non-functional in production. | 20 | **High** | F-SA-B23-015 / F-SA-B23-016 |
| `cache-adapter.ts` has a misleading method name (`isFallbackEntry` means "has expired"). | 17 | Medium | F-SA-B23-010 |
| `no-console-grep.test.ts` silently passes when `rg` binary is missing — false negative risk. | 10 | **High** | F-SA-B23-005 |
| `parseRgCount` JSDoc comment describes exit-code behavior incorrectly (rg exits 0 on no matches, not 1). | 10 | Low | F-SA-B23-006 |
| `integration.test.ts` uses source-text assertions (`fs.readFileSync` + string containment) instead of runtime contract assertions. | 18 | Medium | F-SA-B23-012 |

---

## Findings Summary

| Severity | Count | IDs |
|----------|-------|-----|
| **High** | 3 | F-SA-B23-005, F-SA-B23-015, F-SA-B23-016 |
| **Medium** | 4 | F-SA-B23-007, F-SA-B23-010, F-SA-B23-012, F-SA-B23-017 |
| **Low** | 6 | F-SA-B23-001, F-SA-B23-002, F-SA-B23-003, F-SA-B23-006, F-SA-B23-009, F-SA-B23-014 |
| **Info** | 4 | F-SA-B23-004, F-SA-B23-008, F-SA-B23-011, F-SA-B23-013 |
| **OK (no finding)** | 0 | — |

---

## Limitations

- **Test execution not verified**: Findings are based on static code review only. `pnpm test` was not run against this batch.
- **`rg` behavior assumption**: F-SA-B23-005 and F-SA-B23-006 are based on `rg --count-matches` documentation and observed behavior on this system (`rg 14.1.0`). Behavior may vary across versions.
- **No cross-file call graph**: `build-graph callers` was not run for the exported symbols in this batch. Graph-aware analysis was omitted per the batch-format convention.
- **No integration or E2E verification**: Platform layer (`cache-adapter`, `rate-limit-store`, `redis-client`) was not exercised against a real Redis instance. The stubs in `redis-client.ts` make real Redis testing impossible without fixing F-SA-B23-016 first.
- **`session-cleanup.ts` referenced but not in batch**: `cache-adapter.test.ts` imports `createCleanupTask` from `session-cleanup.ts` — that file was read for context but is not part of the prescribed 20-file list and was not formally reviewed.
- **No acceptance/closeout claims**: This report identifies findings and does not assert batch acceptance or closeout.
