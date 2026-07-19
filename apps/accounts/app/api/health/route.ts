import { NextResponse } from "next/server";

/**
 * Reports process liveness without claiming database readiness.
 * @returns A non-cacheable Accounts liveness response.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { status: "alive", service: "accounts" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
