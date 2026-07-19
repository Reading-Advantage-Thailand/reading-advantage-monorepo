import { createContext } from "@reading-advantage/api/context";
import { codecampAppRouter } from "@reading-advantage/api/codecamp";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";
import {
  CODECAMP_SESSION_COOKIE,
  getCodecampOidcClient,
  readCodecampCookie,
  resolveCodecampSessionUser,
} from "@/lib/company-oidc";

/**
 * Serves only Codecamp product capabilities through the selected auth adapter.
 * @param req Codecamp tRPC request.
 * @returns tRPC transport response.
 */
async function handler(req: Request): Promise<Response> {
  if (isLegacyCodecampAuthEnabled()) {
    const token =
      readCodecampCookie(req, "session_token") ??
      (req.headers.get("authorization")?.startsWith("Bearer ")
        ? req.headers.get("authorization")?.slice("Bearer ".length)
        : undefined);
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: codecampAppRouter,
      createContext: () =>
        createContext({
          mode: "legacy",
          authorization: token ? `Bearer ${token}` : null,
        }),
    });
  }

  const token = readCodecampCookie(req, CODECAMP_SESSION_COOKIE);
  const session = token ? await getCodecampOidcClient().introspect(token) : null;
  const principal = session
    ? await resolveCodecampSessionUser(session.identity)
    : null;
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: codecampAppRouter,
    createContext: () =>
      createContext({
        mode: "verified-principal",
        principal,
        productScope:
          principal && session
            ? {
                kind: "company",
                applicationKey: "codecamp",
                organizationId: session.identity.organizationId,
                organizationKey: session.identity.organizationKey,
              }
            : null,
      }),
  });
}

export { handler as GET, handler as POST };
