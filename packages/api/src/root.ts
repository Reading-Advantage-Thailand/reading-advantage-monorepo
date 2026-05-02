import { router } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { classesRouter } from "./routers/classes.js";
import { studentsRouter } from "./routers/students.js";

export const appRouter = router({
  auth: authRouter,
  classes: classesRouter,
  students: studentsRouter,
});

export type AppRouter = typeof appRouter;
