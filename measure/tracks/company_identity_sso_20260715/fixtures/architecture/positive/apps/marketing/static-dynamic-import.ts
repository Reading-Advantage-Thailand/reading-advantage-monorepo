/** Loads a prohibited database client through a statically resolvable import. */
async function loadIdentityClient(): Promise<unknown> {
  return import("@reading-advantage/db/company-identity");
}

void loadIdentityClient;
