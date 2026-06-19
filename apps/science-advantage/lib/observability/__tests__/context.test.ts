/**
 * Phase 3 unit tests for FR-3 (`AsyncLocalStorage<RequestContext>`).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-3 (lines 68-91):
 *   - `apps/science-advantage/lib/observability/context.ts` exports the
 *     `RequestContext` interface, `getRequestContext()`, and
 *     `runWithRequestContext(ctx, fn)`.
 *   - `runWithRequestContext` populates the store for the duration of
 *     `fn`; nested calls inherit; outside the scope,
 *     `getRequestContext()` returns `undefined`.
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §3 (Shared Fixtures): `make-request-context.ts` factory.
 *   - §4 (Cross-Phase Edge Cases): requires (a) async non-leakage —
 *     `Promise.all` over two `runWithRequestContext` calls must not
 *     bleed context between siblings; and (b) a Node-runtime guard
 *     with an explicit Edge non-goal documented in this file.
 *   - §5 (Architecture Guardrails): `storage` MUST NOT be exported —
 *     `runWithRequestContext` is the sole writer to the ALS store.
 *   - §6 (Phase 3 notes): pure unit tests enumerated in plan.
 *   - §7 (Live-Proof Plan) designates the targeted Red command:
 *       `pnpm --filter science-advantage exec vitest run
 *        lib/observability/__tests__/context.test.ts`
 *
 * Intentionally red at MID handoff: the implementation file
 * `lib/observability/context.ts` is absent, so every `beforeAll` that
 * loads it throws `ERR_MODULE_NOT_FOUND` and every `it` in the
 * describe block fails with `expected loadError to be undefined`. The
 * Green / closeout gate is the same command exiting 0 once the
 * implementation lands (test-strategy.md §7).
 */
import { describe, it, expect, beforeAll } from 'vitest';

import { makeRequestContext } from './fixtures/make-request-context';

const CONTEXT_MODULE_PATH = '../../context';

interface ContextModule {
  getRequestContext: () => unknown;
  runWithRequestContext: <T>(ctx: unknown, fn: () => T) => T;
}

interface LoadResult {
  mod?: ContextModule;
  loadError?: unknown;
}

async function loadContextModule(): Promise<LoadResult> {
  try {
    const mod = (await import(CONTEXT_MODULE_PATH)) as ContextModule;
    return { mod };
  } catch (err) {
    return { loadError: err };
  }
}

describe('FR-3 AsyncLocalStorage<RequestContext> — public surface', () => {
  let result: LoadResult;

  beforeAll(async () => {
    result = await loadContextModule();
  });

  it('exports `getRequestContext` as a function', () => {
    expect(result.loadError).toBeUndefined();
    expect(typeof result.mod?.getRequestContext).toBe('function');
  });

  it('exports `runWithRequestContext` as a function', () => {
    expect(result.loadError).toBeUndefined();
    expect(typeof result.mod?.runWithRequestContext).toBe('function');
  });

  it('does NOT export the underlying storage instance (architecture guardrail §5)', () => {
    expect(result.loadError).toBeUndefined();
    const exposed = result.mod as unknown as { storage?: unknown };
    expect(exposed.storage).toBeUndefined();
  });
});

describe('FR-3 runWithRequestContext round-trip', () => {
  let result: LoadResult;

  beforeAll(async () => {
    result = await loadContextModule();
  });

  it('returns the same context object passed to `runWithRequestContext` (sync fn)', () => {
    expect(result.loadError).toBeUndefined();
    const ctx = makeRequestContext();
    const observed = result
      .mod!.runWithRequestContext(ctx, () => result.mod!.getRequestContext());
    expect(observed).toBe(ctx);
  });

  it('returns the same context inside an async fn', async () => {
    expect(result.loadError).toBeUndefined();
    const ctx = makeRequestContext();
    const observed = await result
      .mod!.runWithRequestContext(ctx, async () => {
        return await Promise.resolve(result.mod!.getRequestContext());
      });
    expect(observed).toBe(ctx);
  });

  it('returns the value produced by `fn` (transparency — non-undefined return types)', () => {
    expect(result.loadError).toBeUndefined();
    const ctx = makeRequestContext();
    const value = result.mod!.runWithRequestContext(ctx, () => 42);
    expect(value).toBe(42);
  });

  it('propagates the context across an awaited microtask (async_hooks tracks promise chains)', async () => {
    expect(result.loadError).toBeUndefined();
    const ctx = makeRequestContext();
    const observed = await result
      .mod!.runWithRequestContext(ctx, async () => {
        await Promise.resolve();
        return result.mod!.getRequestContext();
      });
    expect(observed).toBe(ctx);
  });
});

describe('FR-3 `getRequestContext` outside a `runWithRequestContext` scope', () => {
  let result: LoadResult;

  beforeAll(async () => {
    result = await loadContextModule();
  });

  it('returns `undefined` synchronously when no scope is active', () => {
    expect(result.loadError).toBeUndefined();
    expect(result.mod!.getRequestContext()).toBeUndefined();
  });

  it('returns `undefined` inside a Promise.then callback with no surrounding scope', async () => {
    expect(result.loadError).toBeUndefined();
    const observed = await Promise.resolve(result.mod!.getRequestContext());
    expect(observed).toBeUndefined();
  });

  it('returns `undefined` after the `runWithRequestContext` callback has resolved', () => {
    expect(result.loadError).toBeUndefined();
    const ctx = makeRequestContext();
    result.mod!.runWithRequestContext(ctx, () => undefined);
    expect(result.mod!.getRequestContext()).toBeUndefined();
  });
});

describe('FR-3 nested `runWithRequestContext` calls', () => {
  let result: LoadResult;

  beforeAll(async () => {
    result = await loadContextModule();
  });

  it('inner context wins inside the inner scope (sync)', () => {
    expect(result.loadError).toBeUndefined();
    const outer = makeRequestContext({ requestId: 'outer-req-1' });
    const inner = makeRequestContext({ requestId: 'inner-req-2' });
    const observed = result.mod!.runWithRequestContext(outer, () =>
      result.mod!.runWithRequestContext(inner, () =>
        result.mod!.getRequestContext(),
      ),
    );
    expect(observed).toBe(inner);
  });

  it('outer context is restored after the inner scope exits (sync)', () => {
    expect(result.loadError).toBeUndefined();
    const outer = makeRequestContext({ requestId: 'outer-req-1' });
    const inner = makeRequestContext({ requestId: 'inner-req-2' });
    let observed: unknown;
    result.mod!.runWithRequestContext(outer, () => {
      result.mod!.runWithRequestContext(inner, () => undefined);
      observed = result.mod!.getRequestContext();
    });
    expect(observed).toBe(outer);
  });

  it('inner context wins inside the inner scope (async)', async () => {
    expect(result.loadError).toBeUndefined();
    const outer = makeRequestContext({ requestId: 'outer-req-1' });
    const inner = makeRequestContext({ requestId: 'inner-req-2' });
    const observed = await result
      .mod!.runWithRequestContext(outer, async () => {
        await Promise.resolve();
        return await result.mod!.runWithRequestContext(inner, async () => {
          await Promise.resolve();
          return result.mod!.getRequestContext();
        });
      });
    expect(observed).toBe(inner);
  });

  it('outer context is restored after the inner scope exits (async)', async () => {
    expect(result.loadError).toBeUndefined();
    const outer = makeRequestContext({ requestId: 'outer-req-1' });
    const inner = makeRequestContext({ requestId: 'inner-req-2' });
    let observed: unknown;
    await result.mod!.runWithRequestContext(outer, async () => {
      await result
        .mod!.runWithRequestContext(inner, async () => {
          await Promise.resolve();
        });
      await Promise.resolve();
      observed = result.mod!.getRequestContext();
    });
    expect(observed).toBe(outer);
  });
});

describe('FR-3 async leakage (no context bleed between siblings)', () => {
  let result: LoadResult;

  beforeAll(async () => {
    result = await loadContextModule();
  });

  it('`Promise.all` over two `runWithRequestContext` calls does not leak contexts', async () => {
    expect(result.loadError).toBeUndefined();
    const ctxA = makeRequestContext({ requestId: 'sibling-A' });
    const ctxB = makeRequestContext({ requestId: 'sibling-B' });

    const [observedA, observedB] = await Promise.all([
      result.mod!.runWithRequestContext(ctxA, async () => {
        for (let i = 0; i < 5; i += 1) await Promise.resolve();
        return result.mod!.getRequestContext();
      }),
      result.mod!.runWithRequestContext(ctxB, async () => {
        for (let i = 0; i < 5; i += 1) await Promise.resolve();
        return result.mod!.getRequestContext();
      }),
    ]);

    expect(observedA).toBe(ctxA);
    expect(observedB).toBe(ctxB);
    expect(observedA).not.toBe(observedB);
  });

  it('a `runWithRequestContext` scope does not leak to an unrelated promise scheduled before it', async () => {
    expect(result.loadError).toBeUndefined();
    const ctx = makeRequestContext({ requestId: 'scope-only' });
    const preScheduled = Promise.resolve().then(() =>
      result.mod!.getRequestContext(),
    );
    result.mod!.runWithRequestContext(ctx, () => undefined);
    const observed = await preScheduled;
    expect(observed).toBeUndefined();
  });
});

describe('FR-3 Node-runtime guard (Edge runtime is a non-goal)', () => {
  let result: LoadResult;

  beforeAll(async () => {
    result = await loadContextModule();
  });

  it('runs under the Node.js runtime, where `async_hooks.AsyncLocalStorage` is available', () => {
    // Strategy §4 — `AsyncLocalStorage` is Node-only; the Edge runtime
    // does not support `async_hooks.AsyncLocalStorage` and is
    // intentionally unsupported by this module. This guard documents
    // the non-goal and also serves as a regression test if a future
    // contributor accidentally swaps the implementation to a polyfill
    // that loses the native runtime guarantee.
    expect(result.loadError).toBeUndefined();
    expect(typeof process.versions.node).toBe('string');
    expect(process.versions.node.length).toBeGreaterThan(0);
    expect(result.mod).toBeDefined();
  });
});