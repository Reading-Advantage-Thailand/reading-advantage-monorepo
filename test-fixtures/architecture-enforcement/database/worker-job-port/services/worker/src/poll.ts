import { claimAvailableJobs } from "@reading-advantage/backend/jobs";

/**
 * Polls durable jobs through the provider-neutral backend port.
 * @returns Jobs claimed by the backend port.
 */
export async function pollThroughJobPort() {
  return claimAvailableJobs({ limit: 10 });
}
