import { handleImpersonate } from "@reading-advantage/api/routes/auth";
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import type { NextRequest } from "next/server";

/**
 * POST /api/auth/impersonate
 *
 * Delegates to the shared impersonation handler defined in
 * `@reading-advantage/api/routes/auth`. Used by the DevImpersonationPanel
 * component for local development with `DEV_AUTH_ENABLED=true`.
 *
 * @see packages/api/src/routes/auth/impersonate.ts
 * @see packages/api/src/__tests__/auth-routes.test.ts
 */
export async function POST(request: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {

    return handleImpersonate(request as unknown as Parameters<typeof handleImpersonate>[0]);

  });
}
