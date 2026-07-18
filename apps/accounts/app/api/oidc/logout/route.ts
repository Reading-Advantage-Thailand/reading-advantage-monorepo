import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";

/** Revokes only the calling application's local session. */
export async function POST(request: Request): Promise<NextResponse> {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const revoked = await (await getIdentityComposition()).service.localLogout(
    bearer.slice(7),
  );
  return NextResponse.json({ revoked });
}
