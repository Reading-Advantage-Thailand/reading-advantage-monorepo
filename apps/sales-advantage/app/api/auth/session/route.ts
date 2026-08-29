import { NextResponse } from "next/server";

import { authenticateSalesRequest } from "@/lib/company-oidc";

/** Returns the current revocation-aware Sales application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const principal = await authenticateSalesRequest(request);
  if (!principal) {
    return NextResponse.json(
      { session: null, denied: true },
      {
        status: 403,
        headers: { "Cache-Control": "no-store, private" },
      },
    );
  }
  return NextResponse.json(
    {
      session: { user: principal.user },
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
