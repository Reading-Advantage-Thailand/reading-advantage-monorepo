import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";

/** Reports readiness only after the identity database composition validates. */
export async function GET(): Promise<NextResponse> {
  try {
    const identity = await getIdentityComposition();
    await identity.probeDatabase();
    return NextResponse.json({ status: "ready", database: "company_identity" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
