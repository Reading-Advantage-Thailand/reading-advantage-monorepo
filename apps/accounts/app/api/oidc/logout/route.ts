import { NextResponse } from "next/server";
import { z } from "zod";

import { getIdentityComposition } from "@/lib/server/identity";

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
  const revoked = await (
    await getIdentityComposition()
  ).service.localLogout(authorization.data.slice("Bearer ".length));
  return NextResponse.json({ revoked });
}
