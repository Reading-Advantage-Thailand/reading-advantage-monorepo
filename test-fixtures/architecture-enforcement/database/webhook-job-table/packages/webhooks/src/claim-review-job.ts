import { db } from "@reading-advantage/db";
import { reviewJobs } from "@reading-advantage/db/schema";

/**
 * Bypasses the job port by querying review jobs from webhook code.
 * @returns Direct review job query result.
 */
export async function claimReviewJobFromWebhook() {
  return db.select().from(reviewJobs);
}
