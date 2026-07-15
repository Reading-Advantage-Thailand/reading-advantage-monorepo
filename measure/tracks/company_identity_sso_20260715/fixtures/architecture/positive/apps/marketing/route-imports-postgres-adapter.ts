import { postgresCompanyIdentityRepository } from "@reading-advantage/backend/modules/company-identity/adapters/postgres";

/** Simulates a thin transport that incorrectly reaches through the port. */
export async function POST(): Promise<unknown> {
  return postgresCompanyIdentityRepository.getCurrentAccount();
}
