import { handleImpersonate } from "@reading-advantage/api/routes/auth";
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
  return handleImpersonate(request);
}
