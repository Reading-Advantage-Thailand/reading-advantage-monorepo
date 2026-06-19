import { handleLogout } from "@reading-advantage/api/routes/auth";
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import type { NextRequest } from "next/server";

/**
 * POST /api/auth/logout
 *
 * Delegates to the shared logout handler defined in
 * `@reading-advantage/api/routes/auth`. Session invalidation is handled
 * by the shared package.
 *
 * @see packages/api/src/routes/auth/logout.ts
 * @see packages/api/src/__tests__/auth-routes.test.ts
 */
export async function POST(request: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {

    return handleLogout(request as unknown as Parameters<typeof handleLogout>[0]);

  });
}
