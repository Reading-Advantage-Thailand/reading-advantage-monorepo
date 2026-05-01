/**
 * Adapter utility for Next.js 15 route handlers
 *
 * In Next.js 15, params are Promises, but many existing controllers
 * expect synchronous params. This utility helps bridge that gap.
 */

import { NextRequest } from "next/server";

/**
 * Awaits params from Next.js 15 context and creates a synchronous context
 * for legacy controllers that expect non-Promise params.
 *
 * @example
 * export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
 *   const syncCtx = await awaitParams(ctx);
 *   return router.run(request, syncCtx);
 * }
 */
export async function awaitParams<T extends Record<string, any>>(ctx: {
  params: Promise<T>;
}): Promise<{ params: T }> {
  const params = await ctx.params;
  return { params };
}
