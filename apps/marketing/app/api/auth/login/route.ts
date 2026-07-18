import { NextResponse } from "next/server";

/** Retires product-local credential submission in favor of Accounts. */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { message: "Continue with Accounts.", authorizationUrl: "/api/auth/company/start" },
    { status: 409 },
  );
}
