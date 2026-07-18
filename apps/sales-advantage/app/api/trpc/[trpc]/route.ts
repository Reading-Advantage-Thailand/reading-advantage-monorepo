import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { salesAppRouter } from "@reading-advantage/api/sales";
import { createContext } from "@reading-advantage/api/context";

import {
  SALES_SESSION_COOKIE,
  getSalesOidcClient,
  readSalesCookie,
  salesSessionUser,
} from "@/lib/company-oidc";

/** Serves Sales tRPC with a revocation-aware Accounts application principal. */
async function handler(req: Request) {
  const token = readSalesCookie(req, SALES_SESSION_COOKIE);
  const session = token ? await getSalesOidcClient().introspect(token) : null;
  const principal = session ? await salesSessionUser(session.identity) : null;
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: salesAppRouter,
    createContext: () =>
      createContext({
        mode: "verified-principal",
        principal: principal?.user ?? null,
        productScope: principal?.scope ?? null,
      }),
  });
}

export { handler as GET, handler as POST };
