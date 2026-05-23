import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db, eq } from "@reading-advantage/db";
import { users, accounts } from "@reading-advantage/db/schema";
import { PasswordUtils } from "@/lib/password-utils";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ message: "Email is already in use" }, { status: 409 });
    }
    const hashedPassword = await PasswordUtils.hashPassword(password);
    const username = email.split("@")[0];
    const userId = nanoid();
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        username,
        displayUsername: username,
        name: username,
        email,
      });
      await tx.insert(accounts).values({
        id: nanoid(),
        userId,
        providerId: "credential",
        password: hashedPassword,
      });
    });
    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
