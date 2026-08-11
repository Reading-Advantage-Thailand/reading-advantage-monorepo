import { NextResponse } from "next/server";

import {
  accountsHeadResponse,
  accountsOptionsResponse,
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";

/**
 * Reports process liveness without claiming database readiness.
 * @returns A non-cacheable Accounts liveness response.
 */
export function GET(): NextResponse {
  return companyIdentityRouteHandlers.health(
    () =>
      NextResponse.json(
        { status: "alive", service: "accounts" },
        { headers: { "Cache-Control": "no-store" } },
      ),
  );
}

/** Handles the factual HEAD method without returning a GET body. */
export const HEAD = (): NextResponse =>
  companyIdentityRouteHandlers.healthHead(accountsHeadResponse);

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.healthOptions(() =>
    accountsOptionsResponse("GET, HEAD, OPTIONS"),
  );
