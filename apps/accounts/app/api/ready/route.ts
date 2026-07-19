import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";

/**
 * Reports readiness only after the identity database composition validates.
 * @returns A non-cacheable Accounts readiness response.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const identity = await getIdentityComposition();
    await identity.probeDatabase();
    return NextResponse.json(
      {
        status: "ready",
        service: "accounts",
        database: "company_identity",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", service: "accounts" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
