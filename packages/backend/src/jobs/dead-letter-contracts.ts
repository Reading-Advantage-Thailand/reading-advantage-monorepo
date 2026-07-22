import { z } from "zod";

import {
  jobIdSchema,
  jobNameSchema,
  jobQueueNameSchema,
  jobTenantSchema,
  jobTimestampSchema,
  safeJobErrorSchema,
} from "./contracts.js";

/** Runtime contract for a payload-free dead-letter operations summary. */
export const deadJobSummarySchema = z.strictObject({
  id: jobIdSchema,
  jobName: jobNameSchema,
  queueName: jobQueueNameSchema,
  tenant: jobTenantSchema,
  attempt: z.number().int().min(1).max(1_000),
  maxAttempts: z.number().int().min(1).max(1_000),
  lastError: safeJobErrorSchema,
  createdAt: jobTimestampSchema,
  updatedAt: jobTimestampSchema,
  completedAt: jobTimestampSchema,
}).superRefine((job, context) => {
  if (job.attempt > job.maxAttempts) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["attempt"],
      message: "A dead job attempt cannot exceed its declared maximum.",
    });
  }
});

/** Payload-free dead-letter metadata safe for authorized operations views. */
export type DeadJobSummary = z.infer<typeof deadJobSummarySchema>;

/** Runtime contract for a tenant-scoped dead-letter listing request. */
export const listDeadJobsRequestSchema = z.strictObject({
  queueName: jobQueueNameSchema,
  tenant: jobTenantSchema,
  limit: z.number().int().min(1).max(100),
  cursor: z.string().min(1).max(500).optional(),
});

/** Bounded tenant-scoped request for dead-letter operations summaries. */
export type ListDeadJobsRequest = z.infer<typeof listDeadJobsRequestSchema>;

/** Runtime contract for a bounded payload-free dead-letter page. */
export const listDeadJobsResultSchema = z.strictObject({
  jobs: z.array(deadJobSummarySchema).max(100),
  nextCursor: z.string().min(1).max(500).optional(),
});

/** Bounded dead-letter page without job payloads or raw provider errors. */
export type ListDeadJobsResult = z.infer<typeof listDeadJobsResultSchema>;
