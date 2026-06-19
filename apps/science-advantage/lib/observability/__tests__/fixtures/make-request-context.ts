/**
 * Phase 3 shared fixture: deterministic `RequestContext` factory.
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §3 (Shared Fixtures & Mocks) defines `make-request-context.ts` as
 *     "a factory returning a deterministic `RequestContext` (fixed
 *     `requestId`, `startedAt = 1_700_000_000_000`, controllable `Date.now`
 *     via `vi.useFakeTimers`).
 *   - Re-used by `context.test.ts` (Phase 3), `logger.test.ts`
 *     (Phase 4), and per-route tests (Phase 5).
 *
 * Shape contract: the returned object must satisfy the
 * `RequestContext` interface defined in
 * `apps/science-advantage/lib/observability/context.ts` once Phase 3
 * lands. Tests that import this fixture therefore lock in both the
 * field names and the `requestId`/`userId`/`route`/`method`/`startedAt`
 * shape required by FR-3 (spec.md lines 75-81) without taking a static
 * dependency on the implementation file.
 */

/**
 * Options accepted by {@link makeRequestContext}. Every field is
 * optional so tests can pin only the dimension they care about; the
 * factory returns a fully-populated `RequestContext` otherwise.
 */
export interface MakeRequestContextOptions {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  startedAt?: number;
}

/**
 * Fixed wall-clock anchor matching test-strategy.md §3 so
 * `Date.now() - ctx.startedAt` is deterministic across the suite. The
 * exact value is `2023-11-14T22:13:20.000Z` (ULID epoch reference).
 */
export const FIXTURE_STARTED_AT_MS = 1_700_000_000_000;

/**
 * Builds a deterministic `RequestContext`-shaped object.
 *
 * @param opts Overrides for individual fields. Unspecified fields use
 *   the canonical fixture defaults.
 * @returns A new request-context object whose shape matches the
 *   Phase 3 implementation contract.
 */
export function makeRequestContext(
  opts: MakeRequestContextOptions = {},
): {
  requestId: string;
  userId?: string;
  route: string;
  method: string;
  startedAt: number;
} {
  return {
    requestId: opts.requestId ?? '01HZ_FIXTURE_REQUEST_ID',
    userId: opts.userId ?? 'user-abc-123',
    route: opts.route ?? '/api/example/route',
    method: opts.method ?? 'GET',
    startedAt: opts.startedAt ?? FIXTURE_STARTED_AT_MS,
  };
}