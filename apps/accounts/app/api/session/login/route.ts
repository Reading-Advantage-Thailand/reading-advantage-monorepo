import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import {
  identityErrorResponse,
  readJsonBody,
  requestIpAddress,
  requireSameOrigin,
} from "@/lib/server/http";
import {
  accountsOptionsResponse,
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";

/** Authenticates an employee and establishes the host-only Accounts SSO cookie. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const body = await readJsonBody(request);
    const composition = await getIdentityComposition();
    const result = await companyIdentityRouteHandlers.login(
      async () =>
        composition.service.authenticate({
          ...body,
          clientId:
            typeof body.clientId === "string" ? body.clientId : "accounts",
          ipAddress: await requestIpAddress(),
          userAgent: request.headers.get("user-agent") || "unknown",
        }),
    );
    (await cookies()).set(composition.cookie.name, result.sessionToken, {
      httpOnly: true,
      secure: composition.cookie.secure,
      sameSite: composition.cookie.sameSite,
      path: composition.cookie.path,
      expires: new Date(result.expiresAt),
    });
    return NextResponse.json({ employee: result.employee });
  } catch (error) {
    return identityErrorResponse(error);
  }
}

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.loginOptions(() =>
    accountsOptionsResponse("POST, OPTIONS"),
  );
