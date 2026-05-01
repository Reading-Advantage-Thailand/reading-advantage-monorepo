import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PasswordUtils } from "@/lib/password-utils";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Email is already in use" }, { status: 409 });
    }
    const hashedPassword = await PasswordUtils.hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        password: hashedPassword,
      },
    });
    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Internal server error" }, { status: 500 });
  }
}
