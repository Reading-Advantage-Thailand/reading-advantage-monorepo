import { NextResponse } from "next/server";
import { avatarCatalog } from "@/server/controllers/avatarController";

/**
 * GET /api/v1/avatar/catalog: the pack catalog (FR-4). Public and static; a day of caching.
 * @returns The catalog version and the pieces.
 */
export function GET() {
  return NextResponse.json(avatarCatalog(), { headers: { "Cache-Control": "public, max-age=86400" } });
}
