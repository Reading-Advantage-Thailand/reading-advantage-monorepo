import { handleLogin } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return handleLogin(request);
}
