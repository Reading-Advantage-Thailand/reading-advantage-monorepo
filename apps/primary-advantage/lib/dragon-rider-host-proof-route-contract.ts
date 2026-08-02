import { NextResponse } from "next/server";
import { z } from "zod";

/** Strict request allowed to issue a Dragon Rider attempt. */
export const dragonRiderIssueRequestSchema = z.object({ gameType: z.literal("dragon-rider"), difficulty: z.enum(["easy", "medium", "hard", "extreme"]) }).strict();
/** Strict client action envelope; all server-owned input, timing, and results are denied. */
export const dragonRiderActionRequestSchema = z.object({ attemptId: z.string().uuid(), credential: z.string().min(1), action: z.object({ sequence: z.number().int().positive(), kind: z.literal("choose-gate"), round: z.number().int().positive(), gate: z.enum(["left", "right"]) }).strict(), previousCheckpoint: z.string().min(1).optional() }).strict();
/** Strict completion envelope containing only the signed attempt identity. */
export const dragonRiderCompletionRequestSchema = z.object({ attemptId: z.string().uuid(), credential: z.string().min(1) }).strict();

/** Converts expected Dragon Rider boundary failures into safe structured HTTP responses. */
export function dragonRiderRouteError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "DRAGON_RIDER_VALIDATION_FAILED", message: "Request includes invalid or server-owned fields" } }, { status: 400 });
  if (error instanceof Error && /credential|checkpoint|action|attempt|expired|snapshot|transcript|victor|terminal time/i.test(error.message)) return NextResponse.json({ error: { code: "DRAGON_RIDER_ATTEMPT_REJECTED", message: "Signed attempt evidence was rejected" } }, { status: 400 });
  console.error({ event: "dragon_rider_host_proof_unexpected", error });
  return NextResponse.json({ error: { code: "DRAGON_RIDER_INTERNAL", message: "Unable to process Dragon Rider attempt" } }, { status: 500 });
}
