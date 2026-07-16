import { db } from "@reading-advantage/db";
import { reviewJobs } from "@reading-advantage/db/schema";

/**
 * Claims review jobs through the exact approved PostgreSQL adapter root.
 * @returns Query result for available review jobs.
 */
export async function claimReviewJobs() {
  return db.select().from(reviewJobs);
}
