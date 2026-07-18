import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@reading-advantage/api";

import {
  CODECAMP_SESSION_COOKIE,
  codecampSessionUser,
  getCodecampOidcClient,
  readCodecampCookie,
} from "@/lib/company-oidc";

/** Serves Codecamp tRPC with a revocation-aware Accounts application principal. */
async function handler(req: Request) {
  const token = readCodecampCookie(req, CODECAMP_SESSION_COOKIE);
  const session = token ? await getCodecampOidcClient().introspect(token) : null;
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      return createContext({
        mode: "verified-principal",
        principal: session ? codecampSessionUser(session.identity) : null,
        productScope: session
          ? {
              kind: "company",
              applicationKey: "codecamp",
              organizationId: session.identity.organizationId,
              organizationKey: session.identity.organizationKey,
            }
          : null,
      });
    },
  });
}

export { handler as GET, handler as POST };
