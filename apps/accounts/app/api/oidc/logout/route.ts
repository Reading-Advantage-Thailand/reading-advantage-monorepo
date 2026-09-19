import { NextResponse } from "next/server";
import { z } from "zod";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityErrorResponse } from "@/lib/server/http";
import {
  accountsOptionsResponse,
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";

const authorizationHeaderSchema = z
  .string()
  .regex(/^Bearer [A-Za-z0-9_-]{43}$/);

/** Revokes only the calling application's local session. */
export async function POST(request: Request): Promise<NextResponse> {
  const authorization = authorizationHeaderSchema.safeParse(
    request.headers.get("authorization"),
  );
  if (!authorization.success) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  try {
    const revoked = await companyIdentityRouteHandlers.oidcLogout(
      () =>
        getIdentityComposition().then((composition) =>
          composition.service.localLogout(
            authorization.data.slice("Bearer ".length),
          ),
        ),
    );
    return NextResponse.json({ revoked });
  } catch (error) {
    return identityErrorResponse(error);
  }
}

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.oidcLogoutOptions(() =>
    accountsOptionsResponse("POST, OPTIONS"),
  );
