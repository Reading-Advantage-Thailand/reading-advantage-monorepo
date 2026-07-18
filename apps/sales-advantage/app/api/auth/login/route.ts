import { NextResponse } from "next/server";

/** Rejects the retired product-local credential login surface. */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { message: "Sign in through Accounts", signInUrl: "/api/auth/company/start" },
    { status: 409 },
  );
}
