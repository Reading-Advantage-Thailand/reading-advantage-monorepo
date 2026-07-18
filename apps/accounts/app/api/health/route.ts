import { NextResponse } from "next/server";

/** Reports process liveness without claiming database readiness. */
export function GET(): NextResponse {
  return NextResponse.json({ status: "alive", service: "accounts" });
}
