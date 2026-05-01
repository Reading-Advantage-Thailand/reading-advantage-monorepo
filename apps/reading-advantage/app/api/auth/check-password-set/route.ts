import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ hasPassword: false }, { status: 200 });
    }

    return NextResponse.json({ hasPassword: !!user.password }, { status: 200 });
  } catch (error: any) {
    console.error("Error checking password:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}