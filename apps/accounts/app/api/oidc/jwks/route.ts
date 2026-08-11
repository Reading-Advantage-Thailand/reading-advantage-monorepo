import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import {
  accountsHeadResponse,
  accountsOptionsResponse,
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";

/** Publishes current public signing material without private key data. */
export async function GET(): Promise<NextResponse> {
  return companyIdentityRouteHandlers.jwks(
    async () =>
      NextResponse.json({ keys: [(await getIdentityComposition()).jwk] }),
  );
}

/** Handles the factual HEAD method without returning public key material. */
export const HEAD = (): NextResponse =>
  companyIdentityRouteHandlers.jwksHead(accountsHeadResponse);

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.jwksOptions(() =>
    accountsOptionsResponse("GET, HEAD, OPTIONS"),
  );
