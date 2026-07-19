import { createCodecampActivityHandlers } from "@reading-advantage/domain/activity";

import { createActivityRouter } from "./routers/activity.js";
import { codecampRouter } from "./routers/codecamp.js";
import { router } from "./trpc.js";

const activityRouter = createActivityRouter((context) =>
  createCodecampActivityHandlers(context.tenantDb),
);

/** Codecamp-only tRPC router used by the independently deployed Codecamp app. */
export const codecampAppRouter = router({
  codecamp: codecampRouter,
  activity: activityRouter,
});

/** Portable client type for the independently deployed Codecamp router. */
export type CodecampAppRouter = typeof codecampAppRouter;
