import { NextResponse } from "next/server";
import { z } from "zod";

const healthResponseSchema = z.object({
  status: z.literal("alive"),
  service: z.literal("sales-advantage"),
});

/**
 * Reports Sales process liveness without claiming dependency readiness.
 * @returns A no-store JSON response confirming the process is alive.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    healthResponseSchema.parse({
      status: "alive",
      service: "sales-advantage",
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
