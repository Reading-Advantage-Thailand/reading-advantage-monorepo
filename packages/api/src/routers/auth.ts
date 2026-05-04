import { router, protectedProcedure } from "../trpc.js";
import { sessionResponseSchema } from "@reading-advantage/types";

export const authRouter = router({
  // Auth is handled by Next.js route handlers (/api/auth/*)
  // This router provides tRPC-compatible session access
  session: protectedProcedure
    .output(sessionResponseSchema)
    .query(async ({ ctx }) => {
      return {
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
      };
    }),
});
