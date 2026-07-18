import { NextResponse } from "next/server";

import { authenticateSalesRequest } from "@/lib/company-oidc";

/** Returns the current revocation-aware Sales application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const principal = await authenticateSalesRequest(request);
  return NextResponse.json(
    {
      session: principal ? { user: principal.user } : null,
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
