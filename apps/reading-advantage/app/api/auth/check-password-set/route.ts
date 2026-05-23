import { NextResponse } from "next/server";
import { db, and, eq } from "@reading-advantage/db";
import { users, accounts } from "@reading-advantage/db/schema";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const rows = await db
      .select({ password: accounts.password })
      .from(users)
      .leftJoin(
        accounts,
        and(eq(accounts.userId, users.id), eq(accounts.providerId, "credential"))
      )
      .where(eq(users.email, email))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ hasPassword: false }, { status: 200 });
    }

    return NextResponse.json({ hasPassword: !!rows[0].password }, { status: 200 });
  } catch (error) {
    console.error("Error checking password:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
