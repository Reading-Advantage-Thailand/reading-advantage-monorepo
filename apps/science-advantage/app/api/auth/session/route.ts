import { handleSession } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleSession(request);
}
