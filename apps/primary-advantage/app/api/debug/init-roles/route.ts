import { NextResponse } from "next/server";

/**
 * Returns a stable response for the removed role debug reader.
 * @returns A not-found response.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/**
 * Returns a stable response for the removed role debug writer.
 * @returns A not-found response.
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
