import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";

/** Publishes current public signing material without private key data. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ keys: [(await getIdentityComposition()).jwk] });
}
