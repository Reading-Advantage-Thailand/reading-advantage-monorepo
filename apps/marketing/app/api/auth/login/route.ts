import { handleLogin } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    return await handleLogin(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "login_error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
