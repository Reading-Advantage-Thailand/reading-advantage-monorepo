import { router, publicProcedure, protectedProcedure } from "../trpc.js";

export const authRouter = router({
  // Auth is handled by Next.js route handlers (/api/auth/*)
  // This router provides tRPC-compatible session access
  session: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.auth.user,
      tenant: ctx.auth.tenant,
    };
  }),
});
