import * as Sentry from '@sentry/nextjs';
import { getRequestContext } from './context';

/**
 * Observability adapter boundary for Sentry capture calls.
 *
 * This module is the only allowed direct importer of `@sentry/nextjs`
 * for `captureException` / `captureMessage` in the science app. Route
 * handlers and domain code MUST call the wrappers below instead of
 * reaching into `@sentry/nextjs` directly so that the Wave 2
 * observability provider guard (see
 * `packages/config/src/__tests__/wave2-observability-provider-guard.test.ts`)
 * can enforce a single, allowlisted capture boundary.
 *
 * Wrappers route the optional `context` payload into Sentry's
 * `tags` / `extra` fields and pull the active request context (when
 * present) so the captured event is correlated with the current
 * request id / user id / route / method.
 */
export type CaptureContext = Record<string, unknown>;

function toSentryContext(context?: CaptureContext): {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
} {
  if (!context) return {};
  const tags: Record<string, string> = {};
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null) continue;
    tags[key] = typeof value === 'string' ? value : String(value);
    extra[key] = value;
  }
  return { tags, extra };
}

function attachRequestContext(
  payload: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): { tags?: Record<string, string>; extra?: Record<string, unknown> } {
  const ctx = getRequestContext();
  if (!ctx) return payload;
  payload.tags = {
    requestId: ctx.requestId,
    ...(ctx.userId ? { userId: ctx.userId } : {}),
    ...payload.tags,
  };
  payload.extra = {
    route: ctx.route,
    method: ctx.method,
    ...payload.extra,
  };
  return payload;
}

/**
 * Forwards an error to Sentry with the supplied context. Equivalent to
 * `@sentry/nextjs`'s `captureException` but routed through the
 * observability adapter boundary so route handlers do not import
 * `@sentry/nextjs` directly.
 *
 * @param error The error to capture.
 * @param context Optional structured context merged into Sentry tags /
 *   extra and enriched with the active request context (requestId,
 *   userId, route, method).
 */
export function captureException(
  error: unknown,
  context?: CaptureContext,
): void {
  Sentry.captureException(error, attachRequestContext(toSentryContext(context)));
}

/**
 * Forwards a message to Sentry with the supplied context. Equivalent to
 * `@sentry/nextjs`'s `captureMessage` but routed through the
 * observability adapter boundary.
 *
 * @param message The message to capture.
 * @param context Optional structured context merged into Sentry tags /
 *   extra and enriched with the active request context.
 */
export function captureMessage(
  message: string,
  context?: CaptureContext,
): void {
  Sentry.captureMessage(message, attachRequestContext(toSentryContext(context)));
}