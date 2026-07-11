import { router } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { usersRouter } from "./routers/users.js";
import { classesRouter } from "./routers/classes.js";
import { studentsRouter } from "./routers/students.js";
import { assignmentsRouter } from "./routers/assignments.js";
import { articlesRouter } from "./routers/articles.js";
import { progressRouter } from "./routers/progress.js";
import { reportsRouter } from "./routers/reports.js";
import { codecampRouter } from "./routers/codecamp.js";
import { salesRouter } from "./routers/sales.js";
import { createActivityRouter } from "./routers/activity.js";
import { createCodecampActivityHandlers } from "@reading-advantage/domain/activity";

const activityRouter = createActivityRouter((context) => createCodecampActivityHandlers(context.tenantDb));

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  classes: classesRouter,
  students: studentsRouter,
  assignments: assignmentsRouter,
  articles: articlesRouter,
  progress: progressRouter,
  reports: reportsRouter,
  codecamp: codecampRouter,
  sales: salesRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
