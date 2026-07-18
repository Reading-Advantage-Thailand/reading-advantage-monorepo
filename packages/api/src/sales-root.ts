import { salesRouter } from "./routers/sales.js";
import { router } from "./trpc.js";

/** Sales-only tRPC router used by the independently deployed Sales app. */
export const salesAppRouter = router({ sales: salesRouter });

/** Portable client type for the independently deployed Sales router. */
export type SalesAppRouter = typeof salesAppRouter;
