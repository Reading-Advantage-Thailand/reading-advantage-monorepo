import { handleSession } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";

/**
 * GET /api/auth/session
 *
 * Delegates to the shared session handler defined in
 * `@reading-advantage/api/routes/auth`. Returns the current authenticated
 * user session from the shared auth package.
 *
 * @see packages/api/src/routes/auth/session.ts
 * @see packages/api/src/__tests__/auth-routes.test.ts
 */
export async function GET(request: NextRequest) {
  return handleSession(request);
}
