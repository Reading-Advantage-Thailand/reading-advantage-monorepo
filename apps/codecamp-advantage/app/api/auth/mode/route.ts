import { NextResponse } from "next/server";

import { getCodecampAuthMode } from "@/lib/auth-mode";

/**
 * Exposes the validated browser sign-in mode without secret material.
 * @returns Current Codecamp authentication mode with caching disabled.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { mode: getCodecampAuthMode() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
