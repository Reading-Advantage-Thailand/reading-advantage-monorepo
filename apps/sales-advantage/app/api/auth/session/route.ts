import { NextResponse } from "next/server";

import { authenticateSalesRequest } from "@/lib/company-oidc";

/** Returns the current revocation-aware Sales application session. */
export async function GET(request: Request): Promise<NextResponse> {
  const result = await authenticateSalesRequest(request);
  if (result.kind === "no-session") {
    return NextResponse.json(
      { session: null },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  }
  if (result.kind === "no-sales-role") {
    return NextResponse.json(
      { session: null },
      {
        status: 403,
        headers: { "Cache-Control": "no-store, private" },
      },
    );
  }
  return NextResponse.json(
    {
      session: { user: result.principal.user },
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
