import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  route: string;
  method: string;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Retrieves the current request context from the async-local store.
 * Returns `undefined` when called outside a `runWithRequestContext` scope.
 */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Runs `fn` with `ctx` available via `getRequestContext()` for the
 * duration of the call. Nested `runWithRequestContext` calls inherit;
 * the inner context shadows the outer.
 */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}
