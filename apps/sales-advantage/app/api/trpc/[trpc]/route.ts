import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { salesAppRouter } from "@reading-advantage/api/sales";
import { createContext } from "@reading-advantage/api/context";

import {
  authenticateSalesRequest,
  type ResolvedSalesRequestPrincipal,
} from "@/lib/company-oidc";

/** Serves Sales tRPC through the explicitly selected shared auth adapter. */
async function handler(req: Request) {
  const result = await authenticateSalesRequest(req);
  const principal =
    result && "user" in result
      ? (result as unknown as ResolvedSalesRequestPrincipal)
      : result?.kind === "authenticated"
        ? result.principal
        : null;
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
