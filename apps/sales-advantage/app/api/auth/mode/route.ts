import { NextResponse } from "next/server";

import { getSalesAuthMode } from "@/lib/auth-mode";

/**
 * Exposes the operator-selected browser sign-in mode without secret material.
 * @returns Current validated Sales auth mode.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { mode: getSalesAuthMode() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
