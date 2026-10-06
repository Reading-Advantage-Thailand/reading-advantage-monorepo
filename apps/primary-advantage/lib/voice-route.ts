import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";

/** The signed-in student of a voice route, with the sign-in strength. */
export async function voiceActor() {
  const session = await getCurrentSession();
  if (!session) return null;
  // A session with no recorded strength is treated as a class-code sign-in (fail closed).
  return { user: session.user, authStrength: session.authStrength ?? "code_only" };
}

/**
 * Maps a voice use-case error to a JSON response.
 * @param error The thrown error.
 * @param label The route, for the log.
 * @returns The response: the error's status for a VoiceError or AuthError, 400 for bad input, else 500.
 */
export function voiceErrorResponse(error: unknown, label: string) {
  const code = (error as { code?: string }).code;
  const status = (error as { status?: number }).status;
  if (code === "FORBIDDEN") return NextResponse.json({ error: code, message: (error as Error).message }, { status: 403 });
  if (code && typeof status === "number") return NextResponse.json({ error: code, message: (error as Error).message }, { status });
  if ((error as { name?: string }).name === "ZodError") return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  console.error(`API Error - ${label}:`, error);
  return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
}
