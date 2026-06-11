import { z } from "zod";

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/**
 * Handles password reset requests. Phase 1 stub — returns 501.
 * @param request - The incoming request (unused in stub)
 * @returns Response with 501 Not Implemented status
 */
export async function handleResetPassword(
  request: unknown
): Promise<Response> {
  return new Response("Not Implemented", { status: 501 });
}
