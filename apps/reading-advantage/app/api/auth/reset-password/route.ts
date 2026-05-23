import { db, eq, sql } from "@reading-advantage/db";
import { users } from "@reading-advantage/db/schema";
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
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length === 0) {
      return new Response(
        JSON.stringify({
          message: "If this email exists, a reset link has been sent.",
        }),
        { status: 200 }
      );
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60);
    await db.execute(sql`
      INSERT INTO verification_tokens (identifier, token, expires)
      VALUES (${email}, ${token}, ${expires})
    `);
    await sendPasswordResetEmail(email, token);
    return new Response(JSON.stringify({ message: "Reset email sent" }), {
      status: 200,
    });
  } catch {
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
