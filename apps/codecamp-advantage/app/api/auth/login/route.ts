import { handleLogin } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log("[login] DATABASE_URL =", process.env.DATABASE_URL);
  try {
    return await handleLogin(request);
  } catch (error) {
    console.error("[login] Full error:", error);
    if (error instanceof Error && "cause" in error) {
      console.error("[login] Error cause:", error.cause);
    }
    throw error;
  }
}
