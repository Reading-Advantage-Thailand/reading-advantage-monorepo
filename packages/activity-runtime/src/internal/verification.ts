import { z } from "zod";

/** Internal server verification result schema used only by atomic assessment. */
export const serverVerifiedResultSchema = z
  .object({
    source: z.literal("server"),
    activityId: z.string().trim().min(1),
    subjectId: z.string().trim().min(1),
    inputDigest: z.string().regex(/^[a-f0-9]{8}$/),
    isCorrect: z.boolean(),
    score: z.number().finite().min(0).max(1).optional(),
  })
  .strict()
  .refine((result) => result.isCorrect || result.score == null || result.score === 0, {
    path: ["score"],
    message: "An incorrect verification result cannot have a positive score",
  });

/** Internal server verification result type. */
export type ServerVerifiedResult = z.infer<typeof serverVerifiedResultSchema>;

/**
 * Normalizes values for deterministic comparison and binding.
 * @param value Raw answer or structured check result.
 * @returns Stable lowercase representation with arrays sorted.
 */
export function normalizeVerificationValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalizeVerificationValue).sort().join("|");
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase();
  if (value == null) return "";
  return JSON.stringify(value);
}

/**
 * Produces a deterministic binding digest for server-generated assessed events.
 * @param activityId Stable activity identifier.
 * @param subjectId Checkpoint or tutorial step identifier.
 * @param input Answer or server-executed check results.
 * @returns Eight-character hexadecimal FNV-1a digest.
 */
export function createVerificationDigest(activityId: string, subjectId: string, input: unknown): string {
  const serialized = `${activityId}\u0000${subjectId}\u0000${normalizeVerificationValue(input)}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
