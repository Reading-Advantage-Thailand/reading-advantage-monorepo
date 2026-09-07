import { NextResponse } from "next/server";

/**
 * Returns a stable response for the removed school debug reader.
 * @returns A not-found response.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
