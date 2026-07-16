/**
 * Claims durable jobs through the fixture's provider-neutral port.
 * @param input Maximum number of jobs to claim.
 * @returns Empty fixture job collection.
 */
export async function claimAvailableJobs(input: { limit: number }) {
  void input;
  return [];
}
