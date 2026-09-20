import { NextResponse } from "next/server";
import { z } from "zod";

const healthResponseSchema = z.object({
  status: z.literal("alive"),
  service: z.literal("marketing"),
});

/**
 * Reports Marketing process liveness without claiming dependency readiness.
 * @returns A no-store JSON response confirming the process is alive.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    healthResponseSchema.parse({
      status: "alive",
      service: "marketing",
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
