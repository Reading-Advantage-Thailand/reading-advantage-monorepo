import { handleResetPassword } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    return await handleResetPassword(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "reset_password_error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause:
          error instanceof Error && "cause" in error
            ? String(error.cause)
            : undefined,
      }),
    );
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
