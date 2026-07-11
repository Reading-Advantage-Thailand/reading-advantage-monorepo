import { z } from "zod";

/** Short-lived claims binding tutorial reports to an exact repository snapshot and submission. */
export const tutorialCredentialClaimsSchema = z.object({
  tokenId: z.string().min(1), sessionId: z.string().min(1), submissionId: z.string().min(1), activityId: z.string().min(1), repositoryId: z.string().min(1),
  repositoryStateId: z.string().min(1), repositoryCapturedAt: z.string().datetime({ offset: true }),
  activityVersion: z.string().regex(/^\d+\.\d+\.\d+$/), graphVersion: z.string().min(1), purpose: z.literal("tutorial-report"),
  learnerId: z.string().min(1), tenantKey: z.string().min(1), allowedStepIds: z.array(z.string().min(1)).min(1),
  issuedAt: z.string().datetime({ offset: true }), expiresAt: z.string().datetime({ offset: true }), nonce: z.string().min(16),
}).strict().superRefine((claims, context) => {
  if (Date.parse(claims.expiresAt) <= Date.parse(claims.issuedAt)) context.addIssue({ code: "custom", path: ["expiresAt"], message: "Credential expiry must follow issue time" });
  if (Date.parse(claims.expiresAt) - Date.parse(claims.issuedAt) > 15 * 60 * 1000) context.addIssue({ code: "custom", path: ["expiresAt"], message: "Tutorial credential lifetime cannot exceed 15 minutes" });
});

/** Validated tutorial credential claims. */
export type TutorialCredentialClaims = z.infer<typeof tutorialCredentialClaimsSchema>;
