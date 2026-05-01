import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ message: "Invalid email" }), {
      status: 400,
    });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return new Response(
        JSON.stringify({
          message: "If this email exists, a reset link has been sent.",
        }),
        { status: 200 }
      );
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60);
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });
    await sendPasswordResetEmail(email, token);
    return new Response(JSON.stringify({ message: "Reset email sent" }), {
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
