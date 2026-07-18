import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityErrorResponse, requireSameOrigin } from "@/lib/server/http";

/** Revokes the central SSO session and clears its host-only cookie. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const composition = await getIdentityComposition();
    const store = await cookies();
    const token = store.get(composition.cookie.name)?.value;
    const sessionsRevoked = token
      ? await composition.service.globalLogout(token)
      : 0;
    store.set(composition.cookie.name, "", {
      httpOnly: true,
      secure: composition.cookie.secure,
      sameSite: composition.cookie.sameSite,
      path: composition.cookie.path,
      maxAge: 0,
    });
    return NextResponse.json({ sessionsRevoked });
  } catch (error) {
    return identityErrorResponse(error);
  }
}
