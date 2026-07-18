import { NextResponse } from "next/server";

/** Retires product-local credentials in favor of the Accounts handoff. */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { message: "Continue with Accounts.", authorizationUrl: "/api/auth/company/start" },
    { status: 409 },
  );
}
