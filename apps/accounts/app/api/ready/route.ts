import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import {
  accountsHeadResponse,
  accountsOptionsResponse,
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";

/**
 * Reports readiness only after the identity database composition validates.
 * @returns A non-cacheable Accounts readiness response.
 */
export async function GET(): Promise<NextResponse> {
  return companyIdentityRouteHandlers.ready(
    async () => {
      let logUnexpected: (() => void) | undefined;
      try {
        const identity = await getIdentityComposition();
        logUnexpected = () =>
          identity.logger?.warn("accounts.ready.unexpected_failure");
        await identity.probeDatabase();
        return NextResponse.json(
          {
            status: "ready",
            service: "accounts",
            database: "company_identity",
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        logUnexpected?.();
        return NextResponse.json(
          { status: "unavailable", service: "accounts" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    },
  );
}

/** Handles the factual HEAD method without executing the readiness probe twice. */
export const HEAD = (): NextResponse =>
  companyIdentityRouteHandlers.readyHead(accountsHeadResponse);

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.readyOptions(() =>
    accountsOptionsResponse("GET, HEAD, OPTIONS"),
  );
