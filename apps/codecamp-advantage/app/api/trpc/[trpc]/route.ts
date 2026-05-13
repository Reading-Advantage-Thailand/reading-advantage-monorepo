import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@reading-advantage/api";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      const authorization = req.headers.get("authorization");
      return createContext({ authorization });
    },
  });
}

export { handler as GET, handler as POST };
