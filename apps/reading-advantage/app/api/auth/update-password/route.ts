import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PasswordUtils } from "@/lib/password-utils";
import { firebaseAdmin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { idToken, newPassword } = await req.json();
    if (!idToken || !newPassword) {
      return NextResponse.json({ message: "idToken and newPassword are required" }, { status: 400 });
    }

    // Verify Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    // Find user in Prisma
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Hash new password
    const hashedPassword = await PasswordUtils.hashPassword(newPassword);

    // Update password in Prisma
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating password:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}