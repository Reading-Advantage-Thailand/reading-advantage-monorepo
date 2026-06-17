import { handleLogout } from "@reading-advantage/api/routes/auth";
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
  return handleLogout(request);
}
