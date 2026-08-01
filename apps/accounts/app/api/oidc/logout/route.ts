import { NextResponse } from "next/server";

import { oidcLogoutInputSchema } from "@reading-advantage/backend";

import { getIdentityComposition } from "@/lib/server/identity";

/** Revokes only the calling application's local session. */
export async function POST(request: Request): Promise<NextResponse> {
  const input = oidcLogoutInputSchema.safeParse({
    authorization: request.headers.get("authorization"),
  });
  if (!input.success) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const revoked = await (await getIdentityComposition()).service.localLogout(
    input.data.accessToken,
  );
  return NextResponse.json({ revoked });
}
