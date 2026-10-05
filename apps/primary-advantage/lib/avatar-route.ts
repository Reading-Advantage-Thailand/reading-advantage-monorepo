import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { voiceErrorResponse } from "@/lib/voice-route";

/** The signed-in user of an avatar route, or null. */
export async function avatarActor() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/** The 401 answer of an avatar route. */
export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * Maps an avatar use-case error to a JSON response: the error's status for an AvatarShopError or
 * AuthError, 400 for bad input, else 500 (the same mapping as the voice routes).
 * @param error The thrown error.
 * @param label The route, for the log.
 * @returns The response.
 */
export const avatarErrorResponse = (error: unknown, label: string) => voiceErrorResponse(error, label);

/** No caching of per-student answers. */
export const NO_STORE = { headers: { "Cache-Control": "no-store" } } as const;
