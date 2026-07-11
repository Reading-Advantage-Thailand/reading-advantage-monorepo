import { z } from "zod";
import { tutorialCheckResultSchema } from "./contracts.js";

/** Untrusted local report uploaded by the tutorial CLI. */
export const tutorialReportRequestSchema = z.object({
  submissionId: z.string().trim().min(1),
  credential: z.string().trim().min(1),
  repositoryStateId: z.string().trim().min(1).max(200),
  localResult: tutorialCheckResultSchema,
}).strict();

/** Server-owned result returned after deterministic repository verification. */
export const verifiedTutorialReportSchema = z.object({
  submissionId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  activityId: z.string().trim().min(1),
  activityVersion: z.string().trim().min(1),
  graphVersion: z.string().trim().min(1),
  repositoryId: z.string().trim().min(1),
  learnerId: z.string().trim().min(1),
  tenantKey: z.string().trim().min(1),
  stepId: z.string().trim().min(1),
  passed: z.boolean(),
  checks: z.array(z.object({ checkId: z.string().trim().min(1), passed: z.boolean() }).strict()),
  verifiedAt: z.string().datetime({ offset: true }),
}).strict();

/** Server-owned verified tutorial report. */
export type VerifiedTutorialReport = z.infer<typeof verifiedTutorialReportSchema>;

/**
 * Uploads one secret-free local report through an injected HTTP-compatible client.
 * @param endpoint Authenticated tutorial report endpoint.
 * @param request Validated report request.
 * @param send Injected network adapter suitable for offline queues and tests.
 * @returns Validated server-verified response.
 */
export async function uploadTutorialReport(endpoint: string, request: z.input<typeof tutorialReportRequestSchema>, send: (endpoint: string, body: unknown) => Promise<unknown>): Promise<VerifiedTutorialReport> {
  const body = tutorialReportRequestSchema.parse(request);
  return verifiedTutorialReportSchema.parse(await send(endpoint, body));
}
