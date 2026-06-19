import { handleLogin } from "@reading-advantage/api/routes/auth";
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import type { NextRequest } from "next/server";

/**
 * POST /api/auth/login
 *
 * Delegates to the shared username/password login handler defined in
 * `@reading-advantage/api/routes/auth`. Rate limiting and session creation
 * are handled by the shared package.
 *
 * @see packages/api/src/routes/auth/login.ts
 * @see packages/api/src/__tests__/auth-routes.test.ts
 */
export async function POST(request: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {

    return handleLogin(request as unknown as Parameters<typeof handleLogin>[0]);

  });
}
